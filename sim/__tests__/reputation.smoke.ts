/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for the multi-dimensional reputation system (v0.6.0 Phase 1a).
 *
 * Verifies:
 *   - emptyWorldState() seeds reputationVector with DEFAULT_REPUTATION_VECTOR
 *   - legacy scalar matches vector average
 *   - ReputationVectorChanged dispatches update both vector and legacy scalar
 *   - Partial deltas only touch specified axes
 *   - Axes are clamped to 0-1000
 */

import { strict as assert } from "node:assert";

import { SimulationLoop } from "@sim/engine/simulationLoop";
import { emptyWorldState, type WorldState } from "@sim/engine/reducer";
import { eventStore } from "@sim/events/eventStore";
import { setCurrentTick } from "@sim/events/appendEvent";
import { DEFAULT_REPUTATION_VECTOR, applyReputationDelta, reputationVectorToLegacy } from "@packages/types";
import type { ReputationVector } from "@packages/types";

function freshLoop(): SimulationLoop {
  eventStore.__resetWith([]);
  setCurrentTick(1);
  return new SimulationLoop({
    initial: emptyWorldState(),
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
// SCENARIO 1 — seed state has correct default reputation vector
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: Default reputation vector in emptyWorldState()");

{
  const state = emptyWorldState();

  check("reputationVector exists with all axes at 20", () => {
    assert.deepStrictEqual(state.player.reputationVector, DEFAULT_REPUTATION_VECTOR);
  });

  check("legacy reputation scalar is 20 (mean of 8 × 20)", () => {
    assert.equal(state.player.reputation, 20);
  });

  check("reputationVectorToLegacy matches scalar", () => {
    assert.equal(reputationVectorToLegacy(state.player.reputationVector), state.player.reputation);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — dispatch ReputationVectorChanged updates vector + legacy
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: Dispatch ReputationVectorChanged");

{
  const loop = freshLoop();

  loop.dispatch({
    type: "ReputationVectorChanged",
    ts: 1,
    delta: { technical: 30, partyPopularity: 15 },
    reason: "won Assembly compo",
  });

  const state = loop.snapshot();

  check("technical increased from 20 to 50", () => {
    assert.equal(state.player.reputationVector.technical, 50);
  });

  check("partyPopularity increased from 20 to 35", () => {
    assert.equal(state.player.reputationVector.partyPopularity, 35);
  });

  check("artistic unchanged at 20", () => {
    assert.equal(state.player.reputationVector.artistic, 20);
  });

  check("music unchanged at 20", () => {
    assert.equal(state.player.reputationVector.music, 20);
  });

  check("graphics unchanged at 20", () => {
    assert.equal(state.player.reputationVector.graphics, 20);
  });

  check("sceneRespect unchanged at 20", () => {
    assert.equal(state.player.reputationVector.sceneRespect, 20);
  });

  check("communityRespect unchanged at 20", () => {
    assert.equal(state.player.reputationVector.communityRespect, 20);
  });

  check("oldschoolCredibility unchanged at 20", () => {
    assert.equal(state.player.reputationVector.oldschoolCredibility, 20);
  });

  check("legacy reputation updated to mean: (50+20+20+20+35+20+20+20)/8 = 25.6 → 26", () => {
    // 205 / 8 = 25.625 → 26
    assert.equal(state.player.reputation, 26);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — clamping at boundaries
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: Axis clamping");

{
  const loop = freshLoop();

  loop.dispatch({
    type: "ReputationVectorChanged",
    ts: 1,
    delta: { technical: 5000, sceneRespect: -5000 },
    reason: "clamping test",
  });

  const state = loop.snapshot();

  check("technical clamped to 1000", () => {
    assert.equal(state.player.reputationVector.technical, 1000);
  });

  check("sceneRespect clamped to 0", () => {
    assert.equal(state.player.reputationVector.sceneRespect, 0);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — multiple deltas accumulate independently
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: Multiple dispatches accumulate");

{
  const loop = freshLoop();

  loop.dispatch({
    type: "ReputationVectorChanged",
    ts: 1,
    delta: { technical: 50, music: 30 },
    reason: "released first demo",
  });

  loop.dispatch({
    type: "ReputationVectorChanged",
    ts: 2,
    delta: { music: 20, graphics: 40 },
    reason: "won best music award",
  });

  const state = loop.snapshot();

  check("technical = 70 (20 + 50)", () => {
    assert.equal(state.player.reputationVector.technical, 70);
  });

  check("music = 70 (20 + 30 + 20)", () => {
    assert.equal(state.player.reputationVector.music, 70);
  });

  check("graphics = 60 (20 + 40)", () => {
    assert.equal(state.player.reputationVector.graphics, 60);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — applyReputationDelta pure function works
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: Pure function applyReputationDelta");

{
  const base: ReputationVector = { ...DEFAULT_REPUTATION_VECTOR };
  const next = applyReputationDelta(base, { technical: 15, oldschoolCredibility: -5 });

  check("technical = 35", () => assert.equal(next.technical, 35));
  check("oldschoolCredibility = 15", () => assert.equal(next.oldschoolCredibility, 15));
  check("artistic unchanged", () => assert.equal(next.artistic, 20));
  check("original base unchanged", () => assert.equal(base.technical, 20));
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "all checks green." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);
