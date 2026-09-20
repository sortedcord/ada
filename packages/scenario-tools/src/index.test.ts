import { describe, expect, it } from 'vitest';
import { applyOperationsToAggregate, validateOperations, type ScenarioOperation } from './index.js';
import type { ScenarioAggregate } from '@ada/domain';

const emptyAggregate = {
  scenario: { config: { retrieval: { maxSelected: 1, maxCandidates: 2 } }, startLocationId: 'missing' },
  entities: [],
  relationships: [],
  locations: [],
  locationEdges: [],
  storyCards: [],
  storyCardLinks: [],
  plotArcs: [],
  plotPoints: [],
} as unknown as ScenarioAggregate;

describe('scenario authoring operations', () => {
  it('applies a bundle in memory without mutating the source', () => {
    const operation: ScenarioOperation = { operation: 'add', collection: 'entities', value: { id: 'npc_new' } };
    const updated = applyOperationsToAggregate(emptyAggregate, [operation]);
    expect(updated.entities).toHaveLength(1);
    expect(emptyAggregate.entities).toHaveLength(0);
  });

  it('returns validation errors for an incomplete proposal instead of applying it', () => {
    const result = validateOperations(emptyAggregate, [{ operation: 'add', collection: 'entities', value: { id: 'npc_new' } }]);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
