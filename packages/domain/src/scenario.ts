import { z } from 'zod';
import {
  attributionSchema,
  boundedText,
  confidenceSchema,
  idSchema,
  metadataSchema,
  positiveWeightSchema,
  tagsSchema,
  tokenBudgetSchema,
} from './primitives.js';

export const narrationModeSchema = z.object({
  person: z.enum(['first', 'second', 'third_limited']),
  tense: z.enum(['present', 'past']),
  omniscient: z.boolean().default(false),
});
export const pacingSettingsSchema = z.object({
  interventionThreshold: z.number().min(0).max(1).default(0.7),
  interventionCooldownTurns: z.number().int().min(0).max(100).default(3),
  tensionTarget: z.number().min(0).max(1).default(0.5),
  quietSceneMaxTurns: z.number().int().min(1).max(100).default(8),
});
export const roleModelOverrideSchema = z.object({
  provider: boundedText(128),
  model: boundedText(256),
  outputTokens: z.number().int().min(64).max(32_000),
  promptBudget: tokenBudgetSchema,
  timeoutMs: z.number().int().min(1_000).max(300_000),
  retries: z.number().int().min(0).max(5),
});
export const scenarioConfigSchema = z.object({
  narration: narrationModeSchema,
  pacing: pacingSettingsSchema,
  retrieval: z.object({
    maxCandidates: z.number().int().min(1).max(10_000),
    maxSelected: z.number().int().min(1).max(500),
  }),
  modelOverrides: z.record(roleModelOverrideSchema).default({}),
  allowNarrationOverride: z.boolean().default(false),
});

export const scenarioSchema = z.object({
  id: idSchema,
  revisionId: idSchema,
  slug: boundedText(128).regex(/^[a-z0-9][a-z0-9-]*$/),
  title: boundedText(200),
  subtitle: z.string().max(500).optional(),
  description: z.string().max(20_000),
  premise: z.string().max(20_000),
  tags: tagsSchema,
  genre: z.string().max(100),
  tone: z.string().max(500),
  themes: tagsSchema,
  contentBoundaries: z.array(boundedText(1_000)).max(100).default([]),
  worldRules: z.array(boundedText(5_000)).max(100).default([]),
  kickoffText: z.string().max(20_000).optional(),
  defaultNarrationStyle: z.string().max(10_000),
  chronologyMarker: z.string().max(200),
  startLocationId: idSchema,
  config: scenarioConfigSchema,
  status: z.enum(['draft', 'valid', 'archived']),
  currentRevision: z.number().int().positive(),
  metadata: metadataSchema,
});
export type Scenario = z.infer<typeof scenarioSchema>;

export const entitySchema = z
  .object({
    id: idSchema,
    revisionId: idSchema,
    name: boundedText(200),
    aliases: z.array(boundedText(200)).max(50),
    pronouns: z.string().max(100),
    kind: z.enum(['character', 'creature', 'faction', 'organization', 'artifact', 'object']),
    tags: tagsSchema,
    publicDescription: z.string().max(10_000),
    privateDescription: z.string().max(10_000),
    history: z.string().max(30_000).default(''),
    historicalEvents: z
      .array(
        z.object({
          id: idSchema,
          title: boundedText(200),
          summary: z.string().max(5_000),
          participants: z.array(idSchema).max(50),
          chronology: z.string().max(200),
          consequences: z.array(z.string().max(2_000)).max(20).default([]),
          visibility: z.enum(['public', 'entity_private']).default('public'),
        }),
      )
      .max(100)
      .default([]),
    appearance: z.string().max(10_000),
    personality: z.array(z.string().max(500)).max(50),
    speechStyle: z.string().max(5_000),
    values: z.array(z.string().max(500)).max(50),
    drives: z.array(z.string().max(500)).max(50),
    goals: z.array(z.string().max(1_000)).max(50),
    fears: z.array(z.string().max(500)).max(50),
    desires: z.array(z.string().max(500)).max(50),
    capabilities: z.array(z.string().max(500)).max(100),
    limitations: z.array(z.string().max(500)).max(100),
    secrets: z.array(z.string().max(5_000)).max(100),
    stats: z.record(z.number().finite()),
    structuredAttributes: z.record(z.unknown()),
    constraints: z.array(z.string().max(2_000)).max(100),
    aiMutationPolicy: z.enum(['static', 'manual_only', 'append_only', 'ai_suggest', 'ai_mutable']),
    playable: z.boolean(),
    cognitive: z.boolean(),
    alive: z.boolean(),
    active: z.boolean(),
    startingLocationId: idSchema,
    metadata: metadataSchema,
  })
  .superRefine((entity, ctx) => {
    if (entity.playable && !entity.cognitive)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['cognitive'],
        message: 'playable entities must be cognitive',
      });
  });
