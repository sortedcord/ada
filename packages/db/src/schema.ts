import {
  bigint,
  boolean,
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  real,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

const vector = customType<{ data: number[]; driverData: string }>({
  dataType: () => 'vector',
  toDriver: (value) => `[${value.join(',')}]`,
  fromDriver: (value) => value.slice(1, -1).split(',').filter(Boolean).map(Number),
});
const tsvector = customType<{ data: string; driverData: string }>({ dataType: () => 'tsvector' });

const metadata = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  createdBy: text('created_by'),
  updatedBy: text('updated_by'),
  version: integer('version').notNull().default(1),
  schemaVersion: integer('schema_version').notNull().default(1),
  archivedAt: timestamp('archived_at', { withTimezone: true }),
  archivedBy: text('archived_by'),
  attribution: jsonb('attribution').notNull().default({}),
};

export const appSettings = pgTable('app_settings', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  secretReference: text('secret_reference'),
  ...metadata,
});
export const providerModelCache = pgTable(
  'provider_model_cache',
  {
    id: text('id').primaryKey(),
    provider: text('provider').notNull(),
    modelId: text('model_id').notNull(),
    descriptor: jsonb('descriptor').notNull(),
    retrievedAt: timestamp('retrieved_at', { withTimezone: true }).notNull(),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    lastKnownGood: boolean('last_known_good').notNull().default(false),
    ...metadata,
  },
  (table) => [
    uniqueIndex('provider_model_cache_provider_model_uq').on(table.provider, table.modelId),
  ],
);
export const promptVersions = pgTable(
  'prompt_versions',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    promptVersion: integer('prompt_version').notNull(),
    promptHash: text('prompt_hash').notNull(),
    outputSchema: jsonb('output_schema').notNull(),
    privacyClass: text('privacy_class').notNull(),
    active: boolean('active').notNull().default(false),
    ...metadata,
  },
  (table) => [uniqueIndex('prompt_versions_name_version_uq').on(table.name, table.promptVersion)],
);
export const aiInvocations = pgTable(
  'ai_invocations',
  {
    id: text('id').primaryKey(),
    role: text('role').notNull(),
    stage: text('stage').notNull(),
    principalKind: text('principal_kind'),
    principalEntityId: text('principal_entity_id'),
    provider: text('provider').notNull(),
    modelId: text('model_id').notNull(),
    promptVersionId: text('prompt_version_id').notNull(),
    contextPolicyVersion: integer('context_policy_version').notNull().default(1),
    inputHash: text('input_hash'),
    inputSnapshot: jsonb('input_snapshot').notNull().default({}),
    outputSummary: jsonb('output_summary').notNull().default({}),
    authorizedDocumentIds: jsonb('authorized_document_ids').notNull().default([]),
    usage: jsonb('usage').notNull().default({}),
    latencyMs: integer('latency_ms'),
    validation: jsonb('validation').notNull().default({}),
    retryCount: integer('retry_count').notNull().default(0),
    correlationId: text('correlation_id').notNull(),
    rawRetention: boolean('raw_retention').notNull().default(false),
    ...metadata,
  },
  (table) => [
    index('ai_invocations_correlation_idx').on(table.correlationId),
    index('ai_invocations_principal_idx').on(table.correlationId, table.principalEntityId, table.stage),
  ],
);
export const jobRuns = pgTable(
  'job_runs',
  {
    id: text('id').primaryKey(),
    queue: text('queue').notNull(),
    jobKey: text('job_key').notNull(),
    attempts: integer('attempts').notNull().default(0),
    heartbeatAt: timestamp('heartbeat_at', { withTimezone: true }),
    stage: text('stage'),
    status: text('status').notNull(),
    safeError: jsonb('safe_error'),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    ...metadata,
  },
  (table) => [uniqueIndex('job_runs_queue_key_uq').on(table.queue, table.jobKey)],
);
export const turnStreamEvents = pgTable(
  'turn_stream_events',
  {
    id: bigint('id', { mode: 'number' }).primaryKey().generatedAlwaysAsIdentity(),
    turnId: text('turn_id').notNull(),
    eventKey: text('event_key').notNull(),
    eventType: text('event_type').notNull(),
    payload: jsonb('payload').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('turn_stream_events_key_uq').on(table.eventKey),
    index('turn_stream_events_turn_idx').on(table.turnId, table.id),
  ],
);
export const outbox = pgTable(
  'outbox',
  {
    id: text('id').primaryKey(),
    topic: text('topic').notNull(),
    key: text('key').notNull(),
    payload: jsonb('payload').notNull(),
    status: text('status').notNull().default('pending'),
    attempts: integer('attempts').notNull().default(0),
    availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    ...metadata,
  },
  (table) => [
    uniqueIndex('outbox_topic_key_uq').on(table.topic, table.key),
    index('outbox_pending_idx').on(table.status, table.availableAt),
  ],
);
export const auditLog = pgTable(
  'audit_log',
  {
    id: text('id').primaryKey(),
    actor: text('actor').notNull(),
    action: text('action').notNull(),
    resourceType: text('resource_type').notNull(),
    resourceId: text('resource_id').notNull(),
    beforeRef: jsonb('before_ref'),
    afterRef: jsonb('after_ref'),
    boundedDiff: jsonb('bounded_diff'),
    requestId: text('request_id').notNull(),
    ...metadata,
  },
  (table) => [index('audit_log_resource_idx').on(table.resourceType, table.resourceId)],
);

