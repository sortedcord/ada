# Export versioning and server limits

## Scenario exports

Scenario export schema version: `scenario.v1`. Required manifest fields are `kind`, `schemaVersion`, `applicationVersion`, `scenarioId`, `revision`, `exportedAt`, `contentChecksum`, and `resources`. Stable ordering is required. Exports contain authored content only, never provider credentials, cookies, runtime turns, queues, logs, or raw private prompts.

## Save bundles

Save bundle schema version: `save-bundle.v1`. The manifest identifies app/schema versions, scenario revision, run/branches, included resource classes, checksums, and migration compatibility. Import validates archive paths, sizes, checksums, versions, references, and collisions before one transaction. Migration hooks never mutate the source archive. Secrets and transient provider authorization are always excluded.

## Initial configurable limits

Defaults are conservative and may be raised only through validated server configuration:

| Limit                           |       Default |
| ------------------------------- | ------------: |
| Player input                    |         8 KiB |
| Prompt budget by role           | 24,000 tokens |
| Output budget by role           |  4,000 tokens |
| Model calls per turn            |            16 |
| Active NPC cognition calls      |             8 |
| Generated thoughts per NPC/turn |             4 |
| Retrieval candidates            |           200 |
| Selected retrieval chunks       |            32 |
| Active memories per entity      |           500 |
| Active thoughts per NPC         |            32 |
| SSE replay events               |           500 |
| JSON request body               |       256 KiB |
| Scenario import                 |        10 MiB |
| Save-bundle import              |       100 MiB |

All limits are server-enforced, role-aware, and return explicit errors. Prompt fitting reserves output and safety headroom and never drops critical rules or schemas.
