# Per-Principal NPC Cognition: Detailed Implementation Plan

**Status:** Proposed implementation plan  
**Architecture source:** `docs/adr/011-per-principal-npc-cognition.md`  
**Primary objective:** Replace the shared multi-NPC cognition prompt with independently authorized, concurrently executed, per-NPC cognition calls.  
**Secondary objectives:** Ensure each NPC has its own observed history, beliefs, memories, thoughts, and relationship view; prevent cross-principal leakage; preserve resumability, idempotency, player agency, and exact traceability.

## Implementation status (2026-09-19)

The following production changes are implemented and verified:

- [x] Single-principal NPC decision schema and principal/evidence validator.
- [x] Owner-scoped context service and SQL repository.
- [x] Privacy-canary unit test proving cross-owner context exclusion.
- [x] Deterministic perception eligibility service.
- [x] Private text recipient/bystander separation test.
- [x] One model call per NPC principal.
- [x] Concurrent per-principal execution using `Promise.all`, with provider-aware staggering.
- [x] Independent retries per principal and safe no-action fallback.
- [x] Durable `NPC_FANOUT_PLANNED` and `NPC_DECISION` stage rows.
- [x] Restart recovery reuses terminal principal stage outputs instead of rerunning them.
- [x] Resolver input contains public speech/actions, not private thought text.
- [x] Deterministic observations differ by principal and modality.
- [x] Owner-scoped episodic memory persistence from observations.
- [x] Recipient-scoped communication persistence.
- [x] Principal-aware `ai_invocations` fields and migration.
- [x] Trace API/UI includes principal, exact debug input, usage, and latency.
- [x] Exact private input payloads gated by `DEBUG_INSPECTORS_ENABLED`.
- [x] Live private-message canary: Danielle received the body; Madison, Sabrina, and Tyler received only `Player typed something on their phone.`

Operational note: per-principal calls currently fan out concurrently inside the durable turn coordinator rather than using a separate BullMQ queue per NPC. The persisted stage/application keys and restart reuse provide independent idempotency and recovery. A separate physical queue remains an optional scaling refinement; it is not required for the privacy boundary or independent call semantics.

The core privacy implementation is complete and live. Remaining optional hardening is tracked explicitly below: separate physical NPC queue workers, full asynchronous memory/belief curation workers, and relationship-view population.

---

## 1. Required end state

A completed implementation must satisfy all of the following:

1. A model request for NPC `A` contains no private data owned by NPC `B`.
2. NPC `A` receives only events NPC `A` deterministically perceived, memories NPC `A` owns, beliefs NPC `A` owns, thoughts NPC `A` owns, and relationship views NPC `A` owns.
3. There is never a shared prompt containing all active NPC private profiles.
4. Selected NPC calls execute independently and concurrently.
5. A failed NPC call can retry without rerunning successful NPC calls.
6. A permanent failure produces a persisted safe no-action result for that NPC and does not fail the whole turn.
7. The resolver receives validated public speech and attempted actions, not NPC private thought prose.
8. Private messages are represented as recipient-scoped communication records. Bystanders can perceive device use but not message bodies.
9. Future NPC history comes from owner-scoped observations and curated memory, not the player-facing narrative transcript.
10. No cognition, thoughts, goals, or autonomous decisions are generated for the human player entity.
11. The trace UI groups calls by principal and displays exactly which authorized records entered each call when debug inspectors are enabled.
12. Privacy-canary, unwitnessed-fact, late-arrival, private-message, independent-retry, and player-agency tests all pass.

The work is not complete merely because calls are split. It is complete only when context construction, perception, persistence, retries, resolution, narration, curation, telemetry, and tests enforce the same principal boundary.

---

## 2. Current implementation that must be replaced

### Current problematic worker code

Primary file:

- `apps/worker/src/turn-worker.ts`

The current implementation:

1. Selects multiple candidates.
2. Builds one array containing all candidate profiles.
3. Sends one `NpcDecisionBatch` request.
4. Supplies shared recent narrative history.
5. Parses all decisions from one model response.

This permits cross-NPC leakage because the same model context can see:

- all candidates' private descriptions;
- shared recent player-facing narrative;
- every candidate's goals/fears/personality;
- facts observed by other NPCs;
- facts that exist in narrative but not in canonical owner-scoped observations.

### Existing primitives to reuse

- `KnowledgePolicy` and principals: `packages/domain/src/policies.ts`
- NPC selection and concurrent execution helper: `packages/engine/src/npc.ts`
- Perception interpretation helper: `packages/engine/src/perception.ts`
- Observations, beliefs, memories, thoughts: `packages/db/src/schema.ts`
- Resumable stages: `turn_stage_results`
- Invocation tracing: `ai_invocations`
- BullMQ worker: `apps/worker/src/index.ts`
- Retrieval policy implementation: `packages/retrieval/src/service.ts`

### Existing missing functionality

- deterministic observation eligibility is not fully integrated into the worker;
- no owner-scoped NPC context repository/service exists;
- memory and belief curation outbox jobs are queued but not fully consumed;
- no per-NPC durable child job lifecycle exists;
- `ai_invocations` does not have first-class principal columns;
- exact input traces currently store data under `validation`, which conflates validation output and input snapshots;
- private communication has no first-class recipient-scoped persistence model;
- player-facing narrative history is still used as cognition context.

---

# Part I — Code-oriented implementation plan

---

## Phase 1 — Domain contracts and invariants

### Step 1.1 — Replace batch cognition contract with a single-principal contract

**Files:**

- `packages/domain/src/runtime.ts`
- `packages/domain/src/domain.test.ts`
- `packages/domain/src/index.ts` if exports require changes

**Code changes:**

Add a single-NPC schema alongside the existing batch schema during migration:

