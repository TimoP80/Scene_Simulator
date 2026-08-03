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
 *   - `year` ∈ [SIM_WINDOW_MIN, SIM_WINDOW_MAX] (derived from
 *     `ERA_BOUNDARIES` in `sim/data/eraConfig.ts`; the catalogue spans
 *     the C64 → modern PC era)
 *   - `cost`, `cpuLimit`, `ramLimitKb`, `audioChannels` are positive
 *     integers
 *   - `graphicsMaxColors` is a power-of-2 (16, 256, 64K, 16.7M all valid;
 *     the documented HAM exemptions are bookkeeping-base values, so
 *     the 32/4096 split lives in the `description` field, not `graphicsMaxColors`)
 *   - reads are idempotent
 *   - SCENARIO 2 pins year-gated AVAILABILITY via `platformsAvailableAtYear`:
 *     a platform is purchasable only from its own release year (Amiga 1200
 *     is locked in 1986, open from 1992), every platform is available at
 *     its own year, and the shop window is monotonic (a rig can appear,
 *     never disappear). The WorkspaceTab rig shop renders exactly this set.
 *
 * Note: we don't pin year-MONOTONICITY of the catalogue ORDER. The Record
 * is insertion-ordered by family (C64 → ZX → Amiga → ST → Amiga 1200 → PC
 * chain) rather than strictly chronological — re-ordering the seed to
 * fix a "fail" would force a costly cross-module diff without gameplay
 * benefit. Availability monotonicity (SCENARIO 2) is a different property
 * and IS pinned.
 */

import { strict as assert } from "node:assert";
import { SIM_WINDOW_MAX, SIM_WINDOW_MIN } from "@sim/data/eraConfig";
import { HISTORICAL_PLATFORMS, platformsAvailableAtYear } from "@sim/data/platforms";
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

check(`platforms: every year ∈ [${SIM_WINDOW_MIN}, ${SIM_WINDOW_MAX}]`, () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    if (!Number.isInteger(p.year) || p.year < SIM_WINDOW_MIN || p.year > SIM_WINDOW_MAX) bad.push(`${key}: ${p.year}`);
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

// SCENARIO 2 — Year-gated availability (the rig-shop window)
//
// The WorkspaceTab rig shop gates the BUY button on
// `config.year <= currentYear` via `platformsAvailableAtYear` — a
// future-dated platform (e.g. the Amiga 1200, released 1992) must NOT
// be purchasable in 1986, while a contemporaneous one (Amiga 500,
// 1987) must be. Pins the deterministic filter the shop renders from.
console.log("\n=== SCENARIO 2 — Year-gated availability ===");

check("platforms: Amiga 1200 (year 1992) is NOT available in 1986", () => {
  const available = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1986);
  assert.ok(
    !available.includes(PlatformId.AMIGA_1200),
    `AMIGA_1200 leaked into the 1986 shop window: ${available.join(", ")}`,
  );
});

check("platforms: Amiga 500 (year 1987) is NOT available in 1986 — release boundary held", () => {
  const available = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1986);
  assert.ok(
    !available.includes(PlatformId.AMIGA_500),
    `AMIGA_500 (released 1987) leaked into the 1986 shop window: ${available.join(", ")}`,
  );
});

check("platforms: Amiga 500 (year 1987) IS available from its release year 1987 onward", () => {
  const available1987 = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1987);
  assert.ok(
    available1987.includes(PlatformId.AMIGA_500),
    `AMIGA_500 missing from the 1987 shop window: ${available1987.join(", ")}`,
  );
});

check("platforms: Amiga 1200 IS available from its release year 1992 onward", () => {
  const available1992 = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1992);
  assert.ok(
    available1992.includes(PlatformId.AMIGA_1200),
    `AMIGA_1200 missing from the 1992 shop window: ${available1992.join(", ")}`,
  );
});

check("platforms: every platform is available at its own release year", () => {
  const bad: string[] = [];
  for (const [key, p] of Object.entries(HISTORICAL_PLATFORMS)) {
    const available = platformsAvailableAtYear(HISTORICAL_PLATFORMS, p.year);
    if (!available.includes(p.id)) bad.push(`${key} (year ${p.year})`);
  }
  assert.equal(bad.length, 0, `platforms not in their own release-year window: ${bad.join("; ")}`);
});

check("platforms: availability is monotonic — once released, never un-released", () => {
  // Walk every year in the sim window: each year's shop window must be a
  // superset of the previous year's (a rig can appear, never disappear).
  let prev = platformsAvailableAtYear(HISTORICAL_PLATFORMS, SIM_WINDOW_MIN);
  for (let y = SIM_WINDOW_MIN + 1; y <= SIM_WINDOW_MAX; y++) {
    const curr = platformsAvailableAtYear(HISTORICAL_PLATFORMS, y);
    for (const id of prev) {
      assert.ok(
        curr.includes(id),
        `${id} (released ${HISTORICAL_PLATFORMS[id].year}) vanished from the shop window at year ${y}`,
      );
    }
    prev = curr;
  }
});

// SCENARIO 3 — Idempotence
console.log("\n=== SCENARIO 3 — Idempotence ===");

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

check("platforms: platformsAvailableAtYear is deterministic across reads", () => {
  const a = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1992);
  const b = platformsAvailableAtYear(HISTORICAL_PLATFORMS, 1992);
  assert.deepEqual(a, b, "availability drifted between reads");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — platforms smoke all green.");
