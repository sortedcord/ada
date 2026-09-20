import { and, eq } from 'drizzle-orm';
import type { Database } from '@ada/db';
import { memories, innerThoughts } from '@ada/db';

export interface MemoryCuratorOptions {
  currentTurn: number;
}

export class MemoryCuratorService {
  constructor(private readonly db: Database) {}

  async decayEntityMemories(
    ownerEntityId: string,
    runId: string,
    branchId: string,
    currentTurn: number,
  ): Promise<number> {
    const activeMemories = await this.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.runId, runId),
          eq(memories.branchId, branchId),
          eq(memories.ownerEntityId, ownerEntityId),
          eq(memories.lifecycleStatus, 'active'),
        ),
      );

    let updatedCount = 0;
    for (const mem of activeMemories) {
      const currentAccessibility = mem.accessibility;
      const elapsed = Math.max(0, currentTurn - (mem.reinforcedTurn || 0));
      const newAccessibility = Math.max(
        0,
        currentAccessibility * Math.exp(-mem.decayRate * elapsed),
      );

      if (newAccessibility < 0.05) {
        await this.db
          .update(memories)
          .set({ lifecycleStatus: 'forgotten', accessibility: 0, updatedAt: new Date() })
          .where(eq(memories.id, mem.id));
        updatedCount++;
      } else if (Math.abs(newAccessibility - currentAccessibility) > 0.01) {
        await this.db
          .update(memories)
          .set({ accessibility: newAccessibility, updatedAt: new Date() })
          .where(eq(memories.id, mem.id));
        updatedCount++;
      }
    }
    return updatedCount;
  }

  async expireEntityThoughts(
    ownerEntityId: string,
    runId: string,
    branchId: string,
    currentTurn: number,
  ): Promise<number> {
    const activeThoughts = await this.db
      .select()
      .from(innerThoughts)
      .where(
        and(
          eq(innerThoughts.runId, runId),
          eq(innerThoughts.branchId, branchId),
          eq(innerThoughts.ownerEntityId, ownerEntityId),
          eq(innerThoughts.status, 'active'),
          eq(innerThoughts.persistence, 'ephemeral'),
        ),
      );

    let expiredCount = 0;
    for (const th of activeThoughts) {
      if (
        th.expiresAtTurn !== null &&
        th.expiresAtTurn !== undefined &&
        currentTurn >= th.expiresAtTurn
      ) {
        await this.db
          .update(innerThoughts)
          .set({ status: 'expired', updatedAt: new Date() })
          .where(eq(innerThoughts.id, th.id));
        expiredCount++;
      }
    }
    return expiredCount;
  }

  async consolidateDuplicateMemories(
    ownerEntityId: string,
    runId: string,
    branchId: string,
  ): Promise<number> {
    const allMemories = await this.db
      .select()
      .from(memories)
      .where(
        and(
          eq(memories.runId, runId),
          eq(memories.branchId, branchId),
          eq(memories.ownerEntityId, ownerEntityId),
          eq(memories.lifecycleStatus, 'active'),
        ),
      );

    const seen = new Map<string, (typeof memories)['$inferSelect']>();
    let consolidatedCount = 0;

    for (const mem of allMemories) {
      const key = `${mem.memoryType}:${mem.content.trim().toLowerCase()}`;
      const existing = seen.get(key);
      if (existing) {
        await this.db
          .update(memories)
          .set({ lifecycleStatus: 'superseded', updatedAt: new Date() })
          .where(eq(memories.id, mem.id));

        await this.db
          .update(memories)
          .set({
            importance: Math.max(existing.importance, mem.importance),
            accessibility: Math.min(1.0, existing.accessibility + 0.1),
            updatedAt: new Date(),
          })
          .where(eq(memories.id, existing.id));

        consolidatedCount++;
      } else {
        seen.set(key, mem);
      }
    }
    return consolidatedCount;
  }
}
