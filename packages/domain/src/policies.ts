import { z } from 'zod';
import { confidenceSchema } from './primitives.js';
import type { visibilityScopeSchema } from './primitives.js';
import type { AttemptedAction, Belief, InnerThought, Memory, NpcPrincipalDecision, Observation } from './runtime.js';
import type { Entity, PlotPoint, Relationship, StoryCard } from './scenario.js';

export type Principal =
  | { kind: 'ARCHITECT'; runId: string; branchId: string }
  | { kind: 'RESOLVER'; runId: string; branchId: string }
  | { kind: 'NARRATOR'; runId: string; branchId: string; playerEntityId: string }
  | { kind: 'NPC'; runId: string; branchId: string; entityId: string }
  | { kind: 'MEMORY_CURATOR'; runId: string; branchId: string; entityId: string }
  | { kind: 'PLAYER_VIEW'; runId: string; branchId: string; entityId: string }
  | { kind: 'ADMIN_DEBUG'; runId?: string; branchId?: string };

export type ProtectedResource = {
  kind:
    | 'world_truth'
    | 'public_scenario'
    | 'scene_observable'
    | 'entity_private'
    | 'player_out_of_world_detail'
    | 'architect_private'
    | 'admin_only';
  runId?: string;
  branchId?: string;
  ownerEntityId?: string;
  playerVisible?: boolean;
};

export class KnowledgePolicy {
  canRead(principal: Principal, resource: ProtectedResource): boolean {
    if (!principal.kind || !resource.kind) return false;
    if (
      resource.runId &&
      'runId' in principal &&
      principal.runId &&
      resource.runId !== principal.runId
    )
      return false;
    if (
      resource.branchId &&
      'branchId' in principal &&
      principal.branchId &&
      resource.branchId !== principal.branchId
    )
      return false;
    if (resource.kind === 'admin_only') return principal.kind === 'ADMIN_DEBUG';
    if (resource.kind === 'architect_private')
      return (
        principal.kind === 'ARCHITECT' ||
        principal.kind === 'RESOLVER' ||
        principal.kind === 'ADMIN_DEBUG'
      );
    if (resource.kind === 'world_truth')
      return (
        principal.kind === 'ARCHITECT' ||
        principal.kind === 'RESOLVER' ||
        principal.kind === 'ADMIN_DEBUG'
      );
    if (resource.kind === 'player_out_of_world_detail')
      return principal.kind === 'PLAYER_VIEW' || principal.kind === 'ADMIN_DEBUG';
    if (resource.kind === 'entity_private') {
      if (!resource.ownerEntityId) return false;
      if (
        principal.kind === 'ADMIN_DEBUG' ||
        principal.kind === 'ARCHITECT' ||
        principal.kind === 'RESOLVER'
      )
        return true;
      if (principal.kind === 'NPC' || principal.kind === 'MEMORY_CURATOR')
        return principal.entityId === resource.ownerEntityId;
      return principal.kind === 'PLAYER_VIEW' && principal.entityId === resource.ownerEntityId;
    }
    if (resource.kind === 'scene_observable') {
      if (
        principal.kind === 'ARCHITECT' ||
        principal.kind === 'RESOLVER' ||
        principal.kind === 'ADMIN_DEBUG'
      )
        return true;
      if (principal.kind === 'NARRATOR') return resource.ownerEntityId === principal.playerEntityId;
      if (
        principal.kind === 'NPC' ||
        principal.kind === 'MEMORY_CURATOR' ||
        principal.kind === 'PLAYER_VIEW'
      )
        return resource.ownerEntityId === principal.entityId;
      return false;
    }
    return resource.kind === 'public_scenario';
  }

