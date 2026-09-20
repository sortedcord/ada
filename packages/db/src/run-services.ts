import { asc, eq } from 'drizzle-orm';
import { initialArchitectState } from '@ada/architect';
import { validateScenarioAggregate } from '@ada/domain';
import type { Database } from './index.js';
import {
  architectState,
  entityAliases,
  events,
  narrativeSegments,
  relationshipViews,
  runBranches,
  runEntityState,
  runLocationState,
  runRelationshipState,
  runSnapshots,
  runStoryCardState,
  runs,
  scenarioRevisions,
  turnStreamEvents,
  turns,
} from './schema.js';
import { snapshotChecksum, withRunAdvisoryLock, withTransactionRetry } from './repositories.js';

export async function createRunFromPublishedRevision(
  db: Database,
  input: {
    runId: string;
    branchId: string;
    revisionId: string;
    playerEntityId: string;
    worldTime: Date;
    randomSeed: number;
    narrativeSettings: unknown;
    roleSettingsSnapshot: unknown;
    retrievalProfileSnapshot: unknown;
    actorId?: string;
  },
): Promise<{ runId: string; branchId: string }> {
  return withTransactionRetry(db, async (tx) => {
    const [revision] = await tx
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.id, input.revisionId))
      .limit(1);
    if (!revision || revision.status !== 'published')
      throw new Error('A published scenario revision is required');
    const aggregate = revision.aggregate as Parameters<typeof validateScenarioAggregate>[0];
    const validation = validateScenarioAggregate(aggregate);
    if (!validation.valid) throw new Error('Scenario revision is not valid for a run');
    const player = aggregate.entities.find((entity) => entity.id === input.playerEntityId);
    if (!player?.playable) throw new Error('Selected entity is not playable in this revision');
    await tx.insert(runs).values({
      id: input.runId,
      scenarioRevisionId: input.revisionId,
      playerEntityId: input.playerEntityId,
      status: 'active',
      currentTurn: 0,
      expectedVersion: 1,
      worldTime: input.worldTime,
      randomSeed: input.randomSeed,
      narrativeSettings: input.narrativeSettings,
      roleSettingsSnapshot: input.roleSettingsSnapshot,
      retrievalProfileSnapshot: input.retrievalProfileSnapshot,
      attribution: { source: 'player', actorId: input.actorId, sourceIds: [input.revisionId] },
    });
    await tx.insert(runBranches).values({
      id: input.branchId,
      runId: input.runId,
      parentBranchId: null,
      forkTurn: 0,
      label: 'main',
      active: true,
      canonical: true,
      creationReason: 'initial',
      attribution: { source: 'player', actorId: input.actorId, sourceIds: [] },
    });
    await tx
      .update(runs)
      .set({ activeBranchId: input.branchId, updatedAt: new Date() })
      .where(eq(runs.id, input.runId));
    if (aggregate.entities.length)
      await tx.insert(runEntityState).values(
        aggregate.entities.map((entity) => ({
          runId: input.runId,
          branchId: input.branchId,
          entityId: entity.id,
          state: {
            locationId: entity.playable ? (aggregate.scenario.startLocationId || entity.startingLocationId) : entity.startingLocationId,
            active: entity.active,
            alive: entity.alive,
            attributes: entity.structuredAttributes,
          },
          version: 1,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        })),
      );
    if (aggregate.relationships.length) {
      await tx.insert(runRelationshipState).values(
        aggregate.relationships.map((relationship) => ({
          runId: input.runId,
          branchId: input.branchId,
          relationshipId: relationship.id,
          state: {
            dimensions: relationship.dimensions,
            publicState: relationship.publicState,
            historySummary: relationship.historySummary,
          },
          version: 1,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        })),
      );

      // Seed epistemic relationship views for each entity pair defined in the scenario.
      const validViews = aggregate.relationships.filter(
        (rel) => rel.sourceEntityId && rel.targetEntityId,
      );
      if (validViews.length) {
        await tx.insert(relationshipViews).values(
          validViews.map((rel) => ({
            runId: input.runId,
            branchId: input.branchId,
            ownerEntityId: rel.sourceEntityId,
            subjectEntityId: rel.targetEntityId,
            dimensions: rel.dimensions ?? {},
            summary: rel.historySummary || rel.publicState || '',
            confidence: 1,
            sourceEvidenceIds: [revision.id],
            version: 1,
            attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
          })),
        );
      }

      // Seed entity aliases for self-awareness and known relationships.
      const initialAliases: Array<typeof entityAliases.$inferInsert> = [];
      const entityMap = new Map(aggregate.entities.map((e) => [e.id, e.name ?? e.id]));

      for (const entity of aggregate.entities) {
        // Self is known as 'you'
        initialAliases.push({
          runId: input.runId,
          branchId: input.branchId,
          ownerEntityId: entity.id,
          subjectEntityId: entity.id,
          alias: 'you',
          identityKnown: true,
          confidence: 1,
          sourceEvidenceIds: [revision.id],
          firstLearnedTurn: 0,
          lastUpdatedTurn: 0,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        });
      }

      for (const rel of validViews) {
        const targetName = entityMap.get(rel.targetEntityId) ?? rel.targetEntityId;
        initialAliases.push({
          runId: input.runId,
          branchId: input.branchId,
          ownerEntityId: rel.sourceEntityId,
          subjectEntityId: rel.targetEntityId,
          alias: targetName,
          identityKnown: true,
          confidence: 1,
          sourceEvidenceIds: [revision.id],
          firstLearnedTurn: 0,
          lastUpdatedTurn: 0,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        });
      }

      if (initialAliases.length) {
        await tx
          .insert(entityAliases)
          .values(initialAliases)
          .onConflictDoNothing();
      }
    }
    if (aggregate.locations.length)
      await tx.insert(runLocationState).values(
        aggregate.locations.map((location) => ({
          runId: input.runId,
          branchId: input.branchId,
          locationId: location.id,
          state: { environment: location.environment, hazards: location.hazards, blocked: false },
          version: 1,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        })),
      );
    if (aggregate.storyCards.length)
      await tx.insert(runStoryCardState).values(
        aggregate.storyCards.map((card) => ({
          runId: input.runId,
          branchId: input.branchId,
          cardId: card.id,
          state: { active: true, version: card.currentVersion },
          version: 1,
          attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
        })),
      );
    await tx.insert(architectState).values({
      runId: input.runId,
      branchId: input.branchId,
      state: initialArchitectState(aggregate.plotPoints, aggregate.scenario.config.pacing),
      version: 1,
      attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
    });
    const initialState = {
      entities: aggregate.entities.map((entity) => ({
        runId: input.runId,
        branchId: input.branchId,
        entityId: entity.id,
        state: { locationId: entity.startingLocationId },
        version: 1,
        attribution: { source: 'system', sourceIds: [revision.id] },
      })),
      relationships: aggregate.relationships.map((relationship) => ({
        runId: input.runId,
        branchId: input.branchId,
        relationshipId: relationship.id,
        state: { dimensions: relationship.dimensions },
        version: 1,
        attribution: { source: 'system', sourceIds: [revision.id] },
      })),
      locations: aggregate.locations.map((location) => ({
        runId: input.runId,
        branchId: input.branchId,
        locationId: location.id,
        state: { environment: location.environment },
        version: 1,
        attribution: { source: 'system', sourceIds: [revision.id] },
      })),
      storyCards: aggregate.storyCards.map((card) => ({
        runId: input.runId,
        branchId: input.branchId,
        cardId: card.id,
        state: { active: true },
        version: 1,
        attribution: { source: 'system', sourceIds: [revision.id] },
      })),
    };
    const serializedState = JSON.stringify(initialState);
    await tx.insert(runSnapshots).values({
      id: `${input.runId}_snapshot_0`,
      runId: input.runId,
      branchId: input.branchId,
      turn: 0,
      projectionVersions: {
        entities: 1,
        relationships: 1,
        locations: 1,
        storyCards: 1,
        architect: 1,
      },
      checksum: snapshotChecksum(serializedState),
      serializedState,
      schemaVersion: 1,
      attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
    });
    await tx
      .update(runs)
      .set({ lastSuccessfulSnapshotId: `${input.runId}_snapshot_0`, updatedAt: new Date() })
      .where(eq(runs.id, input.runId));

    const kickoff = aggregate.scenario.kickoffText || aggregate.scenario.premise;
    if (kickoff) {
      const turn0Id = `turn_${input.runId}_0`;
      const event0Id = `event_${input.runId}_0`;
      const seg0Id = `segment_${input.runId}_0`;
      await tx.insert(turns).values({
        id: turn0Id,
        runId: input.runId,
        branchId: input.branchId,
        turnNumber: 0,
        parentTurnId: null,
        rawPlayerInput: '[Prologue / Introduction]',
        status: 'completed',
        stage: 'COMPLETED',
        finalNarrative: kickoff,
        idempotencyKey: `${input.runId}:turn:0`,
        expectedVersion: 1,
        startedAt: new Date(),
        endedAt: new Date(),
        attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
      }).onConflictDoNothing();

      await tx.insert(events).values({
        id: event0Id,
        runId: input.runId,
        branchId: input.branchId,
        turnId: turn0Id,
        eventType: 'kickoff',
        locationId: aggregate.scenario.startLocationId,
        worldTime: input.worldTime,
        canonicalDescription: kickoff,
        visibilityHints: ['scene_observable'],
        salience: 1,
        emotionalWeight: 0,
        attribution: { source: 'system', actorId: input.actorId, sourceIds: [revision.id] },
      }).onConflictDoNothing();

      await tx.insert(narrativeSegments).values({
        id: seg0Id,
        runId: input.runId,
        branchId: input.branchId,
        turnId: turn0Id,
        version: 1,
        segmentType: 'narration',
        eventIds: [event0Id],
        segmentOrder: 0,
        visibility: 'player_view',
        text: kickoff,
        attribution: { source: 'narrator', actorId: input.actorId, sourceIds: [event0Id] },
      }).onConflictDoNothing();

      await tx.insert(turnStreamEvents).values({
        turnId: turn0Id,
        eventKey: `${turn0Id}:completed`,
        eventType: 'turn.completed',
        payload: { turnId: turn0Id, narrative: kickoff },
      }).onConflictDoNothing();
    }

    return { runId: input.runId, branchId: input.branchId };
  });
}

export async function rebuildEventProjection<T>(
  db: Database,
  runId: string,
  branchId: string,
  initialState: T,
  reducer: (state: T, event: (typeof events)['$inferSelect']) => T,
): Promise<T> {
  const sourceEvents = await db
    .select()
    .from(events)
    .where(eq(events.runId, runId))
    .orderBy(asc(events.createdAt));
  return sourceEvents.filter((event) => event.branchId === branchId).reduce(reducer, initialState);
}

export async function compareProjectionChecksum<T>(
  db: Database,
  runId: string,
  branchId: string,
  liveState: T,
  reducer: (state: T, event: (typeof events)['$inferSelect']) => T,
): Promise<{ equal: boolean; rebuilt: T }> {
  const rebuilt = await rebuildEventProjection(db, runId, branchId, liveState, reducer);
  return { equal: JSON.stringify(rebuilt) === JSON.stringify(liveState), rebuilt };
}

export async function withCanonicalRun<T>(
  db: Database,
  runId: string,
  operation: () => Promise<T>,
): Promise<T> {
  return withRunAdvisoryLock(db, runId, async () => operation());
}
