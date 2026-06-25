# Debug simulation

When something goes wrong — duplicated releases, NPC opinions that never seem to drift, BBS threads that never go viral — the diagnosis almost always lives in **two places**: the event log and the `WorldState` snapshot. This prompt walks the standard playbook.

## Playbook 0 — Sanity

Before you spawn anything:

- `npm run lint` clean? If not, debug the TS error first — it points at the file that should not have changed.
- Is the dev server on the latest saved state? Save → reload → reproduce.
- Does the bug reproduce on a fresh save? If yes, the bug is in the event path. If no, it's in save-load.

## Playbook 1 — Inspect the event log

Use `eventStore.all()` (and `eventStore.since(tick)`) to read the canonical timeline.

```ts
import { eventStore } from "@sim/events/eventStore";

const all = eventStore.all();
const lastTick = all.at(-1)?.ts ?? 0;
const since = eventStore.since(420);  // year * 12 + month
```

What to look for:

- **Missing events** — the action should have fired an event, but no event exists. Bug: the UI handler is mutating state directly (`setX` without `dispatch`).
- **Duplicate events** — the same `SimEvent` fired twice in a row with the same `id`-less core but different wrapper (StrictMode double-invoke / intervals running twice). Bug: the guard at the entry point is missing. See `firedThisInterval` pattern.
- **Wrong-order events** — `MoneyChanged{+100}` fired AFTER the event that spends it. Projection sees negative money in flight.
- **Stale events** — an event fired with `ts` from a previous tick. Bug: `currentTick` was not updated after `advanceMonth`.

## Playbook 2 — Inspect the WorldState snapshot

Use `SimulationLoop.snapshot()`.

```ts
const state = loop.snapshot();
console.log(state.productions.mine);
console.log(state.player.money, state.player.reputation);
console.log(state.socialGraph.nodes.length, state.socialGraph.edges.length);
```

Compare against `reduceAll(emptyWorldState(), eventStore.all())` — these MUST match. If they diverge, the bug is in `SimulationLoop.dispatch` (it skipped reduce somewhere).

```ts
import { reduceAll, emptyWorldState } from "@sim/engine/reducer";
const replayed = reduceAll(emptyWorldState(), eventStore.all());
```

If snapshot ≠ replayed, the bug is that someone bypassed `loop.dispatch`.

## Playbook 3 — Common failure-mode playbooks

### "Releases are duplicated when compiled"

Cause: an action was wired through `setState((prev) => { … sideEffect(); return next; })` and React 18+ StrictMode double-invoked the updater, executing the side effect twice.

Fix:

- The UI handler calls `loop.dispatch(emit.demoCompiled(production))` once. Strict-mode-safe.
- If you cannot replace the handler with a dispatch right now, the local defense pattern is a `useRef<boolean>` reset on every click:

  ```ts
  const compilationFinishedRef = useRef<boolean>(false);

  function trigger() {
    compilationFinishedRef.current = false;
    // setup interval — increment tickingProgress outside setState updater
    if (tickingProgress >= 100 && !compilationFinishedRef.current) {
      compilationFinishedRef.current = true;
      finishCompilation();
    }
  }
  ```

  Note: this is **NOT** a structural fix; the structural fix is to migrate the handler to `loop.dispatch`.

### "My opinion deltas never accumulate in the NPC panel"

Cause: the reducer's `case "NpcOpinionDrifted":` is silent `return state;`. Or the projection isn't reading `state.crew.characters[id].cognitive.opinionVectors`.

Check:

1. Open `eventStore.all()` and grep for `"NpcOpinionDrifted"`. If the events are there,
2. Run `reduceAll(emptyWorldState(), eventStore.all())` and pick an NPC. If `opinionVectors` is still empty,
3. The reducer is the bug — the case must accumulate via `Math.max(-100, Math.min(100, prev + event.delta))` and `Record<string, number>`.

If events aren't there, the UI handler isn't dispatching — search `src/App.tsx` for `opinion` to find the side-effect branch and replace with `loop.dispatch({ type: "NpcOpinionDrifted", ts: currentTick, charId, entity, delta })`.