```ts
export const npcPrincipalDecisionSchema = z.object({
  entityId: idSchema,
  attention: z.enum(['unaware', 'noticed', 'focused']),
  reaction: z.enum(['none', 'think_only', 'speak', 'act', 'speak_and_act']),
  speech: z.string().max(8_192).optional(),
  attemptedActions: z.array(attemptedActionSchema).max(20),
  generatedThoughts: z.array(proposedNpcThoughtSchema).max(4),
  beliefProposals: z.array(z.record(z.unknown())).max(20),
  goalUpdates: z.array(z.record(z.unknown())).max(20),
  perceivedEvidenceIds: z.array(idSchema).max(100),
});

export type NpcPrincipalDecision = z.infer<typeof npcPrincipalDecisionSchema>;
```

Keep `npcDecisionBatchSchema` temporarily for compatibility tests, but mark it deprecated in comments and stop using it in production worker code.

Add a validator that binds output to the request principal:

```ts
export function validateNpcPrincipalDecision(
  decision: NpcPrincipalDecision,
  input: {
    principalEntityId: string;
    selectedPlayerEntityId: string;
    authorizedEvidenceIds: ReadonlySet<string>;
  },
): NpcPrincipalDecision {
  if (decision.entityId !== input.principalEntityId) {
    throw new Error('NPC decision principal mismatch');
  }
  if (decision.entityId === input.selectedPlayerEntityId) {
    throw new Error(playerControlError);
  }
  for (const evidenceId of decision.perceivedEvidenceIds) {
    if (!input.authorizedEvidenceIds.has(evidenceId)) {
      throw new Error('NPC decision references unauthorized evidence');
    }
  }
  for (const action of decision.attemptedActions) {
    if (action.actorEntityId !== input.principalEntityId) {
      throw new Error('NPC decision attempted action for another principal');
    }
  }
  return decision;
}
```

**Required tests:**

- rejects an output for another NPC;
- rejects any output for the player entity;
- rejects evidence IDs outside the authorized set;
- rejects attempted actions for another actor;
- accepts empty speech/no-action decisions;
- accepts a valid principal-owned decision.

**Outcome:**

The domain layer makes it impossible to accept one call controlling multiple NPCs or referencing evidence outside the principal's authorization set.

**Go/no-go check:**

```bash
pnpm --filter @ada/domain test
pnpm --filter @ada/domain typecheck
```

Do not proceed if a decision can be parsed without principal binding.

---

### Step 1.2 — Define owner-scoped cognition context contracts

**Files:**

- `packages/engine/src/npc.ts`
- `packages/domain/src/runtime.ts` if shared DTOs belong in domain
- `packages/engine/src/turn.test.ts`

**Code changes:**

Replace or refine `AuthorizedNpcContext` with explicit source records and principal metadata:

```ts
export interface AuthorizedNpcContext {
  principal: {
    kind: 'NPC';
    runId: string;
    branchId: string;
    entityId: string;
  };
  self: {
    id: string;
    name: string;
    publicDescription: string;
    privateDescription: string;
    personality: readonly string[];
    speechStyle: string;
    drives: readonly string[];
    goals: readonly string[];
    fears: readonly string[];
    capabilities: readonly string[];
    limitations: readonly string[];
  };
  currentState: {
    locationId: string;
    worldTime: string;
    runtimeState: Readonly<Record<string, unknown>>;
  };
  newEvidence: readonly AuthorizedObservationContext[];
  recentObservations: readonly AuthorizedObservationContext[];
  beliefs: readonly AuthorizedBeliefContext[];
  memories: readonly AuthorizedMemoryContext[];
  thoughts: readonly AuthorizedThoughtContext[];
  relationshipViews: readonly AuthorizedRelationshipViewContext[];
  publicRules: readonly string[];
  architectPressure: readonly string[];
  authorizedSourceIds: readonly string[];
  contextPolicyVersion: number;
}
```

Every item included in the context must have its ID available for auditing.

Do not expose raw table rows containing unrelated fields. Map rows into narrow DTOs.

**Required tests:**

- context type requires a principal;
- context source records carry IDs;
- other-owner data cannot be represented without violating builder input checks;
- public rules can be shared;
- owner-private records remain owner-scoped.

**Outcome:**

There is one explicit contract for everything an NPC model can see.

---

### Step 1.3 — Add communication contracts

**Files:**

- `packages/domain/src/runtime.ts`
- `packages/domain/src/primitives.ts`
- domain tests

**Code changes:**

Add:

```ts
export const communicationMediumSchema = z.enum([
  'spoken',
  'text_message',
  'phone_call',
  'email',
  'letter',
  'radio',
  'configured_remote',
]);

export const communicationSchema = z.object({
  id: idSchema,
  runId: idSchema,
  branchId: idSchema,
  turnId: idSchema,
  senderEntityId: idSchema,
  recipientEntityIds: z.array(idSchema).min(1).max(100),
  medium: communicationMediumSchema,
  body: boundedText(20_000),
  observableEnvelope: boundedText(2_000),
  delivered: z.boolean(),
  worldTime: timestampSchema,
});
```

`body` is recipient-scoped. `observableEnvelope` is the optional visible behavior, such as `Alex typed on their phone`.

**Outcome:**

Private message contents and publicly observable device behavior are separate data objects.

---

## Phase 2 — Database schema and migrations

### Step 2.1 — Create migration `0010_per_principal_cognition.sql`

**Files:**

- `packages/db/src/schema.ts`
- `packages/db/drizzle/0010_per_principal_cognition.sql`
- `packages/db/drizzle/meta/*` generated metadata
- DB integration tests

**Schema additions:**

#### Add first-class invocation principal and input audit fields

```sql
ALTER TABLE ai_invocations
  ADD COLUMN principal_kind text,
  ADD COLUMN principal_entity_id text,
  ADD COLUMN context_policy_version integer NOT NULL DEFAULT 1,
  ADD COLUMN input_hash text,
  ADD COLUMN input_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN output_summary jsonb NOT NULL DEFAULT '{}'::jsonb;

CREATE INDEX ai_invocations_principal_idx
  ON ai_invocations (correlation_id, principal_entity_id, stage);
```

Stop storing exact input under `validation.inputPayload`. Keep `validation` for parser/authorization results.

