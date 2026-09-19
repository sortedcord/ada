# Phase 0 traceability review

This review maps the source plan's major product and architecture obligations to the execution checklist and the contracts created in Phase 0.

| Source-plan obligation                                      | Checklist coverage                         | Contract/evidence                                                                  |
| ----------------------------------------------------------- | ------------------------------------------ | ---------------------------------------------------------------------------------- |
| Database owns canon; events and projections                 | P0-012, P2-034–041, P3-065, P7-032         | `docs/adr/003-events-projections.md`, `docs/product/terminology-and-invariants.md` |
| Truth/perception/belief/memory/thought/narration separation | P0-001, P0-020–026, P2-036–040, P8-040–053 | glossary, policy docs, privacy tabletop                                            |
| One selected player entity and no AI thoughts               | P0-003, P2-052, P7-035, P7-055             | `docs/product/player-agency.md`                                                    |
| Principal-aware privacy and canaries                        | P0-016, P0-020–021, P8-010–021, P13-005    | policy matrix, scopes, threat model, tabletop                                      |
| Lexical retrieval plus deferred embeddings                  | P0-011, P0-030, P6-020–024, P8-030–036     | ADR-002, export/limits, deployment defaults                                        |
| Resumable/idempotent turns and SSE                          | P0-013–014, P2-032, P3-064–070, P7-010–055 | ADR-004/005 and crash/retry review                                                 |
| Versioning, branches, rollback                              | P0-017, P0-028–029, P10-001–045            | ADR-008 and policy docs                                                            |
| Architect and dynamic cards without direct canon mutation   | P0-028, P2-059–060, P9-001–039             | plots/cards policy and agency rules                                                |
| Secure self-hosted deployment                               | P0-018, P0-044–046, P1, P12                | auth/deployment/threat/privacy docs                                                |
| Provider abstraction and versioned prompts                  | P0-015, P0-019, P6-001–073                 | ADR-006/010, MODEL_INFO.md                                                         |
| Authoring/gameplay/settings UX                              | P0-040–043, P5, P7, P11                    | four UX wireframes                                                                 |
| Export/save compatibility                                   | P0-029, P4-050–055, P10-040–045            | export-and-limits policy                                                           |

The mapping is intentionally at feature level; implementation tasks remain the authority for completion evidence in later phases.
