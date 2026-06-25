# Simulation rules

Practical DO / DO NOT list. Every rule references a concrete cell in `/sim` or a counter-example in `src/App.tsx` so AI tools can pattern-match.

> If you find a "DO NOT" example in this repo (e.g. setState in `src/App.tsx`), the migration script is to call `loop.dispatch(emit.*)` from that handler rather than to *forbid* the change outright. Until the migration lands, treat the legacy code as the floor for what `apps/ui` can do, not as the ideal.

## DO

### DO route state changes — use `loop.dispatch` for state-mutating UI handlers, `appendEvent` for store-only events

```ts
// ✅ Right: handler at the UI layer dispatches an event; the reducer mutates state.
//        Use the DRAFT form here (state-mutating UI handler) — never nest
//        `loop.dispatch(emit.x(...))`, which would double-store the same event.
function CompiledButton({ state, loop }: { state: WorldState; loop: SimulationLoop }) {
  return (
    <button
      onClick={() =>
        loop.dispatch({
          type: "DemoCompiled",
          ts: getCurrentTick(),
          production: makeProduction(state),
        })
      }
    >
      Compile demo
    </button>
  );
}
```

### DO type every draft parameter as `EventDraft`

```ts
// ✅ Right: defined in and exported from appendEvent.ts; distributive over the SimEvent union.
function myBridge(draft: EventDraft): SimEvent {
  return appendEvent(draft);
}
```

### DO leave the reducer pure and exhaustive

```ts
case "MoneyChanged":
  // ✅ Pure, returns a brand-new state, exhaustively covers this branch.
  return { ...state, player: { ...state.player, money: Math.max(0, state.player.money + event.delta) } };
```

### DO use `as const` for literal narrowing into a Record<…, T>

```ts
// ✅ The runtime value is "idle"; the type is the literal "idle", assignable to the union.
return { ...char, status: "idle" as const };
```

### DO subscribe through `eventStore.on(type, listener)` for side-effects in projections

```ts
// ✅ The projection subscribes — it does NOT mutate WorldState.
eventStore.on("MoneyChanged", (e) => graphProjection.refresh());
```

### DO seed initial state via `emptyWorldState()` + `loop.dispatch(...)`

```ts
// ✅ One reducible path from "fresh save" to "running game".
const loop = new SimulationLoop({ initial: emptyWorldState(), onTick, … });
loop.dispatch({
  type: "ScenarioLoaded",
  ts: getCurrentTick(),
  scenario: "1985_8bit",
});
loop.dispatch(/* seed NPC hire events */);
```

### DO document intentional reducer no-ops

```ts
case "BurnoutReduced":
  // Intentional no-op — MoneyChanged was emitted separately to debit the cash;
  // this case is a marker event so projections can re-emit friendly state.
  // See the in-code comment at case "BurnoutReduced" in sim/engine/reducer.ts.
  return state;
}
```

## DO NOT

### DO NOT mutate WorldState from `/apps/**`

```ts
// ❌ Wrong — src/App.tsx's finishCompilation handler, pre-migration.
function finishCompilation(prod: Production) {
  setMyReleases(prev => [...prev, prod]);              // sets useState
  setGraphNodes(prev => [...prev, …prod.nodes]);       // mutates another slice
  setGraphEdges(prev => [...prev, …prod.edges]);
  setNewsLog(prev => [magazine, …prev]);
  setCharacters(prev => { … });
  setReputation(prev => prev + repDelta);
  setResearch(prev => prev + researchDelta);
  setLastCompiledRelease(prod);
}
// Six setState calls. React 18+ StrictMode double-invoked finishCompilation via
// the updater that called it, producing duplicated releases in myReleases.

// ✅ Right — call loop.dispatch once, with emit.demoCompiled(production).
// Everything downstream is the reducer's job.
```

### DO NOT import React / DOM / fetch / electron / LLM from `/sim` or `/packages`

```ts
// ❌ Wrong:
import React, { useState } from "react";             // in sim/events/eventTypes.ts
import { ipcMain } from "electron";                  // in sim/engine/reducer.ts
import { GoogleGenerativeAI } from "@google/genai";  // in sim/data/initialNpcs.ts
```

Any of these ties `/sim` to a runtime that the typed package cannot guarantee. The bar for any `/sim` import is "can be loaded by Node.js + tsc under noUnusedLocals + strict", period.

### DO NOT define sim-facing types outside `@packages/types`

```ts
// ❌ Wrong — re-declares what the barrel already exports.
interface Character {
  id: string;
  name: string;
  // …
}

// ✅ Right — import from the shared package.
import type { Character } from "@packages/types";
```

