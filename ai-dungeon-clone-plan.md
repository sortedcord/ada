# AI Dungeon–Style Narrative Engine: Comprehensive Implementation Plan

## 1. Product Definition

Build an original, self-hosted, browser/PWA, single-human-player narrative game in TypeScript. The player controls exactly one entity. The AI controls the world, non-player entities, narration, memory maintenance, story-card evolution, and story architecture.

This is an original implementation inspired by the general category of AI-driven text adventures; do not copy proprietary AI Dungeon code, prompts, UI assets, names, or content.

### 1.1 Confirmed product decisions

- Deployment: self-hosted.
- Client: browser application/PWA served through Docker.
- Human players per run: one.
- The player controls one entity selected from the scenario.
- The human-controlled entity never receives AI-authored inner thoughts.
- NPC inner thoughts are not shown inline by default.
- A player may inspect NPC thoughts by opening “View details” for a particular response.
- NPC thoughts remain epistemically private from other entities even when the out-of-world human UI reveals them.
- Primary implementation language: TypeScript. Do not use Python.
- Typical generation models may support approximately one million context tokens, but the system must still use selective context assembly, RAG, summaries, and bounded prompt budgets.
- The embedding model will be configured later. Retrieval must work in lexical-only mode until embeddings are available, then support a complete reindex.

### 1.2 Core product outcomes

The completed system must support:

1. Scenario creation and editing.
2. Entity creation, including a selectable player entity.
3. Hierarchical and graph-based location creation.
4. Story-card creation and links to entities, locations, other cards, plot points, or global lore.
5. Versioned, dynamically mutating story cards.
6. Turn-based natural-language play.
7. AI-controlled NPC reactions, non-reactions, dialogue, actions, and explicit fictional inner thoughts.
8. Per-entity perception, beliefs, memories, secrets, and epistemic privacy.
9. A story architect that manages long-term pacing and plot points without directly overriding canonical state.
10. Relational persistence and vector retrieval.
11. Save, resume, regenerate, retry, branch, inspect, import, and export workflows.
12. Streaming generation, crash recovery, observability, testing, and self-hosted deployment.

### 1.3 Non-goals for the first production release

- Multiple simultaneous human players.
- Public hosted SaaS and billing.
- Social feeds or public scenario marketplace.
- Native mobile applications.
- Real-time voice interaction.
- AI-generated images, maps, or audio.
- A full tabletop combat rules engine unless a scenario explicitly defines one.

Design the domain so these can be added later, but do not let them delay the single-player release.

---

## 2. Architectural Principles and Invariants

These rules should be documented as architecture decision records and enforced in code and tests.

### 2.1 The database, not the model, owns canon

- Models propose actions, events, memories, thoughts, and state patches.
- The server validates proposals against schemas, permissions, current state, and invariants.
- Only validated events and patches become canonical.
- Narrative prose is a rendering of canonical events, not the source of truth.
- Never parse rendered prose later to reconstruct canonical state.

### 2.2 Separate truth, perception, belief, memory, and narration

Treat the following as different data layers:

1. **World truth**: what canonically occurred and the current authoritative state.
2. **Perception/observation**: what an entity could sense from an event.
3. **Belief**: what an entity currently thinks is true; this can be incomplete, uncertain, or false.
4. **Memory**: what an entity retains about observations, thoughts, emotions, and inferred facts.
5. **Narration**: prose shown to the player based on what the player entity perceives, plus permitted stylistic description.

A canonical fact must not automatically become an entity belief or memory.

### 2.3 Enforce epistemic privacy at query time

- Do not retrieve a global context and ask the model to ignore private content.
- Every context fetch must be scoped to an explicit principal and visibility policy.
- NPC prompts may contain only that NPC’s private state, its memories/beliefs/thoughts, public scenario rules, and currently observable information.
- The player-facing narrator may not reveal facts unavailable to the player entity unless the scenario explicitly uses an omniscient narration mode.
- The story architect and resolver are privileged system actors and may inspect world truth.
- An out-of-world debug/details UI may show NPC thoughts, but that content must never be fed to other entities.

### 2.4 Character thoughts are not model chain-of-thought

- “Inner thoughts” are explicit fictional character content requested through a structured output field.
- Do not store or display provider reasoning blocks, hidden chain-of-thought, scratchpads, or internal model analysis.
- Strip or ignore provider reasoning content unless needed by the provider protocol.
- NPC thought records are game state. Provider reasoning is not.

### 2.5 All mutable generated content is versioned and reversible

- Story-card mutations create new versions rather than destructive edits.
- Scenario edits use optimistic concurrency.
- Turns, state patches, and AI invocations have audit records.
- Regeneration creates an alternate turn/branch rather than silently overwriting history.
- Manual edits remain attributable to the player and can be locked against AI mutation.

### 2.6 Long context is a budget, not an excuse to dump the database

- Maintain explicit token budgets by context section.
- Prefer current authoritative state, recent events, and highly relevant memory over bulk history.
- Use stable prefixes and provider prompt caching where available.
- Preserve enough headroom for model output and retry behavior.
- Apply a hard server-side prompt limit even if the model advertises a one-million-token window.

### 2.7 Turn execution is a resumable workflow

- A turn is not one monolithic request.
- Persist each stage and its output.
- Use idempotency keys per run, turn, and stage.
- A worker crash must resume or safely retry without applying state twice.
- A run allows at most one canonical turn mutation at a time.

---

## 3. Recommended TypeScript Technology Stack

### 3.1 Repository and tooling

- Node.js current LTS, pinned in `.nvmrc` and `package.json` engines.
- TypeScript with `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes`.
- `pnpm` workspaces.
- Turborepo for workspace orchestration and caching.
- ESLint with type-aware rules.
- Prettier for formatting.
- Vitest for unit and integration tests.
- Playwright for browser end-to-end tests.
- Changesets if packages may later be published; otherwise conventional commits are sufficient.

### 3.2 Frontend

- React.
- Vite.
- TanStack Router.
- TanStack Query.
- Zustand for small local UI state only; keep server state in TanStack Query.
- React Hook Form plus Zod for scenario-builder forms.
- Tailwind CSS and an accessible component system such as shadcn/ui primitives.
- `vite-plugin-pwa` for installability and offline shell support.
- Markdown rendering with raw HTML disabled and sanitization enabled.

### 3.3 Backend

- Fastify with TypeScript.
- TypeBox or Zod request/response schemas; use one schema source to generate OpenAPI.
- REST for commands and resource editing.
- Server-Sent Events for turn-stage updates and streamed narration.
- Signed, same-origin HTTP-only session cookies if local authentication is enabled.
- BullMQ for resumable turn and maintenance jobs.
- Redis for BullMQ, short-lived locks, cancellation flags, and transient stream fan-out.

### 3.4 Persistence

- PostgreSQL 16 or newer.
- `pgvector` for vector storage and approximate nearest-neighbor search.
- PostgreSQL full-text search, `pg_trgm`, JSONB, recursive CTEs, and advisory locks.
- Drizzle ORM and Drizzle migrations; use typed raw SQL where pgvector or advanced PostgreSQL features exceed ORM support.
- Do not introduce a separate vector service initially. PostgreSQL plus pgvector provides simpler backups, transactions, ACL filtering, and self-hosting. Keep a `VectorStore` interface so Qdrant can be added later if scale requires it.

### 3.5 Deployment

Docker Compose services:

- `web`: built static React assets served by Caddy or Nginx.
- `api`: Fastify API and SSE endpoints.
- `worker`: BullMQ workers using the same backend packages.
- `postgres`: PostgreSQL with pgvector.
- `redis`: queue and ephemeral coordination.
- `caddy`: optional TLS/reverse proxy and same-origin routing.

Bind to `127.0.0.1` by default. Remote exposure must be an explicit configuration choice.

### 3.6 Suggested monorepo layout

```text
apps/
  web/
  api/
  worker/
packages/
  ai/
  config/
  contracts/
  db/
  domain/
  engine/
  observability/
  prompts/
  retrieval/
  testkit/
infra/
  docker/
  caddy/
  postgres/
docs/
  adr/
  product/
  prompts/
  runbooks/
scripts/
```

Package responsibilities:

- `contracts`: API request/response/event schemas and generated types.
- `domain`: pure domain entities, policies, validators, and state-transition rules.
- `db`: schema, migrations, repositories, and transaction helpers.
- `ai`: provider-neutral model interfaces and provider adapters.
- `prompts`: versioned prompt templates and structured-output schemas.
- `retrieval`: indexing, chunking, access-scoped retrieval, ranking, and context assembly.
- `engine`: turn orchestration and stage handlers.
- `observability`: logs, tracing, metrics, and AI usage instrumentation.
- `testkit`: factories, fixtures, fake providers, deterministic embeddings, and leak-test utilities.

---

## 4. AI Provider Integration

