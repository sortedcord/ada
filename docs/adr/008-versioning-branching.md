# ADR-008: Immutable revisions and reversible branches

- **Status:** Accepted
- **Context:** Authors need safe concurrent edits, runs need reproducibility, and regeneration must not destroy prior history.
- **Decision:** Draft resources use optimistic versions. Published scenario revisions, story-card versions, canonical events, AI invocation records, and narrative renderings are immutable. Full-turn regeneration, input edits, and rewind fork a branch; narration-only regeneration adds a rendering version without changing events. Rollback creates a new version.
- **Alternatives:** Destructive updates (loss of audit/reproducibility); copy-on-write without event lineage (harder comparison); overwrite regeneration (unsafe).
- **Consequences:** Storage grows with history and requires snapshots/compaction. APIs and UI must distinguish retrying the same snapshot from generating an alternate future.
