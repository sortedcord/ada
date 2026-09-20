# Ada: AI Dungeon–Style Narrative Engine

Ada is an original, self-hosted, browser/PWA-based, single-human-player narrative roleplaying game and simulation engine written in TypeScript. Inspired by the general category of AI-driven text adventures, it models a persistent, epistemically sound, turn-based world where the player controls a single character and the AI orchestrates non-player entities, narration, memory evolution, story cards, and overarching story architecture.

---

## Key Architectural Principles & Invariants

* **The Database Owns Canon:** Language models propose actions, events, memories, thoughts, and state patches. The server validates all proposals against strict schemas and domain invariants before committing canonical events. Rendered prose is an ephemeral presentation of canonical events, never the source of truth, and is never parsed backward to reconstruct state.
* **Separation of Layers:** World truth, perception/observation, belief, memory, fictional inner thoughts, and narration are distinct data layers. Facts from one layer do not automatically promote to another without valid perception or evidence.
* **Epistemic Privacy at Query Time:** Every prompt assembly and query is scoped to an explicit principal (`NPC(entityId)`, `PLAYER_VIEW(entityId)`, `ARCHITECT`, `NARRATOR`). Missing visibility scopes fail closed. NPC prompts contain only what that NPC has observed, believes, remembers, or knows from public scenario lore.
* **Fictional Inner Thoughts vs. Provider Reasoning:** Fictional inner thoughts are structured, in-character game state. Raw model reasoning blocks, provider scratchpads, or chain-of-thought tokens are never stored, exposed, or considered game content. The player character **never** receives AI-authored inner thoughts.
* **Resumable Turn Workflow:** Turns execute across durable, idempotent stages (`INTENT_EXTRACTION` &rarr; `PERCEPTION` &rarr; `NPC_COGNITION` &rarr; `RESOLUTION` &rarr; `NARRATION` &rarr; `MEMORY_CARD_MUTATION`). Each stage persists its output. Background worker crashes can resume without duplicate mutations or state corruption.
* **Versioned & Non-Destructive Mutations:** Scenario edits use optimistic concurrency; story cards evolve through immutable card versions; branches fork state rather than overwriting history; and manual edits can be locked against AI mutation.

---

## Monorepo Structure

Ada is organized as a pnpm workspace orchestrated by Turborepo:

### Applications (`apps/`)

* **`api`**: Fastify REST and SSE service managing scenarios, published revisions, runs, branches, turns, journal queries, and inspector detail views.
* **`worker`**: BullMQ background processor executing turn stages, orchestrating multi-agent NPC cognition, resolving state patches, and generating narration.
* **`web`**: Single-page application and PWA built with React 19, Vite, Tailwind CSS v4, and TanStack Router/Query. Includes the narrative transcript, action composer, scenario builder, timeline/branch viewer, journal, and details drawer.
* **`scenario-mcp`**: Local stdio Model Context Protocol (MCP) server providing scenario inspection, validation, proposal generation, and continuity review tools.
* **`task-tracker`**: Internal development dashboard for milestone tracking and task verification.

### Packages (`packages/`)

* **`domain`**: Pure TypeScript domain logic, branded IDs, aggregate schemas, patch vocabulary, state-machine transitions, and visibility/perception policies (zero external dependencies).
* **`contracts`**: Shared API contracts, validation schemas (Zod), JSON Schema generators, and export specifications.
* **`config`**: Validated runtime configuration schemas with strict separation between server-only secrets and browser-safe runtime settings.
* **`db`**: Drizzle ORM schema, migrations, repositories, projections, and transactional run/scenario services backed by PostgreSQL and pgvector.
* **`ai`**: Provider-neutral AI gateway, streaming interfaces, structured output schemas, error normalization, and mock/fake providers.
* **`prompts`**: Versioned prompt templates and typed builders for narrator, resolver, architect, NPC cognition, and memory curator roles.
* **`engine`**: Deterministic perception eligibility, intent extraction, dialogue attribution, and turn orchestration.
* **`retrieval`**: Hybrid lexical and vector retrieval, pgvector index management, memory curation, document projection, and principal-scoped chunk selection.
* **`architect`**: Privileged long-term narrative pacing, plot-point tracking, and thematic guidance.
* **`scenario-tools`**: Scenario import, export, bundling, validation, and migration utilities.
* **`observability`**: Pino-based structured logger, request correlation, secret redaction, and telemetry helpers.
* **`testkit`**: Shared test utilities, Testcontainers (PostgreSQL, pgvector, Redis) lifecycle helpers, and test data factories.