export const scenarios = pgTable(
  'scenarios',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull(),
    title: text('title').notNull(),
    tags: jsonb('tags').notNull().default([]),
    status: text('status').notNull(),
    currentRevision: integer('current_revision').notNull().default(1),
    ...metadata,
  },
  (table) => [uniqueIndex('scenarios_slug_uq').on(table.slug)],
);
export const scenarioRevisions = pgTable(
  'scenario_revisions',
  {
    id: text('id').primaryKey(),
    scenarioId: text('scenario_id').notNull(),
    revisionNumber: integer('revision_number').notNull(),
    status: text('status').notNull(),
    aggregate: jsonb('aggregate').notNull(),
    checksum: text('checksum').notNull(),
    ...metadata,
  },
  (table) => [
    uniqueIndex('scenario_revisions_scenario_revision_uq').on(
      table.scenarioId,
      table.revisionNumber,
    ),
  ],
);
export const entities = pgTable(
  'entities',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    name: text('name').notNull(),
    aliases: jsonb('aliases').notNull().default([]),
    kind: text('kind').notNull(),
    publicData: jsonb('public_data').notNull().default({}),
    privateData: jsonb('private_data').notNull().default({}),
    playable: boolean('playable').notNull().default(false),
    cognitive: boolean('cognitive').notNull().default(false),
    alive: boolean('alive').notNull().default(true),
    active: boolean('active').notNull().default(true),
    startingLocationId: text('starting_location_id'),
    mutationPolicy: text('mutation_policy').notNull(),
    ...metadata,
  },
  (table) => [index('entities_revision_idx').on(table.revisionId)],
);
export const entityRelationships = pgTable(
  'entity_relationships',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    sourceEntityId: text('source_entity_id').notNull(),
    targetEntityId: text('target_entity_id').notNull(),
    relationshipType: text('relationship_type').notNull(),
    publicState: jsonb('public_state').notNull().default({}),
    sourcePrivateState: jsonb('source_private_state').notNull().default({}),
    canonicalFacts: jsonb('canonical_facts').notNull().default([]),
    dimensions: jsonb('dimensions').notNull().default({}),
    historySummary: text('history_summary'),
    lastChangedTurn: integer('last_changed_turn'),
    ...metadata,
  },
  (table) => [
    uniqueIndex('entity_relationships_directional_uq').on(
      table.revisionId,
      table.sourceEntityId,
      table.targetEntityId,
      table.relationshipType,
    ),
  ],
);
export const locations = pgTable(
  'locations',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    name: text('name').notNull(),
    aliases: jsonb('aliases').notNull().default([]),
    locationType: text('location_type').notNull(),
    parentLocationId: text('parent_location_id'),
    publicData: jsonb('public_data').notNull().default({}),
    privateData: jsonb('private_data').notNull().default({}),
    coordinates: jsonb('coordinates'),
    environment: jsonb('environment').notNull().default({}),
    access: jsonb('access').notNull().default({}),
    sensoryProperties: jsonb('sensory_properties').notNull().default({}),
    hazards: jsonb('hazards').notNull().default([]),
    mutationPolicy: text('mutation_policy').notNull(),
    ...metadata,
  },
  (table) => [
    index('locations_revision_idx').on(table.revisionId),
    index('locations_parent_idx').on(table.parentLocationId),
  ],
);
export const locationEdges = pgTable(
  'location_edges',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    sourceLocationId: text('source_location_id').notNull(),
    destinationLocationId: text('destination_location_id').notNull(),
    directed: boolean('directed').notNull(),
    travelText: text('travel_text'),
    travelTime: integer('travel_time'),
    travelCost: integer('travel_cost'),
    accessRequirements: jsonb('access_requirements').notNull().default([]),
    discoverability: integer('discoverability').notNull(),
    blocked: boolean('blocked').notNull().default(false),
    ...metadata,
  },
  (table) => [
    index('location_edges_source_idx').on(table.sourceLocationId),
    index('location_edges_destination_idx').on(table.destinationLocationId),
  ],
);
export const storyCards = pgTable(
  'story_cards',
  {
    id: text('id').primaryKey(),
    revisionId: text('revision_id').notNull(),
    title: text('title').notNull(),
    cardType: text('card_type').notNull(),
    mutationPolicy: text('mutation_policy').notNull(),
    locked: boolean('locked').notNull().default(false),
    currentVersion: integer('current_version').notNull().default(1),
    ...metadata,
  },
  (table) => [index('story_cards_current_idx').on(table.revisionId, table.currentVersion)],
);
export const storyCardVersions = pgTable(
  'story_card_versions',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id').notNull(),
    body: jsonb('body').notNull(),
    scope: text('scope').notNull(),
    source: text('source').notNull(),
    diff: jsonb('diff').notNull().default([]),
    ...metadata,
  },
  (table) => [uniqueIndex('story_card_versions_card_version_uq').on(table.cardId, table.version)],
);
export const storyCardLinks = pgTable(
  'story_card_links',
  {
    id: text('id').primaryKey(),
    cardId: text('card_id').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id').notNull(),
    relationType: text('relation_type').notNull(),
    weight: integer('weight').notNull(),
    ...metadata,
  },
  (table) => [index('story_card_links_target_idx').on(table.targetType, table.targetId)],
);
export const plotArcs = pgTable('plot_arcs', {
  id: text('id').primaryKey(),
  revisionId: text('revision_id').notNull(),
  title: text('title').notNull(),
  description: text('description'),
  priority: integer('priority').notNull(),
  ...metadata,
});
export const plotPoints = pgTable(
  'plot_points',
  {
    id: text('id').primaryKey(),
    arcId: text('arc_id').notNull(),
    revisionId: text('revision_id').notNull(),
    title: text('title').notNull(),
    internalDescription: text('internal_description'),
    source: text('source').notNull(),
    priority: integer('priority').notNull(),
    status: text('status').notNull(),
    conditions: jsonb('conditions').notNull().default({}),
    outcomes: jsonb('outcomes').notNull().default({}),
    involvedEntityIds: jsonb('involved_entity_ids').notNull().default([]),
    involvedLocationIds: jsonb('involved_location_ids').notNull().default([]),
    visibility: text('visibility').notNull(),
    timing: jsonb('timing').notNull().default({}),
    ...metadata,
  },
  (table) => [index('plot_points_active_idx').on(table.revisionId, table.status)],
);
export const plotPointLinks = pgTable(
  'plot_point_links',
  {
    pointId: text('point_id').notNull(),
    dependsOnPointId: text('depends_on_point_id').notNull(),
    relationType: text('relation_type').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.pointId, table.dependsOnPointId] })],
);

