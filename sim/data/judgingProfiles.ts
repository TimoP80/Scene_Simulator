/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * JUDGING_PROFILES — per-party weighting of the seven scoring
 * categories. The scoring engine multiplies a `ScoreBreakdown` by these
 * weights to produce a single placement score.
 *
 * Why profiles per party (and not a single default):
 *   A "Modern PC Party" like Assembly or X weighs Visual Quality,
 *   Originality, and Music heavily. An "Oldschool Party" like
 *   Copy Party or Horror Demos weighs Programming, Optimization, and
 *   Hardware Efficiency. Encoding those biases as data lets a future
 *   "themed party" or "year-specific revision" land without engine
 *   changes.
 */

import type { JudgingProfile } from "@packages/types";

export const JUDGING_PROFILES: Record<string, JudgingProfile> = {
  // ---- 8-BIT / OLD-SCHOOL ----
  copy_party_oldschool: {
    id: "copy_party_oldschool",
    name: "Oldschool C64 Cracktro",
    description:
      "Cycle-exact 6502 abuse wins. The audience claps for raster timing, not for shaders.",
    weights: {
      programming: 25,
      graphics: 10,
      music: 15,
      originality: 10,
      optimization: 20,
      audienceAppeal: 10,
      technicalDifficulty: 10,
    },
  },
  horror_demos: {
    id: "horror_demos",
    name: "Oldschool Demo Party",
    description:
      "Hardware efficiency, register tricks, and that unmistakable BBS-room atmosphere.",
    weights: {
      programming: 22,
      graphics: 13,
      music: 15,
      originality: 10,
      optimization: 20,
      audienceAppeal: 10,
      technicalDifficulty: 10,
    },
  },
  // ---- 16-BIT AMIGA ----
  amiga_classic: {
    id: "amiga_classic",
    name: "Amiga Classic",
    description:
      "Copper lists, blitter, and chunky-to-planar routines. The audience rewards original composition over raw polygons.",
    weights: {
      programming: 18,
      graphics: 18,
      music: 18,
      originality: 14,
      optimization: 14,
      audienceAppeal: 8,
      technicalDifficulty: 10,
    },
  },
  // ---- 16-BIT HYBRID / PC DAWN ----
  pc_oldschool: {
    id: "pc_oldschool",
    name: "DOS PC Oldschool",
    description:
      "Mode 13h, GUS, no GPU. Cycle-exact 386/486 routines still mean something here.",
    weights: {
      programming: 20,
      graphics: 15,
      music: 15,
      originality: 12,
      optimization: 20,
      audienceAppeal: 8,
      technicalDifficulty: 10,
    },
  },
  // ---- PC DAWN / EARLY 3D ----
  modern_pc: {
    id: "modern_pc",
    name: "Modern PC Party",
    description:
      "Visual quality and originality carry the room. Music sync is a tiebreaker. Optimization is appreciated but not the headline.",
    weights: {
      programming: 10,
      graphics: 22,
      music: 18,
      originality: 18,
      optimization: 8,
      audienceAppeal: 14,
      technicalDifficulty: 10,
    },
  },
  // ---- MODERN SHADER / 64K ----
  shader_modern: {
    id: "shader_modern",
    name: "Shader Modern / 64K-Intro",
    description:
      "Brute-force shader work and procedural synthesis under brutal byte limits. Programming and originality dominate.",
    weights: {
      programming: 18,
      graphics: 18,
      music: 12,
      originality: 18,
      optimization: 14,
      audienceAppeal: 8,
      technicalDifficulty: 12,
    },
  },
  // ---- 4K INTRO ----
  intro_4k: {
    id: "intro_4k",
    name: "4K Intro Specialist",
    description:
      "Squeezing a universe into 4096 bytes. Programming, optimization, and originality are everything.",
    weights: {
      programming: 22,
      graphics: 14,
      music: 10,
      originality: 16,
      optimization: 22,
      audienceAppeal: 6,
      technicalDifficulty: 10,
    },
  },
  intro_64k: {
    id: "intro_64k",
    name: "64K Intro Specialist",
    description:
      "More room than 4K, but the same discipline. Visual quality + original synthesis under 65536 bytes.",
    weights: {
      programming: 18,
      graphics: 18,
      music: 12,
      originality: 16,
      optimization: 16,
      audienceAppeal: 10,
      technicalDifficulty: 10,
    },
  },
  // ---- DEFAULT (catch-all) ----
  default: {
    id: "default",
    name: "Balanced Default",
    description:
      "Generic profile used when no party-specific profile matches the era.",
    weights: {
      programming: 15,
      graphics: 15,
      music: 15,
      originality: 15,
      optimization: 15,
      audienceAppeal: 10,
      technicalDifficulty: 15,
    },
  },
};

/**
 * Pick the right judging profile for a given party. Maps the party's
 * `platformFocus` and `id` to a profile id:
 *   - 1985-1989 / C64 / ZX  -> copy_party_oldschool
 *   - Amiga 16-bit parties    -> amiga_classic
 *   - PC 386/486 DOS parties  -> pc_oldschool
 *   - PC_Pentium+ parties     -> shader_modern (or modern_pc fallback)
 *   - Intro4k productions     -> intro_4k
 *   - Intro64k productions    -> intro_64k
 *   - else                    -> modern_pc
 */
export function judgingProfileForParty(args: {
  partyId: string;
  platformFocus: "c64" | "amiga" | "pc" | "all";
  year: number;
}): string {
  const { partyId, platformFocus, year } = args;
  if (partyId === "copy_party_1989" || partyId === "horror_demos" || partyId === "venlo_party") {
    return "copy_party_oldschool";
  }
  if (partyId === "fishtank_party") {
    return "horror_demos";
  }
  if (platformFocus === "amiga") {
    return "amiga_classic";
  }
  if (platformFocus === "c64" || platformFocus === "all") {
    // Old-school / mixed: weight toward programming + optimization.
    if (year < 1995) return "pc_oldschool";
    return "modern_pc";
  }
  // PC focus.
  if (year >= 2000) return "shader_modern";
  return "modern_pc";
}

/** Switch to the intro-specific profile when scoring a 4K/64K entry. */
export function judgingProfileForProductionType(
  baseProfileId: string,
  productionTypeName: string
): string {
  if (productionTypeName === "4KB Intro") return "intro_4k";
  if (productionTypeName === "64KB Intro") return "intro_64k";
  return baseProfileId;
}
