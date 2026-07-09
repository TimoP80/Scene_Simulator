/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `sim/domain/scoring.ts` — pins the 10-stage scoring
 * pipeline (`generateDemoSummary`):
 *   1. computeSkillContributions
 *   2. computeEffectContributions
 *   3. applySynergies
 *   4. applyArtisticDirection
 *   5. applyOptimizationFocus
 *   6. applyMusicModuleBonus
 *   7. applyPlatformFit
 *   8. applyDevelopmentTime
 *   9. sumCategories + overall
 *  10. predictPlacements
 *
 * For each scenario below we run a fixed seed through the pipeline and
 * assert the seven-category breakdown to ±1 (one rounding tolerance).
 * The reference values were discovered via
 *   $ npx tsx tmp/discover-scoring-fixtures.mjs
 * and are baked into `EXPECTED_*` constants below. A regression that
 * shifts any category by ≤1 is accepted (single-step rounding slop);
 * a regression that shifts by >1 fails loudly with the strict diff.
 *
 * Pattern matches the other smokes: assert + check(label, run) +
 * console-logged scenarios + exit 1 on any failure.
 */

import { strict as assert } from "node:assert";

import {
  DEMO_EFFECTS,
  EFFECT_SYNERGIES,
  JUDGING_PROFILES,
  PARTY_CALENDAR,
} from "@sim/data";
import {
  generateDemoSummary,
  weightedScore,
} from "@sim/domain/scoring";
import {
  ArtisticDirection,
  DemoDuration,
  OptimizationFocus,
  PlatformId,
  ProductionType,
  type DemoSummary,
  type ScoreBreakdown,
} from "@packages/types";

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

/** Assert actual value is within ±tolerance (inclusive) of expected. */
function assertInTol(label: string, actual: number, expected: number, tol: number): void {
  check(label, () => {
    const lo = expected - tol;
    const hi = expected + tol;
    if (actual < lo || actual > hi) {
      throw new Error(
        `expected ${expected} ±${tol} (range ${lo}..${hi}), got ${actual}`,
      );
    }
  });
}

/** Assert a seven-category breakdown field is within ±1 of expected. */
function assertBreakdownTol(
  label: string,
  breakdown: ScoreBreakdown,
  expected: { programming: number; graphics: number; music: number; originality: number; optimization: number; audienceAppeal: number; technicalDifficulty: number },
): void {
  assertInTol(`${label} programming`, breakdown.programming, expected.programming, 1);
  assertInTol(`${label} graphics`, breakdown.graphics, expected.graphics, 1);
  assertInTol(`${label} music`, breakdown.music, expected.music, 1);
  assertInTol(`${label} originality`, breakdown.originality, expected.originality, 1);
  assertInTol(`${label} optimization`, breakdown.optimization, expected.optimization, 1);
  assertInTol(`${label} audienceAppeal`, breakdown.audienceAppeal, expected.audienceAppeal, 1);
  assertInTol(`${label} technicalDifficulty`, breakdown.technicalDifficulty, expected.technicalDifficulty, 1);
}

// ──────────────────────────────────────────────────────────────────────────
// Stage 0 — Build a known-stable upcomingParties list.
//
// The discovery used PARTY_CALENDAR.filter(year === target || year+1),
// which yielded twilight_zone, sun_demoparty, assembly_summer, and
// the_gathering for year=1992 — in that order (calendar order, which
// differs slightly across fresh edits). Pin them here as a stable list
// so the test is deterministic across `git log` of `partyCalendar.ts`.
// ──────────────────────────────────────────────────────────────────────────

const STABLE_UPCOMING_PARTIES = [
  {
    id: "twilight_zone",
    name: "Twilight Zone",
    platformFocus: "amiga" as const,
    prestige: 60,
    attendance: 700,
    year: 1992,
  },
  {
    id: "sun_demoparty",
    name: "Sun Demoparty",
    platformFocus: "all" as const,
    prestige: 78,
    attendance: 950,
    year: 1992,
  },
  {
    id: "assembly_summer",
    name: "Assembly Summer",
    platformFocus: "all" as const,
    prestige: 98,
    attendance: 3500,
    year: 1992,
  },
  {
    id: "the_gathering",
    name: "The Gathering",
    platformFocus: "all" as const,
    prestige: 92,
    attendance: 4500,
    year: 1992,
  },
];

