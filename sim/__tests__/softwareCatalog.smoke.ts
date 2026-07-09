/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/softwareCatalog.ts`.
 *
 * Pins the invariants a contributor adding/removing/renaming a software
 * offering would silently break:
 *   - every entry has a unique id
 *   - every `type` is in the closed seed-set
 *   - every `purchasePrice` is a positive integer
 *   - every `releaseYear` ∈ [1985, 2005] (full simulation window)
 *   - every `effectUnlocks[]` entry resolves against `DEMO_EFFECTS` ids
 *     (catches string-typed ids slipped in via `as string` casts —
 *      e.g. "procedural_textures" was never a DemoEffect id in the seed)
 *   - no duplicate effect unlocks within a single software entry
 *   - reads are idempotent across calls
 *
 * Mirrors the sponsorship/hardware catalog smokes.
 */

import { strict as assert } from "node:assert";
import { SOFTWARE_CATALOG } from "@sim/data/softwareCatalog";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";

const CATALOG = SOFTWARE_CATALOG;
const EFFECT_IDS: ReadonlySet<string> = new Set(DEMO_EFFECTS.map((e) => e.id));
const VALID_TYPES: ReadonlySet<string> = new Set([
  "assembler",
  "tracker",
  "image_editor",
  "compressor",
  "ide",
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

// SCENARIO 0 — Scaffolding sanity gate
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("softwareCatalog: catalogue is non-empty", () => {
  assert.ok(CATALOG.length > 0, "expected at least one software offering");
});

check("softwareCatalog: every entry has non-empty string id, name, description", () => {
  for (const s of CATALOG) {
    assert.ok(
      typeof s.id === "string" && s.id.length > 0,
      `bad id: ${JSON.stringify(s.id)}`,
    );
    assert.ok(
      typeof s.name === "string" && s.name.length > 0,
      `bad name on ${s.id}`,
    );
    assert.ok(
      typeof s.description === "string" && s.description.length > 0,
      `bad description on ${s.id}`,
    );
  }
});

check("softwareCatalog: every id is unique", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const s of CATALOG) {
    if (seen.has(s.id)) dups.push(s.id);
    seen.add(s.id);
  }
  assert.equal(dups.length, 0, `duplicate ids: ${dups.join(", ")}`);
});

// SCENARIO 1 — Type + price + releaseYear shape
console.log("\n=== SCENARIO 1 — Type + price + releaseYear shape ===");

check("softwareCatalog: every type ∈ closed seed-set", () => {
  const bad: string[] = [];
  for (const s of CATALOG) {
    if (!VALID_TYPES.has(s.type)) bad.push(`${s.id}: ${s.type}`);
  }
  assert.equal(bad.length, 0, `unknown types: ${bad.join(", ")}`);
});

check("softwareCatalog: every purchasePrice is a positive integer", () => {
  const bad: string[] = [];
  for (const s of CATALOG) {
    if (!Number.isInteger(s.purchasePrice) || s.purchasePrice <= 0) {
      bad.push(`${s.id}: ${s.purchasePrice}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("softwareCatalog: every releaseYear ∈ [1985, 2005]", () => {
  const bad: string[] = [];
  for (const s of CATALOG) {
    if (
      !Number.isInteger(s.releaseYear) ||
      s.releaseYear < 1985 ||
      s.releaseYear > 2005
    ) {
      bad.push(`${s.id}: ${s.releaseYear}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 2 — effectUnlocks cross-reference
//
// HEADLINE CATCH: a future "as string" cast on a typo'd id (e.g.
// `"procedural_textures" as string`) flows through TS compilation and
// silently breaks the projection. This check throws that out.
//
// ⚠️  LOAD-BEARING CARVE-OUT  ⚠️
//
// `sw_photoshop_5.effectUnlocks[0]` deliberately contains the literal
// string `"procedural_textures"` — the TECHNODE id, NOT an effect id.
// This fixture is owned by `sim/__tests__/effectUnlocks.smoke.ts`
// Scenario 5, which uses it to verify that `getUnlockedEffectIds`'s
// sanitize step drops stale references before they leak into the
// studio's "unlocked effects" projection. Removing the string ref from
// SOFTWARE_CATALOG flips that smoke test's SHA256-12 stale-ref
// fingerprint anchor (`EXPECTED_STALE_FINGERPRINT = "6a9bf1824d58"`)
// and breaks its deliberate-fixture secondary assertion.
//
// The carve-out below skips exactly one `(source, ref)` pair:
// `sw_photoshop_5 -> procedural_textures`. Every OTHER entry in every
// OTHER software offering must still resolve against DEMO_EFFECTS —
// the typo-catcher headline mission of this scenario stays intact.
// If you extend SOFTWARE_CATALOG, every new `effectUnlocks` entry must
// either (a) be a real DemoEffect id, or (b) be added to a deliberately
// load-bearing fixture and pinned in effectUnlocks.smoke.ts.
console.log("\n=== SCENARIO 2 — effectUnlocks resolves against DEMO_EFFECTS ===");

check("softwareCatalog: every effectUnlocks[] entry resolves against DEMO_EFFECTS", () => {
  const bad: string[] = [];
  for (const s of CATALOG) {
    for (const eid of s.effectUnlocks ?? []) {
      // Deliberate carve-out: the effectUnlocks.smoke.ts Scenario 5
      // load-bearing stale fixture. See the ⚠️  LOAD-BEARING CARVE-OUT
      // block above before editing this.
      if (s.id === "sw_photoshop_5" && eid === "procedural_textures") continue;
      if (!EFFECT_IDS.has(eid)) bad.push(`${s.id} -> ${eid}`);
    }
  }
  assert.equal(bad.length, 0, `dangling effect unlocks: ${bad.join(", ")}`);
});

check("softwareCatalog: no duplicate effect unlocks within a single software entry", () => {
  const bad: string[] = [];
  for (const s of CATALOG) {
    const seen = new Set<string>();
    for (const eid of s.effectUnlocks ?? []) {
      if (seen.has(eid)) bad.push(`${s.id} duplicate -> ${eid}`);
      seen.add(eid);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 3 — Idempotence
console.log("\n=== SCENARIO 3 — Idempotence ===");

check("softwareCatalog: two reads return same length", () => {
  assert.equal(
    CATALOG.length,
    SOFTWARE_CATALOG.length,
    "catalogue length changed between reads",
  );
});

check("softwareCatalog: id ordering is stable across reads", () => {
  const a = CATALOG.map((s) => s.id);
  const b = SOFTWARE_CATALOG.map((s) => s.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — softwareCatalog smoke all green.");
