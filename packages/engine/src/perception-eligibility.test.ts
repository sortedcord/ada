import { describe, expect, it } from 'vitest';
import { computeEligiblePerceptions, type ProvisionalActionSignal, type RuntimeEntityView } from './perception-eligibility.js';

describe('computeEligiblePerceptions', () => {
  const actors: RuntimeEntityView[] = [
    { entityId: 'alex', name: 'Alex', locationId: 'campus_cafe', active: true, alive: true, playable: true },
    { entityId: 'lena', name: 'Lena', locationId: 'campus_cafe', active: true, alive: true, playable: false },
    { entityId: 'danielle', name: 'Danielle', locationId: 'campus_quad', active: true, alive: true, playable: false },
    { entityId: 'sleeping_patron', name: 'Sleeping Patron', locationId: 'campus_cafe', active: false, alive: true, playable: false },
  ];

  it('determines same-location perception for visible or spoken actions', () => {
    const signal: ProvisionalActionSignal = {
      id: 'sig_1',
      actorEntityId: 'alex',
      locationId: 'campus_cafe',
      actionType: 'speech',
      rawText: 'Hello Lena!',
      targets: ['lena'],
    };

    const eligible = computeEligiblePerceptions({ actionSignal: signal, actors, playerEntityId: 'alex' });
    const observerIds = eligible.map((e) => e.observerEntityId);

    expect(observerIds).toContain('alex');
    expect(observerIds).toContain('lena');
    expect(observerIds).not.toContain('danielle'); // At campus_quad
    expect(observerIds).not.toContain('sleeping_patron'); // Inactive
  });

  it('strictly enforces epistemic privacy on private text messages', () => {
    const textSignal: ProvisionalActionSignal = {
      id: 'sig_text_1',
      actorEntityId: 'alex',
      locationId: 'campus_cafe',
      actionType: 'custom',
      rawText: 'Secret message to Danielle: Do not tell anyone!',
      targets: [],
      isCommunication: true,
      communicationMedium: 'text_message',
      communicationRecipients: ['danielle'],
    };

    const eligible = computeEligiblePerceptions({ actionSignal: textSignal, actors, playerEntityId: 'alex' });
    
    // Recipient Danielle gets full message body
    const daniellePerception = eligible.find((e) => e.observerEntityId === 'danielle');
    expect(daniellePerception).toBeDefined();
    expect(daniellePerception?.perceivedEnvelope).toBe('Secret message to Danielle: Do not tell anyone!');
    expect(daniellePerception?.modality).toBe('remote_message');

    // Bystander Lena in the same room only gets phone observation envelope, NEVER the secret text!
    const lenaPerception = eligible.find((e) => e.observerEntityId === 'lena');
    expect(lenaPerception).toBeDefined();
    expect(lenaPerception?.perceivedEnvelope).not.toContain('Secret message');
    expect(lenaPerception?.perceivedEnvelope).toContain('typed something on their phone');
    expect(lenaPerception?.modality).toBe('sight');
  });
});
