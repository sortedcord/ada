import { PostgreSqlContainer, type StartedPostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, type StartedTestContainer } from 'testcontainers';

export interface TestServices {
  readonly postgres: StartedPostgreSqlContainer;
  readonly redis: StartedTestContainer;
}

export async function startTestServices(): Promise<TestServices> {
  const postgres = await new PostgreSqlContainer('pgvector/pgvector:pg16')
    .withDatabase('ada_test')
    .withUsername('test_user')
    .withPassword('test_password')
    .start();
  try {
    await postgres.exec([
      'psql',
      '-U',
      'test_user',
      '-d',
      'ada_test',
      '-c',
      'CREATE EXTENSION IF NOT EXISTS vector; CREATE EXTENSION IF NOT EXISTS pg_trgm;',
    ]);
    const redis = await new GenericContainer('redis:7.4.2-alpine').withExposedPorts(6379).start();
    return { postgres, redis };
  } catch (error) {
    await postgres.stop();
    throw error;
  }
}

export async function stopTestServices(services: TestServices): Promise<void> {
  await Promise.all([services.postgres.stop(), services.redis.stop()]);
}

export function testServiceUrls(services: TestServices): { databaseUrl: string; redisUrl: string } {
  return {
    databaseUrl: services.postgres.getConnectionUri(),
    redisUrl: `redis://${services.redis.getHost()}:${services.redis.getMappedPort(6379)}`,
  };
}
