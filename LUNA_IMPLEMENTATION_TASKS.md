# Luna Implementation Task List — AI Narrative Engine

> **Purpose:** This is the execution checklist for building the project described in `ai-dungeon-clone-plan.md` and `MODEL_INFO.md`.
>
> **Primary implementer:** Luna (or another coding model operating task-by-task).
>
> **Status rule:** Every implementation checkbox starts unchecked. **Do not check a task merely because a file, stub, TODO, mock, interface, migration placeholder, or UI shell exists. Check it only after the described behavior is fully implemented and its required tests pass.**

---

## 0. Mandatory execution protocol

### 0.1 Rules for using this checklist

- [x] Read all of `ai-dungeon-clone-plan.md`, `MODEL_INFO.md`, and this file before implementing anything.
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

- [x] **P0-001 — Create the product glossary.** Add `docs/product/glossary.md` defining scenario, scenario revision, run, branch, turn, stage, attempted action, canonical event, projection, observation, belief, memory, fictional inner thought, story card, card version, plot arc, plot point, architect, resolver, narrator, principal, visibility scope, retrieval document, retrieval chunk, embedding profile, snapshot, and save bundle.
- [x] **P0-002 — Document product scope.** Add `docs/product/scope.md` listing all v1 goals and explicit non-goals from the source plan. State that v1 is single-human-player and self-hosted.
- [x] **P0-003 — Document player-agency rules.** Specify that the player controls exactly one selected playable entity, AI cannot invent that entity's thoughts or intent, and the resolver can determine consequences without replacing attempted intent.
- [x] **P0-004 — Document narration modes.** Define supported v1 person/tense combinations and whether v1 supports only player-limited narration or also an explicitly configured omniscient mode. Ensure the default is player-limited.
- [x] **P0-005 — Define content-boundary behavior.** Document scenario-authored boundaries, provider refusals, how failures are presented, and that boundaries are data rather than prompt-policy overrides.

## 0.2 Architecture decision records

Create ADRs with context, decision, alternatives, consequences, and status.

- [x] **P0-010 — ADR: monorepo and TypeScript tooling.** Cover pnpm workspaces, Turborepo, strict TypeScript, Vitest, Playwright, ESLint, and Prettier.
- [x] **P0-011 — ADR: PostgreSQL and pgvector.** Cover relational canon, full-text search, graph queries, JSONB, pgvector, backup simplicity, and the `VectorStore` abstraction.
- [x] **P0-012 — ADR: event plus projection model.** Define append-only events, transactional projection updates, rebuild guarantees, and narrative non-canonicity.
- [x] **P0-013 — ADR: turn orchestration.** Cover BullMQ, Redis, persisted stages, idempotency keys, per-run serialization, worker recovery, and cancellation.
- [x] **P0-014 — ADR: streaming transport.** Explain why gameplay uses SSE, event IDs, replay, reconnect, heartbeat, and same-origin routing.
- [x] **P0-015 — ADR: AI provider abstraction.** Define provider-neutral generation and embedding interfaces and isolate compatibility flags.
- [x] **P0-016 — ADR: epistemic privacy.** Define principals, visibility scopes, SQL filtering, domain policy checks, fail-closed behavior, and canary tests.
- [x] **P0-017 — ADR: versioning and branching.** Cover optimistic edits, immutable scenario revisions, story-card versions, narration versions, regeneration branches, and no destructive history rewrites.
- [x] **P0-018 — ADR: authentication baseline.** Decide localhost-default behavior and optional remote-access authentication while preserving a path to passkeys later.
- [x] **P0-019 — ADR: prompts as versioned artifacts.** Require named prompts, typed builders, schemas, budgets, privacy classes, fixtures, and audit records.

## 0.3 Domain and policy specifications

- [x] **P0-020 — Define context principals.** Document `ARCHITECT`, `RESOLVER`, `NARRATOR`, `NPC(entityId)`, `MEMORY_CURATOR(entityId)`, `PLAYER_VIEW(entityId)`, and `ADMIN_DEBUG` permissions in a readable matrix.
- [x] **P0-021 — Define visibility scopes.** Document `world_truth`, `public_scenario`, `scene_observable`, `entity_private`, `player_out_of_world_detail`, `architect_private`, and `admin_only`; state that null/missing scope is invalid.
- [x] **P0-022 — Define the initial canonical patch vocabulary.** List allowlisted JSON Patch roots and operations for run entity state, run location state, relationship dimensions, world time, active status, inventory or structured attributes, and run story-card state. Define bounds and forbidden paths.
- [x] **P0-023 — Define deterministic perception v1.** Specify presence, location ancestry, connected-location hearing, visibility/discoverability, concealment, event modalities, sensory capability, and remote communication rules.
- [x] **P0-024 — Define belief semantics.** Specify confidence bounds, active/doubted/rejected/forgotten statuses, contradictory evidence behavior, and how speech is evidence of what was said rather than truth.
- [x] **P0-025 — Define memory lifecycle.** Specify memory types, importance/accessibility/confidence ranges, decay calculation, reinforcement, consolidation, suppression, forgetting, and source retention.
- [x] **P0-026 — Define thought lifecycle.** Specify ephemeral, lingering, and core eligibility, limits per NPC, expiry, reinforcement, duplicate consolidation, and player-inspectable behavior.
- [x] **P0-027 — Define plot-point transition graph.** Enumerate valid transitions among proposed, dormant, available, foreshadowed, active, resolved, failed, and abandoned.
- [x] **P0-028 — Define story-card mutation rules.** Document static, manual-only, append-only, AI-suggest, and AI-mutable modes; lock semantics; scope non-widening; patch allowlists; rollback behavior.
- [x] **P0-029 — Define export and save-bundle versioning.** Specify manifest fields, schema versions, checksums, migration hooks, included/excluded secrets, and compatibility behavior.
- [x] **P0-030 — Define server limits.** Set initial configurable maximums for player input, prompt tokens by role, output tokens, model calls per turn, active NPC calls, generated thoughts, retrieval candidates, selected chunks, active memories/thoughts, SSE replay events, request body sizes, and import sizes.

## 0.4 UX and operational specifications

- [x] **P0-040 — Produce scenario-builder wireframes.** Cover all ten builder sections, validation links, autosave state, conflicts, graph views, card history, and entity-knowledge preview.
- [x] **P0-041 — Produce gameplay wireframes.** Cover transcript, composer, stage progress, cancellation, current scene, details drawer, journal, errors, retries, and reconnect behavior.
- [x] **P0-042 — Produce timeline/branch wireframes.** Cover fork, activate, rename, compare, narration regeneration, rewind, and confirmations.
- [x] **P0-043 — Produce settings/debug wireframes.** Cover models, per-role assignments, retrieval, embeddings, reindexing, provider health, backups, telemetry, and local-only inspectors.
- [x] **P0-044 — Define deployment defaults.** Document service names, default localhost ports, volume names/paths, reverse-proxy routing, health checks, and optional profiles.
- [x] **P0-045 — Create the threat model.** Cover credential leakage, prompt injection, private-context leakage, XSS through Markdown, CSRF, CORS, SSRF, malicious imports, oversized input, debug-route exposure, queue abuse, model tool abuse, and backup leakage.
- [x] **P0-046 — Create a privacy data-flow diagram.** Trace private entity data through database, retrieval, prompt assembly, provider call, AI audit, details UI, logs, exports, and deletion/archive behavior.

