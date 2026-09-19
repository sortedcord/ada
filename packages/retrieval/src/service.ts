import { createHash } from 'node:crypto';
import { KnowledgePolicy, type Principal } from '@ada/domain';
import type {
  RetrievalChunk,
  RetrievalRequest,
  RetrievalService,
  VisibilityScope,
} from './index.js';

export interface IndexedChunk extends Omit<RetrievalChunk, 'score'> {
  readonly sourceType: string;
  readonly sourceId: string;
  readonly keywords: readonly string[];
  readonly recency: number;
  readonly salience: number;
  readonly ownerEntityId?: string;
}
export interface RetrievalAudit {
  principal: Principal;
  selectedIds: string[];
  rejectedIds: string[];
  scores: Record<string, number>;
}
function normalize(text: string): string[] {
  return text
    .toLocaleLowerCase()
    .normalize('NFKC')
    .split(/[^\p{L}\p{N}]+/u)
    .filter((token) => token.length > 1);
}
export function normalizedContentHash(text: string): string {
  return createHash('sha256').update(text.trim().replace(/\s+/g, ' ')).digest('hex');
}
export function estimateTokens(text: string): number {
  return Math.max(1, Math.ceil(text.length / 4));
}
export function scopeForChunk(chunk: IndexedChunk): VisibilityScope {
  if (!chunk.scope) throw new Error('Retrieval chunk scope is required');
  return chunk.scope;
}

export class InMemoryRetrievalService implements RetrievalService {
  readonly audits: RetrievalAudit[] = [];
  constructor(
    private readonly chunks: readonly IndexedChunk[],
    private readonly policy = new KnowledgePolicy(),
  ) {}
  async retrieve(
    request: RetrievalRequest & { principal: Principal; budgetTokens?: number },
  ): Promise<readonly RetrievalChunk[]> {
    await Promise.resolve();
    const authorized = this.chunks.filter((chunk) =>
      this.policy.canRead(request.principal, {
        kind: scopeForChunk(chunk),
        ...(request.runId ? { runId: request.runId } : {}),
        ...(request.branchId ? { branchId: request.branchId } : {}),
        ...(chunk.ownerEntityId ? { ownerEntityId: chunk.ownerEntityId } : {}),
      }),
    );
    const queryTokens = new Set(normalize(request.query));
    const scores = new Map<string, number>();
    for (const chunk of authorized) {
      const tokens = new Set([...normalize(chunk.text), ...chunk.keywords.flatMap(normalize)]);
      const overlap = [...queryTokens].filter((token) => tokens.has(token)).length;
      scores.set(
        chunk.id,
        overlap / Math.max(1, queryTokens.size) + chunk.recency * 0.2 + chunk.salience * 0.2,
      );
    }
    const ranked = authorized
      .filter((chunk) => (scores.get(chunk.id) ?? 0) > 0 || request.query.trim() === '')
      .sort((a, b) => (scores.get(b.id) ?? 0) - (scores.get(a.id) ?? 0) || b.recency - a.recency);
    const selected: IndexedChunk[] = [];
    let tokens = 0;
    const budget = request.budgetTokens ?? 24_000;
    for (const chunk of ranked.slice(0, request.maxCandidates)) {
      const next = estimateTokens(chunk.text);
      if (selected.length >= request.maxSelected || tokens + next > budget) continue;
      selected.push(chunk);
      tokens += next;
    }
    this.audits.push({
      principal: request.principal,
      selectedIds: selected.map((chunk) => chunk.id),
      rejectedIds: this.chunks
        .filter((chunk) => !selected.some((selectedChunk) => selectedChunk.id === chunk.id))
        .map((chunk) => chunk.id),
      scores: Object.fromEntries(scores),
    });
    return selected.map((chunk) => ({
      id: chunk.id,
      text: chunk.text,
      scope: chunk.scope,
      ...(chunk.ownerEntityId ? { ownerEntityId: chunk.ownerEntityId } : {}),
      score: scores.get(chunk.id) ?? 0,
    }));
  }
}
