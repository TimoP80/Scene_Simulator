# Add feature

Goal: ship a new gameplay action that goes end-to-end (event → reducer → projection → UI hook). The order below is mandatory and prevents the most common AI drift — emitting an event the reducer doesn't know about, or wiring a UI hook that mutates state directly.

Use this prompt when adding a feature such as: a new rig, a new BBS event, a new party mechanic, a new NPC cognitive drift.

## Step 1 — Scope the feature

Before you write code, answer each of these in writing:

- **What gameplay reality does this feature represent?** (e.g. "user purchases a new platform rig that grants them HW-specific demos.")
- **Which `WorldState` slice does it touch?** (e.g. `player.ownedRigs`, `player.activePlatform`.) Keep the answer small. If you are touching 4+ slices, split into 2 features.
- **Which existing event variant is closest to your new event?** (e.g. `RigPurchasedEvent` for a rig action.) If a close match exists, **reuse its semantics** rather than parallel-creating one.
- **Is there an existing `emit.*` helper?** If yes, prefer it; if no, you'll add one in step 4.

Output the answers before you write a line.

## Step 2 — Extend `SimEvent` (only if no close match exists)

In `sim/events/eventTypes.ts`:

```ts
export interface MyNewEvent extends BaseEvent {
  type: "MyNewEvent";
  // full payload — never lossy. Payloads are how the reducer rebuilds state.
  payloadField1: string;
  payloadField2: number;
}
```

Add it to the discriminated union:

```ts
export type SimEvent =
  | MoneyChangedEvent
  | … existing 21 variants …
  | MyNewEvent;
```

After this edit, `tsc --noEmit` will fail on `default: const _exhaust: never = event;` in the reducer. **This is the prompt that the reducer case needs to be added.** Don't suppress it.

## Step 3 — Reducer case

In `sim/engine/reducer.ts`:

```ts
case "MyNewEvent":
  return {
    ...state,
    player: {
      ...state.player,
      // … spread the slice you mentioned in step 1
      ownedRigs: [...],
    },
  };
```

Checklist:

- Returns a freshly-spread `WorldState`. No shared references.
- If the case legitimately needs to be a no-op, write a comment explaining what other event carries the actual effect (see `BurnoutReduced`).
- The exhaustive-default `_exhaust: never` should compile after this edit.

## Step 4 — `emit.*` helper (only if used ≥ 2 places)

In `sim/events/appendEvent.ts`:

```ts
// This example MUST be added inside sim/events/appendEvent.ts itself, where
// the module-level `currentTick` is in scope. Outside that file (e.g. inside
// UI handlers, projections, or tools), use `getCurrentTick()` instead —
// `currentTick` is not exported.
export const emit = {
  // … existing builders …
  myNewAction: (field1: string, field2: number) =>
    appendEvent({
      type: "MyNewEvent",
      ts: currentTick,
      payloadField1: field1,
      payloadField2: field2,
    }),
};
```
```

```ts
// ✅ Right: a typed EventDraft turns into a fully-stamped SimEvent.
const evt = emit.myNewAction("answer", 42);

// ✅ Right: same builder is reusable inside services / projections.
const evt2 = emit.myNewAction("answer", 42);
```

Pitfalls (any of these is a regression):

- **Lossy payload**: don't write an `emit.*` helper that takes more data than the event stores (e.g. takes a full rig config but only stores an id). Either expand the event first, or shrink the helper signature.
- **Plain `Omit<SimEvent, …>`**: the helper's parameter pattern must produce literal types. Don't fall back to manual spreading.

## Step 5 — Projection + UI hook

A projection in `sim/projections/<area>.ts` (e.g. `npcProjection.ts`) consumes `WorldState` and produces the UI-ready view-model. Until projections are populated, the UI handler reads `WorldState` directly via `SimulationLoop.snapshot()` — without resetting any slice.

UI handler:

```tsx
function BuyRigButton({ state, loop }: { state: WorldState; loop: SimulationLoop }) {
  return (
    <button
      disabled={state.player.money < rig.cost}
      onClick={() => {
        // DRAFT form for both: an object literal with `type` + every payload
        // field. Never write `loop.dispatch(emit.x(...))` — that's M1.
        loop.dispatch({
          type: "MoneyChanged",
          ts: getCurrentTick(),
          delta: -rig.cost,
          reason: `buy ${rig.id}`,
        });
        loop.dispatch({
          type: "RigPurchased",
          ts: getCurrentTick(),
          platformId: rig.id,
        });
      }}
    >
      Buy rig
    </button>
  );
}
```

Two-economy rule: most purchases look like `MoneyChanged{delta: -cost}` + `RigPurchased{platformId}`. Both go through `loop.dispatch` — see `RigPurchasedEvent` for the canonical pattern.

## Worked example — adding "Famous Rivalry" mechanic

A rivalry is just an `EdgeAdded` of type `"rivalry"` plus an `EdgeWeightChanged` whenever the wave passes through. So there is no new event in this case; we are wiring existing ones:

1. **Scope**: a single "rival" NPC declaration writes an `EdgeAdded` with `type: "rivalry"` and `weight: initialRivalry`.
2. **No event additions needed**.
3. **No reducer changes needed** — the existing `case "EdgeAdded"` already deduplicates and appends.
4. **No `emit.*` needed** — but the projection layer should surface rival-rivalry in `npcProjection.rivalryStrain(charId)`.
5. **UI**: declare the rival by calling `loop.dispatch({ type: "EdgeAdded", ts, edgeId, edge: buildRivalryEdge(...) })`.

That is the response to "Add Famous Rivalry Mechanic"; the rule was: don't add an event when an existing one already covers the case.

## Worked example — adding "Recruit at party" mechanic

A new gameplay reality. New event required.

1. **Scope**: at party end, player can recruit one of the participating NPCs.
2. **Event**: `RecruitedAtParty { type: "RecruitedAtParty"; charId: string; partyName: string; cost: number }`.
   - Add to eventTypes.ts union.
   - Add to reducer, mutating `state.crew.characters[charId]` (Mirror the CrewHired case so the hire paths converge.)
   - Add an inline dispatch with `appendEvent({ type: "RecruitedAtParty", ts: getCurrentTick(), charId, partyName, cost })` (no `emit.*` helper yet — the event isn't called from ≥ 2 places, so per Step 4 don't add a builder).
3. **Render** — at the party-results screen, show a recruit button that fires both `MoneyChanged{-cost}` and `RecruitedAtParty`.

## Checklist (do not ship any feature missing any of these)

- [ ] `tsc --noEmit` clean
- [ ] The new event is in `SimEvent`
- [ ] The reducer case returns a freshly-spred slice
- [ ] If a helper was added, its payload reaches the reducer unaltered
- [ ] No `return state;` silence
- [ ] No React / DOM imports added to `/sim`
- [ ] No new `interface *` outside `@packages/types`
- [ ] Documentation rule: `docs/event-sourcing.md` and `docs/simulation-rules.md` are still consistent; if the feature introduces a new pattern, add a worked example to `docs/simulation-rules.md`.

## Final test sequence

1. Run `npm run lint` to confirm typecheck.
2. Run the dev server (`npm run dev`) and exercise the new feature.
3. Open `eventInspector` (when implemented in `/tools`) and confirm the events are output in the order you expect.
4. If the feature involves money / rep / research, scan the existing `MoneyChanged`/`ReputationChanged`/`ResearchPointsChanged` callsites and ensure none of them were bypassed.
