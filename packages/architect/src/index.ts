import { z } from 'zod';
import { stagnationScore, validateCardMutation, type PlotPoint, type StoryCard } from '@ada/domain';

export const architectStateSchema = z.object({
  act: z.number().int().positive(),
  phase: z.string().min(1),
  dramaticQuestion: z.string(),
  tension: z.number().min(0).max(1),
  currentTarget: z.string().nullable(),
  activePlotPoints: z.array(z.string()),
  plotStatuses: z.record(z.enum(['proposed', 'dormant', 'available', 'foreshadowed', 'active', 'resolved', 'failed', 'abandoned'])).default({}),
  plotEvidence: z.record(z.array(z.string())).default({}),
  futureBeats: z.array(z.string()),
  cooldowns: z.record(z.number().int().nonnegative()),
  interventionBudget: z.number().int().nonnegative(),
  usedTwists: z.array(z.string()),
  deferredConsequences: z.array(z.string()),
  openHooks: z.array(z.string()),
  pacingHistory: z.array(z.object({ turn: z.number().int().nonnegative(), stagnationScore: z.number().min(0).max(1), intervention: z.boolean() })),
  features: z.record(z.number().nonnegative()),
});
export type ArchitectState = z.infer<typeof architectStateSchema>;

export interface PacingConfig { tensionTarget: number; interventionCooldownTurns: number; interventionThreshold: number; }
export interface StagnationInput {
  turn: number;
  turnsSinceSignificantChange: number;
  turnsSinceGoalProgress: number;
  repeatedPlayerIntents: number;
  repeatedNpcNoActions: number;
  activePlotsWithoutProgress: number;
  unresolvedHooks: number;
  dialogueOnlyStreak: number;
  sceneDuration: number;
}

export function initialArchitectState(plotPoints: readonly PlotPoint[], pacing: Partial<PacingConfig> = {}): ArchitectState {
  return architectStateSchema.parse({
    act: 1,
    phase: 'setup',
    dramaticQuestion: '',
    tension: pacing.tensionTarget ?? 0.5,
    currentTarget: null,
    activePlotPoints: plotPoints.filter((point) => point.status === 'active').map((point) => point.id),
    plotStatuses: Object.fromEntries(plotPoints.map((point) => [point.id, point.status])),
    plotEvidence: Object.fromEntries(plotPoints.map((point) => [point.id, []])),
    futureBeats: plotPoints.filter((point) => ['proposed', 'available', 'foreshadowed'].includes(point.status)).map((point) => point.id),
    cooldowns: {},
    interventionBudget: 1,
    usedTwists: [],
    deferredConsequences: [],
    openHooks: [],
    pacingHistory: [],
    features: {},
  });
}

export function architectTick(state: ArchitectState, input: StagnationInput, pacing: PacingConfig): { state: ArchitectState; shouldIntervene: boolean; score: number } {
  const score = stagnationScore(input);
  const lastIntervention = state.pacingHistory.filter((entry) => entry.intervention).at(-1);
  const cooldownReady = !lastIntervention || input.turn - lastIntervention.turn >= pacing.interventionCooldownTurns;
  const shouldIntervene = score >= pacing.interventionThreshold && cooldownReady && state.interventionBudget > 0;
  const next: ArchitectState = {
    ...state,
    tension: Math.max(0, Math.min(1, state.tension + (score - state.tension) * 0.2)),
    interventionBudget: shouldIntervene ? state.interventionBudget - 1 : state.interventionBudget,
    features: {
      turnsSinceSignificantChange: input.turnsSinceSignificantChange,
      turnsSinceGoalProgress: input.turnsSinceGoalProgress,
      repeatedPlayerIntents: input.repeatedPlayerIntents,
      repeatedNpcNoActions: input.repeatedNpcNoActions,
      activePlotsWithoutProgress: input.activePlotsWithoutProgress,
      unresolvedHooks: input.unresolvedHooks,
      dialogueOnlyStreak: input.dialogueOnlyStreak,
      sceneDuration: input.sceneDuration,
    },
    pacingHistory: [...state.pacingHistory.slice(-49), { turn: input.turn, stagnationScore: score, intervention: shouldIntervene }],
  };
  return { state: architectStateSchema.parse(next), shouldIntervene, score };
}

