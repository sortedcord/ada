# ADR-002: PostgreSQL and pgvector

- **Status:** Accepted
- **Context:** Canon, audit history, JSON-shaped authored data, full-text search, graph traversal, and embeddings need transactional consistency and simple self-hosted backup.
- **Decision:** Use PostgreSQL 16+ with `vector` and `pg_trgm`, PostgreSQL full-text search, JSONB, recursive CTEs, and pgvector. Hide vector operations behind a `VectorStore` interface so another store can be added later. Store unconstrained vectors until a profile supplies dimensions; manage matching profile-specific HNSW indexes safely.
- **Alternatives:** Separate vector DB (more operational burden and cross-system ACL races); document DB (weaker relational constraints); fixed vector dimension (blocks deferred embedding choice).
- **Consequences:** Advanced vector/index SQL may use typed raw SQL. Database backups contain canon and private data and require restrictive handling. Authorization predicates must be applied before vector ranking.
