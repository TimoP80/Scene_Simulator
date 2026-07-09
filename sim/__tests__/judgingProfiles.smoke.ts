/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/data/judgingProfiles.ts` — pins the two
 * documented helper functions and protects against silent re-shuffling
 * of the era/introduction profile matrix.
 *
 *   1. `judgingProfileForParty({partyId, platformFocus, year})` —
 *      the era dispatcher. Maps C64/Amiga/PC/all-platform focus +
 *      year boundaries to 7 distinct judging profiles.
 *
 *   2. `judgingProfileForProductionType(baseProfileId, name)` —
 *      intro-override switch. When the production type is "4KB Intro"
 *      or "64KB Intro", it overrides the base profile with the
 *      dedicated intro specialist; otherwise passthrough.
 *
 * Pattern matches `scoring.smoke.ts` and `effectUnlocks.smoke.ts`:
 * `strict as assert` + custom `check(label, run)` helper + console
 * headers + exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import {
  JUDGING_PROFILES,
  judgingProfileForParty,
  judgingProfileForProductionType,
} from "@sim/data/judgingProfiles";

// ──────────────────────────────────────────────────────────────────────────
// Test scaffolding
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
// Pins the structural assumptions the dispatcher tests rely on:
//   - all 9 documented profiles present in the catalogue
//   - each profile's seven weights sum to a strictly-positive value
//     (weightedScore divides by this and would silently return 0 if
//     any profile adds up to zero)
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: judging-profiles scaffolding sanity gate");
check("JUDGING_PROFILES has the documented 9 members", () => {
  const expected = [
    "copy_party_oldschool", "horror_demos", "amiga_classic", "pc_oldschool",
    "modern_pc", "shader_modern", "intro_4k", "intro_64k", "default",
  ];
  for (const id of expected) {
    assert.ok(JUDGING_PROFILES[id], `JUDGING_PROFILES missing '${id}'`);
  }
});
check("every profile's 7 weights sum to exactly 100 (contract on weight calibration)", () => {
  // weightedScore divides by totalWeight, so any non-100 sum would skew
  // every prediction. A contributor who accidentally drops a category or
  // doubles a weight should fail this contract check loudly.
  for (const [id, profile] of Object.entries(JUDGING_PROFILES)) {
    const sum =
      profile.weights.programming +
      profile.weights.graphics +
      profile.weights.music +
      profile.weights.originality +
      profile.weights.optimization +
      profile.weights.audienceAppeal +
      profile.weights.technicalDifficulty;
    assert.equal(
      sum,
      100,
      `profile '${id}' weights sum to ${sum}, expected 100. weightedScore divides by this total, so any drift biases every prediction.`,
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — `judgingProfileForParty` dispatcher.
//
// One fixture per documented dispatcher branch:
//   - explicit partyId overrides (copy_party_1989 / venlo_party / horror_demos
//     → copy_party_oldschool; fishtank_party → horror_demos)
//   - platformFocus === "amiga" → amiga_classic
//   - platformFocus ∈ {c64, all} × year boundary at 1995
//     → pc_oldschool (year < 1995) / modern_pc (year >= 1995)
//   - platformFocus === "pc" × year boundary at 2000
//     → shader_modern (year >= 2000) / modern_pc (year < 2000)
//
// Each test fixture asserts the SPECIFIC outcome that the dispatcher's
// documented branches return. Year boundaries are explicit fixtures so
// that a contributor swapping the comparison (`< 1995` vs `<= 1994`)
// trips the test loudly.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: judgingProfileForParty dispatcher (one fixture per era/branch)");

// 1a — explicit partyId overrides (partyId check wins over platformFocus)
check("1a. copy_party_1989 + c64 + 1989 → copy_party_oldschool (partyId override)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "copy_party_1989", platformFocus: "c64", year: 1989 }),
    "copy_party_oldschool",
  );
});
check("1a. venlo_party + c64 + 1987 → copy_party_oldschool (partyId override)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "venlo_party", platformFocus: "c64", year: 1987 }),
    "copy_party_oldschool",
  );
});
check("1a. horror_demos + c64 + 1987 → copy_party_oldschool (partyId override)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "horror_demos", platformFocus: "c64", year: 1987 }),
    "copy_party_oldschool",
  );
});
check("1a. fishtank_party + all + 1992 → horror_demos (partyId → horror_demos)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "fishtank_party", platformFocus: "all", year: 1992 }),
    "horror_demos",
  );
});

// 1b — platformFocus === "amiga" → amiga_classic
check("1b. twilight_zone + amiga + 1992 → amiga_classic", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "twilight_zone", platformFocus: "amiga", year: 1992 }),
    "amiga_classic",
  );
});

// 1c — platformFocus ∈ {c64, all}, year boundary at 1995
check("1c. all-platform, year=1992 < 1995 → pc_oldschool", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "the_gathering", platformFocus: "all", year: 1992 }),
    "pc_oldschool",
  );
});
check("1c. all-platform, year=1994 (just below 1995) → pc_oldschool (boundary)", () => {
  // year=1994 → still < 1995 → pc_oldschool.
  assert.equal(
    judgingProfileForParty({ partyId: "evoke", platformFocus: "all", year: 1994 }),
    "pc_oldschool",
  );
});
check("1c. all-platform, year=1995 → modern_pc (boundary crosses to modern_pc)", () => {
  // year=1995 is NOT < 1995 → falls through to modern_pc.
  assert.equal(
    judgingProfileForParty({ partyId: "evoke", platformFocus: "all", year: 1995 }),
    "modern_pc",
  );
});
check("1c. all-platform, year=2000 → modern_pc (all-platform never hits shader_modern)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "evoke", platformFocus: "all", year: 2000 }),
    "modern_pc",
  );
});

// 1d — platformFocus === "pc", year boundary at 2000
check("1d. pc focus, year=1998 → modern_pc (year < 2000 fallback)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "chaos_constructions", platformFocus: "pc", year: 1998 }),
    "modern_pc",
  );
});
check("1d. pc focus, year=2000 → shader_modern (boundary)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "chaos_constructions", platformFocus: "pc", year: 2000 }),
    "shader_modern",
  );
});
check("1d. pc focus, year=2003 → shader_modern (mid-shader-era)", () => {
  assert.equal(
    judgingProfileForParty({ partyId: "x_party", platformFocus: "pc", year: 2003 }),
    "shader_modern",
  );
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — `judgingProfileForProductionType` intro overrides.
//
// The override takes effect ONLY for the two intro production types
// ("4KB Intro" / "64KB Intro"). Every other production type must
// pass the base profile through untouched.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: judgingProfileForProductionType intro overrides");

// 2a — both intro types override regardless of base profile
check("2a. amiga_classic + \"4KB Intro\" → intro_4k (replace, not append)", () => {
  assert.equal(judgingProfileForProductionType("amiga_classic", "4KB Intro"), "intro_4k");
});
check("2a. modern_pc + \"4KB Intro\" → intro_4k (override with any base)", () => {
  assert.equal(judgingProfileForProductionType("modern_pc", "4KB Intro"), "intro_4k");
});
check("2a. intro_4k + \"4KB Intro\" → intro_4k (override target itself: still REPLACES, doesn't append)", () => {
  // Catches a regression where the implementation accidentally
  // concatenates "intro_4k" → "intro_4k_intro_4k" instead of replacing.
  assert.equal(judgingProfileForProductionType("intro_4k", "4KB Intro"), "intro_4k");
});
check("2a. pc_oldschool + \"64KB Intro\" → intro_64k", () => {
  assert.equal(judgingProfileForProductionType("pc_oldschool", "64KB Intro"), "intro_64k");
});
check("2a. amiga_classic + \"64KB Intro\" → intro_64k", () => {
  assert.equal(judgingProfileForProductionType("amiga_classic", "64KB Intro"), "intro_64k");
});
check("2a. intro_64k + \"64KB Intro\" → intro_64k (override target: replace, not append)", () => {
  assert.equal(judgingProfileForProductionType("intro_64k", "64KB Intro"), "intro_64k");
});

// 2b — non-intro production types pass the base through untouched
check("2b. amiga_classic + \"Demo\" → amiga_classic (passthrough)", () => {
  assert.equal(judgingProfileForProductionType("amiga_classic", "Demo"), "amiga_classic");
});
check("2b. copy_party_oldschool + \"Cracktro\" → copy_party_oldschool (passthrough)", () => {
  assert.equal(
    judgingProfileForProductionType("copy_party_oldschool", "Cracktro"),
    "copy_party_oldschool",
  );
});
check("2b. shader_modern + \"MusicDisk\" → shader_modern (passthrough)", () => {
  assert.equal(
    judgingProfileForProductionType("shader_modern", "MusicDisk"),
    "shader_modern",
  );
});
check("2b. modern_pc + \"ArtSlide\" → modern_pc (passthrough)", () => {
  assert.equal(judgingProfileForProductionType("modern_pc", "ArtSlide"), "modern_pc");
});

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "judgingProfiles smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
