# Plot transitions and story-card mutation rules

## Plot status graph

Valid transitions are:

- `proposed -> dormant | available | abandoned`
- `dormant -> available | abandoned`
- `available -> foreshadowed | active | dormant | abandoned`
- `foreshadowed -> active | dormant | failed | abandoned`
- `active -> resolved | failed | dormant | abandoned`
- `resolved`, `failed`, and `abandoned` are terminal for v1 unless an explicit transformation creates a new point.

Deterministic preconditions and resolution conditions operate on canonical facts and require supporting event IDs. Narration wording alone cannot transition a point. Ambiguous cases require an architect proposal with evidence and policy validation.

## Story-card mutation modes

- `static`: no post-start mutation.
- `manual_only`: only attributable author/player edits.
- `append_only`: AI may append dated developments to the designated append field.
- `ai_suggest`: AI proposal is stored for explicit approval.
- `ai_mutable`: validated allowlisted operations may apply automatically.

Locks override mutation. Every mutation requires card ID, expected current version, source event/turn IDs, reason, confidence, contradiction warnings, and scope impact. Scope may never widen beyond authorized source data. A mutation writes an immutable version/diff, switches the current pointer transactionally, deactivates old retrieval chunks, and queues indexing only after commit. Rollback creates a new version copied from history; it never deletes intervening versions.