export const runs = pgTable('runs', {
  id: text('id').primaryKey(),
  scenarioRevisionId: text('scenario_revision_id').notNull(),
  playerEntityId: text('player_entity_id').notNull(),
  activeBranchId: text('active_branch_id'),
  status: text('status').notNull(),
  currentTurn: integer('current_turn').notNull().default(0),
  expectedVersion: integer('expected_version').notNull().default(1),
  worldTime: timestamp('world_time', { withTimezone: true }).notNull(),
  randomSeed: integer('random_seed').notNull(),
  narrativeSettings: jsonb('narrative_settings').notNull(),
  roleSettingsSnapshot: jsonb('role_settings_snapshot').notNull(),
  retrievalProfileSnapshot: jsonb('retrieval_profile_snapshot').notNull(),
  lastSuccessfulSnapshotId: text('last_successful_snapshot_id'),
  ...metadata,
});
export const runBranches = pgTable(
  'run_branches',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    parentBranchId: text('parent_branch_id'),
    forkTurn: integer('fork_turn').notNull(),
    label: text('label').notNull(),
    active: boolean('active').notNull().default(false),
    canonical: boolean('canonical').notNull().default(false),
    creationReason: text('creation_reason').notNull(),
    ...metadata,
  },
  (table) => [
    index('run_branches_run_idx').on(table.runId),
    uniqueIndex('run_branches_active_uq').on(table.runId, table.active),
  ],
);
export const turns = pgTable(
  'turns',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    turnNumber: integer('turn_number').notNull(),
    parentTurnId: text('parent_turn_id'),
    rawPlayerInput: text('raw_player_input').notNull(),
    parsedIntent: jsonb('parsed_intent'),
    status: text('status').notNull(),
    stage: text('stage').notNull(),
    startedAt: timestamp('started_at', { withTimezone: true }),
    endedAt: timestamp('ended_at', { withTimezone: true }),
    failure: jsonb('failure'),
    finalNarrative: text('final_narrative'),
    idempotencyKey: text('idempotency_key').notNull(),
    expectedVersion: integer('expected_version').notNull(),
    cancellationRequested: boolean('cancellation_requested').notNull().default(false),
    ...metadata,
  },
  (table) => [
    uniqueIndex('turns_run_branch_number_uq').on(table.runId, table.branchId, table.turnNumber),
    uniqueIndex('turns_idempotency_uq').on(table.runId, table.idempotencyKey),
    index('turns_timeline_idx').on(table.runId, table.branchId, table.turnNumber),
  ],
);
export const turnStageResults = pgTable(
  'turn_stage_results',
  {
    id: text('id').primaryKey(),
    turnId: text('turn_id').notNull(),
    stage: text('stage').notNull(),
    inputSnapshot: jsonb('input_snapshot').notNull(),
    providerResultRef: jsonb('provider_result_ref'),
    validatedOutput: jsonb('validated_output'),
    applicationKey: text('application_key').notNull(),
    retries: integer('retries').notNull().default(0),
    status: text('status').notNull(),
    ...metadata,
  },
  (table) => [
    uniqueIndex('turn_stage_results_application_uq').on(table.turnId, table.applicationKey),
  ],
);
export const actions = pgTable('actions', {
  id: text('id').primaryKey(),
  turnId: text('turn_id').notNull(),
  actorEntityId: text('actor_entity_id').notNull(),
  actionType: text('action_type').notNull(),
  targets: jsonb('targets').notNull().default([]),
  intent: text('intent').notNull(),
  assumptions: jsonb('assumptions').notNull().default([]),
  visibility: text('visibility').notNull(),
  source: text('source').notNull(),
  ...metadata,
});
export const events = pgTable(
  'events',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    turnId: text('turn_id').notNull(),
    eventType: text('event_type').notNull(),
    locationId: text('location_id').notNull(),
    worldTime: timestamp('world_time', { withTimezone: true }).notNull(),
    canonicalDescription: text('canonical_description').notNull(),
    visibilityHints: jsonb('visibility_hints').notNull().default([]),
    salience: real('salience').notNull(),
    emotionalWeight: real('emotional_weight').notNull(),
    ...metadata,
  },
  (table) => [index('events_run_timeline_idx').on(table.runId, table.branchId, table.turnId)],
);
export const eventParticipants = pgTable(
  'event_participants',
  {
    eventId: text('event_id').notNull(),
    entityId: text('entity_id').notNull(),
    role: text('role').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.eventId, table.entityId] })],
);
export const eventFacts = pgTable('event_facts', {
  id: text('id').primaryKey(),
  eventId: text('event_id').notNull(),
  key: text('key').notNull(),
  value: jsonb('value').notNull(),
  visibility: text('visibility').notNull(),
  source: jsonb('source').notNull(),
  ...metadata,
});
export const observations = pgTable(
  'observations',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    observerEntityId: text('observer_entity_id').notNull(),
    sourceEventId: text('source_event_id').notNull(),
    modality: text('modality').notNull(),
    perceivedContent: text('perceived_content').notNull(),
    detail: real('detail').notNull(),
    confidence: real('confidence').notNull(),
    distortion: text('distortion'),
    occluded: boolean('occluded').notNull(),
    observedTurn: integer('observed_turn').notNull(),
    visibility: text('visibility').notNull(),
    ...metadata,
  },
  (table) => [index('observations_owner_idx').on(table.runId, table.observerEntityId)],
);
export const beliefs = pgTable(
  'beliefs',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    ownerEntityId: text('owner_entity_id').notNull(),
    proposition: jsonb('proposition').notNull(),
    rendering: text('rendering').notNull(),
    confidence: real('confidence').notNull(),
    status: text('status').notNull(),
    evidence: jsonb('evidence').notNull().default([]),
    salience: real('salience').notNull(),
    ...metadata,
  },
  (table) => [index('beliefs_owner_active_idx').on(table.runId, table.ownerEntityId, table.status)],
);
export const beliefEvidence = pgTable(
  'belief_evidence',
  {
    beliefId: text('belief_id').notNull(),
    evidenceType: text('evidence_type').notNull(),
    evidenceId: text('evidence_id').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.beliefId, table.evidenceType, table.evidenceId] })],
);
export const memories = pgTable(
  'memories',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    ownerEntityId: text('owner_entity_id').notNull(),
    memoryType: text('memory_type').notNull(),
    content: text('content').notNull(),
    importance: real('importance').notNull(),
    emotionalValence: real('emotional_valence').notNull(),
    emotionalIntensity: real('emotional_intensity').notNull(),
    confidence: real('confidence').notNull(),
    accessibility: real('accessibility').notNull(),
    decayRate: real('decay_rate').notNull(),
    lifecycleStatus: text('lifecycle_status').notNull(),
    sourceLinks: jsonb('source_links').notNull().default([]),
    reinforcedTurn: integer('reinforced_turn').notNull(),
    ...metadata,
  },
  (table) => [
    index('memories_owner_active_idx').on(table.runId, table.ownerEntityId, table.lifecycleStatus),
  ],
);
export const memoryLinks = pgTable(
  'memory_links',
  {
    memoryId: text('memory_id').notNull(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.memoryId, table.sourceType, table.sourceId] })],
);
export const innerThoughts = pgTable(
  'inner_thoughts',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    ownerEntityId: text('owner_entity_id').notNull(),
    turnId: text('turn_id').notNull(),
    triggeringEventId: text('triggering_event_id'),
    text: text('text').notNull(),
    persistence: text('persistence').notNull(),
    salience: real('salience').notNull(),
    urgency: real('urgency').notNull(),
    emotionalValence: real('emotional_valence').notNull(),
    emotionalIntensity: real('emotional_intensity').notNull(),
    decayRate: real('decay_rate').notNull().default(0),
    expiresAtTurn: integer('expires_at_turn'),
    reinforcementCount: integer('reinforcement_count').notNull().default(0),
    status: text('status').notNull(),
    playerInspectable: boolean('player_inspectable').notNull(),
    visibility: text('visibility').notNull(),
    ...metadata,
  },
  (table) => [
    index('inner_thoughts_owner_active_idx').on(table.runId, table.ownerEntityId, table.status),
  ],
);
export const runEntityState = pgTable(
  'run_entity_state',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    entityId: text('entity_id').notNull(),
    state: jsonb('state').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.runId, table.branchId, table.entityId] })],
);
export const runRelationshipState = pgTable(
  'run_relationship_state',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    relationshipId: text('relationship_id').notNull(),
    state: jsonb('state').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.runId, table.branchId, table.relationshipId] })],
);
export const runLocationState = pgTable(
  'run_location_state',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    locationId: text('location_id').notNull(),
    state: jsonb('state').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.runId, table.branchId, table.locationId] })],
);
export const runStoryCardState = pgTable(
  'run_story_card_state',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    cardId: text('card_id').notNull(),
    state: jsonb('state').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.runId, table.branchId, table.cardId] })],
);
export const architectState = pgTable(
  'architect_state',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    state: jsonb('state').notNull(),
    ...metadata,
  },
  (table) => [primaryKey({ columns: [table.runId, table.branchId] })],
);
export const runSnapshots = pgTable('run_snapshots', {
  id: text('id').primaryKey(),
  runId: text('run_id').notNull(),
  branchId: text('branch_id').notNull(),
  turn: integer('turn').notNull(),
  projectionVersions: jsonb('projection_versions').notNull(),
  checksum: text('checksum').notNull(),
  serializedState: text('serialized_state').notNull(),
  ...metadata,
});
export const narrativeSegments = pgTable(
  'narrative_segments',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    turnId: text('turn_id').notNull(),
    segmentType: text('segment_type').notNull(),
    eventIds: jsonb('event_ids').notNull().default([]),
    speakerEntityId: text('speaker_entity_id'),
    segmentOrder: integer('segment_order').notNull(),
    visibility: text('visibility').notNull(),
    text: text('text').notNull(),
    ...metadata,
  },
  (table) => [
    uniqueIndex('narrative_segments_turn_version_order_uq').on(
      table.turnId,
      table.version,
      table.segmentOrder,
    ),
  ],
);

