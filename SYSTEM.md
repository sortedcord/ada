# Project System Instructions

## Source of Truth for Planning and Progress

GitHub Issues are the authoritative source of truth for project planning, phase completion, task tracking, acceptance criteria, and implementation progress.

Do not create or maintain a parallel task checklist in the repository. In particular, do not recreate `LUNA_IMPLEMENTATION_TASKS.md` or `implemented_tasks.md`.

## GitHub Issue Organization

- Each major phase is represented by a GitHub meta issue.
- Phase work is grouped into descriptive GitHub sub-issues.
- Use GitHub issue hierarchy for grouping; do not create phase labels.
- Use GitHub issue types consistently:
  - `Feature` for phase meta issues.
  - `Task` for implementation groups and concrete work.
  - `Bug` for unexpected behavior or regressions.
- Use repository labels for area and priority classification.
- Keep issue titles descriptive and include the phase/section identifier when useful.

## Working on a Task

Before implementing work:

1. Locate the relevant GitHub phase meta issue and sub-issue.
2. Read the complete issue description, acceptance checklist, dependencies, and linked discussions.
3. Confirm the intended scope before changing code.
4. If requirements change, update the GitHub issue rather than creating a local replacement checklist.

During implementation:

- Keep the issue description current when scope or acceptance criteria change.
- Add implementation notes, decisions, blockers, test results, and operational considerations as issue comments.
- Link pull requests and commits to the relevant issue.
- Use GitHub sub-issues for newly discovered work that is independently trackable.
- Do not silently broaden scope. Create or update an issue when additional work is required.

## Acceptance and Completion

Acceptance criteria must use valid GitHub Markdown task-list syntax:

```markdown
- [ ] Incomplete criterion
- [x] Verified criterion
```

There must be a space after the closing checkbox marker. Use `- [ ] text`, never `- [ ]text`.

Only mark a criterion complete after the implementation and its required verification exist. Only close a task issue when:

- All acceptance criteria are checked.
- Required tests pass.
- Relevant documentation/configuration is updated.
- Security and privacy requirements have been verified.
- Major runtime changes have been rebuilt and tested through the live API.
- The issue has links to the implementing pull request or commit where applicable.

A phase meta issue may be closed only after all required child issues are complete and its phase-level go/no-go or release checklist has been verified.

## Verification Workflow for Major Changes

After major runtime changes:

1. Run formatting, linting, typechecking, and relevant unit/integration tests.
2. Rebuild the Docker containers:

   ```bash
   docker compose up --build -d
   docker compose ps
   ```

3. Verify the live API end-to-end:

   ```bash
   node scripts/live-scenario-runner.mjs
   ```

4. Record verification results in the relevant GitHub issue.
5. Update the issue checklist only after verification succeeds.
6. Commit and push the verified changes using a conventional commit message.
7. Link the commit or pull request from the GitHub issue.

## Blockers and Decisions

If implementation is blocked:

- Leave the relevant criterion unchecked.
- Comment on the issue with the exact blocker, attempted approaches, error output, and proposed next step.
- Create a separate linked issue for work that is outside the original scope.
- Never weaken privacy, state-integrity, reversibility, security, or testing requirements just to close an issue.

## Core Engineering Invariants

- The database owns canon; prose is never parsed to reconstruct canonical state.
- World truth, observation, belief, memory, fictional thoughts, and narration remain separate layers.
- Epistemic privacy is enforced at query/context-assembly time and fails closed.
- The selected player entity never receives AI-authored inner thoughts, motivations, or autonomous decisions.
- Turn stages remain idempotent and resumable; retries must not duplicate canonical effects.
- Do not hold a database transaction open while waiting for an AI provider.
- Generated mutable content remains versioned, attributable, auditable, and reversible.
- Never commit credentials, secrets, raw private prompts, private provider responses, or database dumps.

## Project Code Navigation

Prefer CodeGraph tools over direct code-file reading whenever possible for architecture, control-flow, impact, and symbol navigation:

- `codegraph_search` — find symbols by name.
- `codegraph_node` — inspect a symbol's signature, location, source, callers, and callees.
- `codegraph_files` — inspect the indexed project file tree.
- `codegraph_callers` — find functions or methods that call a symbol.
- `codegraph_callees` — find functions or methods called by a symbol.
- `codegraph_impact` — analyze the impact radius of changing a symbol.
- `codegraph_explore` — explore related symbols, files, or terms grouped by file.
- `codegraph_status` — check index health and pending synchronization.

Use CodeGraph before `read`, `grep`, `rg`, or other direct file access. Direct file access is appropriate when editing exact text, inspecting non-code assets/configuration, or when CodeGraph lacks the required information. If symbol search returns no result, try `codegraph_explore`, `codegraph_files`, or `codegraph_node` before falling back to literal text search.
