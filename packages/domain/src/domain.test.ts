import { describe, expect, it } from 'vitest';
import {
  entitySchema,
  locationSchema,
  scenarioSchema,
  validateScenarioAggregate,
  type Entity,
  type Location,
  type Scenario,
} from './scenario.js';
import {
  KnowledgePolicy,
  assertPlayerAgency,
  fitContextBudget,
  perceive,
  validateCanonicalPatch,
  validateThought,
} from './policies.js';
import { innerThoughtSchema } from './runtime.js';

const metadata = () => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  schemaVersion: 1,
  attribution: { source: 'player' as const, sourceIds: [] },
});

const scenario = (): Scenario =>
  scenarioSchema.parse({
    id: 'scenario_1',
    revisionId: 'revision_1',
    slug: 'demo',
    title: 'Demo',
    description: '',
    premise: '',
    genre: 'fantasy',
    tone: '',
    themes: [],
    contentBoundaries: [],
    worldRules: [],
    defaultNarrationStyle: '',
    chronologyMarker: 'day 1',
    startLocationId: 'location_1',
    config: {
      narration: { person: 'third_limited', tense: 'past', omniscient: false },
      pacing: {},
      retrieval: { maxCandidates: 20, maxSelected: 5 },
      modelOverrides: {},
    },
    status: 'draft',
    currentRevision: 1,
    metadata: metadata(),
  });

const location = (id: string, parentLocationId: string | null = null): Location =>
  locationSchema.parse({
    id,
    revisionId: 'revision_1',
    name: id,
    aliases: [],
    type: 'room',
    tags: [],
    publicDescription: '',
    privateDetails: '',
    parentLocationId,
    environment: {},
    capacity: 10,
    accessRules: [],
    sensoryProperties: { sight: true, sound: true, hearingRange: 10 },
    hazards: [],
    aiMutationPolicy: 'manual_only',
    metadata: metadata(),
  });

const entity = (id: string, playable: boolean): Entity =>
  entitySchema.parse({
    id,
    revisionId: 'revision_1',
    name: id,
    aliases: [],
    pronouns: 'they/them',
    kind: 'character',
    tags: [],
    publicDescription: '',
    privateDescription: '',
    appearance: '',
    personality: [],
    speechStyle: '',
    values: [],
    drives: [],
    goals: [],
    fears: [],
    desires: [],
    capabilities: [],
    limitations: [],
    secrets: [],
    stats: {},
    structuredAttributes: {},
    constraints: [],
    aiMutationPolicy: 'manual_only',
    playable,
    cognitive: true,
    alive: true,
    active: true,
    startingLocationId: 'location_1',
    metadata: metadata(),
  });

describe('scenario and runtime schemas', () => {
  it('validates a complete minimal scenario and rejects missing playable/start references', () => {
    const valid = validateScenarioAggregate({
      scenario: scenario(),
      entities: [entity('player_1', true)],
      relationships: [],
      locations: [location('location_1')],
      locationEdges: [],
      storyCards: [],
      storyCardLinks: [],
      plotArcs: [],
      plotPoints: [],
    });
    expect(valid).toEqual({ valid: true, errors: [], warnings: [] });
    const invalid = validateScenarioAggregate({
      ...{
        scenario: scenario(),
        entities: [entity('npc_1', false)],
        relationships: [],
        locations: [location('location_1')],
        locationEdges: [],
        storyCards: [],
        storyCardLinks: [],
        plotArcs: [],
        plotPoints: [],
      },
      scenario: { ...scenario(), startLocationId: 'missing' },
    });
    expect(invalid.valid).toBe(false);
    expect(invalid.errors.map((error) => error.path)).toContain('entities');
    expect(invalid.errors.map((error) => error.path)).toContain('startLocationId');
  });

  it('rejects cycles in location hierarchy and player inner thoughts', () => {
    const result = validateScenarioAggregate({
      scenario: scenario(),
      entities: [entity('player_1', true)],
      relationships: [],
      locations: [location('location_1', 'location_2'), location('location_2', 'location_1')],
      locationEdges: [],
      storyCards: [],
      storyCardLinks: [],
      plotArcs: [],
      plotPoints: [],
    });
    expect(result.errors.some((error) => error.message.includes('cycle'))).toBe(true);
    const thought = innerThoughtSchema.parse({
      id: 'thought_1',
      ownerEntityId: 'player_1',
      turnId: 'turn_1',
      text: 'player thought',
      persistence: 'ephemeral',
      salience: 1,
      urgency: 1,
      emotionalValence: 0,
      emotionalIntensity: 0,
      decayRate: 0,
      reinforcementCount: 0,
      status: 'active',
      playerInspectable: true,
      visibility: 'entity_private',
      metadata: metadata(),
    });
    expect(() => validateThought(entity('player_1', true), thought, 'player_1')).toThrow();
  });
});

describe('pure policies', () => {
  it('fails closed and prevents player control violations', () => {
    const policy = new KnowledgePolicy();
    expect(
      policy.canRead(
        { kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_a' },
        { kind: 'entity_private', runId: 'run_1', branchId: 'branch_1', ownerEntityId: 'npc_b' },
      ),
    ).toBe(false);
    expect(
      policy.canRead(
        { kind: 'NPC', runId: 'run_1', branchId: 'branch_1', entityId: 'npc_a' },
        { kind: 'public_scenario', runId: 'run_2' },
      ),
    ).toBe(false);
    expect(
      policy.canRead(
        { kind: 'NARRATOR', runId: 'run_1', branchId: 'branch_1', playerEntityId: 'player_1' },
        { kind: 'scene_observable', runId: 'run_1', branchId: 'branch_1', ownerEntityId: 'npc_a' },
      ),
    ).toBe(false);
    expect(
      policy.canRead(
        { kind: 'NARRATOR', runId: 'run_1', branchId: 'branch_1', playerEntityId: 'player_1' },
        {
          kind: 'scene_observable',
          runId: 'run_1',
          branchId: 'branch_1',
          ownerEntityId: 'player_1',
        },
      ),
    ).toBe(true);
    expect(() =>
      assertPlayerAgency({ playable: true, cognitive: true } as Entity, {
        source: 'npc',
        createsThought: true,
      }),
    ).toThrow();
  });

  it('validates patches, deterministic perception, and budgets', () => {
    expect(() =>
      validateCanonicalPatch(
        { op: 'replace', path: '/entities/player_1/structuredAttributes/score', value: 3 },
        { minStat: -10, maxStat: 10 },
      ),
    ).not.toThrow();
    expect(() =>
      validateCanonicalPatch(
        { op: 'replace', path: '/entities/player_1/__proto__/polluted', value: true },
        { minStat: -10, maxStat: 10 },
      ),
    ).toThrow();
    const result = perceive({
      event: {
        locationId: 'room',
        visibility: 'scene_observable',
        modalities: ['sight', 'sound'],
        concealed: false,
      },
      observer: { active: true } as Entity,
      observerLocationId: 'hall',
      connectedHearing: true,
      hasLineOfSight: false,
      canHear: true,
      canSee: true,
      remote: false,
    });
    expect(result.modalities).toEqual(['sound']);
    expect(
      fitContextBudget(
        [
          { id: 'required', tokens: 10, rank: 0, mandatory: true },
          { id: 'optional', tokens: 10, rank: 1, mandatory: false },
        ],
        30,
        0,
        0,
      ).selected.map((candidate) => candidate.id),
    ).toEqual(['required', 'optional']);
  });
});