## 4.1 Use the same custom provider currently configured for pi

The current pi custom provider is an OpenAI Responses-compatible endpoint with dynamic model discovery:

- Provider ID: `aditya-gupta`
- Base URL: `https://ai.adityagupta.dev/v1`
- Model discovery: `GET /v1/models`
- Generation API shape: OpenAI Responses API
- Authentication: `Authorization: Bearer <key>`
- Additional required header used by the pi extension: `x-bf-vk: <key>`

Do not couple the game runtime to the pi TUI or read pi’s credential files directly. Implement a provider adapter against the same endpoint and supply its secret through the game’s environment or secret file.

Example environment contract:

```dotenv
GENERATION_PROVIDER=aditya-gupta
GENERATION_BASE_URL=https://ai.adityagupta.dev/v1
GENERATION_API_KEY=replace-me
GENERATION_API=openai-responses
GENERATION_MODELS_REFRESH_SECONDS=3600
GENERATION_DEFAULT_MODEL=replace-with-discovered-id
```

Never expose the generation API key to the browser, return it from a settings endpoint, or include it in logs.

### 4.2 Provider-neutral interfaces

Define these interfaces before implementing game prompts:

```ts
interface GenerationProvider {
  discoverModels(signal?: AbortSignal): Promise<ModelDescriptor[]>;
  generateObject<T>(request: StructuredGenerationRequest<T>): Promise<GenerationResult<T>>;
  streamText(request: TextGenerationRequest): AsyncIterable<GenerationEvent>;
  countTokens?(request: TokenCountRequest): Promise<TokenCountResult>;
}

interface EmbeddingProvider {
  describeModel(): Promise<EmbeddingModelDescriptor>;
  embedDocuments(texts: string[], signal?: AbortSignal): Promise<number[][]>;
  embedQuery(text: string, signal?: AbortSignal): Promise<number[]>;
}
```

Required generation-provider features:

- Dynamic model discovery with a persisted last-known-good model catalog.
- Per-model capabilities: context window, output limit, image support, reasoning support, tool/JSON-schema support.
- Streaming text.
- Strict structured outputs where supported.
- Schema validation and bounded repair retries when strict output is unavailable.
- AbortSignal cancellation.
- Timeouts by request role.
- Retry classification for 429, 5xx, transport failures, and context overflow.
- Exponential backoff with jitter.
- Usage and cost capture.
- Request IDs and correlation IDs.
- Sanitized request/response metadata logging.
- Provider-specific compatibility flags without leaking them into domain code.

Use the official `openai` JavaScript SDK with a custom `baseURL` and default headers if the endpoint is fully compatible. Otherwise, implement the small Responses API transport directly with `fetch`, keeping it behind the interface.

### 4.3 Model role configuration

Allow one model to serve all roles initially, but configure models independently for:

- `architectModel`
- `npcModel`
- `resolverModel`
- `narratorModel`
- `memoryModel`
- `mutationModel`
- `criticModel`

For each role configure:

- Provider and model ID.
- Temperature/sampling settings.
- Maximum output tokens.
- Timeout.
- Retry count.
- Reasoning effort if supported.
- Prompt budget.
- Whether parallel calls are allowed.

The settings UI must show discovered models, capability warnings, and a “Test model” action.

### 4.4 Embedding provider deferred configuration

Create the complete embedding integration now, but permit it to be disabled until the user supplies a model.

Environment/configuration fields:

```dotenv
EMBEDDING_ENABLED=false
EMBEDDING_PROVIDER=
EMBEDDING_BASE_URL=
EMBEDDING_API_KEY=
EMBEDDING_MODEL=
EMBEDDING_DIMENSIONS=
EMBEDDING_BATCH_SIZE=64
EMBEDDING_DISTANCE=cosine
```

Required behavior:

- With embeddings disabled, hybrid retrieval degrades to full-text, graph, recency, and salience ranking.
- The UI displays a non-blocking “semantic retrieval not configured” warning.
- When configured, validate vector dimensions before enabling indexing.
- Provide `pnpm embeddings:reindex` and an admin UI reindex action.
- Store embedding model, dimensions, normalized-content hash, and creation time with each vector.
- Re-embed only changed chunks.
- Continue serving old vectors while a new model is being indexed, then atomically switch the active embedding profile.

### 4.5 Prompt and output contracts

Every AI stage must have:

- A named, versioned prompt.
- A typed input builder.
- A JSON Schema/TypeBox/Zod output contract.
- A maximum context budget.
- Fixtures and eval cases.
- A failure policy.
- A privacy classification.
- A record in `ai_invocations`.

Do not let arbitrary prompt strings spread through business logic.

---

## 5. Domain Model

## 5.1 Scenario

A scenario is the authored template used to start one or more runs.

Fields:

- ID, slug, title, subtitle.
- Description and premise.
- Genre, tone, themes, content boundaries.
- Narrative person and tense.
- World rules and magic/technology assumptions.
- Default narration style.
- Start location.
- Start date/time or fictional chronology marker.
- Scenario-level model-role overrides.
- Scenario-level retrieval and pacing settings.
- Status: draft, valid, archived.
- Current revision number.
- Created and updated timestamps.

Requirements:

- Autosave drafts.
- Explicit validation before play.
- Immutable revision snapshot when a run starts.
- Import/export as versioned JSON.
- Clone scenario.
- Archive rather than destructive delete when runs reference it.

## 5.2 Entity

Use “entity” broadly so the system can represent:

- Player-capable characters.
- NPCs.
- Creatures.
- Factions.
- Organizations.
- Intelligent artifacts.
- Non-cognitive objects when story relevance requires them.

Fields:

- Identity: name, aliases, pronouns, kind, tags.
- Public description.
- Private canonical description.
- Appearance and distinguishing traits.
- Personality facets.
- Speech style.
- Values, drives, goals, fears, desires.
- Capabilities and limitations.
- Secrets.
- Starting location.
- Playable flag.
- Cognitive flag.
- Alive/active status.
- Structured attributes and scenario-defined stats.
- AI behavior constraints.
- Mutation policy for AI-managed fields.

Rules:

- Exactly one playable entity is selected per run.
- The selected player entity is controlled only by player commands.
- The AI must not generate inner thoughts, hidden intentions, or autonomous actions for the player entity.
- The resolver may determine consequences of the player’s attempted action but may not replace the attempted intent with a different intent.

## 5.3 Entity relationships

Relationships are directional. A relationship from A to B may differ from B to A.

Fields:

- Source and target entity.
- Relationship type.
- Publicly observable relationship state.
- Source-private feelings and beliefs.
- Canonical relationship facts.
- Affinity, trust, fear, obligation, suspicion, attraction, hostility, or custom dimensions.
- History summary.
- Last changed turn.

The relationship projection supplied to an NPC must contain only that NPC’s side plus knowledge it legitimately possesses.

## 5.4 Location

Support both hierarchy and connectivity.

Fields:

- Name, aliases, type, tags.
- Public description.
- Private canonical details and secrets.
- Parent location.
- Coordinates or abstract map position, optional.
- Environmental state.
- Capacity and access rules.
- Sensory properties.
- Current hazards.
- Mutation policy.

Location edges:

- Source and destination.
- Directionality.
- Travel description.
- Travel time/cost.
- Access requirements.
- Visibility or discoverability.
- Current blocked/open state.

Entity presence must reference the most specific known location. A location service should derive ancestors and nearby connected locations.

## 5.5 Story cards

Story cards are modular context/state records. Types may include:

- Lore.
- Character context.
- Location context.
- Faction context.
- Item context.
- Rule.
- Historical event.
- Rumor.
- Theme/style guidance.
- Custom.

Fields:

- Title, card type, tags.
- Canonical body.
- Optional player-visible body.
- Activation hints/keywords.
- Priority and token budget.
- Scope: global, location, entity, run, or private to an entity.
- Mutation policy: static, manual-only, append-only, AI-mutable, AI-suggest-only.
- Lock flag.
- Validity/effective turn range.
- Current version.
- Source: player, import, architect, mutation worker.

Links:

- Card to entity.
- Card to location.
- Card to another card.
- Card to plot point.
- Relation type and weight.

Mutation workflow:

1. A mutator proposes a typed patch and reason.
2. The server verifies mutation policy and field allowlist.
3. A consistency check compares the proposal with canon and locked content.
4. Store a new immutable card version and diff.
5. Update the current-version pointer transactionally.
6. Mark old retrieval chunks inactive.
7. Queue re-indexing for the new version.
8. Expose history, source, and rollback in the UI.

## 5.6 Plot points and story architecture

A plot point contains:

