/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/demoEffects.ts`.
 *
 * Pins the invariants the expanded scoring engine relies on:
 *   - every effect has a unique id
 *   - every `era` ∈ EraId enum; `minPlatform` ∈ PlatformId enum
 *   - every `category` ∈ closed union (vector | raster | procedural |
 *     rendering | pixel_trick)
 *   - `compatiblePlatforms[]` is non-empty, all entries ∈ PlatformId
 *     enum, no duplicates, AND contains the `minPlatform` (else the
 *     "is this effect selectable on its minimum rig" gate is broken)
 *   - every `synergyTags[]` is non-empty
 *   - `cpuCost`, `ramCostKb` ≥ 0 integers
 *   - difficulty/originality/audienceAppeal/complexity/visualImpact
 *     in [0, 100]
 *   - `researchRequired` is a boolean
 *   - reads are idempotent across calls
 *
 * Why this also catches soft bugs: `minPlatform ∈ compatiblePlatforms`
 * is the kind of invariant that's easy to miss in code review but
 * breaks the filter pipeline silently. The check makes it loud.
 */

import { strict as assert } from "node:assert";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";
import { EraId, PlatformId } from "@packages/types";

const EFFECTS = DEMO_EFFECTS;
const VALID_ERAS: ReadonlySet<string> = new Set(Object.values(EraId));
const VALID_PLATFORMS: ReadonlySet<string> = new Set(Object.values(PlatformId));
const VALID_CATEGORIES: ReadonlySet<string> = new Set([
  "vector",
  "raster",
  "procedural",
  "rendering",
  "pixel_trick",
]);

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

// SCENARIO 0 — Scaffolding sanity
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("demoEffects: catalogue is non-empty", () => {
  assert.ok(EFFECTS.length > 0, "expected at least one effect");
});

check("demoEffects: every entry has non-empty string id, name, description", () => {
  for (const e of EFFECTS) {
    assert.ok(typeof e.id === "string" && e.id.length > 0, `bad id: ${JSON.stringify(e.id)}`);
    assert.ok(typeof e.name === "string" && e.name.length > 0, `bad name on ${e.id}`);
    assert.ok(typeof e.description === "string" && e.description.length > 0, `bad description on ${e.id}`);
  }
});

check("demoEffects: every id is unique", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const e of EFFECTS) {
    if (seen.has(e.id)) dups.push(e.id);
    seen.add(e.id);
  }
  assert.equal(dups.length, 0, `duplicate ids: ${dups.join(", ")}`);
});

// SCENARIO 1 — Enum-anchored fields
console.log("\n=== SCENARIO 1 — Enum-anchored fields ===");

check("demoEffects: every era ∈ EraId enum", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    if (!VALID_ERAS.has(e.era)) bad.push(`${e.id}: ${e.era}`);
  }
  assert.equal(bad.length, 0, `unknown eras: ${bad.join(", ")}`);
});

check("demoEffects: every minPlatform ∈ PlatformId enum", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    if (!VALID_PLATFORMS.has(e.minPlatform)) bad.push(`${e.id}: ${e.minPlatform}`);
  }
  assert.equal(bad.length, 0, `unknown minPlatform: ${bad.join(", ")}`);
});

check("demoEffects: every category ∈ closed union", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    if (!VALID_CATEGORIES.has(e.category)) bad.push(`${e.id}: ${e.category}`);
  }
  assert.equal(bad.length, 0, `unknown categories: ${bad.join(", ")}`);
});

// SCENARIO 2 — compatiblePlatforms + synergyTags
//
// `compatiblePlatforms` is the effect filter that decides whether the
// player's rig can run the effect; pinning that minPlatform is in the
// list blocks the classic "I forgot to add PC_PENTIUM to the list" bug.
console.log("\n=== SCENARIO 2 — compatiblePlatforms + synergyTags ===");

check("demoEffects: every compatiblePlatforms[] is non-empty + resolves against enum", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    const list = e.compatiblePlatforms;
    if (!Array.isArray(list) || list.length === 0) {
      bad.push(`${e.id}: empty`);
      continue;
    }
    for (const p of list) {
      if (!VALID_PLATFORMS.has(p)) bad.push(`${e.id} -> ${p}`);
    }
  }
  assert.equal(bad.length, 0, `bad compatiblePlatforms: ${bad.join(", ")}`);
});

check("demoEffects: no duplicate platforms inside compatiblePlatforms[]", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    const seen = new Set<string>();
    for (const p of e.compatiblePlatforms ?? []) {
      if (seen.has(p as string)) bad.push(`${e.id} duplicate -> ${p}`);
      seen.add(p as string);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("demoEffects: minPlatform ∈ compatiblePlatforms (else the gate is unreachable)", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    const list = e.compatiblePlatforms ?? [];
    if (!list.includes(e.minPlatform)) {
      bad.push(`${e.id}: minPlatform ${e.minPlatform} missing from compatiblePlatforms`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("demoEffects: every synergyTags[] is non-empty AND every tag is a non-empty string", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    const tags = e.synergyTags;
    if (!Array.isArray(tags) || tags.length === 0) {
      bad.push(`${e.id}: empty`);
      continue;
    }
    for (const t of tags) {
      if (typeof t !== "string" || t.length === 0) bad.push(`${e.id} tag=${JSON.stringify(t)}`);
    }
  }
  assert.equal(bad.length, 0, `bad synergyTags: ${bad.join(", ")}`);
});

// SCENARIO 3 — Numeric ranges
console.log("\n=== SCENARIO 3 — Numeric ranges ===");

check("demoEffects: cpuCost + ramCostKb are positive integers (seed min is 1)", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    if (!Number.isInteger(e.cpuCost) || e.cpuCost <= 0) bad.push(`${e.id}.cpuCost=${e.cpuCost}`);
    if (!Number.isInteger(e.ramCostKb) || e.ramCostKb <= 0) bad.push(`${e.id}.ramCostKb=${e.ramCostKb}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("demoEffects: difficulty, originality, audienceAppeal, complexity, visualImpact ∈ [0, 100]", () => {
  const SCORE_KEYS = [
    "difficulty",
    "originality",
    "audienceAppeal",
    "complexity",
    "visualImpact",
  ] as const;
  const bad: string[] = [];
  for (const e of EFFECTS) {
    for (const k of SCORE_KEYS) {
      const v = e[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
        bad.push(`${e.id}.${k}=${v}`);
      }
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("demoEffects: researchRequired is boolean", () => {
  const bad: string[] = [];
  for (const e of EFFECTS) {
    if (typeof e.researchRequired !== "boolean") bad.push(`${e.id}: ${typeof e.researchRequired}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 4 — Idempotence
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("demoEffects: two reads return same length", () => {
  assert.equal(EFFECTS.length, DEMO_EFFECTS.length, "catalogue length changed between reads");
});

check("demoEffects: id ordering is stable across reads", () => {
  const a = EFFECTS.map((e) => e.id);
  const b = DEMO_EFFECTS.map((e) => e.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — demoEffects smoke all green.");
