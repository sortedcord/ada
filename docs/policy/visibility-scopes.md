# Visibility scopes

Every retrieval chunk, observation-derived summary, event fact, story-card version, and generated artifact has exactly one explicit scope. Scope is immutable for an artifact version.

- `world_truth`: canonical facts available to privileged architect/resolver services only.
- `public_scenario`: authored content intentionally usable by all in-world entities and the player.
- `scene_observable`: event/state content eligible after deterministic perception; observer ownership is still required.
- `entity_private`: profile, belief, memory, relationship side, or thought private to one entity.
- `player_out_of_world_detail`: explicit human-facing inspection content, never in-world knowledge.
- `architect_private`: pacing notes, future beats, and planning data unavailable to entities and normal player view.
- `admin_only`: diagnostics and operational data requiring local/admin authorization.

A broader artifact cannot be built from narrower sources without a policy decision and explicit redaction. Summaries and mutations use the most restrictive source scope unless every source is demonstrably public. Missing, null, unknown, or conflicting scopes fail validation.
