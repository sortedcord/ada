
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
  communicationMedium?: 'spoken' | 'text_message' | 'phone_call' | 'email' | 'letter' | 'radio' | 'configured_remote';
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
}): EligiblePerception[] {
  const { actionSignal, actors } = input;
  const eligible: EligiblePerception[] = [];
  const actionActor = actors.find((actor) => actor.entityId === actionSignal.actorEntityId);

  for (const actor of actors) {
    if (!actor.active || !actor.alive) continue;

    // Direct recipient of remote communication (e.g. text message)
    if (actionSignal.isCommunication && actionSignal.communicationRecipients?.includes(actor.entityId)) {
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

    // Observers in the same location
    if (actor.locationId === actionSignal.locationId) {
      // If it's a private phone/remote text message, bystanders only see phone use, never the message!
      if (actionSignal.isCommunication && actionSignal.communicationMedium === 'text_message') {
        eligible.push({
          observerEntityId: actor.entityId,
          actorEntityId: actionSignal.actorEntityId,
          modality: 'sight',
          sourceSignalId: actionSignal.id,
          perceivedEnvelope: `${actionActor?.name || actionSignal.actorEntityId} typed something on their phone.`,
          detail: 0.5,
          confidence: 0.9,
          occluded: false,
        });
        continue;
      }

      // If actor was physically targeted (e.g. touch or turn around)
      if (actionSignal.targets.includes(actor.entityId)) {
        const physicalTouch =
          ['interaction', 'attack'].includes(actionSignal.actionType) &&
          /touch|grab|hold|turn|push|pull/i.test(actionSignal.rawText);
        eligible.push({
          observerEntityId: actor.entityId,
          actorEntityId: actionSignal.actorEntityId,
          modality: physicalTouch ? 'touch' : actionSignal.actionType === 'speech' ? 'sound' : 'sight',
          sourceSignalId: actionSignal.id,
          perceivedEnvelope: actionSignal.rawText,
          detail: 1,
          confidence: 1,
          occluded: false,
        });
        continue;
      }

      // Audible spoken or observable physical action
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
    }
  }

  // Sort deterministically by observer ID then modality
  return eligible.sort((a, b) =>
    a.observerEntityId.localeCompare(b.observerEntityId) || a.modality.localeCompare(b.modality),
  );
}
