# Test and fixture rules

- Default tests use deterministic fake generation/embedding providers and never call a live provider.
- Fake credentials must contain recognizable markers such as `fake-`, `FAKE_`, or `CANARY`; no production-looking secret is accepted in fixtures.
- Private canaries are synthetic markers only and are not copied into progress notes or diagnostics.
- Integration helpers create isolated PostgreSQL/Redis Testcontainers and always stop them in teardown.
- Live-provider tests are opt-in, credential-gated, budget-capped, and must use public synthetic fixtures.
- Test output is redacted before snapshots or artifacts; provider authorization headers and raw prompts are forbidden.