## Phase 0 testing instructions

1. Review every document against `ai-dungeon-clone-plan.md` and `MODEL_INFO.md`.
2. Verify every source-plan feature maps to at least one later task in this checklist.
3. Run a link checker over `docs/` after the documentation toolchain exists; before then, manually verify paths and cross-references.
4. Conduct a tabletop privacy review using three entities: player, NPC A with a secret, and NPC B. Walk through direct observation, absence, lying, remote communication, summary generation, card mutation, and details viewing.
5. Conduct a crash/retry tabletop review for failure before provider call, during streaming, after event commit, and before turn completion.

## Phase 0 go/no-go gate

Do not start Phase 1 until:

- [x] All Phase 0 tasks are complete and accurately checked.
- [x] Every privileged role has an explicit allow/deny policy.
- [x] The canonical patch vocabulary and perception rules are unambiguous enough to test.
- [x] Export schema versioning, server limits, deployment defaults, and v1 scope are documented.
- [x] No unresolved design issue can change the database's ownership of canon, player agency, privacy boundaries, or branch semantics.

---

# Phase 1 — Monorepo, tooling, local infrastructure, and CI

## Goal

Create a reproducible, strict, one-command development environment and package skeleton with no application feature claims yet.

## 1.1 Repository and workspace

- [x] **P1-001 — Initialize pnpm workspace.** Add `pnpm-workspace.yaml`, root scripts, lockfile, and package manager pin.
- [x] **P1-002 — Pin Node.js.** Add `.nvmrc` and `package.json#engines` using a current LTS version; make CI use the same version.
- [x] **P1-003 — Configure Turborepo.** Define build, dev, lint, typecheck, test, integration, E2E, and clean pipelines with correct cache inputs/outputs.
- [x] **P1-004 — Configure strict TypeScript.** Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, declaration settings for libraries, path boundaries, and separate browser/server configs.
- [x] **P1-005 — Configure lint and formatting.** Add type-aware ESLint, import boundaries, no-floating-promises checks, security-relevant rules, Prettier, and root scripts.
- [x] **P1-006 — Add editor and repository hygiene files.** Add `.editorconfig`, `.gitignore`, `.dockerignore`, line-ending policy, and generated-file conventions.
- [x] **P1-007 — Add conventional change guidance.** Document commit conventions; add Changesets only if package publication is intentionally enabled.

## 1.2 App and package skeletons

Create real package manifests, TypeScript entry points, build configs, and package-boundary linting for:

- [x] **P1-010 — `apps/web`.** React, Vite, TanStack Router/Query, basic test setup.
- [x] **P1-011 — `apps/api`.** Fastify bootstrap, schema provider, graceful shutdown, health route shell.
- [x] **P1-012 — `apps/worker`.** BullMQ bootstrap shell and graceful shutdown.
- [x] **P1-013 — `packages/config`.** Typed environment schema and server/browser separation.
- [x] **P1-014 — `packages/contracts`.** Shared schema package without depending on app packages.
- [x] **P1-015 — `packages/domain`.** Pure package that cannot import database, web, queue, or provider implementations.
- [x] **P1-016 — `packages/db`.** Drizzle config and database connection shell.
- [x] **P1-017 — `packages/ai`.** Provider interface package shell.
- [x] **P1-018 — `packages/prompts`.** Prompt registry shell.
- [x] **P1-019 — `packages/retrieval`.** Retrieval interfaces shell.
- [x] **P1-020 — `packages/engine`.** Orchestration interfaces shell.
- [x] **P1-021 — `packages/observability`.** Logger and telemetry interfaces.
- [x] **P1-022 — `packages/testkit`.** Shared fixtures and test-environment helpers.

## 1.3 Configuration and logging

- [x] **P1-030 — Implement validated server config.** Parse environment once, reject invalid critical values, distinguish development/test/production, and never serialize secret fields.
- [x] **P1-031 — Implement browser-safe runtime config.** Expose only explicitly allowlisted non-secret values.
- [x] **P1-032 — Add `.env.example`.** Include every planned variable with safe placeholders, comments, and no real keys.
- [x] **P1-033 — Implement Pino logger.** Add service name, environment, request/job correlation fields, redaction for authorization/cookie/API-key/header patterns, and human-readable dev transport.
- [x] **P1-034 — Implement API request IDs.** Accept a valid inbound correlation ID or generate one; return it and bind it to logs.
- [x] **P1-035 — Implement graceful process shutdown.** Stop accepting requests/jobs, close queue/database/Redis connections, flush telemetry, and exit with bounded timeout.

## 1.4 Docker and local services

- [x] **P1-040 — Add PostgreSQL image/config.** Use PostgreSQL 16+ with pgvector, persistent volume, health check, non-default local credentials, and extension-ready initialization.
- [x] **P1-041 — Add Redis.** Configure persistent or explicitly disposable development storage, health check, and no public host binding by default.
- [x] **P1-042 — Add API Dockerfile.** Multi-stage build, locked dependencies, non-root runtime user, health check support, and minimal runtime files.
- [x] **P1-043 — Add worker Dockerfile.** Apply the same security and reproducibility requirements as API.
- [x] **P1-044 — Add web Dockerfile.** Build static assets and serve with Caddy or Nginx as a non-root user where practical.
- [x] **P1-045 — Add Compose stack.** Include web, API, worker, PostgreSQL, Redis, volumes, dependencies, health conditions, localhost binding, and restart policies.
- [x] **P1-046 — Add optional Caddy profile.** Route `/api` and SSE correctly, support local HTTP by default, and document remote TLS setup.
- [x] **P1-047 — Add development reset and seed commands.** Reset only after explicit confirmation or a development-only guard; never target production accidentally.
- [x] **P1-048 — Add service health/readiness behavior.** Liveness checks process health; readiness verifies required dependencies without leaking configuration details.

## 1.5 Testing and CI foundation

- [x] **P1-050 — Configure Vitest.** Separate unit and integration projects, deterministic timezone, cleanup hooks, and coverage output.
- [x] **P1-051 — Configure Testcontainers.** Provide shared PostgreSQL/pgvector and Redis helpers with isolation and reliable cleanup.
- [x] **P1-052 — Configure Playwright.** Add browser install, web-server orchestration, trace-on-retry, screenshot-on-failure, and no live-provider dependency.
- [x] **P1-053 — Add CI workflow.** Run install with frozen lockfile, format check, lint, typecheck, unit tests, integration tests, build, and container build.
- [x] **P1-054 — Add security CI basics.** Run dependency audit, secret scanning, and Dockerfile/container linting; establish an explicit documented exception process.
- [x] **P1-055 — Add test fixture rules.** Ensure fake keys are recognizable as fake, fixtures cannot call live providers by default, and tests isolate databases/queues.

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

- [x] One documented command starts the complete local stack.
- [x] All services pass health/readiness checks.
- [x] Strict typecheck, lint, unit tests, integration harness, builds, and image builds pass.
- [x] Runtime containers do not run as root unless a documented unavoidable exception exists.
- [x] No real secret is present in source, image layers, browser runtime config, or logs.
- [x] Package dependency direction prevents domain code from importing infrastructure.