export const retrievalDocuments = pgTable(
  'retrieval_documents',
  {
    id: text('id').primaryKey(),
    sourceType: text('source_type').notNull(),
    sourceId: text('source_id').notNull(),
    sourceVersion: integer('source_version').notNull(),
    runId: text('run_id'),
    scenarioId: text('scenario_id'),
    branchId: text('branch_id'),
    visibility: text('visibility').notNull(),
    ownerEntityId: text('owner_entity_id'),
    contentHash: text('content_hash').notNull(),
    active: boolean('active').notNull().default(true),
    ...metadata,
  },
  (table) => [
    index('retrieval_documents_scope_idx').on(table.runId, table.branchId, table.visibility),
  ],
);
export const retrievalChunks = pgTable(
  'retrieval_chunks',
  {
    id: text('id').primaryKey(),
    documentId: text('document_id').notNull(),
    text: text('text').notNull(),
    searchVector: tsvector('search_vector'),
    metadata: jsonb('metadata').notNull().default({}),
    sourceLinks: jsonb('source_links').notNull().default([]),
    turnFrom: integer('turn_from'),
    turnTo: integer('turn_to'),
    importance: real('importance').notNull(),
    salience: real('salience').notNull(),
    recencyAt: timestamp('recency_at', { withTimezone: true }),
    contentHash: text('content_hash').notNull(),
    visibility: text('visibility').notNull(),
    ownerEntityId: text('owner_entity_id'),
    active: boolean('active').notNull().default(true),
    ...metadata,
  },
  (table) => [
    index('retrieval_chunks_active_scope_idx').on(
      table.visibility,
      table.ownerEntityId,
      table.active,
    ),
    index('retrieval_chunks_search_idx').using('gin', table.searchVector),
  ],
);
export const embeddingProfiles = pgTable('embedding_profiles', {
  id: text('id').primaryKey(),
  provider: text('provider').notNull(),
  modelId: text('model_id').notNull(),
  dimensions: integer('dimensions').notNull(),
  distance: text('distance').notNull(),
  status: text('status').notNull(),
  generation: integer('generation').notNull().default(1),
  active: boolean('active').notNull().default(false),
  ...metadata,
});
export const chunkEmbeddings = pgTable(
  'chunk_embeddings',
  {
    chunkId: text('chunk_id').notNull(),
    embeddingProfileId: text('embedding_profile_id').notNull(),
    modelId: text('model_id').notNull(),
    dimensions: integer('dimensions').notNull(),
    contentHash: text('content_hash').notNull(),
    embedding: vector('embedding').notNull(),
    ...metadata,
  },
  (table) => [
    primaryKey({ columns: [table.chunkId, table.embeddingProfileId] }),
    index('chunk_embeddings_profile_idx').on(table.embeddingProfileId),
  ],
);
export const retrievalAudit = pgTable('retrieval_audit', {
  id: text('id').primaryKey(),
  principal: jsonb('principal').notNull(),
  queryMetadata: jsonb('query_metadata').notNull(),
  selectedChunkIds: jsonb('selected_chunk_ids').notNull().default([]),
  rejectedChunkIds: jsonb('rejected_chunk_ids').notNull().default([]),
  scores: jsonb('scores').notNull().default({}),
  budgetDecisions: jsonb('budget_decisions').notNull().default({}),
  durationMs: integer('duration_ms'),
  ...metadata,
});

