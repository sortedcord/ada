# ADR-011: Per-principal NPC cognition fan-out

- **Status:** Accepted
- **Supersedes:** The shared `NpcDecisionBatch` generation step in the current Phase 7 worker implementation
- **Related:** ADR-003, ADR-004, ADR-007, ADR-010; `docs/policy/perception.md`; `docs/policy/belief-memory-thought.md`

## Context

The current worker selects all active NPCs in a scene and sends them together in one `NpcDecisionBatch` prompt. That prompt contains every selected NPC's public and private character data plus shared recent narrative history.

This violates the intended principal-aware privacy boundary even when the model is instructed not to leak information. A single model context can correlate all supplied information. As a result, one NPC may behave as if they know:

- another NPC's private description, goals, fears, beliefs, memories, or thoughts;
- facts from narrative turns they did not witness;
- the contents of private phone messages or remote conversations;
- facts about the player learned by another NPC but never communicated to them;
- off-screen events that appeared in the global transcript.

A global transcript is not an NPC's memory. Narrative prose is a player-facing rendering and must not be used as shared epistemic state.

## Decision

NPC cognition is executed once per NPC principal, independently and concurrently. Each call receives an owner-scoped context built only from canonical records the NPC is authorized to know.

No NPC generation request may contain another NPC's private context, private thoughts, owner-scoped memories, owner-scoped beliefs, or observations for which the NPC is not the observer.

The turn coordinator fans out one durable NPC job per selected entity and waits at a fan-in barrier before privileged world resolution.

## Core invariants

1. **One principal per cognition call.** An NPC call controls exactly one `entityId`.
2. **No shared NPC prompt.** The worker never sends a list of candidates with all candidate profiles to one model call.
3. **No raw global transcript in NPC context.** NPC history is reconstructed from owner-scoped observations, memories, beliefs, thoughts, and relationship views.
4. **Deterministic perception precedes cognition.** The model cannot add observers or recipients.
5. **Remote communication is explicit.** A phone message creates recipient-scoped communication observations; nearby NPCs can observe phone use but not message contents.
6. **Independent fan-out.** One NPC's failed or delayed model call does not expose context to or mutate another NPC's job.
7. **Privileged resolution excludes private cognition text.** The resolver receives validated attempted actions, visible speech, and action intents—not private thought prose.
8. **Observations are committed after canonical events.** Future NPC turns retrieve only what their owner observed or was told.
9. **Human player agency remains protected.** No cognition call is ever generated for the human player entity.
10. **All authorization is auditable.** Every invocation records principal, authorized source IDs, input hash, prompt version, usage, latency, and validation status.

## Modified turn pipeline

```text
PLAYER INPUT
  |
  v
1. ACCEPT + IDEMPOTENCY + EXPECTED VERSION
  |
  v
2. PARSE ATTEMPTED PLAYER ACTION
  |
  v
3. SNAPSHOT CANONICAL PRE-TURN STATE
  |
  v
4. CREATE PROVISIONAL PLAYER-ACTION SIGNAL
  |
  v
5. DETERMINISTIC PERCEPTION ELIGIBILITY
  |   - same location / topology / modality
  |   - explicit remote communication recipients
  |   - no model-added observers
  |
  v
6. SELECT NPC PRINCIPALS
  |
  +--> NPC A CONTEXT --> NPC A LLM CALL --> VALIDATED DECISION A
  |
  +--> NPC B CONTEXT --> NPC B LLM CALL --> VALIDATED DECISION B
  |
  +--> NPC C CONTEXT --> NPC C LLM CALL --> VALIDATED DECISION C
  |          (concurrent, isolated, independently retryable)
  v
7. FAN-IN BARRIER
  |
  v
8. PRIVILEGED DETERMINISTIC/LLM RESOLUTION
  |   - player attempted action
  |   - NPC attempted actions and public speech
  |   - server random outcomes
  |   - no private thought prose
  v
9. VALIDATE + COMMIT CANONICAL EVENTS/PATCHES/TIME
  |
  v
10. CREATE DETERMINISTIC OBSERVATIONS PER PRINCIPAL
  |
  +--> optional owner-scoped observation interpretation
  |
  v
11. PLAYER-LIMITED NARRATION
  |
  v
12. ASYNC OWNER-SCOPED MEMORY/BELIEF CURATION + INDEXING
```

## Stage details

### 1. Acceptance

Unchanged from ADR-004:

- idempotency key;
- active branch check;
- one active turn per run;
- expected-version validation;
- durable `turns`, `job_runs`, and outbox records.

### 2. Player intent

Parse only the attempted external action. Do not infer or create player thoughts, motives, emotional state, or hidden intent.

Example output:

```json
{
  "actorEntityId": "alex",
  "actionType": "speech",
  "targets": [{ "type": "entity", "id": "danielle_carter" }],
  "utterance": "Hey, Danielle.",
  "visibility": "scene_observable"
}
```

