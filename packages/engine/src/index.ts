import type { TurnStage } from '@ada/domain';

export interface TurnStageStore {
  saveStage(turnId: string, stage: TurnStage, applicationKey: string): Promise<void>;
}
export interface TurnEngine {
  accept(input: {
    runId: string;
    branchId: string;
    text: string;
    idempotencyKey: string;
  }): Promise<{ turnId: string }>;
}
export * from './turn.js';
export * from './intent.js';
export * from './npc.js';
export * from './perception.js';
export * from './perception-eligibility.js';
export * from './npc-context-service.js';
