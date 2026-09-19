# Belief, memory, and thought semantics

## Beliefs

Confidence is a closed interval `[0, 1]`. Status is `active`, `doubted`, `rejected`, or `forgotten`. A speech observation is evidence that words were spoken, not proof of the proposition. Contradictory evidence reduces or changes confidence and preserves both evidence histories; it does not erase prior belief history. Supersession links explain replacement. Belief renderings must say that a proposition is believed or suspected when it is not canonical truth.

## Memories

Types are `episodic`, `semantic`, `emotional`, `relationship`, `goal_commitment`, and `procedural`. Importance, accessibility, confidence, salience, and emotional intensity are bounded `[0, 1]`; valence is `[-1, 1]`. Decay is deterministic from elapsed turns, decay rate, accessibility, and reinforcement. Recall reinforces accessibility and last-recalled turn. Consolidation creates a versioned memory linked to every source and never widens scope. Suppression/forgetting preserves immutable observations and source lineage.

## Thoughts

Thoughts are explicit fictional text, never provider reasoning. Classes:

- `ephemeral`: current-turn relevance; expires at the configured short horizon.
- `lingering`: survives turns until resolved, contradicted, expired, or decayed.
- `core`: enduring private attitude/fear/fixation; requires scenario setup or strong evidence.

Active thoughts are capped per NPC. Duplicate candidates consolidate with reinforcement rather than unbounded inserts. Every thought has owner, trigger, salience, urgency, emotion, optional target, status, expiry/decay, and inspectability. Thought records for the selected player entity are always rejected. Thoughts remain private to their owner in every in-world context.
