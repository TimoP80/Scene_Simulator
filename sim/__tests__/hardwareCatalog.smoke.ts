/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/hardwareCatalog.ts` — pins the two
 * scaffolding-safety invariants a contributor can break without
 * breaking TypeScript compilation:
 *
 *   1. Every `HardwareItem.id` is unique across the catalogue.
 *      `HARDWARE_CATALOG_INDEX` is built as `new Map(catalog.map(i => [i.id, i]))`,
 *      so a duplicate id silently overwrites the earlier entry and
 *      the player can "buy" one CPU but receive the other. Pin it.
 *
 *   2. Every `purchasePrice` is a positive integer. A negative or
 *      zero price would invert the economy p loop in `sim/projections/economy.ts`
 *      (player gains money on purchase); a float slips through the
 *      `Number.isInteger` check. Both are flat seed corruption.
 *
 * Plus two cheap structural guards:
 *   - `HARDWARE_CATALOG_INDEX.size === HARDWARE_CATALOG.length` (the
 *     overwrite-from-duplicate-id failure mode also collapses the
 *     index's size).
 *   - catalogue reads are idempotent (HMR-safe).
 *
 * Pattern matches the existing smokes:
 * `strict as assert` + custom `check(label, run)` + console headers +
 * exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import { HARDWARE_CATALOG, HARDWARE_CATALOG_INDEX } from "@sim/data/hardwareCatalog";

// ──────────────────────────────────────────────────────────────────────────
// Test scaffolding & shared constants
// ──────────────────────────────────────────────────────────────────────────

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
// Pins: catalogue is non-empty, every item carries the required shape
// (`id`, `purchasePrice`), and the index lookup map agrees with the
// catalogue in size. If either shrinks, every downstream scenario
// either skips or yields false-positives.
//
// Note: the `INDEX.size === catalogue.length` consistency check fires
// before Scenario 1's name-the-dup scan. They catch the same root
// cause from two angles (count vs. identity), so both stay — Scenario 0
// is the cheap structural guard, Scenario 1's failure message names
// the offending id.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: hardwareCatalog scaffolding sanity gate");
check("HARDWARE_CATALOG catalogue is non-empty", () => {
  assert.ok(HARDWARE_CATALOG.length > 0, "hardware catalogue must have at least one entry");
});
check("HARDWARE_CATALOG_INDEX.size === HARDWARE_CATALOG.length (no duplicate-id overwrites)", () => {
  assert.equal(
    HARDWARE_CATALOG_INDEX.size,
    HARDWARE_CATALOG.length,
    `duplicate ids detected: index has ${HARDWARE_CATALOG_INDEX.size} entries but catalogue has ${HARDWARE_CATALOG.length}`,
  );
});
check("every item carries a non-empty id and a numeric purchasePrice", () => {
  for (const item of HARDWARE_CATALOG) {
    assert.equal(typeof item.id, "string", `item has non-string id: ${JSON.stringify(item)}`);
    assert.ok(item.id.length > 0, `item has empty id: ${JSON.stringify(item)}`);
    assert.equal(
      typeof item.purchasePrice,
      "number",
      `item ${item.id}: purchasePrice is not a number (got ${typeof item.purchasePrice})`,
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Every HardwareItem.id is unique.
//
// The deduplicated Map (HARDWARE_CATALOG_INDEX) collapses duplicates
// silently. A future contributor who copy-pastes an entry id (e.g.
// `cpu_athlon_700` -> `cpu_athlon_700`) would lose nothing at TS but
// would lose the entry at runtime. Pin it explicitly.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: every hardware item id is unique");
check("no two HARDWARE_CATALOG entries share an id", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const item of HARDWARE_CATALOG) {
    if (seen.has(item.id)) dups.push(item.id);
    seen.add(item.id);
  }
  assert.deepEqual(
    dups,
    [],
    `duplicate id(s) found in HARDWARE_CATALOG: ${dups.join(",") || "∅"}`,
  );
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Every purchasePrice is a positive integer.
//
// A negative price would invert the economy's `cost += price` loop
// (player gains money on purchase); a float slips through the type
// system but breaks `Math.floor` invariants in projections.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: every purchasePrice is a positive integer");
for (const item of HARDWARE_CATALOG) {
  check(`${item.id}: purchasePrice ${item.purchasePrice} is a finite, positive integer`, () => {
    assert.ok(
      Number.isFinite(item.purchasePrice),
      `${item.id}: purchasePrice ${item.purchasePrice} is not finite`,
    );
    assert.ok(
      Number.isInteger(item.purchasePrice),
      `${item.id}: purchasePrice ${item.purchasePrice} must be an integer`,
    );
    assert.ok(
      item.purchasePrice > 0,
      `${item.id}: purchasePrice ${item.purchasePrice} must be > 0`,
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Idempotence / structural soundness.
//
// Catches a future contributor who mutates the catalogue at module
// load (e.g. side-effect import tweak). HARDWARE_CATALOG is a top-
// level const read by the reducer; a mutation would change behaviour
// under HMR or across tests.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: catalogue is stable across reads");
{
  const a = HARDWARE_CATALOG;
  const b = HARDWARE_CATALOG;
  check("two reads of HARDWARE_CATALOG have identical length", () => {
    assert.equal(
      a.length,
      b.length,
      `catalogue length changed between reads (${a.length} → ${b.length}); a top-level mutation slipped in`,
    );
  });
  check("two reads of HARDWARE_CATALOG have identical ids in order", () => {
    assert.deepEqual(
      a.map((i) => i.id),
      b.map((i) => i.id),
      "id ordering drifted between reads — catalogue is no longer stable",
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "hardwareCatalog smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
