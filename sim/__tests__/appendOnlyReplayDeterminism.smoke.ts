/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/engine/reducer.ts` replay determinism.
 *
 * Per docs/event-sourcing.md "`> 🔁 Determinism Requirement`":
 *   "If all events are replayed in order, the world state must be identical."
 *
 * This file pins that invariant with five Scenarios:
 *
 *   1. Same EventDraft sequence STAMPED via `appendEvent` and replayed 3×
 *      through `reduceAll` → structurally identical states (id+reducedAt
 *      deterministic via run-once stamping).
 *   2. Reducer id-based idempotency: the SAME stamped SimEvent applied
 *      twice through reduceAll produces the same state as applied once.
 *      (Live `loop.dispatch` does NOT dedupe — each call generates a fresh
 *      `event.id` via `appendEvent`'s `generateId`, which is the right
 *      behaviour for user actions.)
 *   3. ts → (year, month) decoding: the canonical encoded-form for an
 *      IncomeLedgerEntry.
 *   4. MoneySpent balance floor + ledger-permissive invariant: replaying
 *      2× a $400 spend starting from $250 lands at $0 (not -$150) and
 *      the ledger still records BOTH intended expenses.
 *   5. Live dispatch schema: same draft dispatched through TWO loops
 *      produces two independent event-log entries (id stamps differ
 *      because `appendEvent` calls `generateId` per dispatch) — the
 *      projection layer still converges to the same final WorldState
 *      shape, but the event log audit trail is per-action (not per-draft).
 *
 * Note: `state.meta.startedAt` holds `new Date().toISOString()` and is
 * therefore NON-DETERMINISTIC by design. We strip it via
 * `normalizeForCompare` before equality checks so it doesn't surface
 * false failures.
 */
import { strict as assert } from "node:assert";

import {
  SimulationLoop,
} from "@sim/engine/simulationLoop";
import {
  emptyWorldState,
  reduceAll,
  type WorldState,
} from "@sim/engine/reducer";
import {
  appendEvent,
  setCurrentTick,
  type EventDraft,
} from "@sim/events/appendEvent";
import { eventStore } from "@sim/events/eventStore";
import {
  ExpenseCategory,
  IncomeSource,
} from "@packages/types";

// Canonical seed amount — kept in lock-step with the seed row baked into
// `emptyWorldState()` (`money: 250` AND `ledger.income[0].amount: 250`).
// After the v0.2.0 inversion no bootstrap MoneyEarned dispatch is needed
// in production (App.tsx) nor in any smoke test (this file).
const SEED_MONEY = 250;
/** ts that decodes to (year=1985, month=1). Keeps `purchaseYear/...` aligned. */
const NOW_TS = 1985 * 12 + 1;

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

function freshLoop(): SimulationLoop {
  eventStore.__resetWith([]);
  setCurrentTick(NOW_TS);
  return new SimulationLoop({
    initial: emptyWorldState(),
    onTick: () => {},
  });
}

/**
 * Build a deterministic EventDraft sequence — small enough to read
 * end-to-end, but covers the move/hardware/job/subscribe/cognitive
 * event families so a non-determinism regression in any one of them
 * surfaces here.
 *
 * Stable `instanceId` / `sourceRefId` keep the ledger dedup predictable
 * (the reducer keys on event.id by default, but InventoryJobs also
 * dedup on `instanceId`).
 */
function deterministicEventSequence(): EventDraft[] {
  return [
    {
      type: "PlayerIdentitySet",
      ts: NOW_TS,
      handle: "AssemblyKid",
      groupName: "Tricycle Crews",
    },
    // v0.2.0 inversion: the synthetic seed $250 lives INSIDE
    // `emptyWorldState()` (player.money === 250 + ledger.income[0])
    // so this EventDraft sequence no longer carries a dispatch event
    // for it. The literal invariant
    //   state.player.money === sum(ledger.income) - sum(ledger.expense)
    // holds by construction across all three replays below.
    {
      type: "MoneyEarned",
      ts: NOW_TS,
      amount: 1000,
      source: IncomeSource.FreelanceCoding,
      sourceRefId: "gig_a",
    },
    {
      type: "MoneyEarned",
      ts: NOW_TS + 12,
      amount: 300,
      source: IncomeSource.Sponsorship,
      sourceRefId: "sp_a",
    },
    {
      type: "MoneySpent",
      ts: NOW_TS + 24,
      amount: 200,
      category: ExpenseCategory.Hardware,
      purchasedItem: { kind: "hardware", itemId: "cpu_8086" },
      sourceRefId: "hwinst_a",
    },
    {
      type: "HardwarePurchased",
      ts: NOW_TS + 24,
      itemId: "cpu_8086",
      instanceId: "hwinst_a",
      condition: "new",
      cost: 200,
    },
    {
      type: "JobAccepted",
      ts: NOW_TS + 24,
      instanceId: "job_a",
      templateId: "tracker_mod",
      npcProviderId: "purple_motion",
      payment: 400,
      reputationDelta: 5,
      deadlineYear: 1986,
      deadlineMonth: 6,
    },
    {
      type: "TravelSubscriptionChanged",
      ts: NOW_TS + 24,
      tier: "bbs_basic",
      monthlyFee: 15,
    },
    { type: "TechResearched", ts: NOW_TS + 36, techId: "raster_sync" },
    { type: "ReputationChanged", ts: NOW_TS + 36, delta: 10, reason: "won contest" },
  ];
}

/**
 * Stamp a draft through `appendEvent` so the resulting event has both
 * `id` and `reducedAt`. Necessary for passing into `reduceAll` which
 * requires `SimEvent[]` (post-stamp), NOT `EventDraft[]`.
 *
 * Reset the eventStore first so the side-effect of stamping doesn't
 * bleed into adjacent scenarios.
 */
function stamp(drafts: EventDraft[]): import("@sim/events/eventTypes").SimEvent[] {
  eventStore.__resetWith([]);
  return drafts.map((d) => appendEvent(d));
}

/**
 * Strip the wall-clock `startedAt` so determinism comparisons ignore
 * the `new Date().toISOString()` call in `emptyWorldState()`. Every
 * other field is a JSON-serializable scalar / array / object.
 */
function normalizeForCompare(state: WorldState): unknown {
  return JSON.parse(
    JSON.stringify({ ...state, meta: { ...state.meta, startedAt: "<elided>" } }),
  );
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return a === b;
  if (typeof a === "object") {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Replay a fixed stamped sequence 3× → identical states.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: replay 3× → identical states");
{
  const stamped = stamp(deterministicEventSequence());
  // A counterbalance: the MoneyChanged from sequence line 2 MAY race the
  // MoneyEarned lines if the reducer's MoneyChanged+MoneyEarned interaction
  // is non-deterministic. Both paths are pure additions, so identical
  // total balance comes out the same.
  const a = reduceAll(emptyWorldState(), stamped);
  const b = reduceAll(emptyWorldState(), stamped);
  const c = reduceAll(emptyWorldState(), stamped);
  check("all 3 replays converge to the SAME state (wall-clock excluded)", () => {
    const aNorm = normalizeForCompare(a);
    const bNorm = normalizeForCompare(b);
    const cNorm = normalizeForCompare(c);
    assert.ok(deepEqual(aNorm, bNorm), "a !== b");
    assert.ok(deepEqual(bNorm, cNorm), "b !== c");
    assert.ok(deepEqual(aNorm, cNorm), "a !== c");
  });
  // The literal invariant `state.player.money === sum(ledger.income)
  // - sum(ledger.expense)` holds end-to-end because the synthetic seed
  // ($250) now lives inside `emptyWorldState()` (player.money === 250,
  // ledger.income[0].amount === 250) AND every stamped event in this
  // scenario routes through M1 ledger-aware reducers. Concretely:
  // 250 (seed row baked into emptyWorldState()) + 1000 + 300 - 200
  // = 1350.
  check("balance converges to the canonical ledger sum (seed-in-state invariant)", () => {
    const totalEarned = a.economy.ledger.income.reduce((s, e) => s + e.amount, 0);
    const totalSpent = a.economy.ledger.expense.reduce((s, e) => s + e.amount, 0);
    assert.equal(a.player.money, totalEarned - totalSpent, "literal invariant");
    assert.equal(a.player.money, 1350);
  });
  check("ledger contains the 3 income entries (seed-in-state row + 2 MoneyEarned events)", () => {
    assert.equal(a.economy.ledger.income.length, 3);
  });
  check("hardware inventory has the 1 instance we purchased", () => {
    assert.equal(a.economy.hardware.length, 1);
    assert.equal(a.economy.hardware[0]!.instanceId, "hwinst_a");
  });
  check("active jobs has the 1 accepted template", () => {
    assert.equal(a.economy.jobs.active.length, 1);
    assert.equal(a.economy.jobs.active[0]!.instanceId, "job_a");
  });
  check("travel subscription reflects the tier change", () => {
    assert.equal(a.economy.travel.activeSubscription, "bbs_basic");
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Reducer id-based idempotency (reduceAll path).
//
// Live `loop.dispatch(draft)` generates a NEW event.id per call (the
// intended behavior for live user actions). Uniqueness-by-id means the
// ledger row count grows correctly on each action. The reducer's
// idempotency guard is for REPLAY (reduceAll with pre-stamped events),
// not for live dispatch.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: reducer id-based idempotency under replay");
{
  const oneDraft: EventDraft = {
    type: "MoneyEarned",
    ts: NOW_TS,
    amount: 9999,
    source: IncomeSource.Sponsorship,
    sourceRefId: "sp_double",
  };
  // Stamp ONCE → replay 3 times → only one ledger row.
  const stamped = stamp([oneDraft]);
  const s1 = reduceAll(emptyWorldState(), stamped);
  const s3 = reduceAll(emptyWorldState(), [...stamped, ...stamped, ...stamped]);
  check("replaying the same MoneyEarned 1× vs 3× yields identical state (idempotent)", () => {
    assert.ok(
      deepEqual(normalizeForCompare(s1), normalizeForCompare(s3)),
    );
  });
  check("ledger has 2 income entries (1 baked-in seed row + 1 stamped MoneyEarned after id-keyed dedup)", () => {
    assert.equal(s3.economy.ledger.income.length, 2);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — ts → (year, month) decoding.
// The reducer decodes ts via `Math.floor(ts / 12)` year + `ts % 12`
// month for the ledger entry. The projection uses ((ts-1)%12)+1 to
// avoid December→January inflation; the reducer's ledger row keeps
// the canonical (year, month) from the raw decoder.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: ts → (year, month) decoding");
{
  const events = stamp([
    {
      type: "MoneyEarned",
      ts: NOW_TS,
      amount: 100,
      source: IncomeSource.PartyPrize,
      sourceRefId: "p1",
    },
    {
      type: "MoneyEarned",
      ts: NOW_TS + 1,
      amount: 100,
      source: IncomeSource.PartyPrize,
      sourceRefId: "p2",
    },
  ]);
  const a = reduceAll(emptyWorldState(), events);
  const b = reduceAll(emptyWorldState(), events);
  // After v0.2.0 inversion the ledger already carries a seed row at
  // index 0 (year=1985, month=1, amount=250). The two stamped events
  // land at [1] and [2] in dispatch order; index references shifted to
  // keep the ts-decoding assertions tied to the actual stamped events.
  check("ts=NOW_TS (1985*12+1) → first stamped event at [1] decodes to year=1985, month=1", () => {
    const income = a.economy.ledger.income[1]!;
    assert.equal(income.year, 1985);
    assert.equal(income.month, 1);
  });
  check("ts=NOW_TS+1 → second stamped event at [2] decodes to year=1985, month=2", () => {
    const income = a.economy.ledger.income[2]!;
    assert.equal(income.year, 1985);
    assert.equal(income.month, 2);
  });
  check("decoded states match across replays", () => {
    const aN = JSON.stringify(a.economy.ledger.income.map((e) => ({ y: e.year, m: e.month })));
    const bN = JSON.stringify(b.economy.ledger.income.map((e) => ({ y: e.year, m: e.month })));
    assert.equal(aN, bN);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — MoneySpent balance floor survives replay.
// Reducer: balance = max(0, balance - amount). Replaying 2× a $400 spend
// starting from $250 must land at $0 (not -$150) both times.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: MoneySpent balance floor across replay");
{
  const events = stamp([
    {
      type: "MoneySpent",
      ts: NOW_TS,
      amount: 400,
      category: ExpenseCategory.Hardware,
      sourceRefId: "x",
    },
    {
      type: "MoneySpent",
      ts: NOW_TS,
      amount: 400,
      category: ExpenseCategory.Hardware,
      sourceRefId: "y",
    },
  ]);
  const a = reduceAll(emptyWorldState(), events);
  const b = reduceAll(emptyWorldState(), events);
  check("balance clamps to 0 (not negative)", () => {
    assert.equal(a.player.money, 0);
    assert.equal(b.player.money, 0);
  });
  check("ledger still records BOTH intended expense entries (no fabrication)", () => {
    assert.equal(a.economy.ledger.expense.length, 2);
    assert.equal(b.economy.ledger.expense.length, 2);
    assert.equal(a.economy.ledger.expense[0]!.amount, 400);
    assert.equal(a.economy.ledger.expense[1]!.amount, 400);
  });
  check("replay b's ledger deep-equals a's ledger", () => {
    // `normalizeForCompare` returns `unknown` (deliberately lossy so a
    // regression in the WorldState shape can't accidentally compare
    // truthfully). Cast through WorldState for the ledger access — the
    //    ``String.prototype`` round-trip already elided the only non-deterministic
    //    field (meta.startedAt).
    const aLedger = (normalizeForCompare(a) as WorldState).economy.ledger;
    const bLedger = (normalizeForCompare(b) as WorldState).economy.ledger;
    assert.ok(deepEqual(aLedger, bLedger));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Live dispatch shape.
// Two freshly-constructed loops with the same dispatch sequence end
// with the SAME projection-level fields (balance, etc.) but DIFFERENT
// event-log ids (because appendEvent generates fresh ids per call).
// Pin the production behaviour: schema-convergence, audit-trail-per-action.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: live dispatch schema converges; event log is per-action");
{
  const loopA = freshLoop();
  const loopB = freshLoop();
  const events = deterministicEventSequence();
  for (const e of events) loopA.dispatch(e);
  for (const e of events) loopB.dispatch(e);
  // Projection-level fields (money, inventory, jobs.active, travelTier)
  // must converge identically between the two loops.
  check("projection fields converge across two independent live-dispatch loops", () => {
    const a = loopA.snapshot();
    const b = loopB.snapshot();
    assert.equal(a.player.money, b.player.money);
    assert.equal(a.economy.hardware.length, b.economy.hardware.length);
    assert.equal(a.economy.jobs.active.length, b.economy.jobs.active.length);
    assert.equal(
      a.economy.travel.activeSubscription,
      b.economy.travel.activeSubscription,
    );
  });
  // Each loop's event log got 9 entries (one per dispatched draft — the
  // v0.2.0 inversion removed the synthetic seed MoneyEarned from this
  // sequence because the seed now lives inside `emptyWorldState()`).
  // Total of 18 across both loops with unique ids (because `appendEvent`
  // generates a fresh id per call — that's the audit trail shape).
  check("each loop has 9 event-log entries; no cross-loop duplication", () => {
    // The loops share the singleton eventStore. Each `loop.dispatch(...)`
    // call appends ONE entry (a fresh id from `appendEvent`), so two loops
    // with 9 dispatches each give 18 entries with 18 distinct ids.
    const ids = eventStore.all().map((e) => e.id);
    assert.equal(ids.length, 18);
    assert.equal(new Set(ids).size, 18, "live dispatch must produce unique ids");
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "append-only replay determinism green." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);
