/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/initialNpcs.ts`.
 *
 * Pins the invariants `sim/engine/reducer.ts` reads every tick:
 *   - every slot key equals the inner `id` (record-key guard)
 *   - every `skills.{coding,music,graphics,organization}` ∈ [0, 100]
 *   - every `specialty` ∈ SpecialtyType enum
 *   - every `role` ∈ closed union ("player" | "crew" | "scene_npc")
 *   - every `status` ∈ closed union
 *   - every `preferredPlatform` ∈ PlatformId enum
 *   - every non-null `groupId` resolves against `INITIAL_GROUPS` keys
 *   - `motivation`, `burnout` ∈ [0, 100]; `reputation` ∈ [0, 1000];
 *     `friendship` ∈ [0, 100]; `salaryDemand` ≥ 0
 *   - `avatarSeed` is a positive integer
 *   - reads are idempotent (record-key order stable)
 */

import { strict as assert } from "node:assert";
import { INITIAL_NPCS } from "@sim/data/initialNpcs";
import { INITIAL_GROUPS } from "@sim/data/initialGroups";
import { SpecialtyType, PlatformId } from "@packages/types";

const NPCS = INITIAL_NPCS;
const GROUP_IDS: ReadonlySet<string> = new Set(Object.keys(INITIAL_GROUPS));
const VALID_PLATFORMS: ReadonlySet<string> = new Set(Object.values(PlatformId));
const VALID_SPECIALTIES: ReadonlySet<string> = new Set(Object.values(SpecialtyType));
const VALID_ROLES: ReadonlySet<string> = new Set(["player", "crew", "scene_npc"]);
const VALID_STATUSES: ReadonlySet<string> = new Set([
  "idle",
  "coding",
  "arranging",
  "drawing",
  "burnt_out",
  "retired",
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

// SCENARIO 0 — Scaffolding sanity + record-key guard
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("initialNpcs: catalogue is non-empty", () => {
  assert.ok(Object.keys(NPCS).length > 0, "expected at least one NPC");
});

check("initialNpcs: every record key matches the inner `id` (key/id guard)", () => {
  const bad: string[] = [];
  for (const [key, n] of Object.entries(NPCS)) {
    if (key !== n.id) bad.push(`slot ${key} has inner id ${n.id}`);
  }
  assert.equal(bad.length, 0, `key/id mismatches: ${bad.join(", ")}`);
});

check("initialNpcs: every entry has non-empty string id, name, handle, bio", () => {
  for (const [key, n] of Object.entries(NPCS)) {
    assert.ok(typeof n.id === "string" && n.id.length > 0, `bad id on slot ${key}`);
    assert.ok(typeof n.name === "string" && n.name.length > 0, `bad name on ${key}`);
    assert.ok(typeof n.handle === "string" && n.handle.length > 0, `bad handle on ${key}`);
    assert.ok(typeof n.bio === "string" && n.bio.length > 0, `bad bio on ${key}`);
  }
});

// SCENARIO 1 — Enum-anchored fields
console.log("\n=== SCENARIO 1 — Enum-anchored fields ===");

check("initialNpcs: every specialty ∈ SpecialtyType enum", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!VALID_SPECIALTIES.has(n.specialty)) bad.push(`${id}: ${n.specialty}`);
  }
  assert.equal(bad.length, 0, `unknown specialties: ${bad.join(", ")}`);
});

check("initialNpcs: every role ∈ closed union", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!VALID_ROLES.has(n.role)) bad.push(`${id}: ${n.role}`);
  }
  assert.equal(bad.length, 0, `unknown roles: ${bad.join(", ")}`);
});

check("initialNpcs: every status ∈ closed union", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!VALID_STATUSES.has(n.status)) bad.push(`${id}: ${n.status}`);
  }
  assert.equal(bad.length, 0, `unknown statuses: ${bad.join(", ")}`);
});

check("initialNpcs: every preferredPlatform ∈ PlatformId enum", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!VALID_PLATFORMS.has(n.preferredPlatform)) bad.push(`${id}: ${n.preferredPlatform}`);
  }
  assert.equal(bad.length, 0, `unknown platforms: ${bad.join(", ")}`);
});

// SCENARIO 2 — Cross-reference to INITIAL_GROUPS
console.log("\n=== SCENARIO 2 — Cross-reference to INITIAL_GROUPS ===");

check("initialNpcs: every non-null groupId resolves against INITIAL_GROUPS keys", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (n.groupId !== null && !GROUP_IDS.has(n.groupId)) {
      bad.push(`${id} -> ${n.groupId}`);
    }
  }
  assert.equal(bad.length, 0, `dangling groupIds: ${bad.join(", ")}`);
});

// SCENARIO 3 — Numeric ranges
console.log("\n=== SCENARIO 3 — Numeric ranges ===");

const SKILL_KEYS = ["coding", "music", "graphics", "organization"] as const;

check("initialNpcs: skills ∈ [0, 100] for every NPC", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    for (const k of SKILL_KEYS) {
      const v = n.skills[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
        bad.push(`${id}.skills.${k}=${v}`);
      }
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("initialNpcs: motivation, burnout ∈ [0, 100]", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    for (const k of ["motivation", "burnout"] as const) {
      const v = n[k];
      if (typeof v !== "number" || !Number.isFinite(v) || v < 0 || v > 100) {
        bad.push(`${id}.${k}=${v}`);
      }
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("initialNpcs: reputation ∈ [0, 1000], friendship ∈ [0, 100], salaryDemand ≥ 0", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (typeof n.reputation !== "number" || !Number.isFinite(n.reputation) || n.reputation < 0 || n.reputation > 1000) {
      bad.push(`${id}.reputation=${n.reputation}`);
    }
    if (typeof n.friendship !== "number" || !Number.isFinite(n.friendship) || n.friendship < 0 || n.friendship > 100) {
      bad.push(`${id}.friendship=${n.friendship}`);
    }
    if (typeof n.salaryDemand !== "number" || !Number.isFinite(n.salaryDemand) || n.salaryDemand < 0) {
      bad.push(`${id}.salaryDemand=${n.salaryDemand}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("initialNpcs: avatarSeed is a positive integer", () => {
  const bad: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (!Number.isInteger(n.avatarSeed) || n.avatarSeed <= 0) bad.push(`${id}: ${n.avatarSeed}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// avatarSeed drives the deterministic avatar render. Two NPCs landing
// on the same seed would silently alias their avatars in the UI.
check("initialNpcs: avatarSeed is unique across all NPCs", () => {
  const seen = new Set<number>();
  const dups: string[] = [];
  for (const [id, n] of Object.entries(NPCS)) {
    if (seen.has(n.avatarSeed)) dups.push(`${id}: ${n.avatarSeed}`);
    seen.add(n.avatarSeed);
  }
  assert.equal(dups.length, 0, `duplicate avatarSeeds: ${dups.join(", ")}`);
});

// SCENARIO 4 — Idempotence
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("initialNpcs: two reads return same key set in same order", () => {
  const a = Object.keys(NPCS);
  const b = Object.keys(INITIAL_NPCS);
  assert.deepEqual(a, b, "key order drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — initialNpcs smoke all green.");