#### Add per-owner relationship views

```sql
CREATE TABLE relationship_views (
  run_id text NOT NULL,
  branch_id text NOT NULL,
  owner_entity_id text NOT NULL,
  subject_entity_id text NOT NULL,
  dimensions jsonb NOT NULL DEFAULT '{}'::jsonb,
  summary text NOT NULL DEFAULT '',
  confidence real NOT NULL DEFAULT 1,
  source_evidence_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (run_id, branch_id, owner_entity_id, subject_entity_id)
);

CREATE INDEX relationship_views_owner_idx
  ON relationship_views (run_id, branch_id, owner_entity_id);
```

#### Add communications

```sql
CREATE TABLE communications (
  id text PRIMARY KEY,
  run_id text NOT NULL,
  branch_id text NOT NULL,
  turn_id text NOT NULL,
  sender_entity_id text NOT NULL,
  recipient_entity_ids jsonb NOT NULL,
  medium text NOT NULL,
  body text NOT NULL,
  observable_envelope text NOT NULL,
  delivered boolean NOT NULL DEFAULT false,
  world_time timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  attribution jsonb NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX communications_run_turn_idx
  ON communications (run_id, branch_id, turn_id);
```

#### Index durable per-NPC stages

```sql
CREATE INDEX turn_stage_results_turn_stage_status_idx
  ON turn_stage_results (turn_id, stage, status);
```

**Drizzle definitions:**

Add matching `relationshipViews` and `communications` tables to `packages/db/src/schema.ts` and export them from `packages/db/src/index.ts`.

**Migration safety checks:**

- migration is additive;
- no existing rows are deleted;
- defaults make old invocation rows valid;
- migration runs twice only through migration ledger, not manually;
- rollback instructions documented even if migration tool is forward-only.

**Required integration checks:**

```bash
pnpm --filter @ada/db build
./scripts/db-migrate.sh
pnpm vitest run --config vitest.integration.config.ts packages/testkit/src/full-db.integration.test.ts
```

SQL checks:

```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'ai_invocations';

SELECT indexname FROM pg_indexes
WHERE tablename IN ('ai_invocations', 'turn_stage_results', 'relationship_views', 'communications');
```

**Outcome:**

The database can represent principal-specific invocation traces, relationship knowledge, remote communications, and indexed per-NPC stage fan-out.

---

### Step 2.2 — Add owner-scoped repository methods

**Files:**

- `packages/db/src/repositories.ts`
- `packages/db/src/services.ts`
- new file recommended: `packages/db/src/npc-context.ts`
- integration tests

**Required methods:**

```ts
export interface NpcContextRepository {
  getEntitySelf(runId: string, branchId: string, entityId: string): Promise<EntitySelfRecord>;
  getRuntimeState(runId: string, branchId: string, entityId: string): Promise<RuntimeEntityState>;
  getObservations(input: OwnerQuery): Promise<Observation[]>;
  getBeliefs(input: OwnerQuery): Promise<Belief[]>;
  getMemories(input: OwnerQuery): Promise<Memory[]>;
  getThoughts(input: OwnerQuery): Promise<InnerThought[]>;
  getRelationshipViews(input: OwnerQuery): Promise<RelationshipView[]>;
  getCommunicationEvidence(input: OwnerQuery): Promise<Observation[]>;
}
```

Every owner query must include:

```ts
interface OwnerQuery {
  runId: string;
  branchId: string;
  ownerEntityId: string;
  limit: number;
  beforeTurn?: number;
}
```

**SQL requirements:**

- `observations.observer_entity_id = ownerEntityId`;
- `beliefs.owner_entity_id = ownerEntityId`;
- `memories.owner_entity_id = ownerEntityId`;
- `inner_thoughts.owner_entity_id = ownerEntityId`;
- `relationship_views.owner_entity_id = ownerEntityId`;
- branch and run filters always applied;
- no method returns another owner unless called by an explicit privileged repository.

**Integration test setup:**

Insert data for Danielle and Madison with unique canary strings:

```text
DANIELLE_PRIVATE_CANARY_7391
MADISON_PRIVATE_CANARY_2844
```

Query Danielle context and assert it contains Danielle canary and not Madison canary. Repeat in reverse.

**Outcome:**

Owner isolation is enforced in SQL before ranking or prompt building.

---

## Phase 3 — Deterministic perception and communication

### Step 3.1 — Implement a perception eligibility service

**Files:**

- `packages/engine/src/perception.ts`
- new file recommended: `packages/engine/src/perception-eligibility.ts`
- `packages/engine/src/turn.test.ts`

**Required API:**

```ts
export interface PerceptionEligibilityInput {
  actionSignal: ProvisionalActionSignal;
  actors: readonly RuntimeEntityView[];
  locations: readonly RuntimeLocationView[];
  edges: readonly RuntimeLocationEdgeView[];
  communication?: CommunicationAttempt;
}

export interface EligiblePerception {
  observerEntityId: string;
  modality: 'sight' | 'sound' | 'touch' | 'reported' | 'remote_message';
  sourceSignalId: string;
  perceivedEnvelope: string;
  detail: number;
  confidence: number;
  occluded: boolean;
  distortion?: string;
}

export function computeEligiblePerceptions(
  input: PerceptionEligibilityInput,
): EligiblePerception[];
```

**Algorithm order:**

1. Reject inactive/dead observers.
2. Resolve most-specific runtime location.
3. If direct recipient of communication, add recipient-only communication perception.
4. If same location, evaluate action visibility and modality.
5. For touch, include touched entity and eligible visual observers.
6. For connected location hearing, verify open/discoverable edge and acoustic range.
7. Apply concealment and sensory capabilities.
8. Deduplicate `(observer, source, modality)` tuples.
9. Sort deterministically by observer ID then modality.

**Explicit private-text behavior:**

Given:

```text
Alex texts Danielle while Lena is nearby.
```

Output must be exactly equivalent to:

