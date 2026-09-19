# ADR-007: Principal-aware epistemic privacy

- **Status:** Accepted
- **Context:** A global context followed by “do not reveal secrets” is not a reliable privacy boundary.
- **Decision:** Every retrieval/context call declares a principal and scope. Domain `KnowledgePolicy` fails closed and persistence mirrors coarse predicates in SQL before ranking. Chunks never mix scopes/owners. `ARCHITECT` and `RESOLVER` may read privileged run truth; `NARRATOR`, `NPC(entityId)`, `MEMORY_CURATOR(entityId)`, and `PLAYER_VIEW(entityId)` receive only their documented authorized data. Human details are separate out-of-world reads.
- **Alternatives:** Prompt-only redaction (vulnerable to leakage); global retrieval with post-filtering (candidate leakage); per-service ad hoc checks (inconsistent).
- **Consequences:** Scope/owner metadata is required on every retrieval artifact. Privacy canaries and multi-hop tests are release gates. Debug access is explicit, local/admin controlled, and never normal gameplay context.
