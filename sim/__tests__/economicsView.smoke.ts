/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/projections/economy.ts` — pins the M1 double-store
 * money-flow pattern AND the literal ledger invariant now that the
 * synthetic seed MoneyEarned is baked into `emptyWorldState()` itself.
 *
 * LITERAL invariant (v0.2.0 — picked via UAT):
 *     state.player.money === sum(ledger.income) - sum(ledger.expense)
 *
 * `emptyWorldState()` ships `player.money = 250` AND a matching
 * `ledger.income[0]` row. Every consumer (production App.tsx, smoke
 * tests, replay runs, projections, /apps/ui mirrors) starts from this
 * consistent state — no bootstrap dispatch is required anywhere.
 *
 * Pattern (per docs/event-sourcing.md):
 *   - All Scenarios except Scenario 5 build state via the SimulationLoop
 *     (appendEvent → reduce → onTick) so we exercise the real dispatch path.
 *   - Scenario 5 (trust multiplier) constructs a deterministic WorldState
 *     directly through `reduceAll` so we control
 *     `state.crew.characters[npcId].cognitive.trustGraph["__player__"]`
 *     without polluting other scenarios with INITIAL_NPCS seeding.
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
import type { SimEvent } from "@sim/events/eventTypes";
import { eventStore } from "@sim/events/eventStore";
import {
  economicsView,
  expectedJobPayoutForJob,
} from "@sim/projections/economy";
import {
  HARDWARE_CATALOG,
  JOB_TEMPLATES,
  SOFTWARE_CATALOG,
  SPONSORSHIP_CATALOG,
  INITIAL_NPCS,
} from "@sim/data";
import {
  ExpenseCategory,
  IncomeSource,
  TravelSubscriptionTier,
} from "@packages/types";

/** Canonical seed amount — must stay lock-step with `emptyWorldState()`
 *  so the literal invariant assertion can show concrete arithmetic. */
const SEED_MONEY = 250;
/** ts that decodes to (year=1985, month=1). Use for every dispatch where
 *  the test cares about wear-decay (e.g. hardware purchase). */
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
    onTick: () => {
      /* heartbeat only — test doesn't observe the per-second tick. */
    },
  });
}

/**
 * Stamp a draft through `appendEvent` so it carries `id` + `reducedAt`
 * for `reduceAll`. Resets the shared eventStore first so this helper does
 * not leak stamps into surrounding scenarios' `eventStore.all()` checks.
 */
function stamp(drafts: EventDraft[]): SimEvent[] {
  eventStore.__resetWith([]);
  return drafts.map((d) => appendEvent(d));
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 0 — enum sanity gate. If IncomeSource / ExpenseCategory had
// their member names renamed, this fails before scenarios 1-6 can lie to us.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: enum members are addressable as values");
check("IncomeSource.Other resolves to its enum literal string (seed-in-state source)", () => {
  assert.equal(IncomeSource.Other, "Other");
});
check("IncomeSource.FreelanceCoding resolves to its enum literal string", () => {
  assert.equal(IncomeSource.FreelanceCoding, "FreelanceCoding");
});
check("IncomeSource.Sponsorship resolves to its enum literal string", () => {
  assert.equal(IncomeSource.Sponsorship, "Sponsorship");
});
check("IncomeSource.PartyPrize resolves to its enum literal string", () => {
  assert.equal(IncomeSource.PartyPrize, "PartyPrize");
});
check("ExpenseCategory.Hardware resolves to its enum literal string", () => {
  assert.equal(ExpenseCategory.Hardware, "Hardware");
});
check("ExpenseCategory has a Software member (used by software purchase scenarios)", () => {
  assert.ok(typeof ExpenseCategory.Software === "string");
});
check("TravelSubscriptionTier is the documented 4-member union (no 'dialup')", () => {
  const allowed: TravelSubscriptionTier[] = [
    "none" as const,
    "bbs_basic" as const,
    "high_speed" as const,
    "unlimited" as const,
  ];
  for (const tier of allowed) {
    assert.ok(
      tier === "none" ||
        tier === "bbs_basic" ||
        tier === "high_speed" ||
        tier === "unlimited",
      `unrecognised tier: ${tier}`,
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — bootstrap world (post v0.2.0 inversion): the literal
// invariant holds by construction because the seed row is baked into
// emptyWorldState(). No bootstrap dispatch is needed.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: bootstrap world → seed-in-state holds invariant by construction");
{
  const loop = freshLoop();
  const view = economicsView(loop.snapshot());

  check("balance = seed money (250 baked into emptyWorldState())", () => {
    assert.equal(view.balance, SEED_MONEY);
  });
  check("totalEarned = seed amount (the literal seed row counts as one income entry)", () => {
    assert.equal(view.totalEarned, SEED_MONEY);
  });
  check("totalSpent starts at zero (no expense yet)", () => {
    assert.equal(view.totalSpent, 0);
  });
  check("LITERAL invariant holds by construction (balance = totalEarned - totalSpent)", () => {
    assert.equal(view.balance, view.totalEarned - view.totalSpent);
  });
  check("hardware inventory + software + active jobs are empty", () => {
    assert.equal(view.hardwareInventory.length, 0);
    assert.equal(view.softwareInventory.length, 0);
    assert.equal(view.activeJobs.length, 0);
  });
  check("availableHardware non-empty (catalog has 1985+ entries)", () => {
    assert.ok(view.availableHardware.length >= 1);
  });
  check("suggestedJobs non-empty (at least one template in-window for 1985)", () => {
    assert.ok(view.suggestedJobs.length >= 1);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — M1 double-store: deposit → buy hardware → invariant.
// Seed is already in state (250); the M1 dispatch adds +1000 and the
// paired MoneySpent / HardwarePurchased flow ends with literal-invariant state.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: M1 double-store pattern (deposit → buy hardware)");
{
  const loop = freshLoop();
  let view = economicsView(loop.snapshot());

  check("bootstrap: balance === SEED_MONEY (250) and literal invariant holds", () => {
    assert.equal(view.balance, view.totalEarned - view.totalSpent);
    assert.equal(view.balance, SEED_MONEY);
  });

  loop.dispatch({
    type: "MoneyEarned",
    ts: NOW_TS,
    amount: 1000,
    source: IncomeSource.FreelanceCoding,
    sourceRefId: "gig_001",
  });
  view = economicsView(loop.snapshot());
  check("after MoneyEarned $1000: balance === literal invariant (1250)", () => {
    assert.equal(view.balance, view.totalEarned - view.totalSpent);
    assert.equal(view.balance, SEED_MONEY + 1000);
  });

  const item = view.availableHardware[0]!;
  const instanceId = `hwinst_test`;
  // Order: MoneySpent first (debiting ledger) then HardwarePurchased (adding
  // to inventory). Mirrors the EconomyPanel.tsx convention.
  loop.dispatch({
    type: "MoneySpent",
    ts: NOW_TS,
    amount: item.purchasePrice,
    category: ExpenseCategory.Hardware,
    purchasedItem: { kind: "hardware", itemId: item.id },
    sourceRefId: instanceId,
  });
  loop.dispatch({
    type: "HardwarePurchased",
    ts: NOW_TS,
    instanceId,
    itemId: item.id,
    condition: "new",
    cost: item.purchasePrice,
  });

  view = economicsView(loop.snapshot());
  check("after seed + 1000 + buy hardware: literal invariant holds post-spend", () => {
    assert.equal(view.balance, view.totalEarned - view.totalSpent);
    assert.equal(view.balance, SEED_MONEY + 1000 - item.purchasePrice);
  });
  check("hardwareInventory has 1 row, joined with HARDWARE_CATALOG_INDEX", () => {
    assert.equal(view.hardwareInventory.length, 1);
    assert.equal(view.hardwareInventory[0]!.instance.itemId, item.id);
    assert.ok(view.hardwareInventory[0]!.item !== null);
  });
  check("hardware resale value is non-zero", () => {
    assert.ok(view.hardwareInventory[0]!.resaleValue > 0);
  });
  check("wear-level is 0 (purchaseYear == currentYear, no time elapsed)", () => {
    assert.equal(view.hardwareInventory[0]!.currentWear, 0);
  });
  check("netWorth.total = cash + hw + sw + pending", () => {
    assert.equal(
      view.netWorth.total,
      view.netWorth.cash +
        view.netWorth.hardwareResaleValue +
        view.netWorth.softwareApproxValue +
        view.netWorth.pendingJobPayouts,
    );
  });

  // Reducer dedups `HardwarePurchased` on instanceId (not event.id).
  loop.dispatch({
    type: "HardwarePurchased",
    ts: NOW_TS,
    instanceId, // SAME instanceId as before
    itemId: item.id,
    condition: "new",
    cost: item.purchasePrice,
  });
  view = economicsView(loop.snapshot());
  check("dedup: rerunning HardwarePurchased with same instanceId keeps inventory at 1", () => {
    assert.equal(view.hardwareInventory.length, 1);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Software purchase + literal ledger invariant.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: software purchase + ledger invariant");
{
  const loop = freshLoop();
  const sw1985 = SOFTWARE_CATALOG.find((s) => s.releaseYear <= 1985);
  const sw = sw1985 ?? SOFTWARE_CATALOG[0];
  if (sw === undefined) {
    console.log("  SKIP  software purchase (no SOFTWARE_CATALOG entry — seed missing)");
  } else {
    // Bootstrap check: pre-spend balance still includes the baked-in seed.
    let view = economicsView(loop.snapshot());
    assert.equal(view.balance, SEED_MONEY);

    loop.dispatch({
      type: "MoneySpent",
      ts: NOW_TS,
      amount: sw.purchasePrice,
      category: ExpenseCategory.Software,
      purchasedItem: { kind: "software", itemId: sw.id },
    });
    loop.dispatch({
      type: "SoftwarePurchased",
      ts: NOW_TS,
      softwareId: sw.id,
      cost: sw.purchasePrice,
    });
    view = economicsView(loop.snapshot());
    check("LITERAL invariant: balance = totalEarned - totalSpent after software purchase", () => {
      assert.equal(view.balance, view.totalEarned - view.totalSpent);
    });
    check("software inventory shows the new entry joined with catalog", () => {
      assert.equal(view.softwareInventory.length, 1);
      assert.equal(view.softwareInventory[0]!.owned.softwareId, sw.id);
    });
    check("software approx value is non-zero (purchasePrice × 0.4)", () => {
      assert.ok(view.softwareInventory[0]?.software !== null);
      assert.ok(view.netWorth.softwareApproxValue > 0);
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — TravelSubscriptionChanged round-trip.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: travel subscription tier round-trip");
{
  const loop = freshLoop();
  // TravelSubscription is a string union, not an enum — the test uses
  // the canonical "bbs_basic" tier (matching the deterministic event in
  // appendOnlyReplayDeterminism.smoke.ts).
  loop.dispatch({
    type: "TravelSubscriptionChanged",
    ts: NOW_TS,
    tier: "bbs_basic",
    monthlyFee: 15,
  });
  const view = economicsView(loop.snapshot());
  check("view.travelSubscription mirrors the dispatched tier", () => {
    assert.equal(view.travelSubscription, "bbs_basic");
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Trust-weighted job payout band [0.7× .. 1.5×] of basePayment.
// Construct a deterministic WorldState directly via reduceAll so we
// control `state.crew.characters[npcId].cognitive.trustGraph["__player__"]`
// without polluting the SimulationLoop scenarios with INITIAL_NPCS.
// The seed row is already in emptyWorldState(), so the stamped sequence
// only needs the JobAccepted event — no synthetic MoneyEarned dispatch.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: trust-weighted job payout band");
{
  const tJob = JOB_TEMPLATES.find((t) => !!t.npcProviderId);
  if (tJob === undefined) {
    console.log("  SKIP  trust-weighted job payout (no JOB_TEMPLATES with npcProviderId)");
  } else {
    const npcId = tJob.npcProviderId!;
    if (!INITIAL_NPCS[npcId] || !INITIAL_NPCS[npcId]!.cognitive) {
      console.log("  SKIP  trust-weighted job payout (INITIAL_NPCS missing cognitive for npcProviderId)");
    } else {
      const initialWithCrew: WorldState = {
        ...emptyWorldState(),
        crew: {
          hiredIds: [],
          characters: { ...INITIAL_NPCS },
        },
      };
      // Only the JobAccepted event is dispatched — the seed lives in
      // initialWithCrew by construction (no synthetic MoneyEarned needed).
      const stampedEvents = stamp([
        {
          type: "JobAccepted",
          ts: NOW_TS,
          instanceId: "jobinst_baseline",
          templateId: tJob.id,
          npcProviderId: npcId,
          payment: tJob.basePayment,
          reputationDelta: tJob.reputationDelta,
          deadlineYear: 1986,
          deadlineMonth: 6,
        },
      ]);
      const baseline = reduceAll(initialWithCrew, stampedEvents);
      check("baseline state still satisfies the literal invariant (seed row + 0 stamped money)", () => {
        assert.equal(
          baseline.player.money,
          baseline.economy.ledger.income.reduce((s, e) => s + e.amount, 0) -
            baseline.economy.ledger.expense.reduce((s, e) => s + e.amount, 0),
        );
      });
      check("trust=50 baseline: payout ≈ 1.10× basePayment", () => {
        const job0 = baseline.economy.jobs.active[0]!;
        const expectedAt50 = Math.round(
          tJob.basePayment * (0.85 + 0.5 * 0.5),
        );
        assert.equal(expectedJobPayoutForJob(job0, baseline), expectedAt50);
      });
      check("trust=0 floor: payout >= 0.7× basePayment (forced minimum)", () => {
        const lowTrust: WorldState = patchTrustGraph(baseline, npcId, 0);
        const job0 = lowTrust.economy.jobs.active[0]!;
        assert.ok(
          expectedJobPayoutForJob(job0, lowTrust) >=
            Math.round(tJob.basePayment * 0.7),
        );
      });
      check("trust=100 ceiling: payout ≈ 1.35× basePayment", () => {
        const highTrust: WorldState = patchTrustGraph(baseline, npcId, 100);
        const job0 = highTrust.economy.jobs.active[0]!;
        const payout = expectedJobPayoutForJob(job0, highTrust);
        assert.ok(
          Math.abs(payout - Math.round(tJob.basePayment * 1.35)) <= 1,
        );
      });
      check("monotonic: highTrust payout > lowTrust payout", () => {
        const lowTrust = patchTrustGraph(baseline, npcId, 0);
        const highTrust = patchTrustGraph(baseline, npcId, 100);
        const job0 = baseline.economy.jobs.active[0]!;
        assert.ok(
          expectedJobPayoutForJob(job0, highTrust) >
            expectedJobPayoutForJob(job0, lowTrust),
        );
      });
    }
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — recentTransactions ordering (newest first).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: recentTransactions ordering");
{
  const loop = freshLoop();
  loop.dispatch({
    type: "MoneyEarned",
    ts: NOW_TS,
    amount: 50,
    source: IncomeSource.Sponsorship,
  });
  loop.dispatch({
    type: "MoneyEarned",
    ts: NOW_TS + 12,
    amount: 75,
    source: IncomeSource.PartyPrize,
  });
  loop.dispatch({
    type: "MoneySpent",
    ts: NOW_TS + 24,
    amount: 30,
    category: ExpenseCategory.Rent,
  });
  const view = economicsView(loop.snapshot());
  check("recentTransactions cap is 10", () => {
    assert.ok(view.recentTransactions.length <= 10);
  });
  check("recentTransactions newest-first: MoneySpent (latest ts) sorts to position 0", () => {
    assert.equal(view.recentTransactions[0]?.kind, "expense");
  });
  check("LITERAL invariant still holds across the multi-ts scenario", () => {
    assert.equal(view.balance, view.totalEarned - view.totalSpent);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Sanity gate — every catalog referenced by the projection must have seed
// data, so a future "ship an empty list" bug fails fast here.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7 (catalog sanity gate)");
check("HARDWARE_CATALOG / JOB_TEMPLATES / SPONSORSHIP_CATALOG / SOFTWARE_CATALOG non-empty", () => {
  assert.ok(HARDWARE_CATALOG.length > 0);
  assert.ok(JOB_TEMPLATES.length > 0);
  assert.ok(SPONSORSHIP_CATALOG.length > 0);
  assert.ok(SOFTWARE_CATALOG.length > 0);
});

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "economicsView smoke all green." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);

// ─── local helper, kept at file bottom because it's only Scenario 5's ────

function patchTrustGraph(state: WorldState, npcId: string, trust: number): WorldState {
  const npc = state.crew.characters[npcId];
  if (!npc || !npc.cognitive) return state;
  return {
    ...state,
    crew: {
      ...state.crew,
      characters: {
        ...state.crew.characters,
        [npcId]: {
          ...npc,
          cognitive: {
            ...npc.cognitive,
            trustGraph: { ...npc.cognitive.trustGraph, __player__: trust },
          },
        },
      },
    },
  };
}