const forbiddenGuidance = /\b(player|you)\s+(must|should|will|has to)\s+(think|feel|choose|decide|say|do|want)/i;
export function validateArchitectGuidance(guidance: readonly string[]): { valid: boolean; errors: string[]; affordanceCount: number } {
  const errors = guidance.filter((item) => forbiddenGuidance.test(item)).map((item) => `Railroading guidance rejected: ${item}`);
  const affordanceCount = guidance.filter((item) => /could|might|option|choice|opportun|alternative/i.test(item)).length;
  return { valid: errors.length === 0, errors, affordanceCount };
}

export interface PlotEvaluation { status: 'unchanged' | 'available' | 'active' | 'resolved' | 'failed'; evidenceIds: string[]; reason: string; }
export function evaluatePlotPoint(point: Pick<PlotPoint, 'status' | 'preconditions' | 'resolutionConditions' | 'forbiddenOutcomes'>, facts: ReadonlySet<string>, evidenceIds: readonly string[]): PlotEvaluation {
  const preconditionsMet = point.preconditions.every((condition) => facts.has(condition));
  const resolved = point.resolutionConditions.length > 0 && point.resolutionConditions.every((condition) => facts.has(condition));
  const forbidden = point.forbiddenOutcomes.some((condition) => facts.has(condition));
  if (resolved && evidenceIds.length) return { status: 'resolved', evidenceIds: [...evidenceIds], reason: 'All resolution conditions have canonical evidence.' };
  if (forbidden && evidenceIds.length) return { status: 'failed', evidenceIds: [...evidenceIds], reason: 'A forbidden outcome has canonical evidence.' };
  if (preconditionsMet && ['proposed', 'dormant', 'available'].includes(point.status)) return { status: 'active', evidenceIds: [...evidenceIds], reason: 'All preconditions have canonical evidence.' };
  if (preconditionsMet && point.status === 'proposed') return { status: 'available', evidenceIds: [...evidenceIds], reason: 'Preconditions are satisfied.' };
  return { status: 'unchanged', evidenceIds: [], reason: 'Deterministic evidence is insufficient.' };
}

export const suddenEventProposalSchema = z.object({
  rationale: z.string().min(1).max(2_000),
  eventType: z.string().min(1).max(100),
  participantIds: z.array(z.string()).min(1).max(50),
  locationId: z.string().min(1),
  severity: z.number().min(0).max(1),
  affordances: z.array(z.string().min(1)).min(2).max(20),
  dependencyIds: z.array(z.string()).max(50),
  cooldownTurns: z.number().int().nonnegative().max(100),
  sourceIds: z.array(z.string()).min(1).max(100),
});
export type SuddenEventProposal = z.infer<typeof suddenEventProposalSchema>;
export function validateSuddenEventProposal(proposal: unknown, allowedSourceIds: ReadonlySet<string>): SuddenEventProposal {
  const parsed = suddenEventProposalSchema.parse(proposal);
  if (parsed.sourceIds.some((id) => !allowedSourceIds.has(id))) throw new Error('Sudden-event proposal references unauthorized evidence');
  if (parsed.affordances.length < 2) throw new Error('Major interventions require multiple player affordances');
  return parsed;
}

export function applyPlotEvaluation(state: ArchitectState, pointId: string, evaluation: PlotEvaluation): ArchitectState {
  if (evaluation.status === 'unchanged') return state;
  const nextStatus = evaluation.status === 'available' ? 'available' : evaluation.status;
  const activePlotPoints = nextStatus === 'active'
    ? [...new Set([...state.activePlotPoints, pointId])]
    : state.activePlotPoints.filter((id) => id !== pointId);
  return architectStateSchema.parse({
    ...state,
    activePlotPoints,
    plotStatuses: { ...state.plotStatuses, [pointId]: nextStatus },
    plotEvidence: { ...state.plotEvidence, [pointId]: [...new Set([...(state.plotEvidence[pointId] ?? []), ...evaluation.evidenceIds])] },
  });
}

