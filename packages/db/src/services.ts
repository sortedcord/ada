import { and, eq, lt, sql } from 'drizzle-orm';
import {
  KnowledgePolicy,
  validateThoughtBatch,
  type Belief,
  type Entity,
  type InnerThought,
  type Principal,
} from '@ada/domain';
import type { Database } from './index.js';
import {
  beliefs,
  innerThoughts,
  memories,
  outbox,
  runEntityState,
  runLocationState,
  runPortalState,
  runRelationshipState,
  runSnapshots,
  runStoryCardState,
  runs,
  retrievalChunks,
  storyCardVersions,
  storyCards,
} from './schema.js';
import { snapshotChecksum, withTransactionRetry } from './repositories.js';

const policy = new KnowledgePolicy();

export async function persistNpcThoughts(
  db: Database,
  input: {
    runId: string;
    branchId: string;
    owner: Entity;
    selectedPlayerEntityId: string;
    turnId: string;
    thoughts: readonly InnerThought[];
    limit: number;
  },
): Promise<void> {
  const valid = validateThoughtBatch(
    input.thoughts,
    input.owner,
    input.selectedPlayerEntityId,
    input.limit,
  );
  await db
    .insert(innerThoughts)
    .values(
      valid.map((thought) => ({
        id: thought.id,
        runId: input.runId,
        branchId: input.branchId,
        ownerEntityId: input.owner.id,
        turnId: input.turnId,
        triggeringEventId: thought.triggeringEventId,
        text: thought.text,
        persistence: thought.persistence,
        salience: thought.salience,
        urgency: thought.urgency,
        emotionalValence: thought.emotionalValence,
        emotionalIntensity: thought.emotionalIntensity,
        expiresAtTurn: thought.expiresAtTurn,
        reinforcementCount: thought.reinforcementCount,
        status: thought.status,
        playerInspectable: thought.playerInspectable,
        visibility: 'entity_private',
        attribution: { source: 'system', sourceIds: [input.turnId] },
      })),
    )
    .onConflictDoNothing();
}

export async function persistNpcThoughtsLegacy(
  db: Database,
  input: (typeof innerThoughts)['$inferInsert'],
): Promise<void> {
  await insertInnerThought(db, input);
}

export async function insertInnerThought(
  db: Database,
  input: (typeof innerThoughts)['$inferInsert'],
): Promise<void> {
  const [run] = await db
    .select({ playerEntityId: runs.playerEntityId })
    .from(runs)
    .where(eq(runs.id, input.runId))
    .limit(1);
  if (run?.playerEntityId === input.ownerEntityId)
    throw new Error('The selected player entity cannot have inner thoughts');
  if (input.visibility !== 'entity_private')
    throw new Error('Inner thoughts must remain entity-private');
  await db.insert(innerThoughts).values(input);
}

function requirePrivateRead(
  principal: Principal,
  ownerEntityId: string,
  runId: string,
  branchId: string,
): void {
  if (!policy.canRead(principal, { kind: 'entity_private', ownerEntityId, runId, branchId }))
    throw new Error('Private resource access denied');
}

export async function persistNpcBeliefs(
  db: Database,
  input: {
    runId: string;
    branchId: string;
    ownerEntityId: string;
    turn: number;
    beliefs: readonly Belief[];
  },
): Promise<void> {
  for (const belief of input.beliefs) {
    if (belief.ownerEntityId !== input.ownerEntityId || belief.evidence.length === 0)
      throw new Error('Belief proposal lacks owner-scoped evidence');
    await db
      .insert(beliefs)
      .values({
        id: belief.id,
        runId: input.runId,
        branchId: input.branchId,
        ownerEntityId: input.ownerEntityId,
        proposition: {
          subject: belief.subject,
          predicate: belief.predicate,
          object: belief.object,
        },
        rendering: belief.rendering,
        confidence: belief.confidence,
        status: belief.status,
        evidence: belief.evidence,
        salience: belief.salience,
        attribution: {
          source: 'memory_curator',
          sourceIds: belief.evidence.map((item) => item.id),
        },
      })
      .onConflictDoNothing();
  }
}

export async function applyNpcGoals(
  db: Database,
  input: {
    runId: string;
    branchId: string;
    entityId: string;
    expectedVersion: number;
    goals: readonly string[];
  },
): Promise<void> {
  const [current] = await db
    .select()
    .from(runEntityState)
    .where(
      and(
        eq(runEntityState.runId, input.runId),
        eq(runEntityState.branchId, input.branchId),
        eq(runEntityState.entityId, input.entityId),
      ),
    )
    .limit(1);
  if (!current || current.version !== input.expectedVersion)
    throw new Error('Stale NPC goal projection');
  const state = current.state as Record<string, unknown>;
  await db
    .update(runEntityState)
    .set({
      state: { ...state, goals: [...input.goals] },
      version: current.version + 1,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(runEntityState.runId, input.runId),
        eq(runEntityState.branchId, input.branchId),
        eq(runEntityState.entityId, input.entityId),
        eq(runEntityState.version, input.expectedVersion),
      ),
    );
}