---

# Phase 2 — Contracts, pure domain model, policies, and state machines

## Goal

Implement framework-independent types, validation schemas, invariants, and transitions before persistence or UI behavior depends on them.

## 2.1 Shared primitives and schemas

- [x] **P2-001 — Implement branded IDs.** Add typed IDs for every major resource and safe parse/serialize helpers.
- [x] **P2-002 — Implement common metadata.** UTC timestamps, creation/update metadata, optimistic version, archive metadata, attribution/source, and schema version.
- [x] **P2-003 — Implement bounded scalar schemas.** Confidence, salience, urgency, importance, emotional valence/intensity, priorities, weights, and token budgets.
- [x] **P2-004 — Implement references.** Typed entity, location, story-card, plot-point, event, observation, memory, thought, turn, branch, and source references.
- [x] **P2-005 — Implement pagination/filter contracts.** Cursor pagination, stable sorting, search query limits, tag filters, and archived/current flags.
- [x] **P2-006 — Establish API error contract.** Machine code, human message, field issues, request ID, retryability, and safe details.

## 2.2 Scenario authoring domain

- [x] **P2-010 — Implement scenario aggregate schemas.** Include all identity, premise, style, chronology, model/retrieval/pacing, status, revision, and timestamp fields.
- [x] **P2-011 — Implement entity schemas and validators.** Include kinds, aliases, pronouns, public/private descriptions, appearance, personality, speech, drives, goals, fears, capabilities, secrets, stats, constraints, mutation policy, playable/cognitive/alive/active flags, and starting location.
- [x] **P2-012 — Implement directional relationship schemas.** Include public state, source-private state, canonical facts, configurable dimensions, history, and last changed turn.
- [x] **P2-013 — Implement location schemas.** Include hierarchy, aliases, type/tags, public/private details, coordinates, environment, access, sensory properties, hazards, and mutation policy.
- [x] **P2-014 — Implement location-edge schemas.** Include directionality, travel text/time/cost, access requirements, discoverability, and blocked state.
- [x] **P2-015 — Implement story-card schemas.** Include types, bodies, activation hints, priority/budget, scope, mutation policy, lock, effective turn range, source, and current version.
- [x] **P2-016 — Implement story-card link schemas.** Support links to entities, locations, cards, plot points, and global lore with relation type and weight.
- [x] **P2-017 — Implement plot arc and point schemas.** Include all statuses, conditions, outcomes, involved resources, cues, escalation, visibility, timing, dependencies, source, and priority.
- [x] **P2-018 — Implement scenario validation result.** Return path-addressable errors/warnings with resource IDs and builder section identifiers.
- [x] **P2-019 — Implement complete scenario validation.** Validate start location, at least one playable entity, references, graph consistency, revision readiness, plot dependencies, card links, and configuration bounds.

## 2.3 Runtime domain

- [x] **P2-030 — Implement run schema.** Pin scenario revision, player entity, active branch/current turn, world time, random seed, narrative settings, role/retrieval snapshots, status, and last successful snapshot.
- [x] **P2-031 — Implement branch schema.** Parent, fork turn, label, active/canonical status, and creation reason.
- [x] **P2-032 — Implement turn schema and stage state machine.** Add all recommended stages and terminal/failure states; reject invalid transitions.
- [x] **P2-033 — Implement attempted-action schema.** Support speech, movement, interaction, attack, wait, observation, and custom actions with actor, targets, intent, assumptions, visibility, and source.
- [x] **P2-034 — Implement canonical-event schema.** Include location/time, participants, canonical description, facts, patches, causes, visibility hints, salience, emotional weight, and schema version.
- [x] **P2-035 — Implement event fact and patch schemas.** Use explicit operators and the allowlisted patch vocabulary; reject prototype-pollution paths and arbitrary object traversal.
- [x] **P2-036 — Implement observation schema.** Include observer, source event, modality, perceived content, detail, confidence, distortion/occlusion, and observed turn.
- [x] **P2-037 — Implement belief schema.** Include normalized proposition, rendering, confidence, evidence, reinforcement turns, contradiction/supersession, status, and salience.
- [x] **P2-038 — Implement memory schema.** Include all memory types and lifecycle/source fields.
- [x] **P2-039 — Implement fictional inner-thought schema.** Include persistence, trigger, text, salience, urgency, emotion, expiration, reinforcement, optional target, status, and inspectability.
- [x] **P2-040 — Implement run projection schemas.** Entity, location, story-card, architect, and narrative projection state with explicit versions.
- [x] **P2-041 — Implement snapshot schema.** Add schema version, run/branch/turn, projection versions, checksum, and serialized state.

## 2.4 Pure policies and transition logic

- [x] **P2-050 — Implement `KnowledgePolicy.canRead`.** Enforce every principal/scope/resource combination with entity ownership and run/branch checks.
- [x] **P2-051 — Implement query-scope policy builder.** Produce coarse authorization predicates that persistence can translate into SQL; fail when principal context is incomplete.
- [x] **P2-052 — Implement player-control policy.** Reject NPC decisions, thought records, goal updates, and autonomous attempted actions whose actor is the selected player entity.
- [x] **P2-053 — Implement patch validator.** Validate operation, path, type, bounds, referenced IDs, actor capability/presence hooks, locks, and knowledge-propagation prohibition.
- [x] **P2-054 — Implement deterministic perception policy.** Return eligible observers and modalities from event/state/topology inputs.
- [x] **P2-055 — Implement belief transition rules.** Add/reinforce/doubt/reject/forget/supersede while preserving evidence history.
- [x] **P2-056 — Implement memory lifecycle rules.** Calculate decay, reinforcement, duplicate candidates, consolidation eligibility, suppression, and forgetting.
- [x] **P2-057 — Implement thought lifecycle rules.** Enforce owner eligibility, class limits, expiry, reinforcement, duplicate consolidation, and no player thoughts.
- [x] **P2-058 — Implement relationship update rules.** Bound dimensions, preserve directional privacy, attribute changes, and record changed turn.
- [x] **P2-059 — Implement plot transition rules.** Enforce allowed status transitions and required evidence.
- [x] **P2-060 — Implement card mutation policy.** Enforce mode, lock, field allowlist, expected version, scope impact, source evidence, and append-only restrictions.
- [x] **P2-061 — Implement context-budget fitter.** Reserve output and safety headroom, preserve mandatory sections, and drop/compress only in allowed order.
- [x] **P2-062 — Implement stagnation feature calculator.** Calculate all deterministic features without model input.
- [x] **P2-063 — Implement configurable gameplay caps.** Validate maximum NPCs/calls/thoughts/context/input and return explicit errors rather than silently exceeding them.

## 2.5 Initial AI output contracts

