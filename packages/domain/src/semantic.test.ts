import { describe, expect, it } from 'vitest';
import { semanticallyEqualScenarios, type ScenarioAggregate } from './index.js';

describe('semantic scenario comparison', () => {
  it('ignores generated IDs and metadata while preserving authored content', () => {
    const left = {
      scenario: {
        id: 'scenario_1',
        revisionId: 'revision_1',
        title: 'Fixture',
        metadata: { version: 1 },
      },
      entities: [],
    } as unknown as ScenarioAggregate;
    const right = structuredClone(left);
    right.scenario.id = 'different_scenario';
    right.scenario.revisionId = 'different_revision';
    right.scenario.metadata.version = 99;
    expect(semanticallyEqualScenarios(left, right)).toBe(true);
    right.scenario.title = 'Changed authored content';
    expect(semanticallyEqualScenarios(left, right)).toBe(false);
  });
});