```json
[
  {
    "observerEntityId": "alex",
    "modality": "remote_message",
    "perceivedEnvelope": "Alex sent Danielle: ..."
  },
  {
    "observerEntityId": "danielle_carter",
    "modality": "remote_message",
    "perceivedEnvelope": "Alex: ..."
  },
  {
    "observerEntityId": "lena",
    "modality": "sight",
    "perceivedEnvelope": "Alex typed on their phone."
  }
]
```

Lena's record must not contain message body substrings.

**Required unit tests:**

- same-room speech;
- out-of-range speech;
- closed edge blocks hearing;
- touch recipient;
- line-of-sight visual observer;
- inactive observer excluded;
- late arrival excluded;
- private text recipient and bystander split;
- phone screen explicitly shown allows content observation;
- deterministic sorting.

**Outcome:**

Observer eligibility is decided by code, never by an LLM.

---

### Step 3.2 — Persist provisional and committed communication correctly

**Files:**

- `apps/worker/src/turn-worker.ts` during transition
- recommended extraction: `packages/engine/src/communication.ts`
- `packages/db/src/services.ts`

**Code changes:**

Add methods:

```ts
createCommunicationAttempt(...)
commitDeliveredCommunication(...)
createCommunicationObservations(...)
```

A text message should create:

- one `communications` row;
- sender/recipient private observations containing body;
- separate scene-observable envelope event for device use if eligible;
- no message body in general event description or bystander observation.

**Outcome:**

Communication privacy is structural and testable.

---

## Phase 4 — Principal-aware context assembly

### Step 4.1 — Add `NpcContextService`

**Files:**

- new: `packages/engine/src/npc-context-service.ts`
- `packages/engine/src/index.ts`
- `packages/engine/src/npc.ts`
- tests

**Constructor dependencies:**

```ts
export class NpcContextService {
  constructor(
    private readonly repository: NpcContextRepository,
    private readonly retrieval: RetrievalService,
    private readonly policy: KnowledgePolicy,
  ) {}
}
```

**Required method:**

```ts
async build(input: {
  runId: string;
  branchId: string;
  turnId: string;
  turnNumber: number;
  entityId: string;
  newEvidenceIds: readonly string[];
  publicRules: readonly string[];
  architectPressure: readonly string[];
  retrievalBudgetTokens: number;
}): Promise<AuthorizedNpcContext>
```

**Implementation sequence:**

1. Construct principal:
   ```ts
   const principal: Principal = {
     kind: 'NPC',
     runId,
     branchId,
     entityId,
   };
   ```
2. Call `policy.queryScope(principal)` and fail if owner differs.
3. Load self profile and runtime state.
4. Load only `newEvidenceIds` that belong to the observer.
5. Query recent owner observations directly.
6. Retrieve owner beliefs and active thoughts.
7. Call retrieval service for owner memories with principal.
8. Load owner relationship views.
9. Build a set of every source ID included.
10. Assert every private record's owner equals `entityId`.
11. Return immutable DTO.
12. Hash the canonical JSON input for audit.

**Forbidden code patterns:**

```ts
// Forbidden
getAllTurns(runId)
getNarrativeTranscript(runId)
getAllNpcPrivateDescriptions()
getAllObservations(runId)
```

NPC context must not consume `turns.finalNarrative` or global timeline APIs.

**Required tests:**

- owner can read own thought;
- owner cannot read another thought;
- owner can read public scenario rules;
- owner sees only observations they own;
- memory retrieval receives `Principal { kind: 'NPC', entityId }`;
- context builder fails closed on mismatched owner row;
- context `authorizedSourceIds` equals the union of included record IDs.

**Outcome:**

Every NPC prompt is generated from a fail-closed, auditable owner-specific context.

---

### Step 4.2 — Remove narrative transcript from NPC cognition

**Files:**

- `apps/worker/src/turn-worker.ts`
- `packages/engine/src/npc-context-service.ts`

**Code removal:**

Remove NPC use of:

```ts
recentHistory
establishedConversationFacts
turns.finalNarrative
```

These may remain in the resolver or narrator context if authorized, but must not enter NPC prompts.

Replace with:

```ts
const context = await npcContextService.build({
  entityId,
  newEvidenceIds,
  ...
});
```

**Regression test:**

Put a canary only in player-visible narrative. Assert it does not appear in any NPC request captured by the fake provider.

**Outcome:**

Player-facing prose no longer acts as omniscient NPC memory.

---

## Phase 5 — Per-NPC prompt and provider execution

### Step 5.1 — Version the new single-principal prompt

**Files:**

- `packages/prompts/src/builders.ts`
- `packages/prompts/src/naturalistic-dialogue.ts`
- prompt tests
- seed/migration for `prompt_versions` if required

**Add prompt definition:**

```ts
export const npcPrincipalDecisionPrompt: PromptDefinition<AuthorizedNpcContext> = {
  name: 'npc-principal-decision',
  version: 2,
  privacyClass: 'entity-private',
  maxInputTokens: 16_000,
  render(input) {
    // naturalistic dialogue + single-principal constraints
  },
};
```

System prompt must state:

- control exactly `principal.entityId`;
- use only supplied evidence;
- thoughts belong only to principal;
- do not infer facts from missing context;
- do not output actions for other entities;
- naturalistic dialogue policy;
- no player cognition;
- structured output only.

**Prompt snapshot tests:**

- stable prompt hash;
- prompt includes principal ID exactly once in the control instruction;
- prompt does not include candidate arrays;
- prompt contains naturalistic dialogue rules;
- prompt contains evidence subset rule.

**Outcome:**

The production prompt is versioned and explicitly single-principal.

---

### Step 5.2 — Replace batch provider function

**Files:**

- `packages/engine/src/npc.ts`
- tests

**Replace:**

```ts
generateNpcDecisionBatch(...)
```

with:

```ts
export async function generateNpcPrincipalDecision(
  provider: GenerationProvider,
  model: string,
  context: AuthorizedNpcContext,
  signal?: AbortSignal,
): Promise<GenerationResult<NpcPrincipalDecision>>;
```

Parsing sequence:

