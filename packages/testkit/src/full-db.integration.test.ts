import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  appendEventsWithProjection,
  applyStageIdempotently,
  createDatabase,
  createRunFromPublishedRevision,
  createSnapshot,
  readPrivateMemories,
  rebuildEventProjection,
  restoreSnapshot,
  scenarioRepository,
  snapshotChecksum,
} from '@ada/db';
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
const metadata = { attribution: { source: 'system', sourceIds: [] } };

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
  ]) {
    const file = await readFile(resolve(process.cwd(), '../db/drizzle', filename), 'utf8');
    for (const statement of file
      .split('--> statement-breakpoint')
      .map((value) => value.trim())
      .filter(Boolean))
      await client.unsafe(statement);
  }
}

describe('full database invariants', () => {
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

  it('creates scenario/run aggregates and preserves optimistic conflicts', async () => {
    const aggregate = makeScenarioAggregate();
    const repo = scenarioRepository(createDatabase(databaseUrl).db);
    await sql.unsafe(
      "insert into scenarios (id, slug, title, status, attribution) values ('scenario_1', 'fixture', 'Fixture', 'valid', $1)",
      [JSON.stringify(metadata)],
    );
    await sql.unsafe(
      "insert into scenario_revisions (id, scenario_id, revision_number, status, aggregate, checksum, attribution) values ('revision_1', 'scenario_1', 1, 'published', $1, $2, $3)",
      [
        JSON.stringify(aggregate),
        snapshotChecksum(JSON.stringify(aggregate)),
        JSON.stringify(metadata),
      ],
    );
    expect((await repo.get('scenario_1'))?.slug).toBe('fixture');
    expect((await repo.updateOptimistic('scenario_1', 1, { title: 'Updated' })).title).toBe(
      'Updated',
    );
    await expect(repo.updateOptimistic('scenario_1', 1, { title: 'stale' })).rejects.toThrow(
      'Optimistic conflict',
    );
    await createRunFromPublishedRevision(createDatabase(databaseUrl).db, {
      runId: 'run_1',
      branchId: 'branch_1',
      revisionId: 'revision_1',
      playerEntityId: 'player_1',
      worldTime: new Date(),
      randomSeed: 7,
      narrativeSettings: {},
      roleSettingsSnapshot: {},
      retrievalProfileSnapshot: {},
    });
    const runs = await sql`select id, active_branch_id from runs where id = 'run_1'`;
    expect(runs[0]?.active_branch_id).toBe('branch_1');
  });

  it('applies stages/events idempotently and rebuilds projections', async () => {
    await sql.unsafe(
      "insert into turns (id, run_id, branch_id, turn_number, raw_player_input, status, stage, idempotency_key, expected_version, attribution) values ('turn_1', 'run_1', 'branch_1', 1, 'wait', 'running', 'ACCEPTED', 'turn-key', 1, $1)",
      [JSON.stringify(metadata)],
    );
    const db = createDatabase(databaseUrl).db;
    const first = await applyStageIdempotently(db, {
      turnId: 'turn_1',
      applicationKey: 'stage-key',
      stage: 'INPUT_VALIDATED',
      output: { ok: true },
      inputSnapshot: { version: 1 },
    });
    const second = await applyStageIdempotently(db, {
      turnId: 'turn_1',
      applicationKey: 'stage-key',
      stage: 'INPUT_VALIDATED',
      output: { ok: false },
      inputSnapshot: { version: 1 },
    });
    expect(first.applied).toBe(true);
    expect(second).toEqual({ applied: false, output: { ok: true } });
    const result = await appendEventsWithProjection(db, {
      runId: 'run_1',
      branchId: 'branch_1',
      turnId: 'turn_1',
      applicationKey: 'event-key',
      eventRows: [
        {
          id: 'event_1',
          runId: 'run_1',
          branchId: 'branch_1',
          turnId: 'turn_1',
          eventType: 'waited',
          locationId: 'location_1',
          worldTime: new Date(),
          canonicalDescription: 'The player waits.',
          visibilityHints: ['scene_observable'],
          salience: 1,
          emotionalWeight: 0,
          attribution: metadata,
        },
      ],
      entityState: [
        {
          runId: 'run_1',
          branchId: 'branch_1',
          entityId: 'player_1',
          state: { active: true },
          version: 1,
          attribution: metadata,
        },
      ],
    });
    expect(result).toEqual({ applied: true, eventIds: ['event_1'] });
    expect(
      (
        await appendEventsWithProjection(db, {
          runId: 'run_1',
          branchId: 'branch_1',
          turnId: 'turn_1',
          applicationKey: 'event-key',
          eventRows: [],
        })
      ).applied,
    ).toBe(false);
    const rebuilt = await rebuildEventProjection(db, 'run_1', 'branch_1', 0, (state) => state + 1);
    expect(rebuilt).toBe(1);
  });

  it('checks private reads and snapshot checksums', async () => {
    await sql.unsafe(
      "insert into memories (id, run_id, branch_id, owner_entity_id, memory_type, content, importance, emotional_valence, emotional_intensity, confidence, accessibility, decay_rate, lifecycle_status, source_links, reinforced_turn, attribution) values ('memory_1', 'run_1', 'branch_1', 'npc_1', 'episodic', 'NPC_A_SECRET_CANARY_ONLY', 1, 0, 0, 1, 1, 0, 'active', '[]', 1, $1)",
      [JSON.stringify(metadata)],
    );
    const db = createDatabase(databaseUrl).db;
    const allowed = await readPrivateMemories(
      db,
      { kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_1' },
      'npc_1',
      'run_1',
      'branch_1',
    );
    expect(allowed).toHaveLength(1);
    await expect(
      readPrivateMemories(
        db,
        { kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_2' },
        'npc_1',
        'run_1',
        'branch_1',
      ),
    ).rejects.toThrow('Private resource access denied');
    const snapshot = await createSnapshot(db, {
      id: 'snapshot_1',
      runId: 'run_1',
      branchId: 'branch_1',
      turn: 1,
      state: {
        entities: [
          {
            runId: 'run_1',
            branchId: 'branch_1',
            entityId: 'player_1',
            state: { hp: 10 },
            version: 1,
            attribution: metadata,
          },
        ],
      },
      projectionVersions: { player: 1 },
      schemaVersion: 1,
    });
    expect((await restoreSnapshot(db, snapshot.id, 1)).entities).toHaveLength(1);
    const checksum = await sql`select checksum from run_snapshots where id = 'snapshot_1'`;
    expect(checksum[0]?.checksum).toBe(
      snapshotChecksum(
        JSON.stringify({
          entities: [
            {
              runId: 'run_1',
              branchId: 'branch_1',
              entityId: 'player_1',
              state: { hp: 10 },
              version: 1,
              attribution: metadata,
            },
          ],
        }),
      ),
    );
  });
});
