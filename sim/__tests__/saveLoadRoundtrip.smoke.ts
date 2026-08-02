/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for the canonical save-game contract in
 * `src/utils/saveGame.ts` (SAVE_VERSION / AutosaveData / migrateSave).
 *
 * Regression pin: the v0.7.4 WorldState migration renamed the App.tsx
 * state mirrors to `ws*` and updated the autosave WRITER to emit those
 * names — but the two readers (`loadSavedGame`, the mount hydrate
 * effect) were left reading the pre-migration legacy names. Because
 * `data.playerMoney` never matched the stored `wsMoney` key, every
 * `?? fallback` fired and a save→load cycle reset money / reputation /
 * rigs / techs / crew / releases to defaults.
 *
 * Scenarios:
 *   1. Canonical round-trip — a save written in the current shape
 *      survives JSON.stringify → migrateSave unchanged (with version).
 *   2. Legacy migration — a pre-migration save (playerMoney, ownedRigs,
 *      playerHandle, ...) normalizes to the ws* canonical keys.
 *   3. Buggy-window save — a ws*-keyed save with NO version field still
 *      migrates (version stamped, keys preserved).
 *   4. Corrupt / non-object input — returns null (callers surface the
 *      corruption error instead of silently defaulting).
 *   5. Canonical wins over legacy — if both key spellings exist, ws*
 *      takes precedence.
 *   6. Missing keys stay undefined — callers apply `?? defaults`, so
 *      migrateSave must not invent values.
 *
 * Pattern matches the other `sim/__tests__/*.smoke.ts` files:
 * `strict as assert` from `node:assert`, custom `check(label, run)`
 * helper, console-logged scenario headers, exit code 1 on any failure.
 */

import { strict as assert } from "node:assert";

import { PlatformId, type Production, type DemoSummary, type BBSThread, type TaskAssignments } from "@packages/types";
import { SAVE_VERSION, migrateSave, type AutosaveData } from "../../src/utils/saveGame";

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

/** Minimal-but-shaped fixture helpers (nested game types cast for brevity). */
const makeProd = (name: string): Production =>
  ({ id: `prod_${name}`, name, year: 1993, month: 6 }) as unknown as Production;
const makeSummary = (): DemoSummary => ({}) as unknown as DemoSummary;
const makeThread = (): BBSThread => ({ id: "th_test", board: "coders_corner" }) as unknown as BBSThread;
const TASKS: TaskAssignments = { programming: ["skaven"], graphics: [], music: [] } as unknown as TaskAssignments;

/** A save exactly as the current writer emits it (canonical ws* keys). */
function makeCanonicalSave(): AutosaveData {
  return {
    version: SAVE_VERSION,
    wsMoney: 812,
    wsReputation: 73,
    currentYear: 1993,
    currentMonth: 6,
    activePlatform: PlatformId.AMIGA_500,
    wsOwnedRigs: [PlatformId.C64, PlatformId.AMIGA_500],
    wsUnlockedTechs: ["raster_sync", "copper_lists"],
    wsHiredCrewIds: ["skaven", "purple_motion"],
    wsMyReleases: { prod_one: makeProd("ONE") },
    productionSummaries: { prod_one: makeSummary() },
    productionDownloads: { prod_one: 1337 },
    wsResearchPoints: 42,
    wsPlayerHandle: "AssemblyKid",
    wsPlayerGroupName: "Tricycle Crews",
    bbsDialed: true,
    bbsThreads: [makeThread()],
    taskAssignments: TASKS,
  };
}

