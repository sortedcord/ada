import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import postgres from 'postgres';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createDatabase, createRunFromPublishedRevision, snapshotChecksum } from '@ada/db';
import { processTurn } from '@ada/worker';
import { processPlotEvaluation } from '@ada/worker/plot-evaluation';
import { plotPointSchema } from '@ada/domain';
import type { ServerEnvironment } from '@ada/config';
import { FakeGenerationProvider, type GenerationProvider } from '@ada/ai';
import { SqlRetrievalService, indexRetrievalChunk, projectEntity } from '@ada/retrieval';
import { makeScenarioAggregate } from './factories.js';
import {
  startTestServices,
  stopTestServices,
  testServiceUrls,
  type TestServices,
} from './containers.js';

let services: TestServices;
let sql: ReturnType<typeof postgres>;
let databaseUrl: string;

async function applyMigrations(client: ReturnType<typeof postgres>): Promise<void> {
  for (const filename of [
    '0000_aberrant_romulus.sql',
    '0001_illegal_medusa.sql',
    '0002_hot_ares.sql',
    '0003_noisy_squirrel_girl.sql',
    '0004_nostalgic_earthquake.sql',
    '0005_opposite_famine.sql',
    '0006_concerned_magik.sql',
    '0007_tranquil_tyger_tiger.sql',
    '0008_narrow_the_fallen.sql',
    '0009_jittery_radioactive_man.sql',
    '0010_per_principal_cognition.sql',
    '0011_scenario_authoring_proposals.sql',
    '0012_story_card_mutation_proposals.sql',
    '0013_repair_unjournaled_schema.sql',
    '0014_portal_spatial_state.sql',
  ]) {
    const file = await readFile(resolve(process.cwd(), '../db/drizzle', filename), 'utf8');
    for (const statement of file
      .split('--> statement-breakpoint')
      .map((v) => v.trim())
      .filter(Boolean))
      await client.unsafe(statement);
  }
}