- [x] **P2-070 — Define `PlayerIntent`.** Speech, physical actions, targets, desired outcomes, assumptions, meta flag, ambiguity warnings, and evidence from raw input.
- [x] **P2-071 — Define `ArchitectPlan`.** Include pacing, stagnation, priorities, guidance, foreshadowing, optional sudden event/new point, cooldowns, and forbidden revelations.
- [x] **P2-072 — Define `NpcDecisionBatch`.** Include attention, reaction, speech, attempted actions, generated fictional thoughts, belief proposals, goal updates, and perceived evidence IDs.
- [x] **P2-073 — Define `ResolutionProposal`.** Include events, patches, failed actions, server-random references, plot evidence, and mutation signals.
- [x] **P2-074 — Define `NarrationPlan`.** Segments, speaker/event references, optional transition/title, and no private-thought field.
- [x] **P2-075 — Define `MemoryUpdateProposal`.** Include new memories, reinforcement, belief changes, suppression/forgetting, and authorized evidence IDs.
- [x] **P2-076 — Define `StoryCardMutationProposal`.** Include card/version, reason, sources, JSON Patch, semantic summary, confidence, scope impact, contradictions, and expiry suggestions.
- [x] **P2-077 — Generate JSON Schema/OpenAPI-compatible artifacts.** Ensure runtime validation and TypeScript types derive from one source.

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

- [x] All contracts compile and produce runtime validation schemas.
- [x] Domain unit tests cover every invariant and are green.
- [x] Knowledge access fails closed.
- [x] Player agency violations are rejected independently of prompts.
- [x] State machines, patch rules, perception, memory, thoughts, plots, and card policies are deterministic and tested.
- [x] No later persistence or AI code must invent an undocumented state transition.

---

# Phase 3 — Database schema, repositories, transactions, projections, and snapshots

## Goal

Persist all authored and runtime state with constraints, transactions, versioning, auditability, and reproducible projection rebuilds.

## 3.1 Migration foundation

- [x] **P3-001 — Configure Drizzle migrations.** Add deterministic generation/apply/check commands and environment safety guards.
- [x] **P3-002 — Enable PostgreSQL extensions.** Migrate `vector`, `pg_trgm`, and any required UUID/crypto extension; verify availability.
- [x] **P3-003 — Standardize database conventions.** Use UTC timestamps, typed IDs, snake_case tables, foreign-key naming, version columns, created/updated attribution, and archive semantics.
- [x] **P3-004 — Add migration CI drift check.** Fail when schema definitions and committed migrations diverge.

## 3.2 Configuration and audit tables

- [x] **P3-010 — Implement `app_settings`.** Support typed, non-secret settings and secret-reference metadata without storing browser-readable credentials.
- [x] **P3-011 — Implement `provider_model_cache`.** Store provider, model descriptor, capabilities, retrieval time, expiry, and last-known-good status.
- [x] **P3-012 — Implement `prompt_versions`.** Store prompt name/version/hash/schema/privacy metadata and activation status.
- [x] **P3-013 — Implement `ai_invocations`.** Store role, stage, model/provider, prompt version, authorized document IDs, usage, latency, validation, retries, correlation, and optional raw-retention flags.
- [x] **P3-014 — Implement `job_runs`.** Track queue, job key, attempts, heartbeat, stage, status, timestamps, and safe errors.
- [x] **P3-015 — Implement `audit_log`.** Store actor, action, resource, before/after references or bounded diff, request ID, and timestamp.

## 3.3 Scenario authoring tables

- [x] **P3-020 — Implement `scenarios` and `scenario_revisions`.** Enforce unique slug/revision and immutable published revision snapshots.
- [x] **P3-021 — Implement `entities`.** Preserve revision ownership, public/private fields, flags, structured attributes, constraints, and versions.
- [x] **P3-022 — Implement `entity_relationships`.** Enforce directional uniqueness per revision/source/target/type.
- [x] **P3-023 — Implement `locations`.** Enforce revision ownership and acyclic hierarchy in service logic with supporting constraints.
- [x] **P3-024 — Implement `location_edges`.** Preserve directionality and block/discovery/access metadata.
- [x] **P3-025 — Implement `story_cards`, `story_card_versions`, and current-version integrity.** Make versions immutable and current pointer transactionally consistent.
- [x] **P3-026 — Implement `story_card_links`.** Support every target type without dangling references.
- [x] **P3-027 — Implement `plot_arcs`, `plot_points`, and `plot_point_links`.** Preserve dependencies, source attribution, conditions, status, and visibility.

## 3.4 Runtime tables

- [x] **P3-030 — Implement `runs`.** Enforce pinned revision and selected playable entity through service validation plus practical database protections.
- [x] **P3-031 — Implement `run_branches`.** Enforce one active branch per run and valid parent/fork references.
- [x] **P3-032 — Implement `turns`.** Enforce unique run/branch/turn number, idempotency key, expected version, status/stage, and failure metadata.
- [x] **P3-033 — Implement `turn_stage_results`.** Store input snapshot/version, raw or redacted provider result reference, validated output, application key, retries, and status.
- [x] **P3-034 — Implement `actions`.** Persist attempted actions before resolution.
- [x] **P3-035 — Implement `events`, `event_participants`, and `event_facts`.** Keep events append-only after commit.
- [x] **P3-036 — Implement `observations`.** Enforce owner/event/run/branch consistency.
- [x] **P3-037 — Implement `beliefs` and `belief_evidence`.** Preserve contradiction/supersession and source lineage.
- [x] **P3-038 — Implement `memories` and `memory_links`.** Preserve source links and versioned evolution where consolidation changes content.
- [x] **P3-039 — Implement `inner_thoughts`.** Add active/owner indexes and enforce no-player-thought via service plus database trigger where practical.
- [x] **P3-040 — Implement runtime projection tables.** Add `run_entity_state`, `run_location_state`, `run_story_card_state`, and `architect_state` with versions.
- [x] **P3-041 — Implement `run_snapshots`.** Store compressed or bounded serialized state, schema version, checksum, and source turn.
- [x] **P3-042 — Implement `narrative_segments`.** Store versioned narration renderings, segment types, event references, speaker, order, visibility, and final text linkage.

## 3.5 Retrieval tables and indexes

- [x] **P3-050 — Implement `retrieval_documents`.** Track source type/ID/version, run/scenario/branch, visibility, owner, hash, and active status.
- [x] **P3-051 — Implement `retrieval_chunks`.** Store text, tsvector, metadata, links, turn range, importance/salience/recency, content hash, scope, and active status.
- [x] **P3-052 — Implement `embedding_profiles`.** Store provider/model/dimensions/distance/status/generation and atomic active-profile metadata.
- [x] **P3-053 — Implement `chunk_embeddings`.** Use unconstrained vector storage plus profile/model/dimensions/hash/time.
- [x] **P3-054 — Implement `retrieval_audit`.** Record request principal, query metadata, selected/rejected chunk IDs, score components, budget decisions, and timing without full private text.
- [x] **P3-055 — Add required indexes.** Cover all foreign keys, tags, JSONB query fields, tsvector, trigrams, run timeline, memories, plot points, current cards, active thoughts, active memories, and idempotency.
- [x] **P3-056 — Add profile-specific HNSW index management.** Safely create/drop concurrent partial expression indexes using validated dimensions and profile IDs.

## 3.6 Repositories and transaction services

