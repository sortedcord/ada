# Luna Implementation Task List — AI Narrative Engine

> **Purpose:** This is the execution checklist for building the project described in `ai-dungeon-clone-plan.md` and `MODEL_INFO.md`.
>
> **Primary implementer:** Luna (or another coding model operating task-by-task).
>
> **Status rule:** Every implementation checkbox starts unchecked. **Do not check a task merely because a file, stub, TODO, mock, interface, migration placeholder, or UI shell exists. Check it only after the described behavior is fully implemented and its required tests pass.**

---

## 0. Mandatory execution protocol

### 0.1 Rules for using this checklist

- [ ] Work in phase order. Do not begin a later phase until every required gate in the current phase passes, unless a task explicitly says it may be done in parallel.
- [ ] Keep every checkbox unchecked until the task is actually complete and verified.
- [ ] Never pre-check tasks, bulk-check a phase, or mark work complete based only on intended behavior.
- [ ] A stub, hard-coded response, static mock, skipped test, TODO, commented-out implementation, or type-only interface does **not** satisfy an implementation task.
- [ ] When completing a task, add or update the tests named by that task in the same change.
- [ ] Run the narrowest relevant tests after each task, then run the full phase gate before moving to the next phase.
- [ ] If a task cannot be completed as written, leave it unchecked and add a short `BLOCKED:` note immediately below it describing the exact obstacle.
- [ ] If implementation reveals a design conflict, stop and document the conflict in `docs/decisions-needed.md`; do not silently weaken privacy, state integrity, reversibility, or test requirements.
- [ ] Do not change a product invariant merely to make a test pass.
- [ ] Do not use Python in the application implementation. TypeScript and shell scripts are permitted.
- [ ] Do not copy AI Dungeon proprietary prompts, code, names, artwork, UI assets, or content.
- [ ] Never commit provider credentials, generated secrets, `.env` files containing secrets, database dumps containing secrets, or raw private prompts.
- [ ] Do not expose generation or embedding API keys to browser code, API responses, logs, traces, diagnostic bundles, or test snapshots.
- [ ] Do not give any model shell, unrestricted network, unrestricted SQL, or arbitrary tool access.
- [ ] Treat model outputs, scenario text, story cards, imports, and player text as untrusted input.
- [ ] Preserve the core rule that the database owns canon; prose is never parsed later to reconstruct state.
- [ ] Preserve separate world-truth, observation, belief, memory, thought, and narration layers.
- [ ] Never generate or persist AI-authored inner thoughts, motivations, or autonomous decisions for the selected player entity.
- [ ] Never include one NPC's private thoughts, beliefs, secrets, or private memories in another entity's prompt.
- [ ] Use explicit visibility scopes. Missing visibility must fail closed rather than defaulting to public.
- [ ] Keep all generated mutable content versioned, attributable, and reversible.
- [ ] Do not hold a database transaction open while waiting for an AI provider.
- [ ] Keep turn stages idempotent and resumable; retries must not duplicate canonical effects.

### 0.2 Completion evidence required for every task

A task may be checked only when all applicable evidence exists:

- [ ] Production implementation is present in the intended package or app.
- [ ] TypeScript compiles with strict settings and no task-related suppression.
- [ ] Automated tests cover success, expected failure, and relevant authorization/privacy behavior.
- [ ] Tests pass without `.skip`, `.only`, blanket snapshot replacement, or weakened assertions.
- [ ] Relevant API schemas and OpenAPI output are updated.
- [ ] Relevant documentation and configuration examples are updated.
- [ ] No new lint errors, type errors, migration drift, secret findings, or dependency vulnerabilities have been knowingly introduced.
- [ ] Manual verification steps listed for the task or phase have been performed.

### 0.3 Required progress notes

Maintain `docs/progress.md` while executing this plan. For each completed task record:

- Task ID.
- Date and commit/change identifier if available.
- Files/packages changed.
- Tests run and their results.
- Any follow-up limitation that does not violate the task's acceptance criteria.

Do not put secrets, full prompts containing private game data, or raw model responses in progress notes.

---

# Phase 0 — Product contracts, architecture, and implementation boundaries

## Goal

Remove ambiguity before code is built. Establish the vocabulary, invariants, schemas, security boundaries, UX flows, and measurable limits that every later phase must follow.

## 0.1 Product and terminology documentation


## 0.2 Architecture decision records

Create ADRs with context, decision, alternatives, consequences, and status.


## 0.3 Domain and policy specifications


## 0.4 UX and operational specifications


## Phase 0 testing instructions

1. Review every document against `ai-dungeon-clone-plan.md` and `MODEL_INFO.md`.
2. Verify every source-plan feature maps to at least one later task in this checklist.
3. Run a link checker over `docs/` after the documentation toolchain exists; before then, manually verify paths and cross-references.
4. Conduct a tabletop privacy review using three entities: player, NPC A with a secret, and NPC B. Walk through direct observation, absence, lying, remote communication, summary generation, card mutation, and details viewing.
5. Conduct a crash/retry tabletop review for failure before provider call, during streaming, after event commit, and before turn completion.

## Phase 0 go/no-go gate

Do not start Phase 1 until:


---

# Phase 1 — Monorepo, tooling, local infrastructure, and CI

## Goal

Create a reproducible, strict, one-command development environment and package skeleton with no application feature claims yet.

## 1.1 Repository and workspace


## 1.2 App and package skeletons

Create real package manifests, TypeScript entry points, build configs, and package-boundary linting for:


## 1.3 Configuration and logging


## 1.4 Docker and local services


## 1.5 Testing and CI foundation


## Phase 1 testing instructions

