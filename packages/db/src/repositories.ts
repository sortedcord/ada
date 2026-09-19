import { createHash } from 'node:crypto';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import type { Database } from './index.js';
import {
  events,
  runEntityState,
  runLocationState,
  runStoryCardState,
  runs,
  scenarioRevisions,
  scenarios,
  turnStageResults,
  turnStreamEvents,
} from './schema.js';

export type { Database };
export type Transaction = Parameters<Parameters<Database['transaction']>[0]>[0];

export type TransactionIsolation = 'read committed' | 'repeatable read' | 'serializable';
export async function withTransaction<T>(
  db: Database,
  operation: (tx: Transaction) => Promise<T>,
  options: { isolationLevel?: TransactionIsolation } = {},
): Promise<T> {
  return options.isolationLevel ? db.transaction(operation, options) : db.transaction(operation);
}

function retryableDatabaseError(error: unknown): boolean {
  if (!error || typeof error !== 'object' || !('code' in error)) return false;
  const code = error.code;
  return code === '40001' || code === '40P01';
}

export async function withTransactionRetry<T>(
  db: Database,
  operation: (tx: Transaction) => Promise<T>,
  attempts = 3,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await withTransaction(db, operation);
    } catch (error) {
      lastError = error;
      if (!retryableDatabaseError(error) || attempt === attempts - 1) {
        if (error instanceof Error) throw error;
        throw new Error('Database transaction failed', { cause: error });
      }
      await new Promise((resolve) => setTimeout(resolve, 25 * 2 ** attempt));
    }
  }
  if (lastError instanceof Error) throw lastError;
  throw new Error('Transaction retry exhausted', { cause: lastError });
}

