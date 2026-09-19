import { z } from 'zod';
import {
  boundedText,
  confidenceSchema,
  emotionalIntensitySchema,
  emotionalValenceSchema,
  eventRefSchema,
  idSchema,
  importanceSchema,
  memoryRefSchema,
  metadataSchema,
  observationRefSchema,
  plotPointRefSchema,
  resourceRefSchema,
  salienceSchema,
  sourceRefSchema,
  timestampSchema,
  urgencySchema,
  visibilityScopeSchema,
} from './primitives.js';

export const runStatusSchema = z.enum(['active', 'paused', 'completed', 'archived', 'blocked']);
export const runSchema = z.object({
  id: idSchema,
  scenarioRevisionId: idSchema,
  playerEntityId: idSchema,
  activeBranchId: idSchema,
  currentTurn: z.number().int().nonnegative(),
  expectedVersion: z.number().int().positive(),
  worldTime: timestampSchema,
  randomSeed: z.number().int().nonnegative(),
  narrativeSettings: z.record(z.unknown()),
  roleSettingsSnapshot: z.record(z.unknown()),
  retrievalSettingsSnapshot: z.record(z.unknown()),
  status: runStatusSchema,
  lastSuccessfulSnapshotId: idSchema.optional(),
  metadata: metadataSchema,
});
export type Run = z.infer<typeof runSchema>;

export const branchSchema = z.object({
  id: idSchema,
  runId: idSchema,
  parentBranchId: idSchema.nullable(),
  forkTurn: z.number().int().nonnegative(),
  label: boundedText(200),
  active: z.boolean(),
  canonical: z.boolean(),
  creationReason: z.enum(['initial', 'regeneration', 'rewind', 'edit', 'debug']),
  metadata: metadataSchema,
});
export type Branch = z.infer<typeof branchSchema>;

export const turnStatusSchema = z.enum([
  'pending',
  'running',
  'completed',
  'cancelled',
  'retryable_failure',
  'blocked_configuration',
  'failed',
]);
export const communicationMediumSchema = z.enum([
  'spoken',
  'text_message',
  'phone_call',
  'email',
  'letter',
  'radio',
  'configured_remote',
]);
export type CommunicationMedium = z.infer<typeof communicationMediumSchema>;

export const communicationSchema = z.object({
  id: idSchema,
  runId: idSchema,
  branchId: idSchema,
  turnId: idSchema,
  senderEntityId: idSchema,
  recipientEntityIds: z.array(idSchema).min(1).max(100),
  medium: communicationMediumSchema,
  body: boundedText(20_000),
  observableEnvelope: boundedText(2_000),
  delivered: z.boolean(),
  worldTime: timestampSchema,
  metadata: metadataSchema,
});
export type Communication = z.infer<typeof communicationSchema>;

export const turnStageSchema = z.union([
  z.enum([
    'ACCEPTED',
    'INPUT_VALIDATED',
    'CONTEXT_SNAPSHOTTED',
    'ARCHITECT_PLANNED',
    'NPCS_SELECTED',
    'NPC_FANOUT_PLANNED',
    'NPC_DECISIONS_PENDING',
    'NPC_DECISIONS_GENERATED',
    'ACTIONS_RESOLVED',
    'EVENTS_COMMITTED',
    'OBSERVATIONS_CREATED',
    'NARRATION_GENERATING',
    'NARRATION_COMMITTED',
    'MEMORY_UPDATES_QUEUED',
    'MUTATIONS_QUEUED',
    'COMPLETED',
  ]),
  z.enum(['CANCELLED', 'RETRYABLE_FAILURE', 'BLOCKED_CONFIGURATION', 'FAILED']),
]);
export type TurnStageState = z.infer<typeof turnStageSchema>;
export const turnSchema = z.object({
  id: idSchema,
  runId: idSchema,
  branchId: idSchema,
  number: z.number().int().positive(),
  parentTurnId: idSchema.nullable(),
  rawPlayerInput: z.string().min(1).max(8_192),
  parsedIntent: z.record(z.unknown()).optional(),
  status: turnStatusSchema,
  stage: turnStageSchema,
  startedAt: timestampSchema.optional(),
  endedAt: timestampSchema.optional(),
  failure: z
    .object({ code: boundedText(100), message: boundedText(1_000), retryable: z.boolean() })
    .optional(),
  finalNarrative: z.string().max(100_000).optional(),
  idempotencyKey: boundedText(256),
  expectedVersion: z.number().int().positive(),
  metadata: metadataSchema,
});
export type Turn = z.infer<typeof turnSchema>;

