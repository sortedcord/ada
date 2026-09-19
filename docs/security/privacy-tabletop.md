# Privacy tabletop review

Participants: selected player entity `P`, NPC A `A` with secret `A-SECRET-CANARY`, and NPC B `B`. These are test markers only.

| Case                 | Canonical input                                  | A may receive                                            | B may receive                    | Player/narrator may receive                                                      |
| -------------------- | ------------------------------------------------ | -------------------------------------------------------- | -------------------------------- | -------------------------------------------------------------------------------- |
| Direct observation   | A and P share an open room; an event occurs      | A's scoped observation, subject to senses/attention      | No observation unless eligible   | P's observation/rendering only                                                   |
| Absence              | B is in an unrelated blocked location            | No event observation for B                               | Nothing about the event          | No B knowledge is implied                                                        |
| Lying                | A says a false claim to P                        | A knows speech occurred; B/P observe words if eligible   | Speech observation only          | Narration can report words, not canonize claim                                   |
| Remote communication | A sends a message to B                           | A observes send/response events                          | B observes received message only | P sees only a message event if eligible                                          |
| Summary              | A's private thought is consolidated              | A-owned summary with A scope                             | Never included                   | Never in player narration/journal                                                |
| Card mutation        | A-private evidence proposes a public-card change | Proposal is rejected or redacted if scope would widen    | No private source in B context   | Player sees only approved safe card version                                      |
| Details view         | Human explicitly opens A response details        | Out-of-world UI may show inspectable fictional A thought | B prompt still excludes it       | Details endpoint returns only A thought/stimulus metadata, not prompts/reasoning |

Review outcome: access is decided by principal and deterministic eligibility, not by model instructions. Every case requires source IDs and explicit scope. Any missing owner/scope, cross-run reference, or ambiguous observer fails closed. The implementation test suite must use unique canaries and assert both candidate exclusion and final-output exclusion.
