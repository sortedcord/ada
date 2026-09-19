import postgres from 'postgres';
import { drizzle } from 'drizzle-orm/postgres-js';

export function createDatabase(connectionString: string) {
  const client = postgres(connectionString, { max: 5, prepare: false });
  return { db: drizzle(client), client };
}

export type Database = ReturnType<typeof createDatabase>['db'];

export {
  appendEventsWithProjection,
  appendTurnStreamEvent,
  applyStageIdempotently,
  scenarioRepository,
  runRepository,
  replayTurnStreamEvents,
  snapshotChecksum,
  withRunAdvisoryLock,
  withTransaction,
  withTransactionRetry,
} from './repositories.js';
export { createEmbeddingHnswIndex, dropEmbeddingHnswIndex } from './embedding-indexes.js';
export { recordAiInvocation } from './ai-audit.js';
export { NpcContextRepository, type OwnerQuery } from './npc-context.js';
export * from './schema.js';
export {
  claimOutboxBatch,
  completeOutbox,
  createSnapshot,
  failOutbox,
  applyNpcGoals,
  insertInnerThought,
  persistNpcBeliefs,
  persistNpcThoughts,
  mutateStoryCard,
  rollbackStoryCard,
  readPrivateBeliefs,
  readPrivateMemories,
  readPrivateThoughts,
  restoreSnapshot,
} from './services.js';
export {
  compareProjectionChecksum,
  createRunFromPublishedRevision,
  rebuildEventProjection,
  withCanonicalRun,
} from './run-services.js';
export { cloneScenarioRevision, loadScenarioAggregate } from './scenario-services.js';

export async function checkDatabase(connectionString: string): Promise<void> {
  const client = postgres(connectionString, { max: 1, prepare: false });
  try {
    await client`select 1`;
  } finally {
    await client.end({ timeout: 5 });
  }
}

if (process.argv[2] === 'check') {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL is required');
  await checkDatabase(connectionString);
}
