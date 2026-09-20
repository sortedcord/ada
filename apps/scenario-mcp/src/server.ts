/* eslint-disable */
import { createInterface } from 'node:readline';

const apiBaseUrl = (process.env.SCENARIO_API_URL ?? 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');

type JsonRpcRequest = { jsonrpc?: string; id?: string | number; method?: string; params?: Record<string, unknown> };

const tools = [
  {
    name: 'scenario_get',
    description: 'Read a scenario and its current draft/published revision.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_validate',
    description: 'Validate the complete scenario aggregate and return errors and warnings.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_propose',
    description: 'Generate a typed scenario authoring proposal. It never applies changes directly.',
    inputSchema: {
      type: 'object',
      required: ['scenarioId', 'kind', 'brief'],
      properties: {
        scenarioId: { type: 'string' },
        kind: { type: 'string', enum: ['character', 'location', 'historical_event', 'story_card', 'plot_point', 'continuity_review'] },
        brief: { type: 'string' },
        constraints: { type: 'array', items: { type: 'string' } },
      },
    },
  },
  {
    name: 'scenario_chat',
    description: 'Continue a scenario-builder agent conversation and stage any typed proposal for review.',
    inputSchema: { type: 'object', required: ['scenarioId', 'message'], properties: { scenarioId: { type: 'string' }, message: { type: 'string' }, kind: { type: 'string' }, mode: { type: 'string', enum: ['fast', 'deep'] }, history: { type: 'array' } } },
  },
  {
    name: 'scenario_continuity_review',
    description: 'Run a deterministic continuity and reference review over a scenario.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_list_proposals',
    description: 'List pending and historical authoring proposals for a scenario.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_apply_proposal',
    description: 'Apply an approved proposal against an expected draft revision version.',
    inputSchema: { type: 'object', required: ['scenarioId', 'proposalId', 'expectedVersion'], properties: { scenarioId: { type: 'string' }, proposalId: { type: 'string' }, expectedVersion: { type: 'integer' } } },
  },
] as const;

async function callApi(path: string, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${apiBaseUrl}${path}`, { ...init, headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body === 'object' && body && 'message' in body ? String(body.message) : `API request failed (${response.status})`);
  return body;
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const scenarioId = String(args.scenarioId ?? '');
  if (name === 'scenario_get') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}`);
  if (name === 'scenario_validate') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/validate`, { method: 'POST', body: JSON.stringify({}) });
  if (name === 'scenario_propose') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/authoring/propose`, { method: 'POST', body: JSON.stringify({ kind: args.kind, brief: args.brief, constraints: args.constraints ?? [] }) });
  if (name === 'scenario_chat') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/authoring/chat`, { method: 'POST', body: JSON.stringify({ message: args.message, kind: args.kind ?? 'scenario', mode: args.mode ?? 'fast', history: args.history ?? [] }) });
  if (name === 'scenario_continuity_review') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/continuity-review`);
  if (name === 'scenario_list_proposals') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/proposals`);
  if (name === 'scenario_apply_proposal') return callApi(`/scenarios/${encodeURIComponent(scenarioId)}/proposals/${encodeURIComponent(String(args.proposalId))}/apply`, { method: 'POST', body: JSON.stringify({ expectedVersion: args.expectedVersion }) });
  throw new Error(`Unknown tool: ${name}`);
}

function send(id: string | number | undefined, result: unknown): void {
  process.stdout.write(`${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`);
}

const input = createInterface({ input: process.stdin, crlfDelay: Infinity });
input.on('line', async (line) => {
  if (!line.trim()) return;
  let request: JsonRpcRequest;
  try { request = JSON.parse(line) as JsonRpcRequest; } catch { return; }
  if (request.method === 'notifications/initialized') return;
  try {
    if (request.method === 'initialize') {
      send(request.id, { protocolVersion: '2024-11-05', capabilities: { tools: {} }, serverInfo: { name: 'ada-scenario-authoring', version: '0.1.0' } });
    } else if (request.method === 'tools/list') {
      send(request.id, { tools });
    } else if (request.method === 'tools/call') {
      const params = request.params ?? {};
      const result = await callTool(String(params.name), (params.arguments ?? {}) as Record<string, unknown>);
      send(request.id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }], isError: false });
    } else {
      send(request.id, { error: { code: -32601, message: `Method not found: ${request.method}` } });
    }
  } catch (error) {
    send(request.id, { content: [{ type: 'text', text: error instanceof Error ? error.message : 'Tool failed' }], isError: true });
  }
});