### 3. Canonical pre-turn snapshot

The snapshot includes runtime locations, active statuses, world time, topology, communication channels, and versioned state. It does not flatten owner-private records into one global model input.

### 4. Provisional action signal

Before resolution, the engine creates a non-canonical signal describing the attempted player action. It is used only to determine who could perceive the attempt.

This is not yet a committed event and cannot mutate canon.

### 5. Deterministic perception eligibility

Use `docs/policy/perception.md` rules to compute eligible observer/modality pairs.

Examples:

- Direct speech in the same quiet room: eligible for nearby hearing-capable entities.
- A shoulder tap: eligible to the touched NPC through touch; visible to line-of-sight observers.
- A private text to Danielle: the message body is eligible only to Alex and Danielle. Lena may receive a separate observation such as `Alex typed on their phone`, never the message contents.
- An NPC entering late: receives no retroactive observation of events before entry.

The model may interpret eligible evidence but may not add observers.

### 6. NPC selection

Candidate selection remains deterministic and bounded. Select an NPC if at least one applies:

- directly targeted;
- present and eligible to perceive the player action;
- recipient of an explicit remote communication;
- has a triggered canonical plan that can act without perceiving this event.

Selection returns principal-specific reasons and eligible source IDs.

### 7. Owner-scoped NPC context materialization

For principal `NPC(entityId)`, build this context only:

```ts
interface AuthorizedNpcContext {
  principal: { kind: 'npc'; entityId: string };
  self: {
    publicDescription: string;
    privateDescription: string;
    personality: string[];
    speechStyle: string;
    drives: string[];
    goals: string[];
    fears: string[];
    capabilities: string[];
    limitations: string[];
  };
  currentState: {
    locationId: string;
    worldTime: string;
    physicalState: unknown;
    immediateObjective: unknown;
  };
  newEvidence: Observation[];
  recentObservations: Observation[];
  activeBeliefs: Belief[];
  retrievedMemories: Memory[];
  activeThoughts: InnerThought[];
  relationshipViews: RelationshipView[];
  publicWorldRules: string[];
  architectPressure: string[];
  authorizedSourceIds: string[];
}
```

It must not contain:

- raw player-facing narrative history;
- observations owned by another entity;
- other NPC private descriptions;
- other NPC thoughts or memories;
- privileged plot/architect secrets not explicitly allowed;
- text-message contents unless this NPC is sender/recipient or was shown the screen;
- omniscient relationship state.

### 8. Per-NPC LLM call

The response controls only the principal NPC:

```json
{
  "entityId": "danielle_carter",
  "attention": "focused",
  "reaction": "speak_and_act",
  "speech": "Hey. Give me a second, okay?",
  "attemptedActions": [],
  "generatedThoughts": [],
  "beliefProposals": [],
  "goalUpdates": [],
  "perceivedEvidenceIds": ["observation:..."]
}
```

Validation fails if:

- `entityId` differs from the principal;
- evidence IDs are outside `authorizedSourceIds`;
- it attempts an action for another entity;
- it changes canon directly;
- it creates player thoughts;
- a belief lacks eligible evidence.

### 9. Concurrent orchestration

Use a BullMQ flow or durable per-NPC stage jobs:

```text
turn:{turnId}:npc:{entityId}:v1
```

Each job writes a `turn_stage_results` row with:

- stage: `NPC_DECISION`;
- principal entity ID in the input snapshot;
- authorized source IDs;
- validated output;
- application key;
- retry lineage;
- status and safe error.

The coordinator waits for all selected principals or a bounded deadline.

Failure policy:

- Retry transient provider errors independently.
- On permanent invalid output, record a safe no-action result for that NPC.
- Never retry the entire NPC group because one principal failed.
- No partial NPC result mutates canon before fan-in.

### 10. Fan-in and privileged resolution

The resolver can read canonical world truth, but its input should contain only:

- player attempted external action;
- each NPC's validated attempted actions;
- each NPC's visible speech;
- deterministic random outcomes;
- canonical pre-turn state required for collision/conflict resolution;
- architect guidance and forbidden revelations.

Do not send private thought text to the resolver. Thoughts explain owner cognition and support later owner memory/belief curation, but they are not canonical facts and are not player-visible.

Resolution handles simultaneous conflicts and produces allowlisted canonical events and patches.

### 11. Event commit and observations

After canonical commit, derive observations per eligible principal.

An observation is owner-scoped and records:

- observer entity;
- source event;
- modality;
- perceived content;
- detail and confidence;
- distortion/occlusion;
- observed turn.

A character's future history is built from these records, not from global narrative prose.

### 12. Narration

The narrator principal receives only player-authorized observations plus public style. It must not receive NPC thoughts, private memories, or owner-private beliefs.

### 13. Memory and belief curation

After completion, fan out owner-scoped curation jobs for each observer:

