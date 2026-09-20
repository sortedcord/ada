import { Queue, Worker } from 'bullmq';
import { loadServerEnvironment } from '@ada/config';
import { createDatabase, claimOutboxBatch, completeOutbox, failOutbox, jobRuns, narrativeSegments, retrievalDocuments, storyCardVersions, storyCards, turns } from '@ada/db';
import { createLogger, noopTelemetry } from '@ada/observability';
import { processTurn } from './turn-worker.js';
import { processDialogueAttribution } from './dialogue-attribution.js';
import { and, eq, inArray } from 'drizzle-orm';
import { indexRetrievalChunk, type VisibilityScope } from '@ada/retrieval';

const environment = loadServerEnvironment();
const logger = createLogger({
  service: 'worker',
  environment: environment.NODE_ENV,
  level: environment.LOG_LEVEL,
});
const database = createDatabase(environment.DATABASE_URL);
const connection = { url: environment.REDIS_URL };
const queue = new Queue('turns', { connection });
const dialogueQueue = new Queue('dialogue-attribution', { connection });

async function processOutboxBatch(): Promise<void> {
  const rows = await claimOutboxBatch(database.db, 25);
  for (const row of rows) {
    try {
      if (row.topic === 'story-card.reindex') {
        const payload = row.payload as { cardId?: string; version?: number };
        if (typeof payload.cardId === 'string' && typeof payload.version === 'number') {
          const [card] = await database.db.select().from(storyCards).where(eq(storyCards.id, payload.cardId)).limit(1);
          const [version] = await database.db.select().from(storyCardVersions).where(and(eq(storyCardVersions.cardId, payload.cardId), eq(storyCardVersions.version, payload.version))).limit(1);
          if (card && version) {
            const documentId = `scenario-card:${card.revisionId}:${card.id}`;
            await database.db.insert(retrievalDocuments).values({ id: documentId, sourceType: 'story_card', sourceId: card.id, sourceVersion: payload.version, visibility: version.scope || 'public_scenario', contentHash: `card:${card.id}:${payload.version}`, active: true, attribution: { source: 'mutation', sourceIds: [card.id] } }).onConflictDoUpdate({ target: retrievalDocuments.id, set: { sourceVersion: payload.version, contentHash: `card:${card.id}:${payload.version}`, active: true, updatedAt: new Date() } });
            await indexRetrievalChunk(database.db, { id: `chunk:${documentId}:v${payload.version}`, documentId, sourceType: 'story_card', sourceId: card.id, text: `${card.title}: ${JSON.stringify(version.body)}`, scope: (version.scope || 'public_scenario') as VisibilityScope, keywords: [card.title, 'story-card'], recency: 1, salience: 0.7, metadata: { cardId: card.id, version: payload.version } });
          }
        }
      }
      await completeOutbox(database.db, row.id);
    } catch (error) {
      logger.error({ err: error, outboxId: row.id }, 'outbox processing failed');
      await failOutbox(database.db, row.id, new Date(Date.now() + 1_000));
    }
  }
}
const outboxPoll = setInterval(() => void processOutboxBatch(), 1_000);
const dialogueWorker = new Worker(
  'dialogue-attribution',
  async (job) => {
    const payload = job.data as { runId?: unknown; turnId?: unknown; segmentId?: unknown };
    if (typeof payload.runId !== 'string' || typeof payload.turnId !== 'string' || typeof payload.segmentId !== 'string') return;
    await processDialogueAttribution(database.db, environment, payload.runId, payload.turnId, payload.segmentId);
  },
  { connection, concurrency: 2 },
);
const worker = new Worker(
  'turns',
  async (job) => {
    const payload = job.data as { runId?: unknown; turnId?: unknown };
    const runId = typeof payload.runId === 'string' ? payload.runId : '';
    const turnId = typeof payload.turnId === 'string' ? payload.turnId : '';
    logger.info({ jobId: job.id, runId, turnId }, 'turn job received');
    const controller = new AbortController();
    const poll = setInterval(() => {
      void database.db
        .select({ cancellationRequested: turns.cancellationRequested })
        .from(turns)
        .where(eq(turns.id, turnId))
        .limit(1)
        .then(([row]) => {
          if (row?.cancellationRequested) controller.abort();
          return undefined;
        })
        .catch(() => undefined);
    }, 250);
    try {
      await processTurn(database.db, environment, turnId, runId, controller.signal);
      const [segment] = await database.db
        .select({ id: narrativeSegments.id })
        .from(narrativeSegments)
        .where(eq(narrativeSegments.turnId, turnId))
        .limit(1);
      if (segment) {
        await dialogueQueue.add(
          'attribute-dialogue',
          { runId, turnId, segmentId: segment.id },
          { jobId: `dialogue-${turnId}`, removeOnComplete: 100, removeOnFail: 100 },
        );
      }
    } catch (error) {
      logger.error({ err: error, turnId, runId }, 'turn processing threw unhandled error');
      throw error;
    } finally {
      clearInterval(poll);
    }
  },
  { connection, concurrency: 1 },
);
worker.on('stalled', (jobId) => {
  logger.warn({ jobId }, 'turn job stalled');
  if (typeof jobId === 'string')
    void database.db
      .update(jobRuns)
      .set({
        status: 'retryable_failure',
        stage: 'STALLED',
        heartbeatAt: new Date(),
        safeError: { code: 'stalled_job' },
      })
      .where(inArray(jobRuns.jobKey, [jobId]));
});
async function recoverPendingTurns(): Promise<void> {
  const pending = await database.db
    .select({ id: turns.id, runId: turns.runId })
    .from(turns)
    .where(inArray(turns.status, ['pending', 'running']));
  for (const turn of pending)
    await queue.add(
      'turn',
      { runId: turn.runId, turnId: turn.id },
      { jobId: turn.id, removeOnComplete: 100, removeOnFail: 100 },
    );
}
void recoverPendingTurns().catch((error) => logger.error(error, 'startup recovery scan failed'));
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
  logger.info({ signal }, 'shutdown requested');
  try {
    clearInterval(outboxPoll);
    await closeWithDeadline(
      Promise.all([
        worker.close(),
        dialogueWorker.close(),
        queue.close(),
        dialogueQueue.close(),
        database.client.end({ timeout: 5 }),
        noopTelemetry.flush(),
      ]),
      10_000,
    );
  } catch (error) {
    logger.error(error, 'worker shutdown exceeded deadline');
    process.exitCode = 1;
  }
};
process.once('SIGTERM', () => {
  void shutdown('SIGTERM');
});
process.once('SIGINT', () => {
  void shutdown('SIGINT');
});
logger.info('worker started');