describe('multi-turn gameplay execution and privacy invariants', () => {
  beforeAll(async () => {
    services = await startTestServices();
    databaseUrl = testServiceUrls(services).databaseUrl;
    sql = postgres(databaseUrl);
    await applyMigrations(sql);
  }, 120_000);

  afterAll(async () => {
    await sql.end({ timeout: 5 });
    await stopTestServices(services);
  }, 30_000);

  it('runs multiple consecutive turns, indexing perceptions and verifying private canary isolation', async () => {
    const db = createDatabase(databaseUrl).db;
    const metadata = { attribution: { source: 'system' as const, sourceIds: [] } };

    // 1. Create a rich scenario with Player and 2 NPCs: Alice (present) and AbsentBob (away)
    const aggregate = makeScenarioAggregate();
    aggregate.locations.push({ ...aggregate.locations[0]!, id: 'location_2', name: 'Courtyard', parentLocationId: 'location_1' });
    aggregate.entities.push(
      {
        id: 'npc_alice',
        revisionId: 'revision_1',
        name: 'Alice',
        aliases: [],
        pronouns: 'she/her',
        kind: 'character',
        tags: [],
        publicDescription: 'Alice the herbalist',
        privateDescription: 'SECRET_ALICE_HEIRLOOM_RING',
        appearance: '',
        history: '',
        historicalEvents: [],
        personality: ['curious'],
        speechStyle: 'warm',
        values: [],
        drives: [],
        goals: ['find herbs'],
        fears: [],
        desires: [],
        capabilities: [],
        limitations: [],
        secrets: ['SECRET_ALICE_HEIRLOOM_RING'],
        stats: {},
        structuredAttributes: {},
        constraints: [],
        aiMutationPolicy: 'manual_only',
        playable: false,
        cognitive: true,
        alive: true,
        active: true,
        startingLocationId: 'location_1',
        metadata: {
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          version: 1,
          schemaVersion: 1,
          attribution: { source: 'system' as const, sourceIds: [] },
        },
      },
      {
        id: 'npc_bob',
        revisionId: 'revision_1',
        name: 'Bob',
        aliases: [],
        pronouns: 'he/him',
        kind: 'character',
        tags: [],
        publicDescription: 'Bob the distant guard',
        privateDescription: 'SECRET_BOB_TREASON_CANARY',
        appearance: '',
        history: '',
        historicalEvents: [],
        personality: ['stoic'],
        speechStyle: 'gruff',
        values: [],
        drives: [],
        goals: ['guard tower'],
        fears: [],
        desires: [],
        capabilities: [],
        limitations: [],
        secrets: ['SECRET_BOB_TREASON_CANARY'],
        stats: {},
        structuredAttributes: {},
        constraints: [],
        aiMutationPolicy: 'manual_only',
        playable: false,
        cognitive: true,
        alive: true,
        active: false,
        startingLocationId: 'location_1',
        metadata: {
          createdAt: '2026-01-01T00:00:00.000Z',
          updatedAt: '2026-01-01T00:00:00.000Z',
          version: 1,
          schemaVersion: 1,
          attribution: { source: 'system' as const, sourceIds: [] },
        },
      },
    );
    const plot = plotPointSchema.parse({
      id: 'plot_game_1', arcId: 'arc_game_1', revisionId: 'revision_1', title: 'The courtyard',
      internalDescription: '', source: 'player', priority: 1, status: 'dormant',
      preconditions: ['The player visits the courtyard.'], desiredOutcome: '', forbiddenOutcomes: ['Do not force a visit.'],
      involvedEntityIds: [], involvedLocationIds: [], foreshadowingCues: [], escalationOptions: [],
      resolutionConditions: ['Explore, wait, or leave.'],
      factConditions: { preconditions: [{ key: 'plot.game.courtyard_entered', trigger: { type: 'player_enters_location', locationId: 'location_2' } }], resolutionConditions: [], forbiddenOutcomes: [] },
      playerVisible: false, parentPointIds: [], metadata: aggregate.scenario.metadata,
    });
    aggregate.plotPoints.push(plot);
    aggregate.plotArcs.push({ id: 'arc_game_1', revisionId: 'revision_1', title: 'The courtyard', description: '', pointIds: [plot.id], priority: 1, metadata: plot.metadata });

    await sql.unsafe(
      "insert into scenarios (id, slug, title, status, attribution) values ('scenario_game', 'game', 'Game', 'valid', $1)",
      [JSON.stringify(metadata)],
    );
    await sql.unsafe(
      "insert into scenario_revisions (id, scenario_id, revision_number, status, aggregate, checksum, attribution) values ('rev_game', 'scenario_game', 1, 'published', $1, $2, $3)",
      [
        JSON.stringify(aggregate),
        snapshotChecksum(JSON.stringify(aggregate)),
        JSON.stringify(metadata),
      ],
    );

    // 2. Start run
    const runResult = await createRunFromPublishedRevision(db, {
      runId: 'run_game_1',
      branchId: 'branch_game_1',
      revisionId: 'rev_game',
      playerEntityId: 'player_1',
      worldTime: new Date(),
      randomSeed: 12345,
      narrativeSettings: {},
      roleSettingsSnapshot: {},
      retrievalProfileSnapshot: {},
    });
    expect(runResult.runId).toBe('run_game_1');

    // 3. Project initial entities into retrieval chunks
    for (const entity of aggregate.entities) {
      const chunks = projectEntity(entity);
      for (const chunk of chunks) {
        await sql.unsafe(
          "insert into retrieval_documents (id, source_type, source_id, source_version, run_id, branch_id, visibility, owner_entity_id, content_hash, active, attribution) values ($1, $2, $3, 1, 'run_game_1', 'branch_game_1', $4, $5, 'hash', true, $6) on conflict do nothing",
          [
            `doc:${chunk.id}`,
            chunk.sourceType,
            chunk.sourceId,
            chunk.scope,
            chunk.ownerEntityId || null,
            JSON.stringify(metadata),
          ],
        );
        await indexRetrievalChunk(db, {
          ...chunk,
          documentId: `doc:${chunk.id}`,
        });
      }
    }

    const testEnv = {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      HOST: '127.0.0.1',
      API_PORT: 3000,
      REQUEST_ID_HEADER: 'x-request-id',
      DATABASE_URL: databaseUrl,
      REDIS_URL: 'redis://localhost:6379',
      GENERATION_ENABLED: true,
      GENERATION_PROVIDER: 'fake',
      GENERATION_BASE_URL: 'https://example.com',
      GENERATION_API_KEY: 'fake',
      GENERATION_API: 'chat-completions',
      GENERATION_MODELS_REFRESH_SECONDS: 3600,
      GENERATION_DEFAULT_MODEL: 'fake-model',
      GENERATION_MAX_RESPONSE_LENGTH: 150,
      EMBEDDING_ENABLED: false,
      EMBEDDING_PROVIDER: '',
      EMBEDDING_BASE_URL: '',
      EMBEDDING_API_KEY: '',
      EMBEDDING_MODEL: '',
      EMBEDDING_DIMENSIONS: 1536,
      EMBEDDING_DISTANCE: 'cosine' as const,
      EMBEDDING_BATCH_SIZE: 64,
      REMOTE_ACCESS_ENABLED: false,
      AUTH_SESSION_SECRET: '01234567890123456789012345678901',
      CORS_ORIGIN: 'http://127.0.0.1:4173',
      DEBUG_INSPECTORS_ENABLED: true,
    } satisfies ServerEnvironment;

    // 4. Simulate a 3-turn sequence
    const turnInputs = [
      'Hello Alice, do you know where the ancient key is?',
      'I look around the room for any hidden cupboards.',
      'I walk to Courtyard.',
    ];

    for (let i = 0; i < turnInputs.length; i++) {
      const turnNum = i + 1;
      const turnId = `turn_game_${turnNum}`;
      const playerText = turnInputs[i]!;

      // Fetch fresh run state for expected version
      const [currentRun] = await sql<
        { expected_version: number; current_turn: number }[]
      >`select expected_version, current_turn from runs where id = 'run_game_1'`;
      const expectedVersion = currentRun?.expected_version || 1;

      // Insert turn record
      await sql.unsafe(
        `insert into turns (id, run_id, branch_id, turn_number, raw_player_input, status, stage, idempotency_key, expected_version, attribution)
         values ($1, 'run_game_1', 'branch_game_1', $2, $3, 'pending', 'ACCEPTED', $4, $5, $6)`,
        [turnId, turnNum, playerText, `key_${turnNum}`, expectedVersion, JSON.stringify(metadata)],
      );

      // Setup fake generation actions for NPC decisions and turn resolver
      const fakeProvider: GenerationProvider = {
        discoverModels: () => new FakeGenerationProvider().discoverModels(),
        streamText: () => new FakeGenerationProvider().streamText(),
        generateObject(request) {
          return Promise.resolve({
            model: request.model,
            value: request.parse(request.schemaName === 'TurnResult'
              ? {
                  narrative: `You speak with Alice. She smiles warmly and tends to her herbs. "${playerText}"`,
                  eventDescription: i === 0 ? 'Player interacted with Alice.' : 'The player entered the courtyard in the resolved scene.',
                  patches: [],
                  discoveredNpcs: [],
                }
              : { decisions: [
              {
                entityId: 'npc_alice',
                attention: 'focused',
                reaction: 'speak_and_act',
                speech: 'Greetings traveler. The herbs are flourishing today.',
                actionDescription: 'Alice tends to her dried chamomile.',
                generatedThoughts: [
                  {
                    text: 'I must keep the heirloom ring safely tucked away.',
                    persistence: 'ephemeral',
                    salience: 0.8,
                    urgency: 0.5,
                  },
                ],
                beliefProposals: [],
                goalUpdates: [],
                perceivedEvidenceIds: [],
              },
              ] }),
          });
        },
      };

      // Execute full turn pipeline
      await processTurn(db, testEnv, turnId, 'run_game_1', undefined, fakeProvider);
      if (i === 2) await processTurn(db, testEnv, turnId, 'run_game_1', undefined, new FakeGenerationProvider([]));

      // Verify turn completed
      const [completedTurn] = await sql<
        { status: string; stage: string; failure: unknown }[]
      >`select status, stage, failure from turns where id = ${turnId}`;
      expect(completedTurn?.status).toBe('completed');
      expect(completedTurn?.stage).toBe('COMPLETED');
      if (i === 2) {
        const [eventCount] = await sql<{ count: number }[]>`select count(*)::int as count from events where turn_id = ${turnId}`;
        expect(eventCount?.count).toBe(1);
      }
      const [factCount] = await sql<{ count: number }[]>`select count(*)::int as count from event_facts where event_id = ${`event:${turnId}:0`}`;
      expect(factCount?.count).toBe(i === 2 ? 1 : 0);
      await processPlotEvaluation(db, `${turnId}:plots`, { runId: 'run_game_1', turnId });
      if (i === 2) {
        const [stage] = await sql<{ validated_output: { eventFacts: string[]; resolverOutput: Record<string, unknown> } }[]>`select validated_output from turn_stage_results where id = ${`${turnId}:resolution`}`;
        expect(stage?.validated_output.eventFacts).toEqual(['plot.game.courtyard_entered']);
        expect(stage?.validated_output.resolverOutput).not.toHaveProperty('eventFacts');
      }
      if (i === 2) {
        const [storedFact] = await sql<{ key: string; value: boolean; visibility: string; source: { id: string; trigger: { type: string; locationId: string } } }[]>`select key, value, visibility, source from event_facts where event_id = ${`event:${turnId}:0`}`;
        expect(storedFact).toMatchObject({ key: 'plot.game.courtyard_entered', value: true, visibility: 'scene_observable', source: { id: `event:${turnId}:0`, trigger: { type: 'player_enters_location', locationId: 'location_2' } } });
      }
      const [projection] = await sql<{ state: { plotStatuses: Record<string, string>; plotEvidence: Record<string, string[]> } }[]>`select state from architect_state where run_id = 'run_game_1' and branch_id = 'branch_game_1'`;
      expect(projection?.state.plotStatuses.plot_game_1).toBe(i === 2 ? 'available' : 'dormant');
      expect(projection?.state.plotEvidence.plot_game_1).toEqual(i === 2 ? [`event:${turnId}:0`] : []);
      await processPlotEvaluation(db, `${turnId}:plots`, { runId: 'run_game_1', turnId });
      const [replayed] = await sql<{ state: { plotEvidence: Record<string, string[]> } }[]>`select state from architect_state where run_id = 'run_game_1' and branch_id = 'branch_game_1'`;
      expect(replayed?.state.plotEvidence.plot_game_1).toEqual(projection?.state.plotEvidence.plot_game_1);

    }

    const rejectedTurnId = 'turn_game_unknown';
    await sql.unsafe(
      `insert into turns (id, run_id, branch_id, turn_number, raw_player_input, status, stage, idempotency_key, expected_version, attribution)
       values ($1, 'run_game_1', 'branch_game_1', 4, 'I ask for a key.', 'pending', 'ACCEPTED', $1, 4, $2)`,
      [rejectedTurnId, JSON.stringify(metadata)],
    );
    await processTurn(db, testEnv, rejectedTurnId, 'run_game_1', undefined, {
      discoverModels: () => new FakeGenerationProvider().discoverModels(),
      streamText: () => new FakeGenerationProvider().streamText(),
      generateObject(request) {
        return Promise.resolve({ model: request.model, value: request.parse(request.schemaName === 'TurnResult'
          ? { narrative: 'The player asks for the key.', eventDescription: 'The request was heard.', patches: [],
              eventFacts: [{ key: 'plot.game.unapproved', observedOutcome: 'A key was granted.' }], locationChange: { locationId: 'unreachable_location' } }
          : { entityId: 'npc_alice', attention: 'noticed', reaction: 'none', speech: '', generatedThoughts: ['Observing quietly.'] }) });
      },
    });
    const [rejected] = await sql<{ status: string }[]>`select status from turns where id = ${rejectedTurnId}`;
    expect(rejected?.status).toBe('completed');
    const [rejectedCount] = await sql<{ count: number }[]>`select count(*)::int as count from event_facts where event_id = ${`event:${rejectedTurnId}:0`}`;
    expect(rejectedCount?.count).toBe(0);
    await processPlotEvaluation(db, `${rejectedTurnId}:plots`, { runId: 'run_game_1', turnId: rejectedTurnId });
    const [unaffected] = await sql<{ state: { plotStatuses: Record<string, string>; plotEvidence: Record<string, string[]> } }[]>`select state from architect_state where run_id = 'run_game_1' and branch_id = 'branch_game_1'`;
    expect(unaffected?.state.plotStatuses.plot_game_1).toBe('available');
    expect(unaffected?.state.plotEvidence.plot_game_1).toEqual(['event:turn_game_3:0']);

    // 5. Test Principal-Aware Retrieval & Epistemic Canary Isolation
    const retrieval = new SqlRetrievalService(db);

    // Alice queries for secrets -> SHOULD receive her own heirloom ring
    const aliceResults = await retrieval.retrieve({
      principal: {
        kind: 'NPC',
        runId: 'run_game_1',
        branchId: 'branch_game_1',
        entityId: 'npc_alice',
      },
      query: 'SECRET_ALICE_HEIRLOOM_RING',
      maxCandidates: 10,
      maxSelected: 10,
    });
    const aliceTexts = aliceResults.map((r) => r.text);
    expect(aliceTexts.some((t) => t.includes('SECRET_ALICE_HEIRLOOM_RING'))).toBe(true);
    // Alice MUST NOT receive Bob's treason canary
    expect(aliceTexts.some((t) => t.includes('SECRET_BOB_TREASON_CANARY'))).toBe(false);

    // Player View -> MUST NOT receive Alice's secret or Bob's secret
    const playerResults = await retrieval.retrieve({
      principal: {
        kind: 'PLAYER_VIEW',
        runId: 'run_game_1',
        branchId: 'branch_game_1',
        entityId: 'player_1',
      },
      query: 'SECRET',
      maxCandidates: 10,
      maxSelected: 10,
    });
    const playerTexts = playerResults.map((r) => r.text);
    expect(playerTexts.some((t) => t.includes('SECRET_ALICE_HEIRLOOM_RING'))).toBe(false);
    expect(playerTexts.some((t) => t.includes('SECRET_BOB_TREASON_CANARY'))).toBe(false);

    // Absent Bob was not in location_1 -> verify Bob received no observations
    const bobObservations = await sql<
      { id: string }[]
    >`select id from observations where observer_entity_id = 'npc_bob'`;
    expect(bobObservations).toHaveLength(0);
  }, 180_000);
});
