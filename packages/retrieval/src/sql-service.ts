import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { KnowledgePolicy } from '@ada/domain';
import type { Database } from '@ada/db';
import { retrievalChunks, retrievalAudit } from '@ada/db';
import { estimateTokens } from './service.js';
import type {
  RetrievalChunk,
  RetrievalRequest,
  RetrievalService,
  VisibilityScope,
} from './index.js';

export interface SqlRetrievalOptions {
  embeddingProfileId?: string;
  queryEmbedding?: number[];
  mandatoryChunkIds?: readonly string[];
  budgetTokens?: number;
  diversityCapPerSource?: number;
}

export class SqlRetrievalService implements RetrievalService {
  constructor(
    private readonly db: Database,
    private readonly policy = new KnowledgePolicy(),
  ) {}

  async retrieve(
    request: RetrievalRequest,
    options: SqlRetrievalOptions = {},
  ): Promise<readonly RetrievalChunk[]> {
    const startTime = Date.now();
    const scopeInfo = this.policy.queryScope(request.principal);
    const budgetTokens = options.budgetTokens ?? 24_000;
    const diversityCap = options.diversityCapPerSource ?? 5;

    const conditions = [
      eq(retrievalChunks.active, true),
      inArray(retrievalChunks.visibility, scopeInfo.allowedScopes),
    ];

    if (scopeInfo.ownerEntityId) {
      conditions.push(
        sql`(${retrievalChunks.ownerEntityId} IS NULL OR ${retrievalChunks.ownerEntityId} = ${scopeInfo.ownerEntityId})`,
      );
    }

    const query = request.query.trim();
    let candidates: Array<(typeof retrievalChunks)['$inferSelect'] & { rankScore?: number }> = [];

    if (query.length > 0) {
      const words = query
        .replace(/[^\w\s]/gi, ' ')
        .trim()
        .split(/\s+/)
        .filter((w) => w.length > 1);

      if (words.length > 0) {
        const tsQueryString = words.map((w) => `${w}:*`).join(' & ');
        candidates = await this.db
          .select({
            id: retrievalChunks.id,
            documentId: retrievalChunks.documentId,
            text: retrievalChunks.text,
            searchVector: retrievalChunks.searchVector,
            metadata: retrievalChunks.metadata,
            sourceLinks: retrievalChunks.sourceLinks,
            turnFrom: retrievalChunks.turnFrom,
            turnTo: retrievalChunks.turnTo,
            importance: retrievalChunks.importance,
            salience: retrievalChunks.salience,
            recencyAt: retrievalChunks.recencyAt,
            contentHash: retrievalChunks.contentHash,
            visibility: retrievalChunks.visibility,
            ownerEntityId: retrievalChunks.ownerEntityId,
            active: retrievalChunks.active,
            createdAt: retrievalChunks.createdAt,
            updatedAt: retrievalChunks.updatedAt,
            createdBy: retrievalChunks.createdBy,
            updatedBy: retrievalChunks.updatedBy,
            version: retrievalChunks.version,
            schemaVersion: retrievalChunks.schemaVersion,
            archivedAt: retrievalChunks.archivedAt,
            archivedBy: retrievalChunks.archivedBy,
            attribution: retrievalChunks.attribution,
            rankScore: sql<number>`ts_rank(${retrievalChunks.searchVector}, to_tsquery('english', ${tsQueryString}))`,
          })
          .from(retrievalChunks)
          .where(
            and(
              ...conditions,
              sql`${retrievalChunks.searchVector} @@ to_tsquery('english', ${tsQueryString})`,
            ),
          )
          .orderBy(
            desc(
              sql`ts_rank(${retrievalChunks.searchVector}, to_tsquery('english', ${tsQueryString}))`,
            ),
          )
          .limit(request.maxCandidates);
      }
    }

    if (candidates.length === 0) {
      candidates = await this.db
        .select()
        .from(retrievalChunks)
        .where(and(...conditions))
        .orderBy(desc(retrievalChunks.salience), desc(retrievalChunks.createdAt))
        .limit(request.maxCandidates);
    }

    let mandatoryChunks: (typeof retrievalChunks)['$inferSelect'][] = [];
    if (options.mandatoryChunkIds && options.mandatoryChunkIds.length > 0) {
      mandatoryChunks = await this.db
        .select()
        .from(retrievalChunks)
        .where(
          and(
            eq(retrievalChunks.active, true),
            inArray(retrievalChunks.id, [...options.mandatoryChunkIds]),
          ),
        );
    }

    const scores = new Map<string, number>();
    for (const c of candidates) {
      const lexicalScore = c.rankScore ?? 0.5;
      const salience = c.salience ?? 0.5;
      const score = lexicalScore * 0.6 + salience * 0.4;
      scores.set(c.id, score);
    }

    for (const m of mandatoryChunks) {
      scores.set(m.id, 999.0);
    }

    const pool = [
      ...mandatoryChunks,
      ...candidates.filter((c) => !mandatoryChunks.some((m) => m.id === c.id)),
    ];

    pool.sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0));

    const selected: (typeof retrievalChunks)['$inferSelect'][] = [];
    const sourceCounts = new Map<string, number>();
    let usedTokens = 0;

    for (const chunk of pool) {
      const isMandatory = mandatoryChunks.some((m) => m.id === chunk.id);
      const meta = chunk.metadata as { sourceType?: string } | null;
      const sourceKey = meta?.sourceType ?? chunk.documentId;
      const count = sourceCounts.get(sourceKey) ?? 0;

      if (!isMandatory && count >= diversityCap) {
        continue;
      }

      const chunkTokens = estimateTokens(chunk.text);
      if (
        !isMandatory &&
        (selected.length >= request.maxSelected || usedTokens + chunkTokens > budgetTokens)
      ) {
        continue;
      }

      selected.push(chunk);
      usedTokens += chunkTokens;
      sourceCounts.set(sourceKey, count + 1);
    }

    const selectedIds = selected.map((c) => c.id);
    const rejectedIds = pool.filter((c) => !selectedIds.includes(c.id)).map((c) => c.id);

    await this.db
      .insert(retrievalAudit)
      .values({
        id: `audit:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`,
        principal: request.principal,
        queryMetadata: {
          query: request.query,
          budgetTokens,
          maxCandidates: request.maxCandidates,
          maxSelected: request.maxSelected,
        },
        selectedChunkIds: selectedIds,
        rejectedChunkIds: rejectedIds,
        scores: Object.fromEntries(scores),
        budgetDecisions: {
          budgetTokens,
          usedTokens,
          selectedCount: selected.length,
        },
        durationMs: Date.now() - startTime,
        attribution: { source: 'system', sourceIds: [] },
      })
      .catch(() => {
        // Logging fallback
      });

    return selected.map((c) => {
      const item: {
        id: string;
        text: string;
        scope: VisibilityScope;
        score: number;
        ownerEntityId?: string;
      } = {
        id: c.id,
        text: c.text,
        scope: c.visibility as VisibilityScope,
        score: scores.get(c.id) ?? 0,
      };
      if (c.ownerEntityId) {
        item.ownerEntityId = c.ownerEntityId;
      }
      return item;
    });
  }
}
