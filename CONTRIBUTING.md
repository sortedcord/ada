# Contributing

Use conventional commit prefixes (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`). Keep changes within package boundaries and update `docs/progress.md` only with verified evidence. Do not commit `.env` files, credentials, raw private prompts, provider responses, database dumps, or generated secrets.

Before submitting a change, run:

```sh
corepack pnpm format:check
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm test
```