- Title and internal description.
- Source: player-authored or AI-authored.
- Priority.
- Status: proposed, dormant, available, foreshadowed, active, resolved, failed, abandoned.
- Preconditions.
- Desired dramatic outcome.
- Forbidden outcomes.
- Involved entities and locations.
- Foreshadowing cues.
- Escalation options.
- Resolution conditions.
- Earliest/latest preferred turn.
- Whether it is visible to the player.
- Parent arc and ordering dependencies.

The architect may generate plot points during play, but generation must be persisted as a proposal before it influences canon. AI-created points must be identifiable and editable.

## 5.7 Run, branch, turn, action, event

### Run

A run pins a scenario revision and contains runtime projections.

Fields:

- Scenario/revision.
- Selected player entity.
- Status.
- Active branch.
- Current canonical turn.
- World time.
- Random seed.
- Narrative settings.
- Model-role snapshot.
- Retrieval-profile snapshot.
- Last successful snapshot.

### Branch

- Parent branch.
- Fork turn.
- Label.
- Active/canonical flag.
- Creation reason: regeneration, player rewind, edit, debug.

### Turn

- Branch and turn number.
- Parent turn.
- Raw player input.
- Parsed intent, if used.
- Status/stage.
- Start/end timestamps.
- Failure and retry metadata.
- Final player-visible narrative.
- Idempotency key.

### Action

Actions capture attempted behavior before resolution:

- Actor.
- Action type: speech, movement, interaction, attack, wait, observation, custom.
- Target references.
- Intent.
- Preconditions assumed by actor.
- Visibility.
- Source: player or NPC.

### Canonical event

Events capture what actually happened:

- Event type.
- Location and world time.
- Participants.
- Canonical description.
- Structured fact changes.
- State patches.
- Causal parent events.
- Visibility/perception hints.
- Salience and emotional weight.

Use append-only canonical events and update query-friendly projections in the same database transaction.

## 5.8 Observation, belief, and memory

### Observation

An observation is an entity-specific perception of an event.

Fields:

- Observer entity.
- Source event.
- Modality: sight, sound, touch, inferred, reported, magical, system-defined.
- Perceived content.
- Detail level.
- Confidence.
- Distortions/occlusion.
- Turn observed.

### Belief

A belief may be true, false, or uncertain without exposing truth to the entity prompt.

Fields:

- Entity owner.
- Subject/predicate/object or normalized proposition.
- Natural-language rendering.
- Confidence.
- Source observations/memories/entities.
- First learned and last reinforced turns.
- Contradicts/supersedes links.
- Status: active, doubted, rejected, forgotten.
- Salience.

### Memory

Memory types:

- Episodic: remembered experience.
- Semantic: consolidated fact/belief.
- Emotional: affect attached to a person/event/place.
- Relationship: interpersonal history.
- Goal/commitment: promise, obligation, plan.
- Procedural: learned method or habit.

Fields:

- Entity owner.
- Source observation/event/thought.
- Content.
- Importance.
- Emotional valence and intensity.
- Confidence.
- Accessibility.
- Created/reinforced/last-recalled turns.
- Decay rate.
- Status: active, suppressed, forgotten, superseded.

Raw observations remain immutable. Consolidated memories can evolve through versioned updates.

## 5.9 NPC inner thoughts

Thought persistence classes:

- **Ephemeral**: relevant only to the current decision/turn; expires quickly.
- **Lingering**: remains active across turns until resolved, contradicted, or decayed.
- **Core**: enduring private attitude, fixation, fear, suspicion, or intention; requires high evidence or explicit scenario setup.

Fields:

- NPC entity.
- Turn and triggering event.
- Explicit fictional thought text.
- Persistence class.
- Salience, urgency, emotional valence.
- Expiration/decay policy.
- Reinforcement count.
- Target entity/location/plot point, optional.
- Status: active, resolved, contradicted, expired.
- Player-inspectable flag.

Rules:

- Never create thought records for the player entity.
- Thoughts are private to the owning NPC in all AI context assembly.
- Thoughts do not become canonical world facts merely because the NPC thinks them.
- Repeated or important thoughts may influence beliefs, goals, and future actions.
- Limit active thoughts per NPC and consolidate duplicates.
- “View details” fetches thoughts separately so they are not accidentally included in normal narrative payloads.

---

## 6. Database Design

Create explicit migrations for at least these tables.

### 6.1 Configuration and auditing

- `app_settings`
- `provider_model_cache`
- `prompt_versions`
- `ai_invocations`
- `job_runs`
- `audit_log`

### 6.2 Scenario authoring

- `scenarios`
- `scenario_revisions`
- `entities`
- `entity_relationships`
- `locations`
- `location_edges`
- `story_cards`
- `story_card_versions`
- `story_card_links`
- `plot_arcs`
- `plot_points`
- `plot_point_links`

### 6.3 Runtime

- `runs`
- `run_branches`
- `turns`
- `turn_stage_results`
- `actions`
- `events`
- `event_participants`
- `event_facts`
- `observations`
- `beliefs`
- `belief_evidence`
- `memories`
- `memory_links`
- `inner_thoughts`
- `run_entity_state`
- `run_location_state`
- `run_story_card_state`
- `architect_state`
- `run_snapshots`
- `narrative_segments`

### 6.4 Retrieval

- `retrieval_documents`
- `retrieval_chunks`
- `embedding_profiles`
- `chunk_embeddings`
- `retrieval_audit`

Suggested `retrieval_chunks` metadata:

- Source type and source ID.
- Source version.
- Run/scenario/branch.
- Owner entity, if private.
- Visibility scope.
- Location/entity/card links.
- Turn range.
- Importance, salience, recency timestamp.
- Plain text.
- `tsvector` search document.
- Content hash.
- Active flag.

Suggested `chunk_embeddings` fields:

- Chunk ID.
- Embedding profile ID.
- Model ID.
- Dimensions.
- Content hash.
- `vector` value.
- Created time.

Because the embedding dimension is not known yet, use an unconstrained pgvector `vector` column initially. Once a profile is configured, create a profile-specific partial expression HNSW index by casting to its dimension, for example:

```sql
CREATE INDEX CONCURRENTLY chunk_embeddings_model_hnsw
ON chunk_embeddings
USING hnsw ((embedding::vector(1536)) vector_cosine_ops)
WHERE embedding_profile_id = '...';
```

The query must use the same cast and profile predicate. Automate index creation through an embedding-profile activation migration/job. Do not create a fake dimension now.

### 6.5 Important constraints and indexes

- Unique scenario slug.
- Unique `(scenario_id, revision_number)`.
- Unique `(run_id, branch_id, turn_number)`.
- Unique turn-stage idempotency key.
- Unique active story-card version pointer consistency.
- Check that a run’s player entity is playable and belongs to the scenario revision.
- Check that inner thoughts never reference the player entity; enforce in service logic and a database trigger if practical.
- Index all foreign keys.
- GIN indexes for tags, JSONB fields used in filters, and `tsvector`.
- Trigram indexes for entity/location/card name search.
- Composite indexes for run timeline, entity memory retrieval, and active plot points.
- Partial indexes for active memories, active thoughts, and current card versions.

### 6.6 Transactions and concurrency

- Use PostgreSQL advisory locks keyed by run ID during canonical state application.
- Do not hold database transactions open while waiting on model calls.
- Persist stage input snapshot, release transaction, call model, persist raw/validated output, then apply inside a short transaction.
- Compare the expected run version before applying a stage result.
- Make state application idempotent with unique stage-application keys.
- Use optimistic version columns on editable scenario resources.

---

## 7. Epistemic Privacy and Knowledge Model

## 7.1 Context principals

Every retrieval/context request must declare one of these principals:

- `ARCHITECT`: may inspect all world truth and private state.
- `RESOLVER`: may inspect all state relevant to resolving proposed actions.
- `NARRATOR`: receives canonical events plus only the observations available to the player entity; it does not receive unrelated secrets.
- `NPC(entityId)`: receives only this entity’s authorized context.
- `MEMORY_CURATOR(entityId)`: receives only this entity’s observations, memories, beliefs, and thoughts.
- `PLAYER_VIEW(entityId)`: receives player-perceivable narrative and explicitly requested out-of-world details through separate endpoints.
- `ADMIN_DEBUG`: available only through a clearly marked local debug interface.

Implement `KnowledgePolicy.canRead(principal, resource)` in domain code and mirror coarse filters in SQL.

## 7.2 Visibility scopes

At minimum:

- `world_truth`
- `public_scenario`
- `scene_observable`
- `entity_private`
- `player_out_of_world_detail`
- `architect_private`
- `admin_only`

Every retrieval chunk must carry an explicit scope. Missing scope is a validation error, not “public by default.”

## 7.3 Observation generation

After canonical events are resolved:

1. Determine entities physically present or otherwise able to perceive the event.
2. Apply location topology, line-of-sight, concealment, distance, sensory capabilities, attention, and event visibility.
3. Create an observation per eligible entity.
4. Allow different detail and interpretation per observer.
5. Do not create observations for absent entities unless information is communicated later.
6. Communication creates a new event/observation; it does not grant direct access to the original event.

