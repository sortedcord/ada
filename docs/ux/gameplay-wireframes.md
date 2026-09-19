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
