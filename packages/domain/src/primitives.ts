import { z } from 'zod';

export type Brand<T, B extends string> = T & { readonly __brand: B };
export type ScenarioId = Brand<string, 'ScenarioId'>;
export type ScenarioRevisionId = Brand<string, 'ScenarioRevisionId'>;
export type RunId = Brand<string, 'RunId'>;
export type EntityId = Brand<string, 'EntityId'>;
export type LocationId = Brand<string, 'LocationId'>;
export type StoryCardId = Brand<string, 'StoryCardId'>;
export type PlotArcId = Brand<string, 'PlotArcId'>;
export type PlotPointId = Brand<string, 'PlotPointId'>;
export type BranchId = Brand<string, 'BranchId'>;
export type TurnId = Brand<string, 'TurnId'>;
export type EventId = Brand<string, 'EventId'>;
export type ObservationId = Brand<string, 'ObservationId'>;
export type BeliefId = Brand<string, 'BeliefId'>;
export type MemoryId = Brand<string, 'MemoryId'>;
export type ThoughtId = Brand<string, 'ThoughtId'>;
export type RetrievalDocumentId = Brand<string, 'RetrievalDocumentId'>;
export type RetrievalChunkId = Brand<string, 'RetrievalChunkId'>;

export const idPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;
export const idSchema = z.string().regex(idPattern, 'must be a safe identifier');
export const uuidSchema = z.string().uuid();
export const timestampSchema = z.string().datetime({ offset: true });
export const confidenceSchema = z.number().min(0).max(1);
export const salienceSchema = z.number().min(0).max(1);
export const urgencySchema = z.number().min(0).max(1);
export const importanceSchema = z.number().min(0).max(1);
export const emotionalValenceSchema = z.number().min(-1).max(1);
export const emotionalIntensitySchema = z.number().min(0).max(1);
export const positiveWeightSchema = z.number().min(0).max(1);
export const tokenBudgetSchema = z.number().int().min(64).max(1_000_000);
export const boundedText = (maximum: number) => z.string().trim().min(1).max(maximum);
export const optionalBoundedText = (maximum: number) => z.string().max(maximum).optional();
export const tagsSchema = z.array(z.string().trim().min(1).max(64)).max(100).default([]);

export const visibilityScopeSchema = z.enum([
  'world_truth',
  'public_scenario',
  'scene_observable',
  'entity_private',
  'player_out_of_world_detail',
  'architect_private',
  'admin_only',
]);
export type VisibilityScope = z.infer<typeof visibilityScopeSchema>;

export const attributionSchema = z.object({
  source: z.enum([
    'player',
    'import',
    'architect',
    'resolver',
    'narrator',
    'memory_curator',
    'mutation',
    'system',
  ]),
  actorId: idSchema.optional(),
  sourceIds: z.array(idSchema).max(100).default([]),
});
export type Attribution = z.infer<typeof attributionSchema>;

export const metadataSchema = z.object({
  createdAt: timestampSchema,
  updatedAt: timestampSchema,
  createdBy: idSchema.optional(),
  updatedBy: idSchema.optional(),
  version: z.number().int().positive(),
  schemaVersion: z.number().int().positive(),
  archivedAt: timestampSchema.optional(),
  archivedBy: idSchema.optional(),
  attribution: attributionSchema,
});
export type Metadata = z.infer<typeof metadataSchema>;

export const entityRefSchema = z.object({ type: z.literal('entity'), id: idSchema });
export const locationRefSchema = z.object({ type: z.literal('location'), id: idSchema });
export const cardRefSchema = z.object({ type: z.literal('story_card'), id: idSchema });
export const plotPointRefSchema = z.object({ type: z.literal('plot_point'), id: idSchema });
export const eventRefSchema = z.object({ type: z.literal('event'), id: idSchema });
export const observationRefSchema = z.object({ type: z.literal('observation'), id: idSchema });
export const memoryRefSchema = z.object({ type: z.literal('memory'), id: idSchema });
export const thoughtRefSchema = z.object({ type: z.literal('thought'), id: idSchema });
export const turnRefSchema = z.object({ type: z.literal('turn'), id: idSchema });
export const branchRefSchema = z.object({ type: z.literal('branch'), id: idSchema });
export const sourceRefSchema = z.object({ type: z.string().min(1).max(64), id: idSchema });
export const resourceRefSchema = z.union([
  entityRefSchema,
  locationRefSchema,
  cardRefSchema,
  plotPointRefSchema,
  eventRefSchema,
  observationRefSchema,
  memoryRefSchema,
  thoughtRefSchema,
  turnRefSchema,
  branchRefSchema,
  sourceRefSchema,
]);
export type ResourceRef = z.infer<typeof resourceRefSchema>;

export function parseId<T extends string>(value: string, brand: T): Brand<string, T> {
  void brand;
  if (!idPattern.test(value)) throw new Error('Invalid identifier');
  return value as Brand<string, T>;
}

export const TURN_STAGES = [
  'ACCEPTED',
  'INPUT_VALIDATED',
  'CONTEXT_SNAPSHOTTED',
  'ARCHITECT_PLANNED',
  'NPCS_SELECTED',
  'NPC_DECISIONS_GENERATED',
  'ACTIONS_RESOLVED',
  'EVENTS_COMMITTED',
  'OBSERVATIONS_CREATED',
  'NARRATION_GENERATING',
  'NARRATION_COMMITTED',
  'MEMORY_UPDATES_QUEUED',
  'MUTATIONS_QUEUED',
  'COMPLETED',
] as const;
export type TurnStage = (typeof TURN_STAGES)[number];
export const terminalTurnStateSchema = z.enum([
  'CANCELLED',
  'RETRYABLE_FAILURE',
  'BLOCKED_CONFIGURATION',
  'FAILED',
]);
export type TerminalTurnState = z.infer<typeof terminalTurnStateSchema>;

const nextStages: ReadonlyMap<TurnStage, TurnStage | undefined> = new Map(
  TURN_STAGES.map((stage, index) => [stage, TURN_STAGES[index + 1]]),
);
export function canAdvanceTurnStage(from: TurnStage, to: TurnStage): boolean {
  return nextStages.get(from) === to;
}
export function assertStageTransition(from: TurnStage, to: TurnStage): void {
  if (!canAdvanceTurnStage(from, to))
    throw new Error(`Invalid turn stage transition: ${from} -> ${to}`);
}

export const cursorSchema = z.string().min(1).max(512);
export const paginationSchema = z.object({
  cursor: cursorSchema.optional(),
  limit: z.number().int().min(1).max(100).default(25),
  sort: z
    .string()
    .regex(/^[A-Za-z][A-Za-z0-9_]*$/)
    .default('createdAt'),
  direction: z.enum(['asc', 'desc']).default('desc'),
  includeArchived: z.boolean().default(false),
});
export type Pagination = z.infer<typeof paginationSchema>;