- [x] **P3-060 — Implement unit-of-work helpers.** Support short transactions, isolation selection, retries for serialization/deadlock, and correlation logging.
- [x] **P3-061 — Implement optimistic CRUD repositories.** Return explicit conflicts when expected versions mismatch.
- [x] **P3-062 — Implement scenario aggregate repository.** Load/edit/archive/clone/revision operations without cross-revision leakage.
- [x] **P3-063 — Implement run repository.** Create from an immutable scenario revision and snapshot model/retrieval settings.
- [x] **P3-064 — Implement advisory run locks.** Key by run ID and prove only one canonical application occurs at a time.
- [x] **P3-065 — Implement append-event plus projection transaction.** Validate expected version, append events/facts/participants, update projections, and record application key atomically.
- [x] **P3-066 — Implement idempotent stage application.** Reapplying the same stage key must return the original result and never duplicate effects.
- [x] **P3-067 — Implement observations/beliefs/memories/thought repositories.** Require an explicit principal or privileged service context for reads.
- [x] **P3-068 — Implement versioned story-card mutation transaction.** Validate expected version/policy, write version/diff, switch pointer, deactivate old chunks, and enqueue outbox intent atomically.
- [x] **P3-069 — Implement transactional outbox or equivalent.** Reliably bridge database commits to queue work for indexing and maintenance.
- [x] **P3-070 — Implement snapshot create/restore.** Verify checksum and schema version; restore into projections without mutating event history.
- [x] **P3-071 — Implement event-to-projection rebuild tool.** Rebuild a disposable projection set and compare it against live projections.
- [x] **P3-072 — Implement database factories.** Create deterministic complete scenarios, runs, events, memories, thoughts, branches, and retrieval fixtures.

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

- [x] All migrations pass from a clean database and schema drift is zero.
- [x] Every required table, constraint, and index exists.
- [x] Scenario and run aggregates can be created entirely through repositories.
- [x] Events rebuild projections exactly.
- [x] Concurrent/idempotent application tests pass.
- [x] Story-card versions and snapshots are immutable and recoverable.
- [x] Private data queries require explicit authorization context and fail closed.

---

# Phase 4 — Scenario authoring API, import/export, and validation

## Goal

Expose complete, schema-validated, concurrency-safe authoring commands and queries before building the full authoring UI.

## 4.1 API framework conventions

- [x] **P4-001 — Implement `/api/v1` routing and OpenAPI.** Register request/response schemas from `packages/contracts` and provide development docs without exposing secrets.
- [x] **P4-002 — Implement consistent API errors.** Map validation, not found, conflict, forbidden, rate limit, dependency failure, and internal errors.
- [x] **P4-003 — Implement request limits.** Apply route-specific body, query, multipart/import, and timeout limits.
- [x] **P4-004 — Implement optimistic-concurrency headers.** Support version field and/or `If-Match`; return current safe representation on conflict where useful.
- [x] **P4-005 — Implement audit attribution.** Attach local user/system actor and request ID to all mutations.

## 4.2 System and status routes

- [x] **P4-010 — Implement `GET /health/live`.** Process-only liveness.
- [x] **P4-011 — Implement `GET /health/ready`.** Check required database/Redis/migration readiness with safe output.
- [x] **P4-012 — Implement `GET /system/info`.** Return app version, schema version, feature flags, and redacted configuration status.

## 4.3 Scenario lifecycle routes

- [x] **P4-020 — Implement scenario list/create/get/patch.** Add pagination, search, tags/status filters, archive behavior, and conflicts.
- [x] **P4-021 — Implement clone.** Deep-copy current authored resources into a new draft with new IDs and preserved internal links.
- [x] **P4-022 — Implement validate.** Return actionable errors/warnings with section and field paths.
- [x] **P4-023 — Implement publish revision.** Refuse invalid drafts, snapshot all authored resources immutably, increment revision, and record audit metadata.
- [x] **P4-024 — Implement revision list/get/diff.** Prevent edits to published snapshots.
- [x] **P4-025 — Implement archive/unarchive.** Refuse destructive deletion when revisions/runs reference the scenario.

## 4.4 Nested authoring routes

- [x] **P4-030 — Implement entity CRUD.** Include duplicate, archive, search/filter, and all public/private fields.
- [x] **P4-031 — Implement relationship CRUD.** Preserve directional semantics and prevent accidental mirror updates.
- [x] **P4-032 — Implement location CRUD.** Validate hierarchy cycles and start-location references.
- [x] **P4-033 — Implement location-edge CRUD.** Validate endpoints, directionality, and duplicate semantics.
- [x] **P4-034 — Implement story-card CRUD.** Create initial version, honor locks/policies, and expose current safe representation.
- [x] **P4-035 — Implement card links/backlinks.** Support every target and return weighted relation metadata.
- [x] **P4-036 — Implement card version/history/diff/rollback/lock routes.** Rollback creates a new version rather than deleting history.
- [x] **P4-037 — Implement plot arc CRUD.** Validate ordering and scenario ownership.
- [x] **P4-038 — Implement plot point CRUD and links.** Validate dependencies, statuses, timing, involved resources, and visibility.
- [x] **P4-039 — Implement entity-knowledge preview endpoint.** Return only what the chosen entity can know at scenario start and include source IDs/scopes for debugging.

## 4.5 Import and export

- [x] **P4-050 — Define versioned scenario JSON Schema.** Include manifest, content schema version, generated timestamp, and application compatibility.
- [x] **P4-051 — Implement scenario export.** Export one current draft or published revision with stable ordering and no secrets/runtime data.
- [x] **P4-052 — Implement scenario import validation.** Validate JSON structure, size, references, duplicate IDs, dangerous strings, and supported versions before writes.
- [x] **P4-053 — Implement transactional import.** Remap IDs safely, preserve internal links, and roll back the entire import on failure.
- [x] **P4-054 — Implement import migration hooks.** Upgrade older supported export versions without mutating the input file.
- [x] **P4-055 — Implement semantic round-trip comparison.** Ignore generated IDs/timestamps where appropriate while proving no authored meaning is lost.

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

- [x] A complete valid scenario can be authored and published using only the API.
- [x] All writes enforce optimistic concurrency and audit attribution.
- [x] Invalid start states cannot publish.
- [x] Import/export round-trips without semantic loss and is transactional.
- [x] Published revisions are immutable.
- [x] Knowledge preview passes privacy tests.

---

# Phase 5 — Web application shell and complete scenario builder

## Goal

Deliver an accessible UI for every authoring API feature, with resilient autosave and explicit conflict handling.

## 5.1 Application shell

- [x] **P5-001 — Implement router and layout.** Add dashboard, scenarios, runs, settings, and not-found routes with lazy loading/error boundaries.
- [x] **P5-002 — Implement TanStack Query client.** Add typed API client, safe retries, mutation invalidation, offline/connection state, and standardized errors.
- [x] **P5-003 — Implement responsive navigation.** Desktop-first sidebar plus accessible small-screen behavior.
- [x] **P5-004 — Implement theme support.** Light/dark/system, persistent non-secret preference, contrast-safe tokens, and no flash where practical.
- [x] **P5-005 — Implement command palette.** Keyboard accessible navigation/actions with focus restoration.
- [x] **P5-006 — Implement global status.** Show API connection, background work, configuration warnings, and recoverable errors.
- [x] **P5-007 — Implement accessibility baseline.** Landmarks, labels, focus indicators, reduced motion, keyboard paths, contrast, and live regions.
- [x] **P5-008 — Implement safe Markdown renderer.** Disable raw HTML, sanitize links/content, and test script/event-handler payloads.

