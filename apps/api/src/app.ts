/* eslint-disable */
import { randomUUID } from 'node:crypto';
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify';
import type { Queue } from 'bullmq';
import { apiErrorSchema, healthResponseSchema, migrateScenarioExport } from '@ada/contracts';
import { AdityaGuptaGenerationProvider, FakeGenerationProvider } from '@ada/ai';
import { scenarioOperationSchema } from '@ada/scenario-tools';
import { promptRegistry } from '@ada/prompts';
import type { ServerEnvironment } from '@ada/config';
import { cloneScenarioRevision, type Database } from '@ada/db';
import { OptimisticConflictError, ScenarioService } from './scenario-service.js';
import { RunService } from './run-service.js';
import { createLogger } from '@ada/observability';

type ReadinessCheck = () => Promise<boolean>;
export interface ApiDependencies {
  db?: Database;
  turnQueue?: Queue;
}
const collectionNames = new Set([
  'entities',
  'relationships',
  'locations',
  'locationEdges',
  'storyCards',
  'storyCardLinks',
  'plotArcs',
  'plotPoints',
]);

const openApiDocument = {
  openapi: '3.1.0',
  info: { title: 'Narrative Engine API', version: '0.1.0' },
  paths: {
    '/health/live': { get: { responses: { '200': { description: 'Process is alive' } } } },
    '/health/ready': {
      get: {
        responses: {
          '200': { description: 'Dependencies ready' },
          '503': { description: 'Dependencies unavailable' },
        },
      },
    },
    '/api/v1/scenarios': {
      get: { responses: { '200': { description: 'Scenario list' } } },
      post: {
        responses: {
          '201': { description: 'Scenario created' },
          '400': { description: 'Invalid scenario' },
        },
      },
    },
    '/api/v1/scenarios/{scenarioId}': {
      get: {
        parameters: [
          { name: 'scenarioId', in: 'path', required: true, schema: { type: 'string' } },
        ],
        responses: { '200': { description: 'Scenario' }, '404': { description: 'Not found' } },
      },
      patch: {
        responses: {
          '200': { description: 'Updated scenario' },
          '409': { description: 'Optimistic conflict' },
        },
      },
    },
  },
};

function requestIdIsValid(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(value);
}

