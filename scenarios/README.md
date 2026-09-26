# Curated Scenarios

This directory contains **author-facing source packages**, not player-safe static files. An imported scenario contains canon, entity-private material, and alternate outcomes; serve it only through Ada's API, which applies epistemic filtering at query time.

## The Tide Keeps Its Ledger

[`the-tide-keeps-its-ledger.scenario.json`](./the-tide-keeps-its-ledger.scenario.json) is a complete, importable civic mystery for one playable character: **Tomas Vale**.

Seven years after a flood warning was changed in the record, Tomas returns to Veyr with four nights left before a king tide tests the same failing floodworks. The brass tally-tab nailed to the old registry door can lead to a late warning bell, a held gate, an undocumented evacuation route, a map altered by someone who needed to survive, and people who have good reasons to fear what the truth will cost.

The premise deliberately avoids a single reveal or required moral answer. Tomas can:

- authenticate and publish parts of the record;
- repair or publicly inspect the gate before the tide;
- negotiate a binding water-and-repair charter;
- protect witnesses or keep evidence private;
- ask for accountability without demanding forgiveness;
- leave some uncertainty unresolved; or
- make a different, evidence-grounded route with the people involved.

The endgame is a decision at the North Sluice, not a prescribed ending. It should test consent, trust, warning routes, material repair, and who bears risk rather than rewarding the player for finding a single "correct" culprit.

## The Last Slot

[`the-last-slot.scenario.json`](./the-last-slot.scenario.json) is a modern college-life scenario for **Eli Mendoza**, a male junior transfer student in a media studies program.

It begins on a Thursday evening in a campus Media Lab that is about to lose overnight access. Eli’s capstone partner is recording behind the closed door of Sound Booth B; his roommate has an aid appeal hidden in their dorm room; the student paper holds a facilities calendar that could expose a staged consultation; and a community-garden organizer wants to know whether Eli’s audio walk offers more than a beautiful story about somebody else’s life.

The scenario is authored with **separate rooms, hallways, and portal doors**. A closed dorm-room or sound-booth door blocks sight and muffles sound, so characters do not become magically present after the player leaves a room. Its central choices include the final studio slot, Benji’s housing appeal, the campus-paper source, the sponsor agreement, the garden’s consent terms, and Friday’s showcase. It does not force a romance, public disclosure, activism, a single moral answer, or a polished ending.

### Import

Start the local stack, then import either package through the public API endpoint:

```bash
# The Tide Keeps Its Ledger
curl --fail-with-body \
  -X POST http://127.0.0.1:4173/api/v1/scenarios/import \
  -H 'content-type: application/json' \
  --data-binary @scenarios/the-tide-keeps-its-ledger.scenario.json

# The Last Slot
curl --fail-with-body \
  -X POST http://127.0.0.1:4173/api/v1/scenarios/import \
  -H 'content-type: application/json' \
  --data-binary @scenarios/the-last-slot.scenario.json
```

Publish the returned scenario ID, then retrieve its aggregate to find the playable entity ID:

```bash
curl --fail-with-body "http://127.0.0.1:4173/api/v1/scenarios/$SCENARIO_ID"
```

On a first import, the playable IDs are `entity_tomas_vale` for **The Tide Keeps Its Ledger** and `entity_eli_mendoza` for **The Last Slot**. If the API remaps IDs because a scenario with the same ID already exists, use the remapped entity ID from `revision.aggregate.entities[]` whose `playable` field is `true`.

```bash
curl --fail-with-body \
  -X POST "http://127.0.0.1:4173/api/v1/scenarios/scenario_tide_ledger/publish-revision" \
  -H 'content-type: application/json' \
  -d '{}'
```

The web scenario builder provides the equivalent import, publication, and run-start flows.

## Scenario Design Notes — Spoilers

### What happened on the Night of Three Bells

No character possesses a complete, morally neutral account:

- **Dorian Voss** held the North Sluice for eighteen minutes to protect the freshwater cistern and prevent a second, potentially larger infrastructure failure.
- The warning system was already compromised: the third bell's clapper had been replaced with inferior alloy, and a temporary Glass Ward runner route was removed.
- **Tomas** changed the public ledger after Dorian used his brother Eli's paperwork as leverage.
- **Nera** used a partial warning to free the dredge _Moth_ and save six people, leaving the public bell route untested.
- **Ivo** used an illegal culvert route to evacuate forty-one people, including Eli.
- **Sable's mother** replaced the archive copy of the warning-route map to protect her family after the flood.
- **Hessa** retained the defective clapper because evidence without worker protections could become another weapon against the docks.
- **Eli** has accepted Dorian's municipal pantry funding because the Chapel of Low Water keeps people alive.

These facts are intentionally distributed across private profiles, personal relationships, objects, physical spaces, and public records. They must not reach Tomas simply because the scenario author knows them.

### Character network

Tomas is connected to every major NPC, but the network should remain alive without him:

- Nera and Hessa are labor allies divided over urgency versus leverage.
- Dorian controls Eli's pantry funding and has institutional pressure over Sable's archive access.
- Sable and Eli trade records for practical aid.
- Ivo owes Nera money, supports Hessa through unrecorded repairs, and knows the only low-water route to the sluice.
- Every reciprocal relationship has a different private state. A public alliance is not the same as private trust.

### Running it well

1. **Start quiet.** Let Tomas inspect the tally-tab, make tea at the chapel, or ask for work on the _Moth_ before a crisis arrives.
2. **Let evidence change relationships, not eliminate them.** A true document can still be incomplete, a rescue can be brave and politically costly, and a harmful decision can have prevented a different harm.
3. **Do not use private facts as narration shortcuts.** Ask how a character could plausibly know something before allowing it into a scene.
4. **Make repairs material.** A charter needs beneficiaries, enforcement, costs, and people willing to sign it. A gate repair needs time, tools, access, and a plan for those left exposed.
5. **Make the king tide a choice under pressure, not a reveal delivery system.** The player may favor public inspection, quiet repair, negotiated evacuation, publication with caveats, a protected record, or another defensible action.

### Content and agency

The scenario contains institutional coercion, flood aftermath, labor precarity, grief, and family estrangement. It does not require romance, confession, forgiveness, public testimony, or a punitive ending. Characters can refuse to disclose evidence; Tomas can accept that refusal, negotiate, or choose another route.