Start with deterministic visibility rules. Use an AI perception pass only where nuanced interpretation is required, and validate that the resulting observer set is a subset of deterministically eligible entities.

## 7.4 Belief and misinformation behavior

- NPCs may infer beliefs from partial observations.
- NPCs may lie; their speech creates observations of what was said, not proof that the statement is true.
- Contradictory evidence adjusts confidence rather than deleting history.
- Memory summaries must phrase uncertain beliefs as beliefs, not canonical facts.
- Architect and resolver prompts must distinguish canonical truth from entity beliefs.

## 7.5 Leakage prevention tests

Create automated tests that seed unique “canary secrets” into private scopes and verify they never appear in unauthorized:

- NPC prompts.
- Narrator prompts.
- Retrieval results.
- Player-visible narrative.
- Memory consolidation for another entity.
- Story-card mutation context for unrelated cards.

Log context document IDs, not full secret text, in leakage test diagnostics.

---

## 8. RAG and Context Assembly Pipeline

## 8.1 Content to index

Index versioned chunks for:

- Scenario premise and rules.
- Entity public and private profiles, with separate visibility.
- Location descriptions and active location state.
- Story cards and card versions.
- Plot points and architect plans.
- Canonical events.
- Per-entity observations.
- Per-entity beliefs.
- Per-entity memories.
- Per-entity NPC thoughts.
- Relationship state.
- Turn summaries and arc summaries.

Never combine text with different visibility scopes into one chunk.

## 8.2 Chunking rules

- Preserve semantic units instead of fixed-size token slicing whenever possible.
- One small story card can be one chunk.
- Large cards split by headings, preserving card/version metadata.
- Each event gets a canonical chunk and separate observer-specific chunks.
- Memories are individual chunks; consolidated summaries reference source memory IDs.
- Include stable IDs in metadata, not in prose.
- Normalize whitespace before hashing and embedding.
- Keep chunks small enough to retrieve precisely, generally hundreds rather than tens of thousands of tokens.

## 8.3 Retrieval sequence

For every AI role:

1. Build a typed retrieval request from the stage, run, principal, current location, participants, and player input.
2. Apply SQL authorization filters before scoring.
3. Fetch mandatory context directly: current state, current scene, active constraints, and recent turns.
4. Perform lexical search over authorized chunks.
5. Perform vector search if an embedding profile is active.
6. Traverse explicit graph links for related entities, locations, story cards, and plot points.
7. Merge candidates by chunk ID.
8. Score with weighted components:
   - Semantic similarity.
   - Lexical relevance.
   - Graph/link relevance.
   - Recency.
   - Salience/importance.
   - Current-location proximity.
   - Participant match.
   - Unresolved-goal or active-plot relevance.
9. Apply diversity/max-per-source limits.
10. Optionally rerank the top candidates with a low-cost model.
11. Fit candidates into role-specific token budgets.
12. Record selected and rejected chunk IDs in `retrieval_audit`.

## 8.4 Context sections and budgets

Build prompts from labeled sections:

- System and role contract.
- Scenario immutable rules.
- Current authoritative state.
- Current scene and participants.
- Principal-private state.
- Recent turns/events.
- Retrieved long-term context.
- Active plot/architect guidance, if authorized.
- Current command/task.
- Output schema.

Set hard percentages or token limits per section. Reserve output headroom and a safety margin. If over budget:

1. Remove low-ranked retrieved chunks.
2. Replace older recent turns with summaries.
3. Compress verbose card text through stored summaries.
4. Never truncate output schema or critical constraints.

## 8.5 Summarization and consolidation

Create background jobs for:

- Scene summaries every configurable number of turns.
- Arc/chapter summaries.
- Per-entity memory consolidation.
- Duplicate memory merging.
- Thought decay and consolidation.
- Story-card compaction when append-only history becomes large.

Summaries must retain source links and privacy scope. A summary cannot have broader visibility than any source it incorporates.

## 8.6 Retrieval evaluation

Build a fixture suite that asks known questions and measures:

- Recall of required facts.
- Exclusion of private facts.
- Recency behavior.
- Retrieval of linked cards with weak keyword overlap.
- Handling of renamed entities and aliases.
- Behavior before and after embedding activation.
- Stability across reindexing.

---

## 9. Turn Engine

## 9.1 Turn state machine

Recommended stages:

1. `ACCEPTED`
2. `INPUT_VALIDATED`
3. `CONTEXT_SNAPSHOTTED`
4. `ARCHITECT_PLANNED`
5. `NPCS_SELECTED`
6. `NPC_DECISIONS_GENERATED`
7. `ACTIONS_RESOLVED`
8. `EVENTS_COMMITTED`
9. `OBSERVATIONS_CREATED`
10. `NARRATION_GENERATING`
11. `NARRATION_COMMITTED`
12. `MEMORY_UPDATES_QUEUED`
13. `MUTATIONS_QUEUED`
14. `COMPLETED`

Failure states:

- `CANCELLED`
- `RETRYABLE_FAILURE`
- `BLOCKED_CONFIGURATION`
- `FAILED`

Persist every transition.

## 9.2 Detailed turn workflow

### Step 1: Accept player input

- Require a run ID, active branch, expected current turn/version, and idempotency key.
- Reject blank or oversized input.
- Preserve raw input exactly.
- Treat input as game-world intent, never as trusted system instructions.
- Return turn ID immediately and start SSE progress updates.

### Step 2: Snapshot pre-turn state

Capture IDs/versions for:

- Current run projection.
- Player and present NPC states.
- Current location state.
- Active card versions.
- Active plot points.
- Current architect state.

This makes retries reproducible and detects concurrent mutation.

### Step 3: Parse/classify the player action

Use deterministic parsing for explicit UI commands and a structured model call for free text if needed.

Output fields:

- Intended speech.
- Intended physical actions.
- Targets.
- Desired outcomes.
- Assumptions.
- Meta command flag.
- Ambiguity warnings.

Do not reinterpret the player’s motivation or generate player thoughts.

### Step 4: Architect planning

The architect reads privileged global state and outputs guidance, not canon:

- Current dramatic phase.
- Active plot-point priorities.
- Desired pressure/escalation.
- Candidate sudden event, if justified.
- Foreshadowing suggestions.
- Pacing score and stagnation assessment.
- Constraints for the resolver/narrator.
- Proposed new plot point, optional.

The architect should have intervention cooldowns and a configurable intervention budget so every quiet turn does not become a sudden crisis.

### Step 5: Select potentially active NPCs

Use deterministic candidates first:

- Present in the same perceptual scene.
- Directly targeted.
- Communicating remotely.
- Responsible for an active off-screen plan whose trigger fired.

Score candidates by relevance, relationship, urgency, active goals, and recent participation. NPCs may choose `no_action`.

### Step 6: Generate NPC cognition and decisions

For each selected NPC, build an independently authorized prompt containing:

- Public scenario rules.
- NPC profile and private state.
- NPC memories, beliefs, active thoughts, and goals.
- Current observations only.
- Relationship state from the NPC’s perspective.
- Relevant architect pressure expressed without leaking secrets the NPC does not know.

Structured output:

```ts
interface NpcDecision {
  entityId: string;
  attention: "unaware" | "noticed" | "focused";
  reaction: "none" | "think_only" | "speak" | "act" | "speak_and_act";
  speech?: string;
  attemptedActions: ProposedAction[];
  generatedThoughts: Array<{
    text: string;
    persistence: "ephemeral" | "lingering" | "core";
    salience: number;
    urgency: number;
    targetRef?: EntityRef | LocationRef | PlotPointRef;
  }>;
  beliefProposals: BeliefProposal[];
  goalUpdates: GoalUpdateProposal[];
}
```

The model may choose not to react. Prevent every NPC from responding every turn.

Parallelize NPC calls only when their decisions are independent. If ordering matters, process in initiative/causal order or use one multi-NPC planning call whose output is still separated by entity.

### Step 7: Resolve actions

The resolver receives:

- Canonical pre-turn state.
- Player attempted actions.
- NPC attempted actions.
- Scenario rules.
- Architect guidance.
- Random outcomes generated by the server, if rules need randomness.

It outputs proposed canonical events and explicit JSON patches. The server validates:

- Referenced IDs exist.
- Actors are able and present.
- Patch paths are allowlisted.
- Numeric changes are within configured bounds.
- No entity gains knowledge directly through a world-state patch.
- No action controls the player entity beyond consequences.
- Locked scenario/card fields are untouched.

Reject or repair invalid output. Commit events and projections atomically.

### Step 8: Create observations

Run deterministic perception followed by optional AI rendering of observer-specific interpretations. Persist observations before narration.

### Step 9: Generate player narration

The narrator receives:

