import { describe, expect, it } from 'vitest';
import { InMemoryRetrievalService, normalizedContentHash } from './index.js';

describe('authorized retrieval', () => {
  it('filters private chunks before ranking and records an audit', async () => {
    const service = new InMemoryRetrievalService([
      {
        id: 'public',
        text: 'A public fact',
        scope: 'public_scenario',
        sourceType: 'scenario',
        sourceId: 's1',
        keywords: ['fact'],
        recency: 1,
        salience: 1,
      },
      {
        id: 'secret',
        text: 'NPC_A_SECRET_CANARY_ONLY',
        scope: 'entity_private',
        ownerEntityId: 'npc_b',
        sourceType: 'memory',
        sourceId: 'm1',
        keywords: ['fact'],
        recency: 1,
        salience: 1,
      },
    ]);
    const chunks = await service.retrieve({
      principal: { kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_a' },
      runId: 'run_1',
      branchId: 'branch_1',
      query: 'fact',
      maxCandidates: 20,
      maxSelected: 20,
    });
    expect(chunks.map((chunk) => chunk.id)).toEqual(['public']);
    expect(service.audits[0]?.selectedIds).toEqual(['public']);
    expect(normalizedContentHash('A  public fact')).toBe(normalizedContentHash('A public fact'));
  });
});
