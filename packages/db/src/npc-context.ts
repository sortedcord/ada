import { and, desc, eq } from 'drizzle-orm';
import type { Database } from './index.js';
import {
  beliefs,
  innerThoughts,
  memories,
  observations,
  relationshipViews,
  runEntityState,
} from './schema.js';

export interface OwnerQuery {
  runId: string;
  branchId: string;
  ownerEntityId: string;
  limit?: number;
  beforeTurn?: number;
}

export class NpcContextRepository {
  constructor(private readonly db: Database) {}

  async getEntityRuntimeState(runId: string, branchId: string, entityId: string) {
    const [row] = await this.db
      .select()
      .from(runEntityState)
      .where(
        and(
          eq(runEntityState.runId, runId),
          eq(runEntityState.branchId, branchId),
          eq(runEntityState.entityId, entityId),
        ),
      )
      .limit(1);
    return row;
  }

  async getObservations(input: OwnerQuery) {
    return this.db
      .select()
      .from(observations)
      .where(
        and(
          eq(observations.runId, input.runId),
          eq(observations.branchId, input.branchId),
          eq(observations.observerEntityId, input.ownerEntityId),
        ),
      )
      .orderBy(desc(observations.observedTurn))
      .limit(input.limit ?? 15);
  }

  async getBeliefs(input: OwnerQuery) {
    return this.db
      .select()
      .from(beliefs)
      .where(
        and(
          eq(beliefs.runId, input.runId),
          eq(beliefs.branchId, input.branchId),
          eq(beliefs.ownerEntityId, input.ownerEntityId),
          eq(beliefs.status, 'active'),
        ),
      )
      .orderBy(desc(beliefs.salience))
      .limit(input.limit ?? 10);
  }

  async getMemories(input: OwnerQuery) {
    return this.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.runId, input.runId),
          eq(memories.branchId, input.branchId),
          eq(memories.ownerEntityId, input.ownerEntityId),
          eq(memories.lifecycleStatus, 'active'),
        ),
      )
      .orderBy(desc(memories.importance))
      .limit(input.limit ?? 12);
  }

  async getThoughts(input: OwnerQuery) {
    return this.db
      .select()
      .from(innerThoughts)
      .where(
        and(
          eq(innerThoughts.runId, input.runId),
          eq(innerThoughts.branchId, input.branchId),
          eq(innerThoughts.ownerEntityId, input.ownerEntityId),
          eq(innerThoughts.status, 'active'),
        ),
      )
      .orderBy(desc(innerThoughts.salience))
      .limit(input.limit ?? 6);
  }

  async getRelationshipViews(input: OwnerQuery) {
    return this.db
      .select()
      .from(relationshipViews)
      .where(
        and(
          eq(relationshipViews.runId, input.runId),
          eq(relationshipViews.branchId, input.branchId),
          eq(relationshipViews.ownerEntityId, input.ownerEntityId),
        ),
      )
      .limit(input.limit ?? 10);
  }
}