export const actionTypeSchema = z.enum([
  'speech',
  'movement',
  'interaction',
  'attack',
  'wait',
  'observation',
  'custom',
]);
export const attemptedActionSchema = z.object({
  id: idSchema,
  turnId: idSchema,
  actorEntityId: idSchema,
  actionType: actionTypeSchema,
  targets: z.array(resourceRefSchema).max(20),
  intent: boundedText(8_192),
  assumedPreconditions: z.array(z.string().max(2_000)).max(50),
  visibility: visibilityScopeSchema,
  source: z.enum(['player', 'npc']),
});
export type AttemptedAction = z.infer<typeof attemptedActionSchema>;

export const eventFactSchema = z.object({
  key: boundedText(128),
  value: z.unknown(),
  visibility: visibilityScopeSchema,
  source: sourceRefSchema,
});
export const patchOperationSchema = z.enum(['add', 'replace', 'remove']);
export const jsonPatchPathSchema = z
  .string()
  .regex(
    /^\/(entities|locations|relationships|world|storyCards)(\/[^/]+){1,4}$/,
    'path is outside the canonical vocabulary',
  )
  .refine(
    (path) => !/(^|\/)(?:__proto__|prototype|constructor|\.\.|)$/.test(path),
    'unsafe patch path',
  );
export const statePatchSchema = z.object({
  op: patchOperationSchema,
  path: jsonPatchPathSchema,
  value: z.unknown().optional(),
  expectedVersion: z.number().int().positive(),
});
export const canonicalEventSchema = z.object({
  id: idSchema,
  turnId: idSchema,
  type: boundedText(100),
  locationId: idSchema,
  worldTime: timestampSchema,
  participants: z.array(idSchema).max(100),
  canonicalDescription: boundedText(20_000),
  facts: z.array(eventFactSchema).max(100),
  patches: z.array(statePatchSchema).max(100),
  causeEventIds: z.array(idSchema).max(100),
  visibilityHints: z.array(visibilityScopeSchema).max(10),
  salience: salienceSchema,
  emotionalWeight: emotionalIntensitySchema,
  schemaVersion: z.number().int().positive(),
  metadata: metadataSchema,
});
export type CanonicalEvent = z.infer<typeof canonicalEventSchema>;

export const observationModalitySchema = z.enum([
  'sight',
  'sound',
  'touch',
  'inferred',
  'reported',
  'magical',
  'system',
]);
export const observationSchema = z.object({
  id: idSchema,
  observerEntityId: idSchema,
  sourceEventId: idSchema,
  modality: observationModalitySchema,
  perceivedContent: boundedText(20_000),
  detail: z.number().min(0).max(1),
  confidence: confidenceSchema,
  distortion: z.string().max(2_000),
  occluded: z.boolean(),
  observedTurn: z.number().int().nonnegative(),
  visibility: z.literal('entity_private'),
  metadata: metadataSchema,
});
export type Observation = z.infer<typeof observationSchema>;

export const beliefStatusSchema = z.enum(['active', 'doubted', 'rejected', 'forgotten']);
export const beliefSchema = z.object({
  id: idSchema,
  ownerEntityId: idSchema,
  subject: boundedText(500),
  predicate: boundedText(500),
  object: z.string().max(2_000),
  rendering: boundedText(5_000),
  confidence: confidenceSchema,
  evidence: z.array(observationRefSchema.or(memoryRefSchema).or(eventRefSchema)).max(100),
  firstLearnedTurn: z.number().int().nonnegative(),
  lastReinforcedTurn: z.number().int().nonnegative(),
  contradictsBeliefIds: z.array(idSchema).max(100),
  supersedesBeliefId: idSchema.optional(),
  status: beliefStatusSchema,
  salience: salienceSchema,
  visibility: z.literal('entity_private'),
  metadata: metadataSchema,
});
export type Belief = z.infer<typeof beliefSchema>;

