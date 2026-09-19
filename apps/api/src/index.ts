import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { loadServerEnvironment } from '@ada/config';
import { checkDatabase, createDatabase } from '@ada/db';
import { noopTelemetry } from '@ada/observability';
import { buildApp } from './app.js';

const environment = loadServerEnvironment();
const redis = new Redis(environment.REDIS_URL, { lazyConnect: true, maxRetriesPerRequest: 1 });
const readinessCheck = async (): Promise<boolean> => {
  try {
    if (redis.status === 'wait') await redis.connect();
    await Promise.all([checkDatabase(environment.DATABASE_URL), redis.ping()]);
    return true;
  } catch {
    return false;
  }
};
const database = createDatabase(environment.DATABASE_URL);
const turnQueue = new Queue('turns', { connection: { url: environment.REDIS_URL } });
const app = buildApp(environment, readinessCheck, { db: database.db, turnQueue });
let shuttingDown = false;

async function closeWithDeadline(operation: Promise<unknown>, milliseconds: number): Promise<void> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    await Promise.race([
      operation,
      new Promise<never>((_resolve, reject) => {
        timeout = setTimeout(() => reject(new Error('Shutdown deadline exceeded')), milliseconds);
      }),
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

const shutdown = async (signal: string): Promise<void> => {
  if (shuttingDown) return;
  shuttingDown = true;
  app.log.info({ signal }, 'shutdown requested');
  try {
    await closeWithDeadline(
      Promise.all([
        app.close(),
        turnQueue.close(),
        redis.quit(),
        database.client.end({ timeout: 5 }),
        noopTelemetry.flush(),
      ]),
      10_000,
    );
  } catch (error) {
    app.log.error(error, 'graceful shutdown exceeded deadline');
    redis.disconnect();
    await turnQueue.close();
    await database.client.end({ timeout: 1 });
  }
};
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
  void shutdown('SIGINT');
});

try {
  await app.listen({ host: environment.HOST, port: environment.API_PORT });
} catch (error) {
  app.log.error(error, 'failed to start API');
  await Promise.all([turnQueue.close(), redis.quit(), database.client.end({ timeout: 5 })]);
  process.exitCode = 1;
}
