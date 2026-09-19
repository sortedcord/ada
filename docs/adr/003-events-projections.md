# ADR-003: Append-only events plus projections

- **Status:** Accepted
- **Context:** Narrative output must never be parsed to reconstruct canon, while gameplay needs fast current-state reads and recovery.
- **Decision:** Validated canonical events and facts are append-only. Projection updates happen in the same short transaction as event insertion, guarded by expected versions and an application key. Projections can be rebuilt from events into a disposable set and compared by checksum. Narration is a separate versioned rendering.
- **Alternatives:** Mutable state only (poor audit/rebuild); event sourcing without projections (slow reads); prose-derived state (unsafe and ambiguous).
- **Consequences:** Event schemas and migration/rebuild logic are compatibility surfaces. A rejected model proposal creates no event. Snapshot restore may repair projections but never edits event history.
