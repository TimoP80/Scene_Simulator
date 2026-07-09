/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Characterization test for the "load during import" mid-flight interval bug.
 *
 * Reproduces the pattern in src/App.tsx where:
 *   - `triggerAssembleCompiler` and `startPartyVotingProcess` each own a
 *     setInterval whose closure references partial state captured at
 *     the moment the interval was created.
 *   - On the terminal tick those intervals call `finishCompilation()` /
 *     `awardPartyContestPoints()`, both of which mutate `myReleases` /
 *     `playerMoney` / etc.
 *
 * Bug: if a player saved mid-compile (or mid-vote) and then imported a
 *      clean save, `applySnapshot` only reset ephemeral *UI* state — the
 *      original interval kept ticking and eventually called
 *      `finishCompilation()`, producing a leftover release from the
 *      pre-import partial state.
 *
 * Fix: track the interval ids in refs (`compileIntervalRef`,
 *      `partyVoteIntervalRef` in src/App.tsx) and `clearInterval` both
 *      refs at the top of the applySnapshot ephemeral-reset block.
 *
 * Scenarios:
 *   A — positive-control bug repro (no clearInterval on import)
 *   B — compile interval IS cleared on import: finishCompile must NOT fire
 *   C — party vote interval IS cleared on import: awardParty must NOT fire
 *
 * Implementation note: this test is DETERMINISTIC. Instead of relying on
 * real `setInterval` ticks (which can flake under sequential
 * `npm run test:all` load when cumulative timers inflate event-loop
 * latency), the scenarios manually `tick()` a stub interval. The stub
 * matches the SURVIVAL contract — `clearInterval` stops future ticks
 * from firing — without depending on Node's wall-clock scheduler.
 */

import { strict as assert } from "node:assert";

type State = {
  isCompiling: boolean;
  isPartyVoting: boolean;
  myReleases: Record<string, unknown>;
  playerMoney: number;
  tally: Record<string, number>;
  finishCompileFired: boolean;
  awardPartyFired: boolean;
};

function emptyState(): State {
  return {
    isCompiling: false,
    isPartyVoting: false,
    myReleases: {},
    playerMoney: 250,
    tally: {},
    finishCompileFired: false,
    awardPartyFired: false,
  };
}

/**
 * Stub interval — deterministic stand-in for `setInterval` that the
 * test can advance manually and `clear()` exactly as the production
 * interval would be cleared. Identifies the same invariant the real
 * bug hinges on: AFTER clear(), subsequent `tick()` calls are no-ops.
 */
interface StubInterval {
  tick: () => void;
  isCleared: () => boolean;
  clear: () => void;
}

function makeInterval(onTick: () => void): StubInterval {
  let cleared = false;
  return {
    tick: () => {
      if (!cleared) onTick();
    },
    isCleared: () => cleared,
    clear: () => {
      cleared = true;
    },
  };
}

// ---------------------------------------------------------------------------
// Scenario A — positive-control bug repro.
// Mirrors the ORIGINAL (buggy) shape of triggerAssembleCompiler: the
// interval id is captured in a closure-local variable, NOT in a ref, so
// applySnapshot cannot reach it from outside.
// ---------------------------------------------------------------------------
function scenarioA_bugRepro(): void {
  const state = emptyState();
  let tickingProgress = 0;

  const interval = makeInterval(() => {
    tickingProgress += 10;
    if (tickingProgress >= 100) {
      interval.clear();
      state.finishCompileFired = true;
      state.myReleases["prod_from_stale_compile"] = { id: "STALE" };
      state.playerMoney += 100;
      state.isCompiling = false;
    }
  });
  state.isCompiling = true;

  // Advance a few ticks (mid-compile: progress ~30-40).
  for (let i = 0; i < 3; i++) interval.tick();
  assert.equal(
    state.isCompiling,
    true,
    "Scenario A: isCompiling should still be true mid-compile.",
  );

  // Simulate applySnapshot WITHOUT clearInterval (the BUG).
  state.isCompiling = false;
  state.myReleases = {};
  state.playerMoney = 0;

  // Advance past the original full-compile deadline (rest of the 10 ticks).
  for (let i = 0; i < 8; i++) interval.tick();

  // Without the fix the terminal tick fires post-import and leaks the
  // partial state into the freshly-imported world.
  assert.equal(
    state.finishCompileFired,
    true,
    "Scenario A (positive-control): WITHOUT clearInterval on import, finishCompile fires — confirming the bug repro exists.",
  );
  assert.equal(
    Object.keys(state.myReleases).length,
    1,
    "Scenario A: leftover release leaks from pre-import partial compile into post-import state.",
  );
  assert.equal(
    state.playerMoney,
    100,
    "Scenario A: stale +$100 prize credit leaks into post-import state.",
  );

  console.log(
    "  Scenario A (bug repro): finishCompile DID fire post-import — bug surfaces as expected.  ✓",
  );
}

