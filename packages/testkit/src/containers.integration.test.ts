import postgres from 'postgres';
import { Redis } from 'ioredis';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  startTestServices,
  stopTestServices,
  testServiceUrls,
  type TestServices,
} from './containers.js';

let services: TestServices;
let urls: ReturnType<typeof testServiceUrls>;

describe('Testcontainers services', () => {
  beforeAll(async () => {
    services = await startTestServices();
    urls = testServiceUrls(services);
  }, 120_000);

  afterAll(async () => {
    await stopTestServices(services);
  }, 30_000);

  it('provides PostgreSQL with required extensions and reachable Redis', async () => {
    const sql = postgres(urls.databaseUrl);
    const redis = new Redis(urls.redisUrl);
    try {
      const extensions = await sql<
        { extname: string }[]
      >`select extname from pg_extension where extname in ('vector', 'pg_trgm')`;
      expect(extensions.map((extension) => extension.extname).sort()).toEqual([
        'pg_trgm',
        'vector',
      ]);
      expect(await redis.ping()).toBe('PONG');
    } finally {
      await Promise.all([sql.end({ timeout: 5 }), redis.quit()]);
    }
  });
});