- Player entity’s observations.
- Canonical event render hints that are safe for the player.
- Current prose style.
- Recent player-visible narrative.
- Relevant public/perceived cards.

The narrator must not receive hidden NPC thoughts. It outputs player-facing prose and structured references to dialogue/action segments. Stream prose over SSE, but persist chunks and a final canonical text.

### Step 10: Persist NPC thoughts and belief/goal proposals

- Validate and store generated fictional thoughts.
- Apply limits and decay policy.
- Validate belief and goal updates against the NPC’s available evidence.
- Thoughts for the player entity are rejected.

### Step 11: Queue post-turn work

- Entity memory updates.
- Embedding/reindex jobs.
- Story-card mutation evaluation.
- Plot-point transition evaluation.
- Summary/consolidation checks.
- Snapshot creation.

The turn can become player-visible once core events, observations, and narration are committed. Mark background maintenance separately so slow embeddings do not block play.

## 9.3 Stagnation detection

Compute deterministic features:

- Turns since a significant world-state change.
- Turns since a new goal, location, conflict, or revelation.
- Repeated player intents.
- Repeated NPC no-actions.
- Active plot points with no progress.
- Number of unresolved hooks.
- Dialogue-only streak length.
- Scene duration.

The architect combines these features with narrative judgment. Suggested thresholds must be configurable per scenario.

## 9.4 Sudden events

A sudden event proposal must include:

- Trigger/rationale.
- Involved entities/location.
- Why it is plausible from existing canon.
- Severity.
- Expected player affordances.
- Facts it depends on.
- Cooldown impact.

The resolver, not the architect, decides whether and how it becomes canon. Sudden events should create choices rather than force a single outcome.

## 9.5 Regenerate, retry, edit, and branch

- **Retry stage**: rerun only a failed non-applied stage using the same input snapshot.
- **Regenerate narration**: keep canonical events; create a new narrative rendering version.
- **Regenerate turn**: fork a branch before the turn and rerun downstream stages.
- **Edit player input**: fork before the turn with new input.
- **Rewind**: choose an earlier snapshot and create a branch.
- Never delete the old branch automatically.

---

## 10. Story Architect Design

## 10.1 Responsibilities

- Maintain high-level arc state.
- Evaluate progress toward authored plot points.
- Propose AI-created plot points when needed.
- Track pacing and unresolved hooks.
- Recommend foreshadowing, escalation, relief, reversals, and consequences.
- Detect stagnation.
- Preserve scenario tone and constraints.
- Avoid forcing player choices or narrating outcomes directly.

## 10.2 Architect state

Persist:

- Current act/phase.
- Active dramatic question.
- Tension level and desired range.
- Active plot points.
- Candidate future beats.
- Cooldowns.
- Intervention budget.
- Recently used twists to prevent repetition.
- Deferred consequences.
- Open hooks.
- Pacing history.

## 10.3 Plot transition evaluator

After each turn:

- Evaluate preconditions and resolution conditions using canonical facts.
- Move plot statuses through valid transitions only.
- Record supporting event IDs.
- Ask the architect only when deterministic rules cannot decide.
- Do not mark a point resolved solely because narration used similar words.

## 10.4 Anti-railroading rules

- Architect guidance describes pressures and opportunities, not required player behavior.
- No plot point may dictate the player entity’s thoughts or decisions.
- Failed or ignored plot points can transform, remain dormant, or be abandoned.
- New events must be causally plausible or explicitly supernatural under scenario rules.
- Give the player multiple actionable responses to major interventions.

---

## 11. Story-Card Mutation System

## 11.1 Mutation triggers

Evaluate mutations when:

- A linked entity changes materially.
- A linked location changes materially.
- A plot point changes state.
- A belief/rumor becomes outdated.
- A configurable number of turns has elapsed.
- A card exceeds a stale-context threshold.
- The player explicitly requests refresh.

## 11.2 Mutation modes

- `static`: immutable after run starts.
- `manual_only`: only player edits.
- `append_only`: AI may append dated developments.
- `ai_suggest`: AI creates a proposal requiring player approval.
- `ai_mutable`: AI may apply allowlisted changes automatically.

## 11.3 Mutation output contract

Require:

- Card ID and expected version.
- Mutation reason.
- Source event/turn IDs.
- JSON Patch operations.
- Summary of semantic changes.
- Confidence.
- Potential contradictions.
- Suggested retraction/expiry of old statements.

## 11.4 Validation

- Reject stale expected versions.
- Reject modifications to locked fields.
- Reject unsupported patch paths.
- Reject leakage from private sources into broader-scope cards.
- Check referenced facts against canon.
- Preserve historical card versions.
- Reindex only after commit.

---

## 12. Backend API Plan

Prefix routes with `/api/v1`.

## 12.1 System/settings

- `GET /health/live`
- `GET /health/ready`
- `GET /system/info`
- `GET /settings/models`
- `POST /settings/models/refresh`
- `POST /settings/models/test`
- `GET /settings/retrieval`
- `PUT /settings/retrieval`
- `POST /settings/embeddings/test`
- `POST /settings/embeddings/reindex`

Do not return secret values; return only configured/not-configured status and redacted identifiers.

## 12.2 Scenarios

- `GET /scenarios`
- `POST /scenarios`
- `GET /scenarios/:scenarioId`
- `PATCH /scenarios/:scenarioId`
- `POST /scenarios/:scenarioId/clone`
- `POST /scenarios/:scenarioId/validate`
- `POST /scenarios/:scenarioId/publish-revision`
- `GET /scenarios/:scenarioId/revisions`
- `POST /scenarios/import`
- `GET /scenarios/:scenarioId/export`

Nested or filtered CRUD routes for:

- Entities and relationships.
- Locations and edges.
- Story cards, links, versions, rollback, locks.
- Plot arcs and plot points.

All mutable endpoints use optimistic concurrency via version fields or `If-Match`.

## 12.3 Runs and gameplay

- `POST /runs`
- `GET /runs`
- `GET /runs/:runId`
- `POST /runs/:runId/archive`
- `GET /runs/:runId/timeline`
- `POST /runs/:runId/turns`
- `GET /runs/:runId/turns/:turnId`
- `GET /runs/:runId/turns/:turnId/stream`
- `POST /runs/:runId/turns/:turnId/cancel`
- `POST /runs/:runId/turns/:turnId/retry`
- `POST /runs/:runId/turns/:turnId/regenerate-narration`
- `POST /runs/:runId/turns/:turnId/branch`
- `GET /runs/:runId/branches`
- `POST /runs/:runId/branches/:branchId/activate`
- `GET /runs/:runId/responses/:segmentId/details`

The details endpoint returns NPC fictional thought records and decision metadata only on explicit request. It must not expose provider chain-of-thought or secret credentials.

## 12.4 Inspector/debug routes

Local-only and disabled by default in non-development deployments:

- Entity memory inspector.
- Entity beliefs inspector.
- Active thoughts inspector.
- Retrieval trace inspector.
- Turn-stage and AI invocation inspector.
- World state diff.
- Architect state.

Require re-authentication or a local admin token if the app is exposed remotely.

## 12.5 SSE events

Suggested event types:

- `turn.accepted`
- `turn.stage_changed`
- `turn.narration_started`
- `turn.narration_delta`
- `turn.narration_completed`
- `turn.background_status`
- `turn.completed`
- `turn.failed`
- `turn.cancelled`
- `heartbeat`

Include monotonically increasing event IDs so clients can reconnect with `Last-Event-ID`. Persist enough stream state to replay after a short disconnect.

---

## 13. Frontend Product Plan

## 13.1 Application shell

- Responsive desktop-first layout.
- Left navigation for scenarios, runs, and settings.
- Keyboard-accessible command palette.
- Global background-job and connection status.
- Error boundary with recover/reload actions.
- Light/dark theme.
- PWA manifest and install prompt.
- Accessible focus, color contrast, and reduced-motion support.

## 13.2 Dashboard

- Continue recent run.
- Create scenario.
- Start run from valid scenario.
- Import scenario/save bundle.
- Model/provider health.
- Embedding/retrieval status.
- Recent failures with actionable remediation.

## 13.3 Scenario builder

Use a multi-section editor, not a fragile one-shot wizard.

Sections:

1. Premise and style.
2. World rules and content boundaries.
3. Locations.
4. Entities.
5. Relationships.
6. Story cards.
7. Plot arcs/points.
8. Start state.
9. Model and pacing settings.
10. Validation and preview.

Features:

- Autosave with visible state.
- Unsaved-change protection.
- Search/filter/tagging.
- Duplicate resource.
- Drag/reorder where ordering matters.
- Location hierarchy tree and connection graph.
- Entity relationship graph.
- Story-card backlink panel.
- Version history and diff.
- Lock/mutation policy controls.
- Validation errors that deep-link to the offending field.
- “Preview context” showing what a selected entity would know at run start.

