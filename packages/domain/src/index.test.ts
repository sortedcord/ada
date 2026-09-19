import { describe, expect, it } from 'vitest';
import { canAdvanceTurnStage, parseId } from './index.js';

describe('domain foundation', () => {
  it('parses bounded identifiers and rejects unsafe values', () => {
    expect(parseId('run_1', 'RunId')).toBe('run_1');
    expect(() => parseId('../secret', 'RunId')).toThrow('Invalid identifier');
  });

  it('allows only adjacent turn-stage transitions', () => {
    expect(canAdvanceTurnStage('ACCEPTED', 'INPUT_VALIDATED')).toBe(true);
    expect(canAdvanceTurnStage('ACCEPTED', 'COMPLETED')).toBe(false);
    expect(canAdvanceTurnStage('COMPLETED', 'ACCEPTED')).toBe(false);
  });
});
