import { describe, expect, it } from 'vitest';
import {
  KnowledgePolicy,
  canTransitionPlot,
  decayThought,
  fitContextBudget,
  stagnationScore,
  transitionPlot,
  updateRelationship,
  validateNpcPrincipalDecision,
  validateCanonicalPatch,
  validateThoughtBatch,
} from './policies.js';
import { innerThoughtSchema } from './runtime.js';
import type { Entity, PlotPoint, Relationship } from './scenario.js';

const metadata = () => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  schemaVersion: 1,
  attribution: { source: 'player' as const, sourceIds: [] },
});
const npc = { id: 'npc_1', cognitive: true, playable: false, active: true } as Entity;

describe('policy transitions', () => {
  it('fails closed for incomplete query principals and applies owner SQL scope', () => {
    const policy = new KnowledgePolicy();
    expect(() =>
      policy.queryScope({ kind: 'NPC', runId: '', branchId: 'branch_1', entityId: 'npc_1' }),
    ).toThrow();
    expect(
      policy.queryScope({ kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_1' })
        .ownerEntityId,
    ).toBe('npc_1');
  });

  it('rejects unsafe, stale, locked, and unavailable patches', () => {
    expect(() =>
      validateCanonicalPatch(
        { op: 'replace', path: '/entities/e1/active', value: true, expectedVersion: 0 },
        { minStat: -1, maxStat: 1 },
      ),
    ).toThrow();
    expect(() =>
      validateCanonicalPatch(
        { op: 'replace', path: '/entities/e1/active', value: true },
        { minStat: -1, maxStat: 1 },
        { actorPresent: false },
      ),
    ).toThrow();
    expect(() =>
      validateCanonicalPatch(
        { op: 'replace', path: '/entities/e1/active', value: true },
        { minStat: -1, maxStat: 1 },
        { lockedPaths: new Set(['/entities/e1/active']) },
      ),
    ).toThrow();
  });

  it('keeps plot transitions evidenced and terminal states terminal', () => {
    const point = { status: 'active', metadata: metadata() } as unknown as PlotPoint;
    expect(canTransitionPlot('active', 'resolved')).toBe(true);
    expect(canTransitionPlot('resolved', 'active')).toBe(false);
    expect(() => transitionPlot(point, 'resolved', [])).toThrow();
    expect(transitionPlot(point, 'resolved', ['event_1']).status).toBe('resolved');
  });

  it('bounds relationships, expires thoughts, and fits mandatory context', () => {
    const relationship = {
      dimensions: { trust: 0 },
      metadata: metadata(),
    } as unknown as Relationship;
    expect(updateRelationship(relationship, { trust: 1 }, 4).lastChangedTurn).toBe(4);
    expect(() => updateRelationship(relationship, { trust: 1.1 }, 4)).toThrow();
    const thought = innerThoughtSchema.parse({
      id: 'thought_1',
      ownerEntityId: 'npc_1',
      turnId: 'turn_1',
      text: 'watch',
      persistence: 'ephemeral',
      salience: 1,
      urgency: 1,
      emotionalValence: 0,
      emotionalIntensity: 0,
      expiresAtTurn: 2,
      decayRate: 0,
      reinforcementCount: 0,
      status: 'active',
      playerInspectable: true,
      visibility: 'entity_private',
      metadata: metadata(),
    });
    expect(decayThought(thought, 2).status).toBe('expired');
    expect(
      validateThoughtBatch([thought, { ...thought, id: 'thought_2' }], npc, 'player_1', 3),
    ).toHaveLength(1);
    expect(
      fitContextBudget(
        [
          { id: 'required', tokens: 10, rank: 1, mandatory: true },
          { id: 'optional', tokens: 100, rank: 2, mandatory: false },
        ],
        30,
        0,
        0,
      ).selected.map((candidate) => candidate.id),
    ).toEqual(['required']);
  });

  it('calculates deterministic stagnation', () => {
    const features = {
      turnsSinceSignificantChange: 10,
      turnsSinceGoalProgress: 10,
      repeatedPlayerIntents: 5,
      repeatedNpcNoActions: 5,
      activePlotsWithoutProgress: 5,
      unresolvedHooks: 10,
      dialogueOnlyStreak: 8,
      sceneDuration: 10,
    };
    expect(stagnationScore(features)).toBe(1);
  });

  it('enforces single-principal binding and evidence subset on NPC decisions', () => {
    const validDecision = {
      entityId: 'npc_1',
      attention: 'focused' as const,
      reaction: 'speak' as const,
      speech: 'Hello.',
      attemptedActions: [],
      generatedThoughts: [
        {
          text: 'I should speak carefully.',
          persistence: 'ephemeral' as const,
          salience: 0.8,
          urgency: 0.5,
        },
      ],
      beliefProposals: [],
      goalUpdates: [],
      perceivedEvidenceIds: ['obs_1'],
    };

    // Valid
    expect(() =>
      validateNpcPrincipalDecision(validDecision, {
        principalEntityId: 'npc_1',
        selectedPlayerEntityId: 'player_1',
        authorizedEvidenceIds: new Set(['obs_1', 'obs_2']),
      }),
    ).not.toThrow();

    // Principal mismatch
    expect(() =>
      validateNpcPrincipalDecision(validDecision, {
        principalEntityId: 'npc_2',
        selectedPlayerEntityId: 'player_1',
        authorizedEvidenceIds: new Set(['obs_1']),
      }),
    ).toThrow(/principal mismatch/);

    // Player control violation
    expect(() =>
      validateNpcPrincipalDecision(
        { ...validDecision, entityId: 'player_1' },
        {
          principalEntityId: 'player_1',
          selectedPlayerEntityId: 'player_1',
          authorizedEvidenceIds: new Set(['obs_1']),
        },
      ),
    ).toThrow();

    // Unauthorized evidence reference
    expect(() =>
      validateNpcPrincipalDecision(
        { ...validDecision, perceivedEvidenceIds: ['obs_unauthorized'] },
        {
          principalEntityId: 'npc_1',
          selectedPlayerEntityId: 'player_1',
          authorizedEvidenceIds: new Set(['obs_1']),
        },
      ),
    ).toThrow(/unauthorized evidence/);
  });
});