/** A save as the pre-migration writer emitted it (legacy names, no version). */
function makeLegacySave(): Record<string, unknown> {
  return {
    playerMoney: 812,
    playerReputation: 73,
    currentYear: 1993,
    currentMonth: 6,
    activePlatform: PlatformId.AMIGA_500,
    ownedRigs: [PlatformId.C64, PlatformId.AMIGA_500],
    unlockedTechs: ["raster_sync", "copper_lists"],
    hiredCrewIds: ["skaven", "purple_motion"],
    myReleases: { prod_one: makeProd("ONE") },
    productionSummaries: { prod_one: makeSummary() },
    productionDownloads: { prod_one: 1337 },
    researchPoints: 42,
    playerHandle: "AssemblyKid",
    playerGroupName: "Tricycle Crews",
    bbsDialed: true,
    bbsThreads: [makeThread()],
    taskAssignments: TASKS,
  };
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Canonical round-trip (the regression this pins).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: canonical save round-trips through migrateSave");
{
  const canonical = makeCanonicalSave();
  const migrated = migrateSave(JSON.stringify(canonical));
  check("returns a non-null AutosaveData", () => {
    assert.ok(migrated !== null);
  });
  check("money/rep/research survive (previously reset to defaults)", () => {
    assert.equal(migrated?.wsMoney, 812);
    assert.equal(migrated?.wsReputation, 73);
    assert.equal(migrated?.wsResearchPoints, 42);
  });
  check("rigs/techs/crew/releases survive", () => {
    assert.deepEqual(migrated?.wsOwnedRigs, [PlatformId.C64, PlatformId.AMIGA_500]);
    assert.deepEqual(migrated?.wsUnlockedTechs, ["raster_sync", "copper_lists"]);
    assert.deepEqual(migrated?.wsHiredCrewIds, ["skaven", "purple_motion"]);
    assert.deepEqual(Object.keys(migrated?.wsMyReleases ?? {}), ["prod_one"]);
  });
  check("identity + calendar + activePlatform survive", () => {
    assert.equal(migrated?.wsPlayerHandle, "AssemblyKid");
    assert.equal(migrated?.wsPlayerGroupName, "Tricycle Crews");
    assert.equal(migrated?.currentYear, 1993);
    assert.equal(migrated?.currentMonth, 6);
    assert.equal(migrated?.activePlatform, PlatformId.AMIGA_500);
  });
  check("side data (downloads, threads, tasks) survives", () => {
    assert.equal(migrated?.productionDownloads.prod_one, 1337);
    assert.equal(migrated?.bbsThreads.length, 1);
    assert.deepEqual(migrated?.taskAssignments.programming, ["skaven"]);
  });
  check("version is stamped", () => {
    assert.equal(migrated?.version, SAVE_VERSION);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Legacy (pre-migration) save migrates to canonical keys.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: legacy pre-migration save normalizes to ws* keys");
{
  const migrated = migrateSave(JSON.stringify(makeLegacySave()));
  check("legacy playerMoney → wsMoney", () => assert.equal(migrated?.wsMoney, 812));
  check("legacy playerReputation → wsReputation", () => assert.equal(migrated?.wsReputation, 73));
  check("legacy researchPoints → wsResearchPoints", () => assert.equal(migrated?.wsResearchPoints, 42));
  check("legacy ownedRigs → wsOwnedRigs", () =>
    assert.deepEqual(migrated?.wsOwnedRigs, [PlatformId.C64, PlatformId.AMIGA_500]));
  check("legacy unlockedTechs → wsUnlockedTechs", () =>
    assert.deepEqual(migrated?.wsUnlockedTechs, ["raster_sync", "copper_lists"]));
  check("legacy hiredCrewIds → wsHiredCrewIds", () =>
    assert.deepEqual(migrated?.wsHiredCrewIds, ["skaven", "purple_motion"]));
  check("legacy myReleases → wsMyReleases", () =>
    assert.deepEqual(Object.keys(migrated?.wsMyReleases ?? {}), ["prod_one"]));
  check("legacy playerHandle → wsPlayerHandle", () =>
    assert.equal(migrated?.wsPlayerHandle, "AssemblyKid"));
  check("legacy playerGroupName → wsPlayerGroupName", () =>
    assert.equal(migrated?.wsPlayerGroupName, "Tricycle Crews"));
  check("shared keys (calendar/platform) pass through untouched", () => {
    assert.equal(migrated?.currentYear, 1993);
    assert.equal(migrated?.currentMonth, 6);
    assert.equal(migrated?.activePlatform, PlatformId.AMIGA_500);
  });
  check("version stamped for legacy saves too", () => {
    assert.equal(migrated?.version, SAVE_VERSION);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Buggy-window save: ws* keys but no version field.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: ws*-keyed save with no version still migrates");
{
  const buggy = { ...makeCanonicalSave() } as unknown as Record<string, unknown>;
  delete buggy.version;
  const migrated = migrateSave(JSON.stringify(buggy));
  check("ws* values preserved without a version field", () => {
    assert.equal(migrated?.wsMoney, 812);
    assert.deepEqual(migrated?.wsOwnedRigs, [PlatformId.C64, PlatformId.AMIGA_500]);
  });
  check("version is stamped on load", () => {
    assert.equal(migrated?.version, SAVE_VERSION);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Corrupt / non-object input → null (callers surface error).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: corrupt or non-object input returns null");
check("unparseable JSON returns null", () => assert.equal(migrateSave("{oops"), null));
check("primitive JSON (42) returns null", () => assert.equal(migrateSave("42"), null));
check("JSON array returns null", () => assert.equal(migrateSave("[]"), null));
check("JSON null literal returns null", () => assert.equal(migrateSave("null"), null));

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Canonical key wins when both spellings exist.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: canonical ws* key wins over legacy key");
{
  const mixed = { ...makeLegacySave(), wsMoney: 9001 };
  const migrated = migrateSave(JSON.stringify(mixed));
  check("wsMoney (9001) beats playerMoney (812)", () => assert.equal(migrated?.wsMoney, 9001));
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — Missing keys stay undefined (callers apply ?? defaults).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: absent keys remain undefined — never invented");
{
  const migrated = migrateSave(JSON.stringify({ wsMoney: 250 }));
  check("present key is readable", () => assert.equal(migrated?.wsMoney, 250));
  check("absent wsReputation is undefined (caller defaults apply)", () =>
    assert.equal(migrated?.wsReputation, undefined));
  check("absent wsOwnedRigs is undefined (caller defaults apply)", () =>
    assert.equal(migrated?.wsOwnedRigs, undefined));
  check("absent wsPlayerHandle is undefined (caller defaults apply)", () =>
    assert.equal(migrated?.wsPlayerHandle, undefined));
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "saveLoadRoundtrip smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