## 13.4 Start-run screen

- Select one playable entity.
- Confirm start location and scenario revision.
- Select model-role preset.
- Set narration person/tense if scenario permits overrides.
- Show warnings for missing generation provider or embeddings.
- Create an immutable run configuration snapshot.

## 13.5 Gameplay screen

Layout:

- Main narrative transcript.
- Composer at bottom.
- Current location and present entities.
- Optional side panel for player-known journal, goals, map, and story cards.
- Turn-stage indicator while generating.
- Stop/cancel button.
- Retry and branch controls on failures.

Transcript segment types:

- Narration.
- NPC speech.
- NPC action.
- Player submitted action.
- System/error notice.
- Chapter/scene separator.

For each NPC response, expose a “View details” control. The details drawer/modal may show:

- NPC fictional thoughts generated for that response.
- Whether a thought is ephemeral, lingering, or core.
- The NPC’s perceived stimulus.
- Optional action rationale at a concise character level.

Do not show raw prompts, model hidden reasoning, provider reasoning tokens, or unrelated NPC secrets in normal details mode. A separate developer inspector can show prompt metadata.

Composer features:

- Multiline input.
- Submit keyboard shortcut.
- Input history.
- Suggested command examples without forcing choices.
- Disable duplicate submission while a turn is applying.
- Preserve draft through refresh.

## 13.6 Timeline and branches

- Turn list with compact summaries.
- Inspect canonical events and player-visible output.
- Regenerate narration.
- Fork from turn.
- Rename branch.
- Compare branch divergence.
- Activate branch with confirmation.
- Never imply that deleting a visible turn rewrites already retained branches.

## 13.7 Memory and lore UI

Player-facing journal includes only player-known information:

- Known entities.
- Known locations.
- Observed events.
- Player-authored notes.
- Known/encountered story cards.

Developer/GM inspector, clearly separated, can show:

- Canonical truth.
- Per-entity memories and beliefs.
- NPC thoughts.
- Retrieval results.
- Story-card mutation history.

## 13.8 Settings UI

- Generation provider status.
- Model discovery and per-role model selection.
- Context/output budgets.
- Timeouts and retries.
- Embedding provider setup.
- Reindex progress.
- Data directory and backup settings.
- Debug/telemetry controls.
- Export all data.

Secrets should be written through a backend secret mechanism or mounted environment file, never retained in browser local storage.

---

## 14. Reliability and Failure Handling

## 14.1 AI call failure policy

Classify failures:

- Authentication/configuration.
- Rate limit.
- Timeout.
- Provider 5xx.
- Network unavailable.
- Context overflow.
- Invalid structured output.
- Content refusal.
- User cancellation.

Behavior:

- Retry transient errors with capped exponential backoff and jitter.
- Do not retry authentication failures automatically.
- On context overflow, reduce retrieved context and retry once; do not remove critical rules.
- On invalid structured output, send validation errors for one bounded repair attempt.
- Persist failed stage details and allow user retry.
- Never apply partially validated patches.

## 14.2 Queue reliability

- Separate queues for turns, embeddings, summaries, card mutation, backups, and maintenance.
- Per-run concurrency of one for canonical turn jobs.
- Global provider concurrency limits.
- Dead-letter queue with admin retry.
- Heartbeat long-running jobs.
- Detect stalled workers.
- Idempotent processors.

## 14.3 Snapshots and recovery

- Snapshot run projections every configurable number of turns and before branch forks.
- Store snapshot schema version.
- Rebuild projections from events in tests and recovery tooling.
- On startup, detect turns left in nonterminal states and offer automatic resume/retry.
- Preserve raw validated stage outputs for diagnosis.

## 14.4 Backups

Provide documented scripts for:

- PostgreSQL logical backup.
- Redis is disposable except active jobs; drain or pause queues before consistent backups.
- Environment/secret backup guidance.
- Restore verification.
- Scenario-only export.
- Complete save-bundle export with manifest and schema version.

Add a scheduled backup sidecar only as an optional Compose profile.

---

## 15. Security and Privacy

Even a self-hosted application needs a clear security baseline.

- Bind to localhost by default.
- Offer optional local password/passkey authentication for remote access.
- Use secure, HTTP-only, same-site cookies.
- Add CSRF protection for state-changing routes if cookie-authenticated.
- Validate all IDs and request bodies.
- Sanitize rendered Markdown; disable arbitrary HTML.
- Apply request and input size limits.
- Rate-limit turn creation and sensitive settings routes.
- Restrict CORS to the configured origin.
- Never send provider secrets to the client.
- Redact API keys and authorization headers from logs/traces.
- Prevent arbitrary user-configured base URLs from accessing link-local/cloud metadata addresses unless explicitly allowed; mitigate SSRF.
- Treat scenario text and player input as untrusted prompt content and delimit it from system instructions.
- Tools available to models must be allowlisted and schema-validated; models never receive general shell, network, or SQL access.
- Add dependency scanning, secret scanning, and container image scanning in CI.
- Generate an SBOM for releases.

Prompt-injection policy:

- Player text can direct their character, not rewrite system policies.
- Story-card text is data, not trusted prompt instructions unless it is a card type explicitly designated as a scenario rule.
- Retrieved memories cannot override role/system contracts.
- Model-proposed tool/state operations are validated exactly like untrusted API input.

---

## 16. Observability

## 16.1 Structured logs

Use Pino with fields:

- Request ID.
- Run/branch/turn ID.
- Stage.
- Job ID.
- Provider/model.
- Prompt version.
- Duration.
- Token usage.
- Retry count.
- Outcome/error class.

Do not log full prompts or private memory by default. Provide an opt-in local debug mode with explicit warnings and bounded retention.

## 16.2 Tracing and metrics

Use OpenTelemetry instrumentation for:

- API request.
- Queue wait and execution.
- Retrieval.
- Each AI invocation.
- Database operations.
- SSE stream duration.

Metrics:

- Turn latency by stage.
- Model success/failure and retries.
- Input/output/cache tokens.
- Queue depth.
- Retrieval latency and candidate counts.
- Embedding backlog.
- Invalid output rate.
- Context overflow rate.
- Story-card mutation accept/reject counts.
- Memory growth per run/entity.

Self-hosted default can expose Prometheus metrics behind an opt-in configuration.

## 16.3 AI invocation audit

Store:

- Role/stage.
- Prompt template version.
- Model/provider.
- Authorized source document IDs.
- Token counts and latency.
- Output schema version.
- Validation result.
- Retry lineage.
- Optional encrypted/raw body retention setting, off by default.

---

## 17. Testing and Evaluation Strategy

## 17.1 Unit tests

- State transition validators.
- Knowledge policy.
- Visibility/perception rules.
- Patch allowlists.
- Token-budget fitter.
- Retrieval scoring.
- Memory decay/consolidation.
- Thought lifecycle.
- Plot-point transitions.
- Story-card mutation policies.
- Provider error classification.

## 17.2 Database integration tests

Run real PostgreSQL with pgvector through Testcontainers.

Test:

- Migrations up/down where supported.
- Constraints and unique idempotency keys.
- Concurrent turn application.
- Advisory locking.
- Full-text and vector retrieval filters.
- Profile-specific vector index behavior.
- Branch and snapshot consistency.
- Event-to-projection rebuild.

Use real Redis for BullMQ integration tests.

## 17.3 Provider contract tests

Create a fake deterministic provider and optional live-provider test suite.

Test:

- Model discovery.
- Streaming.
- Cancellation.
- Timeout.
- Retryable/non-retryable errors.
- Context overflow.
- Structured output.
- Malformed JSON.
- Empty output.
- Usage reporting.
- Unicode and long text.

Live provider tests must be opt-in and budget-capped.

## 17.4 Turn-engine scenario tests

Fixtures should cover:

- NPC notices and reacts.
- NPC chooses no reaction.
- NPC only thinks.
- NPC holds a lingering thought across turns.
- A thought expires.
- False belief caused by a lie.
- Absent NPC does not learn an event.
- Player cannot be assigned AI thoughts.
- Architect proposes a sudden event after stagnation.
- Resolver rejects an impossible action but preserves player intent.
- Story card mutates and reindexes.
- Regeneration forks without changing old canon.
- Failure after event commit resumes without duplicate events.

## 17.5 Epistemic privacy evals

For each principal, build expected allowed/denied sets and assert:

- SQL retrieval filtering.
- Prompt assembly.
- Generated output canary absence.
- Summary visibility.
- Mutation target scope.

Include multi-hop leakage cases, such as a private thought embedded in a summary or a secret copied into an overly public story card.

## 17.6 Narrative quality evals

Maintain a curated suite scored by human review and optional model-as-judge, never solely model-as-judge:

