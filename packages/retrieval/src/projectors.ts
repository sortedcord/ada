import type {
  Entity,
  Location,
  StoryCard,
  PlotPoint,
  Observation,
  Memory,
  InnerThought,
  Belief,
} from '@ada/domain';
import type { VisibilityScope } from './index.js';
import type { IndexedChunk } from './service.js';

export interface ProjectorOptions {
  runId?: string;
  branchId?: string;
  turn?: number;
}

export function projectScenarioRules(
  scenarioId: string,
  rules: readonly string[],
): readonly IndexedChunk[] {
  return rules.map((rule, idx) => {
    const text = rule.trim();
    return {
      id: `chunk:rule:${scenarioId}:${idx}`,
      sourceType: 'scenario_rule',
      sourceId: scenarioId,
      text,
      scope: 'public_scenario',
      keywords: ['rule', 'scenario', ...text.split(/\s+/).slice(0, 5)],
      recency: 1.0,
      salience: 0.9,
    };
  });
}

export function projectEntity(
  entity: Entity,
): readonly IndexedChunk[] {
  const chunks: IndexedChunk[] = [];

  if (entity.publicDescription?.trim()) {
    const text = `Entity ${entity.name}: ${entity.publicDescription.trim()}`;
    chunks.push({
      id: `chunk:entity_public:${entity.id}`,
      sourceType: 'entity_public',
      sourceId: entity.id,
      text,
      scope: 'public_scenario',
      keywords: [entity.name.toLowerCase(), entity.id, 'entity', 'character', 'profile'],
      recency: 1.0,
      salience: 0.8,
    });
  }

  if (entity.privateDescription?.trim() || (entity.secrets && entity.secrets.length > 0)) {
    const secretsText =
      entity.secrets && entity.secrets.length > 0 ? ` Secrets: ${entity.secrets.join('; ')}` : '';
    const text = `Private profile of ${entity.name}: ${(entity.privateDescription || '').trim()}${secretsText}`;
    chunks.push({
      id: `chunk:entity_private:${entity.id}`,
      sourceType: 'entity_private',
      sourceId: entity.id,
      text,
      scope: 'entity_private',
      ownerEntityId: entity.id,
      keywords: [entity.name.toLowerCase(), entity.id, 'private', 'secret'],
      recency: 1.0,
      salience: 1.0,
    });
  }

  return chunks;
}

export function projectLocation(
  location: Location,
): readonly IndexedChunk[] {
  const chunks: IndexedChunk[] = [];

  if (location.publicDescription?.trim()) {
    const text = `Location ${location.name}: ${location.publicDescription.trim()}`;
    chunks.push({
      id: `chunk:loc_public:${location.id}`,
      sourceType: 'location_public',
      sourceId: location.id,
      text,
      scope: 'public_scenario',
      keywords: [location.name.toLowerCase(), location.id, 'location', 'place', location.type],
      recency: 1.0,
      salience: 0.7,
    });
  }

  if (location.privateDetails?.trim()) {
    const text = `Private details of ${location.name}: ${location.privateDetails.trim()}`;
    chunks.push({
      id: `chunk:loc_private:${location.id}`,
      sourceType: 'location_private',
      sourceId: location.id,
      text,
      scope: 'world_truth',
      keywords: [location.name.toLowerCase(), location.id, 'location', 'secret_details'],
      recency: 1.0,
      salience: 0.9,
    });
  }

  return chunks;
}

export function projectStoryCard(
  card: StoryCard,
  versionNumber?: number,
): readonly IndexedChunk[] {
  const bodyText = card.canonicalBody?.trim() || '';
  const v = versionNumber ?? card.currentVersion ?? 1;
  const text = `Story Card [${card.title}]: ${bodyText}`;
  const scope: VisibilityScope =
    typeof card.scope === 'string'
      ? card.scope
      : card.scope.ownerEntityId
        ? 'entity_private'
        : 'public_scenario';
  return [
    {
      id: `chunk:story_card:${card.id}:v${v}`,
      sourceType: 'story_card',
      sourceId: card.id,
      text,
      scope,
      keywords: [card.title.toLowerCase(), card.id, 'lore', card.cardType],
      recency: 1.0,
      salience: 0.75,
    },
  ];
}

export function projectPlotPoint(
  point: PlotPoint,
): readonly IndexedChunk[] {
  const text = `Plot Point [${point.title}] (${point.status}): ${point.internalDescription.trim()}`;
  return [
    {
      id: `chunk:plot_point:${point.id}`,
      sourceType: 'plot_point',
      sourceId: point.id,
      text,
      scope: 'architect_private',
      keywords: [point.title.toLowerCase(), point.id, 'plot', point.status],
      recency: 1.0,
      salience: 0.85,
    },
  ];
}

export function projectCanonicalEvent(
  event: {
    id: string;
    turnId: string;
    eventType: string;
    canonicalDescription: string;
    salience?: number;
    worldTime?: Date | string;
  },
): readonly IndexedChunk[] {
  const text = `Event: ${event.canonicalDescription.trim()}`;
  return [
    {
      id: `chunk:event:${event.id}`,
      sourceType: 'event',
      sourceId: event.id,
      text,
      scope: 'world_truth',
      keywords: ['event', event.eventType, event.id],
      recency: 1.0,
      salience: event.salience ?? 0.8,
    },
  ];
}

export function projectObservation(
  observation: Observation & { id: string },
): readonly IndexedChunk[] {
  const text = `Observation (${observation.modality}): ${observation.perceivedContent.trim()}`;
  return [
    {
      id: `chunk:observation:${observation.id}`,
      sourceType: 'observation',
      sourceId: observation.id,
      text,
      scope: 'scene_observable',
      ownerEntityId: observation.observerEntityId,
      keywords: ['observation', observation.modality, observation.observerEntityId],
      recency: 1.0,
      salience: 0.7,
    },
  ];
}

export function projectMemory(
  memory: Memory,
): readonly IndexedChunk[] {
  const text = `Memory (${memory.type}): ${memory.content.trim()}`;
  return [
    {
      id: `chunk:memory:${memory.id}`,
      sourceType: 'memory',
      sourceId: memory.id,
      text,
      scope: 'entity_private',
      ownerEntityId: memory.ownerEntityId,
      keywords: ['memory', memory.type, memory.ownerEntityId],
      recency: memory.accessibility,
      salience: memory.importance,
    },
  ];
}

export function projectThought(
  thought: InnerThought,
): readonly IndexedChunk[] {
  const text = `Thought: ${thought.text.trim()}`;
  return [
    {
      id: `chunk:thought:${thought.id}`,
      sourceType: 'thought',
      sourceId: thought.id,
      text,
      scope: 'entity_private',
      ownerEntityId: thought.ownerEntityId,
      keywords: ['thought', thought.persistence, thought.ownerEntityId],
      recency: 1.0,
      salience: thought.salience,
    },
  ];
}

export function projectBelief(
  belief: Belief,
): readonly IndexedChunk[] {
  const text = `Belief (${Math.round(belief.confidence * 100)}% sure): ${belief.rendering.trim()}`;
  return [
    {
      id: `chunk:belief:${belief.id}`,
      sourceType: 'belief',
      sourceId: belief.id,
      text,
      scope: 'entity_private',
      ownerEntityId: belief.ownerEntityId,
      keywords: ['belief', belief.ownerEntityId, belief.subject, belief.predicate],
      recency: 1.0,
      salience: belief.salience,
    },
  ];
}
