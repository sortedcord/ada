# ADR-006: Provider-neutral AI gateway

- **Status:** Accepted
- **Context:** The initial provider is an OpenAI Responses-compatible custom endpoint, but saved runs and domain code must not depend on transport quirks.
- **Decision:** Define provider-neutral generation and embedding interfaces. Implement the `aditya-gupta` adapter server-side with dynamic model discovery, structured generation, text streaming, cancellation, normalized errors, retries, usage capture, and both required secret headers. Persist last-known-good model metadata and invocation audit records.
- **Alternatives:** Direct SDK calls throughout business code (coupling and poor testability); provider-specific domain types (migration cost); live provider in tests (nondeterministic/costly).
- **Consequences:** Fake providers are mandatory for default tests. Provider compatibility flags stay in the adapter. Secrets never cross the API/browser boundary.
