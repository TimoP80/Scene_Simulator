/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/rivalReleases.ts`.
 *
 * Pins the invariants the contest UI + reject-list pickers read every
 * tick:
 *   - every RivalRelease has a unique id
 *   - every `platform` ∈ PlatformId enum
 *   - every `platformFocus` ∈ { "all" | "amiga" | "c64" | "pc" }
 *   - `year` ∈ [1985, 2005] ; `month` ∈ [1, 12]
 *   - `baselineScore` and `scoreVariance` are finite non-negative numbers
 *   - `disbandedAfter` (when present) is an integer ≥ `year`
 *   - every text field is a non-empty string
 *   - reads are idempotent
 *
 * Note: we do NOT pin id-key monotonic ordering — the seed is grouped
 * chronologically-ish but the contest filter is "what's left at current
 * month", not by id order.
 */

import { strict as assert } from "node:assert";
import { RIVAL_RELEASES } from "@sim/data/rivalReleases";
import { PlatformId } from "@packages/types";

const RIVALS = RIVAL_RELEASES;
const VALID_PLATFORMS: ReadonlySet<string> = new Set(Object.values(PlatformId));
// NOTE: mirror the RivalPlatformFocus literal union in
// sim/domain/party.ts. If a new focus value lands in the union,
// add it here too — the smoke will silently past it otherwise.
const VALID_RIVAL_FOCUS: ReadonlySet<string> = new Set([
  "all",
  "amiga",
  "c64",
  "pc",
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

check("rivalReleases: catalogue is non-empty", () => {
  assert.ok(RIVALS.length > 0, "expected at least one rival");
});

check("rivalReleases: every entry has non-empty string id, name, group, title, description", () => {
  for (const r of RIVALS) {
    assert.ok(typeof r.id === "string" && r.id.length > 0, `bad id: ${JSON.stringify(r.id)}`);
    assert.ok(typeof r.name === "string" && r.name.length > 0, `bad name on ${r.id}`);
    assert.ok(typeof r.group === "string" && r.group.length > 0, `bad group on ${r.id}`);
    assert.ok(typeof r.title === "string" && r.title.length > 0, `bad title on ${r.id}`);
    assert.ok(
      typeof r.description === "string" && r.description.length > 0,
      `bad description on ${r.id}`,
    );
  }
});

check("rivalReleases: every id is unique", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const r of RIVALS) {
    if (seen.has(r.id)) dups.push(r.id);
    seen.add(r.id);
  }
  assert.equal(dups.length, 0, `duplicate ids: ${dups.join(", ")}`);
});

// SCENARIO 1 — Date + platform + platformFocus
console.log("\n=== SCENARIO 1 — Date + platform + focus ===");

check("rivalReleases: every platform ∈ PlatformId enum", () => {
  const bad: string[] = [];
  for (const r of RIVALS) {
    if (!VALID_PLATFORMS.has(r.platform)) bad.push(`${r.id}: ${r.platform}`);
  }
  assert.equal(bad.length, 0, `unknown platforms: ${bad.join(", ")}`);
});

check("rivalReleases: every platformFocus ∈ { all, amiga, c64, pc }", () => {
  const bad: string[] = [];
  for (const r of RIVALS) {
    if (!VALID_RIVAL_FOCUS.has(r.platformFocus)) bad.push(`${r.id}: ${r.platformFocus}`);
  }
  assert.equal(bad.length, 0, `unknown platformFocus: ${bad.join(", ")}`);
});

check("rivalReleases: every year ∈ [1985, 2005]", () => {
  const bad: string[] = [];
  for (const r of RIVALS) {
    if (!Number.isInteger(r.year) || r.year < 1985 || r.year > 2005) {
      bad.push(`${r.id}: ${r.year}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("rivalReleases: every month ∈ [1, 12]", () => {
  const bad: string[] = [];
  for (const r of RIVALS) {
    if (!Number.isInteger(r.month) || r.month < 1 || r.month > 12) {
      bad.push(`${r.id}: ${r.month}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 2 — Score ranges + disbandedAfter
console.log("\n=== SCENARIO 2 — Score + disbandedAfter ===");

check(
  "rivalReleases: baselineScore + scoreVariance are finite numbers in [0, 100] (downstream contest treats both as 0-anchored)",
  () => {
    const bad: string[] = [];
    for (const r of RIVALS) {
      if (
        typeof r.baselineScore !== "number" ||
        !Number.isFinite(r.baselineScore) ||
        r.baselineScore < 0 ||
        r.baselineScore > 100
      ) {
        bad.push(`${r.id}.baselineScore=${r.baselineScore}`);
      }
      if (
        typeof r.scoreVariance !== "number" ||
        !Number.isFinite(r.scoreVariance) ||
        r.scoreVariance < 0 ||
        r.scoreVariance > 100
      ) {
        bad.push(`${r.id}.scoreVariance=${r.scoreVariance}`);
      }
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check(
  "rivalReleases: disbandedAfter (when present) is an integer ≥ year (and ≤ 2005)",
  () => {
    const bad: string[] = [];
    for (const r of RIVALS) {
      if (r.disbandedAfter == null) continue;
      if (
        !Number.isInteger(r.disbandedAfter) ||
        r.disbandedAfter < r.year ||
        r.disbandedAfter > 2005
      ) {
        bad.push(`${r.id}.disbandedAfter=${r.disbandedAfter}`);
      }
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

// SCENARIO 3 — Idempotence
console.log("\n=== SCENARIO 3 — Idempotence ===");

check("rivalReleases: two reads return same length", () => {
  assert.equal(RIVALS.length, RIVAL_RELEASES.length, "catalogue length changed between reads");
});

check("rivalReleases: id ordering is stable across reads", () => {
  const a = RIVALS.map((r) => r.id);
  const b = RIVAL_RELEASES.map((r) => r.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — rivalReleases smoke all green.");
