# Implementation progress

This file records verified work only. A checkbox is updated in `LUNA_IMPLEMENTATION_TASKS.md` only after implementation and applicable verification are complete.

## Completed gates

- **Phase 0** — Product contracts, ADRs, privacy policy, threat model, UX wireframes, deployment defaults, tabletop reviews, and traceability completed.
- **Phase 1** — Monorepo/tooling, strict TypeScript, apps/packages, config/logging, Docker/Compose, Testcontainers, Playwright, CI/security checks, and fixture rules completed. Local CI, Compose, health, non-root, proxy, shutdown, typecheck, lint, unit, integration, E2E, build, and audit checks pass.
- **Phase 2** — Domain primitives, scenario/runtime schemas, validation, state machines, privacy/player agency, perception, memory/thought, plots/cards, budgets/caps, AI output contracts, and generated JSON schemas completed and tested.
- **Phase 3** — Drizzle schema/migrations for 46 tables, extensions, constraints/indexes, repositories, transactions/retries/advisory locks, events/projections/idempotency, private reads, outbox, snapshots/rebuilds, card mutation, embedding indexes, run/scenario services, and factories completed and integration-tested.
- **Phase 4** — API/OpenAPI, errors/limits/concurrency/audit, full scenario lifecycle, nested authoring CRUD, card history/rollback/links, knowledge preview, clone/publish/archive, import/export/migration/remapping, and semantic comparison completed. Dense HTTP authoring/publish/clone/card/privacy/import-export smoke passes; go/no-go checked.
- **Phase 5** — Router/query shell, dashboard, scenario builder/resource editors, autosave/conflicts, validation/preview, import/export/clone/archive UI, theme/command palette, safe Markdown, gameplay composer, accessibility tests, and Playwright builder/shell tests completed; go/no-go checked.
- **Phase 6** — Generation/embedding gateways, provider errors/retries/cancellation, fake/live contract suite, role validation/snapshots, settings APIs/UI, invocation audit, prompt registry/builders, and embedding status completed; go/no-go checked.

## Phase 7 current work

- **Implemented foundations:** run creation with runtime projections/snapshots, BullMQ queue/worker, outbox-backed acceptance, run advisory locking, durable job records, context/architect/stage results, deterministic player intent parsing, deterministic NPC candidate/context/decision primitives, server-random utility, provider-backed minimal event/narration worker path, atomic event/observation/narrative commit, persistent stream-event replay, cancellation/retry APIs, timeline/details endpoints, transcript/composer UI.
- **Reopened by Sol review:** several provisional P7 checks were intentionally reopened because the initial implementation overstated acceptance criteria. Remaining work is focused on durable stage semantics, full NPC cognition/resolution, privacy-safe observations, cancellation/recovery, durable narration streaming, and the final Phase 7 crash/privacy/idempotency suite.

## Current blockers

- Phase 7 is not complete and its go/no-go gate remains unchecked. Do not begin Phase 8 until the full Phase 7 gate passes.