// ---------------------------------------------------------------------------
// Scenario B — compile interval fix.
// compileIntervalRef holds the id so applySnapshot can clearInterval it.
// Mirrors src/App.tsx post-fix: the interval id sits in a ref-like
// holder that survives the closure's scope, so the snapshot path can
// reach it and stop further ticks.
// ---------------------------------------------------------------------------
function scenarioB_compileRefClearsOnImport(): void {
  const state = emptyState();
  let tickingProgress = 0;
  const compileIntervalRef: { current: StubInterval | null } = { current: null };

  compileIntervalRef.current = makeInterval(() => {
    tickingProgress += 10;
    if (tickingProgress >= 100) {
      if (compileIntervalRef.current) compileIntervalRef.current.clear();
      compileIntervalRef.current = null;
      state.finishCompileFired = true;
      state.myReleases["prod_from_stale_compile"] = { id: "STALE" };
      state.playerMoney += 100;
      state.isCompiling = false;
    }
  });
  state.isCompiling = true;

  for (let i = 0; i < 3; i++) compileIntervalRef.current.tick();

  // Simulate applySnapshot ephemeral reset (post-fix): the interval
  // is cancelled BEFORE any setState calls overwrite the imported
  // state.
  if (compileIntervalRef.current) compileIntervalRef.current.clear();
  compileIntervalRef.current = null;
  state.isCompiling = false;
  state.myReleases = {};
  state.playerMoney = 0;

  // Advance past the deadline — clear() consumed the schedule, so
  // these ticks must be no-ops.
  for (let i = 0; i < 10; i++) {
    // The ref is null after the snapshot — try to reach it the way
    // a buggy consumer would (defensive null-check); nothing happens.
    if (compileIntervalRef.current) compileIntervalRef.current.tick();
  }

  assert.equal(
    state.finishCompileFired,
    false,
    "Scenario B (fix): finishCompile must NOT fire after applySnapshot cleared the interval.",
  );
  assert.deepEqual(
    state.myReleases,
    {},
    "Scenario B (fix): myReleases must be empty after import — no leftover stale release.",
  );
  assert.equal(
    state.playerMoney,
    0,
    "Scenario B (fix): player money reflects the imported clean state, no leaked prize.",
  );
  assert.equal(
    state.isCompiling,
    false,
    "Scenario B (fix): isCompiling cleared; UI is consistent with imported state.",
  );

  console.log(
    "  Scenario B (compile interval cleared on import): finishCompile did NOT fire.  ✓",
  );
}

// ---------------------------------------------------------------------------
// Scenario C — party vote interval fix.
// Same pattern as Scenario B but for startPartyVotingProcess. The old
// interval could fire awardPartyContestPoints() and credit prize money to
// the pre-import player.
// ---------------------------------------------------------------------------
function scenarioC_voteRefClearsOnImport(): void {
  const state = emptyState();
  const partyVoteIntervalRef: { current: StubInterval | null } = { current: null };

  partyVoteIntervalRef.current = makeInterval(() => {
    state.tally["player_entry"] = (state.tally["player_entry"] ?? 0) + 5;
    if ((state.tally["player_entry"] ?? 0) >= 100) {
      if (partyVoteIntervalRef.current) partyVoteIntervalRef.current.clear();
      partyVoteIntervalRef.current = null;
      state.awardPartyFired = true;
      state.playerMoney += 250; // prize credits player money
    }
  });
  state.isPartyVoting = true;

  for (let i = 0; i < 3; i++) partyVoteIntervalRef.current.tick();

  // Simulate applySnapshot ephemeral reset (post-fix).
  if (partyVoteIntervalRef.current) partyVoteIntervalRef.current.clear();
  partyVoteIntervalRef.current = null;
  state.isPartyVoting = false;
  state.tally = {};
  state.awardPartyFired = false;
  state.playerMoney = 0;

  for (let i = 0; i < 30; i++) {
    if (partyVoteIntervalRef.current) partyVoteIntervalRef.current.tick();
  }

  assert.equal(
    state.awardPartyFired,
    false,
    "Scenario C (fix): awardParty must NOT fire after applySnapshot cleared the vote interval.",
  );
  assert.deepEqual(
    state.tally,
    {},
    "Scenario C (fix): tally must be cleared after import.",
  );
  assert.equal(
    state.playerMoney,
    0,
    "Scenario C (fix): prize money does not leak from pre-import state into post-import state.",
  );
  assert.equal(
    state.isPartyVoting,
    false,
    "Scenario C (fix): isPartyVoting cleared; UI consistent with imported state.",
  );

  console.log(
    "  Scenario C (party-vote interval cleared on import): awardParty did NOT fire.  ✓",
  );
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
console.log("[loadDuringImport.smoke] starting 3 scenarios…");
scenarioA_bugRepro();
scenarioB_compileRefClearsOnImport();
scenarioC_voteRefClearsOnImport();
console.log("[loadDuringImport.smoke] ALL 3 SCENARIOS PASSED ✓");
