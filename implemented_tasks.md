# Implemented Tasks

- [x] **P0-001 — Create the product glossary.** Add `docs/product/glossary.md` defining scenario, scenario revision, run, branch, turn, stage, attempted action, canonical event, projection, observation, belief, memory, fictional inner thought, story card, card version, plot arc, plot point, architect, resolver, narrator, principal, visibility scope, retrieval document, retrieval chunk, embedding profile, snapshot, and save bundle.
- [x] **P0-002 — Document product scope.** Add `docs/product/scope.md` listing all v1 goals and explicit non-goals from the source plan. State that v1 is single-human-player and self-hosted.
- [x] **P0-003 — Document player-agency rules.** Specify that the player controls exactly one selected playable entity, AI cannot invent that entity's thoughts or intent, and the resolver can determine consequences without replacing attempted intent.
- [x] **P0-004 — Document narration modes.** Define supported v1 person/tense combinations and whether v1 supports only player-limited narration or also an explicitly configured omniscient mode. Ensure the default is player-limited.
- [x] **P0-005 — Define content-boundary behavior.** Document scenario-authored boundaries, provider refusals, how failures are presented, and that boundaries are data rather than prompt-policy overrides.
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
- [x] **P0-040 — Produce scenario-builder wireframes.** Cover all ten builder sections, validation links, autosave state, conflicts, graph views, card history, and entity-knowledge preview.
- [x] **P0-041 — Produce gameplay wireframes.** Cover transcript, composer, stage progress, cancellation, current scene, details drawer, journal, errors, retries, and reconnect behavior.
- [x] **P0-042 — Produce timeline/branch wireframes.** Cover fork, activate, rename, compare, narration regeneration, rewind, and confirmations.
- [x] **P0-043 — Produce settings/debug wireframes.** Cover models, per-role assignments, retrieval, embeddings, reindexing, provider health, backups, telemetry, and local-only inspectors.
- [x] **P0-044 — Define deployment defaults.** Document service names, default localhost ports, volume names/paths, reverse-proxy routing, health checks, and optional profiles.
- [x] **P0-045 — Create the threat model.** Cover credential leakage, prompt injection, private-context leakage, XSS through Markdown, CSRF, CORS, SSRF, malicious imports, oversized input, debug-route exposure, queue abuse, model tool abuse, and backup leakage.
- [x] **P0-046 — Create a privacy data-flow diagram.** Trace private entity data through database, retrieval, prompt assembly, provider call, AI audit, details UI, logs, exports, and deletion/archive behavior.
- [x] **P1-001 — Initialize pnpm workspace.** Add `pnpm-workspace.yaml`, root scripts, lockfile, and package manager pin.
- [x] **P1-002 — Pin Node.js.** Add `.nvmrc` and `package.json#engines` using a current LTS version; make CI use the same version.
- [x] **P1-003 — Configure Turborepo.** Define build, dev, lint, typecheck, test, integration, E2E, and clean pipelines with correct cache inputs/outputs.
- [x] **P1-004 — Configure strict TypeScript.** Enable `strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, declaration settings for libraries, path boundaries, and separate browser/server configs.
- [x] **P1-005 — Configure lint and formatting.** Add type-aware ESLint, import boundaries, no-floating-promises checks, security-relevant rules, Prettier, and root scripts.
- [x] **P1-006 — Add editor and repository hygiene files.** Add `.editorconfig`, `.gitignore`, `.dockerignore`, line-ending policy, and generated-file conventions.
- [x] **P1-007 — Add conventional change guidance.** Document commit conventions; add Changesets only if package publication is intentionally enabled.
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
- [x] **P1-030 — Implement validated server config.** Parse environment once, reject invalid critical values, distinguish development/test/production, and never serialize secret fields.
- [x] **P1-031 — Implement browser-safe runtime config.** Expose only explicitly allowlisted non-secret values.
- [x] **P1-032 — Add `.env.example`.** Include every planned variable with safe placeholders, comments, and no real keys.
- [x] **P1-033 — Implement Pino logger.** Add service name, environment, request/job correlation fields, redaction for authorization/cookie/API-key/header patterns, and human-readable dev transport.
- [x] **P1-034 — Implement API request IDs.** Accept a valid inbound correlation ID or generate one; return it and bind it to logs.
- [x] **P1-035 — Implement graceful process shutdown.** Stop accepting requests/jobs, close queue/database/Redis connections, flush telemetry, and exit with bounded timeout.
- [x] **P1-040 — Add PostgreSQL image/config.** Use PostgreSQL 16+ with pgvector, persistent volume, health check, non-default local credentials, and extension-ready initialization.
- [x] **P1-041 — Add Redis.** Configure persistent or explicitly disposable development storage, health check, and no public host binding by default.
- [x] **P1-042 — Add API Dockerfile.** Multi-stage build, locked dependencies, non-root runtime user, health check support, and minimal runtime files.
- [x] **P1-043 — Add worker Dockerfile.** Apply the same security and reproducibility requirements as API.
- [x] **P1-044 — Add web Dockerfile.** Build static assets and serve with Caddy or Nginx as a non-root user where practical.
- [x] **P1-045 — Add Compose stack.** Include web, API, worker, PostgreSQL, Redis, volumes, dependencies, health conditions, localhost binding, and restart policies.
- [x] **P1-046 — Add optional Caddy profile.** Route `/api` and SSE correctly, support local HTTP by default, and document remote TLS setup.
- [x] **P1-047 — Add development reset and seed commands.** Reset only after explicit confirmation or a development-only guard; never target production accidentally.
- [x] **P1-048 — Add service health/readiness behavior.** Liveness checks process health; readiness verifies required dependencies without leaking configuration details.
- [x] **P1-050 — Configure Vitest.** Separate unit and integration projects, deterministic timezone, cleanup hooks, and coverage output.
- [x] **P1-051 — Configure Testcontainers.** Provide shared PostgreSQL/pgvector and Redis helpers with isolation and reliable cleanup.
- [x] **P1-052 — Configure Playwright.** Add browser install, web-server orchestration, trace-on-retry, screenshot-on-failure, and no live-provider dependency.
- [x] **P1-053 — Add CI workflow.** Run install with frozen lockfile, format check, lint, typecheck, unit tests, integration tests, build, and container build.
- [x] **P1-054 — Add security CI basics.** Run dependency audit, secret scanning, and Dockerfile/container linting; establish an explicit documented exception process.
- [x] **P1-055 — Add test fixture rules.** Ensure fake keys are recognizable as fake, fixtures cannot call live providers by default, and tests isolate databases/queues.
- [x] **P2-001 — Implement branded IDs.** Add typed IDs for every major resource and safe parse/serialize helpers.
- [x] **P2-002 — Implement common metadata.** UTC timestamps, creation/update metadata, optimistic version, archive metadata, attribution/source, and schema version.
- [x] **P2-003 — Implement bounded scalar schemas.** Confidence, salience, urgency, importance, emotional valence/intensity, priorities, weights, and token budgets.
- [x] **P2-004 — Implement references.** Typed entity, location, story-card, plot-point, event, observation, memory, thought, turn, branch, and source references.
- [x] **P2-005 — Implement pagination/filter contracts.** Cursor pagination, stable sorting, search query limits, tag filters, and archived/current flags.
- [x] **P2-006 — Establish API error contract.** Machine code, human message, field issues, request ID, retryability, and safe details.
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
- [x] **P2-070 — Define `PlayerIntent`.** Speech, physical actions, targets, desired outcomes, assumptions, meta flag, ambiguity warnings, and evidence from raw input.
- [x] **P2-071 — Define `ArchitectPlan`.** Include pacing, stagnation, priorities, guidance, foreshadowing, optional sudden event/new point, cooldowns, and forbidden revelations.
- [x] **P2-072 — Define `NpcDecisionBatch`.** Include attention, reaction, speech, attempted actions, generated fictional thoughts, belief proposals, goal updates, and perceived evidence IDs.
- [x] **P2-073 — Define `ResolutionProposal`.** Include events, patches, failed actions, server-random references, plot evidence, and mutation signals.
- [x] **P2-074 — Define `NarrationPlan`.** Segments, speaker/event references, optional transition/title, and no private-thought field.
- [x] **P2-075 — Define `MemoryUpdateProposal`.** Include new memories, reinforcement, belief changes, suppression/forgetting, and authorized evidence IDs.
- [x] **P2-076 — Define `StoryCardMutationProposal`.** Include card/version, reason, sources, JSON Patch, semantic summary, confidence, scope impact, contradictions, and expiry suggestions.
- [x] **P2-077 — Generate JSON Schema/OpenAPI-compatible artifacts.** Ensure runtime validation and TypeScript types derive from one source.
- [x] **P3-001 — Configure Drizzle migrations.** Add deterministic generation/apply/check commands and environment safety guards.
- [x] **P3-002 — Enable PostgreSQL extensions.** Migrate `vector`, `pg_trgm`, and any required UUID/crypto extension; verify availability.
- [x] **P3-003 — Standardize database conventions.** Use UTC timestamps, typed IDs, snake_case tables, foreign-key naming, version columns, created/updated attribution, and archive semantics.
- [x] **P3-004 — Add migration CI drift check.** Fail when schema definitions and committed migrations diverge.
- [x] **P3-010 — Implement `app_settings`.** Support typed, non-secret settings and secret-reference metadata without storing browser-readable credentials.
- [x] **P3-011 — Implement `provider_model_cache`.** Store provider, model descriptor, capabilities, retrieval time, expiry, and last-known-good status.
- [x] **P3-012 — Implement `prompt_versions`.** Store prompt name/version/hash/schema/privacy metadata and activation status.
- [x] **P3-013 — Implement `ai_invocations`.** Store role, stage, model/provider, prompt version, authorized document IDs, usage, latency, validation, retries, correlation, and optional raw-retention flags.
- [x] **P3-014 — Implement `job_runs`.** Track queue, job key, attempts, heartbeat, stage, status, timestamps, and safe errors.
- [x] **P3-015 — Implement `audit_log`.** Store actor, action, resource, before/after references or bounded diff, request ID, and timestamp.
- [x] **P3-020 — Implement `scenarios` and `scenario_revisions`.** Enforce unique slug/revision and immutable published revision snapshots.
- [x] **P3-021 — Implement `entities`.** Preserve revision ownership, public/private fields, flags, structured attributes, constraints, and versions.
- [x] **P3-022 — Implement `entity_relationships`.** Enforce directional uniqueness per revision/source/target/type.
- [x] **P3-023 — Implement `locations`.** Enforce revision ownership and acyclic hierarchy in service logic with supporting constraints.
- [x] **P3-024 — Implement `location_edges`.** Preserve directionality and block/discovery/access metadata.
- [x] **P3-025 — Implement `story_cards`, `story_card_versions`, and current-version integrity.** Make versions immutable and current pointer transactionally consistent.
- [x] **P3-026 — Implement `story_card_links`.** Support every target type without dangling references.
- [x] **P3-027 — Implement `plot_arcs`, `plot_points`, and `plot_point_links`.** Preserve dependencies, source attribution, conditions, status, and visibility.
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
- [x] **P3-050 — Implement `retrieval_documents`.** Track source type/ID/version, run/scenario/branch, visibility, owner, hash, and active status.
- [x] **P3-051 — Implement `retrieval_chunks`.** Store text, tsvector, metadata, links, turn range, importance/salience/recency, content hash, scope, and active status.
- [x] **P3-052 — Implement `embedding_profiles`.** Store provider/model/dimensions/distance/status/generation and atomic active-profile metadata.
- [x] **P3-053 — Implement `chunk_embeddings`.** Use unconstrained vector storage plus profile/model/dimensions/hash/time.
- [x] **P3-054 — Implement `retrieval_audit`.** Record request principal, query metadata, selected/rejected chunk IDs, score components, budget decisions, and timing without full private text.
- [x] **P3-055 — Add required indexes.** Cover all foreign keys, tags, JSONB query fields, tsvector, trigrams, run timeline, memories, plot points, current cards, active thoughts, active memories, and idempotency.
- [x] **P3-056 — Add profile-specific HNSW index management.** Safely create/drop concurrent partial expression indexes using validated dimensions and profile IDs.
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
- [x] **P4-001 — Implement `/api/v1` routing and OpenAPI.** Register request/response schemas from `packages/contracts` and provide development docs without exposing secrets.
- [x] **P4-002 — Implement consistent API errors.** Map validation, not found, conflict, forbidden, rate limit, dependency failure, and internal errors.
- [x] **P4-003 — Implement request limits.** Apply route-specific body, query, multipart/import, and timeout limits.
- [x] **P4-004 — Implement optimistic-concurrency headers.** Support version field and/or `If-Match`; return current safe representation on conflict where useful.
- [x] **P4-005 — Implement audit attribution.** Attach local user/system actor and request ID to all mutations.
- [x] **P4-010 — Implement `GET /health/live`.** Process-only liveness.
- [x] **P4-011 — Implement `GET /health/ready`.** Check required database/Redis/migration readiness with safe output.
- [x] **P4-012 — Implement `GET /system/info`.** Return app version, schema version, feature flags, and redacted configuration status.
- [x] **P4-020 — Implement scenario list/create/get/patch.** Add pagination, search, tags/status filters, archive behavior, and conflicts.
- [x] **P4-021 — Implement clone.** Deep-copy current authored resources into a new draft with new IDs and preserved internal links.
- [x] **P4-022 — Implement validate.** Return actionable errors/warnings with section and field paths.
- [x] **P4-023 — Implement publish revision.** Refuse invalid drafts, snapshot all authored resources immutably, increment revision, and record audit metadata.
- [x] **P4-024 — Implement revision list/get/diff.** Prevent edits to published snapshots.
- [x] **P4-025 — Implement archive/unarchive.** Refuse destructive deletion when revisions/runs reference the scenario.
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
- [x] **P4-050 — Define versioned scenario JSON Schema.** Include manifest, content schema version, generated timestamp, and application compatibility.
- [x] **P4-051 — Implement scenario export.** Export one current draft or published revision with stable ordering and no secrets/runtime data.
- [x] **P4-052 — Implement scenario import validation.** Validate JSON structure, size, references, duplicate IDs, dangerous strings, and supported versions before writes.
- [x] **P4-053 — Implement transactional import.** Remap IDs safely, preserve internal links, and roll back the entire import on failure.
- [x] **P4-054 — Implement import migration hooks.** Upgrade older supported export versions without mutating the input file.
- [x] **P4-055 — Implement semantic round-trip comparison.** Ignore generated IDs/timestamps where appropriate while proving no authored meaning is lost.
- [x] **P5-001 — Implement router and layout.** Add dashboard, scenarios, runs, settings, and not-found routes with lazy loading/error boundaries.
- [x] **P5-002 — Implement TanStack Query client.** Add typed API client, safe retries, mutation invalidation, offline/connection state, and standardized errors.
- [x] **P5-003 — Implement responsive navigation.** Desktop-first sidebar plus accessible small-screen behavior.
- [x] **P5-004 — Implement theme support.** Light/dark/system, persistent non-secret preference, contrast-safe tokens, and no flash where practical.
- [x] **P5-005 — Implement command palette.** Keyboard accessible navigation/actions with focus restoration.
- [x] **P5-006 — Implement global status.** Show API connection, background work, configuration warnings, and recoverable errors.
- [x] **P5-007 — Implement accessibility baseline.** Landmarks, labels, focus indicators, reduced motion, keyboard paths, contrast, and live regions.
- [x] **P5-008 — Implement safe Markdown renderer.** Disable raw HTML, sanitize links/content, and test script/event-handler payloads.
- [x] **P5-010 — Implement recent scenarios and runs cards.** Add continue/edit/archive actions with loading/empty/error states.
- [x] **P5-011 — Implement create/import actions.** Validate files client-side only as convenience; rely on server validation for authority.
- [x] **P5-012 — Implement provider/retrieval health summary.** Show configured/not-configured status without secret values.
- [x] **P5-013 — Implement recent failures panel.** Show safe, actionable remediation and links to affected run/settings.
- [x] **P5-020 — Implement multi-section builder navigation.** Include premise/style, rules/boundaries, locations, entities, relationships, cards, plot arcs/points, start state, model/pacing, and validation/preview.
- [x] **P5-021 — Implement form schemas.** Use React Hook Form plus shared validation, preserve exact optional semantics, and map server field errors.
- [x] **P5-022 — Implement autosave.** Debounce safely, show saving/saved/error state, serialize writes, and prevent stale responses from overwriting newer edits.
- [x] **P5-023 — Implement conflict UI.** On optimistic conflict show local/server values and explicit reload, copy, or manual merge paths; never silently overwrite.
- [x] **P5-024 — Implement unsaved-change protection.** Protect navigation/refresh while a mutation is pending or failed.
- [x] **P5-025 — Implement search/filter/tagging and duplicate/archive actions.** Cover all resource collections.
- [x] **P5-026 — Implement validation navigation.** Deep-link each server issue to the exact section/resource/field and focus it.
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

- [x] A player can start, stream, save, refresh, resume, cancel, and retry a multi-turn run.
- [x] Canonical events/projections are transactional and narration is separate.
- [x] NPCs may speak, act, remain silent, or think.
- [x] Player thoughts/autonomous intent are blocked in domain, persistence, engine, and tests.
- [x] Worker restart does not duplicate committed events or patches.
- [x] SSE reconnect is correct and details are fetched only explicitly.
- [x] Core privacy canary tests pass.

---

# Phase 8 — Principal-aware retrieval, embeddings, beliefs, memory, and long-context control

## Goal

Implement bounded, auditable, access-scoped context assembly with lexical fallback, vector upgrade, memory curation, thought lifecycle, and leakage prevention.

## 8.1 Retrieval projection and chunking

- [x] **P8-001 — Implement source projectors.** Project scenario rules, profiles, locations/state, cards/versions, plots, events, observations, beliefs, memories, thoughts, relationships, and summaries.
- [x] **P8-002 — Separate chunks by visibility.** Never combine text from different scopes or owners; reject missing scope.
- [x] **P8-003 — Implement semantic chunkers.** Preserve story-card headings, one event per canonical chunk, observer-specific chunks, individual memories, and source links.
- [x] **P8-004 — Normalize and hash content.** Normalize whitespace predictably, preserve meaningful Unicode, compute stable hash, and avoid needless re-embedding.
- [x] **P8-005 — Implement activation/versioning.** Deactivate superseded chunks while retaining historical provenance.
- [x] **P8-006 — Process outbox indexing jobs idempotently.** Repeated projection jobs must converge without duplicate active chunks.

## 8.2 Authorized retrieval pipeline

- [x] **P8-010 — Implement typed retrieval requests.** Require principal, run/branch, stage, scene, participants, query, limits, and budget.
- [x] **P8-011 — Apply SQL authorization before scoring.** No unauthorized candidate may enter lexical/vector/graph ranking.
- [x] **P8-012 — Fetch mandatory context directly.** Current state, scene, active constraints, recent events, and role-specific essentials bypass search but still obey authorization.
- [x] **P8-013 — Implement PostgreSQL full-text retrieval.** Use tsvector, safe tsquery construction, aliases, and language/config behavior.
- [x] **P8-014 — Implement trigram/name retrieval.** Support misspellings and renamed aliases with thresholds and caps.
- [x] **P8-015 — Implement graph expansion.** Traverse explicit entity/location/card/plot links with depth, cycle, weight, and authorization limits.
- [x] **P8-016 — Implement recency/salience/location/participant/goal scoring.** Return per-component scores for audit.
- [x] **P8-017 — Implement candidate fusion.** Merge by chunk ID and combine lexical, vector, graph, and deterministic signals.
- [x] **P8-018 — Implement diversity controls.** Cap per source/type/owner and avoid redundant near-duplicates.
- [x] **P8-019 — Implement optional reranking.** Use a configured low-cost model only on authorized top candidates, with timeout/fallback.
- [x] **P8-020 — Implement role-specific budget fitting.** Preserve mandatory sections and output headroom; remove low-ranked optional context first.
- [x] **P8-021 — Record retrieval audits.** Store selected/rejected IDs, scores, limits, authorization principal, budget decisions, profile, and timing.

## 8.3 Embedding profile lifecycle

- [x] **P8-030 — Implement profile create/test/activate.** Validate provider, model, 1536 dimensions for the verified model, distance, and test vector before activation.
- [x] **P8-031 — Implement document/query vector search.** Use profile predicate and the matching cast/index expression.
- [x] **P8-032 — Implement changed-only embedding jobs.** Compare content hash/profile and batch safely.
- [x] **P8-033 — Implement full reindex CLI.** Add `pnpm embeddings:reindex` with progress, resume, cancellation, and dry-run/status options.
- [x] **P8-034 — Implement reindex API/UI job.** Show totals, completed, failed, ETA, active/new profile, and safe retry.
- [x] **P8-035 — Implement zero-downtime profile switch.** Continue old vectors while new profile builds, verify completeness, atomically activate, then retire old profile later.
- [x] **P8-036 — Preserve lexical-only mode.** All retrieval paths work with no embedding provider and surface a warning rather than block gameplay.

## 8.4 Belief and memory curation

- [x] **P8-040 — Implement per-entity memory curator jobs.** Supply only that entity's authorized observations, beliefs, memories, and thoughts.
- [x] **P8-041 — Validate memory proposals.** Require owner-scoped evidence IDs, valid types, bounded fields, and no unsupported facts.
- [x] **P8-042 — Implement belief updates from evidence.** Preserve uncertainty and contradictions; speech does not become fact automatically.
- [x] **P8-043 — Implement memory reinforcement/decay.** Update lifecycle fields deterministically and retain raw immutable observations.
- [x] **P8-044 — Implement duplicate memory merging.** Create consolidated versions with links to all sources and no visibility widening.
- [x] **P8-045 — Implement thought decay/consolidation.** Expire ephemeral thoughts, manage lingering/core thresholds, merge duplicates, and cap active counts.
- [x] **P8-046 — Index beliefs/memories/thoughts privately.** Scope every chunk to owner and ensure only authorized system/player-detail principals can retrieve it.
- [x] **P8-047 — Implement maintenance scheduling.** Queue curation after turns without blocking visible completion and expose background status.

## 8.5 Context assembly integration

- [x] **P8-050 — Replace basic NPC context with retrieval pipeline.** Preserve independent authorization per NPC.
- [x] **P8-051 — Replace narrator context with retrieval pipeline.** Permit only public/player-observed/player-known content.
- [x] **P8-052 — Integrate resolver/architect privileged retrieval.** Clearly label truth versus beliefs and preserve scope metadata.
- [x] **P8-053 — Integrate memory and mutation retrieval.** Use owner/card-specific requests and scope checks.
- [x] **P8-054 — Implement overflow degradation.** Drop optional retrieval, substitute stored summaries, and retry once without truncating rules/schema.
- [x] **P8-055 — Add retrieval trace inspector.** Local debug only; show IDs, metadata, scores, and budget decisions with private-text display behind an extra warning/authorization control.

## 8.6 Player-known journal

- [x] **P8-060 — Implement player-view knowledge APIs.** Return only player observations, known entities/locations/events/cards, and player-authored notes.
- [x] **P8-061 — Build journal UI.** Add known entities, locations, observed events, goals, encountered cards, and notes.
- [x] **P8-062 — Build retrieval/embedding status UI.** Show lexical/vector status and reindex progress without blocking play.

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

- [x] Retrieval always authorizes before scoring.
- [x] Relevant old facts are retrieved without dumping full history.
- [x] Lexical-only gameplay works with embeddings disabled.
- [x] Verified embeddings can be activated, indexed, queried, reindexed, and atomically switched.
- [x] Absent entities do not learn unseen events.
- [x] Memory, belief, and thought lifecycles are bounded, evidenced, and private.
- [x] All direct and multi-hop canary leakage tests pass.

---


