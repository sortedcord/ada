# Threat model

## Assets

Provider credentials, session cookies, canonical world truth, NPC private profiles/beliefs/memories/thoughts, architect notes, scenario exports, save bundles, audit metadata, and queue/database availability.

## Trust boundaries

Browser/player input -> API; API/worker -> database and Redis; worker -> external model provider; retrieval -> prompt assembly; provider output -> validators; admin/debug UI -> privileged data. Scenario text, imported files, player text, model outputs, Markdown, and provider responses are untrusted at each boundary.

## Threats and controls

| Threat                  | Primary controls                                                                                       |
| ----------------------- | ------------------------------------------------------------------------------------------------------ |
| Credential leakage      | server-only secrets, redacted logs, safe settings DTOs, no secret exports/browser storage              |
| Prompt injection        | delimit untrusted content, explicit trusted rule-card types, structured validation, no model authority |
| Private-context leakage | principal-aware SQL filtering before ranking, separate scopes/chunks, canaries                         |
| XSS/unsafe Markdown     | no raw HTML, sanitization, safe URL schemes, CSP                                                       |
| CSRF/CORS abuse         | same-origin HTTP-only sessions, CSRF token, allowlisted origins                                        |
| SSRF                    | validated provider URLs, private/link-local/metadata IP blocking, redirect checks                      |
| Malicious imports       | size/path/schema/reference validation and transactional writes                                         |
| Oversized input/fan-out | body, token, NPC, model-call, retrieval, and thought caps                                              |
| Debug-route exposure    | disabled outside development, local/admin auth and re-authentication                                   |
| Queue abuse/replay      | rate limits, idempotency, per-run locks, bounded retries, dead letters                                 |
| Model tool abuse        | no unrestricted tools; allowlisted typed operations only                                               |
| Backup leakage          | separate secret backup guidance, checksums, exclusion tests, restrictive paths                         |
| State corruption        | append-only events, short transactions, optimistic versions, snapshots/rebuild                         |

## Residual risks

The configured model may produce low-quality or manipulative prose, and a trusted administrator can inspect private game data. These are surfaced in UX and audit records; neither is treated as an authorization shortcut.
