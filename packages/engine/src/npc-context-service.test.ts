/* eslint-disable */
import { describe, expect, it } from 'vitest';
import { KnowledgePolicy } from '@ada/domain';
import { NpcContextService } from './npc-context-service.js';

describe('NpcContextService Privacy & Canary Isolation', () => {
  const danielleCanary = 'DANIELLE_SECRET_GUILT_CANARY_9841';
  const madisonCanary = 'MADISON_SECRET_TACTIC_CANARY_1423';

  // Mock repository with isolated storage
  const mockRepo = {
    getEntityRuntimeState: async (_r: string, _b: string, entityId: string) => ({
      entityId,
      state: { locationId: 'campus_quad', active: true },
    }),
    getObservations: async (q: any) =>
      q.ownerEntityId === 'danielle'
        ? [{ id: 'obs_d1', observedTurn: 1, modality: 'sound', perceivedContent: `Danielle heard something: ${danielleCanary}` }]
        : [{ id: 'obs_m1', observedTurn: 1, modality: 'sound', perceivedContent: `Madison heard something: ${madisonCanary}` }],
    getBeliefs: async (q: any) =>
      q.ownerEntityId === 'danielle'
        ? [{ id: 'bel_d1', rendering: 'Alex was my best friend', confidence: 0.9, salience: 0.8 }]
        : [{ id: 'bel_m1', rendering: 'Danielle is trying too hard', confidence: 0.7, salience: 0.6 }],
    getMemories: async (q: any) =>
      q.ownerEntityId === 'danielle'
        ? [{ id: 'mem_d1', content: `Danny memory: ${danielleCanary}`, importance: 0.8, memoryType: 'episodic' }]
        : [{ id: 'mem_m1', content: `Madison memory: ${madisonCanary}`, importance: 0.7, memoryType: 'episodic' }],
    getThoughts: async (q: any) =>
      q.ownerEntityId === 'danielle'
        ? [{ id: 'th_d1', text: 'I hope they do not ask about high school', persistence: 'ephemeral', salience: 0.8 }]
        : [{ id: 'th_m1', text: 'Danielle seems nervous', persistence: 'ephemeral', salience: 0.5 }],
    getRelationshipViews: async () => [],
  };

  const service = new NpcContextService(mockRepo as any, new KnowledgePolicy());

  it('builds completely isolated contexts for each principal without cross-leakage', async () => {
    const danielleContext = await service.build({
      runId: 'run_1',
      branchId: 'branch_1',
      turnId: 'turn_1',
      turnNumber: 1,
      entityId: 'danielle',
      worldTime: '2026-09-18T10:00:00.000Z',
      selfMeta: {
        id: 'danielle',
        name: 'Danielle',
        privateDescription: danielleCanary,
      },
      newPerceptions: [
        { observerEntityId: 'danielle', actorEntityId: 'alex', sourceSignalId: 'sig_1', modality: 'sound', perceivedEnvelope: 'Hey Danielle!', detail: 1, confidence: 1 },
        { observerEntityId: 'madison', actorEntityId: 'alex', sourceSignalId: 'sig_1', modality: 'sound', perceivedEnvelope: 'Hey Danielle!', detail: 0.8, confidence: 0.8 },
      ],
    });

    const madisonContext = await service.build({
      runId: 'run_1',
      branchId: 'branch_1',
      turnId: 'turn_1',
      turnNumber: 1,
      entityId: 'madison',
      worldTime: '2026-09-18T10:00:00.000Z',
      selfMeta: {
        id: 'madison',
        name: 'Madison',
        privateDescription: madisonCanary,
      },
      newPerceptions: [
        { observerEntityId: 'danielle', actorEntityId: 'alex', sourceSignalId: 'sig_1', modality: 'sound', perceivedEnvelope: 'Hey Danielle!', detail: 1, confidence: 1 },
        { observerEntityId: 'madison', actorEntityId: 'alex', sourceSignalId: 'sig_1', modality: 'sound', perceivedEnvelope: 'Hey Danielle!', detail: 0.8, confidence: 0.8 },
      ],
    });

    const danielleString = JSON.stringify(danielleContext);
    const madisonString = JSON.stringify(madisonContext);

    // Danielle contains her canaries and NEVER Madison's canaries
    expect(danielleString).toContain(danielleCanary);
    expect(danielleString).not.toContain(madisonCanary);

    // Madison contains her canaries and NEVER Danielle's canaries
    expect(madisonString).toContain(madisonCanary);
    expect(madisonString).not.toContain(danielleCanary);

    // Contexts have unique immutable input hashes
    expect(danielleContext.inputHash).toBeDefined();
    expect(madisonContext.inputHash).toBeDefined();
    expect(danielleContext.inputHash).not.toBe(madisonContext.inputHash);
  });
});
