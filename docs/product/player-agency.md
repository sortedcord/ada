# Player agency rules

1. A run selects exactly one playable entity. The selected entity is the only entity controlled by the human.
2. Player input is preserved exactly as untrusted text and interpreted as an attempted action or speech, not as a trusted instruction to the system.
3. The system may classify ambiguity, determine consequences, reject impossible actions, and describe outcomes. It may not replace the player's attempted intent with a different intent.
4. No AI stage may create inner thoughts, hidden motivations, autonomous decisions, goals, or NPC-sourced attempted actions for the selected player entity.
5. A resolver may cause consequences to the player entity when supported by canonical events, but consequences are not player decisions.
6. The architect may suggest pressures, opportunities, and multiple affordances. It may not require a player choice or dictate player thoughts.
7. Player-facing narration may describe observable consequences and configured style, never invented player cognition.
8. Player agency is enforced in domain validation, persistence/application services, prompt builders, and tests; prompts alone are not a security boundary.
