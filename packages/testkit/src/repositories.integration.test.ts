import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDatabase, scenarioRepository } from '@ada/db';
import {
  startTestServices,
  stopTestServices,
  testServiceUrls,
  type TestServices,
} from './containers.js';

let services: TestServices;
let closeDatabase: (() => Promise<void>) | undefined;

describe('database repositories', () => {
  beforeAll(async () => {
    services = await startTestServices();
    const urls = testServiceUrls(services);
    const connection = createDatabase(urls.databaseUrl);
    closeDatabase = () => connection.client.end({ timeout: 5 });
    await connection.client`create table scenarios (
      id text primary key,
      slug text not null unique,
      title text not null,
      tags jsonb not null default '[]'::jsonb,
      status text not null,
      current_revision integer not null default 1,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      version integer not null default 1,
      schema_version integer not null default 1,
      created_by text,
      updated_by text,
      archived_at timestamptz,
      archived_by text,
      attribution jsonb not null default '{}'::jsonb
    )`;
  }, 120_000);

  afterAll(async () => {
    await closeDatabase?.();
    await stopTestServices(services);
  }, 30_000);

  it('supports create/get and rejects stale optimistic updates', async () => {
    const urls = testServiceUrls(services);
    const connection = createDatabase(urls.databaseUrl);
    const repository = scenarioRepository(connection.db);
    try {
      const created = await repository.create({
        id: 'scenario_1',
        slug: 'demo',
        title: 'Demo',
        status: 'draft',
        attribution: { source: 'player', sourceIds: [] },
      });
      expect(created.id).toBe('scenario_1');
      expect((await repository.get('scenario_1'))?.slug).toBe('demo');
      expect((await repository.updateOptimistic('scenario_1', 1, { title: 'Updated' })).title).toBe(
        'Updated',
      );
      await expect(
        repository.updateOptimistic('scenario_1', 1, { title: 'Stale' }),
      ).rejects.toThrow('Optimistic conflict');
    } finally {
      await connection.client.end({ timeout: 5 });
    }
  });
});
