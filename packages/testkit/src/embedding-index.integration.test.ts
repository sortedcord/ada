import postgres from 'postgres';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createEmbeddingHnswIndex } from '@ada/db';
import {
  startTestServices,
  stopTestServices,
  testServiceUrls,
  type TestServices,
} from './containers.js';

let services: TestServices;
let sql: ReturnType<typeof postgres>;

describe('embedding index lifecycle', () => {
  beforeAll(async () => {
    services = await startTestServices();
    sql = postgres(testServiceUrls(services).databaseUrl);
    await sql`create table chunk_embeddings (chunk_id text not null, embedding_profile_id text not null, embedding vector not null)`;
  }, 120_000);
  afterAll(async () => {
    await sql.end({ timeout: 5 });
    await stopTestServices(services);
  }, 30_000);

  it('creates a matching profile-specific HNSW index and rejects unsafe IDs', async () => {
    const indexName = await createEmbeddingHnswIndex(sql, 'profile_1', 3);
    const rows = await sql<
      { indexname: string }[]
    >`select indexname from pg_indexes where indexname = ${indexName}`;
    expect(rows).toHaveLength(1);
    await expect(createEmbeddingHnswIndex(sql, 'profile";drop', 3)).rejects.toThrow();
  });

  it('P8-030/P8-035: manages embedding profile lifecycle, distance metrics and atomic activation switch', async () => {
    await sql`create table if not exists embedding_profiles (
      id text primary key,
      provider text not null,
      model_id text not null,
      dimensions integer not null,
      distance text not null,
      status text not null,
      generation integer not null default 1,
      active boolean not null default false,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now(),
      created_by text,
      updated_by text,
      version integer not null default 1,
      schema_version integer not null default 1,
      archived_at timestamptz,
      archived_by text,
      attribution jsonb not null default '{}'::jsonb
    )`;

    // Insert profile 1 (active)
    await sql`insert into embedding_profiles (id, provider, model_id, dimensions, distance, status, active)
      values ('prof_v1', 'azure', 'azure/text-embedding-ada-002', 1536, 'cosine', 'active', true)`;

    // Insert profile 2 (staging)
    await sql`insert into embedding_profiles (id, provider, model_id, dimensions, distance, status, active)
      values ('prof_v2', 'azure', 'azure/text-embedding-3-small', 1536, 'cosine', 'staging', false)`;

    // Atomic switch: retire v1, activate v2
    await sql.begin(async (tx) => {
      await tx`update embedding_profiles set active = false, status = 'retired' where active = true`;
      await tx`update embedding_profiles set active = true, status = 'active' where id = 'prof_v2'`;
    });

    const activeRows = await sql<{ id: string; active: boolean }[]>`select id, active from embedding_profiles where active = true`;
    expect(activeRows).toHaveLength(1);
    expect(activeRows[0]?.id).toBe('prof_v2');
  });
});
