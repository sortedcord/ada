import type { z } from 'zod';
import { scenarioExportSchema } from './api.js';

export type ScenarioExport = z.infer<typeof scenarioExportSchema>;

function assertSafeText(value: unknown): void {
  if (typeof value === 'string' && /<script|javascript:|onerror\s*=|onload\s*=/i.test(value))
    throw new Error('Scenario export contains an unsafe string');
  if (Array.isArray(value)) {
    value.forEach(assertSafeText);
    return;
  }
  if (value && typeof value === 'object') Object.values(value).forEach(assertSafeText);
}

export function migrateScenarioExport(input: unknown): ScenarioExport {
  if (!input || typeof input !== 'object') throw new Error('Scenario export must be an object');
  assertSafeText(input);
  const value = input as Record<string, unknown>;
  const schemaVersion = value.schemaVersion;
  if (schemaVersion === 'scenario.v1') return scenarioExportSchema.parse(value);
  if (schemaVersion === 'scenario.v0') {
    const migrated = { ...value, schemaVersion: 'scenario.v1' };
    return scenarioExportSchema.parse(migrated);
  }
  throw new Error('Unsupported scenario export schema');
}
