import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  entitySchema,
  locationEdgeSchema,
  locationSchema,
  plotArcSchema,
  plotPointSchema,
  relationshipSchema,
  scenarioSchema,
  storyCardLinkSchema,
  storyCardSchema,
  validateScenarioAggregate,
  type ScenarioAggregate,
} from '@ada/domain';
import { migrateScenarioExport } from './scenario-export.js';

const tideLedgerPath = fileURLToPath(
  new URL('../../../scenarios/the-tide-keeps-its-ledger.scenario.json', import.meta.url),
);
const lastSlotPath = fileURLToPath(
  new URL('../../../scenarios/the-last-slot.scenario.json', import.meta.url),
);

describe('curated scenario packages', () => {
  it('keeps The Tide Keeps Its Ledger importable, playable, interconnected, and privacy-aware', async () => {
    const file = await readFile(tideLedgerPath, 'utf8');
    const scenarioExport = migrateScenarioExport(JSON.parse(file));
    const aggregate = scenarioExport.aggregate as unknown as ScenarioAggregate;
    scenarioSchema.parse(aggregate.scenario);
    aggregate.entities.forEach((entity) => entitySchema.parse(entity));
    aggregate.relationships.forEach((relationship) => relationshipSchema.parse(relationship));
    aggregate.locations.forEach((location) => locationSchema.parse(location));
    aggregate.locationEdges.forEach((edge) => locationEdgeSchema.parse(edge));
    aggregate.storyCards.forEach((card) => storyCardSchema.parse(card));
    aggregate.storyCardLinks.forEach((link) => storyCardLinkSchema.parse(link));
    aggregate.plotArcs.forEach((arc) => plotArcSchema.parse(arc));
    aggregate.plotPoints.forEach((point) => plotPointSchema.parse(point));
    const validation = validateScenarioAggregate(aggregate);

    expect(validation).toEqual({ valid: true, errors: [], warnings: [] });
    expect(aggregate.scenario.slug).toBe('the-tide-keeps-its-ledger');
    expect(
      aggregate.entities.filter((entity) => entity.playable).map((entity) => entity.id),
    ).toEqual(['entity_tomas_vale']);
    expect(aggregate.entities).toHaveLength(7);
    const tomas = aggregate.entities.find((entity) => entity.id === 'entity_tomas_vale');
    expect(tomas?.history).toContain('Night of Three Bells');
    expect(tomas?.privateDescription).toContain('01:36');
    expect(aggregate.relationships.length).toBeGreaterThanOrEqual(40);
    expect(aggregate.locations).toHaveLength(8);
    expect(aggregate.storyCards.length).toBeGreaterThanOrEqual(15);
    // The current persistence schema stores link weights as integers, so this
    // curated import uses valid domain weights that are also database-safe.
    expect(aggregate.storyCardLinks.every((link) => Number.isInteger(link.weight))).toBe(true);
    expect(aggregate.plotArcs).toHaveLength(3);
    expect(aggregate.plotPoints.length).toBeGreaterThanOrEqual(8);

    const directedPairs = new Set(
      aggregate.relationships.map(
        (relationship) => `${relationship.sourceEntityId}->${relationship.targetEntityId}`,
      ),
    );
    expect(directedPairs.size).toBe(aggregate.relationships.length);
    for (const relationship of aggregate.relationships) {
      expect(directedPairs).toContain(
        `${relationship.targetEntityId}->${relationship.sourceEntityId}`,
      );
    }
    const nera = aggregate.entities.find((entity) => entity.id === 'entity_nera_quill');
    expect(nera?.privateDescription).toContain('does not know whether Tomas read it');

    const privateCanaries = [
      'HOLD UNTIL GLASS IS STABLE',
      'The cut mooring rope contains a segment of city signal wire.',
      'The north gate’s crack will widen under the coming king tide.',
    ];
    const publicText = JSON.stringify({
      scenario: aggregate.scenario,
      entities: aggregate.entities.map((entity) => ({
        id: entity.id,
        publicDescription: entity.publicDescription,
        history: entity.history,
        historicalEvents: entity.historicalEvents.filter((event) => event.visibility === 'public'),
      })),
      relationships: aggregate.relationships.map((relationship) => ({
        publicState: relationship.publicState,
        historySummary: relationship.historySummary,
      })),
      locations: aggregate.locations.map((location) => location.publicDescription),
      cards: aggregate.storyCards
        .filter((card) => card.scope.kind !== 'entity_private')
        .map((card) => ({ body: card.canonicalBody, playerVisibleBody: card.playerVisibleBody })),
    });
    for (const canary of privateCanaries) expect(publicText).not.toContain(canary);
  });

  it('keeps The Last Slot importable, portal-aware, and centered on a male playable student', async () => {
    const file = await readFile(lastSlotPath, 'utf8');
    const scenarioExport = migrateScenarioExport(JSON.parse(file));
    const aggregate = scenarioExport.aggregate as unknown as ScenarioAggregate;
    scenarioSchema.parse(aggregate.scenario);
    aggregate.entities.forEach((entity) => entitySchema.parse(entity));
    aggregate.relationships.forEach((relationship) => relationshipSchema.parse(relationship));
    aggregate.locations.forEach((location) => locationSchema.parse(location));
    aggregate.locationEdges.forEach((edge) => locationEdgeSchema.parse(edge));
    aggregate.storyCards.forEach((card) => storyCardSchema.parse(card));
    aggregate.storyCardLinks.forEach((link) => storyCardLinkSchema.parse(link));
    aggregate.plotArcs.forEach((arc) => plotArcSchema.parse(arc));
    aggregate.plotPoints.forEach((point) => plotPointSchema.parse(point));

    expect(validateScenarioAggregate(aggregate)).toEqual({ valid: true, errors: [], warnings: [] });
    expect(aggregate.scenario.slug).toBe('the-last-slot');
    expect(
      aggregate.entities.filter((entity) => entity.playable).map((entity) => entity.id),
    ).toEqual(['entity_eli_mendoza']);
    expect(aggregate.entities).toHaveLength(7);
    expect(aggregate.relationships.length).toBeGreaterThanOrEqual(24);
    expect(aggregate.locations).toHaveLength(10);
    expect(aggregate.plotArcs).toHaveLength(3);
    expect(aggregate.plotPoints).toHaveLength(7);

    const closedPortals = aggregate.locationEdges.filter(
      (edge) => edge.connectionKind === 'portal' && edge.portal?.defaultState === 'closed',
    );
    expect(closedPortals.map((edge) => edge.id)).toEqual(
      expect.arrayContaining(['portal_eli_room_door', 'portal_sound_booth_door']),
    );
    expect(closedPortals.every((edge) => edge.portal?.transmission.closed.sight === 0)).toBe(true);

    const directedPairs = new Set(
      aggregate.relationships.map(
        (relationship) => `${relationship.sourceEntityId}->${relationship.targetEntityId}`,
      ),
    );
    for (const relationship of aggregate.relationships) {
      expect(directedPairs).toContain(
        `${relationship.targetEntityId}->${relationship.sourceEntityId}`,
      );
    }
  });
});