1. From a clean checkout, run `corepack enable` and `pnpm install --frozen-lockfile`.
2. Run `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.
3. Run integration-test setup against Testcontainers and verify both pgvector and Redis are reachable.
4. Run `docker compose up --build` from an empty local state.
5. Confirm web, API, worker, PostgreSQL, and Redis become healthy.
6. Confirm services bind only to documented localhost interfaces by default.
7. Send a request with and without a request ID and verify correlation behavior.
8. Put fake secret patterns into test log fields and verify redaction.
9. Stop Compose with SIGTERM and confirm clean shutdown without corrupt or abandoned startup jobs.
10. Run CI from a branch or local CI emulator and confirm every required job is green.

## Phase 1 go/no-go gate


---

# Phase 2 — Contracts, pure domain model, policies, and state machines

## Goal

Implement framework-independent types, validation schemas, invariants, and transitions before persistence or UI behavior depends on them.

## 2.1 Shared primitives and schemas


## 2.2 Scenario authoring domain


## 2.3 Runtime domain


## 2.4 Pure policies and transition logic


## 2.5 Initial AI output contracts


## Phase 2 testing instructions

1. Unit-test every schema with valid, boundary, malformed, oversized, unknown-field, and cross-reference cases.
2. Generate a truth table for every principal and visibility scope, then assert all rows.
3. Seed player and NPC entities and prove player thought/decision/action violations are rejected.
4. Test all valid and invalid turn-stage transitions.
5. Test patch paths including prototype pollution, locked paths, wrong types, out-of-range values, stale versions, and knowledge injection.
6. Test perception with same room, ancestor location, adjacent location, blocked edge, concealment, incapable senses, absent entity, and remote communication.
7. Test memory/thought decay with deterministic clocks.
8. Test every plot and card mutation transition.
9. Test budget fitting under normal, exact-limit, overflow, and impossible-mandatory-context conditions.
10. Confirm `packages/domain` has no runtime dependency on Fastify, React, Drizzle, BullMQ, Redis, OpenAI, or Node-only infrastructure.

## Phase 2 go/no-go gate


---

# Phase 3 — Database schema, repositories, transactions, projections, and snapshots

## Goal

Persist all authored and runtime state with constraints, transactions, versioning, auditability, and reproducible projection rebuilds.

## 3.1 Migration foundation


## 3.2 Configuration and audit tables


## 3.3 Scenario authoring tables


## 3.4 Runtime tables


## 3.5 Retrieval tables and indexes


## 3.6 Repositories and transaction services


## Phase 3 testing instructions

1. Run every migration from an empty PostgreSQL database.
2. Run supported migration rollback tests or documented forward-repair tests.
3. Verify all unique/check/foreign-key constraints with direct invalid inserts.
4. Test concurrent optimistic edits and assert one succeeds while stale writers receive conflicts.
5. Race multiple turn applications against one run and prove one canonical application wins.
6. Apply the same idempotency key repeatedly and prove no duplicate event/projection effect.
7. Kill a transaction between event insert and projection update and verify atomic rollback.
8. Rebuild projections from events and compare every field/checksum.
9. Test snapshot corruption, incompatible schema, and successful restore.
10. Test SQL retrieval filters with private canary chunks before retrieval ranking exists.
11. Activate a 1536-dimensional embedding profile in a test database, create its index, query it, and reject wrong dimensions.
12. Inspect query plans for normal indexed filters and record baseline results.

## Phase 3 go/no-go gate


---

# Phase 4 — Scenario authoring API, import/export, and validation

## Goal

Expose complete, schema-validated, concurrency-safe authoring commands and queries before building the full authoring UI.

## 4.1 API framework conventions


## 4.2 System and status routes


## 4.3 Scenario lifecycle routes


## 4.4 Nested authoring routes


## 4.5 Import and export


## Phase 4 testing instructions

1. Run API contract tests for every route with valid, invalid, unauthenticated/forbidden where applicable, not-found, conflict, and oversized inputs.
2. Verify OpenAPI generation succeeds and every endpoint has request and response schemas.
3. Create a scenario through HTTP only, including all resource types and links.
4. Attempt hierarchy cycles, cross-scenario references, stale edits, invalid playable/start state, and edits to published revisions.
5. Clone a dense scenario and verify all links point to cloned resources, not originals.
6. Export, delete local draft, import, and compare semantic equality.
7. Feed malformed, oversized, cyclic, unsupported-version, and partially invalid imports; verify no partial writes.
8. Verify knowledge preview never returns private content belonging to another entity.
9. Inspect all API responses and OpenAPI examples for secret fields.

## Phase 4 go/no-go gate


---

# Phase 5 — Web application shell and complete scenario builder

## Goal

Deliver an accessible UI for every authoring API feature, with resilient autosave and explicit conflict handling.

## 5.1 Application shell


## 5.2 Dashboard


## 5.3 Scenario builder foundation


## 5.4 Builder sections


## Phase 5 testing instructions

1. Add component tests for all form controls, errors, conflict states, and destructive confirmations.
2. Run automated accessibility checks on shell, dashboard, and every builder section.
3. Keyboard-test creation/editing without a mouse, including graph alternatives.
4. Use Playwright to author a complete scenario with entities, relationships, nested locations, edges, cards/links, and plots.
5. Trigger slow/out-of-order autosave responses and prove newer content wins.
6. Trigger an optimistic conflict from two browser contexts and verify no silent overwrite.
7. Refresh during pending/failed save and verify the warning/recovery path.
8. Inject hostile Markdown and verify no script, raw HTML, unsafe URL, or event handler executes.
9. Export/import through the UI and verify validation results and semantic content.
10. Test responsive layout at documented desktop, tablet, and narrow widths.

## Phase 5 go/no-go gate


---

# Phase 6 — Generation/embedding provider gateways, model settings, prompts, and fake AI

## Goal

Integrate the configured provider safely behind stable interfaces and make every AI call structured, versioned, bounded, auditable, cancellable, and testable without live access.

## 6.1 Provider-neutral interfaces


## 6.2 `aditya-gupta` generation adapter


## 6.3 Embedding adapter and profile setup


## 6.4 Model-role configuration


## 6.5 Prompt registry and builders

For each prompt below, add a name/version, typed input, output schema, hard budget, privacy class, failure policy, fixtures, eval cases, and registry entry.


## 6.6 Fake provider and contract tests


## 6.7 Settings UI


## Phase 6 testing instructions

1. Run provider contract tests against the fake provider for discovery, streaming, cancellation, timeout, rate limit, 5xx, context overflow, malformed output, empty output, refusal, Unicode, and usage.
2. Verify structured repair is bounded and invalid output is never returned as valid.
3. Verify cancellation interrupts transport and backoff.
4. Verify dynamic discovery falls back to a persisted last-known-good catalog when refresh fails.
5. Verify generation and embedding headers are present server-side and never serialized to client/log snapshots.
6. Verify 1536-dimensional embeddings succeed and other lengths are rejected.
7. Run prompt fixture tests and confirm rendered prompts stay within configured budgets.
8. Seed canary secrets into unrelated contexts and verify each prompt builder excludes them.
9. Run the opt-in live tests only when credentials are intentionally supplied; confirm they are budget-capped.
10. Inspect browser network traffic and confirm no API key or secret setting is sent.

## Phase 6 go/no-go gate


---

# Phase 7 — Run creation and resumable core turn engine

## Goal

Deliver end-to-end multi-turn play with canonical events, deterministic observations, private NPC cognition, streamed narration, persistence, cancellation, retry, and crash safety.

## 7.1 Run creation


## 7.2 Queue topology and workflow mechanics


## 7.3 Turn stages


## 7.4 SSE and gameplay APIs


## 7.5 Gameplay UI


## Phase 7 testing instructions

1. Run deterministic end-to-end turn tests entirely with the fake provider.
2. Cover NPC speech, action, no-action, think-only, and speak-and-act.
3. Prove no decision or thought can be created for the player entity even when fake/model output attempts it.
4. Prove an absent NPC receives no observation and no knowledge of the event.
5. Simulate a lie and prove observers learn that speech occurred, not that its proposition is canonical truth.
6. Crash/restart the worker at every stage boundary, especially after event commit and during narration; prove no duplicate events/effects.
7. Submit the same idempotency key concurrently and prove one turn is created.
8. Submit two different turns at the same expected version and prove only one canonical mutation proceeds.
9. Cancel before model call, during NPC call, before event commit, after event commit, and during narration; verify documented outcomes.
10. Disconnect/reconnect SSE with `Last-Event-ID` and prove ordered replay without duplicate transcript text.
11. Seed unique NPC canary secrets and verify narrator/player output excludes them.
12. Inspect details response and prove it excludes raw prompts, provider reasoning, unrelated secrets, and credentials.
13. Play at least 20 turns, refresh repeatedly, and resume without state loss.

## Phase 7 go/no-go gate

- [ ] A player can start, stream, save, refresh, resume, cancel, and retry a multi-turn run.
- [ ] Canonical events/projections are transactional and narration is separate.
- [ ] NPCs may speak, act, remain silent, or think.
- [ ] Player thoughts/autonomous intent are blocked in domain, persistence, engine, and tests.
- [ ] Worker restart does not duplicate committed events or patches.
- [ ] SSE reconnect is correct and details are fetched only explicitly.
- [ ] Core privacy canary tests pass.

---

# Phase 8 — Principal-aware retrieval, embeddings, beliefs, memory, and long-context control

## Goal

Implement bounded, auditable, access-scoped context assembly with lexical fallback, vector upgrade, memory curation, thought lifecycle, and leakage prevention.

## 8.1 Retrieval projection and chunking

- [ ] **P8-001 — Implement source projectors.** Project scenario rules, profiles, locations/state, cards/versions, plots, events, observations, beliefs, memories, thoughts, relationships, and summaries.
- [ ] **P8-002 — Separate chunks by visibility.** Never combine text from different scopes or owners; reject missing scope.
- [ ] **P8-003 — Implement semantic chunkers.** Preserve story-card headings, one event per canonical chunk, observer-specific chunks, individual memories, and source links.
- [ ] **P8-004 — Normalize and hash content.** Normalize whitespace predictably, preserve meaningful Unicode, compute stable hash, and avoid needless re-embedding.
- [ ] **P8-005 — Implement activation/versioning.** Deactivate superseded chunks while retaining historical provenance.
- [ ] **P8-006 — Process outbox indexing jobs idempotently.** Repeated projection jobs must converge without duplicate active chunks.

## 8.2 Authorized retrieval pipeline

- [ ] **P8-010 — Implement typed retrieval requests.** Require principal, run/branch, stage, scene, participants, query, limits, and budget.
- [ ] **P8-011 — Apply SQL authorization before scoring.** No unauthorized candidate may enter lexical/vector/graph ranking.
- [ ] **P8-012 — Fetch mandatory context directly.** Current state, scene, active constraints, recent events, and role-specific essentials bypass search but still obey authorization.
- [ ] **P8-013 — Implement PostgreSQL full-text retrieval.** Use tsvector, safe tsquery construction, aliases, and language/config behavior.
- [ ] **P8-014 — Implement trigram/name retrieval.** Support misspellings and renamed aliases with thresholds and caps.
- [ ] **P8-015 — Implement graph expansion.** Traverse explicit entity/location/card/plot links with depth, cycle, weight, and authorization limits.
- [ ] **P8-016 — Implement recency/salience/location/participant/goal scoring.** Return per-component scores for audit.
- [ ] **P8-017 — Implement candidate fusion.** Merge by chunk ID and combine lexical, vector, graph, and deterministic signals.
- [ ] **P8-018 — Implement diversity controls.** Cap per source/type/owner and avoid redundant near-duplicates.
- [ ] **P8-019 — Implement optional reranking.** Use a configured low-cost model only on authorized top candidates, with timeout/fallback.
- [ ] **P8-020 — Implement role-specific budget fitting.** Preserve mandatory sections and output headroom; remove low-ranked optional context first.
- [ ] **P8-021 — Record retrieval audits.** Store selected/rejected IDs, scores, limits, authorization principal, budget decisions, profile, and timing.

## 8.3 Embedding profile lifecycle

- [ ] **P8-030 — Implement profile create/test/activate.** Validate provider, model, 1536 dimensions for the verified model, distance, and test vector before activation.
- [ ] **P8-031 — Implement document/query vector search.** Use profile predicate and the matching cast/index expression.
- [ ] **P8-032 — Implement changed-only embedding jobs.** Compare content hash/profile and batch safely.
- [ ] **P8-033 — Implement full reindex CLI.** Add `pnpm embeddings:reindex` with progress, resume, cancellation, and dry-run/status options.
- [ ] **P8-034 — Implement reindex API/UI job.** Show totals, completed, failed, ETA, active/new profile, and safe retry.
- [ ] **P8-035 — Implement zero-downtime profile switch.** Continue old vectors while new profile builds, verify completeness, atomically activate, then retire old profile later.
- [ ] **P8-036 — Preserve lexical-only mode.** All retrieval paths work with no embedding provider and surface a warning rather than block gameplay.

## 8.4 Belief and memory curation

- [ ] **P8-040 — Implement per-entity memory curator jobs.** Supply only that entity's authorized observations, beliefs, memories, and thoughts.
- [ ] **P8-041 — Validate memory proposals.** Require owner-scoped evidence IDs, valid types, bounded fields, and no unsupported facts.
- [ ] **P8-042 — Implement belief updates from evidence.** Preserve uncertainty and contradictions; speech does not become fact automatically.
- [ ] **P8-043 — Implement memory reinforcement/decay.** Update lifecycle fields deterministically and retain raw immutable observations.
- [ ] **P8-044 — Implement duplicate memory merging.** Create consolidated versions with links to all sources and no visibility widening.
- [ ] **P8-045 — Implement thought decay/consolidation.** Expire ephemeral thoughts, manage lingering/core thresholds, merge duplicates, and cap active counts.
- [ ] **P8-046 — Index beliefs/memories/thoughts privately.** Scope every chunk to owner and ensure only authorized system/player-detail principals can retrieve it.
- [ ] **P8-047 — Implement maintenance scheduling.** Queue curation after turns without blocking visible completion and expose background status.

## 8.5 Context assembly integration

- [ ] **P8-050 — Replace basic NPC context with retrieval pipeline.** Preserve independent authorization per NPC.
- [ ] **P8-051 — Replace narrator context with retrieval pipeline.** Permit only public/player-observed/player-known content.
- [ ] **P8-052 — Integrate resolver/architect privileged retrieval.** Clearly label truth versus beliefs and preserve scope metadata.
- [ ] **P8-053 — Integrate memory and mutation retrieval.** Use owner/card-specific requests and scope checks.
- [ ] **P8-054 — Implement overflow degradation.** Drop optional retrieval, substitute stored summaries, and retry once without truncating rules/schema.
- [ ] **P8-055 — Add retrieval trace inspector.** Local debug only; show IDs, metadata, scores, and budget decisions with private-text display behind an extra warning/authorization control.

## 8.6 Player-known journal

- [ ] **P8-060 — Implement player-view knowledge APIs.** Return only player observations, known entities/locations/events/cards, and player-authored notes.
- [ ] **P8-061 — Build journal UI.** Add known entities, locations, observed events, goals, encountered cards, and notes.
- [ ] **P8-062 — Build retrieval/embedding status UI.** Show lexical/vector status and reindex progress without blocking play.

## Phase 8 testing instructions

1. Create an expected allowed/denied resource set for every principal and assert SQL results exactly.
2. Seed unique canary secrets into NPC thoughts, private profiles, beliefs, memories, architect notes, and admin chunks.
3. Verify unauthorized canaries never appear in retrieval candidates, prompt renderings, summaries, mutations, narration, or another entity's curation.
4. Test multi-hop leakage: private thought to memory, memory to summary, summary to retrieval, and private source to story-card mutation.
5. Evaluate lexical retrieval recall for aliases, misspellings, linked cards with weak keyword overlap, old salient facts, and recent facts.
6. Enable embeddings, reindex, and rerun the same fixture suite; verify privacy sets are unchanged and required recall does not regress beyond documented tolerance.
7. Reindex while turns are running and verify old profile remains usable until atomic switch.
8. Interrupt and resume reindex; verify changed-only behavior and no duplicate embeddings.
9. Feed wrong vector dimensions and ensure profile activation/indexing fails safely.
10. Test budget fitting with large scenarios and ensure schemas/critical rules remain intact.
11. Test absent NPC, false belief from lie, contradictory evidence, memory decay, duplicate consolidation, and thought expiry across turns.
12. Inspect `retrieval_audit` and verify it stores IDs/metadata rather than full secret text by default.

## Phase 8 go/no-go gate

- [ ] Retrieval always authorizes before scoring.
- [ ] Relevant old facts are retrieved without dumping full history.
- [ ] Lexical-only gameplay works with embeddings disabled.
- [ ] Verified embeddings can be activated, indexed, queried, reindexed, and atomically switched.
- [ ] Absent entities do not learn unseen events.
- [ ] Memory, belief, and thought lifecycles are bounded, evidenced, and private.
- [ ] All direct and multi-hop canary leakage tests pass.

---

# Phase 9 — Story architect, plot progression, sudden events, and dynamic story cards

## Goal

Add long-term pacing and controlled mutable lore without allowing the architect to directly create canon, railroad the player, or widen private information.

## 9.1 Architect state and planning

- [x] **P9-001 — Implement persisted architect state.** Track act/phase, dramatic question, tension/current target, active points, future beats, cooldowns, budget, used twists, deferred consequences, open hooks, and pacing history.
- [x] **P9-002 — Initialize architect state from scenario.** Derive authored plot points and pacing settings when a run starts.
- [x] **P9-003 — Integrate deterministic stagnation features.** Persist feature values per turn for audit and tuning.
- [x] **P9-004 — Implement intervention budget/cooldowns.** Prevent repeated crises and support quiet scenes.
- [x] **P9-005 — Implement architect context assembly.** Permit privileged truth/private state while labeling every layer and excluding provider reasoning.
- [x] **P9-006 — Implement architect planning stage.** Persist guidance/proposals only; do not directly mutate canon.
- [x] **P9-007 — Validate anti-railroading constraints.** Reject guidance that dictates player thoughts/choices or only one forced response.
- [x] **P9-008 — Safely translate guidance for NPCs.** Express dramatic pressure without revealing secrets the NPC does not know.

## 9.2 Plot points and transitions

- [x] **P9-010 — Implement deterministic precondition/resolution evaluator.** Use canonical facts and explicit supporting event IDs.
- [x] **P9-011 — Implement ambiguous transition fallback.** Ask the architect only when deterministic rules cannot decide; validate returned evidence.
- [x] **P9-012 — Implement status transition persistence.** Enforce valid graph and audit source/event support.
- [ ] **P9-013 — Implement AI plot-point proposals.** Persist as identifiable, editable proposals before they influence planning.
- [ ] **P9-014 — Implement proposal approval/edit/reject flows.** Respect scenario/run policy for automatic versus manual activation.
- [ ] **P9-015 — Handle ignored/failed plots.** Allow transformation, dormancy, failure, or abandonment without forcing player behavior.

## 9.3 Sudden events

- [x] **P9-020 — Implement sudden-event proposal validation.** Require rationale, participants/location, canonical plausibility, severity, affordances, dependencies, and cooldown impact.
- [x] **P9-021 — Route sudden events through resolver.** The resolver decides whether/how proposal becomes canon under normal patch/event validation.
- [x] **P9-022 — Enforce player affordances.** Major interventions must preserve multiple plausible responses unless scenario rules make that impossible.
- [x] **P9-023 — Add repetition/plausibility checks.** Compare recent twists and scenario rules before accepting proposals.

## 9.4 Dynamic story-card mutations

- [ ] **P9-030 — Implement mutation trigger detection.** Material entity/location changes, plot transitions, stale rumor/belief, elapsed turns, stale context, and explicit refresh.
- [x] **P9-031 — Implement mutation queue/worker.** Idempotent, version-aware, separately rate-limited, and non-blocking.
- [x] **P9-032 — Build card-specific authorized mutation context.** Include only relevant sources and prevent unrelated private content.
- [x] **P9-033 — Validate mutation proposals.** Enforce expected version, mode, lock, paths, append-only restrictions, source facts, contradictions, and scope impact.
- [ ] **P9-034 — Implement consistency critic.** Check proposal against canon and locked content; critic can reject/suggest but not apply.
- [ ] **P9-035 — Implement `ai_suggest`.** Persist proposal for player approval with diff, sources, warnings, and confidence.
- [ ] **P9-036 — Implement `ai_mutable`.** Apply valid allowlisted patches automatically with attribution and complete history.
- [x] **P9-037 — Implement static/manual-only/append-only behavior.** Add explicit tests proving forbidden mutations cannot apply.
- [x] **P9-038 — Reindex after card commit.** Deactivate old version chunks and activate new chunks only after transaction success.
- [x] **P9-039 — Implement rollback.** Create a new version copying selected historical content; preserve every intervening version.

## 9.5 Architect and card UI

- [ ] **P9-050 — Build plot progress UI.** Show authored versus AI source, status, evidence, involved resources, and edit controls.
- [ ] **P9-051 — Build proposal review UI.** Approve/edit/reject AI-created points and `ai_suggest` card mutations.
- [ ] **P9-052 — Build architect debug inspector.** Local/admin only; show pacing state, features, budgets, cooldowns, and guidance.
- [ ] **P9-053 — Expand card history UI.** Show source, trigger, semantic summary, JSON diff, contradictions, scope impact, and rollback.
- [ ] **P9-054 — Add pacing controls.** Expose safe scenario/run settings for intervention frequency, tension targets, and stagnation thresholds.

## Phase 9 testing instructions

1. Use deterministic fixtures for plot activation, foreshadowing, resolution, failure, dormancy, abandonment, and ambiguous evaluation.
2. Verify plot resolution requires canonical evidence, not matching narration words.
3. Simulate stagnation and verify intervention occurs only after configured thresholds/budget/cooldown.
4. Simulate calm scenes and verify architect may choose no intervention.
5. Inject architect guidance that dictates player thoughts and verify rejection.
6. Inject secret architect knowledge into NPC guidance and verify it is translated or omitted rather than leaked.
7. Test sudden events for plausibility, multiple affordances, repetition, cooldown, and resolver rejection.
8. Test every card mutation mode, stale version, locked field, invalid path, contradiction, rollback, and reindex.
9. Seed private canaries into unrelated sources and prove mutation context/output cannot widen them into public cards.
10. Run anti-railroading narrative evals and record model/prompt versions.

## Phase 9 go/no-go gate

- [ ] Architect guidance cannot directly mutate canonical state.
- [ ] Plot transitions are evidenced, valid, and auditable.
- [ ] Stagnation can produce plausible optional pressure without constant melodrama.
- [ ] AI-created plot points remain identifiable/editable.
- [ ] Every story-card policy is enforced in code and tests.
- [ ] Mutations have immutable history, diff, rollback, attribution, and reindexing.
- [ ] Architect and card privacy leakage tests pass.

---

# Phase 10 — Branching, regeneration, summaries, compaction, and save bundles

## Goal

Support reversible experimentation and long-running games without destructive history edits or unbounded context growth.

## 10.1 Branching and rewind

- [ ] **P10-001 — Implement branch creation service.** Fork from an existing turn/snapshot with parent, reason, label, and independent future numbering.
- [ ] **P10-002 — Implement branch activation.** Serialize with run mutations, verify branch consistency, and update active pointer safely.
- [ ] **P10-003 — Implement branch rename/archive.** Preserve branch history and references.
- [ ] **P10-004 — Implement rewind.** Restore projections from nearest valid snapshot plus replay to fork point, then create a branch.
- [ ] **P10-005 — Implement branch comparison.** Return divergence point, turn/event/state differences, and narration differences without leaking private data in normal player view.

## 10.2 Regeneration/edit semantics

- [ ] **P10-010 — Implement narration-only regeneration.** Keep canonical events unchanged and create a new narrative rendering version.
- [ ] **P10-011 — Implement full-turn regeneration.** Fork before the turn and rerun downstream stages with a fresh idempotency lineage.
- [ ] **P10-012 — Implement edit-player-input.** Fork before the original turn and preserve both raw inputs/history.
- [ ] **P10-013 — Implement retry-stage versus regenerate distinction.** UI/API must clearly distinguish same-snapshot failure recovery from alternate-history generation.
- [ ] **P10-014 — Protect old branches.** No regenerate, rewind, or edit action may silently delete prior events, narration, thoughts, or audit records.

## 10.3 Summaries and compaction

- [ ] **P10-020 — Implement scene-boundary detection/configuration.** Use location/time/plot shifts and configurable turn count.
- [ ] **P10-021 — Implement scene summaries.** Link source turns/events and apply visibility no broader than all incorporated sources.
- [ ] **P10-022 — Implement chapter/arc summaries.** Preserve unresolved hooks, important character changes, and source IDs.
- [ ] **P10-023 — Implement per-entity long-term summaries.** Keep owner scope and phrase uncertain beliefs as beliefs.
- [ ] **P10-024 — Implement story-card append-history compaction.** Preserve immutable source versions and provide a bounded active summary.
- [ ] **P10-025 — Integrate summaries into budget fallback.** Replace older raw context only when valid summaries exist.
- [ ] **P10-026 — Validate summary privacy.** Compute resulting scope conservatively and reject any widening.

## 10.4 Timeline and branch UI

- [ ] **P10-030 — Build timeline UI.** Show turn summaries, player-visible output, generation status, and actions.
- [ ] **P10-031 — Build branch tree/list.** Show active branch, parents, fork turns, reasons, labels, and archived state.
- [ ] **P10-032 — Build fork/rewind/regenerate controls.** Add confirmations explaining preserved old history and likely model cost.
- [ ] **P10-033 — Build branch comparison UI.** Show player-safe event/narrative differences and developer-only canonical/private details separately.
- [ ] **P10-034 — Build narration version selector.** Preserve and select alternate renderings without changing events.

## 10.5 Save bundles

- [ ] **P10-040 — Define save-bundle manifest/schema.** Include scenario revision, run, branches, events, projections or rebuild data, memories, cards, prompts/model metadata, checksums, and app/schema versions.
- [ ] **P10-041 — Exclude secrets and transient credentials.** Do not export API keys, cookies, auth secrets, Redis state, or provider authorization headers.
- [ ] **P10-042 — Implement bundle export.** Produce deterministic archive structure with checksums and bounded memory usage.
- [ ] **P10-043 — Implement bundle validation/import.** Verify paths, checksums, versions, sizes, references, and collisions before transactional import.
- [ ] **P10-044 — Implement clean-install restore.** Remap installation-local IDs only where safe and preserve internal branch/event identity.
- [ ] **P10-045 — Add export/import UI and progress.** Include warnings, downloadable manifest, validation errors, and cancellation.

## Phase 10 testing instructions

1. Fork, play divergent turns, switch branches, and verify each branch's events/projections/narration remain independent.
2. Rewind from multiple snapshot distances and compare replayed state checksums.
3. Regenerate narration and prove event IDs/state checksums do not change.
4. Regenerate a full turn and prove a new branch is created while old history remains intact.
5. Edit an earlier player input and verify both inputs remain auditable.
6. Generate summaries containing mixed source scopes and verify scope becomes no broader than the most restrictive source.
7. Seed uncertain/false beliefs and verify summaries do not state them as world truth.
8. Run hundreds/thousands of synthetic turns and verify context uses summaries rather than unbounded raw history.
9. Export a dense multi-branch save bundle, restore into a clean database, rebuild projections, and compare semantic checksums.
10. Test malicious archive paths, checksum mismatch, unsupported versions, oversized files, duplicate IDs, and interrupted imports.

## Phase 10 go/no-go gate

- [ ] Rewind/regenerate/edit never silently destroys history.
- [ ] Narration-only regeneration cannot alter canon.
- [ ] Branch activation and replay produce correct checksums.
- [ ] Summaries are source-linked, bounded, and privacy-safe.
- [ ] A complete save bundle restores into a clean installation without secrets or semantic loss.
- [ ] Long-run context growth is bounded by tested compaction/summarization behavior.

---

# Phase 11 — PWA, inspectors, settings completion, and operational UX

## Goal

Complete the user-facing product surface and clearly separate normal player knowledge from privileged development/admin inspection.

## 11.1 PWA and resilient shell

- [ ] **P11-001 — Add PWA manifest/icons/theme metadata.** Use original project assets only.
- [ ] **P11-002 — Implement service worker.** Cache only the application shell/static assets; do not cache secret settings or private API responses indiscriminately.
- [ ] **P11-003 — Implement install/update UX.** Show non-disruptive install and new-version prompts.
- [ ] **P11-004 — Implement offline behavior.** Permit shell/draft visibility where safe, clearly disable server-dependent play, and reconcile after reconnect.
- [ ] **P11-005 — Preserve composer drafts safely.** Keep local non-secret drafts per run and clear/migrate them intentionally.

## 11.2 Player and developer views

- [ ] **P11-010 — Complete player journal/map UI.** Show only player-known entities, locations, paths, events, cards, goals, and notes.
- [ ] **P11-011 — Implement world-state diff inspector.** Admin/debug only, with turn/branch comparison and private-field warnings.
- [ ] **P11-012 — Implement entity memory inspector.** Admin/debug only; filter by owner/type/status/source.
- [ ] **P11-013 — Implement belief inspector.** Show confidence, evidence, contradictions, and truth separately without exposing it in player mode.
- [ ] **P11-014 — Implement active-thought inspector.** Clearly label fictional thoughts and lifecycle; never show provider reasoning.
- [ ] **P11-015 — Implement turn-stage/AI invocation inspector.** Show metadata, prompt version, source IDs, usage, retries, schema results, and redacted errors.
- [ ] **P11-016 — Implement retrieval trace inspector.** Show authorized principal, chunk IDs/scopes/scores/budgets and optionally text under explicit debug safeguards.
- [ ] **P11-017 — Gate debug routes.** Disabled by default outside development and require local admin authorization/re-authentication when remote exposure is enabled.

## 11.3 Settings completion

- [ ] **P11-020 — Build context/output budget controls.** Validate against model and server limits.
- [ ] **P11-021 — Build timeout/retry/concurrency controls.** Explain operational/cost implications.
- [ ] **P11-022 — Build data/backup settings.** Show configured paths/status without permitting unsafe arbitrary filesystem browsing.
- [ ] **P11-023 — Build debug/telemetry controls.** Raw prompt retention remains off by default with explicit privacy warning and bounded retention.
- [ ] **P11-024 — Build export-all-data workflow.** Exclude secrets and show progress/manifest.
- [ ] **P11-025 — Add diagnostic bundle UI.** Include redacted logs, versions, health, migration state, queue summaries, and invocation metadata, not private prompt bodies by default.

## Phase 11 testing instructions

1. Install the PWA in a supported browser and verify manifest, icons, launch route, and update prompt.
2. Go offline and verify static shell behavior, clear play disablement, draft preservation, and reconnection.
3. Inspect browser caches and prove provider credentials/API responses are not improperly cached.
4. Compare normal player routes with admin inspectors and prove canonical/private data is inaccessible from player endpoints.
5. Disable debug routes and verify they return not found/forbidden even if URLs are known.
6. Enable remote mode and verify debug access requires the documented extra control.
7. Generate a diagnostic bundle and scan it for fake canary secrets, authorization headers, cookies, and API keys.
8. Run accessibility tests across gameplay, journal, timeline, settings, and inspector screens.

## Phase 11 go/no-go gate

- [ ] PWA install/update/offline-shell behavior works without unsafe private-data caching.
- [ ] Player views contain only player-known information.
- [ ] Privileged inspectors are clearly marked, separately authorized, and disabled by default in non-development deployments.
- [ ] Settings cover models, budgets, retries, embeddings, reindexing, backups, telemetry, and exports.
- [ ] Diagnostic/export flows redact secrets by default.

# Phase 12 — Security, authentication, observability, backups, and recovery

## Goal

Harden the application for self-hosted operation, remote exposure when explicitly configured, incident diagnosis, and reliable restoration.

## 12.1 Authentication and web security

- [ ] **P12-001 — Implement optional local authentication.** Support disabled localhost mode and explicit remote mode with securely hashed credentials or the ADR-selected mechanism.
- [ ] **P12-002 — Implement secure sessions.** Signed/opaque, HTTP-only, SameSite cookies; Secure when TLS; rotation/expiry/logout.
- [ ] **P12-003 — Implement CSRF protection.** Protect cookie-authenticated state-changing routes and test cross-origin attempts.
- [ ] **P12-004 — Restrict CORS.** Allow only configured origin(s), reject wildcard credentials, and handle SSE correctly.
- [ ] **P12-005 — Implement rate limits.** Cover login, turn creation, model test/refresh, imports, reindex, debug, and other sensitive routes.
- [ ] **P12-006 — Harden input and Markdown.** Reconfirm body limits, schema stripping/rejection, sanitization, URL schemes, and Unicode edge cases.
- [ ] **P12-007 — Implement SSRF controls.** Validate configurable provider URLs, resolve/check IPs, block loopback/link-local/private/cloud metadata by default, and handle DNS rebinding reasonably.
- [ ] **P12-008 — Add security headers.** CSP, frame restrictions, content-type options, referrer policy, and permissions policy compatible with PWA/SSE.
- [ ] **P12-009 — Protect secrets at rest/configuration.** Use environment/secret files with restrictive permissions; never expose secret values through settings APIs.
- [ ] **P12-010 — Enforce prompt-injection boundaries.** Delimit data, allow scenario-rule authority only for explicit types, and validate all proposed operations as untrusted.

## 12.2 Queue and failure recovery

- [ ] **P12-020 — Separate queues.** Turn, embedding, summary, card mutation, backup, and maintenance queues with role-specific concurrency.
- [ ] **P12-021 — Implement dead-letter handling.** Persist final failure class, safe diagnostics, source job, and retry lineage.
- [ ] **P12-022 — Build recovery UI.** List dead/stalled jobs and permit safe retry/cancel where idempotency rules allow.
- [ ] **P12-023 — Implement provider outage behavior.** Preserve turns as retryable/blocked, avoid partial patches, and show actionable status.
- [ ] **P12-024 — Implement context-overflow recovery.** Reduce optional context once and retain critical constraints.
- [ ] **P12-025 — Implement invalid-output recovery.** One bounded repair then safe failure; never apply partial validation.
- [ ] **P12-026 — Implement startup integrity checks.** Check migrations, active embedding index/profile, abandoned turns, queue connectivity, and snapshot compatibility.

## 12.3 Observability

- [ ] **P12-030 — Add OpenTelemetry bootstrap.** Instrument API, queue wait/execution, retrieval, AI invocations, database operations, and SSE duration.
- [ ] **P12-031 — Add metrics.** Turn latency by stage, provider outcomes/retries/tokens, queue depth, retrieval latency/counts, embedding backlog, invalid output, overflow, mutation outcomes, and memory growth.
- [ ] **P12-032 — Add opt-in Prometheus endpoint.** Protect it when remotely exposed.
- [ ] **P12-033 — Add dashboards/runbook queries.** Provide sample panels or documented queries for health, latency, cost, failures, and backlog.
- [ ] **P12-034 — Implement privacy-safe log retention.** Rotation, size/time bounds, debug retention bounds, and deletion procedure.
- [ ] **P12-035 — Correlate full turn flow.** One trace/correlation chain must connect API acceptance, queue stages, provider calls, retrieval, commits, and SSE.

## 12.4 Backups and restore

- [ ] **P12-040 — Implement PostgreSQL logical backup script.** Add timestamped output, compression, checksum, error handling, retention hooks, and no embedded credentials.
- [ ] **P12-041 — Implement queue-drain/pause procedure.** Document consistent backup behavior and Redis disposability boundaries.
- [ ] **P12-042 — Implement restore script/runbook.** Restore database, run compatibility checks/migrations, rebuild indexes if needed, and verify checksums.
- [ ] **P12-043 — Add environment/secret backup guidance.** Keep secrets separate from data archives and document required file permissions.
- [ ] **P12-044 — Add optional scheduled-backup Compose profile.** Disabled by default, health monitored, and retention configurable.
- [ ] **P12-045 — Implement backup status reporting.** Show last success/failure/checksum/path identifier without exposing credentials.
- [ ] **P12-046 — Automate restore verification.** Regularly restore a backup into a clean temporary stack and run integrity/smoke tests.

## 12.5 Supply-chain and release security

- [ ] **P12-050 — Pin base images and important dependencies.** Document update process and avoid floating production tags.
- [ ] **P12-051 — Add container vulnerability scanning.** Fail on policy-defined critical findings unless an explicit time-bounded exception exists.
- [ ] **P12-052 — Generate SBOM.** Produce release artifacts for application and containers.
- [ ] **P12-053 — Strengthen secret scanning.** Scan history/change sets and generated artifacts.
- [ ] **P12-054 — Document vulnerability handling.** Provide local/self-hosted reporting and upgrade guidance.

## Phase 12 testing instructions

1. Test localhost mode and explicit remote-auth mode separately.
2. Attempt session theft patterns, expired/rotated sessions, CSRF, hostile origins, and brute-force login/turn creation.
3. Test SSRF with loopback, IPv6 loopback, private ranges, link-local, metadata names/IPs, redirects, encoded IPs, and DNS changes.
4. Run XSS payload suite through scenario fields, Markdown, narration, imports, errors, and debug views.
5. Put fake keys/tokens/cookies in representative headers/config/errors and scan logs, traces, metrics, bundles, and browser payloads.
6. Kill workers/providers/Redis/PostgreSQL at each turn stage and validate safe recovery states.
7. Move failed jobs to dead letter and retry them through UI; prove no duplicate canonical effects.
8. Verify trace correlation across a complete turn and confirm private text is absent by default.
9. Perform backup during idle and documented active/drained states.
10. Restore into a clean stack, run migrations/integrity checks, resume an existing run, and submit a new turn.
11. Run dependency, secret, image, and SBOM CI jobs.

## Phase 12 go/no-go gate

- [ ] Remote exposure requires explicit configuration and working authentication/session protections.
- [ ] CSRF, CORS, rate limits, sanitization, SSRF controls, and security headers pass tests.
- [ ] Logs/traces/metrics/diagnostic artifacts contain no secrets or private prompt bodies by default.
- [ ] Dead-letter and startup recovery paths are usable and idempotent.
- [ ] Backup restoration succeeds in a clean environment and gameplay resumes.
- [ ] Security scans and SBOM generation pass release policy.

---

# Phase 13 — Comprehensive quality, performance, accessibility, documentation, and v1 release

## Goal

Prove the whole product satisfies functional, privacy, reliability, usability, performance, and operational requirements before declaring v1 complete.

## 13.1 Complete automated test suites

- [ ] **P13-001 — Complete domain unit coverage.** State transitions, knowledge policy, perception, patches, budgets, retrieval scoring, memory, thoughts, plots, mutations, and provider classification.
- [ ] **P13-002 — Complete database integration coverage.** Migrations, constraints, locks, concurrency, full-text/vector filters, branches, snapshots, rebuilds, and profile indexes.
- [ ] **P13-003 — Complete provider contract coverage.** Discovery, streaming, cancellation, timeout, retries, overflow, structured output, malformed/empty/refusal, usage, Unicode, and long input.
- [ ] **P13-004 — Complete turn-engine scenario suite.** All scenarios listed in the source plan, including post-commit crash resume.
- [ ] **P13-005 — Complete epistemic privacy suite.** Direct and multi-hop canary cases for all principals and generated artifacts.
- [ ] **P13-006 — Complete retrieval evaluation suite.** Required fact recall, private exclusion, recency, graph links, aliases, embedding activation, and reindex stability.
- [ ] **P13-007 — Complete Playwright suite.** First-run, full scenario, run/stream/details, refresh, regenerate, branch, export/import, embeddings, and provider failure recovery.
- [ ] **P13-008 — Remove accidental test gaps.** No `.skip`, `.only`, quarantined core tests, or live-provider requirement in default CI.

## 13.2 Narrative quality evaluation

- [ ] **P13-010 — Build curated evaluation scenarios.** Include conversation, stealth, misinformation, travel, conflict, quiet scenes, long absence, secret knowledge, and plot stagnation.
- [ ] **P13-011 — Score continuity and character consistency.** Record prompt/model versions and human notes.
- [ ] **P13-012 — Score player agency.** Reject invented player thoughts, motivation replacement, or forced actions.
- [ ] **P13-013 — Score NPC reaction restraint.** Verify silence/no-action/think-only are used appropriately.
- [ ] **P13-014 — Score pacing and anti-railroading.** Verify plot progress, quiet intervals, varied interventions, and multiple affordances.
- [ ] **P13-015 — Score style compliance.** Person, tense, tone, boundaries, non-repetition, and no hidden-knowledge leakage.
- [ ] **P13-016 — Require human review.** Model-as-judge may assist but cannot be the sole release gate.

## 13.3 Performance, load, and soak

- [ ] **P13-020 — Benchmark scenario CRUD.** Demonstrate local p95 under 300 ms excluding large imports on documented reference hardware.
- [ ] **P13-021 — Benchmark turn acceptance/progress.** Acceptance under 500 ms and first progress event under 1 second under normal local load.
- [ ] **P13-022 — Measure model-dependent turn latency.** Track first narration token target under 15 seconds and typical turn under 45 seconds, clearly separating provider latency.
- [ ] **P13-023 — Benchmark retrieval.** Target under 500 ms for normal collections before optional reranking.
- [ ] **P13-024 — Enforce fan-out caps.** Prove maximum NPC calls/model calls/retrieval chunks/prompts/thoughts/input limits under adversarial scenarios.
- [ ] **P13-025 — Run 10,000-turn soak.** Use deterministic fake provider and verify bounded storage growth policies, resumability, retrieval, and no projection drift.
- [ ] **P13-026 — Run 100,000-chunk retrieval test.** Measure lexical/vector performance and authorization correctness.
- [ ] **P13-027 — Test reindex during play.** Verify no unacceptable turn interruption or profile inconsistency.
- [ ] **P13-028 — Test repeated SSE reconnects.** Verify bounded replay storage and correct transcript.
- [ ] **P13-029 — Crash-inject every stage.** Automate worker restart at all durable stage boundaries.
- [ ] **P13-030 — Test provider latency spikes and outages.** Verify queues, cancellation, retries, and user feedback remain bounded.

## 13.4 Accessibility and browser support

- [ ] **P13-040 — Complete WCAG-focused audit.** Keyboard, focus order, names/roles, contrast, live updates, reduced motion, forms/errors, dialogs, graphs/fallbacks, and zoom/reflow.
- [ ] **P13-041 — Test screen-reader-critical flows.** Scenario validation, turn streaming/status, errors, details drawer, branch confirmations, and settings.
- [ ] **P13-042 — Test supported browsers.** Document versions for Chromium, Firefox, and WebKit/Safari-compatible behavior.
- [ ] **P13-043 — Fix all critical/serious automated accessibility findings.** Document any accepted minor limitation.

## 13.5 Documentation

- [ ] **P13-050 — Write architecture overview.** Include package map, turn sequence, event/projection model, and data flows.
- [ ] **P13-051 — Write epistemic privacy guide.** Explain truth, observation, belief, memory, thoughts, principals, scopes, and human details view.
- [ ] **P13-052 — Write one-command installation guide.** Include prerequisites, `.env`, Compose, health verification, and localhost defaults.
- [ ] **P13-053 — Write reverse-proxy/TLS guide.** Include authentication and remote-exposure warnings.
- [ ] **P13-054 — Write provider configuration guide.** Cover generation model `Codex Proxy/gpt-5.6-luna`, dynamic discovery, required headers, secret handling, and model testing.
- [ ] **P13-055 — Write embedding/reindex guide.** Cover `azure/text-embedding-ada-002`, 1536 dimensions, cosine, activation, CLI/UI reindex, profile switch, and lexical fallback.
- [ ] **P13-056 — Write scenario authoring guide.** Cover entities, locations, relationships, cards, plots, validation, revisions, import/export, and knowledge preview.
- [ ] **P13-057 — Write gameplay/branching guide.** Cover streaming, cancellation, retry, narration regeneration, turn regeneration, rewind, branches, and details.
- [ ] **P13-058 — Write architect/card-mutation guide.** Cover pacing, proposals, policies, locks, history, approval, and rollback.
- [ ] **P13-059 — Write backup/restore and upgrade runbooks.** Include tested commands, schema compatibility, queue handling, and verification.
- [ ] **P13-060 — Write troubleshooting guide.** Provider, model discovery, queue, database, SSE, retrieval, embeddings, imports, auth, and restoration.
- [ ] **P13-061 — Write security/privacy guide.** Remote exposure, secrets, logs, debug inspectors, diagnostic bundles, and prompt injection.
- [ ] **P13-062 — Write developer extension guides.** Add generation/embedding provider, prompt/eval contribution, migration rules, and package boundaries.

## 13.6 Release packaging

- [ ] **P13-070 — Pin release versions and images.** Record application, schema, prompts, dependencies, and image digests.
- [ ] **P13-071 — Generate release SBOM and checksums.** Publish alongside images/artifacts.
- [ ] **P13-072 — Write release notes.** Include features, limits, known issues, migrations, and backup requirement.
- [ ] **P13-073 — Test fresh install.** Follow only public docs on a clean host.
- [ ] **P13-074 — Test upgrade.** Upgrade from the previous supported baseline with real fixture data and verified backup.
- [ ] **P13-075 — Create release candidate.** Run the entire release checklist against immutable candidate artifacts.

## Phase 13 testing instructions

1. Run all format, lint, type, unit, integration, contract, privacy, retrieval, E2E, accessibility, security, load, soak, crash, backup, and restore suites.
2. Run default CI without generation or embedding credentials and prove fake-provider/lexical mode is sufficient.
3. Run opt-in live-provider smoke/evaluation tests with strict budget caps.
4. Perform fresh install and upgrade using only the written documentation.
5. Restore the final release backup fixture and continue an existing run.
6. Review all unresolved `BLOCKED:`, TODO, FIXME, skipped-test, debug-only, and temporary-code markers.
7. Verify every checked task has implementation/test evidence in `docs/progress.md`.
8. Manually verify the complete v1 definition of done below.

## Phase 13 final release gate

A v1 release is allowed only when every statement is true:

- [ ] Fresh Docker Compose installation succeeds from documented steps.
- [ ] Generation provider configuration works without exposing credentials to the browser.
- [ ] A user can author and validate entities, locations, relationships, story cards, and plot points.
- [ ] A user can select exactly one playable entity and start a pinned run.
- [ ] Text gameplay streams, reconnects, saves, resumes, cancels, retries, and recovers after worker failure.
- [ ] NPCs can speak, act, remain silent, and generate explicit fictional inner thoughts.
- [ ] The player entity never receives AI-authored thoughts or autonomous intent.
- [ ] NPC thoughts remain private from other entities and appear to the human only through explicit details/debug views.
- [ ] Canonical events, observations, beliefs, memories, thoughts, and narration remain separate.
- [ ] All epistemic canary leakage tests pass, including multi-hop summary/mutation cases.
- [ ] Architect pursues authored/AI-proposed plots without direct canon mutation or railroading.
- [ ] Story cards mutate only according to policy with history, diff, rollback, and reindex.
- [ ] Retrieval works lexically and with activated pgvector embeddings.
- [ ] Turns are idempotent, resumable, cancellable, and crash-safe.
- [ ] Regeneration and rewind preserve old branches/history.
- [ ] Long-run memory/context growth remains bounded and tested.
- [ ] Save bundles and database backups restore successfully.
- [ ] Security, accessibility, integration, E2E, privacy, narrative quality, load, and soak gates pass.
- [ ] Documentation is sufficient to install, operate, back up, restore, upgrade, troubleshoot, and extend the release.
- [ ] There are no unchecked required tasks in Phases 0–13.

---

# Appendix A — Required root commands

Implement and maintain these commands by the relevant phase. Names may be adjusted only if this appendix and documentation are updated consistently.

- [ ] `pnpm dev` — start local development apps/services or clearly document prerequisite service command.
- [ ] `pnpm build` — build all apps/packages.
- [ ] `pnpm lint` — lint all source.
- [ ] `pnpm typecheck` — strict typecheck all workspaces.
- [ ] `pnpm format` and `pnpm format:check` — write/check formatting.
- [ ] `pnpm test` — unit tests.
- [ ] `pnpm test:integration` — PostgreSQL/Redis integration tests.
- [ ] `pnpm test:contract` — provider contracts using fakes by default.
- [ ] `pnpm test:privacy` — leakage/canary suite.
- [ ] `pnpm test:retrieval` — retrieval fixtures/evaluations.
- [ ] `pnpm test:e2e` — Playwright.
- [ ] `pnpm test:a11y` — automated accessibility suite.
- [ ] `pnpm test:soak` — deterministic long-run suite.
- [ ] `pnpm test:live-provider` — opt-in, credentialed, budget-capped.
- [ ] `pnpm db:migrate` — apply migrations safely.
- [ ] `pnpm db:check` — migration/schema drift and connectivity checks.
- [ ] `pnpm db:seed` — development/test seed only.
- [ ] `pnpm db:reset` — guarded development/test reset only.
- [ ] `pnpm projections:rebuild` — rebuild/compare run projections.
- [ ] `pnpm embeddings:reindex` — resumable reindex.
- [ ] `pnpm backup` — logical backup wrapper.
- [ ] `pnpm restore:verify` — restore into disposable environment and verify.
- [ ] `pnpm security:scan` — dependency/secret/container scans as applicable.
- [ ] `pnpm sbom` — generate release SBOM.

# Appendix B — Minimum privacy canaries

Every privacy test fixture should use unique markers so the source of any leak is obvious. Do not use real secrets.

- [ ] NPC A private canonical description canary.
- [ ] NPC A secret canary.
- [ ] NPC A private relationship-feeling canary about NPC B.
- [ ] NPC A belief canary that is false.
- [ ] NPC A episodic memory canary.
- [ ] NPC A lingering thought canary.
- [ ] NPC B distinct equivalents for cross-owner tests.
- [ ] Private location-detail canary.
- [ ] Architect-only future-plot canary.
- [ ] Admin-only debug canary.
- [ ] Player-out-of-world detail canary.
- [ ] Public control canary that **should** be retrievable.

Test every canary against NPC A, NPC B, narrator, player view, memory curator, resolver, architect, card mutator, summaries, retrieval audits, exports, logs, and diagnostic bundles according to the documented policy matrix.

# Appendix C — Completion discipline reminder

**Leave every box unchecked until the exact behavior is implemented and verified.** In particular:

- An interface without an adapter is not complete.
- An adapter without error/cancellation/security tests is not complete.
- A migration without repository behavior and integration tests is not complete.
- A route without authorization, validation, conflict handling, and response schemas is not complete.
- A UI control without working backend behavior, loading/error states, accessibility, and tests is not complete.
- A prompt without schema validation, privacy-scoped context, budget enforcement, fixtures, and audit metadata is not complete.
- A retry path that can duplicate events is not complete.
- A privacy feature that relies only on telling the model not to reveal data is not complete.
- A branch/regeneration feature that overwrites old history is not complete.
- A backup that has not been restored successfully is not complete.
- A phase with failing or skipped gate tests is not complete.