// One-call builder for the per-scenario `DemoSummary`. Centralising
// here means each scenario pins ONLY the inputs it cares about.
function runPipeline(opts: {
  effects: string[];
  direction: ArtisticDirection;
  focus: OptimizationFocus;
  duration: DemoDuration;
  platform: PlatformId;
  year: number;
  musicModule?: { format: "MOD" | "XM" | "IT" | "S3M" | "OTHER"; sizeBytes: number };
  effort?: { coding: number; art: number; music: number; optimization: number };
  prodType?: ProductionType;
}): DemoSummary {
  const resolved = opts.effects
    .map((id) => DEMO_EFFECTS.find((e) => e.id === id))
    .filter((e): e is NonNullable<typeof e> => e !== undefined);
  const effort = opts.effort ?? { coding: 40, art: 30, music: 20, optimization: 10 };
  return generateDemoSummary({
    creation: {
      name: "SCORE_FIXTURE",
      type: opts.prodType ?? ProductionType.Demo,
      platform: opts.platform,
      duration: opts.duration,
      optimizationFocus: opts.focus,
      artisticDirection: opts.direction,
      effects: [...opts.effects],
      musicTrackStoredName: opts.musicModule?.format
        ? `fixture.${opts.musicModule.format.toLowerCase()}`
        : "",
      effort,
    },
    effects: resolved,
    crewSkills: { programming: 50, graphics: 50, music: 50 },
    musicModule: opts.musicModule,
    platform: { id: opts.platform, cpuLimit: 1000, ramLimitKb: 4096 },
    upcomingParties: STABLE_UPCOMING_PARTIES,
    currentYear: opts.year,
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 0 — Scaffolding sanity.
//
// Pins the structural assumptions: imports resolve, the synergy
// catalogue is non-empty, the upcomingParties list above covers the
// test helpers' promises. If any of these trip later, all downstream
// scenarios will look broken.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 0: scoring pipeline scaffolding sanity gate");
check("DEMO_EFFECTS / EFFECT_SYNERGIES / PARTY_CALENDAR non-empty", () => {
  assert.ok(DEMO_EFFECTS.length > 0);
  assert.ok(EFFECT_SYNERGIES.length > 0);
  assert.ok(PARTY_CALENDAR.length > 0);
});
check("JUDGING_PROFILES has the documented 9 members (10 era + intro variants + default)", () => {
  const expected = [
    "copy_party_oldschool", "horror_demos", "amiga_classic", "pc_oldschool",
    "modern_pc", "shader_modern", "intro_4k", "intro_64k", "default",
  ];
  for (const id of expected) {
    assert.ok(JUDGING_PROFILES[id], `JUDGING_PROFILES missing '${id}'`);
  }
});
check("STABLE_UPCOMING_PARTIES has all 4 pinned parties (calendar order)", () => {
  assert.equal(STABLE_UPCOMING_PARTIES.length, 4);
  for (const party of STABLE_UPCOMING_PARTIES) {
    const partyId = party.id;
    assert.ok(
      PARTY_CALENDAR.some((p) => p.id === partyId),
      `STABLE_UPCOMING_PARTIES references missing party: ${partyId}`,
    );
  }
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — C64 baseline: Technical Showcase / Balanced / Medium, two
// free-effects (raster_bars + sine_scroller), no music.
//
// This pin walks ALL TEN stages:
//   1+2 → skill factors 53/48/42, effect factors 50/18.5/17.5
//   3   → no synergies fire (raster_bars + sine_scroller isn't a pair)
//   4   → Technical Showcase multiplies: prog×1.25, graph×0.9, music×0.9
//   5   → Balanced doesn't shift anything
//   6   → no music module
//   7   → C64 easily handles these two effects → platformFit 100
//   8   → Medium (2mo) × Balanced (1.0) × Tech Showcase (1.15) = 2.3 → 2 months
//   9   → sumCategories rounds, overall = 42
//  10   → 4 predictions against the stable upcoming list
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: C64 baseline — Technical Showcase / Balanced / Medium, 2 free effects");
{
  const summary = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Technical Showcase",
    focus: "Balanced",
    duration: "Medium",
    platform: PlatformId.C64,
    year: 1992,
  });

  assertBreakdownTol("S1 baseline", summary.breakdown, {
    programming: 66,
    graphics: 46,
    music: 38,
    originality: 18,
    optimization: 51,
    audienceAppeal: 34,
    technicalDifficulty: 40,
  });

  check("S1 overall = 42 (rounded mean of 7 categories)", () => {
    assert.equal(summary.breakdown.overall, 42);
  });

  check("S1: raster_bars + sine_scroller is NOT a synergy pair (synergiesTriggered empty)", () => {
    assert.deepEqual(summary.breakdown.synergiesTriggered, []);
  });

  check("S1: production.totalScore mirrors overall", () => {
    assert.equal(summary.production.totalScore, summary.breakdown.overall);
  });

  check("S1: developmentTimeMonths = 2 (Medium × Balanced × Tech Showcase = 2×1.0×1.15 = 2.3 → 2)", () => {
    assert.equal(summary.developmentTimeMonths, 2);
  });

  check("S1: factors populated (each reasoning field non-zero / defined)", () => {
    assert.equal(summary.breakdown.factors.synergyBonus, 0);
    assert.equal(summary.breakdown.factors.musicModuleBonus, 0);
    assert.equal(summary.breakdown.factors.platformFit, 100);
    assert.ok(summary.breakdown.factors.directionModifier >= 0);
    assert.ok(summary.breakdown.factors.optimizationModifier >= 0);
    assert.ok(summary.breakdown.factors.developmentTimeFactor >= 0);
  });

  check("S1: 4 predictions against STABLE_UPCOMING_PARTIES", () => {
    assert.equal(summary.predictions.length, 4);
    for (const pred of summary.predictions) {
      assert.ok(typeof pred.partyId === "string");
      assert.ok(typeof pred.judgingProfileId === "string");
      assert.ok(pred.weightedScore >= 0 && pred.weightedScore <= 100);
      // predictedPlacement is clamped: max is buildFieldStrength || 8.
      assert.ok(pred.predictedPlacement >= 1);
      assert.ok(["low", "medium", "high"].includes(pred.confidence));
    }
  });

  check("S1: predictions sorted ASCENDING by predictedPlacement (best first)", () => {
    for (let i = 1; i < summary.predictions.length; i++) {
      const prev = summary.predictions[i - 1]!.predictedPlacement;
      const curr = summary.predictions[i]!.predictedPlacement;
      assert.ok(
        prev <= curr,
        `predictions not sorted: [${i - 1}]=${prev}, [${i}]=${curr}`,
      );
    }
  });

  check("S1: no awards qualify (all 7 categories < 82)", () => {
    assert.equal(summary.awards.length, 0);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — Synergy activation.
//
// Add animated_plasma (free) to bring the effect set to
// {raster_bars, animated_plasma, sine_scroller}. The synergy
// `syn_plasma_copper` (animated_plasma + raster_bars) should fire,
// contributing +8 graphics and +6 audienceAppeal.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: animated_plasma triggers syn_plasma_copper");
{
  const summary = runPipeline({
    effects: ["raster_bars", "animated_plasma", "sine_scroller"],
    direction: "Technical Showcase",
    focus: "Balanced",
    duration: "Medium",
    platform: PlatformId.AMIGA_500,
    year: 1992,
  });

  check("S2: synergiesTriggered includes syn_plasma_copper (animated_plasma + raster_bars)", () => {
    assert.ok(
      summary.breakdown.synergiesTriggered.includes("syn_plasma_copper"),
      `synergiesTriggered=${JSON.stringify(summary.breakdown.synergiesTriggered)}`,
    );
  });

  check("S2: factors.synergyBonus = 14 (8 graphics + 6 audienceAppeal)", () => {
    // sum of all numeric entries in syn_plasma_copper.bonus
    assertInTol("S2 synergyBonus", summary.breakdown.factors.synergyBonus, 14, 0);
  });

  // Compare against S1's graphics (46 ±1) — adding plasma + synergy
  // should push graphics up by roughly +7 (synergy) + rating uplift.
  assertInTol("S2 graphics", summary.breakdown.graphics, 53, 1);
  assertInTol("S2 audienceAppeal", summary.breakdown.audienceAppeal, 39, 1);

  check("S2 overall = 44", () => {
    assert.equal(summary.breakdown.overall, 44);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — Artistic direction modifier.
//
// Same effect set as S2, but direction = Artistic reverses the bias:
//   programming × 0.9, graphics × 1.3, audienceAppeal × 1.25, etc.
// Verifies that the same inputs produce DRAMATICALLY different
// breakdowns after just one knob change.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: Artistic direction flips the bias");
{
  const summary = runPipeline({
    effects: ["raster_bars", "animated_plasma"],
    direction: "Artistic",
    focus: "Balanced",
    duration: "Medium",
    platform: PlatformId.AMIGA_500,
    year: 1992,
  });

  assertBreakdownTol("S3 Artistic", summary.breakdown, {
    programming: 48,
    graphics: 79,
    music: 51,
    originality: 31,
    optimization: 36,
    audienceAppeal: 61,
    technicalDifficulty: 27,
  });

  check("S3 overall = 47", () => {
    assert.equal(summary.breakdown.overall, 47);
  });

  // Cross-check: graphics + audienceAppeal should both SKYROCKET vs
  // S1 baseline because Artistic's multipliers (×1.3, ×1.25) are large.
  check("S3: graphics jumped from ~46 (S1) to ~79 due to Artistic ×1.3", () => {
    // Already pinned at 79 ±1 by assertBreakdownTol; this asserts the
    // STORY (Artistic lifts graphics) not just the value.
    assertInTol("S3 graphics vs S1 lift", summary.breakdown.graphics - 46, 33, 2);
  });

  // dimensionModifier should differ — Artistic's modified factors are
  // weighted toward graphics/aesthetic, not programming.
  check("S3: factors.directionModifier increases vs S1 (40→59 from baseline)", () => {
    assertInTol("S3 directionModifier", summary.breakdown.factors.directionModifier, 59, 1);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — Optimization focus: Visual Quality.
//
// Same C64 baseline pair, but focus = Visual Quality.
//   +8 graphics, +4 audienceAppeal, −5 optimization
// Verifies the tradeoff between raw visual polish and frame budget.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: Optimization Focus = Visual Quality");
{
  const visualQuality = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Technical Showcase",
    focus: "Visual Quality",
    duration: "Medium",
    platform: PlatformId.C64,
    year: 1992,
  });

  // Visual Quality nudges: graphics +8 (46→56), audienceAppeal +4 (34→38),
  // optimization −3 (51→48 due to dev time factor minor bump).
  assertInTol("S4 graphics (Visual Quality +8)", visualQuality.breakdown.graphics, 56, 1);
  assertInTol(
    "S4 audienceAppeal (Visual Quality +4)",
    visualQuality.breakdown.audienceAppeal,
    38,
    1,
  );
  assertInTol(
    "S4 optimization (Visual Quality −3)",
    visualQuality.breakdown.optimization,
    48,
    1,
  );

  // Optimization modifier should be 35 (Visual Quality penalty).
  check("S4: factors.optimizationModifier = 35 (Visual Quality penalty)", () => {
    assert.equal(visualQuality.breakdown.factors.optimizationModifier, 35);
  });

  check("S4 overall = 43", () => {
    assert.equal(visualQuality.breakdown.overall, 43);
  });

  // Cross-check the tradeoff: Visual Quality must LIFT graphics AND
  // LOWER optimization vs Balanced (S1) — neither alone is the
  // trade, both must shift.
  const s1 = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Technical Showcase",
    focus: "Balanced",
    duration: "Medium",
    platform: PlatformId.C64,
    year: 1992,
  });
  check("S4 vs S1: graphics strictly HIGHER; optimization strictly LOWER", () => {
    assert.ok(
      visualQuality.breakdown.graphics > s1.breakdown.graphics,
      `S4 graphics ${visualQuality.breakdown.graphics} should > S1 ${s1.breakdown.graphics}`,
    );
    assert.ok(
      visualQuality.breakdown.optimization < s1.breakdown.optimization,
      `S4 optimization ${visualQuality.breakdown.optimization} should < S1 ${s1.breakdown.optimization}`,
    );
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — Music module bonus.
//
// A custom tracker module from the user's playlist adds format + size
// bonuses to the music category. XM @ 128KB → +6 (format) + 12 (size).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: XM music module (128 KB)");
{
  const summary = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Music-Driven",
    focus: "Balanced",
    duration: "Medium",
    musicModule: { format: "XM", sizeBytes: 131072 }, // 128 KB
    platform: PlatformId.C64,
    year: 1992,
  });

  check("S5: factors.musicModuleBonus = 18 (XM=6 + size/64 clamped to 12)", () => {
    assert.equal(summary.breakdown.factors.musicModuleBonus, 18);
  });

  // Music-Driven multipliers: programming=0.95, music=1.4, audienceAppeal=1.3
  // combined with the module bonus → music should be the highest category
  // and audienceAppeal very high.
  assertInTol("S5 music", summary.breakdown.music, 77, 1);
  assertInTol("S5 audienceAppeal", summary.breakdown.audienceAppeal, 61, 1);

  check("S5 overall = 47", () => {
    assert.equal(summary.breakdown.overall, 47);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — Platform strain (PC_Pentium_III, Experimental, shader effects).
//
// Effects voxel_hills + texture_mapper + raymarching_3d push the rig
// to its CPU+RAM limits. Verifies:
//   - stage 7 (applyPlatformFit) reduces platformFit < 100
//   - syn_voxel_texmap (voxel_hills + texture_mapper) fires
//   - 4 predictions against the STABLE list (year=2003 in scenario
//     year, but stable party list still applies)
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: PC strain (shader effects, Experimental, Visual Quality)");
{
  const summary = runPipeline({
    effects: ["voxel_hills", "texture_mapper", "raymarching_3d"],
    direction: "Experimental",
    focus: "Visual Quality",
    duration: "Long",
    platform: PlatformId.PC_PENTIUM_III,
    year: 1992,
  });

  check("S6: synergiesTriggered includes syn_voxel_texmap (voxel_hills + texture_mapper)", () => {
    assert.ok(
      summary.breakdown.synergiesTriggered.includes("syn_voxel_texmap"),
      `synergiesTriggered=${JSON.stringify(summary.breakdown.synergiesTriggered)}`,
    );
  });

  // Platform strain should pull platformFit WELL below S1's 100.
  check("S6: factors.platformFit < 90 (strain visible)", () => {
    assert.ok(
      summary.breakdown.factors.platformFit < 90,
      `platformFit=${summary.breakdown.factors.platformFit} should be < 90`,
    );
  });

  // Experimental direction caps originality at the multiplier (×1.4)
  // and a starting pool of 81.67 effect-avg → capped at 100.
  assertInTol("S6 originality (Experimental ×1.4, capped at 100)", summary.breakdown.originality, 100, 0);

  check("S6: 4 predictions (Stable upcoming parties regardless of year=2003)", () => {
    assert.equal(summary.predictions.length, 4);
  });

  check("S6 overall = 57", () => {
    assert.equal(summary.breakdown.overall, 57);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — Development time factor (Epic + Experimental + VQ).
//
// months = baseMonths[Epic=7] × dirMultiplier[Experimental=1.3] ×
//          focusMultiplier[Visual Quality=1.6]
//        = 7 × 1.3 × 1.6 = 14.56 → 15 months
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7: Epic duration × Experimental × Visual Quality → 15 dev months");
{
  const summary = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Experimental",
    focus: "Visual Quality",
    duration: "Epic",
    platform: PlatformId.C64,
    year: 1992,
  });

  check("S7: developmentTimeMonths = 15 (round(7 × 1.3 × 1.6) = round(14.56))", () => {
    assert.equal(summary.developmentTimeMonths, 15);
  });

  // Longer dev = more polish. developmentTimeFactor for 15 months =
  // clamp(50 + 15×4 - 15×2) = clamp(50 + 60 - 30) = 80.
  check("S7: factors.developmentTimeFactor = 80 (=50+(60−30))", () => {
    assertInTol("S7 devTimeFactor", summary.breakdown.factors.developmentTimeFactor, 80, 0);
  });

  // Audience appeal shouldn't get a free ride; with Experimental
  // multipliers and 15 months polish, expect middle-of-pack values.
  check("S7 overall = 45", () => {
    assert.equal(summary.breakdown.overall, 45);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — Prediction ordering invariant.
//
// Across S1's predictions, placements strictly increase with prestige +
// attendance (bigger field = later placement for the same weighted
// score). This pins the monotonicity of stage 10.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 8: weightedScore ordering is monotonic in field-strength");
{
  const summary = runPipeline({
    effects: ["raster_bars", "sine_scroller"],
    direction: "Technical Showcase",
    focus: "Balanced",
    duration: "Medium",
    platform: PlatformId.C64,
    year: 1992,
  });

  check("S8: predictions are sorted ASCENDING by predictedPlacement", () => {
    for (let i = 1; i < summary.predictions.length; i++) {
      const prev = summary.predictions[i - 1]!.predictedPlacement;
      const curr = summary.predictions[i]!.predictedPlacement;
      assert.ok(prev <= curr, `[${i - 1}]=${prev}, [${i}]=${curr}`);
    }
  });

  check("S8: every prediction's partyReference resolves to STABLE_UPCOMING_PARTIES (id+name+year match)", () => {
    for (const pred of summary.predictions) {
      const stable = STABLE_UPCOMING_PARTIES.find((p) => p.id === pred.partyId);
      assert.ok(stable, `prediction ${pred.partyId} not in STABLE_UPCOMING_PARTIES`);
      assert.equal(pred.partyName, stable!.name);
      assert.equal(stable!.year, 1992);
    }
  });

  check("S8: weighting profiles (judgingProfileId) are non-empty strings drawn from JUDGING_PROFILES", () => {
    for (const pred of summary.predictions) {
      assert.ok(
        typeof pred.judgingProfileId === "string" && pred.judgingProfileId.length > 0,
        `judgingProfileId invalid for ${pred.partyId}`,
      );
      // Each profile must resolve (existing port to modern_pc / amiga_classic etc.)
      assert.ok(
        JUDGING_PROFILES[pred.judgingProfileId] || pred.judgingProfileId === "intro_4k" || pred.judgingProfileId === "intro_64k",
        `judgingProfileId ${pred.judgingProfileId} not in catalogue`,
      );
    }
  });
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 9 — weightedScore reference values.
//
// The fixed breakdown pins to known weighted scores per judging
// profile (50/60/55 spread). Asserts stage 10 + the standalone
// weightedScore helper, both to ±1 (single rounding tolerance).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 9: weightedScore reference table (fixed breakdown, every profile)");
{
  const fixedBreakdown: ScoreBreakdown = {
    programming: 60, graphics: 70, music: 55, originality: 65,
    optimization: 50, audienceAppeal: 60, technicalDifficulty: 55, overall: 59,
    factors: {
      skillContributions: { programming: 60, graphics: 60, music: 60 },
      effectContributions: { visualImpact: 70, complexity: 60, originality: 65 },
      synergyBonus: 0, directionModifier: 50, optimizationModifier: 55,
      musicModuleBonus: 0, platformFit: 80, developmentTimeFactor: 60,
    },
    synergiesTriggered: [],
  };

  const expected = {
    copy_party_oldschool: 58,
    horror_demos: 59,
    amiga_classic: 60,
    pc_oldschool: 59,
    modern_pc: 61,
    shader_modern: 60,
    intro_4k: 59,
    intro_64k: 60,
    default: 59,
  };

  for (const [profileId, profile] of Object.entries(JUDGING_PROFILES)) {
    const computed = weightedScore(fixedBreakdown, profile);
    assertInTol(
      `S9: weightedScore[${profileId}]`,
      computed,
      expected[profileId as keyof typeof expected],
      1,
    );
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 10 — Idempotence.
//
// Calling generateDemoSummary twice with the same inputs must produce
// identical breakdowns (no hidden state, no RNG, no Date.now).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 10: idempotence over repeated runs");
{
  const opts = {
    effects: ["raster_bars", "sine_scroller"],
    direction: "Technical Showcase" as const,
    focus: "Balanced" as const,
    duration: "Medium" as const,
    platform: PlatformId.C64,
    year: 1992,
  };
  const a = runPipeline(opts);
  const b = runPipeline(opts);

  check("S10: identical breakdown (a vs b)", () => {
    assert.deepEqual(a.breakdown, b.breakdown);
  });
  check("S10: identical predictions (a vs b)", () => {
    assert.deepEqual(a.predictions, b.predictions);
  });
  check("S10: identical awards + judgeComments + developmentTimeMonths", () => {
    assert.equal(a.developmentTimeMonths, b.developmentTimeMonths);
    assert.deepEqual(a.awards, b.awards);
    assert.deepEqual(a.judgeComments, b.judgeComments);
  });
}

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${
    failures === 0
      ? "scoring smoke all green."
      : `${failures} check(s) failed.`
  }`,
);
if (failures > 0) process.exit(1);
