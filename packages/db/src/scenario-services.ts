import { eq } from 'drizzle-orm';
import { validateScenarioAggregate, type ScenarioAggregate } from '@ada/domain';
import type { Database } from './index.js';
import { scenarioRevisions, scenarios } from './schema.js';
import { snapshotChecksum, withTransactionRetry } from './repositories.js';

export async function loadScenarioAggregate(
  db: Database,
  revisionId: string,
): Promise<ScenarioAggregate> {
  const [revision] = await db
    .select()
    .from(scenarioRevisions)
    .where(eq(scenarioRevisions.id, revisionId))
    .limit(1);
  if (!revision) throw new Error('Scenario revision not found');
  const aggregate = revision.aggregate as ScenarioAggregate;
  const result = validateScenarioAggregate(aggregate);
  if (!result.valid)
    throw new Error(
      `Scenario revision is invalid: ${result.errors.map((error) => error.path).join(', ')}`,
    );
  return aggregate;
}

function collectIds(value: unknown, ids: Set<string>): void {
  if (Array.isArray(value)) {
    for (const item of value) collectIds(item, ids);
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, nested] of Object.entries(value)) {
    if (key === 'id' && typeof nested === 'string') ids.add(nested);
    collectIds(nested, ids);
  }
}
function remapIds(value: unknown, idMap: ReadonlyMap<string, string>): unknown {
  if (Array.isArray(value)) return value.map((item) => remapIds(item, idMap));
  if (!value || typeof value !== 'object')
    return typeof value === 'string' && idMap.has(value) ? idMap.get(value) : value;
  return Object.fromEntries(
    Object.entries(value).map(([key, nested]) => [key, remapIds(nested, idMap)]),
  );
}

export async function cloneScenarioRevision(
  db: Database,
  input: {
    sourceRevisionId: string;
    newScenarioId: string;
    newRevisionId: string;
    newSlug: string;
    actorId?: string;
  },
): Promise<{ scenarioId: string; revisionId: string }> {
  return withTransactionRetry(db, async (tx) => {
    const [source] = await tx
      .select()
      .from(scenarioRevisions)
      .where(eq(scenarioRevisions.id, input.sourceRevisionId))
      .limit(1);
    if (!source) throw new Error('Source scenario revision not found');
    const [sourceScenario] = await tx
      .select()
      .from(scenarios)
      .where(eq(scenarios.id, source.scenarioId))
      .limit(1);
    if (!sourceScenario) throw new Error('Source scenario not found');
    const ids = new Set<string>();
    collectIds(source.aggregate, ids);
    ids.add(source.id);
    const idMap = new Map([...ids].map((id) => [id, `${input.newScenarioId}_${id}`]));
    const aggregate = remapIds(source.aggregate, idMap) as ScenarioAggregate;
    aggregate.scenario.id = input.newScenarioId;
    aggregate.scenario.revisionId = input.newRevisionId;
    aggregate.scenario.slug = input.newSlug;
    for (const collection of [
      'entities',
      'relationships',
      'locations',
      'locationEdges',
      'storyCards',
      'plotArcs',
      'plotPoints',
    ] as const) {
      for (const item of aggregate[collection]) item.revisionId = input.newRevisionId;
    }
    const checksum = snapshotChecksum(JSON.stringify(aggregate));
    await tx.insert(scenarios).values({
      id: input.newScenarioId,
      slug: input.newSlug,
      title: sourceScenario.title,
      status: 'draft',
      currentRevision: 1,
      attribution: { source: 'system', actorId: input.actorId, sourceIds: [source.id] },
    });
    await tx.insert(scenarioRevisions).values({
      id: input.newRevisionId,
      scenarioId: input.newScenarioId,
      revisionNumber: 1,
      status: 'draft',
      aggregate,
      checksum,
      attribution: { source: 'system', actorId: input.actorId, sourceIds: [source.id] },
    });
    return { scenarioId: input.newScenarioId, revisionId: input.newRevisionId };
  });
}
