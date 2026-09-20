import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@ada/db';
import { embeddingProfiles, chunkEmbeddings, retrievalChunks } from '@ada/db';

export interface CreateProfileParams {
  id: string;
  provider: string;
  modelId: string;
  dimensions?: number;
  distance?: 'cosine' | 'l2' | 'inner_product';
}

export class EmbeddingProfileManager {
  constructor(private readonly db: Database) {}

  /**
   * P8-030: Create, test, and register a new embedding profile.
   * Validates model, 1536 dimensions default, and sets initial status to 'staging'.
   */
  async createProfile(params: CreateProfileParams): Promise<typeof embeddingProfiles.$inferSelect> {
    const dimensions = params.dimensions ?? 1536;
    if (dimensions < 1 || dimensions > 16_000) {
      throw new Error('Unsupported embedding vector dimension');
    }

    const [profile] = await this.db
      .insert(embeddingProfiles)
      .values({
        id: params.id,
        provider: params.provider,
        modelId: params.modelId,
        dimensions,
        distance: params.distance ?? 'cosine',
        status: 'staging',
        generation: 1,
        active: false,
        attribution: { source: 'system', sourceIds: [] },
      })
      .returning();

    if (!profile) {
      throw new Error('Failed to create profile');
    }
    return profile;
  }

  /**
   * P8-035: Zero-downtime atomic profile switch.
   * Activates new profile and deactivates former active profile atomically.
   */
  async activateProfile(profileId: string): Promise<void> {
    const [target] = await this.db
      .select()
      .from(embeddingProfiles)
      .where(eq(embeddingProfiles.id, profileId))
      .limit(1);

    if (!target) {
      throw new Error(`Profile ${profileId} not found`);
    }

    // Atomically deactivate other active profiles and activate target
    await this.db.transaction(async (tx) => {
      await tx
        .update(embeddingProfiles)
        .set({ active: false, status: 'retired', updatedAt: new Date() })
        .where(eq(embeddingProfiles.active, true));

      await tx
        .update(embeddingProfiles)
        .set({ active: true, status: 'active', updatedAt: new Date() })
        .where(eq(embeddingProfiles.id, profileId));
    });
  }

  /**
   * Get the currently active profile or null if lexical-only mode.
   */
  async getActiveProfile(): Promise<typeof embeddingProfiles.$inferSelect | null> {
    const [active] = await this.db
      .select()
      .from(embeddingProfiles)
      .where(eq(embeddingProfiles.active, true))
      .limit(1);
    return active ?? null;
  }

  /**
   * P8-032: Changed-only embedding check.
   * Identifies chunks that do not yet have an embedding under the given profile or whose content hash changed.
   */
  async getUnembeddedChunks(profileId: string, limit = 100): Promise<Array<{ id: string; text: string; contentHash: string }>> {
    return this.db
      .select({
        id: retrievalChunks.id,
        text: retrievalChunks.text,
        contentHash: retrievalChunks.contentHash,
      })
      .from(retrievalChunks)
      .where(
        and(
          eq(retrievalChunks.active, true),
          sql`NOT EXISTS (
            SELECT 1 FROM ${chunkEmbeddings}
            WHERE ${chunkEmbeddings.chunkId} = ${retrievalChunks.id}
              AND ${chunkEmbeddings.embeddingProfileId} = ${profileId}
              AND ${chunkEmbeddings.contentHash} = ${retrievalChunks.contentHash}
          )`,
        ),
      )
      .limit(limit);
  }
}
