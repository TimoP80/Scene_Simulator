/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke for the rival-group rivalry heatmap (`RivalGroupState.rivalries`).
 *
 * Sign convention (matches GroupDossierPanel.tsx): intensity > 0 =
 * HOSTILE (red bar), intensity < 0 = FRIENDLY (cyan bar), 0 = neutral.
 * Values are clamped to [-100, 100].
 *
 * Pins the heatmap writers in `sim/domain/rivalGroups.ts`:
 *   1. bootstrap historical seeds (future_crew ↔ razor_1911, ...)
 *   2. same-month release race — directional winner/loser shifts
 *   3. member-poaching shock — deterministic poacher pick + both-ways shift
 *   4. split — reciprocal SPLIT_RIVALRY_SHIFT seeded by the reducer
 *   5. collaboration — rare per-pair friendly (negative) shift
 *   6. 40-year integration — bounds, friendly entries, growth beyond seeds,
 *      and pure-function determinism on a crafted month.
 *
 * The shock/collab rolls use `hashFloat` keys (e.g. `collab_a_b_Y_M`),
 * so the test replicates the two hash helpers to PREDICT which (year,
 * month) fires — every assertion below is deterministic, never "wait
 * for a random event to happen".
 */

import { strict as assert } from "node:assert";
import {
  bootstrapRivalGroups,
  simulateRivalGroups,
  SPLIT_RIVALRY_SHIFT,
} from "@sim/domain/rivalGroups";
import { emptyWorldState, reduce } from "@sim/engine/reducer";
import { SimulationLoop } from "@sim/engine/simulationLoop";
import { eventStore } from "@sim/events/eventStore";
import { setCurrentTick } from "@sim/events/appendEvent";
import { ProductionType, type RivalGroupState } from "@packages/types";
import type { SimEvent } from "@sim/events/eventTypes";

let failed = 0;
function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ─── Deterministic hash replicas (keep in sync with rivalGroups.ts) ──
// Used to PREDICT which (year, month) a shock / collab roll fires, so
// the assertions never depend on "eventually a random event happens".
function hashSeed(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i++) {
    const char = value.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}
function hashFloat(value: string): number {
  return (hashSeed(value) % 100000) / 100000;
}

// Tuning mirrors (private in rivalGroups.ts).
const COLLAB_BASE_CHANCE = 0.006;
const SHOCK_BASE_CHANCE = 0.025;
const POACH_SHOCK_WEIGHT = 8;
const SHOCK_TOTAL_WEIGHT = 98;

// 12 seed entries: 6 symmetric pairs × 2 directions (see RIVALRY_SEEDS).
const RIVALRY_SEED_COUNT = 12;

/** A valid minimal RivalGroupState for crafted scenario inputs. */
function makeGroup(id: string, overrides: Partial<RivalGroupState> = {}): RivalGroupState {
  return {
    id,
    name: `TEST ${id.toUpperCase()}`,
    personality: {
      ambition: 50,
      technicalFocus: 50,
      artisticFocus: 50,
      stability: 70,
      preferredPlatforms: [],
      preferredTypes: [],
    },
    activityStatus: "active",
    currentProject: null,
    motivation: 60,
    morale: 60,
    reputation: 400,
    fanbase: 100,
    releaseCount: 0,
    lastReleaseYear: 1985,
    lastReleaseMonth: 1,
    foundingYear: 1985,
    hqLocation: "Testville",
    motto: "smoke test motto",
    memberIds: [],
    rivalries: {},
    ...overrides,
  };
}

/** True when the member_poached shock fires for a victim in a month. */
function poachFires(victimId: string, year: number, month: number): boolean {
  if (hashFloat(`shock_${victimId}_${year}_${month}`) >= SHOCK_BASE_CHANCE) return false;
  const typeRoll = hashFloat(`shock_type_${victimId}_${year}_${month}`) * SHOCK_TOTAL_WEIGHT;
  // member_poached is the LAST shock entry with weight 8 of 98 total.
  return typeRoll > SHOCK_TOTAL_WEIGHT - POACH_SHOCK_WEIGHT;
}

/** True when the collaboration roll fires for a pair in a month. */
function collabFires(aId: string, bId: string, year: number, month: number): boolean {
  return hashFloat(`collab_${aId}_${bId}_${year}_${month}`) < COLLAB_BASE_CHANCE;
}

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 1 — bootstrap historical rivalries
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 1 — bootstrap historical rivalries ===");

