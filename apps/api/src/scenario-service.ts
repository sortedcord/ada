import { createHash, randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, sql } from 'drizzle-orm';
import { validateScenarioAggregate, type ScenarioAggregate } from '@ada/domain';
import {
  auditLog,
  rollbackStoryCard,
  scenarioRevisions,
  scenarios,
  storyCardLinks,
  storyCardVersions,
  storyCards,
  type Database,
  withTransactionRetry,
} from '@ada/db';

export class OptimisticConflictError extends Error {
  constructor(readonly current: unknown) {
    super('Optimistic conflict');
    this.name = 'OptimisticConflictError';
  }
}

export class ScenarioService {
  constructor(private readonly db: Database) {}

  private checksum(aggregate: ScenarioAggregate): string {
    return createHash('sha256').update(JSON.stringify(aggregate)).digest('hex');
  }

  async list(limit = 25, filters: { search?: string; status?: string; tag?: string } = {}) {
    const conditions = [];
    if (filters.status) conditions.push(eq(scenarios.status, filters.status));
    if (filters.search) conditions.push(ilike(scenarios.title, `%${filters.search}%`));
    if (filters.tag)
      conditions.push(sql`${scenarios.tags} @> ${JSON.stringify([filters.tag])}::jsonb`);
    return this.db
      .select()
      .from(scenarios)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(scenarios.updatedAt))
      .limit(limit);
  }

  async get(scenarioId: string) {
    const [scenario] = await this.db
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, scenarioId))
      .limit(1);
    if (!scenario) return undefined;
    const [revision] = await this.db
      .select()
      .from(scenarioRevisions)
      .where(
        and(
          eq(scenarioRevisions.scenarioId, scenarioId),
          eq(scenarioRevisions.revisionNumber, scenario.currentRevision),
        ),
      )
      .limit(1);
    return revision ? { scenario, revision } : undefined;
  }

  async importAggregate(aggregate: ScenarioAggregate, actorId?: string) {
    const existing = await this.db
      .select({ id: scenarios.id })
      .from(scenarios)
      .where(eq(scenarios.id, aggregate.scenario.id))
      .limit(1);
    if (!existing.length) return this.create(aggregate, actorId);
    const newScenarioId = `scenario_${randomUUID().replaceAll('-', '')}`;
    const newRevisionId = `revision_${randomUUID().replaceAll('-', '')}`;
    const ids = new Set<string>();
    const collect = (value: unknown): void => {
      if (Array.isArray(value)) {
        value.forEach(collect);
        return;
      }
      if (!value || typeof value !== 'object') return;
      for (const [key, nested] of Object.entries(value)) {
        if (key === 'id' && typeof nested === 'string') ids.add(nested);
        collect(nested);
      }
    };
    collect(aggregate);
    const map = new Map([...ids].map((id) => [id, `${newScenarioId}_${id}`]));
    const remap = (value: unknown): unknown => {
      if (Array.isArray(value)) return value.map(remap);
      if (!value || typeof value !== 'object')
        return typeof value === 'string' && map.has(value) ? map.get(value) : value;
      return Object.fromEntries(Object.entries(value).map(([key, nested]) => [key, remap(nested)]));
    };
    const imported = remap(aggregate) as ScenarioAggregate;
    imported.scenario.id = newScenarioId;
    imported.scenario.revisionId = newRevisionId;
    imported.scenario.slug = `${imported.scenario.slug}-import-${newScenarioId.slice(-8)}`;
    for (const collection of [
      'entities',
      'relationships',
      'locations',
      'locationEdges',
      'storyCards',
      'plotArcs',
      'plotPoints',
    ] as const)
      for (const item of imported[collection]) item.revisionId = newRevisionId;
    return this.create(imported, actorId);
  }

  async create(aggregate: ScenarioAggregate, actorId?: string) {
    const validation = validateScenarioAggregate(aggregate);
    if (!validation.valid)
      throw new Error(
        validation.errors.map((error) => `${error.path}: ${error.message}`).join('; '),
      );
    const scenarioId = aggregate.scenario.id || `scenario_${randomUUID().replaceAll('-', '')}`;
    const revisionId =
      aggregate.scenario.revisionId || `revision_${randomUUID().replaceAll('-', '')}`;
    aggregate.scenario.id = scenarioId;
    aggregate.scenario.revisionId = revisionId;
    return withTransactionRetry(this.db, async (tx) => {
      await tx.insert(scenarios).values({
        id: scenarioId,
        slug: aggregate.scenario.slug,
        title: aggregate.scenario.title,
        tags: aggregate.scenario.tags,
        status: 'draft',
        currentRevision: 1,
        attribution: { source: 'player', actorId, sourceIds: [] },
      });
      await tx.insert(scenarioRevisions).values({
        id: revisionId,
        scenarioId,
        revisionNumber: 1,
        status: 'draft',
        aggregate,
        checksum: this.checksum(aggregate),
        attribution: { source: 'player', actorId, sourceIds: [] },
      });
      for (const card of aggregate.storyCards) {
        await tx
          .insert(storyCards)
          .values({
            id: card.id,
            revisionId,
            title: card.title,
            cardType: card.cardType,
            mutationPolicy: card.mutationPolicy,
            locked: card.locked,
            currentVersion: card.currentVersion,
            attribution: { source: 'player', actorId, sourceIds: [revisionId] },
          })
          .onConflictDoNothing();
        await tx
          .insert(storyCardVersions)
          .values({
            id: `${card.id}_v${card.currentVersion}`,
            cardId: card.id,
            version: card.currentVersion,
            body: card,
            scope: card.scope.kind,
            source: card.source,
            diff: [],
            attribution: { source: 'player', actorId, sourceIds: [revisionId] },
          })
          .onConflictDoNothing();
      }
      for (const link of aggregate.storyCardLinks)
        await tx
          .insert(storyCardLinks)
          .values({
            id: link.id,
            cardId: link.cardId,
            targetType: link.targetType,
            targetId: link.targetId,
            relationType: link.relationType,
            weight: link.weight,
            attribution: { source: 'player', actorId, sourceIds: [revisionId] },
          })
          .onConflictDoNothing();
      await tx.insert(auditLog).values({
        id: randomUUID(),
        actor: actorId ?? 'local-system',
        action: 'scenario.create',
        resourceType: 'scenario',
        resourceId: scenarioId,
        requestId: actorId ?? 'system',
        afterRef: { revisionId },
        attribution: { source: 'player', actorId, sourceIds: [revisionId] },
      });
      return { scenarioId, revisionId };
    });
  }

  async revisions(scenarioId: string) {
    return this.db
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.scenarioId, scenarioId))
      .orderBy(desc(scenarioRevisions.revisionNumber));
  }

  async archive(
    scenarioId: string,
    archived: boolean,
    expectedVersion: number,
    actorId = 'local-system',
  ) {
    return this.patch(
      scenarioId,
      expectedVersion,
      { status: archived ? 'archived' : 'draft' },
      actorId,
    );
  }

  async diff(scenarioId: string, fromRevision: number, toRevision: number) {
    const revisions = await this.db
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.scenarioId, scenarioId));
    const from = revisions.find((revision) => revision.revisionNumber === fromRevision);
    const to = revisions.find((revision) => revision.revisionNumber === toRevision);
    if (!from || !to) throw new Error('Scenario revision not found');
    const changes: Array<{ path: string; before: unknown; after: unknown }> = [];
    const before = from.aggregate as Record<string, unknown>;
    const after = to.aggregate as Record<string, unknown>;
    for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key]))
        changes.push({ path: `/${key}`, before: before[key], after: after[key] });
    }
    return { scenarioId, fromRevision, toRevision, changes };
  }

  async knowledgePreview(scenarioId: string, entityId: string) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    const aggregate = record.revision.aggregate as ScenarioAggregate;
    const entity = aggregate.entities.find((candidate) => candidate.id === entityId);
    if (!entity) throw new Error('Entity not found');
    const resources = [
      {
        id: aggregate.scenario.id,
        scope: 'public_scenario',
        text: aggregate.scenario.premise,
        sourceId: aggregate.scenario.id,
      },
      ...aggregate.scenario.worldRules.map((text, index) => ({
        id: `${aggregate.scenario.id}_rule_${index}`,
        scope: 'public_scenario',
        text,
        sourceId: aggregate.scenario.id,
      })),
      {
        id: entity.id,
        scope: 'entity_private',
        text: entity.privateDescription,
        sourceId: entity.id,
      },
      ...aggregate.locations
        .filter((location) => location.id === entity.startingLocationId)
        .map((location) => ({
          id: location.id,
          scope: 'public_scenario',
          text: location.publicDescription,
          sourceId: location.id,
        })),
      ...aggregate.storyCards
        .filter(
          (card) =>
            card.scope.kind === 'global' ||
            card.scope.ownerEntityId === entity.id ||
            card.scope.locationId === entity.startingLocationId,
        )
        .map((card) => ({
          id: card.id,
          scope: card.scope.ownerEntityId === entity.id ? 'entity_private' : 'public_scenario',
          text:
            card.scope.ownerEntityId === entity.id
              ? card.canonicalBody
              : (card.playerVisibleBody ?? card.canonicalBody),
          sourceId: card.id,
        })),
    ];
    return { principal: { kind: 'NPC', entityId }, resources };
  }

  async validate(scenarioId: string) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    return validateScenarioAggregate(record.revision.aggregate as ScenarioAggregate);
  }

  async patch(
    scenarioId: string,
    expectedVersion: number,
    patch: { title?: string; status?: 'draft' | 'valid' | 'archived' },
    actorId = 'local-system',
  ) {
    const [updated] = await this.db
      .update(scenarios)
      .set({ ...patch, version: expectedVersion + 1, updatedAt: new Date() })
      .where(and(eq(scenarios.id, scenarioId), eq(scenarios.version, expectedVersion)))
      .returning();
    if (!updated) {
      const current = await this.db
        .select()
        .from(scenarios)
        .where(eq(scenarios.id, scenarioId))
        .limit(1);
      throw new OptimisticConflictError(current[0] ?? null);
    }
    await this.db.insert(auditLog).values({
      id: randomUUID(),
      actor: actorId,
      action: 'scenario.update',
      resourceType: 'scenario',
      resourceId: scenarioId,
      requestId: actorId,
      beforeRef: { version: expectedVersion },
      afterRef: updated,
      attribution: { source: 'player', actorId, sourceIds: [scenarioId] },
    });
    return updated;
  }

  async publish(scenarioId: string, actorId = 'local-system') {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    const validation = validateScenarioAggregate(record.revision.aggregate as ScenarioAggregate);
    if (!validation.valid) throw new Error('Scenario is not valid for publication');
    return withTransactionRetry(this.db, async (tx) => {
      await tx
        .update(scenarioRevisions)
        .set({ status: 'published', updatedAt: new Date(), version: record.revision.version + 1 })
        .where(
          and(
            eq(scenarioRevisions.id, record.revision.id),
            eq(scenarioRevisions.version, record.revision.version),
          ),
        );
      await tx
        .update(scenarios)
        .set({ status: 'valid', version: record.scenario.version + 1, updatedAt: new Date() })
        .where(eq(scenarios.id, scenarioId));
      await tx.insert(auditLog).values({
        id: randomUUID(),
        actor: actorId,
        action: 'scenario.publish',
        resourceType: 'scenario_revision',
        resourceId: record.revision.id,
        requestId: actorId,
        afterRef: { status: 'published' },
        attribution: { source: 'player', actorId, sourceIds: [record.revision.id] },
      });
      return { revisionId: record.revision.id, warnings: validation.warnings };
    });
  }

  async patchAggregate(
    scenarioId: string,
    expectedVersion: number,
    patch: Record<string, unknown>,
    actorId = 'local-system',
  ) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    if (record.revision.status === 'published')
      throw new Error('Published revisions are immutable');
    const aggregate = structuredClone(record.revision.aggregate) as ScenarioAggregate;
    Object.assign(aggregate.scenario, patch);
    const validation = validateScenarioAggregate(aggregate);
    if (!validation.valid)
      throw new Error(
        validation.errors.map((error) => `${error.path}: ${error.message}`).join('; '),
      );
    const result = await this.db
      .update(scenarioRevisions)
      .set({
        aggregate,
        checksum: this.checksum(aggregate),
        version: expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scenarioRevisions.id, record.revision.id),
          eq(scenarioRevisions.version, expectedVersion),
        ),
      )
      .returning();
    if (!result.length) throw new OptimisticConflictError(record.revision);
    await this.db.insert(auditLog).values({
      id: randomUUID(),
      actor: actorId,
      action: 'scenario.aggregate.update',
      resourceType: 'scenario_revision',
      resourceId: record.revision.id,
      requestId: actorId,
      afterRef: { patch },
      attribution: { source: 'player', actorId, sourceIds: [record.revision.id] },
    });
    return result[0];
  }

  async updateCollection(
    scenarioId: string,
    expectedVersion: number,
    collection: string,
    operation: 'add' | 'replace' | 'remove',
    resourceId: string | undefined,
    value: unknown,
    actorId = 'local-system',
  ) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    if (record.revision.status === 'published')
      throw new Error('Published revisions are immutable');
    const aggregate = structuredClone(record.revision.aggregate) as ScenarioAggregate &
      Record<string, unknown>;
    const current = Array.isArray(aggregate[collection])
      ? [...(aggregate[collection] as unknown[])]
      : [];
    if (operation === 'add') current.push(value);
    else if (operation === 'replace') {
      const index = current.findIndex(
        (item) =>
          typeof item === 'object' && item !== null && 'id' in item && item.id === resourceId,
      );
      if (index < 0) throw new Error('Resource not found');
      current[index] = value;
    } else {
      aggregate[collection] = current.filter(
        (item) =>
          typeof item !== 'object' || item === null || !('id' in item) || item.id !== resourceId,
      );
    }
    if (operation !== 'remove') aggregate[collection] = current;
    const validation = validateScenarioAggregate(aggregate);
    if (!validation.valid)
      throw new Error(
        validation.errors.map((error) => `${error.path}: ${error.message}`).join('; '),
      );
    await this.db
      .update(scenarioRevisions)
      .set({
        aggregate,
        checksum: this.checksum(aggregate),
        version: expectedVersion + 1,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(scenarioRevisions.id, record.revision.id),
          eq(scenarioRevisions.version, expectedVersion),
        ),
      );
    if (collection === 'storyCards' && operation === 'add' && value && typeof value === 'object') {
      const card = value as Record<string, unknown>;
      await this.db
        .insert(storyCards)
        .values({
          id: String(card.id),
          revisionId: record.revision.id,
          title: typeof card.title === 'string' ? card.title : '',
          cardType: typeof card.cardType === 'string' ? card.cardType : 'custom',
          mutationPolicy:
            typeof card.mutationPolicy === 'string' ? card.mutationPolicy : 'manual_only',
          locked: Boolean(card.locked),
          currentVersion: 1,
          attribution: { source: 'player', sourceIds: [record.revision.id] },
        })
        .onConflictDoNothing();
      await this.db
        .insert(storyCardVersions)
        .values({
          id: `${String(card.id)}_v1`,
          cardId: String(card.id),
          version: 1,
          body: card,
          scope: typeof card.scope === 'object' ? JSON.stringify(card.scope) : 'public_scenario',
          source: 'player',
          diff: [],
          attribution: { source: 'player', sourceIds: [record.revision.id] },
        })
        .onConflictDoNothing();
    }
    if (
      collection === 'storyCardLinks' &&
      operation === 'add' &&
      value &&
      typeof value === 'object'
    ) {
      const link = value as Record<string, unknown>;
      await this.db
        .insert(storyCardLinks)
        .values({
          id: String(link.id),
          cardId: String(link.cardId),
          targetType: String(link.targetType),
          targetId: String(link.targetId),
          relationType: typeof link.relationType === 'string' ? link.relationType : '',
          weight: Number(link.weight ?? 0),
          attribution: { source: 'player', sourceIds: [record.revision.id] },
        })
        .onConflictDoNothing();
    }
    await this.db.insert(auditLog).values({
      id: randomUUID(),
      actor: actorId,
      action: `scenario.${operation}.${collection}`,
      resourceType: 'scenario_revision',
      resourceId: record.revision.id,
      requestId: actorId,
      afterRef: { collection, resourceId },
      attribution: { source: 'player', actorId, sourceIds: [record.revision.id] },
    });
    return aggregate[collection];
  }

  async cardVersions(cardId: string) {
    return this.db
      .select()
      .from(storyCardVersions)
      .where(eq(storyCardVersions.cardId, cardId))
      .orderBy(desc(storyCardVersions.version));
  }
  async lockCard(cardId: string, locked: boolean) {
    const [updated] = await this.db
      .update(storyCards)
      .set({ locked, updatedAt: new Date(), version: sql`${storyCards.version} + 1` })
      .where(eq(storyCards.id, cardId))
      .returning();
    if (!updated) throw new Error('Story card not found');
    return updated;
  }
  async rollbackCard(cardId: string, sourceVersion: number, actorId: string) {
    return rollbackStoryCard(this.db, {
      cardId,
      sourceVersion,
      outboxKey: `${cardId}:${sourceVersion}:${actorId}`,
    });
  }
  async cardLinks(cardId: string) {
    return this.db.select().from(storyCardLinks).where(eq(storyCardLinks.cardId, cardId));
  }

  async duplicateCollection(
    scenarioId: string,
    expectedVersion: number,
    collection: string,
    resourceId: string,
    newId: string,
    actorId = 'local-system',
  ) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    const aggregate = structuredClone(record.revision.aggregate) as ScenarioAggregate &
      Record<string, unknown>;
    const current = Array.isArray(aggregate[collection])
      ? (aggregate[collection] as Array<Record<string, unknown>>)
      : [];
    const source = current.find((item) => item.id === resourceId);
    if (!source) throw new Error('Resource not found');
    if (current.some((item) => item.id === newId)) throw new Error('Duplicate resource ID');
    current.push({ ...structuredClone(source), id: newId });
    return this.updateCollection(
      scenarioId,
      expectedVersion,
      collection,
      'add',
      undefined,
      current.at(-1),
      actorId,
    );
  }

  async archiveCollection(
    scenarioId: string,
    expectedVersion: number,
    collection: string,
    resourceId: string,
    actorId = 'local-system',
  ) {
    const record = await this.get(scenarioId);
    if (!record) throw new Error('Scenario not found');
    const aggregate = structuredClone(record.revision.aggregate) as ScenarioAggregate &
      Record<string, unknown>;
    const current = Array.isArray(aggregate[collection])
      ? (aggregate[collection] as Array<Record<string, unknown>>)
      : [];
    const source = current.find((item) => item.id === resourceId);
    if (!source) throw new Error('Resource not found');
    return this.updateCollection(
      scenarioId,
      expectedVersion,
      collection,
      'replace',
      resourceId,
      { ...source, active: false, archived: true },
      actorId,
    );
  }
}
