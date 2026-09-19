# Narration modes

## Supported v1 configuration

- `first_person/present`
- `first_person/past`
- `second_person/present`
- `second_person/past`
- `third_limited/present`
- `third_limited/past`

The default is `third_limited/past` with a player-limited knowledge boundary. Scenario authors may choose a supported mode; a run may override person/tense only when the scenario enables that override.

## Player-limited default

The narrator receives the selected player's observations, player-known records, public scenario/style rules, and safe canonical render hints. It does not receive hidden NPC thoughts, unrelated private profiles, architect-private notes, or resolver-only facts. Inference is allowed only as clearly framed narration grounded in available observations; it must not reveal the source's unavailable truth.

## Omniscient mode

V1 does not enable omniscient narration by default. An explicit scenario setting `omniscient_narration` may be supported only as a deliberate, visible configuration and must be rejected unless the author confirms its out-of-world disclosure semantics. Even in this mode, NPC prompts remain entity-private and player agency remains unchanged. The initial implementation should ship player-limited mode first.