## 5.2 Dashboard

- [x] **P5-010 — Implement recent scenarios and runs cards.** Add continue/edit/archive actions with loading/empty/error states.
- [x] **P5-011 — Implement create/import actions.** Validate files client-side only as convenience; rely on server validation for authority.
- [x] **P5-012 — Implement provider/retrieval health summary.** Show configured/not-configured status without secret values.
- [x] **P5-013 — Implement recent failures panel.** Show safe, actionable remediation and links to affected run/settings.

## 5.3 Scenario builder foundation

- [x] **P5-020 — Implement multi-section builder navigation.** Include premise/style, rules/boundaries, locations, entities, relationships, cards, plot arcs/points, start state, model/pacing, and validation/preview.
- [x] **P5-021 — Implement form schemas.** Use React Hook Form plus shared validation, preserve exact optional semantics, and map server field errors.
- [x] **P5-022 — Implement autosave.** Debounce safely, show saving/saved/error state, serialize writes, and prevent stale responses from overwriting newer edits.
- [x] **P5-023 — Implement conflict UI.** On optimistic conflict show local/server values and explicit reload, copy, or manual merge paths; never silently overwrite.
- [x] **P5-024 — Implement unsaved-change protection.** Protect navigation/refresh while a mutation is pending or failed.
- [x] **P5-025 — Implement search/filter/tagging and duplicate/archive actions.** Cover all resource collections.
- [x] **P5-026 — Implement validation navigation.** Deep-link each server issue to the exact section/resource/field and focus it.

## 5.4 Builder sections

- [x] **P5-030 — Build premise/style editor.** Include identity, description, genre, tone, themes, person, tense, chronology, and narration style.
- [x] **P5-031 — Build world-rules/content-boundaries editor.** Clearly distinguish trusted scenario-rule card types from ordinary untrusted prose.
- [x] **P5-032 — Build entity editor.** Cover every entity field, playable/cognitive flags, private/public separation, starting location, stats, constraints, and mutation policy.
- [x] **P5-033 — Build relationship editor and graph.** Show direction arrows, private side-specific values, filters, and accessible list fallback.
- [x] **P5-034 — Build location hierarchy tree.** Support create/move/reparent with cycle prevention and accessible controls.
- [x] **P5-035 — Build location connection graph.** Edit directionality, costs, requirements, visibility, and blocked state; provide table fallback.
- [x] **P5-036 — Build story-card editor.** Cover bodies, scope, activation, priority/budget, policy, lock, effective turns, source, and links.
- [x] **P5-037 — Build card backlinks/version/diff/rollback UI.** Clearly show immutable history and that rollback creates a new version.
- [x] **P5-038 — Build plot arc/point editor.** Cover statuses, conditions, outcomes, cues, escalation, timing, visibility, dependencies, and links.
- [x] **P5-039 — Build start-state editor.** Select start location, playable candidates, chronology, and validate exactly what is required to launch.
- [x] **P5-040 — Build model/pacing override editor.** Show scenario-level overrides without requiring provider secrets in the browser.
- [x] **P5-041 — Build validation/preview section.** Show errors/warnings, published revisions, and entity-knowledge preview with explicit principal labeling.
- [x] **P5-042 — Build clone/archive/import/export flows.** Add confirmations and preserve downloadable filenames/version metadata.

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

- [x] Every scenario-authoring API capability is usable from the browser.
- [x] A complete scenario can be built without direct database access.
- [x] Autosave and conflicts are visible and loss-resistant.
- [x] Validation links identify exact errors and invalid scenarios cannot start.
- [x] Builder screens meet baseline keyboard and automated accessibility checks.
- [x] Public/private fields are visibly differentiated to reduce author mistakes.

---

# Phase 6 — Generation/embedding provider gateways, model settings, prompts, and fake AI

## Goal

Integrate the configured provider safely behind stable interfaces and make every AI call structured, versioned, bounded, auditable, cancellable, and testable without live access.

## 6.1 Provider-neutral interfaces

- [x] **P6-001 — Implement `GenerationProvider`.** Include model discovery, structured generation, streaming text, optional token count, abort support, and normalized results.
- [x] **P6-002 — Implement `EmbeddingProvider`.** Include model descriptor, document/query embedding, batching, abort support, and normalized errors.
- [x] **P6-003 — Implement normalized model descriptors.** Track context/output limits, JSON/schema, streaming, image, reasoning, tools, usage, and provider-specific compatibility flags.
- [x] **P6-004 — Implement normalized provider errors.** Classify authentication, rate limit, timeout, transport, 5xx, context overflow, invalid output, refusal, cancellation, and unknown failure.
- [x] **P6-005 — Implement retry policy.** Retry only classified transient errors with capped exponential backoff/jitter and respect cancellation/deadlines.
- [x] **P6-006 — Implement request-role timeouts and concurrency limits.** Apply per-role settings and global/provider call caps.

## 6.2 `aditya-gupta` generation adapter

- [x] **P6-010 — Implement secure transport.** Use `https://ai.adityagupta.dev/v1` by configuration, server-side Bearer and `x-bf-vk` headers, and no client exposure.
- [x] **P6-011 — Implement dynamic model discovery.** Call `/v1/models`, normalize descriptors, validate IDs, persist last-known-good catalog, and use configurable refresh TTL.
- [x] **P6-012 — Implement Responses structured generation.** Use strict schema support where available and compatibility fallback otherwise.
- [x] **P6-013 — Implement Responses streaming.** Normalize deltas, completion, usage, refusal, errors, and provider request IDs.
- [x] **P6-014 — Implement bounded structured-output repair.** Validate locally, perform at most configured repair attempts, and never apply invalid output.
- [x] **P6-015 — Implement context-overflow recovery.** Return a typed signal so callers can reduce optional context once while preserving rules/schema.
- [x] **P6-016 — Implement usage/cost capture.** Persist reported tokens and configurable cost estimates without failing calls when cost data is unavailable.
- [x] **P6-017 — Implement provider metadata logging.** Log IDs, role, model, duration, usage, retries, and outcome, but not secrets/full private content by default.

## 6.3 Embedding adapter and profile setup

- [x] **P6-020 — Implement OpenAI-compatible embeddings transport.** Use `/embeddings` and both required secret headers server-side.
- [x] **P6-021 — Configure verified default descriptor.** Support requested model `azure/text-embedding-ada-002`, returned model `text-embedding-ada-002`, 1536 dimensions, and cosine distance.
- [x] **P6-022 — Validate dimensions.** Reject wrong-length vectors, non-finite values, mixed batch lengths, and profile/model mismatch.
- [x] **P6-023 — Implement batch splitting and retries.** Respect configured batch size, provider limits, cancellation, and partial-failure safety.
- [x] **P6-024 — Preserve disabled mode.** Allow `EMBEDDING_ENABLED=false` with lexical retrieval and a non-blocking warning.

## 6.4 Model-role configuration

