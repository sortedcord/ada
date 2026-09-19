# Deterministic perception v1

Perception is computed from canonical event/state/topology inputs before any optional model interpretation. The result is a set of observer/entity and modality pairs.

## Eligibility

1. The observer must be active and have a valid most-specific location, or an explicit remote communication channel.
2. Same-location events are eligible subject to event visibility, concealment, observer attention, line-of-sight, and sensory capability.
3. An ancestor/descendant location is eligible only when the location's topology and sensory properties permit it; hierarchy alone does not grant sight.
4. Connected locations may grant hearing only across an open, discoverable, acoustically connected edge and within its distance/noise limit. Blocked edges grant no perception.
5. Concealed or undiscoverable participants/events are excluded unless the event modality and observer capability explicitly overcome concealment.
6. Remote communication creates a new communication event and observation of the communication, never direct access to the original event.
7. Absent, inactive, or incapable observers receive no observation.

Each observation records modality (`sight`, `sound`, `touch`, `inferred`, `reported`, `magical`, or configured modality), detail, confidence, occlusion/distortion, and source event. Optional AI interpretation may vary content but may not add an observer outside this deterministic eligible set.
