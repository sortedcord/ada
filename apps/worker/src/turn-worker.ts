/* eslint-disable */
import { architectTick, validateArchitectGuidance } from '@ada/architect';
import {
  AdityaGuptaGenerationProvider,
  FakeGenerationProvider,
  type GenerationProvider,
  type GenerationResult,
} from '@ada/ai';
import {
  beliefSchema,
  KnowledgePolicy,
  npcPrincipalDecisionSchema,
  portalStateSchema,
  validateCanonicalPatch,
  validateNpcPrincipalDecision,
} from '@ada/domain';
import {
  NpcContextService,
  computeEligiblePerceptions,
  detectMovementIntent,
  inferMovementFallback,
  normalizeRuntimePortalState,
  runtimePortalEdges,
  runtimePortalStateFor,
  sensoryTransmissionBetween,
  type ProvisionalActionSignal,
  type RuntimeEntityView,
} from '@ada/engine';
import { and, eq, sql } from 'drizzle-orm';
import type { ServerEnvironment } from '@ada/config';
import type { Database } from '@ada/db';
import {
  actions,
  aiInvocations,
  architectState,
  applyNpcGoals,
  events,
  innerThoughts,
  jobRuns,
  memories,
  communications,
  entityAliases,
  NpcContextRepository,
  observations,
  outbox,
  persistNpcBeliefs,
  narrativeSegments,
  runEntityState,
  runLocationState,
  runPortalState,
  runs,
  scenarioRevisions,
  turnStageResults,
  turnStreamEvents,
  turns,
} from '@ada/db';
import { z } from 'zod';

const outputSchema = z.object({
  narrative: z.string().min(1).max(20_000),
  eventDescription: z.string().min(1).max(20_000),
  timeElapsedMinutes: z.number().int().min(0).max(1440).default(1),
  locationChange: z
    .object({
      locationId: z.string().nullable().optional(),
      locationName: z.string().nullable().optional(),
      description: z.string().nullable().optional(),
      parentLocationId: z.string().nullable().optional(),
    })
    .nullable()
    .optional(),
  discoveredNpcs: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().nullable().optional(),
        personality: z.array(z.string()).optional(),
        locationId: z.string().nullable().optional(),
        locationName: z.string().nullable().optional(),
        spatialRelation: z.enum(['same_location', 'adjacent', 'distant']).nullable().optional(),
      }),
    )
    .default([]),
  portalChanges: z
    .array(
      z.object({
        portalId: z.string(),
        state: portalStateSchema,
      }),
    )
    .max(20)
    .default([]),
  patches: z
    .array(
      z.object({
        op: z.string(),
        path: z.string(),
        value: z.string().optional(),
      }),
    )
    .max(20)
    .default([]),
});
const responseJsonSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['narrative', 'eventDescription', 'patches'],
  properties: {
    narrative: { type: 'string' },
    eventDescription: { type: 'string' },
    patches: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { op: { type: 'string' }, path: { type: 'string' }, value: { type: 'string' } },
        required: ['op', 'path', 'value'],
      },
    },
  },
};