export const memoryTypeSchema = z.enum([
  'episodic',
  'semantic',
  'emotional',
  'relationship',
  'goal_commitment',
  'procedural',
]);
export const memoryStatusSchema = z.enum(['active', 'suppressed', 'forgotten', 'superseded']);
export const memorySchema = z.object({
  id: idSchema,
  ownerEntityId: idSchema,
  type: memoryTypeSchema,
  sourceObservationIds: z.array(idSchema).max(100),
  sourceEventIds: z.array(idSchema).max(100),
  sourceThoughtIds: z.array(idSchema).max(100),
  content: boundedText(20_000),
  importance: importanceSchema,
  emotionalValence: emotionalValenceSchema,
  emotionalIntensity: emotionalIntensitySchema,
  confidence: confidenceSchema,
  accessibility: confidenceSchema,
  createdTurn: z.number().int().nonnegative(),
  reinforcedTurn: z.number().int().nonnegative(),
  lastRecalledTurn: z.number().int().nonnegative().optional(),
  decayRate: z.number().min(0).max(1),
  status: memoryStatusSchema,
  visibility: z.literal('entity_private'),
  version: z.number().int().positive(),
  metadata: metadataSchema,
});
export type Memory = z.infer<typeof memorySchema>;

export const thoughtPersistenceSchema = z.enum(['ephemeral', 'lingering', 'core']);
export const thoughtStatusSchema = z.enum(['active', 'resolved', 'contradicted', 'expired']);
export const innerThoughtSchema = z.object({
  id: idSchema,
  ownerEntityId: idSchema,
  turnId: idSchema,
  triggeringEventId: idSchema.optional(),
  text: boundedText(5_000),
  persistence: thoughtPersistenceSchema,
  salience: salienceSchema,
  urgency: urgencySchema,
  emotionalValence: emotionalValenceSchema,
  emotionalIntensity: emotionalIntensitySchema,
  expiresAtTurn: z.number().int().nonnegative().optional(),
  decayRate: z.number().min(0).max(1),
  reinforcementCount: z.number().int().nonnegative(),
  target: resourceRefSchema.optional(),
  status: thoughtStatusSchema,
  playerInspectable: z.boolean(),
  visibility: z.literal('entity_private'),
  metadata: metadataSchema,
});
export type InnerThought = z.infer<typeof innerThoughtSchema>;

export const playerIntentSchema = z.object({
  speech: z.string().max(8_192).optional(),
  physicalActions: z.array(boundedText(2_000)).max(20),
  targets: z.array(resourceRefSchema).max(20),
  desiredOutcomes: z.array(z.string().max(2_000)).max(20),
  assumptions: z.array(z.string().max(2_000)).max(20),
  meta: z.boolean(),
  ambiguityWarnings: z.array(z.string().max(1_000)).max(20),
  rawInput: boundedText(8_192),
});
export type PlayerIntent = z.infer<typeof playerIntentSchema>;

export const architectPlanSchema = z.object({
  pacingAssessment: boundedText(2_000),
  stagnationScore: confidenceSchema,
  activePlotPriorities: z.array(plotPointRefSchema).max(50),
  guidance: z.array(z.string().max(2_000)).max(50),
  foreshadowingOptions: z.array(z.string().max(2_000)).max(50),
  suddenEventProposal: z.record(z.unknown()).optional(),
  newPlotPointProposal: z.record(z.unknown()).optional(),
  cooldownUpdates: z.array(z.string().max(500)).max(50),
  forbiddenRevelations: z.array(z.string().max(2_000)).max(50),
});
export type ArchitectPlan = z.infer<typeof architectPlanSchema>;