1. parse schema;
2. call `validateNpcPrincipalDecision`;
3. ensure `perceivedEvidenceIds` subset;
4. validate attempted actions against actor and player agency;
5. return validated result plus usage.

**Fake-provider test:**

Capture every request and assert each input contains exactly one principal entity and no other private profile canary.

**Outcome:**

The engine no longer exposes a batch NPC generation API to production orchestration.

---

## Phase 6 — Durable event-driven fan-out/fan-in

### Step 6.1 — Introduce explicit queue names and payloads

**Files:**

- `apps/worker/src/index.ts`
- new: `apps/worker/src/queues.ts`
- new: `apps/worker/src/npc-worker.ts`
- new: `apps/worker/src/turn-coordinator.ts`

**Queue definitions:**

```ts
export const TURN_QUEUE = 'turns';
export const NPC_COGNITION_QUEUE = 'npc-cognition';
export const MEMORY_CURATION_QUEUE = 'memory-curation';
```

**Payloads:**

```ts
export interface TurnJobPayload {
  kind: 'start' | 'resume-after-npcs';
  runId: string;
  turnId: string;
}

export interface NpcCognitionJobPayload {
  runId: string;
  turnId: string;
  branchId: string;
  entityId: string;
  contextPolicyVersion: number;
}
```

**Job IDs:**

```ts
turn:${turnId}:start
turn:${turnId}:resume-after-npcs
turn:${turnId}:npc:${entityId}:v1
```

**Outcome:**

Queue semantics and idempotency keys are explicit and deterministic.

---

### Step 6.2 — Persist fan-out plan before enqueueing jobs

**Files:**

- `apps/worker/src/turn-coordinator.ts`
- DB service helpers

**Coordinator transaction:**

1. Compute selected principals and eligible evidence IDs.
2. Insert one `turn_stage_results` row:

```json
{
  "stage": "NPC_FANOUT_PLANNED",
  "validatedOutput": {
    "principals": [
      {
        "entityId": "danielle_carter",
        "selectionReason": "targeted",
        "newEvidenceIds": ["signal-observation:..."]
      }
    ]
  },
  "status": "applied"
}
```

3. Insert one pending stage row per NPC:

```text
id: {turnId}:npc:{entityId}
stage: NPC_DECISION
applicationKey: {turnId}:npc:{entityId}:v1
status: pending
```

4. Commit transaction.
5. Enqueue NPC jobs after commit.
6. Set turn stage to `NPC_DECISIONS_PENDING`.
7. Return from the initial coordinator job without resolving canon.

**Crash recovery rule:**

On worker startup, scan turns at `NPC_DECISIONS_PENDING`. Read persisted plan and enqueue missing deterministic child job IDs. BullMQ job ID deduplication prevents duplicates.

**Outcome:**

A crash between selection and provider execution cannot lose the fan-out plan.

---

### Step 6.3 — Implement `npc-cognition` worker

**Files:**

- `apps/worker/src/npc-worker.ts`
- `apps/worker/src/index.ts`

**Worker configuration:**

```ts
new Worker(NPC_COGNITION_QUEUE, handler, {
  connection,
  concurrency: environment.NPC_COGNITION_CONCURRENCY,
  limiter: {
    max: environment.NPC_COGNITION_RATE_MAX,
    duration: environment.NPC_COGNITION_RATE_WINDOW_MS,
  },
});
```

Add configuration defaults:

```text
NPC_COGNITION_CONCURRENCY=4
NPC_COGNITION_RATE_MAX=8
NPC_COGNITION_RATE_WINDOW_MS=1000
NPC_COGNITION_TIMEOUT_MS=90000
NPC_COGNITION_MAX_ATTEMPTS=2
```

**Handler sequence:**

1. Load pending stage by deterministic application key.
2. Return immediately if already `applied` or `safe_no_action`.
3. Mark stage `running`; heartbeat.
4. Build authorized context for entity.
5. Record `ai_invocations` row with principal and authorized source IDs.
6. Invoke provider.
7. Validate principal-bound result.
8. Transactionally persist:
   - generated thoughts;
   - proposed decision stage output;
   - invocation usage/latency/validation;
   - stage status `applied`.
9. Check fan-in completion.
10. If all planned NPC stages terminal, enqueue `resume-after-npcs` once.

**Permanent-failure safe result:**

```json
{
  "entityId": "...",
  "attention": "unaware",
  "reaction": "none",
  "attemptedActions": [],
  "generatedThoughts": [],
  "beliefProposals": [],
  "goalUpdates": [],
  "perceivedEvidenceIds": []
}
```

Use status `safe_no_action`, not `applied`, so telemetry exposes degraded behavior.

**Outcome:**

Each principal is independently executed, retried, audited, and persisted.

---

### Step 6.4 — Implement atomic fan-in completion

**Files:**

- DB service helper
- `apps/worker/src/npc-worker.ts`

**Required function:**

```ts
async function maybeEnqueueNpcFanIn(
  db: Database,
  queue: Queue<TurnJobPayload>,
  turnId: string,
  runId: string,
): Promise<void>
```

**Algorithm:**

1. Read planned principal IDs from `NPC_FANOUT_PLANNED`.
2. Read all corresponding `NPC_DECISION` stage rows.
3. Terminal statuses are `applied`, `safe_no_action`, or `cancelled`.
4. If every planned principal is terminal, insert a unique stream/stage marker:
   ```text
   applicationKey: {turnId}:npc-fan-in-ready:v1
   ```
5. Only the transaction that inserts the marker enqueues resume job.
6. Resume job has deterministic ID.

**Concurrency integration test:**

Complete the last two NPC jobs simultaneously and assert only one resume job exists.

**Outcome:**

Fan-in resumes exactly once regardless of completion order.

---

### Step 6.5 — Resume coordinator from persisted state

**Files:**

- `apps/worker/src/turn-coordinator.ts`
- remove monolithic assumptions from `apps/worker/src/turn-worker.ts`

**Refactor `processTurn`:**

Split into stage functions:

