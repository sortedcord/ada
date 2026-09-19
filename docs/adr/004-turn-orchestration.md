# ADR-004: BullMQ resumable turn orchestration

- **Status:** Accepted
- **Context:** A turn fans out to model calls and can fail or be cancelled at any stage. Provider waits must not hold DB transactions.
- **Decision:** BullMQ/Redis runs persisted stage jobs. Each stage stores an input snapshot, result, status, retry lineage, and idempotency/application key. Per-run queue concurrency is one and PostgreSQL advisory locks plus expected versions protect canonical application. Workers heartbeat, detect stalls, and resume from the last durable stage.
- **Alternatives:** One synchronous HTTP request (timeouts and no recovery); in-process promises (lost on crash); unpersisted workflow engine (duplicate effects).
- **Consequences:** Redis is operationally required for queued work. Every stage needs an explicit failure policy and safe retry semantics. Cancellation after event commit cannot silently roll back canon.