  queryScope(principal: Principal): {
    principal: Principal;
    allowedScopes: readonly ProtectedResource['kind'][];
    ownerEntityId?: string;
  } {
    if (!principal.kind) throw new Error('Incomplete principal');
    if ('runId' in principal && !principal.runId) throw new Error('Principal run is required');
    if ('branchId' in principal && !principal.branchId)
      throw new Error('Principal branch is required');
    if ('entityId' in principal && !principal.entityId)
      throw new Error('Principal entity is required');
    if (principal.kind === 'NARRATOR' && !principal.playerEntityId)
      throw new Error('Narrator player entity is required');
    const allowedScopes: ProtectedResource['kind'][] = ['public_scenario'];
    if (principal.kind === 'ARCHITECT' || principal.kind === 'RESOLVER')
      allowedScopes.push('world_truth', 'scene_observable', 'entity_private', 'architect_private');
    if (principal.kind === 'ADMIN_DEBUG')
      allowedScopes.push(
        'world_truth',
        'scene_observable',
        'entity_private',
        'player_out_of_world_detail',
        'architect_private',
        'admin_only',
      );
    if (principal.kind === 'NARRATOR') allowedScopes.push('scene_observable');
    if (principal.kind === 'NPC' || principal.kind === 'MEMORY_CURATOR')
      allowedScopes.push('scene_observable', 'entity_private');
    if (principal.kind === 'PLAYER_VIEW')
      allowedScopes.push('scene_observable', 'player_out_of_world_detail');
    return principal.kind === 'NPC' ||
      principal.kind === 'MEMORY_CURATOR' ||
      principal.kind === 'PLAYER_VIEW'
      ? { principal, allowedScopes, ownerEntityId: principal.entityId }
      : { principal, allowedScopes };
  }
}

export const playerControlError = 'The selected player entity is controlled only by player input';
export function assertPlayerAgency(
  actor: Entity,
  action: {
    source: 'player' | 'npc';
    createsThought?: boolean;
    createsGoal?: boolean;
    createsDecision?: boolean;
  },
): void {
  if (
    actor.playable &&
    (action.source === 'npc' ||
      action.createsThought ||
      action.createsGoal ||
      action.createsDecision)
  )
    throw new Error(playerControlError);
}
export function validateAttemptedAction(
  action: AttemptedAction,
  actor: Entity,
  selectedPlayerEntityId: string,
): AttemptedAction {
  if (action.actorEntityId === selectedPlayerEntityId && action.source !== 'player')
    throw new Error(playerControlError);
  assertPlayerAgency(actor, { source: action.source, createsDecision: action.source === 'npc' });
  return action;
}

export function validateNpcPrincipalDecision(
  decision: NpcPrincipalDecision,
  input: {
    principalEntityId: string;
    selectedPlayerEntityId: string;
    authorizedEvidenceIds: ReadonlySet<string>;
  },
): NpcPrincipalDecision {
  if (decision.entityId !== input.principalEntityId) {
    throw new Error('NPC decision principal mismatch');
  }
  if (decision.entityId === input.selectedPlayerEntityId) {
    throw new Error(playerControlError);
  }
  for (const evidenceId of decision.perceivedEvidenceIds) {
    if (!input.authorizedEvidenceIds.has(evidenceId)) {
      throw new Error('NPC decision references unauthorized evidence');
    }
  }
  for (const action of decision.attemptedActions) {
    if (action.actorEntityId !== input.principalEntityId) {
      throw new Error('NPC decision attempted action for another principal');
    }
    if (action.actorEntityId === input.selectedPlayerEntityId) {
      throw new Error(playerControlError);
    }
  }
  return decision;
}

const allowedPatchRoots = new Set([
  'entities',
  'locations',
  'relationships',
  'world',
  'storyCards',
]);
export function validatePatchPath(path: string): string[] {
  if (!path.startsWith('/')) throw new Error('Patch path must be absolute');
  const segments = path.slice(1).split('/');
  if (
    !segments[0] ||
    !allowedPatchRoots.has(segments[0]) ||
    segments.some(
      (segment) => !segment || ['__proto__', 'prototype', 'constructor', '..'].includes(segment),
    )
  )
    throw new Error('Patch path is not allowlisted');
  return segments;
}
export interface CanonicalPatchContext {
  knownEntityIds?: ReadonlySet<string>;
  knownLocationIds?: ReadonlySet<string>;
  knownRelationshipKeys?: ReadonlySet<string>;
  knownStoryCardIds?: ReadonlySet<string>;
  lockedPaths?: ReadonlySet<string>;
  actorPresent?: boolean;
  actorCanPatch?: boolean;
}

function containsUnsafeKey(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(containsUnsafeKey);
  if (!value || typeof value !== 'object') return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      ['__proto__', 'prototype', 'constructor'].includes(key) || containsUnsafeKey(nested),
  );
}