export async function readPrivateMemories(
  db: Database,
  principal: Principal,
  ownerEntityId: string,
  runId: string,
  branchId: string,
) {
  requirePrivateRead(principal, ownerEntityId, runId, branchId);
  return db
    .select()
    .from(memories)
    .where(
      and(
        eq(memories.runId, runId),
        eq(memories.branchId, branchId),
        eq(memories.ownerEntityId, ownerEntityId),
      ),
    );
}
export async function readPrivateBeliefs(
  db: Database,
  principal: Principal,
  ownerEntityId: string,
  runId: string,
  branchId: string,
) {
  requirePrivateRead(principal, ownerEntityId, runId, branchId);
  return db
    .select()
    .from(beliefs)
    .where(
      and(
        eq(beliefs.runId, runId),
        eq(beliefs.branchId, branchId),
        eq(beliefs.ownerEntityId, ownerEntityId),
      ),
    );
}
export async function readPrivateThoughts(
  db: Database,
  principal: Principal,
  ownerEntityId: string,
  runId: string,
  branchId: string,
) {
  requirePrivateRead(principal, ownerEntityId, runId, branchId);
  return db
    .select()
    .from(innerThoughts)
    .where(
      and(
        eq(innerThoughts.runId, runId),
        eq(innerThoughts.branchId, branchId),
        eq(innerThoughts.ownerEntityId, ownerEntityId),
        eq(innerThoughts.visibility, 'entity_private'),
      ),
    );
}

export async function rollbackStoryCard(
  db: Database,
  input: { cardId: string; sourceVersion: number; outboxKey: string },
): Promise<{ version: number }> {
  return withTransactionRetry(db, async (tx) => {
    const [card] = await tx
      .select()
      .from(storyCards)
      .where(eq(storyCards.id, input.cardId))
      .limit(1);
    const [source] = await tx
      .select()
      .from(storyCardVersions)
      .where(
        and(
          eq(storyCardVersions.cardId, input.cardId),
          eq(storyCardVersions.version, input.sourceVersion),
        ),
      )
      .limit(1);
    if (!card || !source) throw new Error('Story-card version not found');
    const nextVersion = card.currentVersion + 1;
    await tx.insert(storyCardVersions).values({
      id: `${input.cardId}_v${nextVersion}`,
      cardId: input.cardId,
      version: nextVersion,
      body: source.body,
      scope: source.scope,
      source: 'rollback',
      diff: { rollbackFrom: input.sourceVersion },
      attribution: { source: 'mutation', sourceIds: [source.id] },
    });
    await tx
      .update(storyCards)
      .set({ currentVersion: nextVersion, version: nextVersion, updatedAt: new Date() })
      .where(
        and(eq(storyCards.id, input.cardId), eq(storyCards.currentVersion, card.currentVersion)),
      );
    await tx
      .insert(outbox)
      .values({
        id: `${input.cardId}_${input.outboxKey}`,
        topic: 'story-card.reindex',
        key: input.outboxKey,
        payload: { cardId: input.cardId, version: nextVersion },
        attribution: { source: 'mutation', sourceIds: [input.cardId] },
      })
      .onConflictDoNothing();
    return { version: nextVersion };
  });
}

export async function mutateStoryCard(
  db: Database,
  input: {
    cardId: string;
    expectedVersion: number;
    nextBody: unknown;
    scope: string;
    source: string;
    diff: unknown;
    outboxKey: string;
  },
): Promise<{ version: number }> {
  return withTransactionRetry(db, async (tx) => {
    const [card] = await tx
      .select()
      .from(storyCards)
      .where(eq(storyCards.id, input.cardId))
      .limit(1);
    if (!card || card.currentVersion !== input.expectedVersion)
      throw new Error('Stale story-card version');
    if (card.locked || card.mutationPolicy === 'static' || card.mutationPolicy === 'manual_only')
      throw new Error('Story-card mutation is not permitted');
    const nextVersion = input.expectedVersion + 1;
    await tx.insert(storyCardVersions).values({
      id: `${input.cardId}_v${nextVersion}`,
      cardId: input.cardId,
      version: nextVersion,
      body: input.nextBody,
      scope: input.scope,
      source: input.source,
      diff: input.diff,
      attribution: { source: input.source, sourceIds: [] },
    });
    const updated = await tx
      .update(storyCards)
      .set({ currentVersion: nextVersion, version: nextVersion, updatedAt: new Date() })
      .where(
        and(eq(storyCards.id, input.cardId), eq(storyCards.currentVersion, input.expectedVersion)),
      )
      .returning({ id: storyCards.id });
    if (!updated.length) throw new Error('Story-card version changed during mutation');
    await tx
      .update(retrievalChunks)
      .set({ active: false, updatedAt: new Date() })
      .where(sql`(${retrievalChunks.metadata} ->> 'cardId') = ${input.cardId}`);
    await tx
      .insert(outbox)
      .values({
        id: `${input.cardId}_${input.outboxKey}`,
        topic: 'story-card.reindex',
        key: input.outboxKey,
        payload: { cardId: input.cardId, version: nextVersion },
        attribution: { source: 'mutation', sourceIds: [input.cardId] },
      })
      .onConflictDoNothing();
    return { version: nextVersion };
  });
}

