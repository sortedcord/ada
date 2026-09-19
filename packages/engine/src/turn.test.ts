import { describe, expect, it } from 'vitest';
import type { Entity } from '@ada/domain';
import { parseExplicitPlayerIntent } from './intent.js';
import { executeNpcDecisions, selectNpcCandidates } from './npc.js';
import { interpretEligibleObservations } from './perception.js';
import {
  InMemoryStageStore,
  TurnMachine,
  deterministicRandom,
  independentNpcCalls,
} from './turn.js';

describe('turn workflow foundation', () => {
  it('rejects invalid stages and applies idempotent stage keys', () => {
    const machine = new TurnMachine('turn_1');
    machine.advance('INPUT_VALIDATED');
    expect(() => machine.advance('COMPLETED')).toThrow();
    const store = new InMemoryStageStore();
    const first = store.apply({
      turnId: 'turn_1',
      stage: 'INPUT_VALIDATED',
      applicationKey: 'key',
      output: { ok: true },
    });
    const second = store.apply({
      turnId: 'turn_1',
      stage: 'INPUT_VALIDATED',
      applicationKey: 'key',
      output: { ok: false },
    });
    expect(first).toEqual(second);
  });
  it('parses explicit commands without inventing player cognition', () => {
    expect(parseExplicitPlayerIntent('/look')).toMatchObject({ meta: true, action: 'look' });
    expect(parseExplicitPlayerIntent('I wait')).toMatchObject({
      meta: false,
      action: 'freeform',
      speech: 'I wait',
    });
  });
  it('never selects the player and uses stable relevance ordering', () => {
    const entity = (id: string) => ({ id, cognitive: true, active: true }) as Entity;
    expect(
      selectNpcCandidates(
        [
          {
            entity: entity('player'),
            targeted: true,
            present: true,
            remoteContact: false,
            triggeredPlan: false,
            relevance: 10,
          },
          {
            entity: entity('npc'),
            targeted: false,
            present: true,
            remoteContact: false,
            triggeredPlan: false,
            relevance: 1,
          },
        ],
        'player',
        4,
      ),
    ).toEqual([{ entityId: 'npc', reason: 'present', score: 1.5 }]);
  });
  it('executes independent NPC decisions in stable order and ordered calls sequentially', async () => {
    const calls: string[] = [];
    const results = await executeNpcDecisions(
      ['b', 'a'],
      (id) => {
        calls.push(id);
        return Promise.resolve(id);
      },
      { independent: false },
    );
    expect([...results.keys()]).toEqual(['a', 'b']);
    expect(calls).toEqual(['a', 'b']);
  });
  it('never adds observations for ineligible observers', () => {
    expect(
      interpretEligibleObservations(
        [
          { observerEntityId: 'a', eligible: true, content: 'seen' },
          { observerEntityId: 'b', eligible: false, content: 'hidden' },
        ],
        { a: 'interpreted', b: 'leaked' },
      ),
    ).toEqual([{ observerEntityId: 'a', eligible: true, content: 'interpreted' }]);
  });
  it('uses deterministic randomness and bounded independent NPC calls', () => {
    const left = deterministicRandom(7);
    const right = deterministicRandom(7);
    expect([left(), left(), left()]).toEqual([right(), right(), right()]);
    expect(independentNpcCalls(['a', 'a', 'b'], 1)).toEqual(['a']);
  });
});
