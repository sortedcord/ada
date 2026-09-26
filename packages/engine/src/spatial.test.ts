import { describe, expect, it } from 'vitest';
import { locationEdgeSchema } from '@ada/domain';
import { computeEligiblePerceptions, type RuntimeEntityView } from './perception-eligibility.js';
import {
  defaultRuntimePortalState,
  detectMovementIntent,
  inferMovementFallback,
  runtimePortalEdges,
  runtimePortalStateFor,
  sensoryTransmissionBetween,
} from './spatial.js';

const metadata = {
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  schemaVersion: 1,
  attribution: { source: 'system' as const, sourceIds: [] },
};

const doorEdge = locationEdgeSchema.parse({
  id: 'portal_mara_front_door',
  revisionId: 'revision_1',
  sourceLocationId: 'loc_lane',
  destinationLocationId: 'loc_mara_interior',
  directed: false,
  directionLabel: 'through Mara’s front door',
  travelText: 'A narrow front door joins the rain lane to Mara’s hall.',
  travelTime: 1,
  travelCost: 0,
  accessRequirements: [],
  discoverability: 1,
  blocked: false,
  connectionKind: 'portal',
  portal: {
    name: 'Mara’s front door',
    defaultState: 'closed',
    transmission: {
      open: { sight: 1, sound: 1 },
      ajar: { sight: 0.3, sound: 0.65 },
      closed: { sight: 0, sound: 0.15 },
      locked: { sight: 0, sound: 0.08 },
      barred: { sight: 0, sound: 0.2 },
    },
  },
  metadata,
});

const actors: RuntimeEntityView[] = [
  {
    entityId: 'player',
    name: 'Player',
    locationId: 'loc_lane',
    active: true,
    alive: true,
    playable: true,
  },
  {
    entityId: 'mara',
    name: 'Mara',
    locationId: 'loc_mara_interior',
    active: true,
    alive: true,
    playable: false,
  },
];

describe('portal-aware spatial perception', () => {
  it('does not select an NPC behind a closed door for ordinary street actions', () => {
    const portals = runtimePortalEdges([doorEdge]);
    const perceptions = computeEligiblePerceptions({
      actionSignal: {
        id: 'sig_try_other_house',
        actorEntityId: 'player',
        locationId: 'loc_lane',
        actionType: 'movement',
        rawText: 'I walk to another neighboring house and try the door.',
        targets: [],
      },
      actors,
      playerEntityId: 'player',
      portalEdges: portals,
      portalStates: new Map([[doorEdge.id, defaultRuntimePortalState(portals[0]!)]]),
    });

    expect(perceptions.map((perception) => perception.observerEntityId)).toEqual(['player']);
  });

  it('allows a muffled knock through a closed door but not visual co-presence', () => {
    const portals = runtimePortalEdges([doorEdge]);
    const perceptions = computeEligiblePerceptions({
      actionSignal: {
        id: 'sig_knock',
        actorEntityId: 'player',
        locationId: 'loc_lane',
        actionType: 'interaction',
        rawText: 'I knock on Mara’s front door.',
        targets: [],
      },
      actors,
      playerEntityId: 'player',
      portalEdges: portals,
      portalStates: new Map([[doorEdge.id, defaultRuntimePortalState(portals[0]!)]]),
    });

    const mara = perceptions.find((perception) => perception.observerEntityId === 'mara');
    expect(mara).toMatchObject({ modality: 'sound', occluded: true });
    expect(mara?.perceivedEnvelope).toContain('muffled');
  });

  it('restores full cross-threshold perception only when the portal is opened', () => {
    const portals = runtimePortalEdges([doorEdge]);
    const states = new Map([[doorEdge.id, runtimePortalStateFor(portals[0]!, 'open')]]);
    const transmission = sensoryTransmissionBetween({
      sourceLocationId: 'loc_lane',
      targetLocationId: 'loc_mara_interior',
      portals,
      portalStates: states,
    });
    expect(transmission).toEqual({ sight: 1, sound: 1, hops: 1 });

    const perceptions = computeEligiblePerceptions({
      actionSignal: {
        id: 'sig_open_door',
        actorEntityId: 'player',
        locationId: 'loc_lane',
        actionType: 'interaction',
        rawText: 'I open the front door.',
        targets: [],
      },
      actors,
      playerEntityId: 'player',
      portalEdges: portals,
      portalStates: states,
    });
    expect(perceptions.find((perception) => perception.observerEntityId === 'mara')).toMatchObject({
      modality: 'sight',
      occluded: true,
      detail: 1,
    });
  });
});

describe('deterministic movement fallback', () => {
  const locations = [
    { id: 'loc_lane', parentLocationId: null, name: 'The lane' },
    { id: 'loc_mara_interior', parentLocationId: 'loc_lane', name: 'Mara’s house' },
    { id: 'loc_bellworks', parentLocationId: 'loc_lane', name: 'Bellworks' },
  ];

  it('moves a departing player to the parent lane if the resolver omitted locationChange', () => {
    expect(detectMovementIntent('I walk out through the front door.')).toEqual({ kind: 'exit' });
    expect(
      inferMovementFallback({
        movement: detectMovementIntent('I walk out through the front door.'),
        rawInput: 'I walk out through the front door.',
        currentLocationId: 'loc_mara_interior',
        locations,
        turnId: 'turn_1',
      }),
    ).toMatchObject({ locationId: 'loc_lane', spatialKind: 'threshold' });
  });

  it('uses a named authored destination or creates a distinct adjacent fallback', () => {
    expect(
      inferMovementFallback({
        movement: detectMovementIntent('I walk to Bellworks.'),
        rawInput: 'I walk to Bellworks.',
        currentLocationId: 'loc_lane',
        locations,
        turnId: 'turn_2',
      }),
    ).toMatchObject({ locationId: 'loc_bellworks' });

    const fallback = inferMovementFallback({
      movement: detectMovementIntent('I walk to another neighboring house.'),
      rawInput: 'I walk to another neighboring house.',
      currentLocationId: 'loc_mara_interior',
      locations,
      turnId: 'turn_3',
    });
    expect(fallback?.locationId).not.toBe('loc_mara_interior');
    expect(fallback?.locationId).not.toBe('loc_lane');
  });
});
