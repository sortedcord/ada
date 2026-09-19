# Principals and authorization matrix

`Deny` is the default. Every request must declare a complete principal, run/branch when applicable, and explicit scope.

| Principal                  |                  World truth |      Public scenario |   Scene observations |                                              Entity-private |     Player out-of-world detail | Architect-private | Admin debug |
| -------------------------- | ---------------------------: | -------------------: | -------------------: | ----------------------------------------------------------: | -----------------------------: | ----------------: | ----------: |
| `ARCHITECT`                |                        Allow |                Allow |                Allow |                                           Allow for its run |  Deny as a separate UI concern |             Allow |        Deny |
| `RESOLVER`                 | Allow for current run/branch |                Allow |                Allow |                                Allow when needed to resolve |                           Deny |             Allow |        Deny |
| `NARRATOR`                 | Safe event/render hints only |                Allow | Selected player only | Selected player only when represented by player observation |                           Deny |              Deny |        Deny |
| `NPC(entityId)`            |          No raw global truth |                Allow |     This entity only |                                             This owner only |                           Deny |              Deny |        Deny |
| `MEMORY_CURATOR(entityId)` |                         Deny | Allow where relevant |     This entity only |                                             This owner only |                           Deny |              Deny |        Deny |
| `PLAYER_VIEW(entityId)`    |                         Deny |                Allow | Selected player only |                 Selected player-owned player knowledge only | Explicit details endpoint only |              Deny |        Deny |
| `ADMIN_DEBUG`              |  Local/admin authorized only |                Allow |                Allow |                              Explicitly selected owner only | Allow through marked inspector |             Allow |       Allow |

## Mandatory checks

- Resource run/branch/revision ownership must match the request.
- Entity-private access requires the same owner entity or a privileged service role.
- `PLAYER_VIEW` details are never implicitly included in normal narrative, retrieval, exports, logs, or prompts.
- `ADMIN_DEBUG` is disabled outside development unless remote admin authentication is explicitly configured.
- A null/missing scope, incomplete principal, cross-run reference, or ambiguous owner is rejected rather than widened.