### DO NOT use naive `Omit<SimEvent, …>` as a draft type

```ts
// ❌ Wrong — flattens the discriminated union. tsc --noEmit rejects.
function dispatch(draft: Omit<SimEvent, "id" | "reducedAt">) { … }

// ✅ Right — distributive. Re-exported as EventDraft from appendEvent.ts.
function dispatch(draft: EventDraft) { … }
```

### DO NOT add a reducer case that is silent `return state`

```ts
// ❌ Wrong — the event was emitted, the projection never sees it. Data loss.
case "NpcOpinionDrifted":
  return state;
```

Every event must either produce a new `WorldState` slice or carry a comment explaining why it is a marker event. Silent no-ops are how the "BBS threads never update" / "NPCs never remember anything" class of bug got introduced historically.

### DO NOT fabricate state in the reducer

```ts
// ❌ Wrong — the crew Record doesn't have id yet.
case "CrewHired":
  state.crew.characters[event.charId] = synthesisedCharStub();
  return state;
```

If a `CrewHired` event fires for a charId not yet in `state.crew.characters`, the reducer should NO-OP (and the projection should surface "hire failed: seed not loaded"). Fabricating a stub masks seed-ordering bugs.

### DO NOT add an `emit.*` helper whose payload is silently lossy

```ts
// ❌ Wrong — caller passes a full SocialEdge, only the id is preserved.
declare function getCurrentTick(): number;
emit.edgeAdded = (edge: SocialEdge) =>
  appendEvent({ type: "EdgeAdded", ts: getCurrentTick(), edgeId: edge.id });
```

> Note on the example: `currentTick` is the module-level variable inside `sim/events/appendEvent.ts` and is **not exported**. Outside that file the right way to read the tick is `getCurrentTick()` (also exported from appendEvent.ts). The wrong-line above uses `currentTick()` only because this example mirrors where an `emit.*` helper actually lives.

If the event payload doesn't carry the full data the reducer needs, expand the event FIRST (`EdgeAddedEvent { …, edge: SocialEdge }`), update the reducer's case (it now spreads `event.edge` into `state.socialGraph.edges`), then add the helper. The previous `emit.edgeAdded` was deleted under exactly this rule.

### DO NOT bypass the loop from UI handlers

```ts
// ❌ Wrong — appendEvent without loop.dispatch routes to the store but skips reduce.
//        Projection never sees the change.
onClick={() => appendEvent({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -50,
  reason: "rent",
})}

// ✅ Right — dispatch through the loop so the store AND the reducer both update.
onClick={() => loop.dispatch({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -50,
  reason: "rent",
})}
```

`SimulationLoop.dispatch` is the only place where UI events connect to the reducer's view-update path. `appendEvent` is the layer-1 primitive; UI handlers always call `.dispatch()`.

> ⚠️ Both examples above use the DRAFT form (object literal with `type` + fields). Do NOT write the pre-stamped form `loop.dispatch(emit.moneyChanged(…))` — the `emit.*` builder returns a fully-stamped `SimEvent`, which then re-enters `appendEvent` and double-stores the same payload. The pattern is locked into `sim/__tests__/dispatchStampedEvent.smoke.ts` as a regression test; see `docs/event-sourcing.md` § "Anything not in this list is dispatched directly" for the full rationale.

## The strict-mode defense pattern

Inside any wall-clock-driven schedule (`setInterval`, `setTimeout`, microtask chains), the StrictMode-safe shape is:

```ts
private ticking = false;
private firedThisInterval = false;
private tickOnce() {
  if (this.ticking || this.firedThisInterval) return;
  this.ticking = true;
  this.firedThisInterval = true;
  try {
    /* domain work — must NOT call appendEvent / dispatch / setState */
  } finally {
    queueMicrotask(() => { this.firedThisInterval = false; this.ticking = false; });
  }
}
```

The boundary reset (`queueMicrotask`) is what makes a double-invoked effect collapse into one tick. **Do not simplify this away.** This pattern is the structural fix for "releases duplicated when compiled" — even if you don't see React StrictMode in the current stack, keep it. AI tools routinely lose concurrency safety by "cleaning up" guards.

## Tools discipline

`/tools/*` modules are CLI-flavored readers over `eventStore` and `SimulationLoop.snapshot()`. When you build one (replayDebugger, eventInspector, graphVisualizer, bbsReplayViewer):

- They MUST NOT call `appendEvent` or `loop.dispatch`. Reading is the contract.
- They MUST NOT import from `/apps/ui`. Tools are standalone.
- They SHOULD regression-test by replaying the event log and projecting to the same `WorldState` that `reduceAll(initial, events)` produces.
