import { assertStageTransition, canAdvanceTurnStage, type TurnStage } from '@ada/domain';

export interface DurableStageResult {
  readonly turnId: string;
  readonly stage: TurnStage;
  readonly applicationKey: string;
  readonly output: unknown;
  readonly applied: boolean;
}
export class TurnMachine {
  constructor(
    readonly turnId: string,
    private current: TurnStage = 'ACCEPTED',
  ) {}
  get stage(): TurnStage {
    return this.current;
  }
  advance(next: TurnStage): void {
    assertStageTransition(this.current, next);
    this.current = next;
  }
  fail(state: 'CANCELLED' | 'RETRYABLE_FAILURE' | 'BLOCKED_CONFIGURATION' | 'FAILED'): string {
    return state;
  }
}
export class InMemoryStageStore {
  private readonly results = new Map<string, DurableStageResult>();
  apply(result: Omit<DurableStageResult, 'applied'>): DurableStageResult {
    const previous = this.results.get(result.applicationKey);
    if (previous) return previous;
    const applied = { ...result, applied: true };
    this.results.set(result.applicationKey, applied);
    return applied;
  }
  get(applicationKey: string): DurableStageResult | undefined {
    return this.results.get(applicationKey);
  }
}
export function deterministicRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x1_0000_0000;
  };
}
export function independentNpcCalls(entityIds: readonly string[], maxCalls: number): string[] {
  return [...new Set(entityIds)].slice(0, maxCalls);
}
export { canAdvanceTurnStage };