### "BBS thread's viralSpreadRank never goes up"

Cause: one of:

1. **The reducer's `case "BbsThreadMutated"` is silent `return state;`** — never spreads `viralSpreadRank`. After the migration's data-loss fixer this case now spreads correctly, so option (1) is a regression-risk class, not an every-day bug.
2. **`state.bbs.threads` is empty** because the seed loader never ran before the viral-rank event fired. This is the most common cause.

Check:

```ts
case "BbsThreadMutated": {
  const idx = state.bbs.threads.findIndex((t) => t.id === event.threadId);
  if (idx === -1) return state;  // thread not seeded → no-op
  // … otherwise spread viralSpreadRank into the thread …
}
```

If `state.bbs.threads` is empty, the projection never had a thread. Either seed it first (the canonical seed events are `BbsThreadCreated` — there is no `emit.bbsThreadCreated` helper at the moment, so dispatch with the DRAFT form), OR ensure the seed loader runs before the viral-rank event.

### "StrictMode doubled a setState that bypasses dispatch"

Cause: `SimulationLoop` wasn't the one called — the action used `appendEvent(...)` directly, which writes to the store but skips `reduce`.

Diagnostic (both lines use the **DRAFT** form — never nest `emit.x(...)` inside `loop.dispatch`, which is M1):

```ts
// `loop.dispatch(draft)` writes to eventStore AND calls reduce.
loop.dispatch({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -50,
  reason: "rent",
});  // ✅ both

// `appendEvent(draft)` writes to eventStore ONLY — no reduce.
appendEvent({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -50,
  reason: "rent",
});  // ❌ half — replayer disagrees with snapshot
```

Always prefer `.dispatch` from UI handlers. `appendEvent` is for tooling / migrations / batch seeding.

### "An emit.* helper drops fields"

Cause: someone added a builder that takes a rich object but the event only carries an id. (Note: after the F2 audit the `emit.edgeAdded` slot in `sim/events/appendEvent.ts` was deliberately **not** added — `EdgeAddedEvent` already carries `edgeId` AND a full `edge: SocialEdge`, so a future caller is free to add the helper safely without losing fields.)

Prevention rule for any future lossy-helper attempt:

1. The event interface MUST carry every field the helper receives.
2. The reducer case MUST spread the new payload into the corresponding state slice.
3. Only then add the `emit.*` helper.

Order matters — flipping step 1 last works in dev but corrupts the replay log on resume.

## Playbook 4 — Use `/tools` when implemented

`/tools/*` is the canonical surface for reading state without mutation. Each tool that lands should:

- replay the event log (`eventStore.all()`) and re-derive `WorldState` (`reduceAll(...)`)
- compare to `SimulationLoop.snapshot()` — divergence = bypass
- let you filter by event type, time range, charId, prodId

When `eventInspector` lands, the first 3 questions to answer for any bug are: "What events fired?", "What does the replayed state look like?", "What does the snapshot look like?".

## Playbook 5 — Submit a regression / characterization test

When you fix a bug, the regression test is short:

```ts
import { emptyWorldState, reduce } from "@sim/engine/reducer";
import { eventStore } from "@sim/events/eventStore";
import { appendEvent, setCurrentTick, getCurrentTick } from "@sim/events/appendEvent";

// Clean the global store first so this test doesn't pollute (or be polluted
// by) other tests that share the singleton.
eventStore.__resetWith([]);
setCurrentTick(0);

const initial = emptyWorldState();
// Use the DRAFT form here — `emit.moneyChanged(...)` calls appendEvent
// internally, so the global eventStore would double-store the same payload.
const evt = appendEvent({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -200,
  reason: "rent",
});
const before = reduce(initial, evt);
const after  = reduce(before, evt);
console.assert(after.player.money === Math.max(0, 250 - 200 - 200));
```

Even without a test runner, this kind of "ask the reducer to apply event twice" smoke-test catches the StrictMode class of bug. Add to whatever harness you choose to wire in.

> The M1 characterization test in `sim/__tests__/dispatchStampedEvent.smoke.ts` is a worked-up example of this template. Copy that file as the starting point for any new pinned-behavior regression.
