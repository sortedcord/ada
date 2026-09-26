import {
  defaultPortalTransmissionProfile,
  type Location,
  type LocationEdge,
  type PortalDefinition,
  type PortalState,
  type PortalTransmission,
} from '@ada/domain';

export interface RuntimePortalState {
  readonly state: PortalState;
  readonly transmission: PortalTransmission;
}

export interface RuntimePortalEdge {
  readonly id: string;
  readonly sourceLocationId: string;
  readonly destinationLocationId: string;
  readonly directed: boolean;
  readonly portal: PortalDefinition;
}

export interface SensoryTransmission {
  readonly sight: number;
  readonly sound: number;
  readonly hops: number;
}

export interface RuntimeLocationNode {
  readonly id: string;
  readonly parentLocationId?: string | null | undefined;
  readonly name?: string | undefined;
}

export type MovementIntent =
  | { readonly kind: 'none' }
  | { readonly kind: 'exit' }
  | { readonly kind: 'adjacent'; readonly label: string }
  | { readonly kind: 'travel'; readonly label: string };

const loudSoundPattern = /\b(?:shout|yell|scream|bang|slam|knock|pound|call\s+out)\b/i;
const spokenSoundPattern = /["“].+["”]|\b(?:say|ask|tell|reply|answer|call)\b/i;
const interactionSoundPattern = /\b(?:knock|tap|bang|open|close|pull|push|rattle)\b/i;
const exitPattern =
  /\b(?:leave|exit|walk|step|go|head|run)\b[^.]{0,80}\b(?:out|outside|away|back\s+out|through\s+(?:the\s+)?(?:door|gate|exit))\b/i;
const adjacentPattern =
  /\b(?:another|next|different|neighbor(?:ing)?|nearby)\s+(?:house|home|door|room|building|place|shop)\b/i;
const movementPattern = /\b(?:walk|go|head|step|run|travel|move)\b/i;

function clamp(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function sanitizeLocationId(value: string): string {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 90);
  return normalized || 'location';
}

function portalProfile(edge: RuntimePortalEdge): Record<PortalState, PortalTransmission> {
  return edge.portal.transmission ?? defaultPortalTransmissionProfile;
}

/** Converts authored portal edges into the graph needed at runtime. */
export function runtimePortalEdges(edges: readonly LocationEdge[]): readonly RuntimePortalEdge[] {
  return edges.flatMap((edge) =>
    edge.connectionKind === 'portal' && edge.portal
      ? [
          {
            id: edge.id,
            sourceLocationId: edge.sourceLocationId,
            destinationLocationId: edge.destinationLocationId,
            directed: edge.directed,
            portal: edge.portal,
          },
        ]
      : [],
  );
}

/** Returns a valid runtime state for an authored portal, including state-specific sensory attenuation. */
export function defaultRuntimePortalState(edge: RuntimePortalEdge): RuntimePortalState {
  const state = edge.portal.defaultState;
  return { state, transmission: portalProfile(edge)[state] };
}

/** Ignores malformed persisted state and derives transmission from the authored portal profile. */
export function normalizeRuntimePortalState(
  edge: RuntimePortalEdge,
  value: unknown,
): RuntimePortalState {
  if (!value || typeof value !== 'object') return defaultRuntimePortalState(edge);
  const candidate = value as { state?: unknown; transmission?: unknown };
  const state =
    typeof candidate.state === 'string' &&
    ['open', 'ajar', 'closed', 'locked', 'barred'].includes(candidate.state)
      ? (candidate.state as PortalState)
      : edge.portal.defaultState;
  const transmission = candidate.transmission as Partial<PortalTransmission> | undefined;
  if (
    transmission &&
    typeof transmission.sight === 'number' &&
    Number.isFinite(transmission.sight) &&
    typeof transmission.sound === 'number' &&
    Number.isFinite(transmission.sound)
  ) {
    return {
      state,
      transmission: { sight: clamp(transmission.sight), sound: clamp(transmission.sound) },
    };
  }
  return { state, transmission: portalProfile(edge)[state] };
}

export function runtimePortalStateFor(
  edge: RuntimePortalEdge,
  state: PortalState,
): RuntimePortalState {
  return { state, transmission: portalProfile(edge)[state] };
}

function edgesFrom(
  locationId: string,
  portals: readonly RuntimePortalEdge[],
): Array<{ edge: RuntimePortalEdge; targetLocationId: string }> {
  const result: Array<{ edge: RuntimePortalEdge; targetLocationId: string }> = [];
  for (const edge of portals) {
    if (edge.sourceLocationId === locationId) {
      result.push({ edge, targetLocationId: edge.destinationLocationId });
    }
    if (!edge.directed && edge.destinationLocationId === locationId) {
      result.push({ edge, targetLocationId: edge.sourceLocationId });
    }
  }
  return result;
}

/**
 * Finds the strongest portal path between two micro-locations. Ordinary route
 * edges intentionally do not transmit perception; only authored portals do.
 */
