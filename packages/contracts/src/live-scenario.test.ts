import { describe, expect, it } from 'vitest';

describe('Live Scenario Multi-Turn & Long-Run Verification', () => {
  it('executes a 5-turn gameplay run end-to-end against live containerized API with epistemic privacy', async () => {
    const suffix = Date.now().toString(36);
    const revId = `rev_long_${suffix}`;

    const scenarioAggregate = {
      scenario: {
        id: `scenario_long_${suffix}`,
        revisionId: revId,
        slug: `long-scenario-${suffix}`,
        title: 'The Citadel Long Run',
        description: 'Multi-turn endurance test',
        premise: 'Investigating the depths of the lower archives.',
        genre: 'mystery',
        tone: 'serious',
        themes: ['lore'],
        contentBoundaries: [],
        worldRules: ['Archive doors require crystal tokens.'],
        defaultNarrationStyle: 'Concise, atmospheric.',
        chronologyMarker: 'Hour 1',
        startLocationId: 'loc_archive_entrance',
        config: {
          narration: { person: 'second', tense: 'present', omniscient: false },
          pacing: {},
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
          attribution: { source: 'player' as const, sourceIds: [] },
        },
      },
      entities: [
        {
          id: 'entity_player',
          revisionId: revId,
          name: 'Scholar Vael',
          aliases: [],
          pronouns: 'they/them',
          kind: 'character',
          tags: ['scholar'],
          publicDescription: 'A quiet investigator.',
          privateDescription: 'VAEL_SECRET_CANARY_CIPHER_982',
          appearance: '',
          history: '',
          historicalEvents: [],
          personality: ['methodical'],
          speechStyle: 'measured',
          values: [],
          drives: [],
          goals: [],
          fears: [],
          desires: [],
          capabilities: [],
          limitations: [],
          secrets: ['VAEL_SECRET_CANARY_CIPHER_982'],
          stats: {},
          structuredAttributes: {},
          constraints: [],
          aiMutationPolicy: 'manual_only',
          playable: true,
          cognitive: true,
          alive: true,
          active: true,
          startingLocationId: 'loc_archive_entrance',
          metadata: {
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            version: 1,
            schemaVersion: 1,
            attribution: { source: 'player' as const, sourceIds: [] },
          },
        },
        {
          id: 'entity_npc_sentry',
          revisionId: revId,
          name: 'Sentry Torin',
          aliases: [],
          pronouns: 'he/him',
          kind: 'character',
          tags: ['guard'],
          publicDescription: 'A vigilant archive guard.',
          privateDescription: 'TORIN_FORBIDDEN_KEY_CANARY_113',
          appearance: '',
          history: '',
          historicalEvents: [],
          personality: ['stern'],
          speechStyle: 'curt',
          values: [],
          drives: [],
          goals: ['guard the vault gate'],
          fears: [],
          desires: [],
          capabilities: [],
          limitations: [],
          secrets: ['TORIN_FORBIDDEN_KEY_CANARY_113'],
          stats: {},
          structuredAttributes: {},
          constraints: [],
          aiMutationPolicy: 'manual_only',
          playable: false,
          cognitive: true,
          alive: true,
          active: true,
          startingLocationId: 'loc_archive_entrance',
          metadata: {
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            version: 1,
            schemaVersion: 1,
            attribution: { source: 'player' as const, sourceIds: [] },
          },
        },
      ],
      relationships: [],
      locations: [
        {
          id: 'loc_archive_entrance',
          revisionId: revId,
          name: 'Archive Entrance',
          aliases: [],
          type: 'interior',
          tags: [],
          publicDescription: 'A grand stone portico before heavy ironbound doors.',
          privateDetails: '',
          parentLocationId: null,
          environment: {},
          capacity: 10,
          accessRules: [],
          sensoryProperties: { sight: true, sound: true, hearingRange: 20 },
          hazards: [],
          aiMutationPolicy: 'manual_only',
          metadata: {
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            version: 1,
            schemaVersion: 1,
            attribution: { source: 'player' as const, sourceIds: [] },
          },
        },
      ],
      locationEdges: [],
      storyCards: [],
      storyCardLinks: [],
      plotArcs: [],
      plotPoints: [],
    };

    // 1. Create scenario
    const createRes = await fetch('http://127.0.0.1:4173/api/v1/scenarios', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ aggregate: scenarioAggregate }),
    });
    expect(createRes.ok).toBe(true);
    const { scenarioId } = (await createRes.json()) as { scenarioId: string };

    // 2. Publish scenario revision
    const pubRes = await fetch(`http://127.0.0.1:4173/api/v1/scenarios/${scenarioId}/publish-revision`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(pubRes.ok).toBe(true);
    const pubData = (await pubRes.json()) as { id?: string };
    const revisionId = pubData.id || revId;

    // 3. Start run
    const runRes = await fetch('http://127.0.0.1:4173/api/v1/runs', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ revisionId, playerEntityId: 'entity_player' }),
    });
    expect(runRes.ok).toBe(true);
    const { runId, branchId } = (await runRes.json()) as { runId: string; branchId: string };

    // 4. Submit a multi-turn sequence (5 turns)
    const turnInputs = [
      'Greetings Torin. I require access to the lower vault manuscripts.',
      'I display my imperial credentials stamped with the silver seal.',
      'I ask if anyone else entered the archive before me today.',
      'I take notes in my ledger as Torin explains the protocols.',
      'I step through the threshold into the lower corridors.',
    ];

    for (let turnIdx = 0; turnIdx < turnInputs.length; turnIdx++) {
      const freshRunRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}`);
      const freshRun = (await freshRunRes.json()) as { expectedVersion: number };

      const turnSubmitRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          text: turnInputs[turnIdx],
          idempotencyKey: `idemp_long_${suffix}_${turnIdx + 1}`,
          expectedVersion: freshRun.expectedVersion,
          branchId,
        }),
      });
      expect(turnSubmitRes.ok).toBe(true);
      const submitData = (await turnSubmitRes.json()) as { id?: string; turnId?: string };
      const turnId = submitData.id || submitData.turnId || '';

      // Poll until turn reaches completed
      let completed = false;
      for (let poll = 0; poll < 30; poll++) {
        await new Promise((resolve) => setTimeout(resolve, 1500));
        const checkRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/turns/${turnId}`);
        const checkData = (await checkRes.json()) as { status: string; stage: string };
        if (checkData.status === 'completed' || checkData.stage === 'COMPLETED') {
          completed = true;
          break;
        }
      }
      expect(completed).toBe(true);
    }

    // 5. Verify Timeline & Narrative Persistence
    const timelineRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/timeline`);
    const timeline = (await timelineRes.json()) as Array<{
      turnNumber: number;
      segmentId: string | null;
    }>;
    // Turn 0 (prologue) + 5 played turns = 6 total turns
    expect(timeline.length).toBe(6);

    // 6. Verify Player Journal isolation
    const journalRes = await fetch(`http://127.0.0.1:4173/api/v1/runs/${runId}/journal`);
    const journal = (await journalRes.json()) as {
      observations: Array<{ content: string }>;
      narratives: Array<{ text: string }>;
    };
    expect(journal.observations.length).toBeGreaterThanOrEqual(5);

    // Verify Epistemic Isolation: Torin's secret canary is NEVER in the player journal
    const allJournalText = JSON.stringify(journal);
    expect(allJournalText).not.toContain('TORIN_FORBIDDEN_KEY_CANARY_113');
  }, 180_000);
});