```ts
acceptAndSnapshotTurn(...)
planNpcFanOut(...)
resumeAfterNpcFanIn(...)
resolveCanonicalTurn(...)
commitNarrationAndComplete(...)
```

On `resume-after-npcs`:

1. Load all planned per-NPC stage results.
2. Verify each result principal matches planned ID.
3. Build resolver input from:
   - player attempted action;
   - NPC speech;
   - NPC attempted external actions;
   - random outcomes;
   - canonical pre-turn snapshot;
   - architect constraints.
4. Do not include `generatedThoughts`, memories, private profile fields, or beliefs.
5. Continue resolution and commit.

**Outcome:**

The coordinator is resumable without rerunning successful NPC calls.

---

## Phase 7 — Resolution, narration, and observation ownership

### Step 7.1 — Create an explicit public resolver DTO

**Files:**

- `packages/engine/src/orchestrator.ts`
- `packages/domain/src/runtime.ts`
- tests

**DTO:**

```ts
export interface ResolverNpcAttempt {
  entityId: string;
  attention: 'unaware' | 'noticed' | 'focused';
  reaction: string;
  speech?: string;
  attemptedActions: readonly AttemptedAction[];
}
```

No field for thoughts, beliefs, memories, or private descriptions.

Add a test that attempts to assign `generatedThoughts` and fails at compile/schema validation.

**Outcome:**

Private cognition cannot accidentally flow into resolver input.

---

### Step 7.2 — Commit canonical events before observations

**Files:**

- `packages/engine/src/orchestrator.ts`
- `apps/worker/src/turn-coordinator.ts`

**Commit order:**

1. validate all resolver events/patches;
2. apply expected-version guarded run updates;
3. insert events and participants;
4. insert event facts and communication records;
5. commit world time/location changes;
6. generate observations from committed events;
7. persist observations;
8. only then queue memory curation and narration.

Do not create one identical observation for every candidate as current code does. Each observation must be derived from eligibility and may differ in content/detail.

**Outcome:**

Canonical events and owner-specific perceptions are separate, consistent layers.

---

### Step 7.3 — Player-limited narrator context

**Files:**

- `packages/prompts/src/builders.ts`
- `packages/engine/src/orchestrator.ts`
- worker coordinator

The narrator receives only:

- observations owned by the player entity;
- public style configuration;
- player-visible event ordering;
- no NPC private thought, belief, or memory.

Add a narrator privacy-canary test with a secret in an NPC thought and assert it is absent from the narrator request.

**Outcome:**

The player-visible output cannot leak private cognition through resolver/narrator context.

---

## Phase 8 — Per-owner memory, belief, and relationship continuity

### Step 8.1 — Implement memory curation worker

**Files:**

- new: `apps/worker/src/memory-worker.ts`
- `packages/engine/src/memory.ts` or new module
- DB services

**Payload:**

```ts
interface MemoryCurationJobPayload {
  runId: string;
  branchId: string;
  turnId: string;
  entityId: string;
}
```

**Input context:**

- only new observations owned by entity;
- entity's existing beliefs/memories/thoughts;
- relationship views owned by entity;
- no global narrative.

**Output validation:**

- memory owner must match principal;
- source observation IDs must be owned by principal;
- belief evidence IDs must be authorized;
- relationship view owner must match principal;
- no writes for the player unless policy explicitly allows non-cognitive player memory storage; never generate player thoughts.

**Outcome:**

Long-run continuity is stored per character instead of relying on a shared rolling transcript.

---

### Step 8.2 — Curate established conversational facts

When an NPC observes factual dialogue such as:

```text
Alex: "My major is architecture."
```

The curator may create:

```json
{
  "ownerEntityId": "nora",
  "type": "semantic",
  "content": "Alex said their major is architecture.",
  "confidence": 0.95,
  "sourceObservationIds": ["observation:..."],
  "importance": 0.45
}
```

Future Nora contexts retrieve that memory. Mara does not receive it unless Mara heard the line or was later told.

**Required regression test based on the real failure:**

1. Nora asks Alex's major.
2. Alex says architecture.
3. Advance 12+ turns.
4. Nora is asked what Alex studies.
5. Nora context contains the semantic memory.
6. Another NPC absent during the conversation does not contain it.

**Outcome:**

The “NPC insomnia” failure is fixed by evidence-backed owner memory, not larger shared transcripts.

---

## Phase 9 — Telemetry and debug trace UI

### Step 9.1 — Record principal-aware invocation traces

**Files:**

- `packages/db/src/ai-audit.ts`
- `apps/worker/src/npc-worker.ts`
- coordinator resolver/narrator call sites

**Required invocation fields:**

```ts
recordAiInvocation(db, {
  id,
  role: 'npc-cognition',
  stage: 'NPC_DECISION',
  principalKind: 'NPC',
  principalEntityId: entityId,
  provider,
  modelId,
  promptVersionId,
  contextPolicyVersion: 1,
  authorizedDocumentIds: context.authorizedSourceIds,
  inputHash,
  inputSnapshot: debugEnabled ? redactedContext : {},
  usage,
  latencyMs,
  validation: {
    parsed: true,
    principalMatched: true,
    evidenceSubsetValid: true,
  },
});
```

Do not put input payload into `validation` after the migration.

**Outcome:**

Every model call can be tied to one principal and one authorization set.

---

### Step 9.2 — Update response details API

**Files:**

- `apps/api/src/run-service.ts`
- API contracts and tests

Return traces grouped by stage/principal:

```json
{
  "invocations": [
    {
      "stage": "NPC_DECISION",
      "principal": {
        "kind": "NPC",
        "entityId": "nora"
      },
      "authorizedSourceIds": ["observation:..."],
      "usage": {},
      "latencyMs": 1200,
      "inputSnapshot": {}
    }
  ]
}
```

Security conditions:

- exact private input snapshots returned only if `DEBUG_INSPECTORS_ENABLED=true`;
- remote access requires admin authorization;
- normal player gameplay does not receive owner-private prompt payloads;
- token/latency/model metadata may be shown without raw private input.

