/* eslint-disable */
import { and, desc, eq, inArray } from 'drizzle-orm';
import {
  appendTurnStreamEvent,
  createRunFromPublishedRevision,
  innerThoughts,
  jobRuns,
  narrativeSegments,
  outbox,
  runEntityState,
  runLocationState,
  runPortalState,
  scenarioRevisions,
  type Database,
  runs,
  turns,
  replayTurnStreamEvents,
  withRunAdvisoryLock,
} from '@ada/db';
import { randomUUID } from 'node:crypto';
import type { Queue } from 'bullmq';

export class RunService {
  constructor(
    private readonly db: Database,
    private readonly queue?: Queue,
    private readonly debugInspectorsEnabled = false,
  ) {}
  async create(input: { revisionId: string; playerEntityId: string; actorId?: string }) {
    const runId = `run_${randomUUID().replaceAll('-', '')}`;
    const branchId = `branch_${randomUUID().replaceAll('-', '')}`;
    return createRunFromPublishedRevision(this.db, {
      runId,
      branchId,
      revisionId: input.revisionId,
      playerEntityId: input.playerEntityId,
      worldTime: new Date(),
      randomSeed: Math.floor(Math.random() * 2 ** 31),
      narrativeSettings: { mode: 'player-limited', person: 'third', tense: 'past' },
      roleSettingsSnapshot: { provider: 'server-configured', generationEnabled: true },
      retrievalProfileSnapshot: {
        lexical: true,
        embeddings: false,
        maxCandidates: 200,
        maxSelected: 32,
      },
      ...(input.actorId ? { actorId: input.actorId } : {}),
    });
  }
  list(limit = 25) {
    return this.db.select().from(runs).orderBy(desc(runs.updatedAt)).limit(limit);
  }
  async timeline(runId: string) {
    const turnRows = await this.db
      .select()
      .from(turns)
      .where(eq(turns.runId, runId))
      .orderBy(desc(turns.turnNumber));
    const segmentRows = await this.db
      .select({
        id: narrativeSegments.id,
        turnId: narrativeSegments.turnId,
        attribution: narrativeSegments.attribution,
      })
      .from(narrativeSegments)
      .where(eq(narrativeSegments.runId, runId));
    const segmentsByTurn = new Map(segmentRows.map((segment) => [segment.turnId, segment]));
    return turnRows.map((turn) => {
      const segment = segmentsByTurn.get(turn.id);
      const attribution = (segment?.attribution as Record<string, unknown> | undefined) ?? {};
      return {
        ...turn,
        segmentId: segment?.id ?? null,
        dialogueAttributions: Array.isArray(attribution.dialogueAttributions)
          ? attribution.dialogueAttributions
          : [],
      };
    });
  }
  async archive(runId: string) {
    const [updated] = await this.db
      .update(runs)
      .set({ status: 'archived', updatedAt: new Date() })
      .where(eq(runs.id, runId))
      .returning();
    if (!updated) throw new Error('Run not found');
    return updated;
  }
  async scene(runId: string) {
    const run = await this.get(runId);
    if (!run?.activeBranchId) throw new Error('Run or active branch not found');
    const entities = await this.db
      .select()
      .from(runEntityState)
      .where(and(eq(runEntityState.runId, runId), eq(runEntityState.branchId, run.activeBranchId)));
    const locations = await this.db
      .select()
      .from(runLocationState)
      .where(
        and(eq(runLocationState.runId, runId), eq(runLocationState.branchId, run.activeBranchId)),
      );
    const portals = await this.db
      .select()
      .from(runPortalState)
      .where(and(eq(runPortalState.runId, runId), eq(runPortalState.branchId, run.activeBranchId)));

    const [rev] = await this.db
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.id, run.scenarioRevisionId))
      .limit(1);
    const aggEntities = (rev?.aggregate as any)?.entities as
      | Array<{
          id: string;
          name?: string;
          kind?: string;
          publicDescription?: string;
          personality?: string[];
          playable?: boolean;
        }>
      | undefined;

    const nameMap = new Map<
      string,
      {
        name: string;
        description?: string | undefined;
        personality?: string[] | undefined;
        playable?: boolean | undefined;
      }
    >();
    if (Array.isArray(aggEntities)) {
      for (const e of aggEntities) {
        nameMap.set(e.id, {
          name: e.name || e.id,
          description: e.publicDescription,
          personality: e.personality,
          playable: Boolean(e.playable),
        });
      }
    }

    return {
      runId,
      branchId: run.activeBranchId,
      playerEntityId: run.playerEntityId,
      worldTime: run.worldTime,
      entities: await Promise.all(
        entities.map(async (row) => {
          const meta = nameMap.get(row.entityId);
          const stateAttrs = (row.state as any)?.attributes as Record<string, unknown> | undefined;
          const entityThoughts = await this.db
            .select({
              id: innerThoughts.id,
              text: innerThoughts.text,
              persistence: innerThoughts.persistence,
              salience: innerThoughts.salience,
              urgency: innerThoughts.urgency,
              turnId: innerThoughts.turnId,
              createdAt: innerThoughts.createdAt,
            })
            .from(innerThoughts)
            .where(
              and(
                eq(innerThoughts.runId, runId),
                eq(innerThoughts.ownerEntityId, row.entityId),
                eq(innerThoughts.playerInspectable, true),
                eq(innerThoughts.visibility, 'entity_private'),
              ),
            )
            .orderBy(desc(innerThoughts.createdAt))
            .limit(6);

          return {
            entityId: row.entityId,
            name: meta?.name ?? (stateAttrs?.name as string) ?? row.entityId,
            description: meta?.description ?? (stateAttrs?.description as string) ?? '',
            personality: meta?.personality ?? (stateAttrs?.personality as string[]) ?? [],
            playable: meta?.playable ?? false,
            thoughts: entityThoughts,
            state: row.state,
            version: row.version,
          };
        }),
      ),
      locations: locations.map((row) => ({
        locationId: row.locationId,
        state: row.state,
        version: row.version,
      })),
      portals: portals.map((row) => ({
        portalId: row.portalId,
        state: row.state,
        transmission: row.transmission,
        version: row.version,
      })),
    };
  }
  async playerJournal(runId: string) {
    const run = await this.get(runId);
    if (!run?.activeBranchId) throw new Error('Run not found');

    const { observations, narrativeSegments } = await import('@ada/db');

    // Return only observations belonging to playerEntityId
    const playerObservations = await this.db
      .select({
        id: observations.id,
        turnNumber: observations.observedTurn,
        modality: observations.modality,
        content: observations.perceivedContent,
        createdAt: observations.createdAt,
      })
      .from(observations)
      .where(
        and(
          eq(observations.runId, runId),
          eq(observations.branchId, run.activeBranchId),
          eq(observations.observerEntityId, run.playerEntityId),
        ),
      );

    // Return public player narrative history
    const narratives = await this.db
      .select({
        id: narrativeSegments.id,
        turnId: narrativeSegments.turnId,
        text: narrativeSegments.text,
      })
      .from(narrativeSegments)
      .where(
        and(
          eq(narrativeSegments.runId, runId),
          eq(narrativeSegments.branchId, run.activeBranchId),
          eq(narrativeSegments.visibility, 'player_view'),
        ),
      );

    return {
      runId,
      playerEntityId: run.playerEntityId,
      observations: playerObservations,
      narratives,
    };
  }

  get(id: string) {
    return this.db
      .select()
      .from(runs)
      .where(eq(runs.id, id))
      .limit(1)
      .then(([run]) => run);
  }
  getTurn(runId: string, turnId: string) {
    return this.db
      .select()
      .from(turns)
      .where(and(eq(turns.runId, runId), eq(turns.id, turnId)))
      .limit(1)
      .then(([turn]) => turn);
  }
  async cancelTurn(runId: string, turnId: string) {
    const [current] = await this.db
      .select()
      .from(turns)
      .where(and(eq(turns.runId, runId), eq(turns.id, turnId)))
      .limit(1);
    if (!current) throw new Error('Turn not found');
    if (['completed', 'cancelled', 'failed'].includes(current.status)) return current;
    const [turn] = await this.db
      .update(turns)
      .set(
        current.status === 'pending'
          ? {
              status: 'cancelled',
              stage: 'CANCELLED',
              endedAt: new Date(),
              updatedAt: new Date(),
              cancellationRequested: true,
            }
          : { cancellationRequested: true, updatedAt: new Date() },
      )
      .where(and(eq(turns.runId, runId), eq(turns.id, turnId)))
      .returning();
    if (!turn) throw new Error('Turn not found');
    return turn;
  }
  async retryTurn(runId: string, turnId: string) {
    const [turn] = await this.db
      .update(turns)
      .set({ status: 'pending', stage: 'ACCEPTED', failure: null, updatedAt: new Date() })
      .where(
        and(eq(turns.runId, runId), eq(turns.id, turnId), eq(turns.status, 'retryable_failure')),
      )
      .returning();
    if (!turn) throw new Error('Turn is not retryable');
    await this.queue?.add(
      'turn',
      { runId, turnId },
      { jobId: turnId, removeOnComplete: 100, removeOnFail: 100 },
    );
    return turn;
  }
  async recordStreamEvent(input: {
    turnId: string;
    eventKey: string;
    eventType: string;
    payload: unknown;
  }) {
    return appendTurnStreamEvent(this.db, input);
  }
  async replayStreamEvents(turnId: string, afterId: number) {
    return replayTurnStreamEvents(this.db, turnId, afterId);
  }
  async responseDetails(runId: string, segmentId: string) {
    const [segment] = await this.db
      .select()
      .from(narrativeSegments)
      .where(and(eq(narrativeSegments.id, segmentId), eq(narrativeSegments.runId, runId)))
      .limit(1);
    if (!segment) throw new Error('Response segment not found');
    const thoughts = await this.db
      .select({
        id: innerThoughts.id,
        ownerEntityId: innerThoughts.ownerEntityId,
        text: innerThoughts.text,
        persistence: innerThoughts.persistence,
        salience: innerThoughts.salience,
        urgency: innerThoughts.urgency,
        triggeringEventId: innerThoughts.triggeringEventId,
      })
      .from(innerThoughts)
      .where(
        and(
          eq(innerThoughts.runId, runId),
          eq(innerThoughts.turnId, segment.turnId),
          eq(innerThoughts.playerInspectable, true),
          eq(innerThoughts.visibility, 'entity_private'),
        ),
      );

    // Fetch AI invocations telemetry for this turn
    const { aiInvocations } = await import('@ada/db');
    const invocations = await this.db
      .select({
        id: aiInvocations.id,
        role: aiInvocations.role,
        stage: aiInvocations.stage,
        principalKind: aiInvocations.principalKind,
        principalEntityId: aiInvocations.principalEntityId,
        provider: aiInvocations.provider,
        modelId: aiInvocations.modelId,
        usage: aiInvocations.usage,
        input: this.debugInspectorsEnabled ? aiInvocations.validation : {},
        latencyMs: aiInvocations.latencyMs,
        createdAt: aiInvocations.createdAt,
      })
      .from(aiInvocations)
      .where(eq(aiInvocations.correlationId, segment.turnId))
      .orderBy(aiInvocations.createdAt);

    return {
      segmentId,
      segmentType: segment.segmentType,
      eventIds: segment.eventIds,
      thoughts,
      invocations,
    };
  }
  async acceptTurn(
    runId: string,
    input: { text: string; idempotencyKey: string; expectedVersion: number; branchId: string },
  ) {
    if (!input.text.trim() || input.text.length > 8_192)
      throw new Error('Player input is blank or too large');
    const result = await withRunAdvisoryLock(this.db, runId, async (tx) => {
      const [run] = await tx.select().from(runs).where(eq(runs.id, runId)).limit(1);
      if (!run || run.activeBranchId !== input.branchId)
        throw new Error('Run or active branch not found');
      const [existing] = await tx
        .select()
        .from(turns)
        .where(and(eq(turns.runId, runId), eq(turns.idempotencyKey, input.idempotencyKey)))
        .limit(1);
      if (existing) return { turn: existing, created: false };
      const [activeTurn] = await tx
        .select()
        .from(turns)
        .where(and(eq(turns.runId, runId), inArray(turns.status, ['pending', 'running'])))
        .limit(1);
      if (activeTurn) throw new Error('A turn is already processing for this run');
      if (run.expectedVersion !== input.expectedVersion)
        throw new Error('Optimistic conflict on run version');
      const id = `turn_${randomUUID().replaceAll('-', '')}`;
      const [turn] = await tx
        .insert(turns)
        .values({
          id,
          runId,
          branchId: input.branchId,
          turnNumber: run.currentTurn + 1,
          parentTurnId: null,
          rawPlayerInput: input.text,
          status: 'pending',
          stage: 'ACCEPTED',
          idempotencyKey: input.idempotencyKey,
          expectedVersion: input.expectedVersion,
          attribution: { source: 'player', sourceIds: [runId] },
        })
        .returning();
      if (!turn) throw new Error('Turn insert failed');
      await tx
        .insert(jobRuns)
        .values({
          id: `job:${turn.id}`,
          queue: 'turns',
          jobKey: turn.id,
          stage: 'ACCEPTED',
          status: 'pending',
          heartbeatAt: new Date(),
          attribution: { source: 'system', sourceIds: [turn.id] },
        })
        .onConflictDoNothing();
      await tx
        .insert(outbox)
        .values({
          id: `turn.process:${turn.id}`,
          topic: 'turn.process',
          key: turn.id,
          payload: { runId, turnId: turn.id },
          attribution: { source: 'system', sourceIds: [turn.id] },
        })
        .onConflictDoNothing();
      return { turn, created: true };
    });
    if (result.created)
      await this.queue?.add(
        'turn',
        { runId, turnId: result.turn.id },
        { jobId: result.turn.id, removeOnComplete: 100, removeOnFail: 100 },
      );
    return result.turn;
  }
}
