/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Fixture discovery for sim/__tests__/scoring.smoke.ts.
 *
 * The test pins seven-category breakdowns discovered from the scoring
 * engine. After v0.7.3 added the production-mood stage (and the test's
 * runPipeline started passing mood: "Neon Retro"), the baked constants
 * went stale. This script replicates runPipeline 1:1 and prints the
 * CURRENT engine output so the constants can be regenerated:
 *
 *   $ npx tsx tmp/discover-scoring-fixtures.ts
 */

import {
  DEMO_EFFECTS,
  EFFECT_SYNERGIES,
  JUDGING_PROFILES,
  PARTY_CALENDAR,
} from "@sim/data";
import { generateDemoSummary, weightedScore } from "@sim/domain/scoring";
import {
  ArtisticDirection,
  DemoDuration,
  OptimizationFocus,
  PlatformId,
  ProductionType,
  type DemoSummary,
  type ScoreBreakdown,
} from "@packages/types";

// Mirror of STABLE_UPCOMING_PARTIES in scoring.smoke.ts
const STABLE_UPCOMING_PARTIES = [
  { id: "twilight_zone", name: "Twilight Zone", platformFocus: "amiga" as const, prestige: 60, attendance: 700, year: 1992 },
  { id: "sun_demoparty", name: "Sun Demoparty", platformFocus: "all" as const, prestige: 78, attendance: 950, year: 1992 },
  { id: "assembly_summer", name: "Assembly Summer", platformFocus: "all" as const, prestige: 98, attendance: 3500, year: 1992 },
  { id: "the_gathering", name: "The Gathering", platformFocus: "all" as const, prestige: 92, attendance: 4500, year: 1992 },
];

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
      mood: "Neon Retro",
      effects: [...opts.effects],
      musicTrackStoredName: opts.musicModule?.format ? `fixture.${opts.musicModule.format.toLowerCase()}` : "",
      sceneCount: 1,
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

const C64 = PlatformId.C64;
const AMIGA = PlatformId.AMIGA_500;
const P3 = PlatformId.PC_PENTIUM_III;

function dump(label: string, b: ScoreBreakdown): void {
  console.log(
    `${label}: prog=${b.programming} graph=${b.graphics} music=${b.music} orig=${b.originality} opt=${b.optimization} aud=${b.audienceAppeal} tech=${b.technicalDifficulty} overall=${b.overall}`,
  );
}

console.log("=== S1 (raster_bars+sine_scroller, Tech Showcase/Balanced/Medium/C64/1992) ===");
const s1 = runPipeline({ effects: ["raster_bars", "sine_scroller"], direction: "Technical Showcase", focus: "Balanced", duration: "Medium", platform: C64, year: 1992 });
dump("S1", s1.breakdown);
console.log(`S1 directionModifier=${s1.breakdown.factors.directionModifier} optMod=${s1.breakdown.factors.optimizationModifier} devMonths=${s1.developmentTimeMonths}`);

console.log("\n=== S2 (+animated_plasma, AMIGA_500) ===");
const s2 = runPipeline({ effects: ["raster_bars", "animated_plasma", "sine_scroller"], direction: "Technical Showcase", focus: "Balanced", duration: "Medium", platform: AMIGA, year: 1992 });
dump("S2", s2.breakdown);

console.log("\n=== S3 (Artistic, raster_bars+animated_plasma, AMIGA_500) ===");
const s3 = runPipeline({ effects: ["raster_bars", "animated_plasma"], direction: "Artistic", focus: "Balanced", duration: "Medium", platform: AMIGA, year: 1992 });
dump("S3", s3.breakdown);
console.log(`S3 directionModifier=${s3.breakdown.factors.directionModifier} graphicsLift_vs_S1=${s3.breakdown.graphics - s1.breakdown.graphics}`);

console.log("\n=== S4 (Visual Quality, C64 pair) ===");
const s4 = runPipeline({ effects: ["raster_bars", "sine_scroller"], direction: "Technical Showcase", focus: "Visual Quality", duration: "Medium", platform: C64, year: 1992 });
dump("S4", s4.breakdown);
console.log(`S4 optMod=${s4.breakdown.factors.optimizationModifier}`);

console.log("\n=== S5 (XM 128KB, Music-Driven, C64 pair) ===");
const s5 = runPipeline({ effects: ["raster_bars", "sine_scroller"], direction: "Music-Driven", focus: "Balanced", duration: "Medium", musicModule: { format: "XM", sizeBytes: 131072 }, platform: C64, year: 1992 });
dump("S5", s5.breakdown);
console.log(`S5 musicModuleBonus=${s5.breakdown.factors.musicModuleBonus}`);

console.log("\n=== S6 (voxel/texture/raymarch, Experimental/VisualQuality/Long, P3) ===");
const s6 = runPipeline({ effects: ["voxel_hills", "texture_mapper", "raymarching_3d"], direction: "Experimental", focus: "Visual Quality", duration: "Long", platform: P3, year: 1992 });
dump("S6", s6.breakdown);
console.log(`S6 platformFit=${s6.breakdown.factors.platformFit}`);

console.log("\n=== S7 (Epic × Experimental × Visual Quality, C64 pair) ===");
const s7 = runPipeline({ effects: ["raster_bars", "sine_scroller"], direction: "Experimental", focus: "Visual Quality", duration: "Epic", platform: C64, year: 1992 });
dump("S7", s7.breakdown);
console.log(`S7 devMonths=${s7.developmentTimeMonths} devTimeFactor=${s7.breakdown.factors.developmentTimeFactor}`);

console.log("\n=== S9 weightedScore table (fixed breakdown) ===");
const fixedBreakdown: ScoreBreakdown = {
  programming: 60, graphics: 70, music: 55, originality: 65,
  optimization: 50, audienceAppeal: 60, technicalDifficulty: 55, overall: 59,
  factors: {
    skillContributions: { programming: 60, graphics: 60, music: 60 },
    effectContributions: { visualImpact: 70, complexity: 60, originality: 65 },
    synergyBonus: 0, directionModifier: 50, optimizationModifier: 55,
    musicModuleBonus: 0, platformFit: 80, developmentTimeFactor: 60,
    productionTypeModifier: 50,
    sceneVarietyBonus: 0,
    moodModifier: 0,
  },
  synergiesTriggered: [],
};
for (const [id, profile] of Object.entries(JUDGING_PROFILES)) {
  console.log(`S9 ${id}: ${weightedScore(fixedBreakdown, profile)}`);
}
