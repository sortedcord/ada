# ADR-010: Prompts as versioned artifacts

- **Status:** Accepted
- **Context:** Prompt behavior affects privacy, output validity, cost, and reproducibility; arbitrary strings scattered through orchestration are unauditable.
- **Decision:** Each AI stage has a named/versioned prompt, typed input builder, output schema, privacy class, hard budget, failure policy, fixtures/evals, and registry record. Stable system/schema sections are separated from delimited untrusted data. The rendered prompt hash and authorized source IDs are recorded in `ai_invocations`; raw prompt retention is off by default.
- **Alternatives:** Inline prompt strings (unreviewable drift); one giant game-master prompt (privacy/state coupling); provider-managed prompts only (poor local reproducibility).
- **Consequences:** Prompt/schema changes require version increments and fixtures. Prompt metadata is safe to audit, while private text is retained only under explicit bounded debug policy.