check("bootstrap seeds future_crew ↔ razor_1911 (hostile, positive)", () => {
  const groups = bootstrapRivalGroups();
  const fc = groups.future_crew!;
  const r1 = groups.razor_1911!;
  assert.ok((fc.rivalries["razor_1911"] ?? 0) > 0, "future_crew → razor_1911 should be hostile");
  assert.ok((r1.rivalries["future_crew"] ?? 0) > 0, "razor_1911 → future_crew should be hostile");
  assert.equal(
    fc.rivalries["razor_1911"],
    r1.rivalries["future_crew"],
    "seeded rivalries must be symmetric",
  );
});

check("bootstrap seeds never create dangling heatmap keys", () => {
  const groups = bootstrapRivalGroups();
  for (const g of Object.values(groups)) {
    for (const otherId of Object.keys(g.rivalries)) {
      assert.ok(groups[otherId], `dangling heatmap key ${otherId} on ${g.id}`);
    }
  }
});

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 2 — same-month release race (beat-at-party proxy)
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 2 — same-month release race ===");

// Pick a month where the pair does NOT also collide (collab would add a
// friendly shift on top of the race shift, muddying the exact values).
let raceMonth = { year: 1985, month: 1 };
outer: for (let y = 1985; y <= 1995; y++) {
  for (let m = 1; m <= 12; m++) {
    if (!collabFires("race_a", "race_b", y, m)) {
      raceMonth = { year: y, month: m };
      break outer;
    }
  }
}

// Two groups with identical projects that complete the SAME month →
// same score → race_a wins (>= tie), race_b loses.
const raceInput = {
  race_a: makeGroup("race_a", {
    currentProject: {
      name: "RACE A",
      type: ProductionType.Demo,
      progressPct: 99,
      startedYear: 1985,
      startedMonth: 1,
      quality: 80,
    },
  }),
  race_b: makeGroup("race_b", {
    currentProject: {
      name: "RACE B",
      type: ProductionType.Demo,
      progressPct: 99,
      startedYear: 1985,
      startedMonth: 1,
      quality: 80,
    },
  }),
};

check("both groups release in the chosen month", () => {
  const res = simulateRivalGroups(raceInput, raceMonth.year, raceMonth.month);
  assert.equal(res.updatedGroups.race_a!.releaseCount, 1, "race_a should have released");
  assert.equal(res.updatedGroups.race_b!.releaseCount, 1, "race_b should have released");
});

check("race shifts heatmap both ways (winner disdain 10, loser resentment 20)", () => {
  const res = simulateRivalGroups(raceInput, raceMonth.year, raceMonth.month);
  const aToB = res.updatedGroups.race_a!.rivalries["race_b"] ?? 0;
  const bToA = res.updatedGroups.race_b!.rivalries["race_a"] ?? 0;
  assert.equal(aToB, 10, "winner (race_a) should hold 10 disdain toward the loser");
  assert.equal(bToA, 20, "loser (race_b) should hold 20 resentment toward the winner");
});

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 3 — member-poaching shock picks a poacher + shifts heatmap
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 3 — member-poaching shock ===");

// Predict a month where SOME candidate victim gets the member_poached
// shock and that victim↔poacher pair does NOT also collide. The candidate
// pool is the REAL bootstrap group-id set — the same ids the 40-year
// integration below exercises. (A crafted `victim_poach_vN` id pattern
// lands in a degenerate hash corner: for those keys the `shock_*` and
// `shock_type_*` rolls are structurally correlated, so a firing shock
// roll never selects member_poached. Real ids hit the band — e.g.
// crest@2016-10 — proving the sim's poach branch is live.)
let poachHit: { id: string; year: number; month: number } | null = null;
outer: for (const vid of Object.keys(bootstrapRivalGroups())) {
  for (let y = 1985; y <= 2026; y++) {
    for (let m = 1; m <= 12; m++) {
      if (poachFires(vid, y, m) && !collabFires(vid, "poacher_g", y, m)) {
        poachHit = { id: vid, year: y, month: m };
        break outer;
      }
    }
  }
}

check("member_poached shock found within the deterministic scan window", () => {
  assert.ok(poachHit, "expected a member_poached shock within the scan window");
});

// The victim always starts with the same 4 members; the poached member
// is picked deterministically via the same hash the sim uses.
const victimId = poachHit!.id;
const victimMembers = ["m1", "m2", "m3", "m4"];
const poachedIdx =
  hashSeed(`poach_${victimId}_${poachHit!.year}_${poachHit!.month}`) % victimMembers.length;
