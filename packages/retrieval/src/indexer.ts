import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '@ada/db';
import { retrievalChunks, chunkEmbeddings } from '@ada/db';
import { normalizedContentHash, type IndexedChunk } from './service.js';

export interface IndexChunkOptions {
  profileId?: string;
  modelId?: string;
  dimensions?: number;
  embeddingVector?: number[];
}

export async function indexRetrievalChunk(
  db: Database,
  chunk: IndexedChunk & {
    documentId: string;
    turnFrom?: number;
    turnTo?: number;
    sourceLinks?: unknown[];
    metadata?: Record<string, unknown>;
  },
  options: IndexChunkOptions = {},
): Promise<{ id: string; active: boolean; created: boolean }> {
  const hash = normalizedContentHash(chunk.text);

  const [existing] = await db
    .select()
    .from(retrievalChunks)
    .where(
      and(
        eq(retrievalChunks.documentId, chunk.documentId),
        eq(retrievalChunks.contentHash, hash),
      ),
    )
    .limit(1);

  if (existing) {
    if (!existing.active) {
      await db
        .update(retrievalChunks)
        .set({ active: true, updatedAt: new Date() })
        .where(eq(retrievalChunks.id, existing.id));
    }
    return { id: existing.id, active: true, created: false };
  }

  await db
    .update(retrievalChunks)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(retrievalChunks.documentId, chunk.documentId), eq(retrievalChunks.active, true)));

  const chunkId = chunk.id || `chunk:${chunk.documentId}:${hash.slice(0, 12)}`;
  const searchTerms = `${chunk.text} ${(chunk.keywords || []).join(' ')}`;

  await db
    .insert(retrievalChunks)
    .values({
      id: chunkId,
      documentId: chunk.documentId,
      text: chunk.text,
      searchVector: sql`to_tsvector('english', ${searchTerms})`,
      metadata: {
        ...(chunk.metadata || {}),
        sourceType: chunk.sourceType,
        sourceId: chunk.sourceId,
      },
      sourceLinks: chunk.sourceLinks || [],
      turnFrom: chunk.turnFrom ?? null,
      turnTo: chunk.turnTo ?? null,
      importance: chunk.salience ?? 0.5,
      salience: chunk.salience ?? 0.5,
      recencyAt: new Date(),
      contentHash: hash,
      visibility: chunk.scope,
      ownerEntityId: chunk.ownerEntityId || null,
      active: true,
      attribution: { source: 'system', sourceIds: [chunk.sourceId] },
    })
    .onConflictDoUpdate({
      target: [retrievalChunks.id],
      set: {
        active: true,
        text: chunk.text,
        searchVector: sql`to_tsvector('english', ${searchTerms})`,
        updatedAt: new Date(),
      },
    });

  if (options.profileId && options.embeddingVector) {
    await db
      .insert(chunkEmbeddings)
      .values({
        chunkId,
        embeddingProfileId: options.profileId,
        modelId: options.modelId || 'azure/text-embedding-ada-002',
        dimensions: options.dimensions || options.embeddingVector.length,
        embedding: options.embeddingVector,
        contentHash: hash,
        attribution: { source: 'system', sourceIds: [chunk.sourceId] },
      })
      .onConflictDoNothing();
  }

  return { id: chunkId, active: true, created: true };
}

export async function deactivateDocumentChunks(
  db: Database,
  documentId: string,
): Promise<number> {
  const result = await db
    .update(retrievalChunks)
    .set({ active: false, updatedAt: new Date() })
    .where(and(eq(retrievalChunks.documentId, documentId), eq(retrievalChunks.active, true)))
    .returning({ id: retrievalChunks.id });
  return result.length;
}
