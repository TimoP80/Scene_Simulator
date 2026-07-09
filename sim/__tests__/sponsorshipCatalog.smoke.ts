/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/sponsorshipCatalog.ts` — pins the three
 * scaffolding-safety invariants a contributor can break without
 * breaking TypeScript compilation:
 *
 *   1. Every `SponsorshipOffering.id` is unique across the catalogue.
 *      Sponsorship IDs are referenced verbatim by `MoneyEarned{source:
 *      "Sponsorship", sourceRefId}` events (see packages/types/economy.ts
 *      IncomeLedgerEntry). A duplicate id silently collapses which deal
 *      the player can re-accept. Pin it.
 *
 *   2. The four "metrics" fields are all non-negative integers:
 *        - `cashPayment`         (player payout on accept; integer cash)
 *        - `partyPlacementBonus` (rank-1st/2nd/3rd bonus payout)
 *        - `minReputation`       (rep-unlock threshold; activation)
 *        - `availableFromYear`   (earliest calendar year; activation)
 *
 *      Floats would silently truncate in `state.economy.ledger.income`
 *      integer storage; negative values would invert the cash loop
 *      (player LOSES money on accept). Pin the runtime contract.
 *
 *   3. Scaffolding sanity: catalogue non-empty, every item carries the
 *      required shape (id, sponsorName, description, cashPayment,
 *      partyPlacementBonus, minReputation, availableFromYear,
 *      flavorTag). Plus idempotence (catalogue stable across reads).
 *
 * Pattern matches the existing smokes:
 * `strict as assert` + custom `check(label, run)` + console headers +
 * exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import { SPONSORSHIP_CATALOG } from "@sim/data/sponsorshipCatalog";

// ──────────────────────────────────────────────────────────────────────────
// Test scaffolding & shared constants
// ──────────────────────────────────────────────────────────────────────────

/**
 * The four numeric fields we hold to a "finite, non-negative integer"
 * contract. Listed in display order for clean PASS output.
 *
 *   - `cashPayment`        : direct payout, the headline number on the deal.
 *   - `partyPlacementBonus`: 1st/2nd/3rd bonus payout.
 *   - `minReputation`      : reputation gate (the user-facing "activation"
 *                            threshold; pinning \(\ge 0\) keeps the UI honest
 *                            about a deal being "free to look at" early game).
 *   - `availableFromYear`  : earliest calendar year the deal unlocks.
 *                            Must be integer; very rarely \(\ge 1985\).
 */
type IntegerField =
  | "cashPayment"
  | "partyPlacementBonus"
  | "minReputation"
  | "availableFromYear";

const INTEGER_FIELDS: readonly IntegerField[] = [
  "cashPayment",
  "partyPlacementBonus",
  "minReputation",
  "availableFromYear",
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
// Pins: catalogue is non-empty and every item carries the required shape.
// If any structural assumption breaks, every downstream scenario either
// skips or yields false-positives.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: sponsorshipCatalog scaffolding sanity gate");
check("SPONSORSHIP_CATALOG catalogue is non-empty", () => {
  assert.ok(SPONSORSHIP_CATALOG.length > 0, "sponsorship catalogue must have at least one entry");
});
check("every sponsorship carries the full required shape", () => {
  for (const s of SPONSORSHIP_CATALOG) {
    assert.equal(typeof s.id, "string", `item has non-string id: ${JSON.stringify(s)}`);
    assert.ok(s.id.length > 0, `item has empty id: ${JSON.stringify(s)}`);
    assert.equal(typeof s.sponsorName, "string", `${s.id}: sponsorName must be a string`);
    assert.ok(s.sponsorName.length > 0, `${s.id}: sponsorName must be non-empty`);
    assert.equal(typeof s.description, "string", `${s.id}: description must be a string`);
    assert.ok(s.description.length > 0, `${s.id}: description must be non-empty`);
    assert.equal(typeof s.flavorTag, "string", `${s.id}: flavorTag must be a string`);
    assert.ok(s.flavorTag.length > 0, `${s.id}: flavorTag must be non-empty`);
    for (const field of INTEGER_FIELDS) {
      assert.equal(
        typeof s[field],
        "number",
        `${s.id}: ${field} must be a number (got ${typeof s[field]})`,
      );
    }
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Every SponsorshipOffering.id is unique.
//
// `MoneyEarned` events reference the deal id verbatim via `sourceRefId`.
// A duplicate id would confuse ledger attribution (which deal paid?).
// Pin the contract.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: every sponsorship id is unique");
check("no two SPONSORSHIP_CATALOG entries share an id", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const s of SPONSORSHIP_CATALOG) {
    if (seen.has(s.id)) dups.push(s.id);
    seen.add(s.id);
  }
  assert.deepEqual(
    dups,
    [],
    `duplicate id(s) found in SPONSORSHIP_CATALOG: ${dups.join(",") || "∅"}`,
  );
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Every numeric field is a finite, non-negative integer.
//
// Aggregate-per-field (4 checks) rather than per-row. A single failure
// surfaces every offender at once and stays diagnostic-readable as the
// catalogue grows past ~50 entries.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: every numeric field is a finite, non-negative integer");
for (const field of INTEGER_FIELDS) {
  check(`every ${field} is finite, integer, ≥ 0`, () => {
    const bad: Array<{ id: string; value: unknown; reason: string }> = [];
    for (const s of SPONSORSHIP_CATALOG) {
      const raw = s[field];
      if (!Number.isFinite(raw)) {
        bad.push({ id: s.id, value: raw, reason: "not finite" });
        continue;
      }
      if (!Number.isInteger(raw)) {
        bad.push({ id: s.id, value: raw, reason: "not integer" });
        continue;
      }
      if (raw < 0) {
        bad.push({ id: s.id, value: raw, reason: "< 0" });
      }
    }
    assert.deepEqual(
      bad,
      [],
      `${bad.length} sponsorship(s) have invalid ${field}: ` +
        bad.map((b) => `${b.id}=${b.value} (${b.reason})`).join(", ") + " (or ∅)",
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Structural soundness (deliberate overshoot of the
// "integer sanity" brief — read before changing!).
//
//   a. `cashPayment > 0` for every entry (dead-content sentinel:
//      integer-sanity would pass a 0-cash deal).
//   b. `minReputation` non-decreasing across `availableFromYear`
//      ordering (year-tiered pacing invariant; encodes a deliberate
//      design call, not just type correctness).
//
// If you intentionally want to break either assumption, update this
// test FIRST — don't let reorder refactors silently shift gameplay.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: structural soundness");
check("every cashPayment is strictly positive", () => {
  const zeroPayouts = SPONSORSHIP_CATALOG
    .filter((s) => s.cashPayment <= 0)
    .map((s) => s.id);
  assert.deepEqual(
    zeroPayouts,
    [],
    `cash payment must be > 0; offending: ${zeroPayouts.join(",") || "∅"}`,
  );
});
check("minReputation is non-decreasing across availableFromYear ordering", () => {
  // Sort by availableFromYear (stable sort so equal-year ties keep
  // catalog order) and verify the resulting minReputation sequence
  // is monotonically non-decreasing.
  const sorted = [...SPONSORSHIP_CATALOG].sort(
    (a, b) => a.availableFromYear - b.availableFromYear,
  );
  const drifts: Array<{ id: string; prev: number; next: number; year: number }> = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1];
    const next = sorted[i];
    if (next.minReputation < prev.minReputation) {
      drifts.push({
        id: next.id,
        prev: prev.minReputation,
        next: next.minReputation,
        year: next.availableFromYear,
      });
    }
  }
  assert.deepEqual(
    drifts,
    [],
    `minReputation must not decrease across year ordering: ` +
      drifts
        .map((d) => `${d.id}(${d.prev}→${d.next} @ ${d.year})`)
        .join(", ") + " (or ∅)",
  );
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Idempotence / catalogue stability.
//
// Catches a future contributor who mutates the catalogue at module
// load. SPONSORSHIP_CATALOG is read by the sponsorship UI prompt and
// the MoneyEarned dispatcher; a mutation would change behaviour under
// HMR or across tests.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: catalogue is stable across reads");
{
  const a = SPONSORSHIP_CATALOG;
  const b = SPONSORSHIP_CATALOG;
  check("two reads of SPONSORSHIP_CATALOG have identical length", () => {
    assert.equal(
      a.length,
      b.length,
      `catalogue length changed between reads (${a.length} vs ${b.length}); a top-level mutation slipped in`,
    );
  });
  check("two reads of SPONSORSHIP_CATALOG have identical ids in order", () => {
    assert.deepEqual(
      a.map((s) => s.id),
      b.map((s) => s.id),
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
      ? "sponsorshipCatalog smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
