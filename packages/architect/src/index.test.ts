import { describe, expect, it } from 'vitest';
import { architectTick, initialArchitectState, validateArchitectGuidance, evaluatePlotPoint, validateSuddenEventProposal, applyPlotEvaluation, critiqueStoryCardMutation, mutationTriggerReasons } from './index.js';

describe('phase 9 architect policies', () => {
  it('creates pacing state and only intervenes after threshold/cooldown rules', () => {
    const state = initialArchitectState([], { tensionTarget: 0.5 });
    const result = architectTick(state, { turn: 10, turnsSinceSignificantChange: 10, turnsSinceGoalProgress: 10, repeatedPlayerIntents: 5, repeatedNpcNoActions: 5, activePlotsWithoutProgress: 5, unresolvedHooks: 10, dialogueOnlyStreak: 8, sceneDuration: 10 }, { tensionTarget: 0.5, interventionCooldownTurns: 3, interventionThreshold: 0.7 });
    expect(result.shouldIntervene).toBe(true);
    expect(result.state.interventionBudget).toBe(0);
  });
  it('rejects player-control guidance', () => {
    expect(validateArchitectGuidance(['The player must choose the north door.']).valid).toBe(false);
    expect(validateArchitectGuidance(['The player could investigate the seal.', 'An alternative is to wait.']).affordanceCount).toBe(2);
  });
  it('requires evidence for plot resolution and multiple affordances for sudden events', () => {
    expect(evaluatePlotPoint({ status: 'active', preconditions: [], resolutionConditions: ['seal_found'], forbiddenOutcomes: [] }, new Set(['seal_found']), ['event_1']).status).toBe('resolved');
    const state = initialArchitectState([]);
    expect(applyPlotEvaluation(state, 'plot_1', { status: 'active', evidenceIds: ['event_1'], reason: 'evidence' }).activePlotPoints).toContain('plot_1');
    expect(() => validateSuddenEventProposal({ rationale: 'pressure', eventType: 'alarm', participantIds: ['npc_1'], locationId: 'loc_1', severity: 0.8, affordances: ['run'], dependencyIds: [], cooldownTurns: 3, sourceIds: ['event_1'] }, new Set(['event_1']))).toThrow();
    const critique = critiqueStoryCardMutation({ cardId: 'card_1', expectedVersion: 1, mode: 'ai_mutable', locked: false, path: '/canonicalBody', sourceIds: ['event_1'], sourceScopes: ['public_scenario'], targetScope: 'public_scenario', confidence: 0.9 }, new Set(['event_1']));
    expect(critique.canAutoApply).toBe(true);
    expect(mutationTriggerReasons({ entityChanged: true, explicitRefresh: true })).toEqual(['entity-change', 'explicit-refresh']);
  });
  it('respects authored plot transition graph and never promotes without matching evidence', () => {
    const point = { status: 'proposed' as const, preconditions: ['key_found'], resolutionConditions: ['door_open'], forbiddenOutcomes: ['key_lost'] };
    expect(evaluatePlotPoint(point, new Set(['door_open']), ['event_1']).status).toBe('unchanged');
    expect(evaluatePlotPoint(point, new Set(['key_lost']), ['event_1']).status).toBe('unchanged');
    expect(evaluatePlotPoint(point, new Set(['key_found']), ['event_1']).status).toBe('available');
    expect(evaluatePlotPoint({ ...point, status: 'available' }, new Set(['key_found']), ['event_1']).status).toBe('active');
    expect(evaluatePlotPoint({ ...point, status: 'active' }, new Set(['key_lost']), ['event_2']).status).toBe('failed');
    expect(evaluatePlotPoint({ ...point, status: 'resolved' }, new Set(['key_lost']), ['event_2']).status).toBe('unchanged');
    expect(evaluatePlotPoint({ ...point, status: 'available' }, new Set(), []).status).toBe('unchanged');
    expect(evaluatePlotPoint({ ...point, status: 'available', preconditions: [] }, new Set(), ['unrelated_event']).status).toBe('unchanged');
  });
  it('removes activated plots from future beats and includes newly available plots', () => {
    const initial = initialArchitectState([]);
    const available = applyPlotEvaluation(initial, 'plot_1', { status: 'available', evidenceIds: ['event_1'], reason: 'evidence' });
    expect(available.futureBeats).toContain('plot_1');
    const active = applyPlotEvaluation(available, 'plot_1', { status: 'active', evidenceIds: ['event_1'], reason: 'evidence' });
    expect(active.futureBeats).not.toContain('plot_1');
    expect(active.activePlotPoints).toContain('plot_1');
    const resolved = applyPlotEvaluation(active, 'plot_1', { status: 'resolved', evidenceIds: ['event_2'], reason: 'evidence' });
    expect(resolved.activePlotPoints).not.toContain('plot_1');
    expect(resolved.futureBeats).not.toContain('plot_1');
  });
});