const poachedMember = victimMembers[poachedIdx]!;

const poachInput = {
  [victimId]: makeGroup(victimId, { memberIds: victimMembers }),
  poacher_g: makeGroup("poacher_g", { memberIds: ["p1", "p2"] }),
};

check("poach removes the poached member (recruit may refill the slot)", () => {
  const res = simulateRivalGroups(poachInput, poachHit!.year, poachHit!.month);
  const victimAfter = res.updatedGroups[victimId]!;
  assert.ok(
    !victimAfter.memberIds.includes(poachedMember),
    `poached member ${poachedMember} should no longer be in the victim's roster`,
  );
  assert.ok(
    victimAfter.memberIds.length >= 3 && victimAfter.memberIds.length <= 4,
    `member count should drop by one (± a same-month recruit), got ${victimAfter.memberIds.length}`,
  );
});

check("poach shifts heatmap +25 in both directions (victim ↔ poacher)", () => {
  const res = simulateRivalGroups(poachInput, poachHit!.year, poachHit!.month);
  const vToP = res.updatedGroups[victimId]!.rivalries["poacher_g"] ?? 0;
  const pToV = res.updatedGroups.poacher_g!.rivalries[victimId] ?? 0;
  assert.equal(vToP, 25, "victim should resent the poacher +25");
  assert.equal(pToV, 25, "poacher should be hostile toward the victim +25");
});

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 4 — split seeds reciprocal rivalry through the reducer
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 4 — split reciprocal rivalry (reducer) ===");

const splitEvent: SimEvent = {
  type: "RivalGroupFormed",
  id: "split_evt_1",
  ts: 1985 * 12 + 6,
  reducedAt: 0,
  groupId: "new_split",
  groupName: "TEST NEW SPLIT",
  memberIds: ["m1", "m2"],
  foundingYear: 1985,
  foundingMonth: 6,
  hqLocation: "Testville",
  motto: "Split from parent",
  parentGroupId: "parent_split",
};

check("new split group seeds hostile rivalry toward its parent", () => {
  const state = reduce(
    {
      ...emptyWorldState(),
      rivals: {
        groups: {
          parent_split: makeGroup("parent_split", {
            memberIds: ["m1", "m2", "m3", "m4"],
            rivalries: { old_rival: 15 },
          }),
        },
        productions: [],
        activityLog: [],
      },
    },
    splitEvent,
  );
  assert.equal(state.rivals.groups.new_split!.rivalries["parent_split"], SPLIT_RIVALRY_SHIFT);
});

check("parent seeds reciprocal rivalry toward the breakaway (preserving old entries)", () => {
  const state = reduce(
    {
      ...emptyWorldState(),
      rivals: {
        groups: {
          parent_split: makeGroup("parent_split", {
            memberIds: ["m1", "m2", "m3", "m4"],
            rivalries: { old_rival: 15 },
          }),
        },
        productions: [],
        activityLog: [],
      },
    },
    splitEvent,
  );
  const parent = state.rivals.groups.parent_split!;
  assert.equal(parent.rivalries["new_split"], SPLIT_RIVALRY_SHIFT);
  assert.equal(parent.rivalries["old_rival"], 15, "pre-existing rivalries must survive");
});

check("split removes transferred members from the parent", () => {
  const state = reduce(
    {
      ...emptyWorldState(),
      rivals: {
        groups: {
          parent_split: makeGroup("parent_split", {
            memberIds: ["m1", "m2", "m3", "m4"],
          }),
        },
        productions: [],
        activityLog: [],
      },
    },
    splitEvent,
  );
  assert.deepEqual(state.rivals.groups.parent_split!.memberIds, ["m3", "m4"]);
});

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 5 — collaboration writes a friendly (negative) shift
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 5 — collaboration friendly shift ===");

