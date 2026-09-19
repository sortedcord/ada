import {
  entitySchema,
  locationSchema,
  scenarioSchema,
  type ScenarioAggregate,
} from '@ada/domain';

const metadata = () => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  version: 1,
  schemaVersion: 1,
  attribution: { source: 'system' as const, sourceIds: [] },
});

export function makeScenarioAggregate(
  overrides: Partial<Pick<ScenarioAggregate, 'scenario'>> = {},
): ScenarioAggregate {
  const scenario = scenarioSchema.parse({
    id: 'scenario_1',
    revisionId: 'revision_1',
    slug: 'fixture',
    title: 'Fixture Scenario',
    description: 'Synthetic test scenario',
    premise: 'A safe fixture',
    genre: 'adventure',
    tone: 'grounded',
    themes: ['test'],
    contentBoundaries: [],
    worldRules: ['No provider reasoning becomes game state'],
    defaultNarrationStyle: 'Concise',
    chronologyMarker: 'day 1',
    startLocationId: 'location_1',
    config: {
      narration: { person: 'third_limited', tense: 'past', omniscient: false },
      pacing: {},
      retrieval: { maxCandidates: 20, maxSelected: 5 },
      modelOverrides: {},
    },
    status: 'valid',
    currentRevision: 1,
    metadata: metadata(),
    ...overrides.scenario,
  });
  const location = locationSchema.parse({
    id: 'location_1',
    revisionId: 'revision_1',
    name: 'Starting Room',
    aliases: [],
    type: 'room',
    tags: [],
    publicDescription: 'A public fixture room',
    privateDetails: 'PRIVATE_LOCATION_CANARY',
    parentLocationId: null,
    environment: {},
    capacity: 10,
    accessRules: [],
    sensoryProperties: { sight: true, sound: true, hearingRange: 10 },
    hazards: [],
    aiMutationPolicy: 'manual_only',
    metadata: metadata(),
  });
  const player = entitySchema.parse({
    id: 'player_1',
    revisionId: 'revision_1',
    name: 'Player',
    aliases: [],
    pronouns: 'they/them',
    kind: 'character',
    tags: [],
    publicDescription: 'The selected player',
    privateDescription: 'Player private data',
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
    playable: true,
    cognitive: true,
    alive: true,
    active: true,
    startingLocationId: 'location_1',
    metadata: metadata(),
  });
  return {
    scenario,
    entities: [player],
    relationships: [],
    locations: [location],
    locationEdges: [],
    storyCards: [],
    storyCardLinks: [],
    plotArcs: [],
    plotPoints: [],
  };
}

export const TEST_CANARIES = {
  npcSecret: 'NPC_A_SECRET_CANARY_ONLY',
  publicFact: 'PUBLIC_FACT_CANARY',
} as const;
export function fakeId(prefix: string, value = '1'): string {
  return `${prefix}_${value}`;
}