export function buildApp(
  environment: ServerEnvironment,
  readinessCheck: ReadinessCheck = () => Promise.resolve(true),
  dependencies: ApiDependencies = {},
): FastifyInstance {
  const app = Fastify({
    bodyLimit: 10 * 1024 * 1024,
    loggerInstance: createLogger({
      service: 'api',
      environment: environment.NODE_ENV,
      level: environment.LOG_LEVEL,
    }) as unknown as FastifyBaseLogger,
    requestIdHeader: environment.REQUEST_ID_HEADER,
    genReqId: (request) =>
      requestIdIsValid(request.headers[environment.REQUEST_ID_HEADER])
        ? (request.headers[environment.REQUEST_ID_HEADER] as string)
        : randomUUID(),
  });
  const service = dependencies.db ? new ScenarioService(dependencies.db) : undefined;
  const runs = dependencies.db
    ? new RunService(
        dependencies.db,
        dependencies.turnQueue,
        environment.DEBUG_INSPECTORS_ENABLED,
      )
    : undefined;
  app.addSchema({
    $id: 'ApiError',
    type: 'object',
    required: ['code', 'message', 'requestId', 'retryable'],
    properties: {
      code: { type: 'string' },
      message: { type: 'string' },
      requestId: { type: 'string' },
      retryable: { type: 'boolean' },
      details: { type: 'object' },
    },
  });
  app.addSchema({
    $id: 'HealthResponse',
    type: 'object',
    required: ['status', 'service', 'version'],
    properties: {
      status: { type: 'string' },
      service: { type: 'string' },
      version: { type: 'string' },
    },
  });
  const rateWindows = new Map<string, { startedAt: number; count: number }>();
  const streamReplay = new Map<string, Array<{ id: number; type: string; data: unknown }>>();

  app.addHook('onRequest', (request, reply, done) => {
    reply.header(environment.REQUEST_ID_HEADER, request.id);
    if (request.url.length > 4_096) {
      reply.code(414).send({
        code: 'request_too_large',
        message: 'Request target is too large',
        requestId: request.id,
        retryable: false,
      });
      done();
      return;
    }
    if (
      ['POST', 'PATCH', 'PUT', 'DELETE'].includes(request.method) &&
      /\/turns|\/import|\/reindex|\/models\//.test(request.url)
    ) {
      const now = Date.now();
      const key = request.ip;
      const window = rateWindows.get(key);
      const current =
        !window || now - window.startedAt >= 60_000 ? { startedAt: now, count: 0 } : window;
      current.count += 1;
      rateWindows.set(key, current);
      if (current.count > 60) {
        reply.code(429).send({
          code: 'rate_limited',
          message: 'Too many requests',
          requestId: request.id,
          retryable: true,
        });
        done();
        return;
      }
    }
    done();
  });
  app.setErrorHandler((error, request, reply) => {
    const message = error instanceof Error ? error.message : 'Request failed';
    const conflict = error instanceof OptimisticConflictError;
    const statusCode = message.includes('not found')
      ? 404
      : conflict || message.includes('conflict') || message.includes('Stale')
        ? 409
        : 400;
    const response = apiErrorSchema.parse({
      code: statusCode === 409 ? 'conflict' : statusCode === 404 ? 'not_found' : 'invalid_request',
      message: statusCode >= 500 ? 'Request failed' : message.slice(0, 2_000),
      issues: [],
      requestId: request.id,
      retryable: statusCode >= 500,
      ...(conflict ? { details: { current: error.current } } : {}),
    });
    reply.code(statusCode).send(response);
  });

  app.get('/health/live', { schema: { response: { 200: { $ref: 'HealthResponse#' } } } }, () =>
    healthResponseSchema.parse({ status: 'ok', service: 'api', version: '0.1.0' }),
  );
  app.get('/health/ready', async (_request, reply) => {
    const ready = await readinessCheck();
    return reply.code(ready ? 200 : 503).send(
      healthResponseSchema.parse({
        status: ready ? 'ok' : 'unavailable',
        service: 'api',
        version: '0.1.0',
      }),
    );
  });
  app.get('/api/v1/openapi.json', () => openApiDocument);
  app.get('/api/v1/system/info', () => ({
    appVersion: '0.1.0',
    schemaVersion: '0.1.0',
    featureFlags: {},
    configuration: {
      generation: environment.GENERATION_ENABLED,
      embeddings: environment.EMBEDDING_ENABLED,
    },
  }));

  app.get('/api/v1/settings/models', async () => {
    // 1. Check if model override exists in app_settings table
    let activeModel = environment.GENERATION_DEFAULT_MODEL;
    if (dependencies.db) {
      try {
        const { appSettings } = await import('@ada/db');
        const { eq } = await import('drizzle-orm');
        const [row] = await dependencies.db.select().from(appSettings).where(eq(appSettings.key, 'active_model')).limit(1);
        if (row?.value && typeof (row.value as any).model === 'string') {
          activeModel = (row.value as any).model;
        }
      } catch {
        // fallback to env
      }
    }

    // 2. Discover available models from the provider using current API credentials
    let discoveredModels: Array<{ id: string; name?: string }> = [];
    if (environment.GENERATION_ENABLED && environment.GENERATION_API_KEY) {
      try {
        const res = await fetch(`${environment.GENERATION_BASE_URL.replace(/\/$/, '')}/models`, {
          headers: {
            authorization: `Bearer ${environment.GENERATION_API_KEY}`,
            'x-bf-vk': environment.GENERATION_API_KEY,
          },
          signal: AbortSignal.timeout(4000),
        });
        if (res.ok) {
          const body = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
          discoveredModels = (body.data ?? [])
            .filter((m) => typeof m?.id === 'string' && !m.id.includes('embedding'))
            .map((m) => ({ id: m.id, name: m.name ?? m.id.split('/').pop() ?? m.id }));
        }
      } catch {
        // ignore discovery error
      }
    }

    if (discoveredModels.length === 0) {
      discoveredModels = [
        { id: activeModel, name: activeModel.split('/').pop() ?? activeModel },
        { id: 'azure/gpt-4o', name: 'GPT-4o (Azure)' },
        { id: 'Codex Proxy/gpt-5.6-luna', name: 'GPT-5.6 Luna' },
        { id: 'Codex Proxy/gpt-5.6-sol', name: 'GPT-5.6 Sol' },
        { id: 'Codex Proxy/gpt-5.6-terra', name: 'GPT-5.6 Terra' },
        { id: 'agy/antigravity/gemini-3.8-flash-tiered', name: 'Gemini 3.8 Flash' },
      ];
    }

    // Ensure active model is in the list
    if (!discoveredModels.some((m) => m.id === activeModel)) {
      discoveredModels.unshift({ id: activeModel, name: activeModel.split('/').pop() ?? activeModel });
    }

    return {
      configured: environment.GENERATION_ENABLED,
      provider: environment.GENERATION_PROVIDER,
      defaultModel: activeModel,
      maxResponseLength: environment.GENERATION_MAX_RESPONSE_LENGTH,
      models: discoveredModels.map((m) => ({
        provider: environment.GENERATION_PROVIDER,
        id: m.id,
        name: m.name || m.id.split('/').pop(),
        supportsStreaming: true,
        supportsJsonSchema: true,
      })),
      refreshedAt: new Date().toISOString(),
    };
  });

  app.put('/api/v1/settings/models/active', async (request, reply) => {
    if (!dependencies.db) {
      return reply.code(503).send({ error: 'Database unavailable' });
    }
    const body = (request.body ?? {}) as { model?: string };
    const model = typeof body.model === 'string' ? body.model.trim() : '';
    if (!model) {
      return reply.code(400).send({ error: 'Model identifier required' });
    }

    try {
      const { appSettings } = await import('@ada/db');
      await dependencies.db
        .insert(appSettings)
        .values({
          key: 'active_model',
          value: { model },
          attribution: { source: 'admin', sourceIds: [] },
          version: 1,
          schemaVersion: 1,
        })
        .onConflictDoUpdate({
          target: appSettings.key,
          set: {
            value: { model },
            updatedAt: new Date(),
          },
        });

      return { ok: true, activeModel: model };
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'Failed to update active model' });
    }
  });

  app.post('/api/v1/settings/models/refresh', async () => {
    let discoveredModels: Array<{ id: string; name?: string }> = [];
    if (environment.GENERATION_ENABLED && environment.GENERATION_API_KEY) {
      try {
        const res = await fetch(`${environment.GENERATION_BASE_URL.replace(/\/$/, '')}/models`, {
          headers: {
            authorization: `Bearer ${environment.GENERATION_API_KEY}`,
            'x-bf-vk': environment.GENERATION_API_KEY,
          },
          signal: AbortSignal.timeout(5000),
        });
        if (res.ok) {
          const body = (await res.json()) as { data?: Array<{ id: string; name?: string }> };
          discoveredModels = (body.data ?? []).filter((m) => typeof m?.id === 'string' && !m.id.includes('embedding'));
        }
      } catch {
        // ignore
      }
    }
    return {
      configured: environment.GENERATION_ENABLED,
      provider: environment.GENERATION_PROVIDER,
      defaultModel: environment.GENERATION_DEFAULT_MODEL,
      models: discoveredModels,
      refreshedAt: new Date().toISOString(),
    };
  });

  app.post('/api/v1/settings/models/test', async (request) => {
    const body = (request.body ?? {}) as { model?: string };
    const model = body.model || environment.GENERATION_DEFAULT_MODEL;
    if (!environment.GENERATION_ENABLED || !environment.GENERATION_API_KEY) {
      return { ok: false, error: 'Provider not configured' };
    }
    try {
      const res = await fetch(`${environment.GENERATION_BASE_URL.replace(/\/$/, '')}/chat/completions`, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${environment.GENERATION_API_KEY}`,
          'x-bf-vk': environment.GENERATION_API_KEY,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: 'ping' }],
          max_tokens: 10,
        }),
        signal: AbortSignal.timeout(6000),
      });
      const data = (await res.json()) as any;
      if (!res.ok) {
        return { ok: false, model, error: data?.error?.message || `HTTP ${res.status}` };
      }
      return {
        ok: true,
        provider: environment.GENERATION_PROVIDER,
        model,
        usage: data?.usage ?? null,
      };
    } catch (err: any) {
      return { ok: false, model, error: err?.message || 'Connection failed' };
    }
  });
  app.get('/api/v1/settings/retrieval', () => ({
    lexical: true,
    embeddings: environment.EMBEDDING_ENABLED,
    maxCandidates: 200,
    maxSelected: 32,
  }));
  app.get('/api/v1/settings/embeddings', () => ({
    enabled: environment.EMBEDDING_ENABLED,
    provider: environment.EMBEDDING_PROVIDER,
    model: environment.EMBEDDING_MODEL,
    dimensions: environment.EMBEDDING_DIMENSIONS,
    distance: environment.EMBEDDING_DISTANCE,
    keyConfigured: Boolean(environment.EMBEDDING_API_KEY),
  }));

  // Decoupled Feedback / Meta bridge endpoint (writes to .pi/inbox.jsonl)
  app.post('/api/v1/meta/feedback', async (request, reply) => {
    const body = (request.body ?? {}) as { message?: string };
    const message = typeof body.message === 'string' ? body.message.trim() : '';
    if (!message) {
      return reply.code(400).send({ error: 'Message required' });
    }
    try {
      const fs = await import('node:fs');
      const path = await import('node:path');
      const inboxPath = path.resolve(process.cwd(), '.pi/inbox.jsonl');
      fs.mkdirSync(path.dirname(inboxPath), { recursive: true });
      fs.appendFileSync(inboxPath, JSON.stringify({ message, timestamp: new Date().toISOString() }) + '\n');
      return { ok: true, message, dispatched: true };
    } catch (err: any) {
      return reply.code(500).send({ error: err?.message || 'Failed to dispatch' });
    }
  });

  app.get('/api/v1/scenarios', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const query = request.query as {
      limit?: string;
      search?: string;
      status?: string;
      tag?: string;
    };
    const filters: { search?: string; status?: string; tag?: string } = {};
    if (query.search !== undefined) filters.search = query.search;
    if (query.status !== undefined) filters.status = query.status;
    if (query.tag !== undefined) filters.tag = query.tag;
    return service.list(Math.min(100, Math.max(1, Number(query.limit ?? 25))), filters);
  });
  app.post('/api/v1/scenarios', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as { aggregate?: unknown };
    const result = await service.create((body.aggregate ?? body) as never, request.id);
    return reply.code(201).send(result);
  });
  app.get('/api/v1/scenarios/:scenarioId', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const result = await service.get((request.params as { scenarioId: string }).scenarioId);
    if (!result)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Scenario not found',
        requestId: request.id,
        retryable: false,
      });
    return result;
  });
  app.get('/api/v1/scenarios/:scenarioId/revisions', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return service.revisions((request.params as { scenarioId: string }).scenarioId);
  });
  app.get('/api/v1/scenarios/:scenarioId/revisions/:revisionNumber', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; revisionNumber: string };
    const revisions = await service.revisions(params.scenarioId);
    const revision = revisions.find(
      (candidate) => candidate.revisionNumber === Number(params.revisionNumber),
    );
    if (!revision)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Scenario revision not found',
        requestId: request.id,
        retryable: false,
      });
    return revision;
  });
  app.get('/api/v1/scenarios/:scenarioId/revisions/:fromRevision/diff', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; fromRevision: string };
    const query = request.query as { against?: string };
    return service.diff(
      params.scenarioId,
      Number(params.fromRevision),
      Number(query.against ?? params.fromRevision),
    );
  });
  app.get('/api/v1/scenarios/:scenarioId/export', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const record = await service.get((request.params as { scenarioId: string }).scenarioId);
    if (!record)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Scenario not found',
        requestId: request.id,
        retryable: false,
      });
    const aggregate = record.revision.aggregate;
    reply.header(
      'content-disposition',
      `attachment; filename="${record.scenario.slug}.scenario.json"`,
    );
    return {
      kind: 'scenario',
      schemaVersion: 'scenario.v1',
      scenarioId: record.scenario.id,
      revision: record.revision.revisionNumber,
      aggregate,
    };
  });
  app.post('/api/v1/scenarios/import', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const migrated = migrateScenarioExport(request.body);
    return reply
      .code(201)
      .send(await service.importAggregate(migrated.aggregate as never, request.id));
  });
  app.post('/api/v1/scenarios/:scenarioId/clone', async (request, reply) => {
    if (!dependencies.db)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string };
    const body = (request.body ?? {}) as {
      newScenarioId: string;
      newRevisionId: string;
      newSlug: string;
    };
    const revisions = await service?.revisions(params.scenarioId);
    const source = revisions?.[0];
    if (!source)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Scenario revision not found',
        requestId: request.id,
        retryable: false,
      });
    return reply.code(201).send(
      await cloneScenarioRevision(dependencies.db, {
        sourceRevisionId: source.id,
        newScenarioId: body.newScenarioId,
        newRevisionId: body.newRevisionId,
        newSlug: body.newSlug,
        actorId: request.id,
      }),
    );
  });
  app.post('/api/v1/scenarios/:scenarioId/unarchive', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = (request.body ?? {}) as { expectedVersion?: number };
    return service.archive(
      (request.params as { scenarioId: string }).scenarioId,
      false,
      body.expectedVersion ?? 0,
      request.id,
    );
  });
  app.post('/api/v1/scenarios/:scenarioId/archive', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = (request.body ?? {}) as { expectedVersion?: number };
    return service.archive(
      (request.params as { scenarioId: string }).scenarioId,
      true,
      body.expectedVersion ?? 0,
      request.id,
    );
  });
  app.patch('/api/v1/scenarios/:scenarioId/aggregate', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as { expectedVersion?: number; scenario?: Record<string, unknown> };
    return service.patchAggregate(
      (request.params as { scenarioId: string }).scenarioId,
      body.expectedVersion ?? 0,
      body.scenario ?? {},
      request.id,
    );
  });
  app.patch('/api/v1/scenarios/:scenarioId', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = (request.body ?? {}) as {
      expectedVersion?: number;
      title?: string;
      status?: 'draft' | 'valid' | 'archived';
    };
    const patch: { title?: string; status?: 'draft' | 'valid' | 'archived' } = {};
    if (body.title !== undefined) patch.title = body.title;
    if (body.status !== undefined) patch.status = body.status;
    const headerVersion = request.headers['if-match'];
    const expectedVersion =
      body.expectedVersion ??
      (headerVersion ? Number(String(headerVersion).replaceAll('"', '')) : 0);
    return service.patch(
      (request.params as { scenarioId: string }).scenarioId,
      expectedVersion,
      patch,
      request.id,
    );
  });
  app.post('/api/v1/scenarios/:scenarioId/validate', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return service.validate((request.params as { scenarioId: string }).scenarioId);
  });
  app.get(
    '/api/v1/scenarios/:scenarioId/entities/:entityId/knowledge-preview',
    async (request, reply) => {
      if (!service)
        return reply.code(503).send({
          code: 'dependency_unavailable',
          message: 'Database is not configured',
          requestId: request.id,
          retryable: true,
        });
      const params = request.params as { scenarioId: string; entityId: string };
      return service.knowledgePreview(params.scenarioId, params.entityId);
    },
  );
  app.post('/api/v1/scenarios/:scenarioId/authoring/propose', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const scenarioId = (request.params as { scenarioId: string }).scenarioId;
    const body = request.body as { kind?: string; brief?: string; constraints?: string[] };
    const record = await service.get(scenarioId);
    if (!record) return reply.code(404).send({ code: 'not_found', message: 'Scenario not found', requestId: request.id, retryable: false });
    const kind = body.kind ?? 'scenario';
    const brief = body.brief?.trim() ?? '';
    if (!brief) return reply.code(400).send({ code: 'invalid_request', message: 'Authoring brief is required', requestId: request.id, retryable: false });
    if (kind === 'continuity_review') return reply.code(400).send({ code: 'invalid_request', message: 'Use the authoring continuity-review endpoint for findings-only reviews', requestId: request.id, retryable: false });
    const aggregate = record.revision.aggregate as { scenario: { title: string; premise: string }; [key: string]: unknown };
    const provider = environment.GENERATION_PROVIDER === 'fake' || environment.GENERATION_API_KEY === 'fake'
      ? new FakeGenerationProvider()
      : new AdityaGuptaGenerationProvider({ baseUrl: environment.GENERATION_BASE_URL, apiKey: environment.GENERATION_API_KEY, provider: environment.GENERATION_PROVIDER, retries: 1 });
    const promptName = kind === 'character' ? 'scenario-character-authoring' : kind === 'location' ? 'scenario-location-authoring' : kind === 'historical_event' ? 'scenario-historical-event-authoring' : kind === 'story_card' ? 'scenario-story-card-authoring' : kind === 'plot_point' ? 'scenario-plot-point-authoring' : undefined;
    if (!promptName) return reply.code(400).send({ code: 'invalid_request', message: `Unsupported authoring kind: ${kind}`, requestId: request.id, retryable: false });
    const prompt = promptRegistry.get(`${promptName}@2`);
    if (!prompt) throw new Error(`Authoring prompt is not registered: ${promptName}`);
    const rendered = prompt.render({ brief, constraints: body.constraints ?? [], context: JSON.stringify({ title: aggregate.scenario.title, premise: aggregate.scenario.premise, counts: Object.fromEntries(Object.entries(aggregate).map(([key, value]) => [key, Array.isArray(value) ? value.length : undefined])) }) });
    const generated = await provider.generateObject({
      model: environment.GENERATION_DEFAULT_MODEL,
      system: rendered.system,
      input: rendered.user,
      schemaName: 'ScenarioAuthoringProposal',
      schema: { type: 'object', additionalProperties: false, required: ['summary', 'operations'], properties: { summary: { type: 'string' }, operations: { type: 'array' } } },
      outputTokenLimit: 4_000,
      parse: (value) => {
        const candidate = value as { summary?: unknown; operations?: unknown };
        const operations = Array.isArray(candidate.operations) ? candidate.operations.map((operation) => scenarioOperationSchema.parse(operation)) : [];
        if (!operations.length) throw new Error('Authoring model returned no valid operations');
        return { summary: String(candidate.summary ?? brief), operations };
      },
    });
    return reply.code(201).send(await service.createProposal(scenarioId, { toolName: `authoring.${kind}`, summary: generated.value.summary, operations: generated.value.operations, model: generated.model, promptVersion: prompt.version }, request.id));
  });

  app.post('/api/v1/scenarios/:scenarioId/authoring/chat', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const scenarioId = (request.params as { scenarioId: string }).scenarioId;
    const body = request.body as { message?: string; kind?: string; history?: Array<{ role: string; content: string }>; mode?: 'fast' | 'deep' };
    const message = body.message?.trim() ?? '';
    if (!message) return reply.code(400).send({ code: 'invalid_request', message: 'Message is required', requestId: request.id, retryable: false });
    const record = await service.get(scenarioId);
    if (!record) return reply.code(404).send({ code: 'not_found', message: 'Scenario not found', requestId: request.id, retryable: false });
    const aggregate = record.revision.aggregate as { scenario: { title: string; premise: string }; [key: string]: unknown };
    const kind = body.kind ?? 'scenario';
    const promptName = kind === 'character' ? 'scenario-character-authoring' : kind === 'location' ? 'scenario-location-authoring' : kind === 'historical_event' ? 'scenario-historical-event-authoring' : kind === 'story_card' ? 'scenario-story-card-authoring' : kind === 'plot_point' ? 'scenario-plot-point-authoring' : 'scenario-continuity-review';
    const prompt = promptRegistry.get(`${promptName}@2`);
    if (!prompt) throw new Error(`Authoring prompt is not registered: ${promptName}`);
    const historyText = (body.history ?? []).slice(-12).map((item) => `${item.role}: ${item.content}`).join('\n');
    const rendered = prompt.render({ brief: `${historyText}\nuser: ${message}`, constraints: ['Ask clarifying questions when a safe typed proposal cannot be constructed.', 'Never apply changes directly.'], context: JSON.stringify({ title: aggregate.scenario.title, premise: aggregate.scenario.premise, aggregate }) });
    const provider = environment.GENERATION_PROVIDER === 'fake' || environment.GENERATION_API_KEY === 'fake'
      ? new FakeGenerationProvider()
      : new AdityaGuptaGenerationProvider({ baseUrl: environment.GENERATION_BASE_URL, apiKey: environment.GENERATION_API_KEY, provider: environment.GENERATION_PROVIDER, retries: 1 });
    const generated = await provider.generateObject({
      model: environment.GENERATION_DEFAULT_MODEL,
      system: `${rendered.system}\nAct as a helpful scenario-building agent. Return a natural-language reply plus optional typed operations.`,
      input: rendered.user,
      schemaName: 'ScenarioAuthoringChatResponse',
      schema: { type: 'object', additionalProperties: false, required: ['reply', 'summary', 'operations'], properties: { reply: { type: 'string' }, summary: { type: 'string' }, operations: { type: 'array' } } },
      outputTokenLimit: body.mode === 'deep' ? 6_000 : 3_000,
      parse: (value) => {
        const candidate = value as { reply?: unknown; summary?: unknown; operations?: unknown };
        const operations = Array.isArray(candidate.operations) ? candidate.operations.map((operation) => scenarioOperationSchema.parse(operation)) : [];
        return { reply: String(candidate.reply ?? 'I could not form a safe proposal yet.'), summary: String(candidate.summary ?? message), operations };
      },
    });
    let proposalId: string | null = null;
    if (generated.value.operations.length) {
      const proposal = await service.createProposal(scenarioId, { toolName: `authoring.chat.${kind}`, summary: generated.value.summary, operations: generated.value.operations, model: generated.model, promptVersion: prompt.version }, request.id);
      proposalId = proposal.id;
    }
    return { reply: generated.value.reply, proposalId, model: generated.model, mode: body.mode ?? 'fast' };
  });

  app.post('/api/v1/scenarios/:scenarioId/authoring/continuity-review', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const scenarioId = (request.params as { scenarioId: string }).scenarioId;
    const record = await service.get(scenarioId);
    if (!record) return reply.code(404).send({ code: 'not_found', message: 'Scenario not found', requestId: request.id, retryable: false });
    const aggregate = record.revision.aggregate as { scenario: { title: string; premise: string }; [key: string]: unknown };
    const prompt = promptRegistry.get('scenario-continuity-review@2');
    if (!prompt) throw new Error('Authoring prompt is not registered: scenario-continuity-review');
    const provider = environment.GENERATION_PROVIDER === 'fake' || environment.GENERATION_API_KEY === 'fake'
      ? new FakeGenerationProvider()
      : new AdityaGuptaGenerationProvider({ baseUrl: environment.GENERATION_BASE_URL, apiKey: environment.GENERATION_API_KEY, provider: environment.GENERATION_PROVIDER, retries: 1 });
    const rendered = prompt.render({
      brief: 'Review the complete scenario and return findings only. Do not propose or apply operations.',
      constraints: ['Return findings only.', 'Do not apply changes.', 'Distinguish deterministic structural issues from craft recommendations.'],
      context: JSON.stringify({ title: aggregate.scenario.title, premise: aggregate.scenario.premise, aggregate }),
    });
    const generated = await provider.generateObject({
      model: environment.GENERATION_DEFAULT_MODEL,
      system: rendered.system,
      input: rendered.user,
      schemaName: 'ScenarioContinuityReview',
      schema: {
        type: 'object',
        additionalProperties: false,
        required: ['findings'],
        properties: {
          findings: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['path', 'message', 'severity', 'section'],
              properties: {
                path: { type: 'string' },
                message: { type: 'string' },
                severity: { type: 'string', enum: ['error', 'warning'] },
                section: { type: 'string' },
                resourceId: { type: 'string' },
              },
            },
          },
        },
      },
      outputTokenLimit: 4_000,
      parse: (value) => {
        const candidate = value as { findings?: unknown };
        const findings = Array.isArray(candidate.findings) ? candidate.findings.flatMap((item) => {
          if (!item || typeof item !== 'object') return [];
          const finding = item as Record<string, unknown>;
          const severity = finding.severity === 'error' ? 'error' : finding.severity === 'warning' ? 'warning' : null;
          if (!severity || typeof finding.path !== 'string' || typeof finding.message !== 'string' || typeof finding.section !== 'string') return [];
          return [{
            path: finding.path,
            message: finding.message,
            severity,
            section: finding.section,
            ...(typeof finding.resourceId === 'string' ? { resourceId: finding.resourceId } : {}),
          }];
        }) : [];
        return { findings };
      },
    });
    return {
      scenarioId,
      revisionId: record.revision.id,
      version: record.revision.version,
      findings: generated.value.findings,
      model: generated.model,
      promptVersion: prompt.version,
    };
  });

  app.get('/api/v1/scenarios/:scenarioId/continuity-review', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    return service.continuityReview((request.params as { scenarioId: string }).scenarioId);
  });
  app.get('/api/v1/scenarios/:scenarioId/proposals', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    return service.listProposals((request.params as { scenarioId: string }).scenarioId);
  });
  app.post('/api/v1/scenarios/:scenarioId/proposals', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const body = request.body as { toolName?: string; summary?: string; operations?: unknown; model?: string; promptVersion?: number };
    return reply.code(201).send(await service.createProposal((request.params as { scenarioId: string }).scenarioId, {
      toolName: body.toolName ?? 'scenario.authoring',
      summary: body.summary ?? 'Scenario authoring proposal',
      operations: body.operations,
      ...(body.model ? { model: body.model } : {}),
      ...(body.promptVersion ? { promptVersion: body.promptVersion } : {}),
    }, request.id));
  });
  app.patch('/api/v1/scenarios/:scenarioId/proposals/:proposalId', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const params = request.params as { scenarioId: string; proposalId: string };
    const body = request.body as { summary?: string; operations?: unknown };
    return service.editProposal(params.scenarioId, params.proposalId, { ...(body.summary ? { summary: body.summary } : {}), operations: body.operations }, request.id);
  });
  app.post('/api/v1/scenarios/:scenarioId/proposals/:proposalId/reject', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const params = request.params as { scenarioId: string; proposalId: string };
    return service.rejectProposal(params.scenarioId, params.proposalId, request.id);
  });
  app.post('/api/v1/scenarios/:scenarioId/proposals/:proposalId/apply', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const body = request.body as { expectedVersion?: number };
    return service.applyProposal((request.params as { scenarioId: string; proposalId: string }).scenarioId, (request.params as { scenarioId: string; proposalId: string }).proposalId, body.expectedVersion ?? 0, request.id);
  });
  app.post('/api/v1/scenarios/:scenarioId/publish-revision', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return service.publish((request.params as { scenarioId: string }).scenarioId, request.id);
  });
  app.get('/api/v1/scenarios/:scenarioId/story-cards/:cardId/mutation-proposals', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    return service.listCardMutationProposals((request.params as { cardId: string }).cardId);
  });
  app.post('/api/v1/scenarios/:scenarioId/story-cards/:cardId/mutation-proposals', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const body = request.body as Parameters<ScenarioService['createCardMutationProposal']>[1];
    return reply.code(201).send(await service.createCardMutationProposal((request.params as { cardId: string }).cardId, body, request.id));
  });
  app.post('/api/v1/scenarios/:scenarioId/story-cards/:cardId/mutation-proposals/:proposalId/apply', async (request, reply) => {
    if (!service)
      return reply.code(503).send({ code: 'dependency_unavailable', message: 'Database is not configured', requestId: request.id, retryable: true });
    const params = request.params as { cardId: string; proposalId: string };
    return service.applyCardMutationProposal(params.cardId, params.proposalId, request.id);
  });
  app.get('/api/v1/scenarios/:scenarioId/story-cards/:cardId/versions', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return service.cardVersions((request.params as { cardId: string }).cardId);
  });
  app.get('/api/v1/scenarios/:scenarioId/story-cards/:cardId/links', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return service.cardLinks((request.params as { cardId: string }).cardId);
  });
  app.post('/api/v1/scenarios/:scenarioId/story-cards/:cardId/lock', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as { locked: boolean };
    return service.lockCard((request.params as { cardId: string }).cardId, body.locked);
  });
  app.post('/api/v1/scenarios/:scenarioId/story-cards/:cardId/rollback', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as { sourceVersion: number };
    return service.rollbackCard(
      (request.params as { cardId: string }).cardId,
      body.sourceVersion,
      request.id,
    );
  });
  app.get('/api/v1/scenarios/:scenarioId/:collection', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; collection: string };
    if (!collectionNames.has(params.collection))
      return reply.code(404).send({
        code: 'not_found',
        message: 'Resource collection not found',
        requestId: request.id,
        retryable: false,
      });
    const result = await service.get(params.scenarioId);
    if (!result)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Scenario not found',
        requestId: request.id,
        retryable: false,
      });
    return (result.revision.aggregate as Record<string, unknown>)[params.collection] ?? [];
  });
  app.post('/api/v1/scenarios/:scenarioId/:collection', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; collection: string };
    if (!collectionNames.has(params.collection))
      return reply.code(404).send({
        code: 'not_found',
        message: 'Resource collection not found',
        requestId: request.id,
        retryable: false,
      });
    const body = request.body as { expectedVersion?: number; value?: unknown };
    return reply
      .code(201)
      .send(
        await service.updateCollection(
          params.scenarioId,
          body.expectedVersion ?? 0,
          params.collection,
          'add',
          undefined,
          body.value,
          request.id,
        ),
      );
  });
  app.post(
    '/api/v1/scenarios/:scenarioId/:collection/:resourceId/duplicate',
    async (request, reply) => {
      if (!service)
        return reply.code(503).send({
          code: 'dependency_unavailable',
          message: 'Database is not configured',
          requestId: request.id,
          retryable: true,
        });
      const params = request.params as {
        scenarioId: string;
        collection: string;
        resourceId: string;
      };
      const body = request.body as { expectedVersion: number; newId: string };
      return reply
        .code(201)
        .send(
          await service.duplicateCollection(
            params.scenarioId,
            body.expectedVersion,
            params.collection,
            params.resourceId,
            body.newId,
            request.id,
          ),
        );
    },
  );
  app.post(
    '/api/v1/scenarios/:scenarioId/:collection/:resourceId/archive',
    async (request, reply) => {
      if (!service)
        return reply.code(503).send({
          code: 'dependency_unavailable',
          message: 'Database is not configured',
          requestId: request.id,
          retryable: true,
        });
      const params = request.params as {
        scenarioId: string;
        collection: string;
        resourceId: string;
      };
      const body = request.body as { expectedVersion: number };
      return service.archiveCollection(
        params.scenarioId,
        body.expectedVersion,
        params.collection,
        params.resourceId,
        request.id,
      );
    },
  );
  app.patch('/api/v1/scenarios/:scenarioId/:collection/:resourceId', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; collection: string; resourceId: string };
    const body = request.body as { expectedVersion?: number; value?: unknown };
    return service.updateCollection(
      params.scenarioId,
      body.expectedVersion ?? 0,
      params.collection,
      'replace',
      params.resourceId,
      body.value,
      request.id,
    );
  });
  app.delete('/api/v1/scenarios/:scenarioId/:collection/:resourceId', async (request, reply) => {
    if (!service)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { scenarioId: string; collection: string; resourceId: string };
    const body = request.body as { expectedVersion?: number };
    await service.updateCollection(
      params.scenarioId,
      body.expectedVersion ?? 0,
      params.collection,
      'remove',
      params.resourceId,
      undefined,
      request.id,
    );
    return reply.code(204).send();
  });
  app.post('/api/v1/runs', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as { revisionId: string; playerEntityId: string };
    return reply.code(201).send(await runs.create({ ...body, actorId: request.id }));
  });
  app.get('/api/v1/runs', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.list();
  });
  app.post('/api/v1/runs/:runId/archive', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.archive((request.params as { runId: string }).runId);
  });
  app.get('/api/v1/runs/:runId', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const run = await runs.get((request.params as { runId: string }).runId);
    if (!run)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Run not found',
        requestId: request.id,
        retryable: false,
      });
    return run;
  });
  app.get('/api/v1/runs/:runId/scene', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.scene((request.params as { runId: string }).runId);
  });
  app.get('/api/v1/runs/:runId/journal', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.playerJournal((request.params as { runId: string }).runId);
  });

  app.get('/api/v1/runs/:runId/timeline', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.timeline((request.params as { runId: string }).runId);
  });
  app.get('/api/v1/runs/:runId/responses/:segmentId/details', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { runId: string; segmentId: string };
    return runs.responseDetails(params.runId, params.segmentId);
  });
  app.get('/api/v1/runs/:runId/turns/:turnId', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { runId: string; turnId: string };
    const turn = await runs.getTurn(params.runId, params.turnId);
    if (!turn)
      return reply.code(404).send({
        code: 'not_found',
        message: 'Turn not found',
        requestId: request.id,
        retryable: false,
      });
    return turn;
  });
  app.get('/api/v1/runs/:runId/turns/:turnId/stream', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const params = request.params as { runId: string; turnId: string };
    reply.hijack();
    reply.raw.writeHead(200, {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache',
      connection: 'keep-alive',
      [environment.REQUEST_ID_HEADER]: request.id,
    });
    const lastEventId = Number(request.headers['last-event-id'] ?? 0) || 0;
    const durableReplay = await runs.replayStreamEvents(params.turnId, lastEventId);
    if (durableReplay.length && lastEventId > 0) {
      for (const event of durableReplay)
        reply.raw.write(
          `id: ${event.id}\nevent: ${event.eventType}\ndata: ${JSON.stringify(event.payload)}\n\n`,
        );
      reply.raw.end();
      return;
    }
    const replay = streamReplay.get(params.turnId) ?? [];
    let eventId = replay.at(-1)?.id ?? 0;
    const send = async (type: string, data: unknown) => {
      const event = { id: ++eventId, type, data };
      const events = streamReplay.get(params.turnId) ?? [];
      events.push(event);
      streamReplay.set(params.turnId, events.slice(-500));
      await runs.recordStreamEvent({
        turnId: params.turnId,
        eventKey: `${params.turnId}:stream:${event.id}`,
        eventType: type,
        payload: data,
      });
      reply.raw.write(
        `id: ${event.id}\nevent: ${event.type}\ndata: ${JSON.stringify(event.data)}\n\n`,
      );
    };
    if (!replay.length) await send('turn.accepted', { turnId: params.turnId });
    const turn = await runs.getTurn(params.runId, params.turnId);
    if (turn) await send('turn.stage_changed', { stage: turn.stage, status: turn.status });
    if (turn?.status === 'completed' || turn?.status === 'cancelled' || turn?.status === 'failed')
      await send(
        turn.status === 'completed'
          ? 'turn.completed'
          : turn.status === 'cancelled'
            ? 'turn.cancelled'
            : 'turn.failed',
        { turnId: turn.id },
      );
    await send('heartbeat', { at: new Date().toISOString() });
    reply.raw.end();
  });
  app.post('/api/v1/runs/:runId/turns/:turnId/cancel', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.cancelTurn(
      (request.params as { runId: string; turnId: string }).runId,
      (request.params as { turnId: string }).turnId,
    );
  });
  app.post('/api/v1/runs/:runId/turns/:turnId/retry', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    return runs.retryTurn(
      (request.params as { runId: string; turnId: string }).runId,
      (request.params as { turnId: string }).turnId,
    );
  });
  app.post('/api/v1/runs/:runId/turns', async (request, reply) => {
    if (!runs)
      return reply.code(503).send({
        code: 'dependency_unavailable',
        message: 'Database is not configured',
        requestId: request.id,
        retryable: true,
      });
    const body = request.body as {
      text: string;
      idempotencyKey: string;
      expectedVersion: number;
      branchId: string;
    };
    return reply
      .code(202)
      .send(await runs.acceptTurn((request.params as { runId: string }).runId, body));
  });
  return app;
}
