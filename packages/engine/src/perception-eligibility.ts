import {
  actionCanCarrySound,
  actionIsLoud,
  sensoryTransmissionBetween,
  type RuntimePortalEdge,
  type RuntimePortalState,
} from './spatial.js';

export interface RuntimeEntityView {
  entityId: string;
  name: string;
  locationId: string;
  active: boolean;
  alive: boolean;
  playable: boolean;
}

export interface ProvisionalActionSignal {
  id: string;
  actorEntityId: string;
  locationId: string;
  actionType: 'speech' | 'movement' | 'interaction' | 'attack' | 'wait' | 'observation' | 'custom';
  rawText: string;
  targets: readonly string[];
  isCommunication?: boolean;
  communicationMedium?:
    'spoken' | 'text_message' | 'phone_call' | 'email' | 'letter' | 'radio' | 'configured_remote';
  communicationRecipients?: readonly string[];
}

export interface EligiblePerception {
  observerEntityId: string;
  actorEntityId: string;
  modality: 'sight' | 'sound' | 'touch' | 'reported' | 'remote_message';
  sourceSignalId: string;
  perceivedEnvelope: string;
  detail: number;
  confidence: number;
  occluded: boolean;
  distortion?: string;
  subjectiveActorReference?: string;
  actorIdentityKnown?: boolean;
}

/**
 * Deterministically computes which observers perceive an action signal and with what modality/content.
 * Structural enforcement: LLM cannot add observers outside this set.
 */
export function computeEligiblePerceptions(input: {
  actionSignal: ProvisionalActionSignal;
  actors: readonly RuntimeEntityView[];
  playerEntityId: string;
  /** Optional portal graph; omitted callers retain exact same-location behavior. */
  portalEdges?: readonly RuntimePortalEdge[];
  portalStates?: ReadonlyMap<string, RuntimePortalState>;
  maxPortalHops?: number;
}): EligiblePerception[] {
  const { actionSignal, actors } = input;
  const eligible: EligiblePerception[] = [];
  const actionActor = actors.find((actor) => actor.entityId === actionSignal.actorEntityId);

  for (const actor of actors) {
    if (!actor.active || !actor.alive) continue;

    // Direct recipient of remote communication (e.g. text message)
    if (
      actionSignal.isCommunication &&
      actionSignal.communicationRecipients?.includes(actor.entityId)
    ) {
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: 'remote_message',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: actionSignal.rawText,
        detail: 1,
        confidence: 1,
        occluded: false,
      });
      continue;
    }

    // Sender always observes own action
    if (actor.entityId === actionSignal.actorEntityId) {
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: actionSignal.isCommunication ? 'remote_message' : 'sight',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: actionSignal.rawText,
        detail: 1,
        confidence: 1,
        occluded: false,
      });
      continue;
    }

    const coLocated = actor.locationId === actionSignal.locationId;
    const portalTransmission =
      !coLocated && input.portalEdges?.length
        ? sensoryTransmissionBetween({
            sourceLocationId: actionSignal.locationId,
            targetLocationId: actor.locationId,
            portals: input.portalEdges,
            portalStates: input.portalStates,
            maxHops: input.maxPortalHops,
          })
        : undefined;

    // Exact co-location gives full perception. Different micro-locations need a
    // portal path; a closed door with zero sight transmission is never visual
    // co-presence just because both rooms share a building or parent location.
    const sightTransmission = coLocated ? 1 : (portalTransmission?.sight ?? 0);
    const soundTransmission = coLocated ? 1 : (portalTransmission?.sound ?? 0);
    if (sightTransmission <= 0 && soundTransmission <= 0) continue;

    // If it's a private phone/remote text message, bystanders can only notice
    // device use when they have visual access. A portal never leaks its body.
    if (actionSignal.isCommunication && actionSignal.communicationMedium === 'text_message') {
      if (sightTransmission <= 0) continue;
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: 'sight',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: `${actionActor?.name || actionSignal.actorEntityId} typed something on their phone.`,
        detail: sightTransmission * 0.5,
        confidence: sightTransmission * 0.9,
        occluded: !coLocated,
      });
      continue;
    }

    // Exact co-location permits touch, while portals never do. A target behind
    // a closed door may hear a knock but cannot be touched or visually targeted.
    if (coLocated && actionSignal.targets.includes(actor.entityId)) {
      const physicalTouch =
        ['interaction', 'attack'].includes(actionSignal.actionType) &&
        /touch|grab|hold|turn|push|pull/i.test(actionSignal.rawText);
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: physicalTouch
          ? 'touch'
          : actionSignal.actionType === 'speech'
            ? 'sound'
            : 'sight',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: actionSignal.rawText,
        detail: 1,
        confidence: 1,
        occluded: false,
      });
      continue;
    }

    if (coLocated) {
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: actionSignal.actionType === 'speech' ? 'sound' : 'sight',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: actionSignal.rawText,
        detail: 1,
        confidence: 1,
        occluded: false,
      });
      continue;
    }

    // Visible non-speech action takes precedence over sound when a portal is
    // open enough to see through. Speech remains primarily an auditory event.
    if (actionSignal.actionType !== 'speech' && sightTransmission >= 0.1) {
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: 'sight',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope: actionSignal.rawText,
        detail: sightTransmission,
        confidence: sightTransmission,
        occluded: true,
      });
      continue;
    }

    const soundThreshold = actionIsLoud(actionSignal.rawText) ? 0.08 : 0.35;
    if (
      actionCanCarrySound(actionSignal.actionType, actionSignal.rawText) &&
      soundTransmission >= soundThreshold
    ) {
      eligible.push({
        observerEntityId: actor.entityId,
        actorEntityId: actionSignal.actorEntityId,
        modality: 'sound',
        sourceSignalId: actionSignal.id,
        perceivedEnvelope:
          soundTransmission < 0.8
            ? 'A muffled nearby voice or movement is audible through a barrier.'
            : actionSignal.rawText,
        detail: soundTransmission,
        confidence: soundTransmission,
        occluded: true,
      });
    }
  }

  // Sort deterministically by observer ID then modality
  return eligible.sort(
    (a, b) =>
      a.observerEntityId.localeCompare(b.observerEntityId) || a.modality.localeCompare(b.modality),
  );
}