export function validateCanonicalPatch(
  patch: { op: string; path: string; value?: unknown; expectedVersion?: number },
  bounds: { minStat: number; maxStat: number },
  context: CanonicalPatchContext = { actorPresent: true },
): void {
  const segments = validatePatchPath(patch.path);
  if (!['add', 'replace', 'remove'].includes(patch.op))
    throw new Error('Unsupported patch operation');
  if (patch.op !== 'remove' && patch.value === undefined)
    throw new Error('Patch value is required');
  if (
    patch.expectedVersion !== undefined &&
    (!Number.isInteger(patch.expectedVersion) || patch.expectedVersion < 1)
  )
    throw new Error('Patch expected version is invalid');
  if (context.lockedPaths?.has(patch.path)) throw new Error('Patch targets a locked path');
  if (context.actorPresent === false) throw new Error('Patch actor is not present');
  if (context.actorCanPatch === false) throw new Error('Patch actor lacks capability');
  const forbiddenSegments = new Set([
    'beliefs',
    'memories',
    'thoughts',
    'knowledge',
    'visibility',
    'ownerEntityId',
    'permissions',
  ]);
  if (segments.some((segment) => forbiddenSegments.has(segment)))
    throw new Error('Patch cannot propagate knowledge or alter private state');
  if (
    segments[0] === 'entities' &&
    context.knownEntityIds &&
    !context.knownEntityIds.has(segments[1] ?? '')
  )
    throw new Error('Patch references an unknown entity');
  if (
    segments[0] === 'locations' &&
    context.knownLocationIds &&
    !context.knownLocationIds.has(segments[1] ?? '')
  )
    throw new Error('Patch references an unknown location');
  if (
    segments[0] === 'storyCards' &&
    context.knownStoryCardIds &&
    !context.knownStoryCardIds.has(segments[1] ?? '')
  )
    throw new Error('Patch references an unknown story card');
  if (
    segments[0] === 'relationships' &&
    context.knownRelationshipKeys &&
    !context.knownRelationshipKeys.has(segments.slice(1, 4).join('/'))
  )
    throw new Error('Patch references an unknown relationship');
  if (segments[0] === 'world' && segments[1] !== 'time')
    throw new Error('Only world time may be patched');
  if (containsUnsafeKey(patch.value)) throw new Error('Patch value contains an unsafe key');
  if (
    typeof patch.value === 'number' &&
    (patch.value < bounds.minStat || patch.value > bounds.maxStat || !Number.isFinite(patch.value))
  )
    throw new Error('Patch numeric value is outside bounds');
}

export interface PerceptionInput {
  event: {
    locationId: string;
    visibility: 'public_scenario' | 'scene_observable';
    modalities: readonly ('sight' | 'sound' | 'touch')[];
    concealed: boolean;
  };
  observer: Entity;
  observerLocationId: string;
  connectedHearing: boolean;
  hasLineOfSight: boolean;
  canHear: boolean;
  canSee: boolean;
  remote: boolean;
}
export interface PerceptionResult {
  eligible: boolean;
  modalities: readonly PerceptionInput['event']['modalities'][number][];
}
export function perceive(input: PerceptionInput): PerceptionResult {
  if (!input.observer.active || input.remote) return { eligible: false, modalities: [] };
  if (input.event.concealed && !input.hasLineOfSight) return { eligible: false, modalities: [] };
  const sameLocation = input.observerLocationId === input.event.locationId;
  const modalities = input.event.modalities.filter(
    (modality) =>
      (modality === 'sight' && input.canSee && input.hasLineOfSight && sameLocation) ||
      (modality === 'sound' && input.canHear && (sameLocation || input.connectedHearing)) ||
      (modality === 'touch' && sameLocation),
  );
  return { eligible: modalities.length > 0, modalities };
}

export type BeliefChange = {
  kind: 'reinforce' | 'doubt' | 'reject' | 'forget' | 'supersede';
  confidence?: number;
  evidenceIds: readonly string[];
};
export function transitionBelief(belief: Belief, change: BeliefChange, turn: number): Belief {
  const confidence = change.confidence ?? belief.confidence;
  confidenceSchema.parse(confidence);
  const evidence = [
    ...new Set([...belief.evidence.map((ref) => ref.id), ...change.evidenceIds]),
  ].map((id) => ({ type: 'observation' as const, id }));
  const status =
    change.kind === 'doubt'
      ? 'doubted'
      : change.kind === 'reject'
        ? 'rejected'
        : change.kind === 'forget'
          ? 'forgotten'
          : 'active';
  return {
    ...belief,
    confidence,
    status,
    evidence,
    lastReinforcedTurn: turn,
    metadata: { ...belief.metadata, version: belief.metadata.version + 1 },
  };
}

