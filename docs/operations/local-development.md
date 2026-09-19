# Local development

## Prerequisites

- Node.js 24.21.0 (`.nvmrc`).
- Corepack-enabled pnpm 12.4.2.
- Docker Engine and Compose v2 for PostgreSQL/pgvector and Redis integration.

## Install and run

```sh
corepack enable
pnpm install --frozen-lockfile
cp .env.example .env
pnpm dev
```

For the container stack, use `docker compose up --build`. Services bind to localhost by default. The API is available through the web proxy, and direct API access is intentionally internal to the Compose network. `docker compose --profile proxy up --build` enables the optional same-origin Caddy proxy.

## Verification

```sh
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm test:e2e
```

Tests use fake provider data by default. Do not place real keys in `.env.example`, fixtures, browser config, logs, or committed files. `scripts/dev-reset.sh` is guarded and requires typing `RESET` before deleting development volumes.