export async function processTurn(
  database: Database,
  environment: ServerEnvironment,
  turnId: string,
  runId: string,
  signal?: AbortSignal,
  providerOverride?: GenerationProvider,
): Promise<void> {
  const [turn] = await database
    .select()
    .from(turns)
    .where(and(eq(turns.id, turnId), eq(turns.runId, runId)))
    .limit(1);
  const [run] = await database.select().from(runs).where(eq(runs.id, runId)).limit(1);
  if (!turn || !run) throw new Error('Turn or run not found');
  if (signal?.aborted) return;
  const updateJob = (status: string, stage: string, safeError?: unknown) =>
    database
      .update(jobRuns)
      .set({ status, stage, heartbeatAt: new Date(), ...(safeError ? { safeError } : {}) })
      .where(eq(jobRuns.jobKey, turnId));
  const recordStageEvent = async (stage: string, output: unknown): Promise<void> => {
    await database
      .insert(turnStageResults)
      .values({
        id: `${turnId}:stage:${stage}`,
        turnId,
        stage,
        inputSnapshot: { runId, branchId: turn.branchId, expectedVersion: turn.expectedVersion },
        validatedOutput: output,
        applicationKey: `${turnId}:stage:${stage}`,
        status: 'applied',
        attribution: { source: 'system', sourceIds: [turnId] },
      })
      .onConflictDoNothing();
    await database
      .insert(turnStreamEvents)
      .values({
        turnId,
        eventKey: `${turnId}:stage:${stage}`,
        eventType: 'turn.stage_changed',
        payload: { stage },
      })
      .onConflictDoNothing();
  };
  const recordStage = async (stage: string, output: unknown): Promise<void> => {
    await database
      .insert(turnStageResults)
      .values({
        id: `${turnId}:stage:${stage}`,
        turnId,
        stage,
        inputSnapshot: { runId, branchId: turn.branchId, expectedVersion: turn.expectedVersion },
        validatedOutput: output,
        applicationKey: `${turnId}:stage:${stage}`,
        status: 'applied',
        attribution: { source: 'system', sourceIds: [turnId] },
      })
      .onConflictDoNothing();
    await database
      .insert(turnStreamEvents)
      .values({
        turnId,
        eventKey: `${turnId}:stage:${stage}`,
        eventType: 'turn.stage_changed',
        payload: { stage },
      })
      .onConflictDoNothing();
    await database.update(turns).set({ stage, updatedAt: new Date() }).where(eq(turns.id, turnId));
    await updateJob('running', stage);
  };
  await updateJob('running', 'ACCEPTED');
  await recordStage('ACCEPTED', { rawInputPreserved: true });
  if (turn.status === 'cancelled' || turn.cancellationRequested) {
    await updateJob('cancelled', 'CANCELLED');
    return;
  }
  if (run.expectedVersion !== turn.expectedVersion) {
    await database
      .update(turns)
      .set({
        status: 'retryable_failure',
        stage: 'RETRYABLE_FAILURE',
        failure: {
          code: 'stale_context',
          message: 'Run changed after turn acceptance',
          retryable: true,
        },
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(turns.id, turnId));
    return;
  }
  await database
    .update(turns)
    .set({
      status: 'running',
      stage: 'INPUT_VALIDATED',
      startedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(turns.id, turnId));
  await recordStage('INPUT_VALIDATED', { rawInputPreserved: true });
  if (!environment.GENERATION_ENABLED) {
    await database
      .update(turns)
      .set({
        status: 'blocked_configuration',
        stage: 'BLOCKED_CONFIGURATION',
        failure: {
          code: 'generation_disabled',
          message: 'Generation provider is not configured',
          retryable: false,
        },
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(turns.id, turnId));
    await updateJob('blocked_configuration', 'BLOCKED_CONFIGURATION', {
      code: 'generation_disabled',
    });
    return;
  }
  const [revision] = await database
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, run.scenarioRevisionId))
    .limit(1);
  const aggregate = revision?.aggregate as
    | {
        scenario?: {
          startLocationId?: string;
          defaultNarrationStyle?: string;
          config?: {
            pacing?: {
              tensionTarget?: number;
              interventionCooldownTurns?: number;
              interventionThreshold?: number;
            };
          };
        };
        entities?: Array<{
          id: string;
          name?: string;
          pronouns?: string;
          cognitive?: boolean;
          active?: boolean;
          startingLocationId?: string;
          publicDescription?: string;
          privateDescription?: string;
          history?: string;
          historicalEvents?: Array<Record<string, unknown>>;
          personality?: string[];
          speechStyle?: string;
          drives?: string[];
          goals?: string[];
          fears?: string[];
          capabilities?: string[];
          limitations?: string[];
        }>;
        locations?: Array<{
          id: string;
          name?: string;
          parentLocationId?: string | null;
          environment?: Record<string, unknown>;
          hazards?: string[];
        }>;
        locationEdges?: Array<{
          id: string;
          sourceLocationId: string;
          destinationLocationId: string;
          directed: boolean;
          connectionKind?: 'route' | 'portal';
          portal?: {
            name: string;
            defaultState?: 'open' | 'ajar' | 'closed' | 'locked' | 'barred';
            transmission?: {
              open: { sight: number; sound: number };
              ajar: { sight: number; sound: number };
              closed: { sight: number; sound: number };
              locked: { sight: number; sound: number };
              barred: { sight: number; sound: number };
            };
          };
        }>;
        relationships?: Array<{
          id: string;
          sourceEntityId?: string;
          targetEntityId?: string;
          canonicalFacts?: string[];
          historySummary?: string;
        }>;
        storyCards?: Array<{ id: string }>;
        plotPoints?: Array<{ id: string }>;
      }
    | undefined;
  const locationId = aggregate?.scenario?.startLocationId;
  if (!locationId) throw new Error('Scenario start location is unavailable');

  // Check if active model has been customized via database app_settings
  let activeModel = environment.GENERATION_DEFAULT_MODEL;
  try {
    const { appSettings } = await import('@ada/db');
    const [modelSetting] = await database
      .select()
      .from(appSettings)
      .where(eq(appSettings.key, 'active_model'))
      .limit(1);
    if (modelSetting?.value && typeof (modelSetting.value as any).model === 'string') {
      activeModel = (modelSetting.value as any).model;
    }
  } catch {
    // fallback to environment model
  }

  const provider: GenerationProvider =
    providerOverride ??
    (environment.GENERATION_PROVIDER === 'fake' ||
    environment.GENERATION_API_KEY === 'fake' ||
    !environment.GENERATION_API_KEY ||
    environment.GENERATION_API_KEY.includes('replace-with')
      ? new FakeGenerationProvider([
          {
            kind: 'value',
            value: {
              decisions: [
                {
                  entityId: 'entity_kaelen',
                  attention: 'focused',
                  reaction: 'speak',
                  speech: 'The ancient records are restless tonight.',
                  generatedThoughts: [
                    {
                      text: 'I must not let the secret seal be known.',
                      persistence: 'ephemeral',
                      salience: 0.8,
                      urgency: 0.5,
                    },
                  ],
                  beliefProposals: [],
                  goalUpdates: [],
                  perceivedEvidenceIds: [],
                },
              ],
            },
          },
          {
            kind: 'value',
            value: {
              narrative: 'The archivist whispers back, gesturing toward the shadowy aisle.',
              eventDescription: 'Player whispered with the archivist in the Hall of Echoes.',
              timeElapsedMinutes: 1,
              patches: [],
              discoveredNpcs: [],
            },
          },
        ])
      : new AdityaGuptaGenerationProvider({
          baseUrl: environment.GENERATION_BASE_URL,
          apiKey: environment.GENERATION_API_KEY,
          provider: environment.GENERATION_PROVIDER,
          retries: 1,
        }));
  await updateJob('running', 'CONTEXT_SNAPSHOTTED');
  await database
    .insert(turnStageResults)
    .values({
      id: `${turnId}:context`,
      turnId,
      stage: 'CONTEXT_SNAPSHOTTED',
      inputSnapshot: {
        runId,
        branchId: turn.branchId,
        scenarioRevisionId: run.scenarioRevisionId,
        expectedVersion: run.expectedVersion,
        entityIds: aggregate?.entities?.map((item) => item.id) ?? [],
        locationIds: aggregate?.locations?.map((item) => item.id) ?? [],
        relationshipIds: aggregate?.relationships?.map((item) => item.id) ?? [],
        storyCardIds: aggregate?.storyCards?.map((item) => item.id) ?? [],
        plotPointIds: aggregate?.plotPoints?.map((item) => item.id) ?? [],
        architectVersion: 1,
      },
      validatedOutput: { runId, branchId: turn.branchId },
      applicationKey: `${turnId}:context`,
      status: 'applied',
      attribution: { source: 'system', sourceIds: [runId] },
    })
    .onConflictDoNothing();
  await database
    .update(turns)
    .set({ stage: 'CONTEXT_SNAPSHOTTED', updatedAt: new Date() })
    .where(eq(turns.id, turnId));
  await recordStage('CONTEXT_SNAPSHOTTED', {
    entityIds: aggregate?.entities?.map((item) => item.id) ?? [],
    locationIds: aggregate?.locations?.map((item) => item.id) ?? [],
  });
  await database
    .insert(actions)
    .values({
      id: `action:${turnId}:player:0`,
      turnId,
      actorEntityId: run.playerEntityId,
      actionType: 'custom',
      targets: [],
      intent: turn.rawPlayerInput,
      assumptions: [],
      visibility: 'scene_observable',
      source: 'player',
      attribution: { source: 'player', sourceIds: [turnId] },
    })
    .onConflictDoNothing();
  const [architectRow] = await database
    .select()
    .from(architectState)
    .where(and(eq(architectState.runId, runId), eq(architectState.branchId, turn.branchId)))
    .limit(1);
  const currentArchitectState = architectRow?.state as
    Parameters<typeof architectTick>[0] | undefined;
  const pacing = {
    tensionTarget: aggregate?.scenario?.config?.pacing?.tensionTarget ?? 0.5,
    interventionCooldownTurns: aggregate?.scenario?.config?.pacing?.interventionCooldownTurns ?? 3,
    interventionThreshold: aggregate?.scenario?.config?.pacing?.interventionThreshold ?? 0.7,
  };
  const architectResult = currentArchitectState
    ? architectTick(
        currentArchitectState,
        {
          turn: turn.turnNumber,
          turnsSinceSignificantChange: turn.turnNumber,
          turnsSinceGoalProgress: turn.turnNumber,
          repeatedPlayerIntents: 0,
          repeatedNpcNoActions: 0,
          activePlotsWithoutProgress: currentArchitectState.activePlotPoints.length
            ? turn.turnNumber
            : 0,
          unresolvedHooks: currentArchitectState.openHooks.length,
          dialogueOnlyStreak: turn.turnNumber,
          sceneDuration: turn.turnNumber,
        },
        pacing,
      )
    : null;
  const architectGuidance = architectResult?.shouldIntervene
    ? [
        'Offer an optional environmental pressure or investigative opportunity; preserve multiple player responses.',
      ]
    : [];
  const guidanceCheck = validateArchitectGuidance(architectGuidance);
  if (architectRow && architectResult && guidanceCheck.valid) {
    await database
      .update(architectState)
      .set({
        state: architectResult.state,
        version: architectRow.version + 1,
        updatedAt: new Date(),
      })
      .where(and(eq(architectState.runId, runId), eq(architectState.branchId, turn.branchId)));
  }
  await updateJob('running', 'ARCHITECT_PLANNED');
  await database
    .insert(turnStageResults)
    .values({
      id: `${turnId}:architect`,
      turnId,
      stage: 'ARCHITECT_PLANNED',
      inputSnapshot: { runId, branchId: turn.branchId },
      validatedOutput: {
        pacingAssessment: architectResult?.shouldIntervene
          ? 'stagnating_optional_pressure'
          : 'neutral',
        stagnationScore: architectResult?.score ?? 0,
        guidance: guidanceCheck.valid ? architectGuidance : [],
        activePlotPriorities:
          currentArchitectState?.activePlotPoints.map((id) => ({ type: 'plot_point', id })) ?? [],
        foreshadowingOptions: currentArchitectState?.futureBeats ?? [],
        cooldownUpdates: [],
        forbiddenRevelations: ['Do not reveal privileged architect context or player thoughts.'],
      },
      applicationKey: `${turnId}:architect`,
      status: 'applied',
      attribution: { source: 'architect', sourceIds: [runId] },
    })
    .onConflictDoNothing();
  await database
    .update(turns)
    .set({ stage: 'ARCHITECT_PLANNED', updatedAt: new Date() })
    .where(eq(turns.id, turnId));
  // Query dynamic spatial state before selecting observers. Exact string
  // location equality is not enough: authored portal transmission determines
  // whether adjacent rooms may see or hear one another.
  const entityStates = await database
    .select()
    .from(runEntityState)
    .where(and(eq(runEntityState.runId, runId), eq(runEntityState.branchId, turn.branchId)));
  const locationStates = await database
    .select()
    .from(runLocationState)
    .where(and(eq(runLocationState.runId, runId), eq(runLocationState.branchId, turn.branchId)));
  const portalStateRows = await database
    .select()
    .from(runPortalState)
    .where(and(eq(runPortalState.runId, runId), eq(runPortalState.branchId, turn.branchId)));

  const staticLocations = aggregate?.locations ?? [];
  const runtimeLocations = [
    ...staticLocations.map((location) => ({
      id: location.id,
      parentLocationId: location.parentLocationId ?? null,
      name: location.name,
    })),
    ...locationStates.flatMap((row) => {
      if (staticLocations.some((location) => location.id === row.locationId)) return [];
      const state = row.state as {
        parentLocationId?: string | null;
        environment?: { name?: unknown };
      };
      return [
        {
          id: row.locationId,
          parentLocationId: state.parentLocationId ?? null,
          name:
            typeof state.environment?.name === 'string' ? state.environment.name : row.locationId,
        },
      ];
    }),
  ];
  const portalEdges = runtimePortalEdges((aggregate?.locationEdges ?? []) as never);
  const persistedPortalStates = new Map(
    portalStateRows.map((row) => [
      row.portalId,
      { state: row.state, transmission: row.transmission },
    ]),
  );
  const portalStates = new Map(
    portalEdges.map((edge) => [
      edge.id,
      normalizeRuntimePortalState(edge, persistedPortalStates.get(edge.id)),
    ]),
  );

  const playerStateRow = entityStates.find((e) => e.entityId === run.playerEntityId);
  const playerRawLoc = (playerStateRow?.state as { locationId?: string } | undefined)?.locationId;
  const playerCurrentLocationId = playerRawLoc ?? locationId;
  const movementIntent = detectMovementIntent(turn.rawPlayerInput);
  const movementFallback = inferMovementFallback({
    movement: movementIntent,
    rawInput: turn.rawPlayerInput,
    currentLocationId: playerCurrentLocationId,
    locations: runtimeLocations,
    turnId,
  });
  // An explicit movement command removes the player from the prior micro-
  // location before NPC selection, even if the model later omits locationChange.
  const selectionLocationId = movementFallback?.locationId ?? playerCurrentLocationId;

  const scenarioEntities = aggregate?.entities ?? [];
  const normalizedInputForSelection = turn.rawPlayerInput.toLowerCase();
  const remoteMessageIntent = /\b(text|message|dm|sms)\b/.test(normalizedInputForSelection);
  const candidatePool: Array<{
    id: string;
    locationId: string;
    name?: string | undefined;
    publicDescription?: string | undefined;
    privateDescription?: string | undefined;
    history?: string | undefined;
    historicalEvents?: Array<Record<string, unknown>> | undefined;
    personality?: string[] | undefined;
    speechStyle?: string | undefined;
    drives?: string[] | undefined;
    goals?: string[] | undefined;
    fears?: string[] | undefined;
    capabilities?: string[] | undefined;
    limitations?: string[] | undefined;
  }> = [];

  const hasPotentialSpatialContact = (candidateLocationId: string): boolean => {
    if (candidateLocationId === selectionLocationId) return true;
    const transmission = sensoryTransmissionBetween({
      sourceLocationId: selectionLocationId,
      targetLocationId: candidateLocationId,
      portals: portalEdges,
      portalStates,
    });
    return Boolean(transmission && (transmission.sight >= 0.1 || transmission.sound >= 0.08));
  };

  // Add only entities that are co-located or connected through an authored
  // portal. A shared parent building never grants perception by itself.
  for (const entity of scenarioEntities) {
    if (entity.id === run.playerEntityId || !entity.cognitive) continue;
    const st = entityStates.find((e) => e.entityId === entity.id);
    const loc =
      (st?.state as { locationId?: string; active?: boolean } | undefined)?.locationId ??
      entity.startingLocationId;
    const isActive =
      (st?.state as { locationId?: string; active?: boolean } | undefined)?.active ?? entity.active;
    if (isActive && loc && hasPotentialSpatialContact(loc)) {
      candidatePool.push({
        id: entity.id,
        locationId: loc,
        name: entity.name,
        publicDescription: entity.publicDescription,
        privateDescription: entity.privateDescription,
        history: entity.history,
        historicalEvents: entity.historicalEvents,
        personality: entity.personality,
        speechStyle: entity.speechStyle,
        drives: entity.drives,
        goals: entity.goals,
        fears: entity.fears,
        capabilities: entity.capabilities,
        limitations: entity.limitations,
      });
    }
  }

  // Dynamically discovered entities retain their own micro-location rather than
  // inheriting the player location forever.
  for (const st of entityStates) {
    if (st.entityId === run.playerEntityId) continue;
    if (candidatePool.some((c) => c.id === st.entityId)) continue;
    const stateObj = st.state as
      | {
          locationId?: string;
          active?: boolean;
          attributes?: Record<string, unknown>;
        }
      | undefined;
    if (
      stateObj?.active !== false &&
      stateObj?.locationId &&
      hasPotentialSpatialContact(stateObj.locationId)
    ) {
      const attrs = stateObj.attributes ?? {};
      candidatePool.push({
        id: st.entityId,
        locationId: stateObj.locationId,
        name: (attrs.name as string) ?? st.entityId,
        publicDescription: (attrs.description as string) ?? '',
        personality: (attrs.personality as string[]) ?? [],
      });
    }
  }

  // Explicit remote recipients are selected even when spatially distant, but
  // only when the player actually addresses them through a private message.
  if (remoteMessageIntent) {
    for (const entity of scenarioEntities) {
      if (entity.id === run.playerEntityId || !entity.cognitive) continue;
      const aliases = [entity.id, entity.name ?? '']
        .flatMap((name) =>
          name
            .toLowerCase()
            .replace(/[“”"']/g, '')
            .split(/[\s_]+/),
        )
        .filter((part) => part.length > 2);
      if (
        aliases.some((alias) => normalizedInputForSelection.includes(alias)) &&
        !candidatePool.some((candidate) => candidate.id === entity.id)
      ) {
        const state = entityStates.find((row) => row.entityId === entity.id)?.state as
          { locationId?: string } | undefined;
        candidatePool.push({
          id: entity.id,
          locationId: state?.locationId ?? entity.startingLocationId ?? selectionLocationId,
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
        });
      }
    }
  }
  const potentialCandidates = candidatePool.slice(0, 8);

  // Fetch comprehensive turn history up to the last 15 turns
  const previousTurns = await database
    .select({
      turnNumber: turns.turnNumber,
      playerInput: turns.rawPlayerInput,
      narrative: turns.finalNarrative,
    })
    .from(turns)
    .where(eq(turns.runId, runId))
    .orderBy(turns.turnNumber);

  // Extract persistent conversational facts and established memory points
  // Give the LLMs the last 8-10 turns of dialogue so characters remember established facts across the scene
  const relevantTurns = previousTurns.filter((pt) => pt.turnNumber < turn.turnNumber);
  const recentHistory = relevantTurns
    .slice(-8)
    .map(
      (pt) =>
        `Turn ${pt.turnNumber}: Player: "${pt.playerInput}" -> Scene Narrative: "${pt.narrative}"`,
    )
    .join('\n\n');

  // Also extract an established dialogue summary of key facts established in earlier turns (e.g. names, majors, background)
  const earlierFacts = relevantTurns
    .slice(0, -8)
    .map((pt) => `T${pt.turnNumber}: "${pt.playerInput}"`)
    .join(' | ');

  // 3. Deterministic perception eligibility calculation. Candidates are not
  // selected until their portal-aware perception has been proven below.
  const runtimeActors: RuntimeEntityView[] = [
    {
      entityId: run.playerEntityId,
      name: 'Player',
      locationId: selectionLocationId,
      active: true,
      alive: true,
      playable: true,
    },
    ...potentialCandidates.map((candidate) => {
      const state = entityStates.find((row) => row.entityId === candidate.id)?.state as
        { active?: boolean; alive?: boolean } | undefined;
      return {
        entityId: candidate.id,
        name: candidate.name ?? candidate.id,
        locationId: candidate.locationId,
        active: state?.active ?? true,
        alive: state?.alive ?? true,
        playable: false,
      };
    }),
  ];

  const isTextCommunication = remoteMessageIntent;
  const communicationRecipients = isTextCommunication
    ? candidatePool
        .filter((candidate) => {
          const names = [candidate.id, candidate.name ?? '']
            .flatMap((name) =>
              name
                .toLowerCase()
                .replace(/[“”"']/g, '')
                .split(/[\s_]+/),
            )
            .filter((part) => part.length > 2);
          return names.some((name) => normalizedInputForSelection.includes(name));
        })
        .map((candidate) => candidate.id)
    : [];
  const directlyTargeted = candidatePool
    .filter((candidate) => {
      const names = [candidate.id, candidate.name ?? '']
        .flatMap((name) =>
          name
            .toLowerCase()
            .replace(/[“”"']/g, '')
            .split(/[\s_]+/),
        )
        .filter((part) => part.length > 2);
      return names.some((name) => normalizedInputForSelection.includes(name));
    })
    .map((candidate) => candidate.id);
  const actionType: ProvisionalActionSignal['actionType'] = isTextCommunication
    ? 'custom'
    : movementIntent.kind !== 'none'
      ? 'movement'
      : /["“].+["”]|\b(?:say|ask|tell|reply|answer|call)\b/i.test(turn.rawPlayerInput)
        ? 'speech'
        : /\b(?:knock|tap|bang|open|close|pull|push|touch|grab|hold|turn)\b/i.test(
              turn.rawPlayerInput,
            )
          ? 'interaction'
          : 'custom';

  const actionSignal: ProvisionalActionSignal = {
    id: `sig:${turnId}:0`,
    actorEntityId: run.playerEntityId,
    locationId: selectionLocationId,
    actionType,
    rawText: turn.rawPlayerInput,
    targets: directlyTargeted,
    isCommunication: isTextCommunication,
    communicationMedium: isTextCommunication ? 'text_message' : 'spoken',
    communicationRecipients,
  };

  const rawEligiblePerceptions = computeEligiblePerceptions({
    actionSignal,
    actors: runtimeActors,
    playerEntityId: run.playerEntityId,
    portalEdges,
    portalStates,
  });
  const eligibleCandidateIds = new Set(
    rawEligiblePerceptions
      .filter((perception) => perception.observerEntityId !== run.playerEntityId)
      .map((perception) => perception.observerEntityId),
  );
  const candidates = potentialCandidates.filter((candidate) =>
    eligibleCandidateIds.has(candidate.id),
  );
  await recordStageEvent('NPCS_SELECTED', {
    entityIds: candidates.map((entity) => entity.id),
    reasons: candidates.map((entity) => ({
      entityId: entity.id,
      reason: communicationRecipients.includes(entity.id)
        ? 'remote-contact'
        : entity.locationId === selectionLocationId
          ? 'co-located'
          : 'portal-perception',
    })),
  });

  // Maintain a subjective alias per observer/actor pair. An observer starts with a
  // descriptive reference and only resolves it to a real name after hearing/reading
  // an explicit introduction, having an existing scenario relationship, or otherwise
  // receiving identity evidence.
  const actorMeta = new Map<string, { name: string; pronouns?: string | undefined }>([
    [run.playerEntityId, { name: 'Alex', pronouns: 'he/him' }],
    ...scenarioEntities.map(
      (entity) =>
        [entity.id, { name: entity.name ?? entity.id, pronouns: entity.pronouns }] as const,
    ),
  ]);
  const scenarioRelationships = (aggregate.relationships ?? []) as Array<{
    sourceEntityId?: string;
    targetEntityId?: string;
  }>;
  const subjectivePerceptions = [] as typeof rawEligiblePerceptions;
  for (const perception of rawEligiblePerceptions) {
    const actor = actorMeta.get(perception.actorEntityId);
    const canonicalName = actor?.name ?? perception.actorEntityId;
    const explicitNameRevealed =
      perception.modality === 'sound' &&
      new RegExp(`\\b${canonicalName.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}\\b`, 'i').test(
        turn.rawPlayerInput,
      );
    const [existingAlias] = await database
      .select()
      .from(entityAliases)
      .where(
        and(
          eq(entityAliases.runId, runId),
          eq(entityAliases.branchId, turn.branchId),
          eq(entityAliases.ownerEntityId, perception.observerEntityId),
          eq(entityAliases.subjectEntityId, perception.actorEntityId),
        ),
      )
      .limit(1);

    const hasPriorRelationship =
      perception.actorEntityId === perception.observerEntityId ||
      scenarioRelationships.some(
        (rel) =>
          (rel.sourceEntityId === perception.observerEntityId &&
            rel.targetEntityId === perception.actorEntityId) ||
          (rel.targetEntityId === perception.observerEntityId &&
            rel.sourceEntityId === perception.actorEntityId),
      );

    const isIdentityKnown = Boolean(
      hasPriorRelationship || explicitNameRevealed || existingAlias?.identityKnown,
    );

    const defaultAlias =
      perception.actorEntityId === perception.observerEntityId
        ? 'you'
        : actor?.pronouns === 'he/him'
          ? 'a young man'
          : actor?.pronouns === 'she/her'
            ? 'a young woman'
            : 'someone nearby';

    const alias = isIdentityKnown
      ? perception.actorEntityId === perception.observerEntityId
        ? 'you'
        : canonicalName
      : (existingAlias?.alias ?? defaultAlias);

    await database
      .insert(entityAliases)
      .values({
        runId,
        branchId: turn.branchId,
        ownerEntityId: perception.observerEntityId,
        subjectEntityId: perception.actorEntityId,
        alias,
        identityKnown: isIdentityKnown,
        confidence: isIdentityKnown ? 1 : 0.35,
        sourceEvidenceIds: [
          `${perception.sourceSignalId}:${perception.observerEntityId}:${perception.modality}`,
        ],
        firstLearnedTurn: existingAlias?.firstLearnedTurn ?? turn.turnNumber,
        lastUpdatedTurn: turn.turnNumber,
        attribution: { source: 'system', sourceIds: [turnId] },
      })
      .onConflictDoUpdate({
        target: [
          entityAliases.runId,
          entityAliases.branchId,
          entityAliases.ownerEntityId,
          entityAliases.subjectEntityId,
        ],
        set: {
          alias,
          identityKnown: isIdentityKnown,
          confidence: isIdentityKnown ? 1 : (existingAlias?.confidence ?? 0.35),
          lastUpdatedTurn: turn.turnNumber,
          updatedAt: new Date(),
        },
      });

    const actorPhrase =
      perception.modality === 'remote_message'
        ? `${alias} sent you a private message: ${perception.perceivedEnvelope}`
        : perception.modality === 'sound'
          ? `${alias} said: "${perception.perceivedEnvelope}"`
          : `${alias}: ${perception.perceivedEnvelope}`;
    subjectivePerceptions.push({
      ...perception,
      subjectiveActorReference: alias,
      actorIdentityKnown: isIdentityKnown,
      perceivedEnvelope: actorPhrase,
    });
  }
  const eligiblePerceptions = subjectivePerceptions;

  // Persist a durable fan-out plan before any provider call.
  await database
    .insert(turnStageResults)
    .values({
      id: `${turnId}:npc-fanout-plan`,
      turnId,
      stage: 'NPC_FANOUT_PLANNED',
      inputSnapshot: {
        playerActionSignalId: actionSignal.id,
        contextPolicyVersion: 1,
      },
      validatedOutput: {
        principals: candidates.map((candidate) => ({
          entityId: candidate.id,
          selectionReason: communicationRecipients.includes(candidate.id)
            ? 'remote-contact'
            : directlyTargeted.includes(candidate.id)
              ? 'targeted'
              : 'present',
          evidenceIds: eligiblePerceptions
            .filter((perception) => perception.observerEntityId === candidate.id)
            .map(
              (perception) =>
                `${perception.sourceSignalId}:${perception.observerEntityId}:${perception.modality}`,
            ),
        })),
      },
      applicationKey: `${turnId}:npc-fanout-plan:v1`,
      status: 'applied',
      attribution: { source: 'system', sourceIds: [turnId] },
    })
    .onConflictDoNothing();

  if (candidates.length) {
    await database
      .insert(turnStageResults)
      .values(
        candidates.map((candidate) => ({
          id: `${turnId}:npc:${candidate.id}`,
          turnId,
          stage: 'NPC_DECISION',
          inputSnapshot: {
            principalEntityId: candidate.id,
            selectionReason: communicationRecipients.includes(candidate.id)
              ? 'remote-contact'
              : directlyTargeted.includes(candidate.id)
                ? 'targeted'
                : 'present',
            contextPolicyVersion: 1,
          },
          validatedOutput: null,
          applicationKey: `${turnId}:npc:${candidate.id}:v1`,
          status: 'pending',
          attribution: { source: 'system', sourceIds: [candidate.id] },
        })),
      )
      .onConflictDoNothing();
  }

  await database
    .update(turns)
    .set({ stage: 'NPC_DECISIONS_PENDING', updatedAt: new Date() })
    .where(eq(turns.id, turnId));
  await updateJob('running', 'NPC_DECISIONS_PENDING');

  // Per-principal context service initialization
  const npcContextRepo = new NpcContextRepository(database);
  const npcContextService = new NpcContextService(npcContextRepo, new KnowledgePolicy());

  // Execute isolated per-principal NPC cognition concurrently.
  const npcDecisionsList: z.infer<typeof npcPrincipalDecisionSchema>[] = [];
  let totalNpcInputTokens = 0;
  let totalNpcOutputTokens = 0;
  let turnResultUsage: { inputTokens?: number; outputTokens?: number } | undefined;

  if (candidates.length) {
    // Fan-out concurrent model calls per principal
    const results = await Promise.all(
      candidates.map(async (candidate, candidateIndex) => {
        // Resume from a durable terminal principal stage after process restart.
        const [existingPrincipalStage] = await database
          .select({
            status: turnStageResults.status,
            validatedOutput: turnStageResults.validatedOutput,
          })
          .from(turnStageResults)
          .where(eq(turnStageResults.id, `${turnId}:npc:${candidate.id}`))
          .limit(1);
        if (
          existingPrincipalStage &&
          ['applied', 'safe_no_action'].includes(existingPrincipalStage.status) &&
          existingPrincipalStage.validatedOutput
        ) {
          const resumed = npcPrincipalDecisionSchema.parse(existingPrincipalStage.validatedOutput);
          return {
            decision: resumed,
            usage: { inputTokens: 0, outputTokens: 0 },
          };
        }

        // Stagger starts while retaining concurrent execution to respect provider credential cooldowns.
        if (candidateIndex > 0) {
          await new Promise((resolve) => setTimeout(resolve, candidateIndex * 650));
        }
        const startTime = Date.now();
        try {
          const authContext = await npcContextService.build({
            runId,
            branchId: turn.branchId,
            turnId,
            turnNumber: turn.turnNumber,
            entityId: candidate.id,
            worldTime: run.worldTime
              ? new Date(run.worldTime).toISOString()
              : new Date().toISOString(),
            selfMeta: {
              ...candidate,
              name: candidate.name || candidate.id,
            },
            newPerceptions: eligiblePerceptions,
          });

          const contextJson = JSON.stringify(authContext);

          let generatedNpc:
            GenerationResult<z.infer<typeof npcPrincipalDecisionSchema>> | undefined;
          let lastGenerationError: unknown;
          for (let principalAttempt = 0; principalAttempt < 3; principalAttempt += 1) {
            try {
              generatedNpc = await provider.generateObject({
                model: activeModel,
                system:
                  `You simulate the cognition, private thoughts, and reaction of ONE specific NPC in an interactive narrative roleplay game.\n` +
                  `You are simulating: ${candidate.name ?? candidate.id} (ID: ${candidate.id}).\n\n` +
                  `# NATURALISTIC CHARACTER DIALOGUE GUIDELINES\n` +
                  `1. STABLE IDENTITY: Embody ${candidate.name}'s specific temperament, values, insecurities, speech style, and habits naturally.\n` +
                  `2. LOCAL PERSPECTIVE: You know ONLY what is in your private observations, memories, and beliefs. No mind reading, no knowing unwitnessed events.\n` +
                  `3. EPISTEMIC PRIVACY: If the player is on their phone, you CANNOT read their screen unless shown directly to you.\n` +
                  `4. You control ONLY ${candidate.id}. Never decide, think, or act for any other character or the player.\n` +
                  `5. Return a JSON object for ${candidate.id} with keys: entityId, attention, reaction, speech, attemptedActions, generatedThoughts, beliefProposals, goalUpdates, perceivedEvidenceIds.\n` +
                  `You MUST generate at least 1 private thought in "generatedThoughts": [{"text": "<their inner monologue>", "persistence": "ephemeral", "salience": 0.8, "urgency": 0.5}].`,
                input: contextJson,
                schemaName: 'NpcPrincipalDecision',
                schema: { type: 'object' },
                outputTokenLimit: 1_200,
                signal,
                parse: (value: any) => {
                  const d = value?.decision || value?.decisions?.[0] || value || {};
                  const speech =
                    typeof d.speech === 'string'
                      ? d.speech
                      : typeof d.dialogue === 'string'
                        ? d.dialogue
                        : '';
                  let thoughts: any[] = [];
                  if (Array.isArray(d.generatedThoughts)) {
                    thoughts = d.generatedThoughts.map((t: any) =>
                      typeof t === 'string'
                        ? { text: t, persistence: 'ephemeral', salience: 0.8, urgency: 0.5 }
                        : {
                            text: String(t?.text ?? t?.thought ?? ''),
                            persistence: t?.persistence ?? 'ephemeral',
                            salience: Number(t?.salience ?? 0.8),
                            urgency: Number(t?.urgency ?? 0.5),
                          },
                    );
                  } else if (
                    typeof d.generatedThoughts === 'string' &&
                    d.generatedThoughts.trim()
                  ) {
                    thoughts = [
                      {
                        text: d.generatedThoughts,
                        persistence: 'ephemeral',
                        salience: 0.8,
                        urgency: 0.5,
                      },
                    ];
                  } else if (d.thought || d.innerMonologue) {
                    thoughts = [
                      {
                        text: String(d.thought || d.innerMonologue),
                        persistence: 'ephemeral',
                        salience: 0.8,
                        urgency: 0.5,
                      },
                    ];
                  }

                  if (thoughts.length === 0) {
                    thoughts = [
                      {
                        text: 'Observing the situation carefully.',
                        persistence: 'ephemeral',
                        salience: 0.8,
                        urgency: 0.5,
                      },
                    ];
                  }

                  const rawActions = Array.isArray(d.attemptedActions) ? d.attemptedActions : [];
                  const attemptedActions = rawActions.map((act: any, actIdx: number) => {
                    const intent =
                      typeof act === 'string'
                        ? act
                        : String(act?.intent ?? act?.description ?? 'responds');
                    const rawType = act?.actionType ?? act?.type;
                    const actionType = [
                      'speech',
                      'movement',
                      'interaction',
                      'attack',
                      'wait',
                      'observation',
                      'custom',
                    ].includes(rawType)
                      ? rawType
                      : 'interaction';
                    return {
                      id: String(act?.id || `action_${turnId}_${candidate.id}_${actIdx}`),
                      turnId,
                      actorEntityId: candidate.id,
                      actionType,
                      targets: Array.isArray(act?.targets) ? act.targets : [],
                      intent,
                      assumedPreconditions: Array.isArray(act?.assumedPreconditions)
                        ? act.assumedPreconditions
                        : [],
                      visibility: 'scene_observable',
                      source: 'npc' as const,
                    };
                  });

                  return validateNpcPrincipalDecision(
                    {
                      entityId: candidate.id,
                      attention: ['unaware', 'noticed', 'focused'].includes(d.attention)
                        ? d.attention
                        : 'noticed',
                      reaction: ['none', 'think_only', 'speak', 'act', 'speak_and_act'].includes(
                        d.reaction,
                      )
                        ? d.reaction
                        : speech
                          ? 'speak'
                          : 'noticed',
                      speech,
                      attemptedActions,
                      generatedThoughts: thoughts,
                      beliefProposals: Array.isArray(d.beliefProposals) ? d.beliefProposals : [],
                      goalUpdates: Array.isArray(d.goalUpdates) ? d.goalUpdates : [],
                      perceivedEvidenceIds: Array.isArray(d.perceivedEvidenceIds)
                        ? d.perceivedEvidenceIds
                        : [],
                    },
                    {
                      principalEntityId: candidate.id,
                      selectedPlayerEntityId: run.playerEntityId,
                      authorizedEvidenceIds: new Set(authContext.authorizedSourceIds),
                    },
                  );
                },
              });
              break;
            } catch (generationError) {
              lastGenerationError = generationError;
              if (principalAttempt >= 2) throw generationError;
              await new Promise((resolve) =>
                setTimeout(resolve, (candidateIndex + 1) * 900 * 2 ** principalAttempt),
              );
            }
          }
          if (!generatedNpc) throw lastGenerationError ?? new Error('NPC generation failed');

          // Record individual principal AI invocation audit for telemetry
          try {
            await database
              .insert(aiInvocations)
              .values({
                id: `inv:${turnId}:npc_${candidate.id}`,
                role: `npc_simulator:${candidate.id}`,
                stage: 'NPC_DECISIONS',
                principalKind: 'NPC',
                principalEntityId: candidate.id,
                provider: environment.GENERATION_PROVIDER,
                modelId: activeModel,
                promptVersionId: 'v2.0',
                contextPolicyVersion: 1,
                authorizedDocumentIds: authContext.authorizedSourceIds,
                usage: {
                  inputTokens: generatedNpc.usage?.inputTokens ?? 0,
                  outputTokens: generatedNpc.usage?.outputTokens ?? 0,
                },
                inputHash: authContext.inputHash,
                inputSnapshot: authContext,
                outputSummary: generatedNpc.value,
                validation: {
                  inputPayload: contextJson,
                  principalMatched: true,
                },
                latencyMs: Date.now() - startTime,
                retryCount: 0,
                correlationId: turnId,
                attribution: { source: 'system', sourceIds: [turnId] },
              })
              .onConflictDoNothing();
          } catch {
            // ignore audit insert error
          }

          await database
            .update(turnStageResults)
            .set({
              status: 'applied',
              validatedOutput: generatedNpc.value,
              providerResultRef: { invocationId: `inv:${turnId}:npc_${candidate.id}` },
              updatedAt: new Date(),
            })
            .where(eq(turnStageResults.id, `${turnId}:npc:${candidate.id}`));

          return {
            decision: generatedNpc.value,
            usage: generatedNpc.usage,
          };
        } catch (err) {
          console.error(`[npc-fanout] Error executing cognition for ${candidate.id}:`, err);
          const safeDecision = {
            entityId: candidate.id,
            attention: 'noticed' as const,
            reaction: 'none' as const,
            speech: '',
            attemptedActions: [],
            generatedThoughts: [
              {
                text: 'Remaining quiet and watching.',
                persistence: 'ephemeral' as const,
                salience: 0.5,
                urgency: 0.3,
              },
            ],
            beliefProposals: [],
            goalUpdates: [],
            perceivedEvidenceIds: [],
          };
          try {
            await database
              .insert(aiInvocations)
              .values({
                id: `inv:${turnId}:npc_${candidate.id}:failed`,
                role: `npc_simulator:${candidate.id}`,
                stage: 'NPC_DECISIONS',
                principalKind: 'NPC',
                principalEntityId: candidate.id,
                provider: environment.GENERATION_PROVIDER,
                modelId: activeModel,
                promptVersionId: 'v2.0',
                contextPolicyVersion: 1,
                authorizedDocumentIds: [],
                usage: { inputTokens: 0, outputTokens: 0 },
                inputSnapshot: {},
                outputSummary: safeDecision,
                validation: {
                  principalMatched: true,
                  safeFallback: true,
                  error: err instanceof Error ? err.message : String(err),
                },
                latencyMs: Date.now() - startTime,
                retryCount: 1,
                correlationId: turnId,
                attribution: { source: 'system', sourceIds: [turnId] },
              })
              .onConflictDoNothing();
          } catch {
            // ignore audit insert error
          }
          await database
            .update(turnStageResults)
            .set({
              status: 'safe_no_action',
              validatedOutput: safeDecision,
              retries: 1,
              updatedAt: new Date(),
            })
            .where(eq(turnStageResults.id, `${turnId}:npc:${candidate.id}`));
          return {
            decision: safeDecision,
            usage: { inputTokens: 0, outputTokens: 0 },
          };
        }
      }),
    );

    for (const res of results) {
      if (res?.decision) {
        npcDecisionsList.push(res.decision);
        totalNpcInputTokens += res.usage?.inputTokens ?? 0;
        totalNpcOutputTokens += res.usage?.outputTokens ?? 0;
      }
    }
  }

  const npcDecisions = { decisions: npcDecisionsList };
  for (const decision of npcDecisions.decisions) {
    if (decision.entityId === run.playerEntityId)
      throw new Error('NPC decision attempted to control player entity');
    if (!candidates.some((candidate) => candidate.id === decision.entityId))
      throw new Error('NPC decision returned an unselected entity');
    for (const action of decision.attemptedActions)
      await database
        .insert(actions)
        .values({
          id: action.id || `action:${turnId}:npc:${decision.entityId}`,
          turnId,
          actorEntityId: decision.entityId,
          actionType: action.actionType,
          targets: action.targets,
          intent: action.intent,
          assumptions: action.assumedPreconditions,
          visibility: action.visibility,
          source: 'npc',
          attribution: { source: 'system', sourceIds: [turnId] },
        })
        .onConflictDoNothing();
    for (const [index, thought] of decision.generatedThoughts.entries())
      await database
        .insert(innerThoughts)
        .values({
          id: `thought:${turnId}:${decision.entityId}:${index}`,
          runId,
          branchId: turn.branchId,
          ownerEntityId: decision.entityId,
          turnId,
          text: thought.text,
          persistence: thought.persistence,
          salience: thought.salience,
          urgency: thought.urgency,
          emotionalValence: 0,
          emotionalIntensity: 0,
          decayRate: 0,
          reinforcementCount: 0,
          status: 'active',
          playerInspectable: true,
          visibility: 'entity_private',
          attribution: { source: 'system', sourceIds: decision.perceivedEvidenceIds },
        })
        .onConflictDoNothing();
    for (const proposal of decision.beliefProposals) {
      const parsed = beliefSchema.safeParse(proposal);
      if (parsed.success && parsed.data.ownerEntityId === decision.entityId)
        await persistNpcBeliefs(database, {
          runId,
          branchId: turn.branchId,
          ownerEntityId: decision.entityId,
          turn: turn.turnNumber,
          beliefs: [parsed.data],
        });
    }
    for (const update of decision.goalUpdates) {
      const goals = update.goals;
      if (Array.isArray(goals) && goals.every((goal): goal is string => typeof goal === 'string')) {
        try {
          await applyNpcGoals(database, {
            runId,
            branchId: turn.branchId,
            entityId: decision.entityId,
            expectedVersion: 1,
            goals,
          });
        } catch {
          /* stale goal projections are rejected without affecting canon */
        }
      }
    }
  }
  await recordStageEvent('NPC_DECISIONS_GENERATED', {
    decisions: npcDecisions.decisions.map((decision) => ({
      entityId: decision.entityId,
      attention: decision.attention,
      reaction: decision.reaction,
    })),
  });
  const maxWords = environment.GENERATION_MAX_RESPONSE_LENGTH ?? 150;
  let result: z.infer<typeof outputSchema>;
  try {
    const startResolverTime = Date.now();
    const resolverInputJson = JSON.stringify({
      scenarioStyle:
        aggregate?.scenario?.defaultNarrationStyle ?? 'immersive second-person narrative drama',
      currentLocation: selectionLocationId,
      priorLocation: playerCurrentLocationId,
      deterministicMovementFallback: movementFallback ?? null,
      knownLocations: runtimeLocations,
      nearbyPortals: portalEdges
        .filter(
          (edge) =>
            edge.sourceLocationId === selectionLocationId ||
            edge.destinationLocationId === selectionLocationId,
        )
        .map((edge) => ({
          portalId: edge.id,
          name: edge.portal.name,
          sourceLocationId: edge.sourceLocationId,
          destinationLocationId: edge.destinationLocationId,
          state: portalStates.get(edge.id)?.state ?? edge.portal.defaultState,
          transmission:
            portalStates.get(edge.id)?.transmission ??
            edge.portal.transmission[edge.portal.defaultState],
        })),
      establishedConversationFacts: earlierFacts || 'None',
      recentHistory,
      playerAction: turn.rawPlayerInput,
      currentTime: run.worldTime
        ? new Date(run.worldTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        : '04:00 PM',
      targetMaxWords: maxWords,
      npcReactions: npcDecisions.decisions.map((d) => ({
        entityId: d.entityId,
        reaction: d.reaction,
        speech: d.speech,
        actions: d.attemptedActions,
      })),
    });
    const generated = await provider.generateObject({
      model: activeModel,
      system:
        'You are the lead narrative storyteller and world resolver in an interactive fiction game. Resolve the scene with rich, reactive drama.\n\n' +
        '# NATURALISTIC CHARACTER DIALOGUE & RESOLUTION GUIDELINES\n' +
        'Simulate people who happen to exist inside a story, not polished screenplay actors or self-narrating therapists.\n' +
        'The goal is to make each character sound like a particular person speaking spontaneously in a particular moment.\n\n' +
        '1. NATURAL DIALOGUE & SUBTEXT:\n' +
        '   - Dialogue must feel spontaneous and imperfect. Characters answer one part of a question, avoid answering, say something mundane or slightly awkward, or use silence.\n' +
        '   - Subtext: What people feel, what they want, and what they say are rarely identical. Avoid explaining subtext in the narrative—trust the player to notice it.\n' +
        '   - Do NOT turn emotional tension into instant confessions, therapy sessions, or profound relationship reconciliations. Characters have defense mechanisms, pride, and biases.\n' +
        '   - Humor & Banter: Do not treat exchanges as setup -> punchline -> witty comeback competitions. Genuine conversations are often unpolished.\n\n' +
        '2. SPEECH IS NOT EXPOSITION:\n' +
        '   - Characters talk to each other, not an audience. They do not restate what they already know or recite their character descriptions.\n' +
        '   - Avoid surrounding every line of dialogue with descriptions of eyes, breathing, heartbeats, smirks, or tiny hand twitches. Let spoken words breathe.\n\n' +
        '3. EPISTEMIC PRIVACY & OBSERVATIONS:\n' +
        '   - Physical privacy is strictly enforced: When the player texts or uses their phone, other people in the room CANNOT see the screen or know what is being texted unless the player shows them or reads it aloud.\n\n' +
        '4. SPATIAL CANON, LOCATION & TIME ADVANCEMENT:\n' +
        '   - `currentLocation` and `npcReactions` are authoritative for this turn. Only NPCs supplied in npcReactions may speak, act, or be physically present; never teleport a named NPC into the scene.\n' +
        '   - If the player explicitly moves or leaves, emit `locationChange`. Treat a movement fallback in the input as already moving the player out of their previous micro-location.\n' +
        '   - A shared parent building is not co-location. Closed or locked portals block sight and may muffle sound. Do not narrate an NPC behind a closed door as visually observing an action outside.\n' +
        '   - Use `portalChanges` only for supplied nearby portal IDs and only when an on-scene action changes the boundary.\n' +
        '   - If a genuinely new character appears behind a distinct door or barrier, include a distinct `locationId` and `spatialRelation: "adjacent"`; never silently place them in the player micro-location. Never duplicate existing characters.\n' +
        "   - DETERMINISTIC TIME ELAPSED: Set `timeElapsedMinutes` to an integer reflecting the realistic duration of this turn's actions (e.g. quick reply: 1-2 min; short conversation: 3-5 min; walking across a district: 8-15 min; waiting for work: 20-60 min).\n\n" +
        `5. LENGTH & PACING: Keep the narrative focused and natural, approximately ${maxWords} words maximum. Deliver grounded, human interactions without theatrical melodrama.\n\n` +
        '6. Format: {"narrative": string, "eventDescription": string, "timeElapsedMinutes": number, "locationChange": {"locationId": string, "locationName": string, "parentLocationId": string} | null, "discoveredNpcs": [{"name": string, "description": string, "personality": string[], "locationId": string, "spatialRelation": "same_location" | "adjacent" | "distant"}], "portalChanges": [{"portalId": string, "state": "open" | "ajar" | "closed" | "locked" | "barred"}], "patches": []}',
      input: resolverInputJson,
      schemaName: 'TurnResult',
      schema: { type: 'object' },
      signal,
      outputTokenLimit: Math.min(1500, Math.max(300, maxWords * 4)),
      parse: (value: any) => {
        const narrative =
          typeof value?.narrative === 'string' ? value.narrative : 'The scene continues.';
        const eventDescription =
          typeof value?.eventDescription === 'string' ? value.eventDescription : narrative;
        const patches = Array.isArray(value?.patches) ? value.patches : [];
        const locationChange =
          value?.locationChange && typeof value.locationChange === 'object'
            ? value.locationChange
            : undefined;
        const discoveredNpcs = Array.isArray(value?.discoveredNpcs) ? value.discoveredNpcs : [];
        const portalChanges = Array.isArray(value?.portalChanges) ? value.portalChanges : [];
        const rawMinutes = Number(value?.timeElapsedMinutes);
        const timeElapsedMinutes =
          Number.isFinite(rawMinutes) && rawMinutes >= 0
            ? Math.min(1440, Math.floor(rawMinutes))
            : 2;
        return outputSchema.parse({
          narrative,
          eventDescription,
          timeElapsedMinutes,
          locationChange,
          discoveredNpcs,
          portalChanges,
          patches,
        });
      },
    });
    result = generated.value;
    turnResultUsage = generated.usage;

    // Record AI invocation audit for resolver
    try {
      await database
        .insert(aiInvocations)
        .values({
          id: `inv:${turnId}:turn_result`,
          role: 'world_resolver',
          stage: 'ACTIONS_RESOLVED',
          provider: environment.GENERATION_PROVIDER,
          modelId: activeModel,
          promptVersionId: 'v1.0',
          authorizedDocumentIds: [run.playerEntityId],
          usage: {
            inputTokens: generated.usage?.inputTokens ?? 0,
            outputTokens: generated.usage?.outputTokens ?? 0,
          },
          latencyMs: Date.now() - startResolverTime,
          validation: { inputPayload: resolverInputJson },
          retryCount: 0,
          correlationId: turnId,
          attribution: { source: 'system', sourceIds: [turnId] },
        })
        .onConflictDoNothing();
    } catch {
      // ignore audit insert error
    }
  } catch (error) {
    await database
      .update(turns)
      .set({
        status: 'retryable_failure',
        stage: 'RETRYABLE_FAILURE',
        failure: {
          code: 'provider_failure',
          message: error instanceof Error ? error.message : 'Provider failure',
          retryable: true,
        },
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(turns.id, turnId));
    await updateJob('retryable_failure', 'RETRYABLE_FAILURE', { code: 'provider_failure' });
    return;
  }
  await recordStageEvent('ACTIONS_RESOLVED', { attemptedActionId: `action:${turnId}:player:0` });
  await recordStage('ACTIONS_RESOLVED', { providerEvent: true });
  for (const patch of result.patches)
    validateCanonicalPatch(
      patch,
      { minStat: -100, maxStat: 100 },
      {
        actorPresent: true,
        knownEntityIds: new Set(aggregate?.entities?.map((item) => item.id) ?? []),
        knownLocationIds: new Set(aggregate?.locations?.map((item) => item.id) ?? []),
        knownStoryCardIds: new Set(aggregate?.storyCards?.map((item) => item.id) ?? []),
      },
    );
  const [latestTurn] = await database
    .select({ status: turns.status, cancellationRequested: turns.cancellationRequested })
    .from(turns)
    .where(eq(turns.id, turnId))
    .limit(1);
  if (latestTurn?.status === 'cancelled' || latestTurn?.cancellationRequested) {
    await updateJob('cancelled', 'CANCELLED');
    return;
  }
  // Use the rich resolved narrative if provided; only run a separate narration pass if narrative is empty
  if (!result.narrative || result.narrative.trim().length === 0) {
    try {
      const narrated = await provider.generateObject({
        model: activeModel,
        system:
          'You are the player-limited narrator. Describe the scene vividly based on the event description. Never reveal NPC private thoughts or provider reasoning.',
        input: JSON.stringify({
          style:
            aggregate?.scenario?.defaultNarrationStyle ?? 'immersive second-person narrative drama',
          playerObservation: result.eventDescription,
        }),
        schemaName: 'NarrationResult',
        schema: responseJsonSchema,
        outputTokenLimit: 1_200,
        signal,
        parse: (value) => outputSchema.parse(value),
      });
      result = { ...result, narrative: narrated.value.narrative };
    } catch (error) {
      await database
        .update(turns)
        .set({
          status: 'retryable_failure',
          stage: 'RETRYABLE_FAILURE',
          failure: {
            code: 'narrator_failure',
            message: error instanceof Error ? error.message : 'Narrator failure',
            retryable: true,
          },
          endedAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(turns.id, turnId));
      await updateJob('retryable_failure', 'RETRYABLE_FAILURE', { code: 'narrator_failure' });
      return;
    }
  }
  // Apply resolver changes only after deterministic movement and portal validation.
  const normalizeLocationId = (value: string) =>
    value
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 120);
  const resolverLocationId = result.locationChange?.locationId
    ? normalizeLocationId(result.locationChange.locationId)
    : undefined;
  const useMovementFallback = Boolean(
    movementFallback && (!resolverLocationId || resolverLocationId === playerCurrentLocationId),
  );
  const newLocationId = useMovementFallback ? movementFallback?.locationId : resolverLocationId;
  const targetLoc = newLocationId ?? selectionLocationId;
  const targetLocationParentId = useMovementFallback
    ? movementFallback?.parentLocationId
    : result.locationChange?.parentLocationId
      ? normalizeLocationId(result.locationChange.parentLocationId)
      : (runtimeLocations.find((location) => location.id === targetLoc)?.parentLocationId ??
        runtimeLocations.find((location) => location.id === playerCurrentLocationId)
          ?.parentLocationId);
  const validPortalChanges = result.portalChanges.flatMap((change) => {
    const edge = portalEdges.find((portal) => portal.id === change.portalId);
    if (!edge) return [];
    const canReachPortal = [playerCurrentLocationId, selectionLocationId, targetLoc].some(
      (location) => location === edge.sourceLocationId || location === edge.destinationLocationId,
    );
    if (!canReachPortal) return [];
    return [
      {
        portalId: edge.id,
        state: change.state,
        runtime: runtimePortalStateFor(edge, change.state),
      },
    ];
  });

  await database.transaction(async (tx) => {
    // 1. Persist portal changes before updating character positions. The state
    // is immutable per branch/turn unless a later canonical action changes it.
    for (const change of validPortalChanges)
      await tx
        .insert(runPortalState)
        .values({
          runId,
          branchId: turn.branchId,
          portalId: change.portalId,
          state: change.state,
          transmission: change.runtime.transmission,
          version: 1,
          attribution: { source: 'resolver', sourceIds: [turnId] },
        })
        .onConflictDoUpdate({
          target: [runPortalState.runId, runPortalState.branchId, runPortalState.portalId],
          set: {
            state: change.state,
            transmission: change.runtime.transmission,
            version: sql`${runPortalState.version} + 1`,
            updatedAt: new Date(),
          },
        });

    // 2. Explicit movement always updates canonical player position. When the
    // resolver omitted it, `movementFallback` has already separated the player
    // from their previous micro-location before NPC selection.
    if (newLocationId && newLocationId !== playerCurrentLocationId) {
      await tx
        .insert(runLocationState)
        .values({
          runId,
          branchId: turn.branchId,
          locationId: newLocationId,
          state: {
            environment: {
              name:
                result.locationChange?.locationName ??
                movementFallback?.locationName ??
                newLocationId,
            },
            hazards: [],
            blocked: false,
            parentLocationId: targetLocationParentId ?? null,
            spatialKind: useMovementFallback ? movementFallback?.spatialKind : 'dynamic',
          },
          version: 1,
          attribution: { source: 'resolver', sourceIds: [turnId] },
        })
        .onConflictDoNothing();

      await tx
        .update(runEntityState)
        .set({
          state: {
            ...((playerStateRow?.state as Record<string, unknown>) ?? {}),
            locationId: newLocationId,
          },
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(runEntityState.runId, runId),
            eq(runEntityState.branchId, turn.branchId),
            eq(runEntityState.entityId, run.playerEntityId),
          ),
        );
    }

    // 3. New NPCs cannot silently inherit player co-location when the resolver
    // describes them beyond a door, window, or other adjacent micro-location.
    const existingEntityIds = new Set([
      run.playerEntityId,
      ...(aggregate?.entities?.map((e) => e.id.toLowerCase()) ?? []),
      ...(aggregate?.entities?.map((e) =>
        (e.name ?? '').toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      ) ?? []),
      ...entityStates.map((e) => e.entityId.toLowerCase()),
    ]);

    for (const newNpc of result.discoveredNpcs) {
      const cleanName = (newNpc.name || '').trim();
      const npcEntityId = normalizeLocationId(cleanName);
      const matchesExisting = Array.from(existingEntityIds).some(
        (id) => id === npcEntityId || id.startsWith(npcEntityId) || npcEntityId.startsWith(id),
      );
      if (!npcEntityId || matchesExisting) continue;

      existingEntityIds.add(npcEntityId);
      const requestedLocationId = newNpc.locationId
        ? normalizeLocationId(newNpc.locationId)
        : undefined;
      const npcLocationId =
        requestedLocationId ??
        (newNpc.spatialRelation === 'adjacent'
          ? `${targetLoc}_adjacent_${npcEntityId}`.slice(0, 120)
          : targetLoc);
      if (npcLocationId !== targetLoc)
        await tx
          .insert(runLocationState)
          .values({
            runId,
            branchId: turn.branchId,
            locationId: npcLocationId,
            state: {
              environment: { name: newNpc.locationName ?? npcLocationId },
              hazards: [],
              blocked: false,
              parentLocationId: targetLoc,
              spatialKind: 'dynamic',
            },
            version: 1,
            attribution: { source: 'resolver', sourceIds: [turnId] },
          })
          .onConflictDoNothing();

      await tx
        .insert(runEntityState)
        .values({
          runId,
          branchId: turn.branchId,
          entityId: npcEntityId,
          state: {
            locationId: npcLocationId,
            active: true,
            alive: true,
            attributes: {
              name: newNpc.name,
              description: newNpc.description ?? '',
              personality: newNpc.personality ?? [],
            },
          },
          version: 1,
          attribution: { source: 'resolver', sourceIds: [turnId] },
        })
        .onConflictDoNothing();
    }
  });

  const eventId = `event:${turnId}:0`;
  const segmentId = `segment:${turnId}:narration:v1:0`;
  const eventLocationId = targetLoc;
  await database.transaction(async (tx) => {
    if (isTextCommunication && communicationRecipients.length > 0) {
      await tx
        .insert(communications)
        .values({
          id: `communication:${turnId}:0`,
          runId,
          branchId: turn.branchId,
          turnId,
          senderEntityId: run.playerEntityId,
          recipientEntityIds: communicationRecipients,
          medium: 'text_message',
          body: turn.rawPlayerInput,
          observableEnvelope: `${run.playerEntityId} used their phone.`,
          delivered: true,
          worldTime: run.worldTime,
          attribution: { source: 'player', sourceIds: [turnId] },
        })
        .onConflictDoNothing();
    }
    await tx
      .update(turns)
      .set({ stage: 'EVENTS_COMMITTED', updatedAt: new Date() })
      .where(eq(turns.id, turnId));
    await tx
      .insert(turnStageResults)
      .values({
        id: `${turnId}:resolution`,
        turnId,
        stage: 'EVENTS_COMMITTED',
        inputSnapshot: { runId, branchId: turn.branchId },
        validatedOutput: {
          eventIds: [eventId],
          locationId: targetLoc,
          portalChanges: validPortalChanges.map((change) => ({
            portalId: change.portalId,
            state: change.state,
          })),
        },
        applicationKey: `${turnId}:resolution:v1`,
        status: 'applied',
        attribution: { source: 'resolver', sourceIds: [turnId] },
      })
      .onConflictDoNothing();
    await tx
      .insert(events)
      .values({
        id: eventId,
        runId,
        branchId: turn.branchId,
        turnId,
        eventType: 'player_attempt',
        locationId: eventLocationId,
        worldTime: run.worldTime,
        canonicalDescription: result.eventDescription,
        visibilityHints: ['scene_observable'],
        salience: 0,
        emotionalWeight: 0,
        attribution: { source: 'resolver', sourceIds: [turnId] },
      })
      .onConflictDoNothing();
    // Record distinct, modality-specific observations derived from canonical events
    await tx
      .insert(observations)
      .values(
        eligiblePerceptions.map((ep: any) => ({
          id: `observation:${eventId}:${ep.observerEntityId}:${ep.modality}`,
          runId,
          branchId: turn.branchId,
          observerEntityId: ep.observerEntityId,
          sourceEventId: eventId,
          modality: ep.modality,
          perceivedContent: ep.perceivedEnvelope,
          detail: ep.detail,
          confidence: ep.confidence,
          distortion: ep.distortion ?? null,
          occluded: ep.occluded,
          observedTurn: turn.turnNumber,
          visibility: 'entity_private',
          attribution: { source: 'system', sourceIds: [eventId, ep.observerEntityId] },
        })),
      )
      .onConflictDoNothing();

    // Deterministically persist owner-scoped episodic memories from this turn's perceptions.
    // This supplies long-run continuity without using the global player-facing transcript.
    if (eligiblePerceptions.length > 0) {
      await tx
        .insert(memories)
        .values(
          eligiblePerceptions.map((ep) => ({
            id: `memory:${turnId}:${ep.observerEntityId}:${ep.modality}`,
            runId,
            branchId: turn.branchId,
            ownerEntityId: ep.observerEntityId,
            memoryType: 'episodic',
            content: ep.perceivedEnvelope,
            importance: Math.max(0.2, Math.min(1, ep.detail * ep.confidence)),
            emotionalValence: 0,
            emotionalIntensity: 0,
            confidence: ep.confidence,
            accessibility: Math.max(0.4, ep.detail),
            decayRate: 0.02,
            lifecycleStatus: 'active',
            sourceLinks: [
              {
                type: 'observation',
                id: `observation:${eventId}:${ep.observerEntityId}:${ep.modality}`,
              },
            ],
            reinforcedTurn: turn.turnNumber,
            attribution: {
              source: 'system',
              sourceIds: [`observation:${eventId}:${ep.observerEntityId}:${ep.modality}`],
            },
          })),
        )
        .onConflictDoNothing();
    }

    await tx
      .update(turns)
      .set({ stage: 'OBSERVATIONS_CREATED', updatedAt: new Date() })
      .where(eq(turns.id, turnId));
    await tx
      .insert(turnStageResults)
      .values({
        id: `${turnId}:narration`,
        turnId,
        stage: 'NARRATION_COMMITTED',
        inputSnapshot: { runId, branchId: turn.branchId },
        validatedOutput: { segmentId },
        applicationKey: `${turnId}:narration:v1`,
        status: 'applied',
        attribution: { source: 'narrator', sourceIds: [eventId] },
      })
      .onConflictDoNothing();
    await tx
      .insert(narrativeSegments)
      .values({
        id: segmentId,
        runId,
        branchId: turn.branchId,
        turnId,
        version: 1,
        segmentType: 'narration',
        eventIds: [eventId],
        segmentOrder: 0,
        visibility: 'player_view',
        text: result.narrative,
        attribution: { source: 'narrator', sourceIds: [eventId] },
      })
      .onConflictDoNothing();
    await tx
      .insert(turnStreamEvents)
      .values([
        {
          turnId,
          eventKey: `${turnId}:narration_started`,
          eventType: 'turn.narration_started',
          payload: { turnId },
        },
        {
          turnId,
          eventKey: `${turnId}:narration_delta`,
          eventType: 'turn.narration_delta',
          payload: { text: result.narrative },
        },
        {
          turnId,
          eventKey: `${turnId}:narration_completed`,
          eventType: 'turn.narration_completed',
          payload: { segmentId },
        },
      ])
      .onConflictDoNothing();
    await tx
      .insert(outbox)
      .values([
        {
          id: `${turnId}:memory`,
          topic: 'memory.curation',
          key: `${turnId}:memory`,
          payload: { runId, turnId },
          attribution: { source: 'system', sourceIds: [turnId] },
        },
        {
          id: `${turnId}:retrieval`,
          topic: 'retrieval.index',
          key: `${turnId}:retrieval`,
          payload: { runId, turnId },
          attribution: { source: 'system', sourceIds: [turnId] },
        },
        {
          id: `${turnId}:plots`,
          topic: 'plot.evaluate',
          key: `${turnId}:plots`,
          payload: { runId, turnId },
          attribution: { source: 'system', sourceIds: [turnId] },
        },
        {
          id: `${turnId}:snapshot`,
          topic: 'snapshot.create',
          key: `${turnId}:snapshot`,
          payload: { runId, turnId },
          attribution: { source: 'system', sourceIds: [turnId] },
        },
      ])
      .onConflictDoNothing();
    // Advance run's deterministic worldTime by elapsed minutes
    const currentWorldTime = run.worldTime ? new Date(run.worldTime) : new Date();
    const advancedWorldTime = new Date(
      currentWorldTime.getTime() + (result.timeElapsedMinutes || 1) * 60_000,
    );

    await tx
      .update(runs)
      .set({
        currentTurn: turn.turnNumber,
        expectedVersion: turn.expectedVersion + 1,
        worldTime: advancedWorldTime,
        updatedAt: new Date(),
      })
      .where(and(eq(runs.id, runId), eq(runs.expectedVersion, turn.expectedVersion)));
    await tx
      .update(jobRuns)
      .set({
        status: 'completed',
        stage: 'COMPLETED',
        heartbeatAt: new Date(),
        endedAt: new Date(),
      })
      .where(eq(jobRuns.jobKey, turnId));
    await tx
      .update(turns)
      .set({
        status: 'completed',
        stage: 'COMPLETED',
        finalNarrative: result.narrative,
        endedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(turns.id, turnId));
  });
  await recordStageEvent('OBSERVATIONS_CREATED', { deterministic: true, observerCount: 1 });
  await recordStageEvent('NARRATION_COMMITTED', { segmentId });
  await recordStageEvent('MEMORY_UPDATES_QUEUED', { queued: false });
  await recordStageEvent('MUTATIONS_QUEUED', { queued: false });
  await recordStageEvent('COMPLETED', {
    turnId,
    segmentId,
    telemetry: {
      model: activeModel,
      contextWindow: 128_000,
      totalNpcInputTokens,
      totalNpcOutputTokens,
      turnResultUsage: turnResultUsage ?? null,
      totalInputTokens: totalNpcInputTokens + (turnResultUsage?.inputTokens ?? 0),
      totalOutputTokens: totalNpcOutputTokens + (turnResultUsage?.outputTokens ?? 0),
    },
  });
}