export function memoryDecay(memory: Memory, currentTurn: number): number {
  const elapsed = Math.max(
    0,
    currentTurn - Math.max(memory.reinforcedTurn, memory.lastRecalledTurn ?? memory.reinforcedTurn),
  );
  return Math.max(0, memory.accessibility * Math.exp(-memory.decayRate * elapsed));
}
export function reinforceMemory(memory: Memory, turn: number): Memory {
  return {
    ...memory,
    accessibility: Math.min(1, memory.accessibility + 0.1),
    reinforcedTurn: turn,
    lastRecalledTurn: turn,
    status: 'active',
    metadata: { ...memory.metadata, version: memory.metadata.version + 1 },
  };
}
export function duplicateMemoryKey(
  memory: Pick<Memory, 'ownerEntityId' | 'type' | 'content'>,
): string {
  return `${memory.ownerEntityId}:${memory.type}:${memory.content.trim().toLocaleLowerCase()}`;
}

export function validateThought(
  owner: Entity,
  thought: InnerThought,
  selectedPlayerEntityId: string,
): void {
  if (
    !owner.cognitive ||
    owner.id === selectedPlayerEntityId ||
    thought.ownerEntityId === selectedPlayerEntityId
  )
    throw new Error('Thoughts are allowed only for cognitive NPCs');
  if (thought.visibility !== 'entity_private') throw new Error('Thoughts must be private');
}
export function decayThought(thought: InnerThought, currentTurn: number): InnerThought {
  if (
    thought.persistence === 'ephemeral' &&
    thought.expiresAtTurn !== undefined &&
    currentTurn >= thought.expiresAtTurn
  )
    return { ...thought, status: 'expired' };
  return thought;
}

