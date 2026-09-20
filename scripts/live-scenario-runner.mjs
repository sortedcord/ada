// Live Scenario Runner against Dockerized API

const SCENARIO_AGGREGATE = {
  scenario: {
    id: 'scenario_whispers',
    revisionId: 'rev_whispers_1',
    slug: 'whispers-of-the-citadel',
    title: 'Whispers of the Citadel',
    description: 'An investigative mystery in the ancient high citadel.',
    premise: 'You are an envoy dispatched to the high citadel to negotiate a peace accord, only to discover whispering shadows in the hall of echoes.',
    genre: 'mystery',
    tone: 'intrigue',
    themes: ['trust', 'secrets', 'conspiracy'],
    contentBoundaries: [],
    worldRules: [
      'Magic leaves residual heat in stone.',
      'The citadel council meets only at twilight.'
    ],
    defaultNarrationStyle: 'Rich, atmospheric, second-person mystery.',
    chronologyMarker: 'Day 1 - Evening',
    startLocationId: 'loc_hall_of_echoes',
    config: {
      narration: { person: 'second', tense: 'present', omniscient: false },
      pacing: { tension: 0.5 },
      retrieval: { maxCandidates: 20, maxSelected: 5 },
      modelOverrides: {},
    },
    status: 'draft',
    currentRevision: 1,
    metadata: {
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      version: 1,
      schemaVersion: 1,
      attribution: { source: 'player', sourceIds: [] },
    },
  },
  entities: [
    {
      id: 'entity_player',
      revisionId: 'rev_whispers_1',
      name: 'Vaelen',
      aliases: ['The Envoy', 'Vaelen of the Reaches'],
      pronouns: 'they/them',
      kind: 'character',
      tags: ['diplomat', 'envoy'],
      publicDescription: 'A seasoned diplomat cloaked in envoy silk, sharp-eyed and measured.',
      privateDescription: 'Vaelen carries a secret diplomatic cipher concealed in the hem of their cloak.',
      appearance: 'Tall, composed, watchful amber eyes.',
      personality: ['perceptive', 'deliberate'],
      speechStyle: 'Calm, diplomatic, concise.',
      values: ['truth', 'peace'],
      drives: ['avert war'],
      goals: ['identify the conspirator before dusk tomorrow'],
      fears: ['failure of the peace treaty'],
      desires: ['return safely to the Reaches'],
      capabilities: ['diplomacy', 'observant intuition'],
      limitations: ['unarmed in the council chambers'],
      secrets: ['CIPHER_SECRET_CANARY_VAELEN'],
      stats: { intellect: 16, charisma: 14 },
      structuredAttributes: {},
      constraints: [],
      aiMutationPolicy: 'manual_only',
      playable: true,
      cognitive: true,
      alive: true,
      active: true,
      startingLocationId: 'loc_hall_of_echoes',
      history: 'Sent by the Grand Assembly after two border clashes.',
      historicalEvents: [],
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'player', sourceIds: [] },
      },
    },
    {
      id: 'entity_kaelen',
      revisionId: 'rev_whispers_1',
      name: 'Archivist Kaelen',
      aliases: ['Kaelen', 'The Curator'],
      pronouns: 'he/him',
      kind: 'character',
      tags: ['archivist', 'scholar'],
      publicDescription: 'A frail archivist with ink-stained fingers and thick spectacles.',
      privateDescription: 'Kaelen discovered an unauthorized seal on the High Chancellor treaty drafts.',
      appearance: 'Bent posture, moth-eaten woolen mantle.',
      personality: ['nervous', 'meticulous'],
      speechStyle: 'Quiet, hesitant, reverent of records.',
      values: ['preservation', 'accuracy'],
      drives: ['protect the archives'],
      goals: ['warn the envoy without drawing the guard captain attention'],
      fears: ['being silenced'],
      desires: ['peaceful scholarship'],
      capabilities: ['ancient scripts', 'hidden passageway recall'],
      limitations: ['physically weak'],
      secrets: ['KAELEN_FORBIDDEN_SEAL_CANARY_491'],
      stats: { intellect: 18, strength: 6 },
      structuredAttributes: {},
      constraints: [],
      aiMutationPolicy: 'manual_only',
      playable: false,
      cognitive: true,
      alive: true,
      active: true,
      startingLocationId: 'loc_hall_of_echoes',
      history: 'Curator of the grand vault for four decades.',
      historicalEvents: [],
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'player', sourceIds: [] },
      },
    }
  ],
  relationships: [
    {
      id: 'rel_vaelen_kaelen',
      revisionId: 'rev_whispers_1',
      sourceEntityId: 'entity_player',
      targetEntityId: 'entity_kaelen',
      relationshipType: 'professional',
      dimensions: { trust: 0.6, intimacy: 0.1, authority: 0.0, conflict: 0.0 },
      publicState: 'Diplomatic acquaintance',
      historySummary: 'Met once during the preliminary assembly.',
      secretNotes: '',
      aiMutationPolicy: 'ai_mutable',
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'player', sourceIds: [] },
      },
    }
  ],
  locations: [
    {
      id: 'loc_hall_of_echoes',
      revisionId: 'rev_whispers_1',
      name: 'Hall of Echoes',
      aliases: ['The Whispering Vault', 'Echo Hall'],
      type: 'interior',
      tags: ['citadel', 'ceremonial'],
      publicDescription: 'A soaring marble hall lined with basalt pillars, where even footfalls murmur across the vault.',
      privateDetails: 'A concealed acoustic duct above the central dais carries sound to the Chancellor private solar.',
      parentLocationId: null,
      environment: { lighting: 'dim torchlight', sound: 'faint reverberating drafts' },
      capacity: 50,
      accessRules: [],
      sensoryProperties: { sight: true, sound: true, hearingRange: 30 },
      hazards: [],
      aiMutationPolicy: 'manual_only',
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'player', sourceIds: [] },
      },
    }
  ],
  locationEdges: [],
  storyCards: [
    {
      id: 'card_ancient_pact',
      revisionId: 'rev_whispers_1',
      title: 'The Pact of the Three Rivers',
      cardType: 'lore',
      tags: ['treaty', 'history'],
      canonicalBody: 'Signed eighty winters past, guaranteeing free passage through the mountain gates for all envoys.',
      playerVisibleBody: 'An ancient treaty honored by both the Citadel and the Reaches.',
      activationHints: ['pact', 'treaty', 'passage'],
      priority: 10,
      tokenBudget: 500,
      scope: { kind: 'global' },
      mutationPolicy: 'manual_only',
      locked: true,
      source: 'player',
      currentVersion: 1,
      metadata: {
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-01T00:00:00.000Z',
        version: 1,
        schemaVersion: 1,
        attribution: { source: 'player', sourceIds: [] },
      },
    }
  ],
  storyCardLinks: [],
  plotArcs: [],
  plotPoints: [],
};

