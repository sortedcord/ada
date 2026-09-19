# Canonical patch vocabulary v1

Resolver patches are allowlisted JSON Patch operations. Paths are rooted at a runtime projection and are parsed as segments; no arbitrary traversal, prototype keys, array-index tricks, or dynamic root is accepted.

## Allowed roots and operations

| Root                                          | Allowed paths (examples)                                                                                                   | Operations                                               |
| --------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `/entities/{entityId}`                        | `active`, `alive`, `locationId`, `structuredAttributes/{declaredKey}`, `inventory/{declaredItemId}`, bounded numeric stats | `add`, `replace`, `remove` only where the schema permits |
| `/locations/{locationId}`                     | declared environmental state, `blocked`, bounded hazard state                                                              | `add`, `replace`, `remove`                               |
| `/relationships/{sourceId}/{targetId}/{type}` | configured dimensions such as affinity/trust/fear/obligation/suspicion/hostility, history summary                          | `replace` on declared fields only                        |
| `/world/time`                                 | bounded UTC/fictional time advance                                                                                         | `replace`                                                |
| `/storyCards/{cardId}/state`                  | run-scoped activation and bounded state fields, never authored body/scope/lock                                             | `add`, `replace`, `remove`                               |

## Forbidden paths and behavior

- Any path containing `__proto__`, `prototype`, `constructor`, an empty segment, `..`, or an unrecognized ID/key.
- Authored scenario revision fields, player intent/raw input, entity thoughts, beliefs, memories, visibility, ownership, permissions, card body/version/lock/policy, or arbitrary JSON blobs.
- A patch that grants knowledge, creates an observation, changes an entity's belief directly, changes the selected player's intent, or widens scope.
- Numeric values outside configured bounds, invalid references, inaccessible actors, and stale projection versions.

The validator checks operation, path, type, bounds, capability/presence hooks, lock state, expected version, and cross-resource ownership before application. The server may reject a proposal; it never silently broadens the allowlist.
