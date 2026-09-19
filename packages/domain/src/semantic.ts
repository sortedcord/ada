import type { ScenarioAggregate } from './scenario.js';

function normalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalize);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(
        ([key]) =>
          ![
            'id',
            'revisionId',
            'createdAt',
            'updatedAt',
            'version',
            'createdBy',
            'updatedBy',
            'archivedAt',
            'archivedBy',
          ].includes(key),
      )
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, nested]) => [key, normalize(nested)]),
  );
}

export function semanticScenarioFingerprint(aggregate: ScenarioAggregate): string {
  return JSON.stringify(normalize(aggregate));
}
export function semanticallyEqualScenarios(
  left: ScenarioAggregate,
  right: ScenarioAggregate,
): boolean {
  return semanticScenarioFingerprint(left) === semanticScenarioFingerprint(right);
}
