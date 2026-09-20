import { describe, expect, it } from 'vitest';
import type { Entity, Memory, InnerThought } from '@ada/domain';
import {
  InMemoryRetrievalService,
  normalizedContentHash,
  projectEntity,
  projectMemory,
  projectThought,
} from './index.js';

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

  it('P8-001/P8-002: separates projected chunks by visibility scope and never leaks private secrets to public scope', () => {
    const entity = {
      id: 'npc_alice',
      revisionId: 'rev_1',
      name: 'Alice',
      aliases: [],
      pronouns: 'she/her',
      kind: 'character',
      tags: [],
      publicDescription: 'A renowned scholar',
      privateDescription: 'A secret double agent',
      appearance: '',
      history: '',
      historicalEvents: [],
      personality: [],
      speechStyle: '',
      values: [],
      drives: [],
      goals: [],
      fears: [],
      desires: [],
      capabilities: [],
      limitations: [],
      secrets: ['CANARY_SECRET_ALICE'],
      stats: {},
      structuredAttributes: {},
      constraints: [],
      aiMutationPolicy: 'manual_only',
      playable: false,
      cognitive: true,
      alive: true,
      active: true,
      startingLocationId: 'loc_1',
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'system' as const, sourceIds: [] },
      },
    } satisfies Entity;

    const chunks = projectEntity(entity);
    expect(chunks).toHaveLength(2);

    const publicChunk = chunks.find((c) => c.scope === 'public_scenario');
    const privateChunk = chunks.find((c) => c.scope === 'entity_private');

    expect(publicChunk).toBeDefined();
    expect(publicChunk?.text).toContain('A renowned scholar');
    expect(publicChunk?.text).not.toContain('CANARY_SECRET_ALICE');
    expect(publicChunk?.text).not.toContain('secret double agent');

    expect(privateChunk).toBeDefined();
    expect(privateChunk?.ownerEntityId).toBe('npc_alice');
    expect(privateChunk?.text).toContain('CANARY_SECRET_ALICE');
    expect(privateChunk?.text).toContain('secret double agent');
  });

  it('P8-003: semantic chunkers create individual discrete chunks for memories and thoughts', () => {
    const memory = {
      id: 'mem_1',
      ownerEntityId: 'npc_bob',
      type: 'episodic',
      sourceObservationIds: [],
      sourceEventIds: [],
      sourceThoughtIds: [],
      content: 'Bob saw Charlie hide the key.',
      importance: 0.9,
      emotionalValence: 0,
      emotionalIntensity: 0,
      confidence: 1,
      accessibility: 0.8,
      createdTurn: 1,
      reinforcedTurn: 1,
      decayRate: 0.05,
      status: 'active',
      visibility: 'entity_private',
      version: 1,
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'system' as const, sourceIds: [] },
      },
    } satisfies Memory;

    const memChunks = projectMemory(memory);
    expect(memChunks).toHaveLength(1);
    expect(memChunks[0]?.ownerEntityId).toBe('npc_bob');
    expect(memChunks[0]?.scope).toBe('entity_private');
    expect(memChunks[0]?.text).toContain('Bob saw Charlie hide the key.');

    const thought = {
      id: 'th_1',
      ownerEntityId: 'npc_bob',
      turnId: 'turn_1',
      text: 'I must remain quiet.',
      persistence: 'ephemeral',
      salience: 0.7,
      urgency: 0.5,
      emotionalValence: 0,
      emotionalIntensity: 0,
      status: 'active',
      decayRate: 0.1,
      reinforcementCount: 0,
      playerInspectable: true,
      visibility: 'entity_private',
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'system' as const, sourceIds: [] },
      },
    } satisfies InnerThought;

    const thoughtChunks = projectThought(thought);
    expect(thoughtChunks).toHaveLength(1);
    expect(thoughtChunks[0]?.ownerEntityId).toBe('npc_bob');
    expect(thoughtChunks[0]?.scope).toBe('entity_private');
    expect(thoughtChunks[0]?.text).toContain('I must remain quiet.');
  });
});