export type Entity = z.infer<typeof entitySchema>;

export const relationshipSchema = z
  .object({
    id: idSchema,
    revisionId: idSchema,
    sourceEntityId: idSchema,
    targetEntityId: idSchema,
    type: boundedText(100),
    publicState: z.string().max(5_000),
    sourcePrivateState: z.string().max(5_000),
    canonicalFacts: z.array(z.string().max(2_000)).max(100),
    dimensions: z.record(z.number().min(-1).max(1)),
    historySummary: z.string().max(10_000),
    lastChangedTurn: z.number().int().nonnegative().optional(),
    metadata: metadataSchema,
  })
  .superRefine((relationship, ctx) => {
    if (relationship.sourceEntityId === relationship.targetEntityId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['targetEntityId'],
        message: 'self relationships are not allowed',
      });
  });
export type Relationship = z.infer<typeof relationshipSchema>;

export const locationSchema = z.object({
  id: idSchema,
  revisionId: idSchema,
  name: boundedText(200),
  aliases: z.array(boundedText(200)).max(50),
  type: boundedText(100),
  tags: tagsSchema,
  publicDescription: z.string().max(10_000),
  privateDetails: z.string().max(10_000),
  parentLocationId: idSchema.nullable(),
  coordinates: z.object({ x: z.number(), y: z.number() }).optional(),
  environment: z.record(z.unknown()),
  capacity: z.number().int().nonnegative().max(1_000_000),
  accessRules: z.array(z.string().max(2_000)).max(100),
  sensoryProperties: z.object({
    sight: z.boolean(),
    sound: z.boolean(),
    hearingRange: z.number().nonnegative().max(1_000),
  }),
  hazards: z.array(z.string().max(2_000)).max(100),
  aiMutationPolicy: z.enum(['static', 'manual_only', 'append_only', 'ai_suggest', 'ai_mutable']),
  metadata: metadataSchema,
});
export type Location = z.infer<typeof locationSchema>;

/** A portal is a traversable boundary whose state controls cross-location perception. */
export const portalStateSchema = z.enum(['open', 'ajar', 'closed', 'locked', 'barred']);
export type PortalState = z.infer<typeof portalStateSchema>;

export const portalTransmissionSchema = z.object({
  sight: confidenceSchema,
  sound: confidenceSchema,
});
export type PortalTransmission = z.infer<typeof portalTransmissionSchema>;

export const defaultPortalTransmissionProfile = {
  open: { sight: 1, sound: 1 },
  ajar: { sight: 0.35, sound: 0.65 },
  closed: { sight: 0, sound: 0.15 },
  locked: { sight: 0, sound: 0.08 },
  barred: { sight: 0.1, sound: 0.25 },
} as const satisfies Record<PortalState, PortalTransmission>;

export const portalTransmissionProfileSchema = z.object({
  open: portalTransmissionSchema,
  ajar: portalTransmissionSchema,
  closed: portalTransmissionSchema,
  locked: portalTransmissionSchema,
  barred: portalTransmissionSchema,
});

export const portalDefinitionSchema = z.object({
  name: boundedText(100),
  defaultState: portalStateSchema.default('open'),
  transmission: portalTransmissionProfileSchema.default(defaultPortalTransmissionProfile),
});
export type PortalDefinition = z.infer<typeof portalDefinitionSchema>;

export const locationConnectionKindSchema = z.enum(['route', 'portal']);
export type LocationConnectionKind = z.infer<typeof locationConnectionKindSchema>;