// Predict a month where SOME real bootstrap pair collaborates AND neither
// side is otherwise touched that month: no member-poach shock (a poach
// would layer +25 hostility on top of the -15 collab shift and break the
// exact assertion) and no hiatus (a hiatus removes the group from the
// active-collab set, so the collab pass would skip the pair). Crafted
// ids like `collab_a`/`collab_b` never fire the collab roll (same
// degenerate hash corner as the poach scan) — real pairs do, e.g.
// future_crew ↔ razor_1911 @ 2018-01.
function hiatusFires(id: string, year: number, month: number): boolean {
  // Mirrors the sim's HIATUS_BASE_CHANCE × (1 - effectiveStability/200)
  // with the makeGroup defaults (stability 70, morale 60):
  //   0.02 × (1 - (70 + 60×0.3) / 200) = 0.0112
  return hashFloat(`hiatus_${id}_${year}_${month}`) < 0.0112;
}
let collabMonth: { pair: [string, string]; year: number; month: number } | null = null;
const realIds = Object.keys(bootstrapRivalGroups());
outer: for (let i = 0; i < realIds.length; i++) {
  for (let j = i + 1; j < realIds.length; j++) {
    for (let y = 1985; y <= 2026; y++) {
      for (let m = 1; m <= 12; m++) {
        const a = realIds[i]!;
        const b = realIds[j]!;
        if (
          collabFires(a, b, y, m) &&
          !poachFires(a, y, m) &&
          !poachFires(b, y, m) &&
          !hiatusFires(a, y, m) &&
          !hiatusFires(b, y, m)
        ) {
          collabMonth = { pair: [a, b], year: y, month: m };
          break outer;
        }
      }
    }
  }
}

check("collaboration roll found within the deterministic scan window", () => {
  assert.ok(collabMonth, "expected a collaboration roll within the scan window");
});

const collabInput = {
  [collabMonth!.pair[0]]: makeGroup(collabMonth!.pair[0], { memberIds: ["m1", "m2"] }),
  [collabMonth!.pair[1]]: makeGroup(collabMonth!.pair[1], { memberIds: ["m3", "m4"] }),
};

check("collaboration shifts heatmap -15 in both directions (friendly)", () => {
  const res = simulateRivalGroups(collabInput, collabMonth!.year, collabMonth!.month);
  const aId = collabMonth!.pair[0];
  const bId = collabMonth!.pair[1];
  const aToB = res.updatedGroups[aId]!.rivalries[bId] ?? 0;
  const bToA = res.updatedGroups[bId]!.rivalries[aId] ?? 0;
  assert.ok(aToB < 0, `${aId} should be friendly toward ${bId} (negative)`);
  assert.ok(bToA < 0, `${bId} should be friendly toward ${aId} (negative)`);
  assert.equal(aToB, bToA, "collaboration shift must be symmetric");
});

// ──────────────────────────────────────────────────────────────────────
// SCENARIO 6 — 40-year integration: bounds, growth, determinism
// ──────────────────────────────────────────────────────────────────────
console.log("\n=== SCENARIO 6 — 40-year integration ===");

function runCareer(): Record<string, RivalGroupState> {
  eventStore.__resetWith([]);
  setCurrentTick(1985 * 12 + 1);
  const loop = new SimulationLoop({ initial: emptyWorldState(), onTick: () => {} });
  for (let i = 0; i < 480; i++) loop.advanceMonth(); // 1985-01 → 2025-01
  return loop.snapshot().rivals.groups;
}

const finalGroups = runCareer();

check("all heatmap values stay within [-100, 100] after 40 years", () => {
  for (const g of Object.values(finalGroups)) {
    for (const [otherId, v] of Object.entries(g.rivalries)) {
      assert.ok(
        v >= -100 && v <= 100,
        `out-of-range heat ${v} on ${g.id} → ${otherId}`,
      );
    }
  }
});

check("40-year world contains at least one friendly (negative) heat entry", () => {
  const friendly = Object.values(finalGroups).some((g) =>
    Object.values(g.rivalries).some((v) => v < 0),
  );
  assert.ok(friendly, "collaborations should produce friendly entries over 40 years");
});

check("40-year world grows the heatmap beyond the bootstrap seeds", () => {
  const totalEntries = Object.values(finalGroups).reduce(
    (sum, g) => sum + Object.keys(g.rivalries).length,
    0,
  );
  assert.ok(
    totalEntries > RIVALRY_SEED_COUNT,
    `expected heatmap growth past ${RIVALRY_SEED_COUNT} seed entries, got ${totalEntries}`,
  );
});

check("same crafted month run twice → identical heatmap (pure function)", () => {
  const a = simulateRivalGroups(raceInput, raceMonth.year, raceMonth.month);
  const b = simulateRivalGroups(raceInput, raceMonth.year, raceMonth.month);
  assert.deepEqual(a.updatedGroups.race_a!.rivalries, b.updatedGroups.race_a!.rivalries);
  assert.deepEqual(a.updatedGroups.race_b!.rivalries, b.updatedGroups.race_b!.rivalries);
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — rivalryHeatmap smoke all green.");