export const proposedNpcThoughtSchema = z.object({
  text: boundedText(5_000),
  persistence: thoughtPersistenceSchema,
  salience: salienceSchema,
  urgency: urgencySchema,
  target: resourceRefSchema.optional(),
});
export const npcDecisionSchema = z.object({
  entityId: idSchema,
  attention: z.enum(['unaware', 'noticed', 'focused']),
  reaction: z.enum(['none', 'think_only', 'speak', 'act', 'speak_and_act']),
  speech: z.string().max(8_192).optional(),
  attemptedActions: z.array(attemptedActionSchema).max(20),
  generatedThoughts: z.array(proposedNpcThoughtSchema).max(4),
  beliefProposals: z.array(z.record(z.unknown())).max(20),
  goalUpdates: z.array(z.record(z.unknown())).max(20),
  perceivedEvidenceIds: z.array(idSchema).max(100),
});
export const npcPrincipalDecisionSchema = npcDecisionSchema;
export type NpcPrincipalDecision = z.infer<typeof npcPrincipalDecisionSchema>;

/**
 * @deprecated Legacy batch container. Migrating to independent per-principal calls.
 */
export const npcDecisionBatchSchema = z.object({ decisions: z.array(npcDecisionSchema).max(16) });
export type NpcDecisionBatch = z.infer<typeof npcDecisionBatchSchema>;

export const resolutionProposalSchema = z.object({
  events: z.array(canonicalEventSchema).max(100),
  statePatches: z.array(statePatchSchema).max(100),
  failedActions: z.array(z.object({ actionId: idSchema, reason: boundedText(2_000) })).max(50),
  randomOutcomeReferences: z.array(idSchema).max(100),
  plotEvidence: z
    .array(z.object({ plotPointId: idSchema, eventIds: z.array(idSchema).max(100) }))
    .max(100),
  cardMutationSignals: z
    .array(z.object({ cardId: idSchema, eventIds: z.array(idSchema).max(100) }))
    .max(100),
});
export type ResolutionProposal = z.infer<typeof resolutionProposalSchema>;

export const narrationSegmentSchema = z.object({
  id: idSchema,
  type: z.enum(['narration', 'npc_speech', 'npc_action', 'player_action', 'separator', 'system']),
  speakerEntityId: idSchema.optional(),
  eventIds: z.array(idSchema).max(50),
  order: z.number().int().nonnegative(),
  visibility: z.enum(['player_view', 'player_out_of_world_detail']),
  text: boundedText(20_000),
});
export const narrationPlanSchema = z.object({
  segments: z.array(narrationSegmentSchema).max(100),
  sceneTransition: z.string().max(1_000).optional(),
  suggestedTitle: z.string().max(200).optional(),
});
export type NarrationPlan = z.infer<typeof narrationPlanSchema>;

export const memoryUpdateProposalSchema = z.object({
  newMemories: z.array(z.record(z.unknown())).max(50),
  reinforcements: z
    .array(z.object({ memoryId: idSchema, evidenceIds: z.array(idSchema).max(50) }))
    .max(100),
  beliefChanges: z.array(z.record(z.unknown())).max(50),
  forgetOrSuppress: z.array(z.object({ memoryId: idSchema, status: memoryStatusSchema })).max(100),
});
export const storyCardMutationProposalSchema = z.object({
  cardId: idSchema,
  expectedVersion: z.number().int().positive(),
  reason: boundedText(2_000),
  sourceIds: z.array(idSchema).max(100),
  operations: z.array(statePatchSchema).max(50),
  semanticSummary: boundedText(5_000),
  confidence: confidenceSchema,
  scopeImpact: visibilityScopeSchema,
  contradictions: z.array(z.string().max(2_000)).max(50),
  expirySuggestions: z.array(z.string().max(1_000)).max(50),
});
const projectionStateSchema = z.object({
  version: z.number().int().positive(),
  state: z.record(z.unknown()),
});
export const runProjectionSchema = z.object({
  runId: idSchema,
  branchId: idSchema,
  version: z.number().int().positive(),
  entityState: z.record(projectionStateSchema),
  locationState: z.record(projectionStateSchema),
  storyCardState: z.record(projectionStateSchema),
  architectState: projectionStateSchema,
  narrativeState: projectionStateSchema,
});
export const snapshotSchema = z.object({
  id: idSchema,
  runId: idSchema,
  branchId: idSchema,
  turn: z.number().int().nonnegative(),
  projectionVersions: z.record(z.number().int().positive()),
  checksum: z.string().regex(/^[a-f0-9]{64}$/),
  schemaVersion: z.number().int().positive(),
  serializedState: z.string().max(50_000_000),
  metadata: metadataSchema,
});