export const locationEdgeSchema = z
  .object({
    id: idSchema,
    revisionId: idSchema,
    sourceLocationId: idSchema,
    destinationLocationId: idSchema,
    directed: z.boolean(),
    directionLabel: z.string().max(100),
    travelText: z.string().max(2_000),
    travelTime: z.number().nonnegative().max(1_000_000),
    travelCost: z.number().nonnegative().max(1_000_000),
    accessRequirements: z.array(z.string().max(2_000)).max(100),
    discoverability: confidenceSchema,
    blocked: z.boolean(),
    connectionKind: locationConnectionKindSchema.default('route'),
    /** Required for portal edges; the edge ID is the stable portal ID at runtime. */
    portal: portalDefinitionSchema.optional(),
    metadata: metadataSchema,
  })
  .superRefine((edge, ctx) => {
    if (edge.sourceLocationId === edge.destinationLocationId)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['destinationLocationId'],
        message: 'location edge must connect distinct locations',
      });
    if (edge.connectionKind === 'portal' && !edge.portal)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['portal'],
        message: 'portal edges require a portal definition',
      });
    if (edge.connectionKind === 'route' && edge.portal)
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['portal'],
        message: 'route edges cannot define portal transmission',
      });
  });
export type LocationEdge = z.infer<typeof locationEdgeSchema>;
export type PortalEdge = LocationEdge & {
  connectionKind: 'portal';
  portal: PortalDefinition;
};

export const cardScopeSchema = z.object({
  kind: z.enum(['global', 'location', 'entity', 'run', 'entity_private']),
  ownerEntityId: idSchema.optional(),
  locationId: idSchema.optional(),
  runId: idSchema.optional(),
});
export const storyCardSchema = z.object({
  id: idSchema,
  revisionId: idSchema,
  title: boundedText(200),
  cardType: z.enum([
    'lore',
    'character',
    'location',
    'faction',
    'item',
    'rule',
    'historical_event',
    'rumor',
    'style',
    'custom',
  ]),
  tags: tagsSchema,
  canonicalBody: boundedText(50_000),
  playerVisibleBody: z.string().max(50_000).optional(),
  activationHints: z.array(boundedText(200)).max(100),
  priority: z.number().int().min(-100).max(100),
  tokenBudget: tokenBudgetSchema,
  scope: cardScopeSchema,
  mutationPolicy: z.enum(['static', 'manual_only', 'append_only', 'ai_suggest', 'ai_mutable']),
  locked: z.boolean(),
  effectiveFromTurn: z.number().int().nonnegative().optional(),
  effectiveToTurn: z.number().int().nonnegative().optional(),
  source: z.enum(['player', 'import', 'architect', 'mutation']),
  currentVersion: z.number().int().positive(),
  metadata: metadataSchema,
});
export type StoryCard = z.infer<typeof storyCardSchema>;

export const storyCardLinkSchema = z.object({
  id: idSchema,
  cardId: idSchema,
  targetType: z.enum(['entity', 'location', 'story_card', 'plot_point', 'global_lore']),
  targetId: idSchema,
  relationType: boundedText(100),
  weight: positiveWeightSchema,
});
export type StoryCardLink = z.infer<typeof storyCardLinkSchema>;

export const plotPointSchema = z.object({
  id: idSchema,
  arcId: idSchema,
  revisionId: idSchema,
  title: boundedText(200),
  internalDescription: z.string().max(20_000),
  source: z.enum(['player', 'architect']),
  priority: z.number().int().min(-100).max(100),
  status: z.enum([
    'proposed',
    'dormant',
    'available',
    'foreshadowed',
    'active',
    'resolved',
    'failed',
    'abandoned',
  ]),
  preconditions: z.array(z.string().max(2_000)).max(100),
  desiredOutcome: z.string().max(10_000),
  forbiddenOutcomes: z.array(z.string().max(2_000)).max(100),
  involvedEntityIds: z.array(idSchema).max(100),
  involvedLocationIds: z.array(idSchema).max(100),
  foreshadowingCues: z.array(z.string().max(2_000)).max(100),
  escalationOptions: z.array(z.string().max(2_000)).max(100),
  resolutionConditions: z.array(z.string().max(2_000)).max(100),
  earliestTurn: z.number().int().nonnegative().optional(),
  latestTurn: z.number().int().nonnegative().optional(),
  playerVisible: z.boolean(),
  parentPointIds: z.array(idSchema).max(100),
  metadata: metadataSchema,
});
export const plotArcSchema = z.object({
  id: idSchema,
  revisionId: idSchema,
  title: boundedText(200),
  description: z.string().max(20_000),
  pointIds: z.array(idSchema).max(500),
  priority: z.number().int().min(-100).max(100),
  metadata: metadataSchema,
});
export type PlotPoint = z.infer<typeof plotPointSchema>;
export type PlotArc = z.infer<typeof plotArcSchema>;