export async function withRunAdvisoryLock<T>(
  db: Database,
  runId: string,
  operation: (tx: Transaction) => Promise<T>,
): Promise<T> {
  return withTransactionRetry(db, async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${runId}, 0))`);
    return operation(tx);
  });
}

export function scenarioRepository(db: Database) {
  return {
    async create(input: (typeof scenarios)['$inferInsert']) {
      const [created] = await db.insert(scenarios).values(input).returning();
      if (!created) throw new Error('Scenario insert returned no row');
      return created;
    },
    async get(id: string) {
      const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id)).limit(1);
      return scenario;
    },
    async list(limit = 25) {
      return db
        .select()
        .from(scenarios)
        .where(sql`${scenarios.archivedAt} is null`)
        .orderBy(desc(scenarios.updatedAt), asc(scenarios.id))
        .limit(limit);
    },
    async updateOptimistic(
      id: string,
      expectedVersion: number,
      patch: Partial<(typeof scenarios)['$inferInsert']>,
    ) {
      const [updated] = await db
        .update(scenarios)
        .set({ ...patch, version: expectedVersion + 1, updatedAt: new Date() })
        .where(and(eq(scenarios.id, id), eq(scenarios.version, expectedVersion)))
        .returning();
      if (!updated) throw new Error('Optimistic conflict or scenario not found');
      return updated;
    },
  };
}

export function runRepository(db: Database) {
  return {
    async create(input: (typeof runs)['$inferInsert']) {
      const [run] = await db.insert(runs).values(input).returning();
      if (!run) throw new Error('Run insert returned no row');
      return run;
    },
    async get(id: string) {
      const [run] = await db.select().from(runs).where(eq(runs.id, id)).limit(1);
      return run;
    },
    async createRevision(input: (typeof scenarioRevisions)['$inferInsert']) {
      const [revision] = await db.insert(scenarioRevisions).values(input).returning();
      if (!revision) throw new Error('Revision insert returned no row');
      return revision;
    },
  };
}

export async function applyStageIdempotently<T>(
  db: Database,
  input: {
    turnId: string;
    applicationKey: string;
    stage: string;
    output: T;
    inputSnapshot: unknown;
  },
): Promise<{ applied: boolean; output: T }> {
  return withTransactionRetry(db, async (tx) => {
    const [existing] = await tx
      .select()
      .from(turnStageResults)
      .where(
        and(
          eq(turnStageResults.turnId, input.turnId),
          eq(turnStageResults.applicationKey, input.applicationKey),
        ),
      )
      .limit(1);
    if (existing?.validatedOutput !== null && existing?.validatedOutput !== undefined)
      return { applied: false, output: existing.validatedOutput as T };
    const [inserted] = await tx
      .insert(turnStageResults)
      .values({
        id: `${input.turnId}_${input.applicationKey}`,
        turnId: input.turnId,
        stage: input.stage,
        inputSnapshot: input.inputSnapshot,
        validatedOutput: input.output,
        applicationKey: input.applicationKey,
        status: 'applied',
        attribution: { source: 'system', sourceIds: [] },
      })
      .onConflictDoNothing()
      .returning({ output: turnStageResults.validatedOutput });
    if (inserted) return { applied: true, output: inserted.output as T };
    const [winner] = await tx
      .select({ output: turnStageResults.validatedOutput })
      .from(turnStageResults)
      .where(
        and(
          eq(turnStageResults.turnId, input.turnId),
          eq(turnStageResults.applicationKey, input.applicationKey),
        ),
      )
      .limit(1);
    if (!winner) throw new Error('Stage result conflict without persisted winner');
    return { applied: false, output: winner.output as T };
  });
}

export async function appendTurnStreamEvent(
  db: Database,
  input: { turnId: string; eventKey: string; eventType: string; payload: unknown },
): Promise<void> {
  await db.insert(turnStreamEvents).values(input).onConflictDoNothing();
}
export async function replayTurnStreamEvents(db: Database, turnId: string, afterId = 0) {
  return db
    .select()
    .from(turnStreamEvents)
    .where(and(eq(turnStreamEvents.turnId, turnId), sql`${turnStreamEvents.id} > ${afterId}`))
    .orderBy(asc(turnStreamEvents.id));
}

export async function appendEventsWithProjection(
  db: Database,
  input: {
    runId: string;
    branchId: string;
    turnId: string;
    applicationKey: string;
    eventRows: (typeof events)['$inferInsert'][];
    entityState?: (typeof runEntityState)['$inferInsert'][];
    locationState?: (typeof runLocationState)['$inferInsert'][];
    storyCardState?: (typeof runStoryCardState)['$inferInsert'][];
  },
): Promise<{ applied: boolean; eventIds: string[] }> {
  return withRunAdvisoryLock(db, input.runId, async (tx) => {
    const [existing] = await tx
      .select({ id: turnStageResults.id, output: turnStageResults.validatedOutput })
      .from(turnStageResults)
      .where(eq(turnStageResults.applicationKey, input.applicationKey))
      .limit(1);
    if (existing)
      return {
        applied: false,
        eventIds: Array.isArray(existing.output)
          ? existing.output.filter((id): id is string => typeof id === 'string')
          : [],
      };
    const inserted = input.eventRows.length
      ? await tx.insert(events).values(input.eventRows).returning({ id: events.id })
      : [];
    if (input.entityState?.length)
      await tx
        .insert(runEntityState)
        .values(input.entityState)
        .onConflictDoUpdate({
          target: [runEntityState.runId, runEntityState.branchId, runEntityState.entityId],
          set: {
            state: sql`excluded.state`,
            version: sql`excluded.version`,
            updatedAt: new Date(),
          },
        });
    if (input.locationState?.length)
      await tx
        .insert(runLocationState)
        .values(input.locationState)
        .onConflictDoUpdate({
          target: [runLocationState.runId, runLocationState.branchId, runLocationState.locationId],
          set: {
            state: sql`excluded.state`,
            version: sql`excluded.version`,
            updatedAt: new Date(),
          },
        });
    if (input.storyCardState?.length)
      await tx
        .insert(runStoryCardState)
        .values(input.storyCardState)
        .onConflictDoUpdate({
          target: [runStoryCardState.runId, runStoryCardState.branchId, runStoryCardState.cardId],
          set: {
            state: sql`excluded.state`,
            version: sql`excluded.version`,
            updatedAt: new Date(),
          },
        });
    const eventIds = inserted.map((event) => event.id);
    await tx
      .insert(turnStageResults)
      .values({
        id: `${input.turnId}_${input.applicationKey}`,
        turnId: input.turnId,
        stage: 'EVENTS_COMMITTED',
        inputSnapshot: { runId: input.runId, branchId: input.branchId },
        validatedOutput: eventIds,
        applicationKey: input.applicationKey,
        status: 'applied',
        attribution: { source: 'resolver', sourceIds: eventIds },
      })
      .onConflictDoNothing();
    return { applied: true, eventIds };
  });
}

export function snapshotChecksum(serializedState: string): string {
  return createHash('sha256').update(serializedState, 'utf8').digest('hex');
}
