# Product invariants

- The database owns canon; narrative text is a rendering only.
- Events are append-only after commit; projections are rebuildable.
- Truth, observation, belief, memory, thought, and narration have separate schemas and visibility.
- Missing visibility is invalid and fails closed.
- NPC private context is owner-scoped. The human details view is out-of-world and never feeds another entity prompt.
- The selected player entity cannot receive AI-authored thought or autonomous intent records.
- Mutable generated content is versioned, attributed, auditable, and reversible.
- No database transaction remains open while waiting for an AI provider.
- Every turn stage has durable state, an idempotency key, and a resumable failure policy.
- Regeneration, edit, and rewind create branches; no history is silently destroyed.
- Models have no unrestricted shell, network, SQL, or arbitrary tool access.
- Server-side limits apply even when a provider advertises a large context window.