### Infrastructure & Docs

* **`infra/`**: Multi-stage Dockerfiles (`api.Dockerfile`, `worker.Dockerfile`, `web.Dockerfile`), PostgreSQL init scripts with extensions (`pgvector`, `pg_trgm`), and Caddy reverse proxy configs.
* **`docs/`**: Comprehensive product definitions, architecture decision records (ADRs 001–011), policy matrices, and threat models.

---

## Tech Stack & Prerequisites

* **Runtime:** Node.js `>= 24.21.0 < 25` (pinned in `.nvmrc`)
* **Package Manager:** pnpm `12.4.2` (managed via Corepack)
* **Database:** PostgreSQL 16+ with `pgvector` and `pg_trgm` extensions
* **Job Queue & Cache:** Redis 7+
* **Build System:** Turborepo 2+
* **Backend:** Fastify 5, BullMQ 5, Drizzle ORM 0.45
* **Frontend:** React 19, Vite 7, Tailwind CSS 4, TanStack Router & Query
* **Testing:** Vitest 3, Playwright, Testcontainers

---

## Quick Start & Local Development

### 1. Prerequisites Setup

Ensure Node.js 24 and Docker are installed, then enable pnpm:

```bash
corepack enable
```

### 2. Install Dependencies

```bash
pnpm install --frozen-lockfile
```

### 3. Environment Configuration

Copy the example environment file:

```bash
cp .env.example .env
```

*By default, unit and integration tests run with mock/fake provider implementations. Live AI provider credentials are never required for local testing or builds.*

### 4. Start Infrastructure Services

Spin up PostgreSQL (with pgvector) and Redis using Docker Compose:

```bash
docker compose up -d postgres redis
```

### 5. Run Database Migrations

```bash
pnpm db:migrate
```

### 6. Run the Development Environment

Start all apps and packages in parallel watch mode:

```bash
pnpm dev
```

* The Web application will be accessible at: `http://127.0.0.1:4173`
* The API will be accessible at: `http://127.0.0.1:3000`

Alternatively, to run the entire stack (including web proxy) via Docker:

```bash
docker compose up --build
```

---

## Common Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Starts all apps and packages in development watch mode |
| `pnpm build` | Builds all packages and production bundles with Turbo |
| `pnpm test` | Runs unit tests across all packages |
| `pnpm test:integration` | Runs PostgreSQL/Redis integration test suites |
| `pnpm test:e2e` | Runs Playwright browser integration tests |
| `pnpm test:a11y` | Runs automated accessibility audits via Playwright |
| `pnpm typecheck` | Validates TypeScript compilation with strict flags |
| `pnpm lint` | Runs ESLint across all packages and apps |
| `pnpm format` | Formats all files using Prettier |
| `pnpm format:check` | Verifies code formatting without writing changes |
| `pnpm db:migrate` | Applies pending Drizzle database migrations |
| `pnpm db:seed` | Seeds the database with default scenarios and fixtures |
| `pnpm db:reset` | Resets local dev database (requires explicit `RESET` confirmation) |
| `pnpm scenario:mcp` | Launches the scenario authoring MCP bridge over stdio |
| `pnpm security:scan` | Audits dependencies for security advisories |

---

## Security & Epistemic Privacy

* **Credential Isolation:** Server-side provider keys (`GENERATION_API_KEY`, `EMBEDDING_API_KEY`, `DATABASE_URL`) are strictly kept in the server/worker environments and are never bundled or transmitted to the client.
* **Untrusted Model Outputs:** All AI responses, state patches, and scenario imports are treated as untrusted input and must pass Zod schema validation before database persistence.
* **Leak Prevention:** Automated tests verify that private NPC knowledge, thoughts, and canary secrets are never leaked to the player journal, narrator transcripts, or prompt contexts of other entities.
