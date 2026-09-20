# Agent Instructions

## Building the Project

This is a pnpm monorepo orchestrated by Turborepo. Node.js >= 24.21.0 and pnpm 12.4.2 (via Corepack) are required.

### Install dependencies

```bash
corepack enable
pnpm install --frozen-lockfile
```

### Type-check, lint, and unit-test

```bash
pnpm typecheck
pnpm lint
pnpm test
```

### Build all packages and apps

```bash
pnpm build
```

---

## After Major Changes: Rebuild, Verify via Live API, then Commit

After any significant change to `apps/api`, `apps/worker`, `packages/db`, `packages/engine`, `packages/ai`, or any other package that affects runtime behavior, follow this sequence:

### 1. Rebuild the Docker containers

```bash
docker compose up --build -d
```

Wait for all services to become healthy before proceeding:

```bash
docker compose ps
```

All services (`postgres`, `redis`, `api`, `worker`, `web`) should show status `healthy` or `running`.

### 2. Run the live scenario integration test

Use the live scenario runner script to exercise the full turn pipeline end-to-end against the containerized API:

```bash
node scripts/live-scenario-runner.mjs
```

This script:
- Creates a scenario via the REST API
- Publishes a revision
- Starts a run with a player entity
- Submits multiple turns and polls for completion
- Queries the journal and timeline endpoints
- Verifies epistemic isolation (private NPC secrets must never appear in player-facing output)

All steps must pass before changes are considered verified.

### 3. Commit verified changes

Once the live API tests pass, stage and commit all changes:

```bash
git add .
git commit -m "<type>: <short description>"
git push origin main
```

Use conventional commit prefixes: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`.

**Never commit:**
- `.env` files containing real secrets
- Provider API keys or database passwords
- Raw model responses or private prompt content
- Database dumps

---

## Key Invariants to Preserve

- The database owns canon. Never parse prose to reconstruct state.
- Epistemic privacy must be enforced at query time, not by asking the model to ignore data.
- Turn stages must remain idempotent and resumable. Retries must not duplicate canonical events.
- Do not hold a database transaction open while awaiting an AI provider response.
- All mutable generated content must be versioned and reversible.
