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
 * Bug: if a player exported mid-compile (or mid-vote) and then imported a
 *      clean save, `applySnapshot` only reset `isCompiling=false` and the
 *      other ephemeral *UI* state — the original interval kept ticking and
 *      eventually called `finishCompilation()`, producing a leftover release
 *      from the pre-import partial state.
 *
 * Fix: track the interval ids in refs (`compileIntervalRef`,
 *      `partyVoteIntervalRef` in src/App.tsx) and `clearInterval` both
 *      refs at the top of the applySnapshot ephemeral-reset block.
 *
 * Scenarios:
 *   A — positive-control bug repro (no clearInterval on import)
 *   B — compile interval IS cleared on import: finishCompile must NOT fire
 *   C — party vote interval IS cleared on import: awardParty must NOT fire
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

const delay = (ms: number): Promise<void> =>
  new Promise<void>((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// Scenario A — positive-control bug repro.
// Mirrors the ORIGINAL (buggy) shape of triggerAssembleCompiler: setInterval
// owns its id in a local `const interval`, no ref to clear it from outside
// the closure.
// ---------------------------------------------------------------------------
async function scenarioA_bugRepro(): Promise<void> {
  const state = emptyState();
  let tickingProgress = 0;

  const interval = setInterval(() => {
    tickingProgress += 10;
    if (tickingProgress >= 100) {
      clearInterval(interval);
      state.finishCompileFired = true;
      state.myReleases["prod_from_stale_compile"] = { id: "STALE" };
      state.playerMoney += 100;
      state.isCompiling = false;
    }
  }, 50);
  state.isCompiling = true;

  // Wait a few ticks (~2-4 ticks @ 50ms = ~115ms is mid-compile).
  await delay(120);

  // Simulate applySnapshot WITHOUT clearInterval (the bug).
  state.isCompiling = false;
  state.myReleases = {};
  state.playerMoney = 0;

  // Wait past the original full-compile deadline (10 ticks × 50ms = 500ms).
  await delay(400);

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

  console.log(
    "  Scenario A (bug repro): finishCompile DID fire post-import — bug surfaces as expected.  ✓",
  );
}

// ---------------------------------------------------------------------------
// Scenario B — compile interval fix.
// compileIntervalRef holds the id so applySnapshot can clearInterval it.
// Mirrors src/App.tsx post-fix.
// ---------------------------------------------------------------------------
async function scenarioB_compileRefClearsOnImport(): Promise<void> {
  const state = emptyState();
  let tickingProgress = 0;
  const compileIntervalRef: { current: ReturnType<typeof setInterval> | null } = {
    current: null,
  };

  compileIntervalRef.current = setInterval(() => {
    tickingProgress += 10;
    if (tickingProgress >= 100) {
      if (compileIntervalRef.current) clearInterval(compileIntervalRef.current);
      compileIntervalRef.current = null;
      state.finishCompileFired = true;
      state.myReleases["prod_from_stale_compile"] = { id: "STALE" };
      state.playerMoney += 100;
      state.isCompiling = false;
    }
  }, 50);
  state.isCompiling = true;

  await delay(120);

  // Simulate applySnapshot ephemeral reset (post-fix).
  if (compileIntervalRef.current) {
    clearInterval(compileIntervalRef.current);
    compileIntervalRef.current = null;
  }
  state.isCompiling = false;
  state.myReleases = {};
  state.playerMoney = 0;

  await delay(400);

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
async function scenarioC_voteRefClearsOnImport(): Promise<void> {
  const state = emptyState();
  const partyVoteIntervalRef: { current: ReturnType<typeof setInterval> | null } = {
    current: null,
  };

  partyVoteIntervalRef.current = setInterval(() => {
    state.tally["player_entry"] = (state.tally["player_entry"] ?? 0) + 5;
    if ((state.tally["player_entry"] ?? 0) >= 100) {
      if (partyVoteIntervalRef.current) clearInterval(partyVoteIntervalRef.current);
      partyVoteIntervalRef.current = null;
      state.awardPartyFired = true;
      state.playerMoney += 250; // prize credits player money
    }
  }, 50);
  state.isPartyVoting = true;

  await delay(120);

  // Simulate applySnapshot ephemeral reset (post-fix).
  if (partyVoteIntervalRef.current) {
    clearInterval(partyVoteIntervalRef.current);
    partyVoteIntervalRef.current = null;
  }
  state.isPartyVoting = false;
  state.tally = {};
  state.awardPartyFired = false;
  state.playerMoney = 0;

  await delay(400);

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
(async () => {
  console.log("[loadDuringImport.smoke] starting 3 scenarios…");
  await scenarioA_bugRepro();
  await scenarioB_compileRefClearsOnImport();
  await scenarioC_voteRefClearsOnImport();
  console.log("[loadDuringImport.smoke] ALL 3 SCENARIOS PASSED ✓");
})();
