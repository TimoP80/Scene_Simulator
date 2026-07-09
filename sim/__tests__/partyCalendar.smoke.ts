/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/partyCalendar.ts`.
 *
 * Pins the invariants the time-step + contest pipeline relies on:
 *   - every PartyEvent has a unique id
 *   - `month` ∈ [1, 12] ; `year` ∈ [1985, 2005]
 *   - `platformFocus` ∈ { "all" | "amiga" | "c64" | "pc" }
 *   - every competition's `type` ∈ ProductionType closed enum
 *   - `attendance`, `prestige`, competition `prizePool` are non-negative integers
 *   - every event has at least 1 competition (the seed pins this; an
 *     event with 0 competitions is dead content from the contest engine's POV)
 *   - `isAnnual` boolean
 *   - `headlineNews`, `location`, `name` are non-empty strings
 *   - `entrants` is an array (possibly empty)
 *   - reads are idempotent
 *
 * Note: we do NOT pin year-monotonic ordering — the seed ships with
 * scrambled years (1987, 1989, 1992×n, 1998×n, 2000) on purpose so all
 * era bands are populated in the player-facing timeline.
 */

import { strict as assert } from "node:assert";
import { PARTY_CALENDAR } from "@sim/data/partyCalendar";
import { ProductionType } from "@packages/types";

const EVENTS = PARTY_CALENDAR;
const VALID_PLATFORM_FOCUS: ReadonlySet<string> = new Set([
  "all",
  "amiga",
  "c64",
  "pc",
]);
const VALID_PRODUCTION_TYPES: ReadonlySet<string> = new Set(
  Object.values(ProductionType),
);

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

check("partyCalendar: catalogue is non-empty", () => {
  assert.ok(EVENTS.length > 0, "expected at least one party");
});

check("partyCalendar: every entry has non-empty string id, name, headlineNews, location", () => {
  for (const e of EVENTS) {
    assert.ok(typeof e.id === "string" && e.id.length > 0, `bad id: ${JSON.stringify(e.id)}`);
    assert.ok(typeof e.name === "string" && e.name.length > 0, `bad name on ${e.id}`);
    assert.ok(typeof e.headlineNews === "string" && e.headlineNews.length > 0, `bad headlineNews on ${e.id}`);
    assert.ok(typeof e.location === "string" && e.location.length > 0, `bad location on ${e.id}`);
  }
});

check("partyCalendar: every id is unique", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const e of EVENTS) {
    if (seen.has(e.id)) dups.push(e.id);
    seen.add(e.id);
  }
  assert.equal(dups.length, 0, `duplicate ids: ${dups.join(", ")}`);
});

check("partyCalendar: isAnnual is boolean", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (typeof e.isAnnual !== "boolean") bad.push(`${e.id}: ${typeof e.isAnnual}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 1 — Date + platformFocus invariants
//
// `year` recently landed on PartyEvent (post-seed), so a refactor that
// narrows or removes it would silently break the year-aware filter.
console.log("\n=== SCENARIO 1 — Date + platformFocus ===");

check("partyCalendar: every year ∈ [1985, 2005] (sim window)", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (!Number.isInteger(e.year) || e.year < 1985 || e.year > 2005) {
      bad.push(`${e.id}: ${e.year}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("partyCalendar: every month ∈ [1, 12]", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (!Number.isInteger(e.month) || e.month < 1 || e.month > 12) {
      bad.push(`${e.id}: ${e.month}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("partyCalendar: every platformFocus ∈ { all, amiga, c64, pc }", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (!VALID_PLATFORM_FOCUS.has(e.platformFocus)) {
      bad.push(`${e.id}: ${e.platformFocus}`);
    }
  }
  assert.equal(bad.length, 0, `unknown platformFocus: ${bad.join(", ")}`);
});

// SCENARIO 2 — Competitions cross-reference + numerics
//
// The contest engine keys off `competitions[].type`. A typo here would
// silently drop a bracket; this check makes it loud.
console.log("\n=== SCENARIO 2 — Competitions ===");

check("partyCalendar: every event has at least 1 competition (dead-content check)", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (!Array.isArray(e.competitions) || e.competitions.length === 0) {
      bad.push(e.id);
    }
  }
  assert.equal(bad.length, 0, `events with 0 competitions: ${bad.join(", ")}`);
});

check("partyCalendar: every competition.type ∈ ProductionType closed enum", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    for (const c of e.competitions ?? []) {
      if (!VALID_PRODUCTION_TYPES.has(c.type as string)) {
        bad.push(`${e.id}: ${c.type}`);
      }
    }
  }
  assert.equal(bad.length, 0, `unknown competition types: ${bad.join(", ")}`);
});

check("partyCalendar: every prizePool is a non-negative integer", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    for (const c of e.competitions ?? []) {
      if (!Number.isInteger(c.prizePool) || c.prizePool < 0) {
        bad.push(`${e.id}: prizePool=${c.prizePool}`);
      }
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("partyCalendar: every competition.entrants is an array (possibly empty)", () => {
  for (const e of EVENTS) {
    for (const c of e.competitions ?? []) {
      assert.ok(Array.isArray(c.entrants), `${e.id}: entrants not array`);
    }
  }
});

// SCENARIO 3 — Numeric ranges
console.log("\n=== SCENARIO 3 — attendance + prestige ===");

check("partyCalendar: attendance and prestige are non-negative integers", () => {
  const bad: string[] = [];
  for (const e of EVENTS) {
    if (!Number.isInteger(e.attendance) || e.attendance < 0) bad.push(`${e.id}.attendance=${e.attendance}`);
    if (!Number.isInteger(e.prestige) || e.prestige < 0) bad.push(`${e.id}.prestige=${e.prestige}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 4 — Idempotence
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("partyCalendar: two reads return same length", () => {
  assert.equal(EVENTS.length, PARTY_CALENDAR.length, "catalogue length changed between reads");
});

check("partyCalendar: id ordering is stable across reads", () => {
  const a = EVENTS.map((e) => e.id);
  const b = PARTY_CALENDAR.map((e) => e.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — partyCalendar smoke all green.");
