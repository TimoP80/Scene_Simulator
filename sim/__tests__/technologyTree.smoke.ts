/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for the reactive technology tree (v0.6.0 Phase 1b).
 *
 * Verifies:
 *   - eraForYear() maps years to correct eras
 *   - getYearUnlockedTechIds() returns correct techs for a given year
 *   - Simulation loop advanceMonth() auto-unlocks techs on year boundary
 *   - getEffectIdsAvailableAtYear() gates effects by era
 *   - getUnlockedEffectIds() respects year gating
 */

import { strict as assert } from "node:assert";

import { emptyWorldState } from "@sim/engine/reducer";
import { SimulationLoop } from "@sim/engine/simulationLoop";
import { eventStore } from "@sim/events/eventStore";
import { setCurrentTick } from "@sim/events/appendEvent";
import { ERA_BOUNDARIES, eraForYear } from "@sim/data/eraConfig";
import { getYearUnlockedTechIds } from "@sim/data/yearUnlocks";
import { getEffectIdsAvailableAtYear, getUnlockedEffectIds } from "@sim/data/effectUnlocks";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";

function freshLoop(year = 1985, month = 1): SimulationLoop {
  eventStore.__resetWith([]);
  setCurrentTick(year * 12 + month);
  const initial = emptyWorldState();
  initial.calendar.year = year;
  initial.calendar.month = month;
  return new SimulationLoop({
    initial,
    onTick: () => { /* no-op */ },
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
// SCENARIO 1 — eraForYear mapping
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: Era mapping");

check("ERA_8_BIT for 1985", () => assert.equal(eraForYear(1985), "ERA_8_BIT"));
check("ERA_8_BIT for 1989", () => assert.equal(eraForYear(1989), "ERA_8_BIT"));
check("ERA_16_BIT for 1990", () => assert.equal(eraForYear(1990), "ERA_16_BIT"));
check("ERA_16_BIT for 1995", () => assert.equal(eraForYear(1995), "ERA_16_BIT"));
check("ERA_PC_DAWN for 1996", () => assert.equal(eraForYear(1996), "ERA_PC_DAWN"));
check("ERA_3D_SHADER for 2001", () => assert.equal(eraForYear(2001), "ERA_3D_SHADER"));
check("ERA_HD_SHADER for 2006", () => assert.equal(eraForYear(2006), "ERA_HD_SHADER"));
check("ERA_HD_SHADER for 2026", () => assert.equal(eraForYear(2026), "ERA_HD_SHADER"));

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — year unlock tech IDs
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: Year unlock tech IDs");

check("1985 auto-unlocks include raster_sync", () => {
  const ids = getYearUnlockedTechIds(1985);
  assert.ok(ids.has("raster_sync"));
});

check("1985 does NOT include copper_lists", () => {
  const ids = getYearUnlockedTechIds(1985);
  assert.ok(!ids.has("copper_lists"));
});

check("1990 auto-unlocks include copper_lists", () => {
  const ids = getYearUnlockedTechIds(1990);
  assert.ok(ids.has("copper_lists"));
});

check("1990 auto-unlocks still include raster_sync (cumulative)", () => {
  const ids = getYearUnlockedTechIds(1990);
  assert.ok(ids.has("raster_sync"));
});

check("1998 auto-unlocks include opengl_direct3d", () => {
  const ids = getYearUnlockedTechIds(1998);
  assert.ok(ids.has("opengl_direct3d"));
});

check("2026 auto-unlocks include ai_assisted_tools", () => {
  const ids = getYearUnlockedTechIds(2026);
  assert.ok(ids.has("ai_assisted_tools"));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — effect year gating
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: Effect year gating");

check("raster_bars (ERA_8_BIT) available in 1985", () => {
  const ids = getEffectIdsAvailableAtYear(DEMO_EFFECTS, 1985);
  assert.ok(ids.has("raster_bars"));
});

check("animated_plasma (ERA_16_BIT) NOT available in 1985", () => {
  const ids = getEffectIdsAvailableAtYear(DEMO_EFFECTS, 1985);
  assert.ok(!ids.has("animated_plasma"));
});

check("animated_plasma available in 1990", () => {
  const ids = getEffectIdsAvailableAtYear(DEMO_EFFECTS, 1990);
  assert.ok(ids.has("animated_plasma"));
});

check("raymarching_3d (ERA_3D_SHADER) NOT available in 1990", () => {
  const ids = getEffectIdsAvailableAtYear(DEMO_EFFECTS, 1990);
  assert.ok(!ids.has("raymarching_3d"));
});

check("raymarching_3d available in 2001", () => {
  const ids = getEffectIdsAvailableAtYear(DEMO_EFFECTS, 2001);
  assert.ok(ids.has("raymarching_3d"));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — simulation loop automatically unlocks techs on year boundary
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: Simulation loop auto-unlocks on year boundary");

{
  const loop = freshLoop(1984, 12); // December 1984

  check("Pre-advance: calendar is at December 1984", () => {
    assert.equal(loop.snapshot().calendar.year, 1984);
    assert.equal(loop.snapshot().calendar.month, 12);
  });

  // Advance to January 1985 — should auto-unlock 1985 techs
  loop.advanceMonth();

  check("Post-advance: calendar is 1985-01", () => {
    assert.equal(loop.snapshot().calendar.year, 1985);
    assert.equal(loop.snapshot().calendar.month, 1);
  });

  check("Post-advance: sid_analog_mod IS unlocked (1985 auto-unlock)", () => {
    assert.ok(loop.snapshot().player.unlockedTechs.includes("sid_analog_mod"));
  });

  check("Post-advance: calendar is 1985-01", () => {
    assert.equal(loop.snapshot().calendar.year, 1985);
    assert.equal(loop.snapshot().calendar.month, 1);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — multiple year advances accumulate techs
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: Multiple year advances accumulate techs");

{
  const loop = freshLoop(1984, 12);

  // Advance through 1985
  loop.advanceMonth(); // → 1985-01
  loop.advanceMonth(); // → 1985-02
  // ...advance to 1988
  for (let y = 1985; y < 1988; y++) {
    for (let m = 1; m <= 12; m++) {
      if (loop.snapshot().calendar.year === 1988) break;
      loop.advanceMonth();
    }
  }

  check("By 1988: raster_sync is unlocked", () => {
    assert.ok(loop.snapshot().player.unlockedTechs.includes("raster_sync"));
  });

  check("By 1988: custom_spr_tricky is unlocked", () => {
    assert.ok(loop.snapshot().player.unlockedTechs.includes("custom_spr_tricky"));
  });

  // Advance to 1990
  for (let y = 1988; y < 1990; y++) {
    for (let m = 1; m <= 12; m++) {
      if (loop.snapshot().calendar.year === 1990) break;
      loop.advanceMonth();
    }
  }

  check("By 1990: copper_lists is unlocked", () => {
    assert.ok(loop.snapshot().player.unlockedTechs.includes("copper_lists"));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — getUnlockedEffectIds with year gating
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: getUnlockedEffectIds year gating");

{
  // No unlocked techs, year = 1985
  const ids1985 = getUnlockedEffectIds([], [], 1985);
  check("1985: raster_bars available (free, ERA_8_BIT)", () => {
    assert.ok(ids1985.has("raster_bars"));
  });
  check("1985: aniimated_plasma NOT available (ERA_16_BIT)", () => {
    assert.ok(!ids1985.has("animated_plasma"));
  });

  // Year = 1990
  const ids1990 = getUnlockedEffectIds([], [], 1990);
  check("1990: animated_plasma IS available", () => {
    assert.ok(ids1990.has("animated_plasma"));
  });

  // No year passed = no gating (backward compat)
  const idsNoYear = getUnlockedEffectIds([]);
  check("No year: animated_plasma available (free effect, no gating)", () => {
    assert.ok(idsNoYear.has("animated_plasma"));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "all checks green." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);
