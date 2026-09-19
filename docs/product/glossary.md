# Product glossary

- **Scenario** — An authored template from which runs are created.
- **Scenario revision** — An immutable, numbered snapshot of a scenario's authored resources. Runs pin one revision.
- **Run** — One playable runtime created from a published scenario revision; it has one selected player entity.
- **Branch** — An append-only alternate future of a run, forked from a turn or snapshot. Old branches are retained.
- **Turn** — One accepted player input and its resumable processing lifecycle.
- **Stage** — A durable step in turn processing, such as intent extraction, resolution, or narration.
- **Attempted action** — What a player or NPC tried to say or do. It is not necessarily canonically successful.
- **Canonical event** — An append-only server-validated fact about what happened in the world.
- **Projection** — Query-friendly current state derived from canonical events and authored state.
- **Observation** — An entity-specific record of what that entity could perceive from an event.
- **Belief** — An entity-owned, confidence-bearing proposition that may be true, false, or uncertain.
- **Memory** — A retained experience, fact, emotion, relationship, goal, or procedure owned by an entity.
- **Fictional inner thought** — Explicit game content representing an NPC's private thought. It is not provider reasoning or chain-of-thought.
- **Story card** — A modular, scoped authored or generated context record used for lore, rules, character, location, plot, or style.
- **Card version** — An immutable revision of a story card. A current pointer selects one version without deleting history.
- **Plot arc** — An ordered, high-level dramatic grouping of plot points.
- **Plot point** — A scoped, evidenced dramatic objective with conditions, status, dependencies, and outcomes.
- **Architect** — A privileged planning role that advises pacing and plot direction but cannot directly mutate canon.
- **Resolver** — A privileged role that proposes events and patches; the server validates and applies them.
- **Narrator** — A rendering role that writes player-facing prose from player-authorized observations and safe event hints.
- **Principal** — The declared identity and permission context for a read or write, such as `NPC(entityId)` or `PLAYER_VIEW(entityId)`.
- **Visibility scope** — A required label controlling which principals may read a resource; missing scope is invalid.
- **Retrieval document** — A versioned source projection eligible for indexing.
- **Retrieval chunk** — A bounded, independently scoped searchable unit derived from a retrieval document.
- **Embedding profile** — A configured provider/model/dimension/distance tuple and its lifecycle state.
- **Snapshot** — A checksummed, versioned serialization of run projections at a known branch and turn.
- **Save bundle** — A versioned archive containing scenario/run data and provenance needed for restore, excluding secrets and transient credentials.

## Layer vocabulary

World truth, observations, beliefs, memories, thoughts, and narration are separate layers. A record must never be promoted between layers merely because prose or a model output mentions it.