```text
turn:{turnId}:memory:{entityId}:v1
```

The curator may convert observations into:

- episodic memories;
- reinforced memories;
- evidence-backed beliefs;
- belief confidence updates;
- decay/reinforcement updates.

It may only read and write records owned by its principal.

## Communication privacy model

Remote communication is modeled explicitly rather than treated as ambient scene dialogue.

For a text from Alex to Danielle:

1. Create a communication attempt with sender and recipient.
2. Commit a message event whose private body is scoped to sender/recipient.
3. Create a full-content observation for Alex and Danielle.
4. Optionally create a separate scene-observable event such as `Alex used their phone` for nearby observers.
5. Nearby observers never receive the message body unless a separate show/read-aloud action occurs.

Replying NPC cognition for Danielle uses Danielle's message observation. Lena's cognition uses only the phone-use observation.

## Shared-scene dialogue semantics

NPC fan-out decisions are based on the same pre-turn snapshot and the player's new eligible action signal. NPCs do not react to another NPC's newly generated line in the same fan-out because that line did not exist when cognition began.

The resolver may order simultaneous responses for readability, but must not invent same-turn second-order knowledge.

If second-order reactions are required, they occur on the next turn after the speech has become a canonical event and generated observations, or in an explicit bounded micro-round with a second deterministic perception pass. Micro-rounds are optional and must be capped to avoid runaway agent conversations.

## Required persistence changes

Existing `observations`, `beliefs`, `memories`, `inner_thoughts`, `turn_stage_results`, and `ai_invocations` tables provide most primitives.

Add or record the following fields:

- `principal_entity_id` on `ai_invocations` (nullable for non-owner-scoped roles);
- `authorized_source_ids` / existing authorized document IDs;
- `input_hash` and prompt version;
- `context_policy_version`;
- `selection_reason` in per-NPC stage snapshots;
- `communication_scope` and explicit recipient IDs on communication event facts.

Until a migration is added, principal ID may be encoded in `role` (`npc:danielle_carter`) and stage input snapshots, but a dedicated indexed column is preferred.

## Call count and cost controls

A turn with `N` active NPCs normally uses:

```text
N NPC cognition calls (concurrent)
+ 1 resolver call
+ 1 narrator call if resolver does not produce player-facing narration
+ asynchronous owner-scoped curation calls
```

Controls:

- cap `N` with scenario/retrieval settings;
- prioritize directly targeted and eligible NPCs;
- skip cognition for unaware, irrelevant NPCs;
- use deterministic no-action decisions for trivial background entities;
- retrieve only top-ranked owner memories;
- cache immutable self-profile portions by revision hash;
- execute independent calls concurrently with provider-aware rate limiting.

## Telemetry and trace UI

The trace must group calls by principal:

```text
NPC_DECISION · danielle_carter
NPC_DECISION · madison_reed
NPC_DECISION · sabrina_hayes
NPC_DECISION · tyler_morgan
ACTIONS_RESOLVED · privileged resolver
NARRATION · player view
```

Each trace entry shows:

- principal;
- model and provider;
- prompt/context policy version;
- authorized source IDs;
- exact input payload when debug inspectors are enabled;
- token usage and latency;
- retries and validation result.

Exact owner-private inputs are an out-of-world debug view only and must remain disabled for ordinary remote gameplay.

## Go/no-go tests

The pipeline cannot ship until these tests pass:

1. **Private profile canary:** Secret in Danielle's private description never appears in Madison's prompt or output.
2. **Unwitnessed fact:** Madison does not know Alex's name until she hears/observes it or is told.
3. **Late arrival:** An NPC entering after an event receives no retroactive observation.
4. **Private text:** Lena sees phone use but not Alex/Danielle message content.
5. **Owner thought isolation:** Danielle's thought never appears in any other NPC prompt or player narration.
6. **Incorrect belief persistence:** An NPC's mistaken belief remains until evidence corrects it.
7. **Independent retry:** One NPC provider failure does not rerun or expose other NPC contexts.
8. **No player cognition:** No decision/thought is generated for the human player entity.
9. **Source authorization:** Returned evidence IDs must be a subset of the principal's authorized IDs.
10. **Narrator privacy:** Player narration contains only player-observable facts.

## Consequences

Positive:

- Enforces epistemic privacy structurally rather than through prompt wording.
- Gives every NPC a genuinely distinct history and belief state.
- Prevents absent or uninformed NPCs from inheriting global transcript knowledge.
- Enables independent retries, auditing, and model selection per role/principal.
- Better supports misinformation, misunderstandings, secrets, and gradual relationship change.

Costs:

- LLM call count grows with active NPC count.
- Requires fan-out/fan-in orchestration and provider rate limiting.
- Memory/observation retrieval must be efficient and owner-indexed.
- Same-turn multi-NPC back-and-forth requires explicit micro-round semantics rather than one omniscient batch call.
