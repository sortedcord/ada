# ADR-005: SSE for gameplay streaming

- **Status:** Accepted
- **Context:** Gameplay needs simple same-origin incremental narration and stage progress without bidirectional transport complexity.
- **Decision:** Use REST commands plus Server-Sent Events for turn updates. Events carry monotonically increasing IDs, typed event names, heartbeats, and short-retention replay. Clients reconnect with `Last-Event-ID`; persisted final narration reconciles any lost deltas.
- **Alternatives:** WebSockets (more lifecycle/proxy complexity for server-to-client flow); polling (higher latency and load); long polling (less natural streaming).
- **Consequences:** Reverse proxies must preserve SSE buffering/timeout behavior. A stream is not the source of truth: durable stage/narrative records are. Credentials remain HTTP-only/same-origin and SSE never emits secrets.
