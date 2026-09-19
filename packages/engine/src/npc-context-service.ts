import type { KnowledgePolicy, Principal } from '@ada/domain';
import type { NpcContextRepository } from '@ada/db';
import { createHash } from 'node:crypto';

export interface OwnerScopedNpcContext {
  principal: {
    kind: 'NPC';
    runId: string;
    branchId: string;
    entityId: string;
  };
  self: {
    id: string;
    name: string;
    publicDescription: string;
    privateDescription: string;
    history: string;
    historicalEvents: readonly Record<string, unknown>[];
    personality: readonly string[];
    speechStyle: string;
    drives: readonly string[];
    goals: readonly string[];
    fears: readonly string[];
    capabilities: readonly string[];
    limitations: readonly string[];
  };
  currentState: {
    locationId: string;
    worldTime: string;
    runtimeState: Readonly<Record<string, unknown>>;
  };
  newEvidence: Array<{
    id: string;
    actor: {
      subjectEntityId: string;
      reference: string;
      identityKnown: boolean;
    };
    modality: string;
    perceivedContent: string;
    detail: number;
    confidence: number;
  }>;
  recentObservations: Array<{
    turnNumber: number;
    modality: string;
    content: string;
  }>;
  beliefs: Array<{
    claim: string;
    confidence: number;
    salience: number;
  }>;
  memories: Array<{
    content: string;
    importance: number;
    type: string;
  }>;
  thoughts: Array<{
    text: string;
    persistence: string;
    salience: number;
  }>;
  relationshipViews: Array<{
    subjectEntityId: string;
    summary: string;
    confidence: number;
  }>;
  publicRules: readonly string[];
  authorizedSourceIds: readonly string[];
  contextPolicyVersion: number;
  inputHash: string;
}

export class NpcContextService {
  constructor(
    private readonly repository: NpcContextRepository,
    private readonly policy: KnowledgePolicy,
  ) {}

  async build(input: {
    runId: string;
    branchId: string;
    turnId: string;
    turnNumber: number;
    entityId: string;
    worldTime: string;
    selfMeta: {
      id: string;
      name: string;
      publicDescription?: string | undefined;
      privateDescription?: string | undefined;
      history?: string | undefined;
      historicalEvents?: readonly Record<string, unknown>[] | undefined;
      personality?: readonly string[] | undefined;
      speechStyle?: string | undefined;
      drives?: readonly string[] | undefined;
      goals?: readonly string[] | undefined;
      fears?: readonly string[] | undefined;
      capabilities?: readonly string[] | undefined;
      limitations?: readonly string[] | undefined;
    };
    newPerceptions: Array<{
      observerEntityId: string;
      actorEntityId: string;
      sourceSignalId: string;
      subjectiveActorReference?: string | undefined;
      actorIdentityKnown?: boolean | undefined;
      modality: string;
      perceivedEnvelope: string;
      detail: number;
      confidence: number;
    }>;
    publicRules?: readonly string[];
  }): Promise<OwnerScopedNpcContext> {
    const { runId, branchId, entityId, selfMeta, newPerceptions, worldTime } = input;

    const principal: Principal = {
      kind: 'NPC',
      runId,
      branchId,
      entityId,
    };

    // Verify principal scope
    const scope = this.policy.queryScope(principal);
    if (scope.ownerEntityId !== entityId) {
      throw new Error(`KnowledgePolicy scope violation for principal ${entityId}`);
    }

    // Load runtime state
    const runtimeRow = await this.repository.getEntityRuntimeState(runId, branchId, entityId);
    const locationId = (runtimeRow?.state as any)?.locationId ?? 'unknown';

    // Load owner-scoped observations, memories, beliefs, thoughts
    const ownerQuery = { runId, branchId, ownerEntityId: entityId };
    const [obsRows, beliefRows, memoryRows, thoughtRows, relRows] = await Promise.all([
      this.repository.getObservations(ownerQuery),
      this.repository.getBeliefs(ownerQuery),
      this.repository.getMemories(ownerQuery),
      this.repository.getThoughts(ownerQuery),
      this.repository.getRelationshipViews(ownerQuery),
    ]);

    // Format new evidence (only this observer's perceptions)
    const newEvidence = newPerceptions
      .filter((p) => p.observerEntityId === entityId)
      .map((p) => ({
        id: `${p.sourceSignalId}:${p.observerEntityId}:${p.modality}`,
        actor: {
          subjectEntityId: p.actorEntityId,
          reference: p.subjectiveActorReference ?? p.actorEntityId,
          identityKnown: p.actorIdentityKnown ?? false,
        },
        modality: p.modality,
        perceivedContent: p.perceivedEnvelope,
        detail: p.detail,
        confidence: p.confidence,
      }));

    // Format recent observations
    const recentObservations = obsRows.map((o: any) => ({
      turnNumber: o.observedTurn,
      modality: o.modality,
      content: o.perceivedContent,
    }));

    // Format beliefs
    const beliefs = beliefRows.map((b: any) => ({
      claim: b.rendering,
      confidence: b.confidence,
      salience: b.salience,
    }));

    // Format memories
    const memories = memoryRows.map((m: any) => ({
      content: m.content,
      importance: m.importance,
      type: m.memoryType,
    }));

    // Format thoughts
    const thoughts = thoughtRows.map((t: any) => ({
      text: t.text,
      persistence: t.persistence,
      salience: t.salience,
    }));

    // Format relationship views
    const relationshipViews = relRows.map((r: any) => ({
      subjectEntityId: r.subjectEntityId,
      summary: r.summary,
      confidence: r.confidence,
    }));

    // Track authorized document IDs for security audit
    const authorizedSourceIds = [
      ...newEvidence.map((e) => e.id),
      ...obsRows.map((r: any) => r.id),
      ...beliefRows.map((r: any) => r.id),
      ...memoryRows.map((r: any) => r.id),
      ...thoughtRows.map((r: any) => r.id),
    ];

    const contextPayload = {
      principal,
      self: {
        id: selfMeta.id,
        name: selfMeta.name,
        publicDescription: selfMeta.publicDescription ?? '',
        privateDescription: selfMeta.privateDescription ?? '',
        history: selfMeta.history ?? '',
        historicalEvents: selfMeta.historicalEvents ?? [],
        personality: selfMeta.personality ?? [],
        speechStyle: selfMeta.speechStyle ?? '',
        drives: selfMeta.drives ?? [],
        goals: selfMeta.goals ?? [],
        fears: selfMeta.fears ?? [],
        capabilities: selfMeta.capabilities ?? [],
        limitations: selfMeta.limitations ?? [],
      },
      currentState: {
        locationId,
        worldTime,
        runtimeState: (runtimeRow?.state as Record<string, unknown>) ?? {},
      },
      newEvidence,
      recentObservations,
      beliefs,
      memories,
      thoughts,
      relationshipViews,
      publicRules: input.publicRules ?? [],
      authorizedSourceIds,
      contextPolicyVersion: 1,
    };

    const inputHash = createHash('sha256').update(JSON.stringify(contextPayload)).digest('hex');

    return {
      ...contextPayload,
      inputHash,
    };
  }
}
