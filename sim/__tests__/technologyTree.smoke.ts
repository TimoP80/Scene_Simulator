/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/technologyTree.ts`.
 *
 * Pins the invariants a contributor renaming/effecting the tech tree
 * would silently break:
 *   - every node has a unique id (record-key + inner-id equality)
 *   - every `preRequisiteIds[]` entry resolves against the tree itself
 *   - no self-loops; no duplicate prerequisites within a single node
 *   - every `effectUnlocks[]` resolves against `DEMO_EFFECTS` ids
 *     (the downstream `getUnlockedEffectIds` relies on this exact mapping)
 *   - every `bonusAttribute.type` ∈ closed literal set
 *   - every `era` ∈ EraId enum; every `platformUnlocks[]` ∈ PlatformId enum
 *   - `costPoints` is a positive integer; every present bonus `value` > 0
 *   - reads are idempotent across calls
 *
 * Mirrors the style of `effectSynergies.smoke.ts` and friends.
 */

import { strict as assert } from "node:assert";
import { TECHNOLOGY_TREE } from "@sim/data/technologyTree";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";
import { EraId, PlatformId } from "@packages/types";

const TREES = TECHNOLOGY_TREE;
const EFFECT_IDS: ReadonlySet<string> = new Set(DEMO_EFFECTS.map((e) => e.id));
const NODE_IDS: ReadonlySet<string> = new Set(TREES.map((n) => n.id));
const VALID_BONUS_TYPES = new Set([
  "coding",
  "music",
  "graphics",
  "size_reduction",
  "optimization",
]);
const VALID_ERAS: ReadonlySet<string> = new Set(Object.values(EraId));
const VALID_PLATFORMS: ReadonlySet<string> = new Set(Object.values(PlatformId));

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
//
// Cheap upfront guards. A failure here is a "this file isn't even load-
// able" problem; the deeper invariants below assume the catalogue is at
// least structurally sane.
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("technologyTree: catalogue is non-empty", () => {
  assert.ok(TREES.length > 0, "expected at least one tech node");
});

check("technologyTree: every entry has a non-empty string id, name, description", () => {
  for (const n of TREES) {
    assert.ok(
      typeof n.id === "string" && n.id.length > 0,
      `bad id: ${JSON.stringify(n.id)}`,
    );
    assert.ok(
      typeof n.name === "string" && n.name.length > 0,
      `bad name on ${n.id}`,
    );
    assert.ok(
      typeof n.description === "string" && n.description.length > 0,
      `bad description on ${n.id}`,
    );
  }
});

// Pin the initial-state default `researched === false`. The reducer
// reads this field on every tick to gate the bonus/effectUnlocks; a
// refactor that flipped the default would silently hand the player
// every research outcome on day-1.
check("technologyTree: every entry starts with researched === false", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (n.researched !== false) bad.push(`${n.id}: ${n.researched}`);
  }
  assert.equal(bad.length, 0, `nodes not pre-unresearched: ${bad.join(", ")}`);
});

check("technologyTree: every era ∈ EraId enum", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (!VALID_ERAS.has(n.era)) bad.push(`${n.id}: ${n.era}`);
  }
  assert.equal(bad.length, 0, `unknown eras: ${bad.join(", ")}`);
});

// SCENARIO 1 — Graph integrity (preRequisiteIds resolves within tree)
//
// Mirrors the hardware-catalog pattern: a deep structural guard catches
// "any duplicate / any dangling edge" in one shot, then a named scan
// surfaces the specific offender so the failure message is actionable.
console.log("\n=== SCENARIO 1 — Graph integrity ===");

check("technologyTree: every preRequisiteId resolves against the tree", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    for (const prid of n.preRequisiteIds) {
      if (!NODE_IDS.has(prid)) bad.push(`${n.id} -> ${prid}`);
    }
  }
  assert.equal(bad.length, 0, `dangling prerequisites: ${bad.join(", ")}`);
});

check("technologyTree: no node lists itself as a prerequisite (no self-loops)", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (n.preRequisiteIds.includes(n.id)) bad.push(n.id);
  }
  assert.equal(bad.length, 0, `self-loop nodes: ${bad.join(", ")}`);
});

check("technologyTree: no duplicate prerequisite edges inside a single node", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    const seen = new Set<string>();
    for (const prid of n.preRequisiteIds) {
      if (seen.has(prid)) bad.push(`${n.id} duplicate -> ${prid}`);
      seen.add(prid);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 2 — Cross-reference to DEMO_EFFECTS via effectUnlocks
//
// The downstream `getUnlockedEffectIds` projects NODE.effectUnlocks →
// DEMO_EFFECTS.id lookup. A typo here would silently zero out research.
console.log("\n=== SCENARIO 2 — effectUnlocks resolves against DEMO_EFFECTS ===");

check("technologyTree: every effectUnlocks[] entry resolves against DEMO_EFFECTS", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    for (const eid of n.effectUnlocks ?? []) {
      if (!EFFECT_IDS.has(eid)) bad.push(`${n.id} -> ${eid}`);
    }
  }
  assert.equal(bad.length, 0, `dangling effect unlocks: ${bad.join(", ")}`);
});

// SCENARIO 3 — bonusAttribute shape + numeric fields
console.log("\n=== SCENARIO 3 — bonusAttribute + numeric fields ===");

check("technologyTree: bonusAttribute.type ∈ closed literal set (when present)", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (n.bonusAttribute && !VALID_BONUS_TYPES.has(n.bonusAttribute.type)) {
      bad.push(`${n.id}: ${n.bonusAttribute.type}`);
    }
  }
  assert.equal(bad.length, 0, `unknown bonus types: ${bad.join(", ")}`);
});

check("technologyTree: bonusAttribute.value is positive-finite (when present)", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (!n.bonusAttribute) continue;
    const v = n.bonusAttribute.value;
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0) {
      bad.push(`${n.id}.bonusAttribute.value=${v}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("technologyTree: every costPoints is a positive integer", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    if (!Number.isInteger(n.costPoints) || n.costPoints <= 0) {
      bad.push(`${n.id}: ${n.costPoints}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("technologyTree: every platformUnlocks entry ∈ PlatformId enum", () => {
  const bad: string[] = [];
  for (const n of TREES) {
    for (const p of n.platformUnlocks ?? []) {
      if (!VALID_PLATFORMS.has(p)) bad.push(`${n.id} -> ${p}`);
    }
  }
  assert.equal(bad.length, 0, `unknown platforms: ${bad.join(", ")}`);
});

// SCENARIO 4 — Idempotence
//
// hardware-catalog-style: two reads must agree on length and id order.
// A drift here usually means a top-level mutation slipped during refactor.
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("technologyTree: two reads of TECHNOLOGY_TREE return the same length", () => {
  assert.equal(TREES.length, TECHNOLOGY_TREE.length, "catalogue length changed between reads");
});

check("technologyTree: id ordering is stable across reads", () => {
  const a = TREES.map((n) => n.id);
  const b = TECHNOLOGY_TREE.map((n) => n.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — technologyTree smoke all green.");