export function sensoryTransmissionBetween(input: {
  sourceLocationId: string;
  targetLocationId: string;
  portals: readonly RuntimePortalEdge[];
  portalStates?: ReadonlyMap<string, RuntimePortalState> | undefined;
  maxHops?: number | undefined;
}): SensoryTransmission | undefined {
  const { sourceLocationId, targetLocationId, portals } = input;
  if (sourceLocationId === targetLocationId) return { sight: 1, sound: 1, hops: 0 };
  const maxHops = input.maxHops ?? 2;
  const states = input.portalStates ?? new Map<string, RuntimePortalState>();
  const queue: Array<{ locationId: string; sight: number; sound: number; hops: number }> = [
    { locationId: sourceLocationId, sight: 1, sound: 1, hops: 0 },
  ];
  const best = new Map<string, { sight: number; sound: number; hops: number }>();
  best.set(sourceLocationId, { sight: 1, sound: 1, hops: 0 });
  let strongest: SensoryTransmission | undefined;

  while (queue.length) {
    const current = queue.shift();
    if (!current || current.hops >= maxHops) continue;
    for (const { edge, targetLocationId: nextLocationId } of edgesFrom(
      current.locationId,
      portals,
    )) {
      const state = states.get(edge.id) ?? defaultRuntimePortalState(edge);
      const next = {
        sight: clamp(current.sight * state.transmission.sight),
        sound: clamp(current.sound * state.transmission.sound),
        hops: current.hops + 1,
      };
      if (nextLocationId === targetLocationId) {
        if (
          !strongest ||
          next.sight > strongest.sight ||
          (next.sight === strongest.sight && next.sound > strongest.sound)
        ) {
          strongest = next;
        }
      }
      const previous = best.get(nextLocationId);
      if (
        !previous ||
        next.sight > previous.sight ||
        next.sound > previous.sound ||
        next.hops < previous.hops
      ) {
        best.set(nextLocationId, next);
        queue.push({ locationId: nextLocationId, ...next });
      }
    }
  }
  return strongest;
}

export function detectMovementIntent(rawInput: string): MovementIntent {
  const text = rawInput.trim();
  if (!text) return { kind: 'none' };
  if (exitPattern.test(text)) return { kind: 'exit' };
  const adjacent = text.match(adjacentPattern);
  if (movementPattern.test(text) && adjacent) return { kind: 'adjacent', label: adjacent[0] };
  if (movementPattern.test(text)) return { kind: 'travel', label: 'a new place' };
  return { kind: 'none' };
}

function parentLocationId(
  currentLocationId: string,
  locations: readonly RuntimeLocationNode[],
): string | undefined {
  return (
    locations.find((location) => location.id === currentLocationId)?.parentLocationId ?? undefined
  );
}

function knownLocationMention(
  rawInput: string,
  locations: readonly RuntimeLocationNode[],
): RuntimeLocationNode | undefined {
  const normalized = rawInput.toLowerCase();
  return locations
    .filter((location) => location.name)
    .sort((a, b) => (b.name?.length ?? 0) - (a.name?.length ?? 0))
    .find((location) => normalized.includes(location.name!.toLowerCase()));
}

/**
 * Supplies a stable, deterministic fallback when an explicit player movement
 * has no resolver locationChange. It deliberately moves the player out of the
 * prior micro-location before NPC selection, preventing stale co-location.
 */
export function inferMovementFallback(input: {
  movement: MovementIntent;
  rawInput: string;
  currentLocationId: string;
  locations: readonly RuntimeLocationNode[];
  turnId: string;
}):
  | {
      locationId: string;
      locationName: string;
      parentLocationId?: string | undefined;
      spatialKind: 'threshold' | 'dynamic';
    }
  | undefined {
  if (input.movement.kind === 'none') return undefined;
  const named = knownLocationMention(input.rawInput, input.locations);
  if (named && named.id !== input.currentLocationId)
    return {
      locationId: named.id,
      locationName: named.name ?? named.id,
      parentLocationId: named.parentLocationId ?? undefined,
      spatialKind: 'dynamic',
    };

  const parent = parentLocationId(input.currentLocationId, input.locations);
  if (input.movement.kind === 'exit' && parent)
    return {
      locationId: parent,
      locationName: input.locations.find((location) => location.id === parent)?.name ?? parent,
      parentLocationId: parentLocationId(parent, input.locations),
      spatialKind: 'threshold',
    };

  const base =
    input.movement.kind === 'exit'
      ? `${input.currentLocationId}_exterior`
      : `${parent ?? input.currentLocationId}_adjacent_${sanitizeLocationId(input.turnId)}`;
  return {
    locationId: sanitizeLocationId(base),
    locationName: input.movement.kind === 'exit' ? 'Outside' : 'A nearby distinct place',
    parentLocationId: parent,
    spatialKind: input.movement.kind === 'exit' ? 'threshold' : 'dynamic',
  };
}

export function actionCanCarrySound(actionType: string, rawInput: string): boolean {
  return (
    actionType === 'speech' ||
    loudSoundPattern.test(rawInput) ||
    interactionSoundPattern.test(rawInput)
  );
}

export function actionIsLoud(rawInput: string): boolean {
  return loudSoundPattern.test(rawInput);
}

export function authoredLocations(locations: readonly Location[]): RuntimeLocationNode[] {
  return locations.map((location) => ({
    id: location.id,
    parentLocationId: location.parentLocationId,
    name: location.name,
  }));
}