- Continuity.
- Character consistency.
- Agency preservation.
- Non-reactive NPC behavior where appropriate.
- Appropriate use of silence and thought.
- Pacing.
- Avoidance of repetitive phrasing.
- No knowledge leakage.
- Plot-point progress without railroading.
- Correct tense/person/style.

Record model and prompt versions with results.

## 17.7 End-to-end browser tests

Playwright flows:

- First-run setup.
- Create a scenario.
- Add entities, locations, links, cards, and plot points.
- Validate and start a run.
- Submit a turn and observe streaming.
- Open NPC response details and view fictional thoughts.
- Resume after page refresh.
- Regenerate narration.
- Fork a branch.
- Export/import.
- Configure embeddings and run reindex.
- Recover from provider failure.

## 17.8 Load and soak tests

Even single-user systems need soak tests because one turn may fan out into multiple calls.

- Long run with thousands of turns.
- Large scenario with thousands of cards/memories.
- Reindex while playing.
- Repeated SSE reconnects.
- Worker restart at every turn stage.
- Database backup during idle and active periods.
- Provider latency spikes.

---

## 18. Detailed Implementation Phases

## Phase 0: Product specification and architecture decisions

Tasks:

- Write glossary for scenario, run, branch, event, observation, belief, memory, thought, story card, plot point, and architect.
- Document all invariants from Section 2.
- Write ADRs for PostgreSQL+pgvector, event/projection model, BullMQ, SSE, provider abstraction, and epistemic policy.
- Define narration modes and initial world-state patch vocabulary.
- Define scenario export schema versioning.
- Create wireframes for builder, gameplay, details drawer, timeline, and settings.
- Decide initial deployment ports, volumes, and backup paths.
- Create privacy/threat model.

Exit criteria:

- Domain terminology is unambiguous.
- Every privileged AI role has an explicit access policy.
- The first release scope is frozen.

## Phase 1: Monorepo and local infrastructure

Tasks:

- Initialize pnpm/Turborepo workspace.
- Configure strict TypeScript, lint, format, test, and build commands.
- Create app/package skeletons.
- Create Dockerfiles with non-root runtime users.
- Create Compose stack for PostgreSQL+pgvector, Redis, API, worker, web, and optional Caddy.
- Add health checks and persistent volumes.
- Add `.env.example` without secrets.
- Implement validated config loading; fail fast for invalid critical values.
- Add Pino logging and request IDs.
- Add CI for typecheck, lint, unit tests, integration tests, build, and image build.
- Add development seed/reset commands.

Exit criteria:

- One command starts the stack.
- API, worker, web, PostgreSQL, and Redis pass health checks.
- CI is green on an empty feature skeleton.

## Phase 2: Database foundation and domain primitives

Tasks:

- Enable `vector`, `pg_trgm`, and required PostgreSQL extensions.
- Implement scenario authoring tables and migrations.
- Implement runtime/event tables and migrations.
- Implement retrieval and AI audit tables.
- Add repositories with transaction boundaries.
- Implement IDs, timestamps, optimistic versions, and soft/archive behavior.
- Implement domain policies for player ownership, card mutation, and knowledge access.
- Implement event append plus projection update transaction.
- Implement snapshot serialization/versioning.
- Add factories and database integration tests.

Exit criteria:

- A scenario and a run can be created entirely through repositories.
- Events can rebuild tested projections.
- Knowledge-policy tests pass.

## Phase 3: Scenario-builder API and UI

Tasks:

- Implement scenario CRUD and revisions.
- Implement entity and directional relationship CRUD.
- Implement location hierarchy and edge CRUD.
- Implement story-card CRUD, links, locks, and version history.
- Implement plot arc/point CRUD.
- Implement validation service with actionable field paths.
- Implement import/export with JSON schema and migration hooks.
- Build dashboard and scenario-builder sections.
- Add autosave and optimistic-concurrency conflict UI.
- Add relationship and location graph views.
- Add “preview entity knowledge” tool.

Exit criteria:

- A complete valid scenario can be authored without direct database access.
- Export/import round-trips without semantic loss.
- Invalid start states cannot launch a run.

## Phase 4: AI gateway and model settings

Tasks:

- Implement `GenerationProvider` interfaces.
- Implement the `aditya-gupta` OpenAI Responses-compatible adapter.
- Add Bearer and `x-bf-vk` headers server-side.
- Implement dynamic `/models` discovery with last-known-good cache.
- Implement streaming, cancellation, timeouts, retries, and usage capture.
- Implement structured output validation and repair.
- Build fake deterministic provider.
- Add provider contract tests.
- Build settings UI for discovered models and role assignment.
- Add test-generation endpoint.
- Version prompt templates and schemas.

Exit criteria:

- A self-hosted user can configure the provider through environment/secret setup.
- Model discovery and a test request work.
- No secret appears in browser payloads or logs.

## Phase 5: Core turn engine without advanced memory

Tasks:

- Implement run creation and scenario revision pinning.
- Implement turn state machine and BullMQ workflow.
- Implement per-run locking and idempotency.
- Implement player intent extraction.
- Implement basic NPC selection.
- Implement NPC decision schema including no-action and fictional thoughts.
- Implement resolver schema and state patch validation.
- Implement canonical events and deterministic observations.
- Implement narrator prompt and SSE streaming.
- Implement turn cancellation and retry.
- Build gameplay transcript/composer.
- Build response-details endpoint and drawer for NPC fictional thoughts.
- Explicitly reject thought creation for player entity.

Exit criteria:

- A player can complete, stream, save, and resume a multi-turn game.
- NPCs can act, speak, remain silent, or think.
- NPC thought details are available only on explicit UI action.
- Worker restart does not duplicate an applied turn.

## Phase 6: Epistemic memory and RAG

Tasks:

- Implement visibility scopes and principal-aware retrieval APIs.
- Implement retrieval document/chunk projection jobs.
- Add PostgreSQL full-text and trigram retrieval.
- Implement graph, recency, salience, and diversity scoring.
- Implement token budget fitting and context sections.
- Implement observations, beliefs, and memories.
- Implement memory-curator jobs per entity.
- Implement thought persistence/decay/consolidation.
- Add lexical-only mode and warning UI.
- Implement embedding provider interface and profile lifecycle.
- Implement pgvector query path and profile-specific index creation.
- Implement reindex command/UI and progress reporting.
- Add retrieval audit inspector.
- Add privacy canary tests.

Exit criteria:

- An absent NPC cannot recall an unseen event.
- Relevant old facts are retrieved without sending complete history.
- The application functions before embedding setup and upgrades cleanly after it.

## Phase 7: Story architect and dynamic story cards

Tasks:

- Implement architect state and prompt.
- Implement deterministic stagnation features.
- Implement intervention budget/cooldowns.
- Implement plot-point transition evaluator.
- Implement AI plot-point proposal and source tracking.
- Implement sudden-event proposal schema.
- Route architect guidance to resolver without leaking secrets to NPC prompts.
- Implement card mutation triggers, proposal schema, validation, versioning, diff, rollback, and reindex.
- Add UI for architect state, AI-created points, card versions, and mutation policies.
- Add anti-railroading evals.

Exit criteria:

- Architect can steer toward authored or generated plot points.
- Stagnation can trigger plausible optional pressure.
- Dynamic cards mutate with auditability and no privacy-scope widening.

## Phase 8: Branching, summaries, and long-run quality

Tasks:

- Implement branches and fork/activate workflows.
- Implement narration-only regeneration.
- Implement full-turn regeneration via branch.
- Implement scene/chapter summaries.
- Implement memory and story-card compaction.
- Implement run timeline and branch comparison UI.
- Implement long-run retrieval and performance tests.
- Add save-bundle export/import.

Exit criteria:

- Rewind/regenerate never silently destroys history.
- A long run remains responsive and coherent.
- Save bundles restore into a clean installation.

## Phase 9: Hardening and release

Tasks:

- Complete accessibility audit.
- Complete security/threat-model review.
- Add optional local authentication.
- Add CSRF, CORS, rate limits, sanitization, SSRF controls, and secret redaction.
- Add OpenTelemetry, metrics, dashboards, and diagnostic bundle export.
- Add backup/restore scripts and verify restoration.
- Add dead-letter queue and recovery UI.
- Run load, soak, and crash-injection tests.
- Pin container images and dependencies.
- Generate SBOM and release notes.
- Write install, upgrade, backup, troubleshooting, and provider-configuration docs.

Exit criteria:

- Fresh install and upgrade paths are documented and tested.
- Backup restoration succeeds.
- Privacy, failure recovery, and long-run suites pass.
- A release candidate can be operated without developer intervention.

---

## 19. Work Breakdown by Package

### `packages/domain`

- Domain IDs and value objects.
- Entity/location/card/plot schemas.
- Run/turn/event state machines.
- Knowledge policy.
- Perception policy.
- Patch validator.
- Memory/thought decay rules.
- Plot transition rules.
- Card mutation rules.