export interface ValidationIssue {
  path: string;
  message: string;
  severity: 'error' | 'warning';
  resourceId?: string;
  section: string;
}
export interface ScenarioValidationResult {
  valid: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}

export interface ScenarioAggregate {
  scenario: Scenario;
  entities: Entity[];
  relationships: Relationship[];
  locations: Location[];
  locationEdges: LocationEdge[];
  storyCards: StoryCard[];
  storyCardLinks: StoryCardLink[];
  plotArcs: PlotArc[];
  plotPoints: PlotPoint[];
}

export function validateScenarioAggregate(aggregate: ScenarioAggregate): ScenarioValidationResult {
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];
  const issue = (target: 'error' | 'warning', value: ValidationIssue) =>
    (target === 'error' ? errors : warnings).push(value);
  const ids = <T extends { id: string }>(values: readonly T[]) =>
    new Set(values.map((value) => value.id));
  const locationIds = ids(aggregate.locations);
  const entityIds = ids(aggregate.entities);
  const cardIds = ids(aggregate.storyCards);
  const plotIds = ids(aggregate.plotPoints);
  const arcIds = ids(aggregate.plotArcs);
  const duplicateIds = (values: readonly { id: string }[], section: string): void => {
    if (new Set(values.map((value) => value.id)).size !== values.length)
      issue('error', {
        path: section,
        message: 'duplicate resource IDs are not allowed',
        severity: 'error',
        section,
      });
  };
  duplicateIds(aggregate.entities, 'entities');
  duplicateIds(aggregate.locations, 'locations');
  duplicateIds(aggregate.storyCards, 'storyCards');
  duplicateIds(aggregate.plotArcs, 'plotArcs');
  duplicateIds(aggregate.plotPoints, 'plotPoints');
  if (
    aggregate.scenario.config.retrieval.maxSelected >
    aggregate.scenario.config.retrieval.maxCandidates
  )
    issue('error', {
      path: 'config.retrieval.maxSelected',
      message: 'selected retrieval limit cannot exceed candidate limit',
      severity: 'error',
      section: 'models-pacing',
    });
  if (!locationIds.has(aggregate.scenario.startLocationId))
    issue('error', {
      path: 'startLocationId',
      message: 'start location does not exist',
      severity: 'error',
      section: 'start-state',
    });
  if (!aggregate.entities.some((entity) => entity.playable))
    issue('error', {
      path: 'entities',
      message: 'at least one playable entity is required',
      severity: 'error',
      section: 'entities',
    });
  for (const entity of aggregate.entities) {
    if (entity.revisionId !== aggregate.scenario.revisionId)
      issue('error', {
        path: `entities.${entity.id}.revisionId`,
        message: 'entity belongs to another revision',
        severity: 'error',
        resourceId: entity.id,
        section: 'entities',
      });
    if (!locationIds.has(entity.startingLocationId))
      issue('error', {
        path: `entities.${entity.id}.startingLocationId`,
        message: 'starting location does not exist',
        severity: 'error',
        resourceId: entity.id,
        section: 'entities',
      });
  }
  for (const relationship of aggregate.relationships) {
    if (relationship.revisionId !== aggregate.scenario.revisionId)
      issue('error', {
        path: `relationships.${relationship.id}.revisionId`,
        message: 'relationship belongs to another revision',
        severity: 'error',
        resourceId: relationship.id,
        section: 'relationships',
      });
    if (!entityIds.has(relationship.sourceEntityId) || !entityIds.has(relationship.targetEntityId))
      issue('error', {
        path: `relationships.${relationship.id}`,
        message: 'relationship references an unknown entity',
        severity: 'error',
        resourceId: relationship.id,
        section: 'relationships',
      });
  }
  for (const location of aggregate.locations) {
    if (location.revisionId !== aggregate.scenario.revisionId)
      issue('error', {
        path: `locations.${location.id}.revisionId`,
        message: 'location belongs to another revision',
        severity: 'error',
        resourceId: location.id,
        section: 'locations',
      });
    if (location.parentLocationId && !locationIds.has(location.parentLocationId))
      issue('error', {
        path: `locations.${location.id}.parentLocationId`,
        message: 'parent location does not exist',
        severity: 'error',
        resourceId: location.id,
        section: 'locations',
      });
  }
  for (const edge of aggregate.locationEdges)
    if (!locationIds.has(edge.sourceLocationId) || !locationIds.has(edge.destinationLocationId))
      issue('error', {
        path: `locationEdges.${edge.id}`,
        message: 'edge references an unknown location',
        severity: 'error',
        resourceId: edge.id,
        section: 'locations',
      });
  for (const card of aggregate.storyCards) {
    if (card.revisionId !== aggregate.scenario.revisionId)
      issue('error', {
        path: `storyCards.${card.id}.revisionId`,
        message: 'story card belongs to another revision',
        severity: 'error',
        resourceId: card.id,
        section: 'cards',
      });
    if (card.scope.ownerEntityId && !entityIds.has(card.scope.ownerEntityId))
      issue('error', {
        path: `storyCards.${card.id}.scope.ownerEntityId`,
        message: 'card owner does not exist',
        severity: 'error',
        resourceId: card.id,
        section: 'cards',
      });
    if (card.scope.locationId && !locationIds.has(card.scope.locationId))
      issue('error', {
        path: `storyCards.${card.id}.scope.locationId`,
        message: 'card location does not exist',
        severity: 'error',
        resourceId: card.id,
        section: 'cards',
      });
  }
  for (const link of aggregate.storyCardLinks)
    if (
      !cardIds.has(link.cardId) ||
      (link.targetType === 'entity' && !entityIds.has(link.targetId)) ||
      (link.targetType === 'location' && !locationIds.has(link.targetId)) ||
      (link.targetType === 'story_card' && !cardIds.has(link.targetId)) ||
      (link.targetType === 'plot_point' && !plotIds.has(link.targetId))
    )
      issue('error', {
        path: `storyCardLinks.${link.id}`,
        message: 'card link references an unknown resource',
        severity: 'error',
        resourceId: link.id,
        section: 'cards',
      });
  for (const arc of aggregate.plotArcs)
    if (arc.revisionId !== aggregate.scenario.revisionId)
      issue('error', {
        path: `plotArcs.${arc.id}.revisionId`,
        message: 'plot arc belongs to another revision',
        severity: 'error',
        resourceId: arc.id,
        section: 'plot',
      });
  for (const arc of aggregate.plotArcs)
    for (const pointId of arc.pointIds)
      if (!plotIds.has(pointId))
        issue('error', {
          path: `plotArcs.${arc.id}.pointIds`,
          message: 'plot arc references an unknown plot point',
          severity: 'error',
          resourceId: arc.id,
          section: 'plot',
        });
  for (const point of aggregate.plotPoints)
    if (
      !arcIds.has(point.arcId) ||
      point.parentPointIds.some((id) => !plotIds.has(id)) ||
      point.involvedEntityIds.some((id) => !entityIds.has(id)) ||
      point.involvedLocationIds.some((id) => !locationIds.has(id))
    )
      issue('error', {
        path: `plotPoints.${point.id}`,
        message: 'plot point has an unknown reference',
        severity: 'error',
        resourceId: point.id,
        section: 'plot',
      });
  const children = new Map<string, string[]>();
  for (const location of aggregate.locations)
    if (location.parentLocationId)
      children.set(location.parentLocationId, [
        ...(children.get(location.parentLocationId) ?? []),
        location.id,
      ]);
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): void => {
    if (visiting.has(id)) {
      issue('error', {
        path: `locations.${id}.parentLocationId`,
        message: 'location hierarchy contains a cycle',
        severity: 'error',
        resourceId: id,
        section: 'locations',
      });
      return;
    }
    if (visited.has(id)) return;
    visiting.add(id);
    for (const child of children.get(id) ?? []) visit(child);
    visiting.delete(id);
    visited.add(id);
  };
  for (const location of aggregate.locations) visit(location.id);
  return { valid: errors.length === 0, errors, warnings };
}

export const scenarioRevisionSchema = z.object({
  id: idSchema,
  scenarioId: idSchema,
  revisionNumber: z.number().int().positive(),
  status: z.enum(['draft', 'published']),
  aggregate: z.record(z.unknown()),
  createdAt: z.string().datetime({ offset: true }),
  createdBy: idSchema,
  checksum: boundedText(128),
  attribution: attributionSchema,
});
