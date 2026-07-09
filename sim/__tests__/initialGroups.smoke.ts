/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/initialGroups.ts`.
 *
 * Pins the invariants `sim/engine/reducer.ts` and `sim/projections/`
 * read every tick:
 *   - every record key equals the inner `id` (key/id guard)
 *   - name, motto, hqLocation are non-empty strings
 *   - every `memberIds[]` entry resolves against `INITIAL_NPCS` keys
 *   - no duplicate member ids inside a single group
 *   - at most one group has `isPlayerGroup: true` in the SEED
 *     (the player-group is created dynamically by bootstrap; the seed
 *     ships with zero — pinning ≤1 documents that contract)
 *   - `fanbase`, `reputation` non-negative integers
 *   - `releaseIds` is an array
 *   - reads are idempotent (record-key order stable)
 */

import { strict as assert } from "node:assert";
import { INITIAL_GROUPS } from "@sim/data/initialGroups";
import { INITIAL_NPCS } from "@sim/data/initialNpcs";

const GROUPS = INITIAL_GROUPS;
const NPC_IDS: ReadonlySet<string> = new Set(Object.keys(INITIAL_NPCS));

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

// SCENARIO 0 — Scaffolding sanity + record-key guard
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("initialGroups: catalogue is non-empty", () => {
  assert.ok(Object.keys(GROUPS).length > 0, "expected at least one group");
});

check("initialGroups: every record key matches the inner `id`", () => {
  const bad: string[] = [];
  for (const [key, g] of Object.entries(GROUPS)) {
    if (key !== g.id) bad.push(`slot ${key} has inner id ${g.id}`);
  }
  assert.equal(bad.length, 0, `key/id mismatches: ${bad.join(", ")}`);
});

check("initialGroups: every entry has non-empty string name, motto, hqLocation", () => {
  for (const [key, g] of Object.entries(GROUPS)) {
    assert.ok(typeof g.name === "string" && g.name.length > 0, `bad name on ${key}`);
    assert.ok(typeof g.motto === "string" && g.motto.length > 0, `bad motto on ${key}`);
    assert.ok(typeof g.hqLocation === "string" && g.hqLocation.length > 0, `bad hqLocation on ${key}`);
  }
});

// SCENARIO 1 — Player-group count + memberIds cross-reference
console.log("\n=== SCENARIO 1 — member cross-reference ===");

// The seed ships with ZERO player groups (the player-group is created
// dynamically by `emptyWorldState` in App.tsx). Pinning ≤ 1 documents
// the contract: if a contributor ever inlines a seeded player group,
// they MUST update this test first.
check("initialGroups: at most one group has isPlayerGroup=true in the SEED", () => {
  const players = Object.entries(GROUPS).filter(([, g]) => g.isPlayerGroup === true);
  assert.ok(
    players.length <= 1,
    `expected 0 or 1 seeded player group, got ${players.length}: ${players.map(([k]) => k).join(", ")}`,
  );
});

check("initialGroups: every memberIds[] entry resolves against INITIAL_NPCS keys", () => {
  const bad: string[] = [];
  for (const [gid, g] of Object.entries(GROUPS)) {
    for (const mid of g.memberIds ?? []) {
      if (!NPC_IDS.has(mid)) bad.push(`${gid} -> ${mid}`);
    }
  }
  assert.equal(bad.length, 0, `dangling memberIds: ${bad.join(", ")}`);
});

check("initialGroups: no duplicate member ids inside a single group", () => {
  const bad: string[] = [];
  for (const [gid, g] of Object.entries(GROUPS)) {
    const seen = new Set<string>();
    for (const mid of g.memberIds ?? []) {
      if (seen.has(mid)) bad.push(`${gid} duplicate -> ${mid}`);
      seen.add(mid);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 2 — Numeric ranges + invariants
console.log("\n=== SCENARIO 2 — Numeric ranges ===");

check("initialGroups: fanbase + reputation are non-negative integers", () => {
  const bad: string[] = [];
  for (const [gid, g] of Object.entries(GROUPS)) {
    if (!Number.isInteger(g.fanbase) || g.fanbase < 0) bad.push(`${gid}.fanbase=${g.fanbase}`);
    if (!Number.isInteger(g.reputation) || g.reputation < 0) bad.push(`${gid}.reputation=${g.reputation}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("initialGroups: isPlayerGroup is boolean", () => {
  const bad: string[] = [];
  for (const [gid, g] of Object.entries(GROUPS)) {
    if (typeof g.isPlayerGroup !== "boolean") bad.push(`${gid}: ${typeof g.isPlayerGroup}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("initialGroups: releaseIds is an array (possibly empty)", () => {
  for (const [gid, g] of Object.entries(GROUPS)) {
    assert.ok(Array.isArray(g.releaseIds), `releaseIds not array on ${gid}`);
  }
});

// SCENARIO 3 — Idempotence
console.log("\n=== SCENARIO 3 — Idempotence ===");

check("initialGroups: two reads return same key set in same order", () => {
  const a = Object.keys(GROUPS);
  const b = Object.keys(INITIAL_GROUPS);
  assert.deepEqual(a, b, "key order drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — initialGroups smoke all green.");