export const relationshipViews = pgTable(
  'relationship_views',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    ownerEntityId: text('owner_entity_id').notNull(),
    subjectEntityId: text('subject_entity_id').notNull(),
    dimensions: jsonb('dimensions').notNull().default({}),
    summary: text('summary').notNull().default(''),
    confidence: real('confidence').notNull().default(1),
    sourceEvidenceIds: jsonb('source_evidence_ids').notNull().default([]),
    ...metadata,
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.branchId, table.ownerEntityId, table.subjectEntityId] }),
    index('relationship_views_owner_idx').on(table.runId, table.branchId, table.ownerEntityId),
  ],
);

export const entityAliases = pgTable(
  'entity_aliases',
  {
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    ownerEntityId: text('owner_entity_id').notNull(),
    subjectEntityId: text('subject_entity_id').notNull(),
    alias: text('alias').notNull(),
    identityKnown: boolean('identity_known').notNull().default(false),
    confidence: real('confidence').notNull().default(0.5),
    sourceEvidenceIds: jsonb('source_evidence_ids').notNull().default([]),
    firstLearnedTurn: integer('first_learned_turn').notNull(),
    lastUpdatedTurn: integer('last_updated_turn').notNull(),
    ...metadata,
  },
  (table) => [
    primaryKey({ columns: [table.runId, table.branchId, table.ownerEntityId, table.subjectEntityId] }),
    index('entity_aliases_owner_idx').on(table.runId, table.branchId, table.ownerEntityId),
  ],
);

