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
});
