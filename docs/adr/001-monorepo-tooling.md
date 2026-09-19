# ADR-001: Monorepo and TypeScript tooling

- **Status:** Accepted
- **Context:** The web, API, worker, and shared domain packages must evolve together while retaining compile-time dependency boundaries.
- **Decision:** Use pnpm workspaces with Turborepo orchestration, strict TypeScript (`strict`, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`), Vitest, Playwright, ESLint, and Prettier. CI runs frozen installs and format, lint, typecheck, tests, builds, and container checks.
- **Alternatives:** Separate repositories (slower contract changes); npm scripts only (no workspace graph/cache); JavaScript (weaker contracts).
- **Consequences:** A root lockfile and package graph are authoritative. Packages must expose typed public entry points and domain cannot import infrastructure. Turborepo cache inputs must include source, config, lockfile, and relevant environment declarations.
