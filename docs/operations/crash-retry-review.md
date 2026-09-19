# Crash/retry tabletop review

| Failure point             | Durable state                                      | Recovery                                              |
| ------------------------- | -------------------------------------------------- | ----------------------------------------------------- |
| Before provider call      | stage input snapshot and pending stage             | retry same stage key                                  |
| During provider streaming | invocation/job heartbeat; no canonical apply       | cancel or retry; discard incomplete rendering         |
| After event commit        | unique application key, events/projection versions | resume from committed stage; never reapply            |
| Before turn completion    | narration/final stage may be durable               | reconcile final text and complete or mark retryable   |
| Worker crash              | job run heartbeat and stage result                 | startup scan resumes/retries according to idempotency |
| Concurrent submission     | expected run version and per-run lock              | one accepted canonical turn; other gets conflict      |

No provider wait occurs in a database transaction. A retry can replace an unapplied stage result but cannot overwrite an applied result. Cancellation after canon commit is reported as post-commit cancellation and does not roll back history silently.