export const communications = pgTable(
  'communications',
  {
    id: text('id').primaryKey(),
    runId: text('run_id').notNull(),
    branchId: text('branch_id').notNull(),
    turnId: text('turn_id').notNull(),
    senderEntityId: text('sender_entity_id').notNull(),
    recipientEntityIds: jsonb('recipient_entity_ids').notNull(),
    medium: text('medium').notNull(),
    body: text('body').notNull(),
    observableEnvelope: text('observable_envelope').notNull(),
    delivered: boolean('delivered').notNull().default(false),
    worldTime: timestamp('world_time', { withTimezone: true }).notNull(),
    ...metadata,
  },
  (table) => [
    index('communications_run_turn_idx').on(table.runId, table.branchId, table.turnId),
  ],
);

export const allTables = {
  appSettings,
  providerModelCache,
  promptVersions,
  aiInvocations,
  jobRuns,
  outbox,
  turnStreamEvents,
  auditLog,
  scenarios,
  scenarioRevisions,
  entities,
  entityRelationships,
  locations,
  locationEdges,
  storyCards,
  storyCardVersions,
  storyCardLinks,
  plotArcs,
  plotPoints,
  plotPointLinks,
  runs,
  runBranches,
  turns,
  turnStageResults,
  actions,
  events,
  eventParticipants,
  eventFacts,
  observations,
  beliefs,
  beliefEvidence,
  memories,
  memoryLinks,
  innerThoughts,
  relationshipViews,
  communications,
  entityAliases,
  runEntityState,
  runRelationshipState,
  runLocationState,
  runStoryCardState,
  architectState,
  runSnapshots,
  narrativeSegments,
  retrievalDocuments,
  retrievalChunks,
  embeddingProfiles,
  chunkEmbeddings,
  retrievalAudit,
};
