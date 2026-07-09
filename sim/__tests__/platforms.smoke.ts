/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/platforms.ts`.
 *
 * Pins the invariants every rig-picker UI + filter projection reads:
 *   - the Record `HISTORICAL_PLATFORMS` keys COVER the `PlatformId` enum
 *     (every enum value has a config entry) and have no extras
 *   - every entry's inner `id` matches its record key
 *   - `name`, `audioTech`, `graphicsTech`, `description` are non-empty
 *   - `year` ∈ [1982, 2005]
 *   - `cost`, `cpuLimit`, `ramLimitKb`, `audioChannels` are positive
 *     integers
 *   - `graphicsMaxColors` is a power-of-2 (16, 256, 64K, 16.7M all valid;
 *     the documented HAM exemptions are bookkeeping-base values, so
 *     the 32/4096 split lives in the `description` field, not `graphicsMaxColors`)
 *   - reads are idempotent
 *
 * Note: we don't pin year-monotonicity across the catalogue. The Record
 * is insertion-ordered by family (C64 → ZX → Amiga → ST → Amiga 1200 → PC
 * chain) rather than strictly chronological — re-ordering the seed to
 * fix a "fail" would force a costly cross-module diff without gameplay
 * benefit. Year-range only.
 */

import { strict as assert } from "node:assert";
import { HISTORICAL_PLATFORMS } from "@sim/data/platforms";
import { PlatformId } from "@packages/types";

/** True iff `n` is a positive integer that is a power of 2. */
function isPowerOf2(n: number): boolean {
  return Number.isInteger(n) && n > 0 && (n & (n - 1)) === 0;
}

const RECORDED_KEYS: ReadonlySet<string> = new Set(
  Object.keys(HISTORICAL_PLATFORMS),
);
const ENUM_VALUES: ReadonlySet<string> = new Set(Object.values(PlatformId));

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

// SCENARIO 0 — Record-key coverage of the PlatformId enum
//
// The catalogue is keyed by PlatformId; a missing key would throw at
// every downstream `HISTORICAL_PLATFORMS[id]` lookup. An extra key
// would silently orphan a snapshot.
console.log("\n=== SCENARIO 0 — Record-key coverage ===");

check("platforms: HISTORICAL_PLATFORMS covers every PlatformId enum value", () => {
  const missing: string[] = [];
  for (const v of ENUM_VALUES) {
    if (!RECORDED_KEYS.has(v)) missing.push(v);
  }
  assert.equal(missing.length, 0, `missing platforms: ${missing.join(", ")}`);
});

check("platforms: no extra keys outside the PlatformId enum", () => {
  const extra: string[] = [];
  for (const k of RECORDED_KEYS) {
    if (!ENUM_VALUES.has(k)) extra.push(k);
  }
  assert.equal(extra.length, 0, `extra keys: ${extra.join(", ")}`);
});

check("platforms: every entry has non-empty string name, audioTech, graphicsTech, description", () => {
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    assert.ok(typeof p.name === "string" && p.name.length > 0, `bad name on ${key}`);
    assert.ok(typeof p.audioTech === "string" && p.audioTech.length > 0, `bad audioTech on ${key}`);
    assert.ok(typeof p.graphicsTech === "string" && p.graphicsTech.length > 0, `bad graphicsTech on ${key}`);
    assert.ok(typeof p.description === "string" && p.description.length > 0, `bad description on ${key}`);
  }
});

check("platforms: every record key matches the inner `id` (key/id guard)", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (key !== p.id) bad.push(`slot ${key} has inner id ${p.id}`);
  }
  assert.equal(bad.length, 0, `key/id mismatches: ${bad.join(", ")}`);
});

// SCENARIO 1 — Numeric ranges
console.log("\n=== SCENARIO 1 — Numeric ranges ===");

check("platforms: every year ∈ [1982, 2005]", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (!Number.isInteger(p.year) || p.year < 1982 || p.year > 2005) bad.push(`${key}: ${p.year}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("platforms: cost is a positive integer", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (!Number.isInteger(p.cost) || p.cost <= 0) bad.push(`${key}: ${p.cost}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("platforms: cpuLimit, ramLimitKb, audioChannels are positive integers", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (!Number.isInteger(p.cpuLimit) || p.cpuLimit <= 0) bad.push(`${key}.cpuLimit=${p.cpuLimit}`);
    if (!Number.isInteger(p.ramLimitKb) || p.ramLimitKb <= 0) bad.push(`${key}.ramLimitKb=${p.ramLimitKb}`);
    if (!Number.isInteger(p.audioChannels) || p.audioChannels <= 0) bad.push(`${key}.audioChannels=${p.audioChannels}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("platforms: graphicsMaxColors is a positive power of 2", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (!isPowerOf2(p.graphicsMaxColors)) bad.push(`${key}: ${p.graphicsMaxColors}`);
  }
  assert.equal(bad.length, 0, `non-power-of-2 graphicsMaxColors: ${bad.join(", ")}`);
});

// SCENARIO 2 — Idempotence
console.log("\n=== SCENARIO 2 — Idempotence ===");

check("platforms: two reads return same key set in same order", () => {
  const a = Object.keys(HISTORICAL_PLATFORMS);
  const b = Object.keys(HISTORICAL_PLATFORMS);
  assert.deepEqual(a, b, "key order drifted between reads — catalogue is no longer stable");
});

check("platforms: every inner id is stable across reads", () => {
  const a = Object.values(HISTORICAL_PLATFORMS).map((p) => p.id);
  const b = Object.values(HISTORICAL_PLATFORMS).map((p) => p.id);
  assert.deepEqual(a, b, "inner id order drifted between reads");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — platforms smoke all green.");
