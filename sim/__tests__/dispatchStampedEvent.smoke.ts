/**
 * Characterization test for M1 (audit finding).
 *
 * Pins the current broken behavior of `loop.dispatch(stampedSimEvent)`:
 *  - Takes a fully-stamped SimEvent (already in the eventStore) and routes
 *    it through `appendEvent` again, generating a SECOND entry with a fresh
 *    id while keeping the original payload bytes. Result: two store entries
 *    for what was supposed to be a single user action.
 *  - The reducer remains idempotent — final WorldState is the same — but
 *    the event log is polluted with the duplicate.
 *
 * This test PASSES today because the bug is real. If anyone ever changes
 * how `loop.dispatch` handles a fully-stamped event — e.g. by making
 * EventDraft reject stamped input at the type level, or making appendEvent
 * throw when called with a non-draft — this test will FAIL, which is the
 * regression signal: the source change and this test must move together.
 *
 * See `docs/event-sourcing.md` `> ❌ NEVER do this` for the human-readable
 * version of the rule.
 */

import { strict as assert } from "node:assert";

import { SimulationLoop } from "@sim/engine/simulationLoop";
import {
  emptyWorldState,
  type WorldState,
} from "@sim/engine/reducer";
import {
  appendEvent,
  getCurrentTick,
  setCurrentTick,
} from "@sim/events/appendEvent";
import { eventStore } from "@sim/events/eventStore";
import type {
  MoneyChangedEvent,
  SimEvent,
} from "@sim/events/eventTypes";

// Fresh reset — declare canonical facts about the world state we control.
function freshLoop(): SimulationLoop {
  eventStore.__resetWith([]);
  setCurrentTick(1);
  const initial: WorldState = emptyWorldState();
  return new SimulationLoop({
    initial,
    onTick: () => {
      /* no-op — UI hook lives in /apps, not in /sim */
    },
  });
}

let failures = 0;
function check(label: string, run: () => void): void {
  try {
    run();
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${(err as Error).message}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — appendEvent alone writes exactly one entry, no reduce.
// This pins the "well-known good" behavior so we have a baseline.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: appendEvent alone — store-only path");

{
  const loop = freshLoop();

  let stamped: SimEvent | undefined;
  // v0.2.0 inversion: seed lives in emptyWorldState() so money === 250
  // out-of-the-box without a bootstrap dispatch.
  check("snapshot().player.money is 250 (seed baked into emptyWorldState())", () => {
    assert.equal(loop.snapshot().player.money, 250);
  });

  check("eventStore is empty before append", () => {
    assert.equal(eventStore.all().length, 0);
  });

  stamped = appendEvent({
    type: "MoneyChanged",
    ts: getCurrentTick(),
    delta: -50,
    reason: "rent",
  });

  check("appendEvent pushed exactly ONE entry", () => {
    assert.equal(eventStore.all().length, 1);
  });

  check("the returned event has a non-empty id", () => {
    assert.ok(typeof stamped?.id === "string" && stamped.id.length > 0);
  });

  check("the returned event has a numeric reducedAt stamp set by appendEvent", () => {
    assert.ok(typeof stamped?.reducedAt === "number" && stamped.reducedAt > 0);
  });

  check("snapshot().player.money is STILL 250 — appendEvent does not reduce", () => {
    assert.equal(loop.snapshot().player.money, 250);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — loop.dispatch(stampedSimEvent) double-appends. THIS IS M1.
//
// Documented expected behavior today (the bug):
//   - First call (appendEvent) stamped + stored once.
//   - Second call (loop.dispatch(stamped)) sees a draft-shaped input via
//     structural typing, runs appendEvent AGAIN, generates a new id, and
//     pushes a SECOND store entry with the same payload bytes.
//   - Reducer runs twice with the same input — idempotent — so WorldState
//     converges to the correct final value. The damage is in the log.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: loop.dispatch(stampedSimEvent) — the M1 bug");

// Capture the pre-flight store size WITHOUT resetting it. Calling
// freshLoop() here would erase `stamped` and defeat the whole point of this
// scenario: we need `stamped` to ALREADY be in the eventStore at the moment
// dispatch runs, so dispatch routes it through appendEvent a SECOND time.
const beforeCount = eventStore.all().length;
const stamped = appendEvent({
  type: "MoneyChanged",
  ts: getCurrentTick(),
  delta: -50,
  reason: "rent",
});
const afterAppendCount = eventStore.all().length;

check("pre-flight: appendEvent pushed exactly one entry", () => {
  assert.equal(afterAppendCount - beforeCount, 1);
});

check("pre-flight: stamped event is already in the store (we can see it)", () => {
  assert.equal(eventStore.all().at(-1)?.id, stamped.id);
});

// Fresh reducer state for `dispatchLoop` — but DO NOT reset the eventStore.
const dispatchLoop = new SimulationLoop({
  initial: emptyWorldState(),
  onTick: () => {
    /* no-op — UI hook lives in /apps, not in /sim */
  },
});
const startingMoney = dispatchLoop.snapshot().player.money;

dispatchLoop.dispatch(stamped);

const finalCount = eventStore.all().length;

check("M1: dispatch(stamped) wrote a SECOND entry to eventStore (one from appendEvent + one from dispatch's re-append)", () => {
  assert.equal(
    finalCount,
    beforeCount + 2,
    `expected ${beforeCount + 2} entries, got ${finalCount}`,
  );
});

const lastEntry = eventStore.all().at(-1)!;
const secondToLast = eventStore.all().at(-2)!;

check("M1: the two relevant entries carry DIFFERENT ids (dispatch's appendEvent re-stamped)", () => {
  assert.notEqual(lastEntry.id, secondToLast.id);
});

check("M1: the two relevant entries carry IDENTICAL payload bytes (type / ts / delta / reason)", () => {
  assert.equal(lastEntry.type, secondToLast.type);
  assert.equal(lastEntry.ts, secondToLast.ts);
  // Narrow the discriminated union to the MoneyChanged variant via the
  // named type from `@sim/events/eventTypes` so the cast matches the rest
  // of the codebase's named-import style.
  const lastMoney = lastEntry as MoneyChangedEvent;
  const priorMoney = secondToLast as MoneyChangedEvent;
  assert.equal(lastMoney.delta, priorMoney.delta);
  assert.equal(lastMoney.reason, priorMoney.reason);
});

check("reducer remains idempotent: final money is 200 not 150", () => {
  // This is the only thing that softens the impact: the projection sees the
  // correct final state. But the event log has the duplicate.
  assert.equal(dispatchLoop.snapshot().player.money, Math.max(0, startingMoney - 50));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — the GOOD pattern (loop.dispatch with a freshly-constructed
// draft) does only ONE store.write. Pin what the right pattern looks like,
// so anyone reading the test sees the contrast.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: loop.dispatch({...draft}) — the correct UI handler");

{
  const loop2 = freshLoop();
  // v0.2.0 inversion: seed lives in emptyWorldState() so starting balance
  // is already 250 without a bootstrap dispatch.
  const startingMoney2 = loop2.snapshot().player.money;

  loop2.dispatch({
    type: "MoneyChanged",
    ts: getCurrentTick(),
    delta: -50,
    reason: "rent",
  });

  check("one dispatch → exactly ONE entry in eventStore", () => {
    assert.equal(eventStore.all().length, 1);
  });

  check("money reduced by 50", () => {
    assert.equal(loop2.snapshot().player.money, startingMoney2 - 50);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "all checks green; M1 bug behavior confirmed." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);
