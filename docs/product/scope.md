# Product scope

## v1 goals

- Self-hosted Docker Compose deployment for one human player.
- Browser/PWA client with scenario authoring, validation, revisions, import/export, and complete resource editing.
- Authored entities, directional relationships, hierarchical/connected locations, story cards, plot arcs, and plot points.
- Runs pinned to immutable scenario revisions with one selected playable entity.
- Resumable, idempotent turns with canonical events, projections, deterministic observations, NPC decisions, fictional NPC thoughts, and streamed player-safe narration.
- Explicit epistemic privacy for NPC profiles, beliefs, memories, thoughts, and private lore.
- Lexical retrieval by default, optional pgvector embeddings, profile activation, and complete reindexing.
- Architect guidance, evidenced plot transitions, bounded interventions, and policy-controlled story-card mutations.
- Retry, cancellation, branching, rewind, narration regeneration, save bundles, snapshots, backups, observability, security controls, and accessible UI.

## Explicit non-goals

- Multiple simultaneous human players or multiplayer synchronization.
- Hosted SaaS, billing, public scenario marketplace, feeds, or social features.
- Native mobile applications.
- Real-time voice interaction.
- AI-generated images, maps, or audio.
- A general tabletop combat engine; scenarios may define bounded custom rules.
- Model tools with shell, unrestricted network, arbitrary SQL, or unrestricted file access.
- Treating narrative prose as a source of canonical state.

The domain keeps extension points for these capabilities, but v1 acceptance is based on the single-human-player, self-hosted product above.