### `packages/db`

- Drizzle schema and migrations.
- Repository interfaces/implementations.
- Unit-of-work helpers.
- Advisory lock helpers.
- Event append/projection apply.
- Snapshot and rebuild tooling.
- pgvector SQL helpers.

### `packages/ai`

- Provider interfaces.
- OpenAI Responses-compatible transport.
- Dynamic model catalog.
- Retry/error normalization.
- Streaming normalization.
- Structured output helper.
- Usage/cost recording.
- Fake deterministic provider.
- Embedding interface and future adapters.

### `packages/prompts`

- Architect prompt.
- NPC cognition/decision prompt.
- Resolver prompt.
- Observation interpretation prompt.
- Narrator prompt.
- Memory curator prompt.
- Story-card mutator prompt.
- Consistency critic prompt.
- Version metadata, schemas, fixtures, and evals.

### `packages/retrieval`

- Source projectors.
- Chunkers.
- Scope tagging.
- Full-text search.
- Vector search.
- Graph expansion.
- Rank fusion.
- Budget fitter.
- Context renderer.
- Retrieval audit.
- Reindex coordinator.

### `packages/engine`

- Turn workflow.
- Stage persistence.
- Job definitions/processors.
- Architect coordinator.
- NPC coordinator.
- Resolver coordinator.
- Observation coordinator.
- Narration stream coordinator.
- Post-turn maintenance coordinator.
- Branch/regeneration services.

### `apps/api`

- Auth/session layer.
- OpenAPI routes.
- Scenario/run/settings controllers.
- SSE endpoints.
- Error mapping.
- Health/readiness.
- Local admin/debug routes.

### `apps/worker`

- Queue bootstrap.
- Turn workers.
- Embedding workers.
- Memory/summary workers.
- Card mutation workers.
- Recovery/stalled-job handling.

### `apps/web`

- App shell/router.
- Dashboard.
- Scenario builder.
- Graph editors.
- Gameplay transcript/composer.
- Thought details drawer.
- Timeline/branches.
- Journal/map.
- Settings/model configuration.
- Retrieval/debug inspectors.
- PWA support.

---

## 20. Initial Structured AI Outputs

Define exact schemas early. Suggested top-level contracts:

### `ArchitectPlan`

- `pacingAssessment`
- `stagnationScore`
- `activePlotPriorities[]`
- `guidance[]`
- `foreshadowingOptions[]`
- `suddenEventProposal?`
- `newPlotPointProposal?`
- `cooldownUpdates[]`
- `forbiddenRevelations[]`

### `NpcDecisionBatch`

- `decisions[]`, one per requested NPC.
- No decision may target/control the player’s internal state.
- Each decision includes perceived evidence IDs so the server can validate grounding.

### `ResolutionProposal`

- `events[]`
- `statePatches[]`
- `failedActions[]`
- `randomOutcomeReferences[]`
- `plotEvidence[]`
- `cardMutationSignals[]`

### `NarrationPlan`

- `segments[]` with type, speaker, event references, and text.
- `sceneTransition?`
- `suggestedTitle?`
- No private-thought field.

### `MemoryUpdateProposal`

- `newMemories[]`
- `reinforcements[]`
- `beliefChanges[]`
- `forgetOrSuppress[]`
- Every change references authorized observation/memory/thought evidence.

### `StoryCardMutationProposal`

- `cardId`
- `expectedVersion`
- `reason`
- `sourceIds[]`
- `operations[]`
- `scopeImpact`
- `contradictionWarnings[]`

---

## 21. Performance Targets

Set measurable initial targets, then revise with real models:

- Scenario CRUD p95 under 300 ms on local hardware excluding imports.
- Turn accepted response under 500 ms.
- First progress event under 1 second.
- First narration token target under 15 seconds for a normal turn, provider dependent.
- Typical completed turn target under 45 seconds with a small NPC set.
- No unbounded NPC fan-out; default maximum cognition calls per turn.
- Retrieval under 500 ms for normal collections before optional reranking.
- Resume gameplay after browser refresh without rerunning the turn.
- Support at least 10,000 turns and 100,000 retrieval chunks in soak tests on documented reference hardware.

Add configurable caps:

- Maximum active NPCs per turn.
- Maximum model calls per turn.
- Maximum retrieved chunks.
- Maximum prompt tokens by role.
- Maximum generated thoughts per NPC.
- Maximum active memories/thoughts before consolidation.
- Maximum player input size.

---

## 22. Key Risks and Mitigations

### Knowledge leakage

Mitigation: SQL-level authorization, principal-specific retrieval, separate chunks by scope, canary tests, and no global-context NPC prompts.

### Narrative/state divergence

Mitigation: events and structured patches are canon; narration references event IDs and cannot mutate state.

### AI controls the player character

Mitigation: player entity excluded from NPC cognition; explicit output validation rejects player thoughts and autonomous intent.

### Every NPC reacts every turn

Mitigation: deterministic candidate selection, `no_action` and `think_only`, call caps, relevance thresholds, and quality evals.

### Excessive melodrama from architect

Mitigation: cooldowns, intervention budget, tension targets, quiet-scene support, repetition checks, and player-configurable pacing.

### Story-card drift

Mitigation: mutation policies, versioning, source evidence, patch allowlists, contradiction checks, and rollback.

### Long-context cost/latency

Mitigation: role-specific budgets, RAG, summaries, stable prompt prefixes, prompt caching, and usage dashboards.

### Unknown embedding model dimensions

Mitigation: unconstrained vector storage plus profile-specific cast/index creation after configuration; lexical fallback and full reindex tooling.

### Provider instability

Mitigation: provider abstraction, cached model catalog, retries, resumable stages, deterministic fake provider, and future adapters.

### Model structured-output errors

Mitigation: strict schema mode where supported, local validation, one repair pass, and no state application before validation.

### Save corruption or duplicate effects

Mitigation: append-only events, idempotency keys, advisory locks, snapshots, branch semantics, and restoration tests.

---

## 23. Release Documentation Checklist

- Architecture overview.
- Data model and epistemic privacy explanation.
- One-command Docker installation.
- Reverse-proxy/TLS setup.
- Provider API key configuration.
- Model role selection.
- Embedding setup and reindex guide.
- Scenario authoring guide.
- Story-card mutation guide.
- Plot architect configuration guide.
- Gameplay and branching guide.
- NPC thought visibility explanation.
- Backup and restore runbook.
- Upgrade/migration guide.
- Troubleshooting provider, queue, database, SSE, and retrieval failures.
- Privacy/security guide for remote exposure.
- Developer guide for adding generation and embedding providers.
- Prompt/eval contribution guide.

---

## 24. Definition of Done for Version 1

Version 1 is complete only when all of the following are true:

1. A fresh Docker Compose installation starts successfully from documented steps.
2. The user can configure the same OpenAI Responses-compatible generation provider used by pi without exposing credentials to the browser.
3. The user can build and validate a scenario containing entities, locations, relationships, cards, and plot points.
4. The user can select one playable entity and start a run.
5. Turn-based text gameplay streams to the browser and survives refresh/reconnect.
6. NPCs can speak, act, remain silent, or generate explicit fictional inner thoughts.
7. The player entity never receives AI-authored thoughts or autonomous decisions.
8. NPC thoughts are private from other entities and visible to the human only through explicit response details.
9. Canonical events, observations, beliefs, memories, and narration are stored separately.
10. Per-entity epistemic privacy passes automated canary leakage tests.
11. The story architect can pursue authored plot points and propose new ones when pacing stagnates.
12. Story cards mutate according to policy with history, diff, rollback, and reindexing.
13. Retrieval works in lexical-only mode and supports later embedding activation with pgvector and a complete reindex.
14. Turns are idempotent, resumable, cancellable, and recoverable after worker failure.
15. Regeneration and rewind use branches and do not silently destroy history.
16. Long-run memory, summarization, and retrieval remain bounded and testable.
17. Backup and restoration are documented and verified.
18. Security, accessibility, integration, E2E, privacy, and soak-test gates pass.

---

## 25. Recommended Build Order Summary

The critical dependency path is:

1. Domain invariants and privacy model.
2. Monorepo/Compose foundation.
3. PostgreSQL schema and event/projection system.
4. Scenario builder.
5. Provider adapter and structured AI contracts.
6. Minimal resumable turn engine.
7. Observation/belief/memory separation.
8. Principal-aware RAG and embedding profile support.
9. Architect and dynamic story cards.
10. Branching, summaries, inspectors, hardening, backups, and release documentation.

Do not start by writing one giant “game master” prompt. The central engineering work is the state machine, epistemic boundaries, structured event model, validated AI contracts, and recoverable orchestration. Once those are correct, prompts and models can improve without destabilizing saved games or privacy guarantees.
