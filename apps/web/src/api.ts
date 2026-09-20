export interface ApiError {
  code: string;
  message: string;
  requestId?: string;
  retryable?: boolean;
}
export interface ScenarioSummary {
  id: string;
  slug: string;
  title: string;
  status: string;
  currentRevision: number;
  version: number;
}
export interface ScenarioRecord {
  scenario: ScenarioSummary;
  revision: { id: string; version: number; status: string; aggregate: ScenarioAggregate };
}
export interface TurnRecord {
  id: string;
  turnNumber: number;
  rawPlayerInput: string;
  status: string;
  stage: string;
  segmentId?: string | null;
  finalNarrative?: string | null;
  failure?: { code?: string; message?: string } | null;
  dialogueAttributions?: Array<{
    quote: string;
    speakerEntityId: string | null;
    confidence: number;
  }>;
}
export interface ScenarioAggregate {
  scenario: {
    id: string;
    revisionId: string;
    slug: string;
    title: string;
    premise: string;
    description: string;
    [key: string]: unknown;
  };
  entities: unknown[];
  relationships: unknown[];
  locations: unknown[];
  locationEdges: unknown[];
  storyCards: unknown[];
  storyCardLinks: unknown[];
  plotArcs: unknown[];
  plotPoints: unknown[];
  [key: string]: unknown;
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`/api/v1${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const body = (await response.json()) as T | ApiError;
  if (!response.ok)
    throw new Error(
      typeof body === 'object' && body !== null && 'message' in body
        ? String(body.message)
        : `Request failed (${response.status})`,
    );
  return body as T;
}
export function createClientIdempotencyKey(): string {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === 'function') return cryptoApi.randomUUID();
  if (cryptoApi?.getRandomValues) {
    const bytes = cryptoApi.getRandomValues(new Uint32Array(4));
    return Array.from(bytes)
      .map((value) => value.toString(16).padStart(8, '0'))
      .join('-');
  }
  return `client-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
export const api = {
  listScenarios: (query = '') => request<ScenarioSummary[]>(`/scenarios${query}`),
  getModelSettings: () =>
    request<{
      configured: boolean;
      provider: string;
      defaultModel: string;
      maxResponseLength?: number;
      models?: Array<{ id: string; name?: string; provider: string }>;
    }>('/settings/models'),
  getEmbeddingSettings: () =>
    request<{
      enabled: boolean;
      provider: string;
      model: string;
      dimensions: number;
      distance: string;
      keyConfigured: boolean;
    }>('/settings/embeddings'),
  refreshModels: () =>
    request<{ configured: boolean; provider: string; defaultModel: string; models: unknown[] }>(
      '/settings/models/refresh',
      { method: 'POST' },
    ),
  setActiveModel: (model: string) =>
    request<{ ok: boolean; activeModel: string }>('/settings/models/active', {
      method: 'PUT',
      body: JSON.stringify({ model }),
    }),
  testModel: (model?: string) =>
    request<{ ok: boolean; provider?: string; model: string; error?: string; usage?: unknown }>(
      '/settings/models/test',
      { method: 'POST', body: JSON.stringify({ model }) },
    ),
  createRun: (revisionId: string, playerEntityId: string) =>
    request<{ runId: string; branchId: string }>('/runs', {
      method: 'POST',
      body: JSON.stringify({ revisionId, playerEntityId }),
    }),
  listRuns: () =>
    request<Array<{ id: string; status: string; currentTurn: number; activeBranchId: string }>>(
      '/runs',
    ),
  getResponseDetails: (runId: string, segmentId: string) =>
    request<{
      segmentId: string;
      thoughts: Array<{
        id: string;
        ownerEntityId: string;
        text: string;
        persistence: string;
        salience: number;
        urgency: number;
      }>;
      invocations?: Array<{
        id: string;
        role: string;
        stage: string;
        principalKind?: string | null;
        principalEntityId?: string | null;
        provider: string;
        modelId: string;
        usage: { inputTokens?: number; outputTokens?: number };
        input?: { inputPayload?: string };
        latencyMs?: number;
        createdAt: string;
      }>;
    }>(`/runs/${encodeURIComponent(runId)}/responses/${encodeURIComponent(segmentId)}/details`),
  getJournal: (id: string) =>
    request<{
      runId: string;
      playerEntityId: string;
      observations: Array<{ id: string; turnNumber: number; modality: string; content: string }>;
      narratives: Array<{ id: string; turnId: string; text: string }>;
    }>(`/runs/${encodeURIComponent(id)}/journal`),
  getTimeline: (id: string) => request<TurnRecord[]>(`/runs/${encodeURIComponent(id)}/timeline`),
  getScene: (id: string) =>
    request<{ runId: string; branchId: string; worldTime?: string; entities: unknown[]; locations: unknown[] }>(
      `/runs/${encodeURIComponent(id)}/scene`,
    ),
  getRun: (id: string) =>
    request<{
      id: string;
      status: string;
      currentTurn: number;
      expectedVersion: number;
      activeBranchId: string;
    }>(`/runs/${encodeURIComponent(id)}`),
  acceptTurn: (
    id: string,
    input: { text: string; idempotencyKey: string; expectedVersion: number; branchId: string },
  ) =>
    request<unknown>(`/runs/${encodeURIComponent(id)}/turns`, {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  getTurn: (runId: string, turnId: string) =>
    request<unknown>(`/runs/${encodeURIComponent(runId)}/turns/${encodeURIComponent(turnId)}`),
  cancelTurn: (runId: string, turnId: string) =>
    request<unknown>(
      `/runs/${encodeURIComponent(runId)}/turns/${encodeURIComponent(turnId)}/cancel`,
      { method: 'POST' },
    ),
  retryTurn: (runId: string, turnId: string) =>
    request<unknown>(
      `/runs/${encodeURIComponent(runId)}/turns/${encodeURIComponent(turnId)}/retry`,
      { method: 'POST' },
    ),
  getScenario: (id: string) => request<ScenarioRecord>(`/scenarios/${encodeURIComponent(id)}`),
  createScenario: (aggregate: ScenarioAggregate) =>
    request<{ scenarioId: string; revisionId: string }>('/scenarios', {
      method: 'POST',
      body: JSON.stringify({ aggregate }),
    }),
  cloneScenario: (id: string, newScenarioId: string, newRevisionId: string, newSlug: string) =>
    request<{ scenarioId: string; revisionId: string }>(
      `/scenarios/${encodeURIComponent(id)}/clone`,
      { method: 'POST', body: JSON.stringify({ newScenarioId, newRevisionId, newSlug }) },
    ),
  archiveScenario: (id: string, expectedVersion: number) =>
    request<ScenarioSummary>(`/scenarios/${encodeURIComponent(id)}/archive`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion }),
    }),
  exportScenario: async (id: string) => {
    const response = await fetch(`/api/v1/scenarios/${encodeURIComponent(id)}/export`);
    if (!response.ok) throw new Error('Export failed');
    return response.blob();
  },
  importScenario: (value: unknown) =>
    request<{ scenarioId: string; revisionId: string }>('/scenarios/import', {
      method: 'POST',
      body: JSON.stringify(value),
    }),
  patchAggregate: (id: string, expectedVersion: number, scenario: Record<string, unknown>) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/aggregate`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedVersion, scenario }),
    }),
  patchScenario: (id: string, expectedVersion: number, patch: Record<string, unknown>) =>
    request<ScenarioSummary>(`/scenarios/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify({ expectedVersion, ...patch }),
    }),
  knowledgePreview: (id: string, entityId: string) =>
    request<{
      principal: unknown;
      resources: Array<{ id: string; scope: string; text: string; sourceId: string }>;
    }>(
      `/scenarios/${encodeURIComponent(id)}/entities/${encodeURIComponent(entityId)}/knowledge-preview`,
    ),
  proposeAuthoring: (id: string, input: { kind: string; brief: string; constraints?: string[] }) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/authoring/propose`, { method: 'POST', body: JSON.stringify(input) }),
  authoringChat: (id: string, input: { kind: string; message: string; history: Array<{ role: string; content: string }>; mode: 'fast' | 'deep' }) =>
    request<{ reply: string; proposalId: string | null; model: string; mode: string }>(`/scenarios/${encodeURIComponent(id)}/authoring/chat`, { method: 'POST', body: JSON.stringify(input) }),
  listProposals: (id: string) =>
    request<Array<{ id: string; toolName: string; summary: string; operations: unknown[]; validation: { valid: boolean; errors: unknown[]; warnings: unknown[] }; status: string; baseVersion: number; createdAt: string }>>(`/scenarios/${encodeURIComponent(id)}/proposals`),
  createProposal: (id: string, input: { toolName: string; summary: string; operations: unknown[]; model?: string; promptVersion?: number }) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/proposals`, { method: 'POST', body: JSON.stringify(input) }),
  editProposal: (id: string, proposalId: string, input: { summary?: string; operations: unknown[] }) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/proposals/${encodeURIComponent(proposalId)}`, { method: 'PATCH', body: JSON.stringify(input) }),
  rejectProposal: (id: string, proposalId: string) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/proposals/${encodeURIComponent(proposalId)}/reject`, { method: 'POST', body: JSON.stringify({}) }),
  applyProposal: (id: string, proposalId: string, expectedVersion: number) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/proposals/${encodeURIComponent(proposalId)}/apply`, { method: 'POST', body: JSON.stringify({ expectedVersion }) }),
  validateScenario: (id: string) =>
    request<{
      valid: boolean;
      errors: Array<{ path: string; message: string; section: string }>;
      warnings: Array<{ path: string; message: string; section: string }>;
    }>(`/scenarios/${encodeURIComponent(id)}/validate`, { method: 'POST' }),
  continuityReview: (id: string) =>
    request<{
      valid: boolean;
      findings: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
        section: string;
        resourceId?: string;
      }>;
    }>(`/scenarios/${encodeURIComponent(id)}/continuity-review`),
  authoringContinuityReview: (id: string) =>
    request<{
      scenarioId: string;
      revisionId: string;
      version: number;
      findings: Array<{
        path: string;
        message: string;
        severity: 'error' | 'warning';
        section: string;
        resourceId?: string;
      }>;
      model: string;
      promptVersion: number;
    }>(`/scenarios/${encodeURIComponent(id)}/authoring/continuity-review`, { method: 'POST', body: JSON.stringify({}) }),
  duplicateResource: (
    id: string,
    collection: string,
    resourceId: string,
    expectedVersion: number,
    newId: string,
  ) =>
    request<unknown>(
      `/scenarios/${encodeURIComponent(id)}/${collection}/${encodeURIComponent(resourceId)}/duplicate`,
      { method: 'POST', body: JSON.stringify({ expectedVersion, newId }) },
    ),
  getCardMutationProposals: (scenarioId: string, cardId: string) =>
    request<unknown[]>(`/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/mutation-proposals`),
  applyCardMutationProposal: (scenarioId: string, cardId: string, proposalId: string) =>
    request<unknown>(`/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/mutation-proposals/${encodeURIComponent(proposalId)}/apply`, { method: 'POST', body: JSON.stringify({}) }),
  getCardVersions: (scenarioId: string, cardId: string) =>
    request<unknown[]>(
      `/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/versions`,
    ),
  getCardLinks: (scenarioId: string, cardId: string) =>
    request<unknown[]>(
      `/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/links`,
    ),
  lockCard: (scenarioId: string, cardId: string, locked: boolean) =>
    request<unknown>(
      `/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/lock`,
      { method: 'POST', body: JSON.stringify({ locked }) },
    ),
  rollbackCard: (scenarioId: string, cardId: string, sourceVersion: number) =>
    request<unknown>(
      `/scenarios/${encodeURIComponent(scenarioId)}/story-cards/${encodeURIComponent(cardId)}/rollback`,
      { method: 'POST', body: JSON.stringify({ sourceVersion }) },
    ),
  archiveResource: (id: string, collection: string, resourceId: string, expectedVersion: number) =>
    request<unknown>(
      `/scenarios/${encodeURIComponent(id)}/${collection}/${encodeURIComponent(resourceId)}/archive`,
      { method: 'POST', body: JSON.stringify({ expectedVersion }) },
    ),
  addResource: (id: string, collection: string, expectedVersion: number, value: unknown) =>
    request<unknown>(`/scenarios/${encodeURIComponent(id)}/${collection}`, {
      method: 'POST',
      body: JSON.stringify({ expectedVersion, value }),
    }),
};