export function validateThoughtBatch(
  thoughts: readonly InnerThought[],
  owner: Entity,
  selectedPlayerEntityId: string,
  limit: number,
): InnerThought[] {
  if (thoughts.length > limit) throw new Error('Active thought limit exceeded');
  for (const thought of thoughts) validateThought(owner, thought, selectedPlayerEntityId);
  const seen = new Set<string>();
  return thoughts.filter((thought) => {
    const key = thought.text.trim().toLocaleLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function updateRelationship(
  relationship: Relationship,
  dimensions: Readonly<Record<string, number>>,
  turn: number,
): Relationship {
  const next = { ...relationship.dimensions };
  for (const [key, value] of Object.entries(dimensions)) {
    if (!Number.isFinite(value) || value < -1 || value > 1)
      throw new Error(`Relationship dimension out of bounds: ${key}`);
    next[key] = value;
  }
  return {
    ...relationship,
    dimensions: next,
    lastChangedTurn: turn,
    metadata: {
      ...relationship.metadata,
      version: relationship.metadata.version + 1,
      attribution: { ...relationship.metadata.attribution, source: 'resolver' },
    },
  };
}

const plotTransitions: Record<PlotPoint['status'], readonly PlotPoint['status'][]> = {
  proposed: ['dormant', 'available', 'abandoned'],
  dormant: ['available', 'abandoned'],
  available: ['foreshadowed', 'active', 'dormant', 'abandoned'],
  foreshadowed: ['active', 'dormant', 'failed', 'abandoned'],
  active: ['resolved', 'failed', 'dormant', 'abandoned'],
  resolved: [],
  failed: [],
  abandoned: [],
};
export function canTransitionPlot(from: PlotPoint['status'], to: PlotPoint['status']): boolean {
  return plotTransitions[from].includes(to);
}
export function transitionPlot(
  point: PlotPoint,
  to: PlotPoint['status'],
  evidenceIds: readonly string[],
): PlotPoint {
  if (!canTransitionPlot(point.status, to))
    throw new Error(`Invalid plot transition: ${point.status} -> ${to}`);
  if ((to === 'resolved' || to === 'failed') && evidenceIds.length === 0)
    throw new Error('Terminal plot transition requires evidence');
  return {
    ...point,
    status: to,
    metadata: {
      ...point.metadata,
      version: point.metadata.version + 1,
      attribution: {
        ...point.metadata.attribution,
        sourceIds: [...new Set([...point.metadata.attribution.sourceIds, ...evidenceIds])],
      },
    },
  };
}

export interface CardMutation {
  cardId: string;
  expectedVersion: number;
  mode: StoryCard['mutationPolicy'];
  locked: boolean;
  path: string;
  sourceScopes: readonly z.infer<typeof visibilityScopeSchema>[];
  targetScope: z.infer<typeof visibilityScopeSchema>;
}
export function validateCardMutation(mutation: CardMutation, current: StoryCard): void {
  if (mutation.cardId !== current.id || mutation.expectedVersion !== current.currentVersion)
    throw new Error('Stale story-card version');
  if (
    mutation.locked ||
    current.locked ||
    mutation.mode === 'static' ||
    mutation.mode === 'manual_only'
  )
    throw new Error('Story-card mutation is not permitted');
  if (mutation.mode === 'append_only' && mutation.path !== '/appendHistory')
    throw new Error('Append-only cards permit only /appendHistory');
  if (
    mutation.sourceScopes.some((scope) => scope !== 'public_scenario') &&
    mutation.targetScope === 'public_scenario'
  )
    throw new Error('Mutation would widen visibility');
  if (!/^\/(appendHistory|canonicalBody|playerVisibleBody)$/.test(mutation.path))
    throw new Error('Story-card path is not allowlisted');
}

export interface BudgetCandidate {
  id: string;
  tokens: number;
  rank: number;
  mandatory: boolean;
}
export function fitContextBudget(
  candidates: readonly BudgetCandidate[],
  budget: number,
  reservedOutput: number,
  safetyMargin = 0.1,
): { selected: BudgetCandidate[]; dropped: BudgetCandidate[]; totalTokens: number } {
  const available = Math.floor((budget - reservedOutput) * (1 - safetyMargin));
  const selected: BudgetCandidate[] = [];
  const dropped: BudgetCandidate[] = [];
  let totalTokens = 0;
  for (const candidate of [...candidates].sort(
    (a, b) => Number(b.mandatory) - Number(a.mandatory) || b.rank - a.rank,
  )) {
    if (
      totalTokens + candidate.tokens <= available ||
      (candidate.mandatory && totalTokens === 0 && candidate.tokens <= available)
    ) {
      selected.push(candidate);
      totalTokens += candidate.tokens;
    } else dropped.push(candidate);
  }
  if (
    candidates.some((candidate) => candidate.mandatory) &&
    selected.filter((candidate) => candidate.mandatory).length !==
      candidates.filter((candidate) => candidate.mandatory).length
  )
    throw new Error('Mandatory context cannot fit budget');
  return { selected, dropped, totalTokens };
}

export interface StagnationFeatures {
  turnsSinceSignificantChange: number;
  turnsSinceGoalProgress: number;
  repeatedPlayerIntents: number;
  repeatedNpcNoActions: number;
  activePlotsWithoutProgress: number;
  unresolvedHooks: number;
  dialogueOnlyStreak: number;
  sceneDuration: number;
}
export function stagnationScore(features: StagnationFeatures): number {
  const values = [
    features.turnsSinceSignificantChange / 10,
    features.turnsSinceGoalProgress / 10,
    features.repeatedPlayerIntents / 5,
    features.repeatedNpcNoActions / 5,
    features.activePlotsWithoutProgress / 5,
    features.unresolvedHooks / 10,
    features.dialogueOnlyStreak / 8,
    features.sceneDuration / 10,
  ];
  return Math.min(1, values.reduce((sum, value) => sum + Math.min(1, value), 0) / values.length);
}

export const gameplayCapsSchema = z.object({
  maxActiveNpcs: z.number().int().min(1).max(100),
  maxModelCalls: z.number().int().min(1).max(100),
  maxRetrievedChunks: z.number().int().min(1).max(500),
  maxPromptTokens: z.number().int().min(256).max(1_000_000),
  maxGeneratedThoughts: z.number().int().min(0).max(100),
  maxPlayerInput: z.number().int().min(1).max(100_000),
});
export function validateGameplayCaps(caps: unknown): z.infer<typeof gameplayCapsSchema> {
  return gameplayCapsSchema.parse(caps);
}

export function resourceOwner(resource: Observation | Belief | Memory | InnerThought): string {
  if ('ownerEntityId' in resource) return resource.ownerEntityId;
  return resource.observerEntityId;
}
export function isAuthorizedResourceRead(
  policy: KnowledgePolicy,
  principal: Principal,
  resource: ProtectedResource,
): boolean {
  return policy.canRead(principal, resource);
}
