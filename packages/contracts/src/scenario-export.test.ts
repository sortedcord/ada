import { describe, expect, it } from 'vitest';
import { migrateScenarioExport } from './scenario-export.js';

describe('scenario export migration', () => {
  it('accepts v1, migrates v0, and rejects unsafe strings', () => {
    const base = {
      kind: 'scenario',
      schemaVersion: 'scenario.v1',
      scenarioId: 'scenario_1',
      revision: 1,
      aggregate: {},
    };
    expect(migrateScenarioExport(base).schemaVersion).toBe('scenario.v1');
    expect(migrateScenarioExport({ ...base, schemaVersion: 'scenario.v0' }).schemaVersion).toBe(
      'scenario.v1',
    );
    expect(() =>
      migrateScenarioExport({ ...base, aggregate: { text: '<script>alert(1)</script>' } }),
    ).toThrow();
  });
});
