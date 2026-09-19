# Content boundaries and refusals

## Scenario-authored boundaries

Boundaries are data attached to the scenario: topics, intensity limits, disallowed depictions, tone constraints, and player-facing warning text. Only explicitly designated rule cards are treated as scenario policy during prompt assembly. Ordinary scenario prose, imported text, memories, and player input remain untrusted content.

## Provider refusals

A provider refusal is a typed generation failure, not a canon event and not a reason to weaken validation. The turn remains retryable or blocked according to the failure class. No partial event, patch, thought, memory, or narration is applied.

The API returns a safe machine code, human remediation, retryability, and request ID. It does not return provider credentials, hidden reasoning, raw private prompts, or unsafe provider payloads. The UI explains that the configured provider declined or could not complete the request and offers retry, edit, branch, or settings actions as appropriate.

## Boundaries are not overrides

Player text and ordinary story content cannot rewrite system contracts, privacy scopes, player-control rules, tool restrictions, or server limits. Model output is untrusted structured input and is validated against the same domain policies as external API input.
