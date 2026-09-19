#!/usr/bin/env sh
set -eu

corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
corepack pnpm test:integration
corepack pnpm test:e2e
corepack pnpm build
corepack pnpm audit --audit-level high
cp .env.example .env
trap 'rm -f .env' EXIT
docker compose config >/dev/null
docker compose build
docker run --rm -v "$PWD:/repo:ro" zricethezav/gitleaks:v8.28.0 detect --source=/repo --no-git --no-banner --redact
docker run --rm -v "$PWD/infra/docker:/repo:ro" hadolint/hadolint:latest hadolint /repo/api.Dockerfile /repo/worker.Dockerfile /repo/web.Dockerfile
printf '%s\n' 'Local CI and security checks passed.'