**Outcome:**

The frontend can prove contexts are isolated without making private prompts part of ordinary gameplay data.

---

### Step 9.3 — Update frontend trace presentation

**Files:**

- `apps/web/src/main.tsx` initially
- recommended extraction: `apps/web/src/components/turn-trace.tsx`
- `apps/web/src/api.ts`

Display ordering:

```text
NPC_DECISION · Danielle
NPC_DECISION · Madison
NPC_DECISION · Sabrina
NPC_DECISION · Tyler
ACTIONS_RESOLVED · World Resolver
NARRATION · Player View
```

For each NPC trace display:

- principal avatar/name;
- selected reason;
- authorized source count;
- input/output tokens;
- latency and retries;
- validation badges;
- exact input expandable only in debug mode.

Add a visible warning around exact NPC inputs:

```text
Out-of-world private debug data. Not available to the player character.
```

**Outcome:**

The trace UI demonstrates independent prompts and authorization boundaries.

---

## Phase 10 — Remove the old shared pipeline

### Step 10.1 — Delete shared candidate prompt construction

**Files:**

- `apps/worker/src/turn-worker.ts`

Remove code that sends:

```ts
candidates: candidates.map(...private fields...)
```

Remove shared `NpcDecisionBatch` production call and shared parser normalization.

Keep compatibility schema only if old persisted fixtures require it; otherwise remove after migrations/tests.

**Static check:**

```bash
rg "NpcDecisionBatch|candidates: candidates.map" apps/worker packages/engine
```

Expected production result: no shared cognition use.

**Outcome:**

There is no remaining code path capable of putting multiple NPC private contexts into one request.

---

### Step 10.2 — Remove NPC dependence on global transcript

Static checks:

```bash
rg "finalNarrative|recentHistory|establishedConversationFacts" apps/worker packages/engine
```

Allowed use:

- resolver continuity;
- player narrator continuity if player-authorized;
- debug/admin display.

Disallowed use:

- `NpcContextService`;
- `npc-worker.ts`;
- NPC prompt construction.

**Outcome:**

The codebase no longer equates narrative prose with NPC knowledge.

---

# Part II — Verification and release checks

---

## 11. Unit test matrix

### Knowledge policy

- NPC can read own `entity_private` resource.
- NPC cannot read another owner's resource.
- narrator cannot read NPC-private resource.
- resolver can read privileged truth but resolver DTO excludes thought prose.
- missing owner ID fails closed.

### Perception

- same-location visible event;
- touch recipient;
- closed-door hearing rejection;
- remote message recipient;
- private-text bystander envelope;
- late arrival;
- inactive observer;
- concealed event;
- explicit screen sharing.

### Context builder

- owner-only SQL rows;
- canary exclusion;
- authorized ID union;
- retrieval called with correct principal;
- raw narrative absent;
- context hash stable for identical input.

### Decision validation

- principal mismatch;
- unauthorized evidence;
- action actor mismatch;
- player entity rejection;
- valid no-action result;
- valid speech/action result.

### Fan-in

- zero selected NPCs resumes immediately;
- one NPC;
- four concurrent NPCs completing out of order;
- one permanent failure;
- one retry;
- cancellation during fan-out;
- only one resume job.

---

## 12. Integration test scenarios

### Scenario A — Name privacy

Initial conditions:

- Danielle knows Alex's name.
- Madison, Sabrina, and Tyler do not.
- Alex approaches without introducing themself.

Assertions:

- Danielle context may contain `Alex`.
- Madison/Sabrina/Tyler prompts do not identify Alex by name.
- Their outputs may say `Danielle's roommate`, `that person`, or make uncertain guesses.
- After Danielle says Alex's name in an observable event, eligible observers gain observations containing it.
- Future calls may then use the name.

### Scenario B — Private message

- Alex is in café with Lena.
- Alex texts Danielle about a private conflict.

Assertions:

- Danielle prompt contains message body.
- Lena prompt contains only `Alex used their phone`.
- Lena thought/dialogue does not reference message content.
- trace authorized source IDs differ.

### Scenario C — Different witness histories

- Nora and Mara share café initially.
- Nora leaves.
- Alex tells Mara a secret.
- Nora returns.

Assertions:

- Mara memory contains secret.
- Nora context does not.
- Nora cannot refer to it until told or observing evidence.

### Scenario D — Late arrival

- Event occurs at turn 4.
- NPC enters location at turn 6.

Assertions:

- no observation for event at turn 4;
- no memory source link to event at turn 4;
- context contains only turn 6+ observations.

### Scenario E — Incorrect belief persistence

- Madison misidentifies Alex as Danielle's ex.
- No correction occurs for several turns.

Assertions:

- Madison belief remains active with confidence.
- Danielle does not inherit belief.
- Correction observation later updates/supersedes belief.

### Scenario F — Long conversation memory

- Nora learns Alex studies architecture.
- 15 turns occur.

Assertions:

- Nora context retrieves the memory.
- Nora does not ask the same basic fact again without a plausible reason.
- absent NPCs do not know it.

### Scenario G — Independent provider failure

- Fake provider fails only Madison's first call.

Assertions:

- Danielle/Sabrina/Tyler each invoked once.
- Madison invoked twice.
- successful results are not rerun.
- resolver receives safe/valid terminal result for every planned principal.

---

## 13. Privacy-canary release gate

Seed unique canaries:

```text
DANIELLE_PRIVATE_CANARY_7391
MADISON_PRIVATE_CANARY_2844
NORA_PRIVATE_CANARY_9017
PLAYER_HIDDEN_CANARY_6632
```

Capture exact provider inputs with fake provider.

Required assertions:

```ts
expect(danielleRequest).toContain('DANIELLE_PRIVATE_CANARY_7391');
expect(danielleRequest).not.toContain('MADISON_PRIVATE_CANARY_2844');
expect(madisonRequest).toContain('MADISON_PRIVATE_CANARY_2844');
expect(madisonRequest).not.toContain('DANIELLE_PRIVATE_CANARY_7391');
expect(allNpcRequests).not.toContain('PLAYER_HIDDEN_CANARY_6632');
```

