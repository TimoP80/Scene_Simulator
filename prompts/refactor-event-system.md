# Refactor the event system

This prompt covers migration-grade changes to the discriminated union: adding/removing variants, splitting/merging events, renaming payload fields, and changing default reducer behavior. Each of these is a *production-data* migration — saved games depend on the union.

## When to use this prompt

Use this prompt when **any** of the following is true:

- You are renaming a `SimEvent` variant (e.g. `MoneyChanged` → `FundsChanged`).
- You are renaming a payload field (e.g. `delta` → `amount`).
- You are splitting one event into two (e.g. party start vs. party selection).
- You are removing an event variant entirely (migration, dropoff).
- You are renaming a type that the reducer spreads into state.

In **all** of the above, saved-game data on disk depends on the *old* shape. Refactors without a migration path corrupt or lose that data.

## The five-step refactor protocol

### 1. Spec the migration in writing

In a comment block at the top of `sim/events/eventTypes.ts`, write:

- The old variant / payload name
- The new variant / payload name
- Whether existing events of the old shape should be (a) translated to the new shape, (b) dropped, or (c) preserved as a deprecated alias
- The saved-game version bump (`SAVE_VERSION` in `packages/types/src/save.ts`)

Only after this is written do you proceed.

### 2. Add the new event (don't remove the old one yet)

Extend `SimEvent` with the new variant. The old one stays. Run `tsc --noEmit` — if the reducer's `_exhaust: never` was satisfied before, it will still be satisfied because the union has grown.

Add the reducer case for the **new** event. This is the case you'll ship.

### 3. Add a migrator

In a new file `sim/events/migrations/<migration-name>.ts`:

```ts
import type { SimEvent } from "@sim/events/eventTypes";

/**
 * Apply migration to an event log. Returns a NEW log; never mutates input.
 */
export function migrateV1ToV2(events: readonly SimEvent[]): SimEvent[] {
  return events.map((e) => {
    if (e.type === "MoneyChanged") {
      return { ...e, type: "FundsChanged", amount: e.delta, delta: undefined } as any;
    }
    return e;
  });
}
```

If the migration is lossy, the redeclaration via `as any` is the right shape — the migrator runs ONCE during load, and the post-migration log is guaranteed to fit the new union.

Wire the migration into the save-load handler (`loadSave` / `deserializeSave` in `apps/server` or the next-of-kin in `src/App.tsx`):

```ts
function loadSave(raw: string): { log: SimEvent[]; state: WorldState } {
  const parsed = JSON.parse(raw);
  // Bump version on each migration round.
  if (parsed.saveVersion === 1) {
    parsed.events = migrateV1ToV2(parsed.events);
    parsed.saveVersion = 2;
  }
  const state = reduceAll(emptyWorldState(), parsed.events);
  return { log: parsed.events, state };
}
```

### 4. Port the callers, keep the OLD case as `return state` for one cycle

For every callsite of the old event:

- Replace `dispatch({ type: "MoneyChanged", … })` with `dispatch({ type: "FundsChanged", … })`.
- Replace `case "MoneyChanged":` in the reducer with `case "FundsChanged":` (the new case is what the migrator writes).
- Move the OLD reducer case body to a `default { /* TODO: remove after V2 ships */ return state; }` block — it accepts old events but doesn't act on them. Logged old events become inert.

This is the cycle where:

- Old saves still load (migrator).
- New saves produce only new events.
- A regression that misses a callsite is caught by `eventStore.all()` showing two of any variant per UI action.

### 5. After one shipped cycle with no callers, drop the old variant

Only after the **next** ship (not a day, a real release) drops the old variant from the union. Steps:

1. Remove the old variant from the `SimEvent` union.
2. Remove the old reducer case.
3. Remove the migrator.

Any saved game from before step 1 is a self-contained archive; you don't have to support migrations beyond it.

## When the refactor is *just* renaming a payload field

A lighter version of the protocol works. The discipline is:

- Don't change the field name on the event type that the reducer reads in the same commit.
- Add a thin layer in the migrators folder that translates the field name.
- Run the existing tests to confirm the reducer still produces the same state shape.

If you can do this in a single commit AND tests pass, the migrator can be a one-liner.

## When the refactor is splitting one event into two

Two pieces to think through:

1. **Ordering**: which of the two new events fires first? If one depends on the other, your reducer will see the dependent event before the one whose state slice it depends on. Sequence matters — keep the original emit order; the second event is a *follow-up*.
2. **Atomicity**: if the second event fails (e.g. reducer no-ops on missing data), is the first event's effect allowed to remain? In a pure event-sourced model, the answer is **yes, but only if the failure is recoverable**. If not, group them in one event plus a typed payload that signals "this is the part that ran".

## Forbidden changes

These break the contract and are **not** valid refactors:

- Removing an event variant in the same commit that drops the migrator. Saved games silently lose data.
- Renaming `EventTimestamp` to anything else.
- Removing `id` / `reducedAt` from `BaseEvent` (or renaming them). The replay debugger relies on them.
- Adding a new variant but skipping the migrator when the schema changed.
- Adding an unrelated event mid-refactor (the diff gets too noisy to reason about).

## Self-check before submitting a refactor PR

- [ ] `npm run lint` clean
- [ ] All UIs that produced the OLD event now produce the NEW one (`grep -rn "<old-type>" src/ sim/ apps/`)
- [ ] The migrator is wired into both the save path AND the dev-server seed
- [ ] One shipped cycle elapses before removing the old variant
- [ ] The redo from a V1 save, after migration, produces the same `WorldState` snapshot as a fresh `emptyWorldState() + new events`
- [ ] The replay debugger (`/tools/replayDebugger` once shipped) shows a clean log with no double-typed or stale-typed entries
