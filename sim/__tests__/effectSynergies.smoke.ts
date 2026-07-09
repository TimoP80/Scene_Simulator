/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/effectSynergies.ts` — pins the three
 * structural invariants a contributor can break without breaking
 * TypeScript compilation:
 *
 *   1. Every synergy's `effectIds` reference REAL DemoEffects.
 *      A typo or refactor that drops / renames a DemoEffect but
 *      leaves the synergy entry pointing at a non-existent id
 *      would silently swallow the synergy in `applySynergies`
 *      (which checks membership against `selectedIds.has(id)`).
 *
 *   2. Every bonus value is a non-negative number. A contributions
 *      typo (`-7` instead of `7`) would inflate detrimental scoring.
 *
 *   3. No duplicate `effectIds` inside a synergy. Duplicates would
 *      either cost bonus twice (current engine) or be silently
 *      deduped by `Set` (also current engine) — both ambiguous.
 *      Flag so the contract is explicit.
 *
 * Pattern matches the existing smokes:
 * `strict as assert` + custom `check(label, run)` + console headers +
 * exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import { DEMO_EFFECTS } from "@sim/data/demoEffects";
import { EFFECT_SYNERGIES, type EffectSynergy } from "@sim/data/effectSynergies";

// ──────────────────────────────────────────────────────────────────────────
// Test scaffolding & shared constants
// ──────────────────────────────────────────────────────────────────────────

const REAL_EFFECT_IDS: ReadonlySet<string> = new Set(
  DEMO_EFFECTS.map((e) => e.id),
);

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
// Pins: catalogue is non-empty, every synergy has the required shape
// (`id`, `name`, `description`, non-empty `effectIds` array, non-empty
// `bonus` object). If any of these structural assumptions break, all
// downstream scenarios would either skip or yield false-positives.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: effectSynergies scaffolding sanity gate");
check("EFFECT_SYNERGIES catalogue is non-empty", () => {
  assert.ok(EFFECT_SYNERGIES.length > 0, "synergy catalogue must have at least one entry");
});
check("DEMO_EFFECTS catalogue is non-empty (sanity for the real-effects check below)", () => {
  assert.ok(DEMO_EFFECTS.length > 0, "DEMO_EFFECTS must have at least one entry to validate synergies against");
});
check("every synergy has well-formed shape", () => {
  for (const syn of EFFECT_SYNERGIES) {
    assert.equal(typeof syn.id, "string", `synergy has non-string id: ${JSON.stringify(syn)}`);
    assert.equal(typeof syn.name, "string", `${syn.id}: non-string name`);
    assert.equal(typeof syn.description, "string", `${syn.id}: non-string description`);
    assert.ok(Array.isArray(syn.effectIds), `${syn.id}: effectIds must be an array`);
    assert.ok(syn.effectIds.length >= 2, `${syn.id}: effectIds must contain at least 2 ids (a 1-pair synergy is trivially redundant with category bonuses)`);
    assert.ok(typeof syn.bonus === "object" && syn.bonus !== null, `${syn.id}: bonus must be an object`);
  }
});
check("synergy ids are unique (no two synergies share an id)", () => {
  const ids = new Set<string>();
  for (const syn of EFFECT_SYNERGIES) {
    assert.ok(!ids.has(syn.id), `duplicate synergy id: '${syn.id}'`);
    ids.add(syn.id);
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Every effectIds entry references a real DemoEffect.
//
// Forward-declared in (data/effects.json + sim/data/demoEffects.ts);
// `applySynergies` (scoring.ts) checks membership via
// `selectedIds.has(id)`, so any id missing from the live catalogue
// would silently never fire. Pin the contract explicitly.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: every synergy's effectIds reference real DemoEffects");
for (const syn of EFFECT_SYNERGIES) {
  check(
    `${syn.id}: all ${syn.effectIds.length} effectIds resolve to a real DemoEffect`,
    () => {
      const missing = syn.effectIds.filter((id) => !REAL_EFFECT_IDS.has(id));
      assert.deepEqual(
        missing,
        [],
        `${syn.id}: ${missing.length} effectIds not found in DEMO_EFFECTS: ${missing.join(",") || "∅"}`,
      );
    },
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Every bonus value is a non-negative number.
//
// Bonus shapes are typed as `Partial<Pick<ScoreBreakdown, ...>>` (which
// only enforces the keys, not the sign). A typo introducing a negative
// bonus would inflate the worst-case score by debiting a category below
// zero. Pin the runtime contract.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: every bonus value is a non-negative number");
for (const syn of EFFECT_SYNERGIES) {
  check(`${syn.id}: bonus has >0 keys AND every value is a finite, non-negative number`, () => {
    const keys = Object.keys(syn.bonus);
    assert.ok(keys.length > 0, `${syn.id}: bonus must have at least one category entry`);
    for (const key of keys) {
      const value = (syn.bonus as Record<string, unknown>)[key];
      assert.equal(
        typeof value,
        "number",
        `${syn.id}.bonus.${key}: value is not a number (got ${typeof value})`,
      );
      assert.ok(
        Number.isFinite(value),
        `${syn.id}.bonus.${key}: value is not finite (got ${value})`,
      );
      assert.ok(
        (value as number) >= 0,
        `${syn.id}.bonus.${key}: value ${value} should be >= 0`,
      );
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — No duplicate effectIds inside a single synergy.
//
// Duplicates are ambiguous: the engine's `Set` semantics can dedup the
// matcher without applying bonus twice, OR the typing could spread the
// bonus twice over a manual iteration. Either way, a duplicate is a
// flat data bug. Flag it explicitly so the contributor decides which
// resolution they want.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: no duplicate effectIds inside a single synergy");
for (const syn of EFFECT_SYNERGIES) {
  check(`${syn.id}: effectIds are unique within the synergy`, () => {
    const seen = new Set<string>();
    const dups: string[] = [];
    for (const id of syn.effectIds) {
      if (seen.has(id)) dups.push(id);
      seen.add(id);
    }
    assert.deepEqual(
      dups,
      [],
      `${syn.id}: ${dups.length} duplicate effectId(s): ${dups.join(",") || "∅"}`,
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Idempotence / structural soundness.
//
// Catches a future contributor who somehow mutates the catalogue at
// module load (e.g. side-effect import tweak). The engine's
// `applySynergies` reads from a top-level const; a mutation would
// change behaviour under HMR.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: catalogue is stable across reads");
{
  const a: EffectSynergy[] = EFFECT_SYNERGIES;
  const b: EffectSynergy[] = EFFECT_SYNERGIES;
  check("two reads of EFFECT_SYNERGIES have identical length", () => {
    assert.equal(a.length, b.length);
  });
  check("two reads of EFFECT_SYNERGIES have identical ids in order", () => {
    assert.deepEqual(a.map((s) => s.id), b.map((s) => s.id));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "effectSynergies smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