export interface SnapshotState {
  entities?: (typeof runEntityState)['$inferInsert'][];
  locations?: (typeof runLocationState)['$inferInsert'][];
  portals?: (typeof runPortalState)['$inferInsert'][];
  relationships?: (typeof runRelationshipState)['$inferInsert'][];
  storyCards?: (typeof runStoryCardState)['$inferInsert'][];
}
export async function createSnapshot(
  db: Database,
  input: {
    id: string;
    runId: string;
    branchId: string;
    turn: number;
    state: SnapshotState;
    projectionVersions: Record<string, number>;
    schemaVersion: number;
  },
): Promise<{ id: string; checksum: string }> {
  const serializedState = JSON.stringify(input.state);
  const checksum = snapshotChecksum(serializedState);
  await db.insert(runSnapshots).values({
    id: input.id,
    runId: input.runId,
    branchId: input.branchId,
    turn: input.turn,
    projectionVersions: input.projectionVersions,
    checksum,
    serializedState,
    schemaVersion: input.schemaVersion,
    attribution: { source: 'system', sourceIds: [] },
  });
  return { id: input.id, checksum };
}
export async function restoreSnapshot(
  db: Database,
  snapshotId: string,
  expectedSchemaVersion: number,
): Promise<SnapshotState> {
  const [snapshot] = await db
    .select()
    .from(runSnapshots)
    .where(eq(runSnapshots.id, snapshotId))
    .limit(1);
  if (!snapshot) throw new Error('Snapshot not found');
  if (snapshot.schemaVersion !== expectedSchemaVersion)
    throw new Error('Snapshot schema version is incompatible');
  if (snapshotChecksum(snapshot.serializedState) !== snapshot.checksum)
    throw new Error('Snapshot checksum mismatch');
  const state = JSON.parse(snapshot.serializedState) as SnapshotState;
  await withTransactionRetry(db, async (tx) => {
    for (const row of state.entities ?? [])
      await tx
        .insert(runEntityState)
        .values(row)
        .onConflictDoUpdate({
          target: [runEntityState.runId, runEntityState.branchId, runEntityState.entityId],
          set: { state: row.state, version: row.version, updatedAt: new Date() },
        });
    for (const row of state.relationships ?? [])
      await tx
        .insert(runRelationshipState)
        .values(row)
        .onConflictDoUpdate({
          target: [
            runRelationshipState.runId,
            runRelationshipState.branchId,
            runRelationshipState.relationshipId,
          ],
          set: { state: row.state, version: row.version, updatedAt: new Date() },
        });
    for (const row of state.locations ?? [])
      await tx
        .insert(runLocationState)
        .values(row)
        .onConflictDoUpdate({
          target: [runLocationState.runId, runLocationState.branchId, runLocationState.locationId],
          set: { state: row.state, version: row.version, updatedAt: new Date() },
        });
    for (const row of state.portals ?? [])
      await tx
        .insert(runPortalState)
        .values(row)
        .onConflictDoUpdate({
          target: [runPortalState.runId, runPortalState.branchId, runPortalState.portalId],
          set: {
            state: row.state,
            transmission: row.transmission,
            version: row.version,
            updatedAt: new Date(),
          },
        });
    for (const row of state.storyCards ?? [])
      await tx
        .insert(runStoryCardState)
        .values(row)
        .onConflictDoUpdate({
          target: [runStoryCardState.runId, runStoryCardState.branchId, runStoryCardState.cardId],
          set: { state: row.state, version: row.version, updatedAt: new Date() },
        });
  });
  return state;
}

export async function claimOutboxBatch(db: Database, limit = 50) {
  return withTransactionRetry(db, async (tx) =>
    tx
      .select()
      .from(outbox)
      .where(and(eq(outbox.status, 'pending'), lt(outbox.availableAt, new Date())))
      .limit(limit)
      .for('update', { skipLocked: true }),
  );
}
export async function completeOutbox(db: Database, id: string): Promise<void> {
  await db
    .update(outbox)
    .set({ status: 'processed', processedAt: new Date(), updatedAt: new Date() })
    .where(eq(outbox.id, id));
}
export async function failOutbox(db: Database, id: string, retryAt: Date): Promise<void> {
  await db
    .update(outbox)
    .set({
      status: 'pending',
      availableAt: retryAt,
      attempts: sql`${outbox.attempts} + 1`,
      updatedAt: new Date(),
    })
    .where(eq(outbox.id, id));
}
