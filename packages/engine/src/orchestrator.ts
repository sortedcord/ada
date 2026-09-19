import { TurnMachine, InMemoryStageStore } from './turn.js';

export interface TurnOrchestrationInput {
  turnId: string;
  playerInput: string;
  playerEntityId: string;
  npcEntityIds: readonly string[];
}
export interface TurnOrchestrationDependencies {
  readonly parseIntent: (input: TurnOrchestrationInput) => Promise<unknown>;
  readonly plan: (input: TurnOrchestrationInput, intent: unknown) => Promise<unknown>;
  readonly decideNpcs: (input: TurnOrchestrationInput, plan: unknown) => Promise<unknown>;
  readonly resolve: (
    input: TurnOrchestrationInput,
    intent: unknown,
    decisions: unknown,
  ) => Promise<unknown>;
  readonly narrate: (input: TurnOrchestrationInput, resolution: unknown) => Promise<string>;
  readonly stageStore?: InMemoryStageStore;
}
export interface TurnOrchestrationResult {
  turnId: string;
  narrative: string;
  events: unknown;
  decisions: unknown;
}

export async function orchestrateTurn(
  input: TurnOrchestrationInput,
  dependencies: TurnOrchestrationDependencies,
): Promise<TurnOrchestrationResult> {
  if (!input.playerInput.trim()) throw new Error('Player input is blank');
  const machine = new TurnMachine(input.turnId);
  const store = dependencies.stageStore ?? new InMemoryStageStore();
  machine.advance('INPUT_VALIDATED');
  const intent = await dependencies.parseIntent(input);
  store.apply({
    turnId: input.turnId,
    stage: machine.stage,
    applicationKey: `${input.turnId}:intent`,
    output: intent,
  });
  machine.advance('CONTEXT_SNAPSHOTTED');
  const plan = await dependencies.plan(input, intent);
  store.apply({
    turnId: input.turnId,
    stage: machine.stage,
    applicationKey: `${input.turnId}:plan`,
    output: plan,
  });
  machine.advance('ARCHITECT_PLANNED');
  const decisions = await dependencies.decideNpcs(input, plan);
  machine.advance('NPCS_SELECTED');
  machine.advance('NPC_DECISIONS_GENERATED');
  const events = await dependencies.resolve(input, intent, decisions);
  machine.advance('ACTIONS_RESOLVED');
  machine.advance('EVENTS_COMMITTED');
  machine.advance('OBSERVATIONS_CREATED');
  machine.advance('NARRATION_GENERATING');
  const narrative = await dependencies.narrate(input, events);
  machine.advance('NARRATION_COMMITTED');
  machine.advance('MEMORY_UPDATES_QUEUED');
  machine.advance('MUTATIONS_QUEUED');
  machine.advance('COMPLETED');
  return { turnId: input.turnId, narrative, events, decisions };
}
