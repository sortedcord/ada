/* eslint-disable */
import { createInterface } from 'node:readline';

const apiBaseUrl = (process.env.SCENARIO_API_URL ?? 'http://127.0.0.1:3000/api/v1').replace(/\/$/, '');

type JsonRpcRequest = { jsonrpc?: string; id?: string | number; method?: string; params?: Record<string, unknown> };

const tools = [
  {
    name: 'scenario_get',
    description: 'Read a scenario and its current draft/published revision. Use this before authoring so proposals build on existing canon instead of generic defaults.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_validate',
    description: 'Validate the complete scenario aggregate and return structural/reference errors and warnings. Use scenario_continuity_review separately for a broader authoring critique; validation itself does not judge prose quality.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_propose',
    description: 'Generate a typed scenario authoring proposal without applying changes. Write a specific creative brief, not a category label: include concrete sensory evidence, contradictions, costs, speech patterns, contested perspectives, or unusual local details. Bad brief: “make an interesting NPC.” Better brief: “a perfume seller who flinches at loud noises, overpays for shipping rumors, and speaks in clipped half-sentences with a coastal accent.” Read the scenario first and preserve canon.',
    inputSchema: {
      type: 'object',
      required: ['scenarioId', 'kind', 'brief'],
      properties: {
        scenarioId: { type: 'string', description: 'Scenario to extend; inspect it with scenario_get first.' },
        kind: {
          type: 'string',
          oneOf: [
            { const: 'character', description: 'A person with contradiction, private truth, motives, relationships, limitations, and a distinct idiolect.' },
            { const: 'location', description: 'A place grounded in multiple senses, a specific condition, an affordance, and a detail that clashes with expectation.' },
            { const: 'historical_event', description: 'A causal past event with conflicting accounts, scoped knowledge, evidence, and present-day residue.' },
            { const: 'story_card', description: 'A discoverable, player-facing fact or hook activated by behavior, objects, or consequences.' },
            { const: 'plot_point', description: 'A pressure point with multiple approaches, meaningful failure, escalation, and no forced player choice.' },
            { const: 'continuity_review', description: 'A critique that also flags generic, cliché, interchangeable, or unearned content.' },
          ],
        },
        brief: { type: 'string', description: 'Ground the request in named entities, specific objects or sensory traces, tensions, and what must remain unknown. Avoid “mysterious,” “epic,” or “make it interesting” without particulars.' },
        constraints: { type: 'array', items: { type: 'string' }, description: 'Hard canon, scope, tone, or content constraints; state what must not change.' },
      },
    },
  },
  {
    name: 'scenario_chat',
    description: 'Continue a scenario-builder conversation and stage any typed proposal for review. Ask craft questions that expose contradiction, private motives, sensory specificity, speech habits, subtext, resistance, and competing interpretations. Avoid broad prompts such as “tell me more”; ask what the character refuses to discuss, what an observer would misread, or what physical evidence remains.',
    inputSchema: { type: 'object', required: ['scenarioId', 'message'], properties: { scenarioId: { type: 'string' }, message: { type: 'string', description: 'A focused authoring request or question grounded in existing canon.' }, kind: { type: 'string', description: 'Authoring kind: character, location, historical_event, story_card, plot_point, or continuity_review.' }, mode: { type: 'string', enum: ['fast', 'deep'] }, history: { type: 'array' } } },
  },
  {
    name: 'scenario_continuity_review',
    description: 'Run a deterministic continuity and reference review over a scenario. It catches orphaned references and visibility problems; use the returned findings as the structural baseline before revising generic or same-voice content.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_list_proposals',
    description: 'List pending and historical authoring proposals for a scenario so a human can compare, revise, and approve creative alternatives rather than accepting the first generic draft.',
    inputSchema: { type: 'object', required: ['scenarioId'], properties: { scenarioId: { type: 'string' } } },
  },
  {
    name: 'scenario_apply_proposal',
    description: 'Apply an approved proposal against an expected draft revision version. Apply only after reviewing the proposal; this is the canonical mutation step and is guarded by optimistic concurrency.',
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
