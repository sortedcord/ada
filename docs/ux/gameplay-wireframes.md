# Gameplay wireframes

```text
[Run / branch] [connection] [stage: resolving] [Cancel]
+-------------------------------+---------------------+
| Transcript                     | Current scene       |
| player action                  | location            |
| narration                      | present entities    |
| NPC speech/action [Details]    | known goals/cards   |
| system/error + Retry/Branch   | Journal             |
+-------------------------------+---------------------+
| multiline composer                         [Send] |
+---------------------------------------------------+
```

The transcript uses semantic landmarks and live regions for stage updates. The composer preserves drafts and disables duplicate submissions while applying. Details is an explicit fetch and displays only fictional thoughts, persistence class, perceived stimulus, and concise character-level rationale. It never displays provider reasoning or unrelated secrets. Refresh rehydrates persisted state and reconnects to the turn stream using `Last-Event-ID`.

The scene header and character-location display show human-readable location names, never canonical location IDs. Authored location names take precedence; dynamic locations use a stored scene name or a safe parent-based label when their stored name is a generated ID or generic placeholder. IDs remain internal for co-location checks.

New runs show a persistent player orientation above the transcript: the playable character's authored background, immediate situation, and optional non-binding leads. This is separate from the scene-setting prologue so players know who they are and what they might do without being assigned a mandatory objective. The scene API projects only an explicit `playerBriefing` on the selected playable entity; older revisions fall back to that entity's public description and omit unknown situation/leads. It does not expose unrestricted premise, character history, other entities' private descriptions, or architect goals.
