# ADR-009: Localhost-default authentication baseline

- **Status:** Accepted
- **Context:** Self-hosted local use should be simple, but remote exposure must not create an unauthenticated private-data service.
- **Decision:** Bind services to localhost by default and permit an explicit unauthenticated local mode only when remote exposure is disabled. Remote mode requires configured authentication, secure HTTP-only same-site sessions, CSRF protection, origin-restricted CORS, rate limits, and secure cookies under TLS. Keep the session boundary compatible with passkeys later.
- **Alternatives:** Always require login (friction for local-only use); bearer tokens in browser storage (XSS exposure); no auth (unsafe remote posture).
- **Consequences:** Deployment configuration must detect contradictory settings. API responses and logs never reveal secret configuration values. Remote enablement requires an explicit startup validation and documentation warning.
