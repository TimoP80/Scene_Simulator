/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/effectUnlocks.ts`.
 *
 * Pins the three unlock gates the studio relies on:
 *   1. Free baseline      — every effect with `researchRequired: false`
 *                            is always unlocked, regardless of research.
 *   2. Tech-node gate     — every researched tech node's `effectUnlocks`
 *                            is added (deduped).
 *   3. Software gate      — every owned software offering's
 *                            `effectUnlocks` is added (deduped).
 *
 * Plus the two failure modes a regression must catch:
 *   - Stale (fictional) tech ids and software ids must not add random
 *     effect ids to the unlocked set.
 *   - A real tech/software id that maps to no DemoEffect must be
 *     dropped by the sanitize step (it never leaks into the result).
 *
 * And the audit helper `getUnregisteredEffectIds` must still report
 * orphan effects (effects with no tech-node / software home) after the
 * `ALL_EFFECT_IDS` constant was removed — the function derives its id
 * list inline from `DEMO_EFFECTS.map((e) => e.id)` and must keep
 * working.
 *
 * Pattern matches `dispatchStampedEvent.smoke.ts`: `strict as assert`
 * from `node:assert`, custom `check(label, run)` helper, console-logged
 * scenario headers, exit code 1 on any failure.
 */

import { strict as assert } from "node:assert";
import { createHash } from "node:crypto";

import {
  collectDeclaredUnlocks,
  getUnlockedEffectIds,
  getUnregisteredEffectIds,
} from "@sim/data/effectUnlocks";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";
import { SOFTWARE_CATALOG } from "@sim/data/softwareCatalog";
import { TECHNOLOGY_TREE } from "@sim/data/technologyTree";

// ──────────────────────────────────────────────────────────────────────────
// Module-scope constants & helpers
// ──────────────────────────────────────────────────────────────────────────

/** Live `Set<string>` of every effect id (== every DEMO_EFFECTS id). */
const REAL_EFFECT_IDS: ReadonlySet<string> = new Set(
  DEMO_EFFECTS.map((e) => e.id),
);

/** Live `Set<string>` of every effect id with `researchRequired: false`. */
function freeEffectIds(): Set<string> {
  return new Set(
    DEMO_EFFECTS.filter((e) => !e.researchRequired).map((e) => e.id),
  );
}

/**
 * One stale-ref entry: an effect-id-shaped string mentioned by a tech-node
 * or software-offering entry that does NOT map to a real `DemoEffect`.
 * These are the IDs the sanitize step in `getUnlockedEffectIds` drops.
 *
 * ⚠️ KEY-ORDER CONTRACT: the hash input below is `JSON.stringify({...})`
 * which is insertion-order-deterministic on every conformant JSON
 * implementation. Adding a 4th field at the END is fine; reordering
 * these three keys OR inserting one before `source` would silently flip
 * the stale-ref fingerprint and break Scenario 5.0. Append-only.
 */
type StaleRef = { source: "tech" | "sw"; sourceId: string; staleId: string };

/**
 * TODO / coverage gap (per code-review): the current `effectUnlocks`
 * source-of-truth list is { TECHNOLOGY_TREE, SOFTWARE_CATALOG }. The
 * following seed files do NOT currently expose `effectUnlocks` arrays,
 * but ANY future contributor who adds one MUST also extend this list:
 *   - sim/data/jobTemplates.ts (JOB_TEMPLATES)
 *   - sim/data/hardwareCatalog.ts (HARDWARE_CATALOG)
 *   - sim/data/sponsorshipCatalog.ts (SPONSORSHIP_CATALOG)
 *   - sim/data/initialGroups.ts / initialNpcs.ts (NPC / Group metadata)
 * If you add an `effectUnlocks` to any of those, also extend
 * `deriveStaleRefSet` below or the fingerprint anchor will silently
 * miss your new source.
 */
const EFFECT_UNLOCKS_SOURCES = [
  { source: "tech" as const, list: TECHNOLOGY_TREE },
  { source: "sw" as const, list: SOFTWARE_CATALOG },
];

/** Sorted list of every stale (source, ref) pair across the configured
 *  sources. Lexicographic sort keeps the hash input stable. */
function deriveStaleRefSet(): StaleRef[] {
  const stale: StaleRef[] = [];
  for (const group of EFFECT_UNLOCKS_SOURCES) {
    for (const entry of group.list) {
      for (const id of entry.effectUnlocks) {
        if (!REAL_EFFECT_IDS.has(id)) {
          stale.push({ source: group.source, sourceId: entry.id, staleId: String(id) });
        }
      }
    }
  }
  stale.sort((a, b) =>
    a.source.localeCompare(b.source) ||
    a.sourceId.localeCompare(b.sourceId) ||
    a.staleId.localeCompare(b.staleId),
  );
  return stale;
}

/** 12-char sha256 prefix of the JSON-serialized stale-ref set.
 *  48 bits ≈ 2.8e14 keys; ample for one seed. Bump to 16 if the
 *  stale-ref count ever crosses ~50 entries.
 *  Stable across runs as long as the underlying arrays don't reorder. */
function fingerprintStaleRefs(stale: StaleRef[]): string {
  const full = createHash("sha256").update(JSON.stringify(stale)).digest("hex");
  return full.slice(0, 12);
}

/**
 * SHA256-12 fingerprint of the EXPECTED stale-ref set in this repo's seed.
 *
 * This is the auto-derived anchor that gates Scenario 5's NOTE block.
 * If the catalogue drifts (someone removes the deliberate
 * `sw_photoshop_5 -> "procedural_textures"` stale fixture, OR adds a new
 * stale ref somewhere else, OR reorders TECHNOLOGY_TREE/SOFTWARE_CATALOG),
 * Scenario 5.0 will fail loudly with both the expected/actual fingerprint
 * AND the full stale-ref list.
 *
 * To recompute after an intentional catalogue change:
 *   $ npx tsx scripts/audit-stale-fingerprints.mjs
 * then paste the printed fingerprint into this constant.
 */
const EXPECTED_STALE_FINGERPRINT = "6a9bf1824d58";

/** Set equality — ignores order, asserts cardinalities and contents match. */
function assertSetEqual(label: string, actual: Set<string>, expected: Set<string>): void {
  check(label, () => {
    assert.ok(actual instanceof Set, `expected a Set, got ${typeof actual}`);
    assert.ok(expected instanceof Set, `expected a Set, got ${typeof expected}`);
    if (actual.size !== expected.size) {
      throw new Error(
        `size: expected ${expected.size}, got ${actual.size} ` +
          `(missing: ${[...expected].filter((id) => !actual.has(id)).join(",") || "∅"}; ` +
          `unexpected: ${[...actual].filter((id) => !expected.has(id)).join(",") || "∅"})`,
      );
    }
    for (const id of expected) {
      assert.ok(actual.has(id), `missing: ${id}`);
    }
  });
}

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
// SCENARIO 0 — Scaffolding sanity.
//
// Pins the import-time invariants: data files resolve, catalogues are
// non-empty, and `DEMO_EFFECTS` actually has both research-required and
// free effects. If someone ships a broken seed the tests below will lie;
// this gate stops that by failing first.
//
// Also asserts a structural invariant that protects dedup tests later:
// every DemoEffect id must be unique, otherwise set equality vs a
// hand-built baseline creates false positives.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: data scaffolding sanity gate");
check("DEMO_EFFECTS has at least 4 entries (smoke needs enough surface area to be meaningful)", () => {
  assert.ok(DEMO_EFFECTS.length >= 4);
});
check("DEMO_EFFECTS contains at least one research-required effect (would-be orphan if no tech)", () => {
  assert.ok(DEMO_EFFECTS.some((e) => e.researchRequired));
});
check("DEMO_EFFECTS contains at least one free effect (smoke baseline gate)", () => {
  assert.ok(DEMO_EFFECTS.some((e) => !e.researchRequired));
});
check("DEMO_EFFECTS ids are unique (a duplicate would invalidate set-equality assertions later)", () => {
  const ids = DEMO_EFFECTS.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, "duplicate DemoEffect id detected");
});
check("TECHNOLOGY_TREE and SOFTWARE_CATALOG non-empty (smoke surface gate)", () => {
  assert.ok(TECHNOLOGY_TREE.length > 0);
  assert.ok(SOFTWARE_CATALOG.length > 0);
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — Free-effects baseline: empty research + empty software.
//
// `getUnlockedEffectIds([], [])` must return the set of every effect with
// `researchRequired: false` and NOTHING ELSE. This is what the studio's
// "RESEARCH REQUIRED" badge gates against — the baseline must be small
// enough to be meaningful but contain at least the C64/ZX classics.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: free-effects baseline (no research, no software)");
{
  const result = getUnlockedEffectIds([]);

  assertSetEqual(
    "result equals Set(every researchRequired:false effect id, live-computed)",
    result,
    freeEffectIds(),
  );

  check("contains the canonical 'raster_bars' + 'sine_scroller' C64/ZX classics", () => {
    assert.ok(result.has("raster_bars"));
    assert.ok(result.has("sine_scroller"));
  });

  // The studio's 'RESEARCH REQUIRED' badge depends on this:
  // a research-required effect MUST NOT be in the baseline.
  const mustBeResearched = DEMO_EFFECTS.find((e) => e.researchRequired);
  if (mustBeResearched) {
    check(`baseline excludes the first researchRequired effect ('${mustBeResearched.id}')`, () => {
      assert.ok(!result.has(mustBeResearched.id));
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Tech-node gate.
//
// Invest `voxel_heightfield` (PC-dawn technology that unlocks
// `voxel_hills`, which is researchRequired:true). Without a real
// research-required effect to flip from absent → present, this scenario
// could be passing accidentally if every research-required effect were
// missing from the baseline (sanity catch for Scenario 1).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: tech-node gate");
{
  const baseline = getUnlockedEffectIds([]);

  check("voxel_hills is researchRequired:true (sanity: not in baseline before tech was researched)", () => {
    const voxelHills = DEMO_EFFECTS.find((e) => e.id === "voxel_hills");
    assert.ok(voxelHills !== undefined);
    assert.equal(voxelHills!.researchRequired, true);
    assert.ok(!baseline.has("voxel_hills"));
  });

  check("researching voxel_heightfield (PC-dawn, unlocks researchRequired voxel_hills) → 'voxel_hills' NOW in set", () => {
    const result = getUnlockedEffectIds(["voxel_heightfield"]);
    assert.ok(result.has("voxel_hills"));
  });

  // Compare to a hand-computed expected set: freeEffectIds ⊕ tech.effectUnlocks.
  const expectedAfterVoxel = new Set<string>(freeEffectIds());
  for (const id of TECHNOLOGY_TREE.find((t) => t.id === "voxel_heightfield")!.effectUnlocks) {
    expectedAfterVoxel.add(id);
  }
  assertSetEqual(
    "voxel_heightfield result equals free ∪ voxel_heightfield.effectUnlocks",
    getUnlockedEffectIds(["voxel_heightfield"]),
    expectedAfterVoxel,
  );

  // The "free effect also referenced by a tech" case: raster_sync's
  // effectUnlocks (raster_bars, sine_scroller) are ALL researchRequired:false,
  // so the post-research set must equal the baseline (no growth, no shrink).
  assertSetEqual(
    "raster_sync (whose unlocks are also free) → set unchanged from baseline",
    getUnlockedEffectIds(["raster_sync"]),
    baseline,
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Software gate.
//
// Same shape as Scenario 2 but exercises SOFTWARE_CATALOG. Pick a
// tracker (FastTracker II) because the gates must dedup software-only
// songs from baseline classics; that confirms owned software adds what
// its catalog entry says, not what some inherited DEMO_EFFECTS row says.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: software-offering gate");
{
  const sw = SOFTWARE_CATALOG.find((s) => s.id === "sw_fasttracker_2");
  assert.ok(sw !== undefined, "sw_fasttracker_2 must exist as a fixture");

  const result = getUnlockedEffectIds([], ["sw_fasttracker_2"]);

  for (const id of sw!.effectUnlocks) {
    check(`software 'sw_fasttracker_2' adds its catalog unlock '${id}'`, () => {
      assert.ok(result.has(id));
    });
  }

  const expected = new Set<string>(freeEffectIds());
  for (const id of sw!.effectUnlocks) expected.add(id);
  assertSetEqual(
    "sw_fasttracker_2 result equals free ∪ software.effectUnlocks",
    result,
    expected,
  );
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Combined tech + software union, with dedup.
//
// `cloth_physics` is unlocked by TWO techs in TECHNOLOGY_TREE
// (`procedural_textures` AND `opengl_direct3d`). Researching both must
// yield a set whose `cloth_physics` count is exactly 1 (Set semantics)
// and is strictly equal to the union-of-the-two (with the free baseline
// pre-seeded).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: combined tech + software union with dedup");
{
  // Both techs that mention cloth_physics — verifying dedup across
  // tech-node sources.
  const techsBoth = ["procedural_textures", "opengl_direct3d"];
  const result = getUnlockedEffectIds(techsBoth);

  check("'cloth_physics' is in the result even though two tech nodes reference it", () => {
    assert.ok(result.has("cloth_physics"));
  });

  // Reconstruct the expected union: baseline ∪ (union of both techs' unlocks).
  const expected = new Set<string>(freeEffectIds());
  for (const tId of techsBoth) {
    for (const id of TECHNOLOGY_TREE.find((t) => t.id === tId)!.effectUnlocks) {
      expected.add(id);
    }
  }
  assertSetEqual(
    "two-tech result equals baseline ∪ (procedural_textures ∪ opengl_direct3d).effectUnlocks",
    result,
    expected,
  );

  check("set size matches the union size (no duplicates leaked through)", () => {
    assert.equal(result.size, expected.size);
  });

  // Cross-source dedup: same effect routed via software + tech + baseline
  // must appear exactly once.
  const sw0 = SOFTWARE_CATALOG.find((s) => s.id === "sw_octamed_pro")!;
  const combined = getUnlockedEffectIds(["copper_lists"], ["sw_octamed_pro"]);
  check("tech + software: 'animated_plasma' present (baseline + tech + sw triple-source, dedup-invariant)", () => {
    assert.ok(combined.has("animated_plasma"));
  });
  for (const id of sw0.effectUnlocks) {
    check(`software-side-only id '${id}' is in combined result`, () => {
      assert.ok(combined.has(id));
    });
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Sanitization: nonexistent / stale ids never leak through.
//
// (a) Fictional *tech id* passed to `unlockedTechIds` — getUnlockedEffectIds
//     silently ignores ids not in TECHNOLOGY_TREE.
// (b) Fictional *software id* passed to `ownedSoftwareIds` — same deal.
// (c) A real software offering that contains a stale effect-id reference
//     — `sw_photoshop_5` does this on purpose: its first entry is
//     `"procedural_textures" as string`, which is the TECH-NODE id
//     `procedural_textures` and NOT an effect id. The sanitize step
//     must drop it, so an obsolete lookup never adds a stale string to
//     the unlocked set.
//
//  ⚠️  NOTE TO FUTURE MAINTAINERS ⚠️
//
//  Scenario 5.0 runs FIRST as an auto-derived hash-anchor against the
//  stale-ref set. If THIS anchor fails, the failure message lists
//  every stale (source, ref) pair currently in the catalogue, so you
//  can immediately see what changed without digging.
//
//  Then the per-fixture checks below pin the specific behaviour we
//  care about:
//
//  1) Do NOT "fix" the stale `"procedural_textures" as string` in
//     `SOFTWARE_CATALOG` (e.g. by removing the entry or wrapping it in
//     `as EffectId` cleanup) — both the negative (`!result.has(...)`) and
//     the positive (`result.has("cloth_physics")`) assertions below
//     would start passing for the wrong reason, masking regressions in
//     the sanitize step. The 5.0 fingerprint anchor will also flip.
//
//  2) Do NOT *add* more stale refs to `SOFTWARE_CATALOG` / `TECHNOLOGY_TREE`
//     without updating `EXPECTED_STALE_FINGERPRINT` AND extending the
//     per-fixture assertions — otherwise the new stale ref would silently
//     slip through the sanitize step until Scenario 5.0 trips.
//
//  If you intentionally restructure the catalogue, regenerate the
//  fingerprint with `npx tsx scripts/audit-stale-fingerprints.mjs` and
//  paste the printed value into `EXPECTED_STALE_FINGERPRINT`.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: stale / nonexistent ids are dropped by sanitize");

// 5.0 — AUTO-DERIVED FINGERPRINT ANCHOR.
//
// This runs FIRST so the failure message lists the full stale-ref set
// when the catalogue changes. Beyond just the hash mismatch, we also
// pin the specific sw_photoshop_5 fixture: it MUST be present in the
// stale set, otherwise someone "cleaned" the deliberate stale fixture
// without realizing it's load-bearing for the negative assertion below.
//
// Note: this anchor catches THREE failure modes at once:
//   (a) Someone removed `sw_photoshop_5`'s stale `procedural_textures`
//       ref without updating the constant.
//   (b) Someone added a new stale ref somewhere else without updating
//       the constant.
//   (c) Someone reordered TECHNOLOGY_TREE / SOFTWARE_CATALOG and the
//       `sort()` order changed (hash drift without semantic drift —
//       this is also caught as a regression signal: the sort is part
//       of the contract, not the data).
{
  const actual = deriveStaleRefSet();
  const actualFp = fingerprintStaleRefs(actual);

  check(
    "stale-ref fingerprint matches EXPECTED_STALE_FINGERPRINT (auto-derived catalogue anchor)",
    () => {
      if (actualFp !== EXPECTED_STALE_FINGERPRINT) {
        throw new Error(
          `Catalogue stale-ref drift detected.\n` +
          `  expected fingerprint: ${EXPECTED_STALE_FINGERPRINT}\n` +
          `  actual   fingerprint: ${actualFp}\n` +
          `current stale-ref set (sorted, ${actual.length} entries):\n` +
            actual.map((r) => `  ${r.source}:${r.sourceId} -> ${r.staleId}`).join("\n") +
            `\nIf this drift is intentional, regenerate via:\n` +
            `  npx tsx scripts/audit-stale-fingerprints.mjs\n` +
            `and paste the printed value into EXPECTED_STALE_FINGERPRINT.`,
        );
      }
    },
  );

  // Secondary defence: even if someone updates the fingerprint constant
  // AND removes the deliberate stale fixture in one go, this asserts
  // that the sw_photoshop_5/technically-not-effect-id pair is STILL
  // present. Without this, all four Scenario 5 checks could start
  // passing for the wrong reason.
  check(
    "deliberate stale fixture sw:sw_photoshop_5 -> procedural_textures is still present",
    () => {
      const found = actual.some(
        (r) =>
          r.source === "sw" &&
          r.sourceId === "sw_photoshop_5" &&
          r.staleId === "procedural_textures",
      );
      assert.ok(
        found,
        [
          "the deliberate stale fixture `sw:sw_photoshop_5 -> procedural_textures`",
          "is missing from SOFTWARE_CATALOG. Either you removed the",
          `\`"procedural_textures" as string\` ref, or the negative`,
          "assertion below has lost its anchor. If intentional, update",
          "EXPECTED_STALE_FINGERPRINT AND the per-fixture checks.",
        ].join(" "),
      );
    },
  );
}
{
  const baseline = getUnlockedEffectIds([]);
  const fictionalTech = "tech_does_not_exist_xyz";
  const fictionalSw = "sw_does_not_exist_xyz";

  assertSetEqual(
    "getUnlockedEffectIds([fictional tech]) === baseline",
    getUnlockedEffectIds([fictionalTech]),
    baseline,
  );

  assertSetEqual(
    "getUnlockedEffectIds([], [fictional software]) === baseline",
    getUnlockedEffectIds([], [fictionalSw]),
    baseline,
  );

  check("fictional tech + real tech + fictional sw = union of real inputs only", () => {
    const realTech = "voxel_heightfield";
    const result = getUnlockedEffectIds(
      [fictionalTech, realTech, "tech_another_fictional"],
      [fictionalSw],
    );
    const expected = new Set<string>(freeEffectIds());
    for (const id of TECHNOLOGY_TREE.find((t) => t.id === realTech)!.effectUnlocks) {
      expected.add(id);
    }
    assertSetEqual(
      "filtered union (real tech voxel_heightfield only)",
      result,
      expected,
    );
  });

  // See ⚠️ NOTE block above before changing anything in this block.
  check("sw_photoshop_5 staleness: 'procedural_textures' string-id is NOT folded into result as an effect", () => {
    const result = getUnlockedEffectIds([], ["sw_photoshop_5"]);
    assert.ok(
      !result.has("procedural_textures"),
      "expected sanitize to drop the stale tech-id-mining-as-effect-id ref",
    );
  });
  check("sw_photoshop_5 still legitimately adds 'cloth_physics'", () => {
    const result = getUnlockedEffectIds([], ["sw_photoshop_5"]);
    assert.ok(result.has("cloth_physics"));
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — getUnregisteredEffectIds: orphan audit works WITHOUT
// ALL_EFFECT_IDS.
//
// After the recent cleanup ALL_EFFECT_IDS is gone — the function derives
// the candidate set inline from `DEMO_EFFECTS.map((e) => e.id)`. We
// pin three invariants:
//
//   a. The result type is string[] (NOT Set<string>).
//   b. Every entry maps to a real DemoEffect.
//   c. No entry appears in any tech-node OR software offering's
//      effectUnlocks list. (After SANITIZING the tech/software lists
//      to drop ids not in DEMO_EFFECTS, mirroring production reality.)
//   d. The audit is COMPLETE: every DemoEffect is either declared
//      (referenced by tech OR software, post-sanitize) or appears in
//      the orphan list. Their union must equal the set of all
//      DEMO_EFFECTS ids — no gaps.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: getUnregisteredEffectIds (orphan audit, ALL_EFFECT_IDS removed)");
{
  const orphans = getUnregisteredEffectIds();

  check("returns an array (string[]), not a Set", () => {
    assert.ok(Array.isArray(orphans));
    for (const id of orphans) assert.equal(typeof id, "string");
  });

  check("every orphan id resolves to a real DemoEffect in sim/data/demoEffects", () => {
    for (const id of orphans) {
      assert.ok(
        DEMO_EFFECTS.some((e) => e.id === id),
        `orphan '${id}' not found in DEMO_EFFECTS`,
      );
    }
  });

  // Build the declared set independently from TECHNOLOGY_TREE + SOFTWARE_CATALOG
  // (not via collectDeclaredUnlocks — that would defeat the cross-check).
  // Also filter out ids that don't map to a real DemoEffect, because
  // production (getUnlockedEffectIds) sanitizes against the live DEMO_EFFECTS
  // array before exposing the result. A stale fixture like `"procedural_textures"`
  // in softwareCatalog should be invisible to the completeness invariant,
  // which tests the EFFECT universe, not the RAW declared universe.
  const declaredByHand = new Set<string>();
  for (const t of TECHNOLOGY_TREE) {
    for (const id of t.effectUnlocks) {
      if (REAL_EFFECT_IDS.has(id)) declaredByHand.add(id);
    }
  }
  for (const sw of SOFTWARE_CATALOG) {
    for (const id of sw.effectUnlocks) {
      if (REAL_EFFECT_IDS.has(id)) declaredByHand.add(id);
    }
  }

  check("no orphan id appears in the (sanitize-cleaned) declared union", () => {
    for (const id of orphans) {
      assert.ok(
        !declaredByHand.has(id),
        `orphan '${id}' was found in tech or software unlock list`,
      );
    }
  });

  check("completeness: orphans ∪ (sanitize-cleaned declared) === every DemoEffect id", () => {
    const union = new Set<string>(orphans);
    for (const id of declaredByHand) union.add(id);
    if (union.size !== REAL_EFFECT_IDS.size) {
      const missing = [...REAL_EFFECT_IDS].filter((id) => !union.has(id));
      const extra = [...union].filter((id) => !REAL_EFFECT_IDS.has(id));
      throw new Error(
        `union mismatch: missing effects ${missing.join(",") || "∅"}, extra ${extra.join(",") || "∅"}`,
      );
    }
    for (const id of REAL_EFFECT_IDS) assert.ok(union.has(id));
  });

  // Belt-and-braces: the audit's sibling collectDeclaredUnlocks does NOT
  // sanitize — it returns the raw union including stale references. Make
  // sure that's still the contract (regression: someone "fixes" it by
  // adding a sanitize and breaks the test on stale fixtures).
  check("collectDeclaredUnlocks (raw) returns string-or-string-of-tech-names, including stale refs", () => {
    const raw = collectDeclaredUnlocks();
    assert.ok(raw.has("procedural_textures"), "raw union should include the stale catalogue string");
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — Idempotence over DIFFERENT paths to the same unlock.
//
// Same input twice → same output is trivially true. The stronger
// invariant: routing the same effect via two different sources (a tech
// node AND a software offering) must produce the SAME resulting set as
// routing it via a single source. That catches a regression where one
// gate shadows another (e.g. a future "tech-only" branch that ignores
// software contributions for certain effects).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7: idempotence across cross-source paths");
{
  // Path A: cloth_physics unlocked solely via opengl_direct3d (tech).
  const pathA = getUnlockedEffectIds(["opengl_direct3d"]);
  // Path B: cloth_physics unlocked solely via sw_photoshop_5 (software).
  const pathB = getUnlockedEffectIds([], ["sw_photoshop_5"]);
  check("opengl_direct3d unlocks cloth_physics (path A)", () => {
    assert.ok(pathA.has("cloth_physics"));
  });
  check("sw_photoshop_5 unlocks cloth_physics (path B)", () => {
    assert.ok(pathB.has("cloth_physics"));
  });
  // Path C: both sources combined.
  const pathC = getUnlockedEffectIds(["opengl_direct3d"], ["sw_photoshop_5"]);
  // C must contain A's set AND B's set, since A and B are partials.
  for (const id of pathA) {
    check(`path C includes path A's '${id}'`, () => assert.ok(pathC.has(id)));
  }
  for (const id of pathB) {
    check(`path C includes path B's '${id}'`, () => assert.ok(pathC.has(id)));
  }
  // Cross-source dedup invariant: |C| ≤ |A| + |B| (everything in
  // either is in the combined set, and shared ids are deduped).
  check("path C is the union of A and B (size ≤ |A| + |B|, ≥ max(|A|, |B|))", () => {
    assert.ok(pathC.size <= pathA.size + pathB.size);
    assert.ok(pathC.size >= Math.max(pathA.size, pathB.size));
  });
  // Final cross-check: calling function twice with same inputs is idempotent.
  const a = getUnlockedEffectIds(["procedural_textures"], ["sw_octamed_pro"]);
  const b = getUnlockedEffectIds(["procedural_textures"], ["sw_octamed_pro"]);
  assertSetEqual("same inputs → identical sets (a vs b)", a, b);
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "effectUnlocks smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