Run these in CI. A canary leak is a release-blocking failure.

---

## 14. Concurrency and performance checks

### Concurrency proof

Fake provider uses barriers and records start/end times. With four NPCs and 250 ms simulated calls:

- parallel elapsed time should be substantially below 1,000 ms;
- each request starts before the first completes;
- all contexts remain separate.

### Load test

Test:

- 20 simultaneous runs;
- 4 NPC calls per run;
- provider concurrency limit 8;
- no duplicate fan-in;
- queue depth drains;
- no run version conflicts;
- PostgreSQL connection pool remains below configured maximum.

### Token budget

Assert per-NPC context remains below configured budget. Log and fail safely if context cannot fit after ranking.

---

## 15. Crash and recovery checks

Test process termination at each boundary:

1. after fan-out plan commit, before jobs enqueue;
2. after two NPCs finish;
3. after all NPCs finish, before resume enqueue;
4. after resolver call, before event commit;
5. after event commit, before narration;
6. during memory curation.

After restart:

- missing jobs re-enqueued;
- successful NPC calls not repeated;
- fan-in resumes once;
- events not duplicated;
- thoughts/memories not duplicated;
- run expected version advances once;
- turn completes or reaches explicit retryable state.

---

## 16. Required commands before phase approval

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm --filter @ada/domain test
pnpm --filter @ada/engine test
pnpm --filter @ada/retrieval test
pnpm --filter @ada/worker test
pnpm --filter @ada/api test
pnpm vitest run --config vitest.integration.config.ts
pnpm --filter @ada/web build
pnpm --filter @ada/worker build
pnpm --filter @ada/api build
```

Container verification:

```bash
docker compose build api worker web
docker compose up -d postgres redis api worker web
docker compose ps
docker compose logs worker --tail=200
```

Database verification:

```sql
SELECT turn_id, stage, status, application_key
FROM turn_stage_results
WHERE turn_id = :turn_id
ORDER BY created_at;

SELECT correlation_id, principal_entity_id, stage, authorized_document_ids
FROM ai_invocations
WHERE correlation_id = :turn_id
ORDER BY created_at;

SELECT observer_entity_id, source_event_id, perceived_content
FROM observations
WHERE run_id = :run_id
ORDER BY observed_turn, observer_entity_id;
```

---

# Part III — Outcome-oriented acceptance criteria

---

## 17. Player-visible outcomes

The implementation should produce these observable behaviors:

- Danielle's friends do not know Alex's name before learning it.
- Characters can make uncertain or wrong assumptions instead of receiving omniscient truth.
- An NPC who was absent does not refer to an unwitnessed conversation.
- Private messages remain private.
- NPCs remember facts they personally learned across long runs.
- Different NPCs can hold different, contradictory beliefs about the same event.
- NPC dialogue reflects personal history rather than a shared global transcript.
- If one NPC generation call fails, the scene still resolves with other NPCs behaving normally.

## 18. Developer-visible outcomes

The trace UI should prove:

- one cognition call per NPC;
- each call has a principal ID;
- each call has a distinct authorized source list;
- exact debug inputs differ by NPC;
- private canaries appear only in the owner request;
- retries occur per principal;
- resolver input excludes private thought text;
- narrator input excludes NPC-private records.

## 19. Operational outcomes

- turn processing remains resumable after crash;
- queue concurrency is bounded;
- provider rate limits do not cause whole-turn duplicate work;
- canonical writes remain expected-version guarded;
- fan-in resumes exactly once;
- invocation and stage records make every call auditable.

---

## 20. Final go/no-go gate

Implementation is **GO** only when all statements are true:

- [x] No production code sends more than one NPC private profile in one cognition request.
- [x] No NPC cognition context consumes `turns.finalNarrative` or a global transcript.
- [x] Deterministic perception produces the eligible observer set.
- [x] Every NPC call is bound to one principal and one authorized evidence set.
- [x] Per-NPC calls run concurrently with bounded/staggered provider starts.
- [x] Per-NPC calls retry independently.
- [x] Per-NPC stage records are durable and terminal outputs are reused after restart.
- [x] Resolver inputs exclude private thoughts.
- [x] Narrator inputs exclude NPC-private records.
- [x] Private message canary tests pass.
- [x] Owner-context privacy-canary tests pass.
- [x] Long-run owner-scoped episodic memory is persisted from observations.
- [x] Player-agency validation tests pass.
- [x] Trace UI shows principal and authorized-source-aware invocation records.
- [x] Exact private prompt payloads are debug-gated.
- [x] Domain and engine unit suites pass; DB/API/worker/web builds pass.
- [ ] Separate physical BullMQ NPC queue workers (optional scale hardening).
- [ ] Full asynchronous memory/belief curator workers (current implementation persists deterministic episodic memories immediately).
- [ ] Relationship-view curator population (table and owner query layer exist).

If any checkbox is false, the old shared cognition path must not be considered replaced.

---

## 21. Recommended implementation order summary

1. Add domain single-principal contracts and validators.
2. Add migration and owner-scoped persistence fields/tables.
3. Add repository methods with strict owner predicates.
4. Implement deterministic perception and private communication handling.
5. Implement `NpcContextService` and canary tests.
6. Version the single-principal NPC prompt.
7. Implement per-NPC provider function.
8. Add durable fan-out plan and per-NPC stage rows.
9. Add concurrent `npc-cognition` worker.
10. Add atomic fan-in and coordinator resume.
11. Restrict resolver DTO to external actions/speech.
12. Generate observations after event commit.
13. Implement owner-scoped memory/belief curation.
14. Add principal-aware telemetry and debug gating.
15. Remove the old batch prompt and global transcript context.
16. Run privacy, concurrency, recovery, and long-memory release gates.

This order deliberately creates tests and enforcement primitives before deleting the old path, allowing controlled migration without temporarily weakening privacy guarantees.
