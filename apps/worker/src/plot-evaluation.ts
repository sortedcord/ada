import { and, eq, lte, sql } from 'drizzle-orm';
import { applyPlotEvaluation, architectStateSchema, evaluatePlotPoint } from '@ada/architect';
import { architectState, eventFacts, events, outbox, runs, scenarioRevisions, turns, type Database } from '@ada/db';
import { withTransactionRetry } from '@ada/db';
import { plotPointSchema, transitionPlot, type PlotPoint, type ScenarioAggregate } from '@ada/domain';

/** Only a sourced, observable machine-keyed canonical fact can satisfy a condition. */
function evidencedConditions(
  point: PlotPoint,
  rows: readonly { key: string; value: unknown; eventId: string; source: unknown; locationId: string }[],
): { keys: Set<string>; evidenceByKey: Map<string, string[]> } {
  const conditions = new Map([
    ...(point.factConditions?.preconditions ?? []),
    ...(point.factConditions?.resolutionConditions ?? []),
    ...(point.factConditions?.forbiddenOutcomes ?? []),
  ].map((condition) => [condition.key, condition.trigger]));
  const evidenceByKey = new Map<string, string[]>();
  for (const row of rows) {
    const trigger = conditions.get(row.key);
    if (row.value !== true || !trigger || trigger.locationId !== row.locationId ||
      !row.source || typeof row.source !== 'object' ||
      !('type' in row.source) || row.source.type !== 'event' ||
      !('id' in row.source) || row.source.id !== row.eventId ||
      !('trigger' in row.source) || JSON.stringify(row.source.trigger) !== JSON.stringify(trigger)) continue;
    const ids = evidenceByKey.get(row.key) ?? [];
    if (!ids.includes(row.eventId)) ids.push(row.eventId);
    evidenceByKey.set(row.key, ids);
  }
  return { keys: new Set(evidenceByKey.keys()), evidenceByKey };
}

/** Project a committed turn's branch-local canonical facts, and acknowledge in the same transaction. */
export async function processPlotEvaluation(db: Database, outboxId: string, payload: unknown): Promise<void> {
  if (!payload || typeof payload !== 'object' || !('runId' in payload) || !('turnId' in payload) ||
      typeof payload.runId !== 'string' || typeof payload.turnId !== 'string')
    throw new Error('plot.evaluate requires runId and turnId');
  const { runId, turnId } = payload;
  await withTransactionRetry(db, async (tx) => {
    const [message] = await tx.select({ status: outbox.status, topic: outbox.topic }).from(outbox)
      .where(eq(outbox.id, outboxId)).for('update');
    if (!message || message.topic !== 'plot.evaluate') throw new Error('plot.evaluate outbox row not found');
    if (message.status === 'processed') return;
    if (message.status !== 'pending') throw new Error('plot.evaluate outbox row is not pending');

    const [turn] = await tx.select({ branchId: turns.branchId, turnNumber: turns.turnNumber, status: turns.status })
      .from(turns).where(and(eq(turns.id, turnId), eq(turns.runId, runId)));
    if (!turn || turn.status !== 'completed') throw new Error('plot.evaluate requires a completed turn in the requested run');
    const [run] = await tx.select({ revisionId: runs.scenarioRevisionId }).from(runs).where(eq(runs.id, runId));
    if (!run) throw new Error('plot.evaluate run not found');
    const [revision] = await tx.select({ status: scenarioRevisions.status, aggregate: scenarioRevisions.aggregate })
      .from(scenarioRevisions).where(eq(scenarioRevisions.id, run.revisionId));
    if (!revision || revision.status !== 'published') throw new Error('plot.evaluate requires a published scenario revision');
    const [record] = await tx.select().from(architectState)
      .where(and(eq(architectState.runId, runId), eq(architectState.branchId, turn.branchId))).for('update');
    if (!record) throw new Error('plot.evaluate architect state not found for turn branch');
    const [earlier] = await tx.select({ id: outbox.id }).from(outbox)
      .innerJoin(turns, eq(outbox.id, sql`${turns.id} || ':plots'`))
      .where(and(eq(outbox.topic, 'plot.evaluate'), eq(turns.runId, runId),
        eq(turns.branchId, turn.branchId), eq(turns.status, 'completed'),
        sql`${turns.turnNumber} < ${turn.turnNumber}`, sql`${outbox.status} <> 'processed'`))
      .limit(1);
    if (earlier) throw new Error('plot.evaluate waiting for earlier branch turn');

    const facts = await tx.select({ key: eventFacts.key, value: eventFacts.value, eventId: eventFacts.eventId, sourceTurnId: events.turnId, visibility: eventFacts.visibility, source: eventFacts.source, locationId: events.locationId })
      .from(eventFacts).innerJoin(events, eq(events.id, eventFacts.eventId))
      .innerJoin(turns, eq(turns.id, events.turnId))
      .where(and(eq(events.runId, runId), eq(events.branchId, turn.branchId),
        eq(turns.runId, runId), eq(turns.branchId, turn.branchId), eq(turns.status, 'completed'),
        lte(turns.turnNumber, turn.turnNumber)))
      .orderBy(turns.turnNumber, events.id, eventFacts.id);
    const aggregate = revision.aggregate as ScenarioAggregate;
    const original = architectStateSchema.parse(record.state);
    let state = original;
    if (!Array.isArray(aggregate.plotPoints)) throw new Error('Published scenario plot definitions are invalid');
    for (const definition of aggregate.plotPoints) {
      const point = plotPointSchema.parse(definition);
      if (point.revisionId !== aggregate.scenario.revisionId) throw new Error('Published plot point has mismatched revision');
      const status = state.plotStatuses[point.id];
      if (!status) throw new Error(`Missing architect plot status: ${point.id}`);
      const { keys, evidenceByKey } = evidencedConditions(point, facts.filter((fact) => fact.visibility === 'scene_observable'));
      const conditions = point.factConditions;
      const matchedConditions = status === 'active' ? [...(conditions?.forbiddenOutcomes ?? []), ...(conditions?.resolutionConditions ?? [])]
        : conditions?.preconditions ?? [];
      const candidateEvidenceIds = [...new Set(matchedConditions.flatMap(({ key }) => evidenceByKey.get(key) ?? []))];
      const result = evaluatePlotPoint({ ...point, status }, keys, candidateEvidenceIds);
      if (result.status === 'unchanged') continue;
      const matched = result.status === 'failed' ? conditions?.forbiddenOutcomes ?? []
        : result.status === 'resolved' ? conditions?.resolutionConditions ?? [] : conditions?.preconditions ?? [];
      const evidenceIds = [...new Set(matched.flatMap(({ key }) => evidenceByKey.get(key) ?? []))];
      // A previously processed fact cannot promote the same point again on a later turn.
      if (!facts.some((fact) => fact.sourceTurnId === turnId && evidenceIds.includes(fact.eventId))) continue;
      transitionPlot({ ...point, status }, result.status, evidenceIds);
      state = applyPlotEvaluation(state, point.id, { ...result, evidenceIds });
    }
    if (state !== original) {
      await tx.update(architectState).set({ state, version: sql`${architectState.version} + 1`, updatedAt: new Date(),
        attribution: { source: 'system', sourceIds: [turnId] } })
        .where(and(eq(architectState.runId, runId), eq(architectState.branchId, turn.branchId)));
    }
    await tx.update(outbox).set({ status: 'processed', processedAt: new Date(), updatedAt: new Date() })
      .where(eq(outbox.id, outboxId));
  });
}