export interface CardMutationProposal {
  cardId: string;
  expectedVersion: number;
  mode: StoryCard['mutationPolicy'];
  locked: boolean;
  path: string;
  sourceScopes: readonly string[];
  targetScope: string;
  sourceIds: readonly string[];
  reason: string;
  confidence: number;
}
export function validateCardMutationProposal(proposal: CardMutationProposal, card: StoryCard, authorizedSourceIds: ReadonlySet<string>): void {
  if (proposal.sourceIds.some((id) => !authorizedSourceIds.has(id))) throw new Error('Card mutation references unauthorized source');
  if (proposal.confidence < 0 || proposal.confidence > 1) throw new Error('Card mutation confidence is outside bounds');
  validateCardMutation({ cardId: proposal.cardId, expectedVersion: proposal.expectedVersion, mode: proposal.mode, locked: proposal.locked, path: proposal.path, sourceScopes: proposal.sourceScopes as never[], targetScope: proposal.targetScope as never }, card);
}

export interface StoryCardMutationCandidate {
  cardId: string;
  expectedVersion: number;
  mode: 'static' | 'manual_only' | 'append_only' | 'ai_suggest' | 'ai_mutable';
  locked: boolean;
  path: string;
  sourceIds: readonly string[];
  sourceScopes: readonly string[];
  targetScope: string;
  contradictions?: readonly string[];
  confidence: number;
}
export interface ConsistencyCritique {
  valid: boolean;
  errors: string[];
  warnings: string[];
  canAutoApply: boolean;
}
export function critiqueStoryCardMutation(
  proposal: StoryCardMutationCandidate,
  authorizedSourceIds: ReadonlySet<string>,
): ConsistencyCritique {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (proposal.locked) errors.push('Card is locked.');
  if (proposal.mode === 'static' || proposal.mode === 'manual_only') errors.push('Card policy does not permit AI mutation.');
  if (proposal.sourceIds.some((id) => !authorizedSourceIds.has(id))) errors.push('Proposal references unauthorized sources.');
  if (proposal.sourceScopes.some((scope) => scope !== 'public_scenario') && proposal.targetScope === 'public_scenario') errors.push('Mutation would widen visibility.');
  if (proposal.mode === 'append_only' && proposal.path !== '/appendHistory') errors.push('Append-only card permits only /appendHistory.');
  if (!/^\/(appendHistory|canonicalBody|playerVisibleBody)$/.test(proposal.path)) errors.push('Mutation path is not allowlisted.');
  if (proposal.confidence < 0 || proposal.confidence > 1) errors.push('Confidence must be between 0 and 1.');
  for (const contradiction of proposal.contradictions ?? []) warnings.push(`Contradiction: ${contradiction}`);
  if (proposal.confidence < 0.65) warnings.push('Low-confidence proposal requires explicit review.');
  return { valid: errors.length === 0, errors, warnings, canAutoApply: errors.length === 0 && proposal.mode === 'ai_mutable' && proposal.confidence >= 0.8 && !(proposal.contradictions?.length) };
}

export function mutationTriggerReasons(input: { entityChanged?: boolean; locationChanged?: boolean; plotTransition?: boolean; staleTurns?: number; explicitRefresh?: boolean; staleBelief?: boolean }): string[] {
  const reasons: string[] = [];
  if (input.entityChanged) reasons.push('entity-change');
  if (input.locationChanged) reasons.push('location-change');
  if (input.plotTransition) reasons.push('plot-transition');
  if ((input.staleTurns ?? 0) > 0) reasons.push('stale-context');
  if (input.staleBelief) reasons.push('stale-belief');
  if (input.explicitRefresh) reasons.push('explicit-refresh');
  return reasons;
}


export function architectContext(input: { truth: unknown; plot: unknown; pacing: unknown; guidance: unknown }): Record<string, unknown> {
  return {
    truth: { label: 'privileged canonical truth', data: input.truth },
    plot: { label: 'authored plot state; evidence required for transitions', data: input.plot },
    pacing: { label: 'deterministic pacing features; advisory only', data: input.pacing },
    guidance: { label: 'proposal-only guidance; never canonical mutation', data: input.guidance },
  };
}
