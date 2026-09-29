import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { initialArchitectState } from '@ada/architect';
import { createDatabase, type Database } from '@ada/db';
import { plotPointSchema, type PlotPoint } from '@ada/domain';
import { processPlotEvaluation } from '@ada/worker/plot-evaluation';
import { makeScenarioAggregate } from './factories.js';
import { startTestServices, stopTestServices, testServiceUrls, type TestServices } from './containers.js';

let services: TestServices;
let connection: ReturnType<typeof createDatabase>;
let db: Database;
const attribution = { source: 'system', sourceIds: [] };
const point: PlotPoint = plotPointSchema.parse({
  id: 'plot_1', arcId: 'arc_1', revisionId: 'revision_1', title: 'Unlock vault',
  internalDescription: '', source: 'player', priority: 0, status: 'active',
  preconditions: [], desiredOutcome: '', forbiddenOutcomes: ['vault_destroyed'],
  involvedEntityIds: [], involvedLocationIds: [], foreshadowingCues: [], escalationOptions: [],
  resolutionConditions: ['vault_unlocked'], playerVisible: true, parentPointIds: [],
  metadata: { createdAt: '2026-01-01T00:00:00.000Z', updatedAt: '2026-01-01T00:00:00.000Z',
    version: 1, schemaVersion: 1, attribution },
});

async function insertTurn(id: string, branchId: string, number: number, status = 'completed') {
  await connection.client`insert into turns (id, run_id, branch_id, turn_number, raw_player_input, status, stage, idempotency_key, expected_version)
    values (${id}, 'run_1', ${branchId}, ${number}, '', ${status}, 'COMMITTED', ${id}, 1)`;
  await connection.client`insert into outbox (id, topic, key, payload)
    values (${id + ':plots'}, 'plot.evaluate', ${id + ':plots'}, ${JSON.stringify({ runId: 'run_1', turnId: id })}::jsonb)`;
}
async function insertFact(id: string, turnId: string, branchId: string, key: string, value: unknown = true) {
  await connection.client`insert into events (id, run_id, branch_id, turn_id, event_type, location_id, world_time, canonical_description,
    visibility_hints, salience, emotional_weight) values (${id}, 'run_1', ${branchId}, ${turnId}, 'test', 'location_1', now(),
    'No plot evidence in prose', '[]'::jsonb, 0, 0)`;
  await connection.client`insert into event_facts (id, event_id, key, value, visibility, source)
    values (${id + ':fact'}, ${id}, ${key}, ${JSON.stringify(value)}::jsonb, 'world_truth', '{}'::jsonb)`;
}
async function status(branchId = 'branch_1') {
  const [row] = await connection.client`select state, version from architect_state where run_id = 'run_1' and branch_id = ${branchId}`;
  return row as { state: { plotStatuses: Record<string, string>; plotEvidence: Record<string, string[]> }; version: number };
}