- [x] **P6-030 — Implement role settings.** Configure provider/model, sampling, output tokens, timeout, retries, reasoning effort, prompt budget, and parallelism for architect, NPC, resolver, narrator, memory, mutation, and critic.
- [x] **P6-031 — Implement role validation.** Warn or block when selected models lack required streaming/schema/context capabilities.
- [x] **P6-032 — Snapshot settings into runs.** Later changes must not silently alter existing run configuration unless an explicit migration/change action exists.
- [x] **P6-033 — Implement safe settings APIs.** Add model list/refresh/test and retrieval/embedding status/test routes; return configured flags and redacted IDs only.
- [x] **P6-034 — Implement test-call budget cap.** Prevent settings tests from producing unbounded cost or output.

## 6.5 Prompt registry and builders

For each prompt below, add a name/version, typed input, output schema, hard budget, privacy class, failure policy, fixtures, eval cases, and registry entry.

- [x] **P6-040 — Player intent prompt.** Delimit raw input and forbid invented motivation/thoughts.
- [x] **P6-041 — Architect prompt.** Distinguish guidance from canon and include anti-railroading rules.
- [x] **P6-042 — NPC cognition/decision prompt.** Use only owner-authorized context and permit no-action/think-only.
- [x] **P6-043 — Resolver prompt.** Separate attempted actions, server random outcomes, truth, beliefs, and architect guidance.
- [x] **P6-044 — Observation interpretation prompt.** Restrict observer set to deterministic eligibility.
- [x] **P6-045 — Narrator prompt.** Use player-observable information only and prohibit private-thought output.
- [x] **P6-046 — Memory curator prompt.** Require evidence IDs and owner-scoped data.
- [x] **P6-047 — Story-card mutator prompt.** Require source IDs, scope impact, expected version, and allowlisted patches.
- [x] **P6-048 — Consistency critic prompt.** Check contradictions and policy violations without gaining mutation authority.
- [x] **P6-049 — Implement stable prompt rendering.** Keep system/schema sections stable, delimit untrusted data, and produce deterministic hashes.
- [x] **P6-050 — Register active prompt versions.** Persist prompt metadata and include it in every invocation.

## 6.6 Fake provider and contract tests

- [x] **P6-060 — Build deterministic fake generation provider.** Script model discovery, valid outputs, malformed JSON, delays, streaming chunks, cancellation, retries, refusals, and usage.
- [x] **P6-061 — Build deterministic fake embedding provider.** Generate stable vectors with configurable dimensions and error modes.
- [x] **P6-062 — Add opt-in live contract suite.** Require explicit environment flag, cap requests/tokens, avoid private fixtures, and skip safely without credentials.
- [x] **P6-063 — Implement AI invocation audit service.** Persist metadata, authorized source IDs, schema validation, retries, and retention policy.

## 6.7 Settings UI

- [x] **P6-070 — Build model catalog UI.** Show refresh age, capabilities, last-known-good state, and warnings.
- [x] **P6-071 — Build per-role assignment UI.** Edit all settings with model capability validation.
- [x] **P6-072 — Build test-model UI.** Show safe timing/usage/result status without raw secrets or hidden reasoning.
- [x] **P6-073 — Build embedding status/test UI.** Show disabled/configured/profile/dimensions/index status and non-blocking lexical-mode warning.

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

- [x] Model discovery and generation work through the abstraction with the fake provider.
- [x] The configured live provider can pass the opt-in smoke test when credentials are supplied.
- [x] Embedding adapter validates the verified 1536-dimensional model.
- [x] Every AI role has a registered, versioned, budgeted prompt and schema.
- [x] Provider failures are typed, retry behavior is bounded, and cancellation works.
- [x] No secret appears in browser payloads, logs, traces, test artifacts, or OpenAPI examples.

---

# Phase 7 — Run creation and resumable core turn engine

## Goal

Deliver end-to-end multi-turn play with canonical events, deterministic observations, private NPC cognition, streamed narration, persistence, cancellation, retry, and crash safety.

## 7.1 Run creation

- [x] **P7-001 — Implement run creation service.** Require a valid published scenario revision and exactly one selected playable entity belonging to it.
- [x] **P7-002 — Snapshot authored state into runtime projections.** Initialize entities, locations, relationships, story-card state, architect state, world time, and active branch.
- [x] **P7-003 — Snapshot model/retrieval/narrative settings.** Record role settings and limits immutably for the run.
- [x] **P7-004 — Create initial branch and snapshot.** Establish turn zero and a recoverable baseline.
- [x] **P7-005 — Implement run list/get/archive APIs.** Include safe summaries and status.

## 7.2 Queue topology and workflow mechanics

- [x] **P7-010 — Create turn queue and worker.** Persist job identity and correlate run/branch/turn.
- [x] **P7-011 — Enforce per-run concurrency one.** Combine queue controls with advisory locks and expected run versions.
- [x] **P7-012 — Implement turn acceptance API.** Require run, active branch, expected version/current turn, idempotency key, and bounded nonblank input; return turn ID immediately.
- [x] **P7-013 — Persist every stage transition.** Enforce state machine and emit safe progress events.
- [x] **P7-014 — Snapshot pre-turn input state.** Record all required entity/location/card/plot/architect IDs and versions before model calls.
- [x] **P7-015 — Implement stage idempotency.** Requeued stages reuse or safely replace unapplied results and never double-apply.
- [x] **P7-016 — Implement heartbeat/stalled-job detection.** Mark retryable states and preserve diagnostic metadata.
- [x] **P7-017 — Implement startup recovery scan.** Find nonterminal turns and resume, retry, or mark blocked according to last durable stage.
- [x] **P7-018 — Implement cancellation flags.** Stop pending/provider work, distinguish pre/post-commit cancellation, and never roll back already committed canon silently.

## 7.3 Turn stages

- [x] **P7-020 — Implement `ACCEPTED` to `INPUT_VALIDATED`.** Preserve raw player input exactly while treating it as untrusted game intent.
- [x] **P7-021 — Implement `CONTEXT_SNAPSHOTTED`.** Verify expected versions and fail/retry on stale run state.
- [x] **P7-022 — Implement player-intent extraction.** Use deterministic parsing for explicit meta commands and structured AI only when needed; do not invent player thoughts.
- [x] **P7-023 — Implement basic architect placeholder contract.** Before advanced architect logic, produce neutral bounded guidance through a real stage result, not hidden hard-coded canon.
- [x] **P7-024 — Implement deterministic NPC candidate selection.** Include present, targeted, remote-contact, and triggered off-screen planners; apply relevance and call caps.
- [x] **P7-025 — Implement independently authorized NPC contexts.** Build one context per NPC with only that NPC's profile/private state, observations, memories available so far, relationship side, goals, and safe architect pressure.
- [x] **P7-026 — Implement NPC decision generation.** Support unaware/noticed/focused and none/think-only/speak/act/speak-and-act.
- [x] **P7-027 — Implement independent versus ordered NPC execution.** Parallelize only when no causal ordering is required; otherwise use deterministic order.
- [x] **P7-028 — Persist attempted actions before resolution.** Include player and NPC sources and preserve the player's stated intent.
- [x] **P7-029 — Generate server-side random outcomes.** Use seeded deterministic randomness when scenario rules need it; models may reference but not invent random rolls.
- [x] **P7-030 — Implement resolver context and call.** Provide canonical pre-turn state, attempts, rules, guidance, and random outcomes.
- [x] **P7-031 — Validate resolution proposals.** Validate IDs, presence, ability, paths, bounds, locks, knowledge rules, and player agency; perform at most bounded repair.
- [x] **P7-032 — Commit events and projections atomically.** Use short transaction and unique stage-application key.
- [x] **P7-033 — Create deterministic observations.** Persist one per eligible observer with modality and detail; absent entities receive none.
- [x] **P7-034 — Add optional observation interpretation.** AI may render nuance only for already eligible observers and cannot add recipients.
- [x] **P7-035 — Validate/persist NPC thoughts.** Apply class limits and reject thoughts for player entity.
- [x] **P7-036 — Validate/persist belief and goal proposals.** Require evidence available to the NPC and prevent belief from becoming world truth.
- [x] **P7-037 — Build narrator context.** Include player observations, safe render hints, style, recent visible narration, and perceived/public cards; exclude NPC thoughts and unrelated secrets.
- [x] **P7-038 — Stream narration.** Persist bounded deltas/segments, emit SSE events, and finalize canonical player-visible rendering.
- [x] **P7-039 — Queue post-turn work.** Enqueue memory, indexing, mutation, plot evaluation, summary checks, and snapshots without blocking visible completion.
- [x] **P7-040 — Mark turn complete.** Record timings, final narrative, background status, and last successful snapshot pointer.

