# Deployment defaults

The default Compose stack is localhost-only and uses these service names:

| Service    | Container port | Default host binding | Purpose                       |
| ---------- | -------------: | -------------------- | ----------------------------- |
| `web`      |             80 | `127.0.0.1:4173`     | Static browser/PWA            |
| `api`      |           3000 | internal only        | REST, SSE, health             |
| `worker`   |            n/a | internal only        | BullMQ processors             |
| `postgres` |           5432 | internal only        | PostgreSQL + pgvector         |
| `redis`    |           6379 | internal only        | Queue/coordination            |
| `caddy`    |         80/443 | optional             | Same-origin reverse proxy/TLS |

Named volumes: `ada_postgres_data`, `ada_redis_data` (Redis may be disposable after queue drain), and an application data volume for backups/import staging. Default database and Redis credentials are generated for local setup or supplied through a restrictive env/secret file; placeholders are never committed.

Health checks are process-only for liveness and dependency-aware for readiness. `/api` and SSE are routed same-origin through Caddy when enabled. Remote binding, TLS, and authentication are explicit opt-in settings; users must not expose the API directly by changing a port without enabling the remote security baseline.
