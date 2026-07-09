/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/artisticDirections.ts` — pins the structural
 * shape of `ARTISTIC_DIRECTION_DEFS` so any drift in:
 *   - the catalogue (a direction dropped or renamed),
 *   - the calibration (a `devTimeMultiplier` ≤ 0, or a `cap` out of band),
 *   - or the scoring axis (a category added/renamed under
 *     `scoreMultipliers`)
 * trips the test loudly.
 *
 * Two contract invariants covered:
 *   1. Every documented direction has `devTimeMultiplier > 0`. The
 *      scoring engine multiplies base dev time by this factor inside
 *      `applyDevelopmentTime`; a 0 would freeze dev time, a negative
 *      would produce a behaviour bug.
 *   2. Every direction's `scoreMultipliers` carries EXACTLY the
 *      7-category union (`programming`, `graphics`, `music`, `originality`,
 *      `optimization`, `audienceAppeal`, `technicalDifficulty`). Adding
 *      a category without updating `applyArtisticDirection` and
 *      `weightedScore` would compute an undefined score; removing a
 *      category would silently zero it out.
 *
 * Pattern matches `judgingProfiles.smoke.ts` / `scoring.smoke.ts`:
 * `strict as assert` + custom `check(label, run)` helper + console
 * headers + exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import { ARTISTIC_DIRECTION_DEFS, type ArtisticDirectionDef } from "@sim/data/artisticDirections";
import type { ArtisticDirection } from "@packages/types";

// ──────────────────────────────────────────────────────────────────────────
// Constants & test scaffolding
// ──────────────────────────────────────────────────────────────────────────

/** The five directions the studio currently offers. Adding a 6th
 *  direction here without updating ARTISTIC_DIRECTION_DEFS will fail
 *  Scenario 0's scaffolding gate. */
const EXPECTED_DIRECTIONS: readonly ArtisticDirection[] = [
  "Technical Showcase",
  "Artistic",
  "Experimental",
  "Oldschool",
  "Music-Driven",
] as const;

/** The seven scoring categories that BOTH `JUDGING_PROFILES.weights`
 *  AND `ARTISTIC_DIRECTION_DEFS.scoreMultipliers` must carry. Mirrors
 *  the union used by `sim/data/judgingProfiles.ts` and the engine's
 *  weightedScore helper. */
const EXPECTED_CATEGORY_KEYS = [
  "programming",
  "graphics",
  "music",
  "originality",
  "optimization",
  "audienceAppeal",
  "technicalDifficulty",
] as const;

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
// SCENARIO 0 — Scaffolding sanity gate.
//
// Pins the structural assumptions: the catalogue has exactly the 5
// documented directions, EACH keyed by its own id (no aliasing), and
// every direction's `scoreMultipliers` already covers the EXPECTED
// 7-category union (the deeper per-direction checks below ride on
// this being true).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: artistic directions scaffolding sanity gate");
check("ARTISTIC_DIRECTION_DEFS has all 5 documented directions", () => {
  assert.equal(
    Object.keys(ARTISTIC_DIRECTION_DEFS).length,
    EXPECTED_DIRECTIONS.length,
    `expected ${EXPECTED_DIRECTIONS.length} directions, got ${Object.keys(ARTISTIC_DIRECTION_DEFS).length}`,
  );
  for (const dir of EXPECTED_DIRECTIONS) {
    assert.ok(
      ARTISTIC_DIRECTION_DEFS[dir],
      `ARTISTIC_DIRECTION_DEFS missing '${dir}'`,
    );
  }
});
check("every direction's self-keyed id matches its own literal (no aliasing)", () => {
  for (const dir of EXPECTED_DIRECTIONS) {
    const def: ArtisticDirectionDef | undefined = ARTISTIC_DIRECTION_DEFS[dir];
    if (def) assert.equal(def.id, dir, `ARTISTIC_DIRECTION_DEFS['${dir}'].id should equal '${dir}'`);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — `devTimeMultiplier > 0` for every direction.
//
// `applyDevelopmentTime` (sim/domain/scoring.ts) multiples base dev time
// by this factor. A 0 freezes dev time; a negative produces implausible
// behaviour. This contract holds across the studio's calibration.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: devTimeMultiplier > 0 for every direction");
for (const dir of EXPECTED_DIRECTIONS) {
  check(`${dir}: devTimeMultiplier > 0`, () => {
    const def = ARTISTIC_DIRECTION_DEFS[dir];
    assert.ok(def !== undefined, `missing def for '${dir}'`);
    assert.ok(
      def!.devTimeMultiplier > 0,
      `${dir}.devTimeMultiplier=${def!.devTimeMultiplier} should be > 0`,
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — `scoreMultipliers` carries EXACTLY the 7-category union.
//
// Catches both directions-from-the-future drift (adding a category
// without updating `applyArtisticDirection`) AND retrogressive drift
// (renaming or removing a category would break the weightedScore
// denominator). Both length and key set are pinned so a future
// contributor sees the EXACT diff in the failure message.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: scoreMultipliers length === 7 + key union matches EXPECTED_CATEGORY_KEYS");
for (const dir of EXPECTED_DIRECTIONS) {
  check(`${dir}: scoreMultipliers has exactly 7 keys (length contract)`, () => {
    const def = ARTISTIC_DIRECTION_DEFS[dir];
    assert.ok(def !== undefined, `missing def for '${dir}'`);
    const actualKeys = Object.keys(def!.scoreMultipliers);
    assert.equal(
      actualKeys.length,
      EXPECTED_CATEGORY_KEYS.length,
      `${dir}.scoreMultipliers has ${actualKeys.length} keys, expected ${EXPECTED_CATEGORY_KEYS.length}`,
    );
  });
  check(`${dir}: scoreMultipliers keys are exactly the 7-category union`, () => {
    const def = ARTISTIC_DIRECTION_DEFS[dir];
    assert.ok(def !== undefined, `missing def for '${dir}'`);
    // Set-based diff avoids the Array.includes(k) type narrowing issue
    // when `k` is the narrowed literal union.
    const actualKeys = new Set(Object.keys(def!.scoreMultipliers));
    const expectedSet = new Set<string>(EXPECTED_CATEGORY_KEYS);
    const missing: string[] = [];
    const extra: string[] = [];
    for (const k of expectedSet) if (!actualKeys.has(k)) missing.push(k);
    for (const k of actualKeys) if (!expectedSet.has(k)) extra.push(k);
    assert.deepEqual(
      missing,
      [],
      `${dir}.scoreMultipliers keys drift from union: missing ${missing.join(",") || "∅"}, extra ${extra.join(",") || "∅"}`,
    );
    assert.deepEqual(
      extra,
      [],
      `${dir}.scoreMultipliers keys drift from union (extra side): ${missing.join(",") || "∅"} / extras ${extra.join(",") || "∅"}`,
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — caps + synergy tag bonuses are well-formed.
//
// Adjacent contract: every direction has a finite cap (0..30 per the
// type documentation); every `synergyTagBonuses` entry has a non-empty
// string tag and a numeric bonus. Loose bounds left loose so a future
// balance tweak doesn't trip these — the contract is structural, not
// numeric.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: caps and synergy-tag bonuses are structurally sound");
for (const dir of EXPECTED_DIRECTIONS) {
  check(`${dir}: cap ∈ [0, 30] (matches the type-documented ceiling)`, () => {
    const def = ARTISTIC_DIRECTION_DEFS[dir];
    assert.ok(def !== undefined, `missing def for '${dir}'`);
    assert.ok(
      def!.cap >= 0 && def!.cap <= 30,
      `${dir}.cap=${def!.cap} should be in [0, 30]`,
    );
  });
  check(`${dir}: every synergyTagBonuses entry has a non-empty tag and a numeric bonus`, () => {
    const def = ARTISTIC_DIRECTION_DEFS[dir];
    assert.ok(def !== undefined, `missing def for '${dir}'`);
    assert.ok(
      Array.isArray(def!.synergyTagBonuses),
      `${dir}.synergyTagBonuses should be an array`,
    );
    for (const entry of def!.synergyTagBonuses) {
      assert.ok(
        typeof entry.tag === "string" && entry.tag.length > 0,
        `${dir}: synergyTagBonuses entry has empty/missing tag: ${JSON.stringify(entry)}`,
      );
      assert.ok(
        typeof entry.bonus === "number" && Number.isFinite(entry.bonus),
        `${dir}: synergyTagBonuses entry has non-numeric bonus: ${JSON.stringify(entry)}`,
      );
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "artisticDirections smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
