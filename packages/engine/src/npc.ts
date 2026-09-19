import type { GenerationProvider } from '@ada/ai';
import { npcDecisionBatchSchema, type Entity, type NpcDecisionBatch } from '@ada/domain';

export interface NpcCandidateInput {
  entity: Entity;
  targeted: boolean;
  present: boolean;
  remoteContact: boolean;
  triggeredPlan: boolean;
  relevance: number;
}
export interface NpcCandidate {
  entityId: string;
  reason: string;
  score: number;
}
export function selectNpcCandidates(
  input: readonly NpcCandidateInput[],
  playerEntityId: string,
  maxActiveNpcs: number,
): NpcCandidate[] {
  return input
    .filter(
      (candidate) =>
        candidate.entity.id !== playerEntityId &&
        candidate.entity.cognitive &&
        candidate.entity.active &&
        (candidate.targeted ||
          candidate.present ||
          candidate.remoteContact ||
          candidate.triggeredPlan),
    )
    .map((candidate) => ({
      entityId: candidate.entity.id,
      reason: candidate.targeted
        ? 'targeted'
        : candidate.present
          ? 'present'
          : candidate.remoteContact
            ? 'remote-contact'
            : 'triggered-plan',
      score: candidate.relevance + (candidate.targeted ? 1 : 0) + (candidate.present ? 0.5 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.entityId.localeCompare(b.entityId))
    .slice(0, maxActiveNpcs);
}

export async function executeNpcDecisions<T>(
  entityIds: readonly string[],
  decide: (entityId: string) => Promise<T>,
  options: { independent: boolean } = { independent: true },
): Promise<ReadonlyMap<string, T>> {
  const ids = [...new Set(entityIds)].sort();
  const result = new Map<string, T>();
  if (options.independent) {
    const values = await Promise.all(ids.map((id) => decide(id)));
    ids.forEach((id, index) => {
      const value = values[index];
      if (value !== undefined) result.set(id, value);
    });
    return result;
  }
  for (const id of ids) result.set(id, await decide(id));
  return result;
}

export interface AuthorizedNpcContext {
  entity: Pick<
    Entity,
    | 'id'
    | 'name'
    | 'publicDescription'
    | 'privateDescription'
    | 'personality'
    | 'speechStyle'
    | 'drives'
    | 'goals'
    | 'fears'
    | 'capabilities'
    | 'limitations'
  >;
  observations: readonly unknown[];
  beliefs: readonly unknown[];
  memories: readonly unknown[];
  thoughts: readonly unknown[];
  relationshipViews: readonly unknown[];
  publicRules: readonly string[];
  architectPressure: readonly string[];
  authorizedSourceIds: readonly string[];
}
export function buildNpcContext(
  entity: Entity,
  data: Omit<AuthorizedNpcContext, 'entity'>,
): AuthorizedNpcContext {
  return {
    entity: {
      id: entity.id,
      name: entity.name,
      publicDescription: entity.publicDescription,
      privateDescription: entity.privateDescription,
      personality: entity.personality,
      speechStyle: entity.speechStyle,
      drives: entity.drives,
      goals: entity.goals,
      fears: entity.fears,
      capabilities: entity.capabilities,
      limitations: entity.limitations,
    },
    ...data,
  };
}

export async function generateNpcDecisionBatch(
  provider: GenerationProvider,
  model: string,
  context: AuthorizedNpcContext,
  signal?: AbortSignal,
): Promise<NpcDecisionBatch> {
  const result = await provider.generateObject({
    model,
    system:
      'Generate only fictional NPC decisions for the requested entities. Never create a decision, thought, goal, or autonomous action for the selected player entity.',
    input: JSON.stringify(context),
    schemaName: 'NpcDecisionBatch',
    schema: { type: 'object' },
    outputTokenLimit: 2_000,
    signal,
    parse: (value) => npcDecisionBatchSchema.parse(value),
  });
  return result.value;
}