// Each case uses a distinct turn and branch; no shared projection state assumptions.
describe('plot.evaluate outbox projection', () => {
  beforeAll(async () => {
    services = await startTestServices();
    connection = createDatabase(testServiceUrls(services).databaseUrl);
    db = connection.db;
    for (const filename of [
      '0000_aberrant_romulus.sql', '0001_illegal_medusa.sql', '0002_hot_ares.sql',
      '0003_noisy_squirrel_girl.sql', '0004_nostalgic_earthquake.sql',
      '0005_opposite_famine.sql', '0006_concerned_magik.sql', '0007_tranquil_tyger_tiger.sql',
      '0008_narrow_the_fallen.sql', '0009_jittery_radioactive_man.sql',
      '0010_per_principal_cognition.sql', '0011_scenario_authoring_proposals.sql',
      '0012_story_card_mutation_proposals.sql', '0013_repair_unjournaled_schema.sql',
      '0014_portal_spatial_state.sql',
    ]) {
      const content = await readFile(resolve(process.cwd(), '../db/drizzle', filename), 'utf8');
      for (const statement of content.split('--> statement-breakpoint').map((part) => part.trim()).filter(Boolean))
        await connection.client.unsafe(statement);
    }
    const aggregate = makeScenarioAggregate();
    aggregate.plotArcs.push({ id: 'arc_1', revisionId: 'revision_1', title: 'Vault', description: '', pointIds: [point.id], priority: 0,
      metadata: point.metadata });
    aggregate.plotPoints.push(point);
    await connection.client`insert into scenarios (id, slug, title, status) values ('scenario_1', 'fixture', 'Fixture', 'valid')`;
    await connection.client`insert into scenario_revisions (id, scenario_id, revision_number, status, aggregate, checksum)
      values ('revision_1', 'scenario_1', 1, 'published', ${JSON.stringify(aggregate)}::jsonb, 'checksum')`;
    await connection.client`insert into runs (id, scenario_revision_id, player_entity_id, active_branch_id, status, current_turn, world_time,
      random_seed, narrative_settings, role_settings_snapshot, retrieval_profile_snapshot)
      values ('run_1', 'revision_1', 'player_1', 'branch_2', 'active', 3, now(), 1, '{}'::jsonb, '{}'::jsonb, '{}'::jsonb)`;
    for (const branchId of ['branch_1', 'branch_2']) {
      await connection.client`insert into run_branches (id, run_id, fork_turn, label, active, canonical, creation_reason)
        values (${branchId}, 'run_1', 0, ${branchId}, ${branchId === 'branch_2'}, true, 'test')`;
      await connection.client`insert into architect_state (run_id, branch_id, state)
        values ('run_1', ${branchId}, ${JSON.stringify(initialArchitectState([point]))}::jsonb)`;
    }
  }, 120_000);
  afterAll(async () => {
    await connection?.client.end({ timeout: 5 });
    if (services) await stopTestServices(services);
  }, 30_000);

  it('changes authored active status only with matching canonical facts through the completed turn and atomically acknowledges', async () => {
    await insertTurn('turn_1', 'branch_1', 1);
    await insertFact('event_1', 'turn_1', 'branch_1', 'vault_unlocked');
    await insertTurn('turn_2', 'branch_1', 2);
    await insertFact('event_2', 'turn_2', 'branch_1', 'vault_destroyed');
    await expect(processPlotEvaluation(db, 'turn_2:plots', { runId: 'run_1', turnId: 'turn_2' })).rejects.toThrow('earlier branch turn');
    expect((await status()).state.plotStatuses.plot_1).toBe('active');
    await processPlotEvaluation(db, 'turn_1:plots', { runId: 'run_1', turnId: 'turn_1' });
    expect((await status()).state.plotStatuses.plot_1).toBe('resolved');
    expect((await status()).state.plotEvidence.plot_1).toEqual(['event_1']);
    const [message] = await connection.client`select status from outbox where id = 'turn_1:plots'`;
    expect(message?.status).toBe('processed');
    const version = (await status()).version;
    await processPlotEvaluation(db, 'turn_1:plots', { runId: 'run_1', turnId: 'turn_1' });
    expect((await status()).version).toBe(version);
    await processPlotEvaluation(db, 'turn_2:plots', { runId: 'run_1', turnId: 'turn_2' });
    expect((await status()).state.plotStatuses.plot_1).toBe('resolved');
  });

  it('does not infer a fact from prose, false fact values, or another branch', async () => {
    await insertTurn('turn_3', 'branch_2', 1);
    await insertFact('event_3', 'turn_3', 'branch_2', 'vault_unlocked', false);
    await processPlotEvaluation(db, 'turn_3:plots', { runId: 'run_1', turnId: 'turn_3' });
    expect((await status('branch_2')).state.plotStatuses.plot_1).toBe('active');
    expect((await status('branch_2')).state.plotEvidence.plot_1).toEqual([]);
    await insertTurn('turn_4', 'branch_2', 2);
    await processPlotEvaluation(db, 'turn_4:plots', { runId: 'run_1', turnId: 'turn_4' });
    expect((await status('branch_2')).state.plotStatuses.plot_1).toBe('active');
    expect((await status('branch_2')).state.plotEvidence.plot_1).toEqual([]);
    expect((await status('branch_2')).version).toBe(1);
  });

  it('refuses to project a pending turn and leaves its outbox unprocessed', async () => {
    await insertTurn('turn_5', 'branch_2', 3, 'running');
    await insertFact('event_5', 'turn_5', 'branch_2', 'vault_unlocked');
    await expect(processPlotEvaluation(db, 'turn_5:plots', { runId: 'run_1', turnId: 'turn_5' })).rejects.toThrow('completed turn');
    expect((await status('branch_2')).state.plotStatuses.plot_1).toBe('active');
    const [message] = await connection.client`select status from outbox where id = 'turn_5:plots'`;
    expect(message?.status).toBe('pending');
  });
});