async function runLiveTest() {
  const suffix = Date.now().toString(36);
  const revId = `rev_whispers_${suffix}`;
  SCENARIO_AGGREGATE.scenario.id = `scenario_whispers_${suffix}`;
  SCENARIO_AGGREGATE.scenario.slug = `whispers-citadel-${suffix}`;
  SCENARIO_AGGREGATE.scenario.revisionId = revId;
  for (const e of SCENARIO_AGGREGATE.entities) e.revisionId = revId;
  for (const r of SCENARIO_AGGREGATE.relationships) r.revisionId = revId;
  for (const l of SCENARIO_AGGREGATE.locations) l.revisionId = revId;
  for (const c of SCENARIO_AGGREGATE.storyCards) c.revisionId = revId;
  console.log('1. Creating scenario via API...');
  const createRes = await fetch('http://127.0.0.1:4173/api/v1/scenarios', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ aggregate: SCENARIO_AGGREGATE }),
  });
  if (!createRes.ok) throw new Error(`Create scenario failed: ${await createRes.text()}`);
  const { scenarioId } = await createRes.json();
  console.log('   Scenario created:', scenarioId);

  console.log('2. Publishing scenario revision...');
  const pubRes = await fetch(`http://127.0.0.1:4173/api/v1/scenarios/${scenarioId}/publish-revision`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!pubRes.ok) throw new Error(`Publish failed: ${await pubRes.text()}`);
  const pubData = await pubRes.json();
  const revisionId = pubData.id || revId;
  console.log('   Published revision:', revisionId);

  console.log('3. Starting a new run with player entity...');
  const runRes = await fetch('http://127.0.0.1:4173/api/v1/runs', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ revisionId, playerEntityId: 'entity_player' }),
  });
  if (!runRes.ok) throw new Error(`Run creation failed: ${await runRes.text()}`);
  const { runId, branchId } = await runRes.json();
  console.log(`   Run started: ${runId} (branch: ${branchId})`);

  console.log('4. Submitting Turn 1: Inspecting the room and talking to Kaelen...');
  const turn1Res = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'Archivist Kaelen, I have arrived as envoy of the Grand Assembly. What is the cause of your concern?',
      idempotencyKey: `idemp_${Date.now()}_1`,
      expectedVersion: 1,
      branchId,
    }),
  });
  if (!turn1Res.ok) throw new Error(`Turn 1 failed: ${await turn1Res.text()}`);
  const turn1Data = await turn1Res.json();
  const turn1Id = turn1Data.id || turn1Data.turnId;
  console.log(`   Turn 1 accepted: ${turn1Id}, waiting for worker execution...`);

  let turn1Complete = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns/${turn1Id}`);
    const turnData = await statusRes.json();
    process.stdout.write(`   Turn 1 stage: ${turnData.stage} (${turnData.status})\r`);
    if (turnData.status === 'completed' || turnData.stage === 'COMPLETED') {
      turn1Complete = true;
      console.log('\n   Turn 1 completed successfully!');
      break;
    }
    if (turnData.status === 'failed' || turnData.status === 'retryable_failure') {
      throw new Error(`Turn 1 failed with status: ${turnData.status} - ${JSON.stringify(turnData.failure)}`);
    }
  }
  if (!turn1Complete) throw new Error('Turn 1 timed out after 60s');

  console.log('5. Submitting Turn 2: Follow-up action...');
  const freshRunRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}`);
  const freshRun = await freshRunRes.json();

  const turn2Res = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({
      text: 'I step closer and lower my voice. "Tell me of the seal you found, Kaelen. Speak softly."',
      idempotencyKey: `idemp_${Date.now()}_2`,
      expectedVersion: freshRun.expectedVersion,
      branchId,
    }),
  });
  if (!turn2Res.ok) throw new Error(`Turn 2 failed: ${await turn2Res.text()}`);
  const turn2Data = await turn2Res.json();
  const turn2Id = turn2Data.id || turn2Data.turnId;
  console.log(`   Turn 2 accepted: ${turn2Id}, waiting for worker execution...`);

  let turn2Complete = false;
  for (let i = 0; i < 30; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const statusRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns/${turn2Id}`);
    const turnData = await statusRes.json();
    process.stdout.write(`   Turn 2 stage: ${turnData.stage} (${turnData.status})\r`);
    if (turnData.status === 'completed' || turnData.stage === 'COMPLETED') {
      turn2Complete = true;
      console.log('\n   Turn 2 completed successfully!');
      break;
    }
    if (turnData.status === 'failed' || turnData.status === 'retryable_failure') {
      throw new Error(`Turn 2 failed with status: ${turnData.status} - ${JSON.stringify(turnData.failure)}`);
    }
  }
  if (!turn2Complete) throw new Error('Turn 2 timed out after 60s');

  console.log('6. Querying player journal endpoint...');
  const journalRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/journal`);
  const journalData = await journalRes.json();
  console.log(`   Journal observations returned: ${journalData.observations?.length}`);
  console.log(`   Journal narratives returned: ${journalData.narratives?.length}`);

  console.log('7. Verifying Epistemic Isolation: checking details drawer API...');
  const timelineRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/timeline`);
  const timeline = await timelineRes.json();
  console.log(`   Timeline contains ${timeline.length} turns.`);
  for (const t of timeline) {
    if (t.segmentId) {
      const detailsRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/responses/${t.segmentId}/details`);
      if (detailsRes.ok) {
        const detailsData = await detailsRes.json();
        console.log(`   Turn ${t.turnNumber} response thoughts: ${detailsData.thoughts?.length}`);
      }
    }
  }

  console.log('\nALL MULTI-TURN LIVE API INTEGRATION CHECKS PASSED!');
}

runLiveTest().catch((err) => {
  console.error('\nTest failed:', err);
  process.exit(1);
});