## 7.4 SSE and gameplay APIs

- [x] **P7-050 — Implement turn stream endpoint.** Emit accepted, stage changes, narration start/delta/completion, background status, completed, failed, cancelled, and heartbeat.
- [x] **P7-051 — Implement monotonic SSE IDs and replay.** Honor `Last-Event-ID` within retention and prevent duplicate client application.
- [x] **P7-052 — Implement turn get/timeline APIs.** Return safe status, player-visible narrative, errors, and stage summaries.
- [x] **P7-053 — Implement cancel/retry APIs.** Retry only safe failed/unapplied stages using the original snapshot.
- [x] **P7-054 — Implement response-details API.** Return only explicitly inspectable fictional NPC thoughts, perceived stimulus, and concise character-level rationale tied to that response.
- [x] **P7-055 — Exclude provider reasoning.** Strip/ignore hidden reasoning blocks and never persist or return them as character thoughts.

## 7.5 Gameplay UI

- [x] **P7-060 — Build start-run screen.** Select playable entity, confirm revision/start location, select preset/overrides, show provider/embedding warnings, and create immutable configuration.
- [x] **P7-061 — Build transcript.** Render narration, NPC speech/action, player submissions, system notices, and scene separators accessibly.
- [x] **P7-062 — Build composer.** Multiline input, keyboard shortcut, input history, examples, draft persistence, limits, and duplicate-submit prevention.
- [x] **P7-063 — Build generation status.** Show current stage, connection/reconnect, stop/cancel, retry, and failure remediation.
- [x] **P7-064 — Build scene side panel.** Show current location and only player-known/present entities.
- [x] **P7-065 — Build NPC details drawer.** Fetch only on explicit action and display fictional thoughts with persistence class and perceived stimulus.
- [x] **P7-066 — Implement refresh/resume.** Rehydrate transcript and reconnect to an in-progress turn without resubmitting it.
- [x] **P7-067 — Handle partial stream failures.** Reconcile persisted final text, replayed deltas, and client state without duplicate prose.

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

- [ ] **P9-001 — Implement persisted architect state.** Track act/phase, dramatic question, tension/current target, active points, future beats, cooldowns, budget, used twists, deferred consequences, open hooks, and pacing history.
- [ ] **P9-002 — Initialize architect state from scenario.** Derive authored plot points and pacing settings when a run starts.
- [ ] **P9-003 — Integrate deterministic stagnation features.** Persist feature values per turn for audit and tuning.
- [ ] **P9-004 — Implement intervention budget/cooldowns.** Prevent repeated crises and support quiet scenes.
- [ ] **P9-005 — Implement architect context assembly.** Permit privileged truth/private state while labeling every layer and excluding provider reasoning.
- [ ] **P9-006 — Implement architect planning stage.** Persist guidance/proposals only; do not directly mutate canon.
- [ ] **P9-007 — Validate anti-railroading constraints.** Reject guidance that dictates player thoughts/choices or only one forced response.
- [ ] **P9-008 — Safely translate guidance for NPCs.** Express dramatic pressure without revealing secrets the NPC does not know.

## 9.2 Plot points and transitions

- [ ] **P9-010 — Implement deterministic precondition/resolution evaluator.** Use canonical facts and explicit supporting event IDs.
- [ ] **P9-011 — Implement ambiguous transition fallback.** Ask the architect only when deterministic rules cannot decide; validate returned evidence.
- [ ] **P9-012 — Implement status transition persistence.** Enforce valid graph and audit source/event support.
- [ ] **P9-013 — Implement AI plot-point proposals.** Persist as identifiable, editable proposals before they influence planning.
- [ ] **P9-014 — Implement proposal approval/edit/reject flows.** Respect scenario/run policy for automatic versus manual activation.
- [ ] **P9-015 — Handle ignored/failed plots.** Allow transformation, dormancy, failure, or abandonment without forcing player behavior.

## 9.3 Sudden events

- [ ] **P9-020 — Implement sudden-event proposal validation.** Require rationale, participants/location, canonical plausibility, severity, affordances, dependencies, and cooldown impact.
- [ ] **P9-021 — Route sudden events through resolver.** The resolver decides whether/how proposal becomes canon under normal patch/event validation.
- [ ] **P9-022 — Enforce player affordances.** Major interventions must preserve multiple plausible responses unless scenario rules make that impossible.
- [ ] **P9-023 — Add repetition/plausibility checks.** Compare recent twists and scenario rules before accepting proposals.

## 9.4 Dynamic story-card mutations

- [ ] **P9-030 — Implement mutation trigger detection.** Material entity/location changes, plot transitions, stale rumor/belief, elapsed turns, stale context, and explicit refresh.
- [ ] **P9-031 — Implement mutation queue/worker.** Idempotent, version-aware, separately rate-limited, and non-blocking.
- [ ] **P9-032 — Build card-specific authorized mutation context.** Include only relevant sources and prevent unrelated private content.
- [ ] **P9-033 — Validate mutation proposals.** Enforce expected version, mode, lock, paths, append-only restrictions, source facts, contradictions, and scope impact.
- [ ] **P9-034 — Implement consistency critic.** Check proposal against canon and locked content; critic can reject/suggest but not apply.
- [ ] **P9-035 — Implement `ai_suggest`.** Persist proposal for player approval with diff, sources, warnings, and confidence.
- [ ] **P9-036 — Implement `ai_mutable`.** Apply valid allowlisted patches automatically with attribution and complete history.
- [ ] **P9-037 — Implement static/manual-only/append-only behavior.** Add explicit tests proving forbidden mutations cannot apply.
- [ ] **P9-038 — Reindex after card commit.** Deactivate old version chunks and activate new chunks only after transaction success.
- [ ] **P9-039 — Implement rollback.** Create a new version copying selected historical content; preserve every intervening version.

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

---

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
