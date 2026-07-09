/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo types — effects, tech tree, productions, judging profiles,
 * artistic directions, and the multi-category score breakdown.
 */

import { PlatformId, EraId } from "./platform";

/**
 * The player-chosen creative direction for a production. Each direction
 * biases the multi-category scoring formula (see sim/domain/scoring.ts)
 * and unlocks a small set of synergy tags that boost compatible effects.
 */
export type ArtisticDirection =
  | "Technical Showcase"
  | "Artistic"
  | "Experimental"
  | "Oldschool"
  | "Music-Driven";

/** All artistic directions in display order. */
export const ARTISTIC_DIRECTIONS: ArtisticDirection[] = [
  "Technical Showcase",
  "Artistic",
  "Experimental",
  "Oldschool",
  "Music-Driven",
];

/**
 * The optimization focus the player picks before compiling. Trades off
 * development time and risk against final polish.
 *   - "Speed"          : fast turnaround, lower polish
 *   - "Balanced"       : default middle-ground
 *   - "Visual Quality" : longer dev time, higher polish, higher risk
 */
export type OptimizationFocus = "Speed" | "Balanced" | "Visual Quality";
export const OPTIMIZATION_FOCUSES: OptimizationFocus[] = [
  "Speed",
  "Balanced",
  "Visual Quality",
];

/** Human-readable duration buckets the player can pick. */
export type DemoDuration = "Short" | "Medium" | "Long" | "Epic";
export const DEMO_DURATIONS: DemoDuration[] = [
  "Short",
  "Medium",
  "Long",
  "Epic",
];

/**
 * Catalog metadata for a single visual effect. The legacy fields
 * (cpuCost, ramCostKb, difficulty, originality, audienceAppeal) are
 * retained so existing DEMO_EFFECTS entries compile unchanged; the new
 * fields below (complexity, visualImpact, compatiblePlatforms,
 * synergyTags, researchRequired) feed the expanded scoring engine.
 */
export interface DemoEffect {
  id: string;
  name: string;
  era: EraId;
  minPlatform: PlatformId;
  /** CPU power units consumed. */
  cpuCost: number;
  /** RAM cost in kilobytes. */
  ramCostKb: number;
  /** Legacy 1-100 coding difficulty. */
  difficulty: number;
  /** Legacy 1-100 originality score. */
  originality: number;
  /** Legacy 1-100 audience-appeal score. */
  audienceAppeal: number;
  category: "vector" | "raster" | "procedural" | "rendering" | "pixel_trick";
  description: string;
  /** NEW: mathematical / structural complexity, 1-100. */
  complexity: number;
  /** NEW: how visually impressive the effect is, 1-100. */
  visualImpact: number;
  /** NEW: explicit platform compatibility list. */
  compatiblePlatforms: PlatformId[];
  /** NEW: tags used for synergy matching (e.g. "plasma", "copper"). */
  synergyTags: string[];
  /** NEW: must be researched before the effect is selectable. */
  researchRequired: boolean;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  preRequisiteIds: string[];
  era: EraId;
  platformUnlocks: PlatformId[];
  effectUnlocks: string[]; // List of DemoEffect IDs unlocked
  bonusAttribute?: {
    type: "coding" | "music" | "graphics" | "size_reduction" | "optimization";
    value: number;
  };
  researched: boolean;
}

export enum ProductionType {
  Demo = "Mega-Demo",
  Intro64k = "64KB Intro",
  Intro4k = "4KB Intro",
  MusicDisk = "Music Disk",
  Cracktro = "Cracktro/Trainer",
  ArtSlide = "Slide Show"
}

export interface Production {
  id: string;
  name: string;
  year: number;
  month: number;
  type: ProductionType;
  platform: PlatformId;
  groupName: string;
  effects: string[]; // DemoEffect ids included
  codingEffort: number;
  artEffort: number;
  musicEffort: number;
  optimizationLevel: number; // 1 - 5
  compressionLevel: number;  // 1 - 5
  sizeB: number; // Actual size in bytes calculated
  scoreTechnical: number; // 0 - 100
  scoreAesthetic: number; // 0 - 100
  scoreAudio: number;     // 0 - 100
  scoreOriginality: number; // 0 - 100
  totalScore: number;     // calculated average/weighted
  reputationGained: number;
  placement?: number; // Post-party competition ranking
  partyName?: string;
  /** Optional: the player's artistic direction choice (added by the
   * expanded studio). Older saves will not have this; the UI falls
   * back to "Technical Showcase" when undefined. */
  artisticDirection?: ArtisticDirection;
  /** Optional: optimization focus the player picked before compiling. */
  optimizationFocus?: OptimizationFocus;
  /** Optional: demo duration bucket the player picked. */
  duration?: DemoDuration;
  /** Optional: storedName of the tracker module the player attached,
   * or empty string for none. */
  musicTrackStoredName?: string;
}

/**
 * Per-judging-category weight used by `sim/domain/scoring.ts` to fold a
 * `ScoreBreakdown` into a single placement score for a given party. The
 * keys here mirror the `ScoreBreakdown` fields exactly.
 */
export interface JudgingProfile {
  id: string;
  name: string;
  description: string;
  weights: {
    programming: number;
    graphics: number;
    music: number;
    originality: number;
    optimization: number;
    audienceAppeal: number;
    technicalDifficulty: number;
  };
}

/**
 * The full multi-category score breakdown for a single production. Each
 * category is 0-100; `overall` is a flat average of the seven. The
 * `*Factors` fields expose the contributing multipliers so the UI can
 * show "why this scored the way it did".
 */
export interface ScoreBreakdown {
  programming: number;
  graphics: number;
  music: number;
  originality: number;
  optimization: number;
  audienceAppeal: number;
  technicalDifficulty: number;
  overall: number;
  factors: {
    skillContributions: { programming: number; graphics: number; music: number };
    effectContributions: { visualImpact: number; complexity: number; originality: number };
    synergyBonus: number;
    directionModifier: number;
    optimizationModifier: number;
    musicModuleBonus: number;
    platformFit: number;
    developmentTimeFactor: number;
  };
  /** IDs of synergy pairs that fired (for the UI "Synergies" section). */
  synergiesTriggered: string[];
}

/**
 * One competitive prediction: the player production vs the judging
 * profile of a specific party, with a forecasted placement.
 */
export interface CompetitionPrediction {
  partyId: string;
  partyName: string;
  judgingProfileId: string;
  weightedScore: number;
  /** 1 = first place. Higher numbers are worse. */
  predictedPlacement: number;
  /** Confidence band based on how far ahead/behind the predicted field is. */
  confidence: "low" | "medium" | "high";
}

/**
 * A complete demo summary — the production, its score breakdown, the
 * competitive predictions, the awards it qualifies for, and a few
 * procedural judge comments.
 */
export interface DemoSummary {
  production: Production;
  breakdown: ScoreBreakdown;
  predictions: CompetitionPrediction[];
  awards: DemoAward[];
  judgeComments: string[];
  /** The dev time in months (derived from duration × optimization focus). */
  developmentTimeMonths: number;
}

/** An award a demo qualifies for, e.g. "Best Effects", "Audience Favorite". */
export type DemoAward =
  | "Best Effects"
  | "Best Music"
  | "Most Original"
  | "Best Optimization"
  | "Audience Favorite"
  | "Technical Marvel";

/**
 * The player's choices before compilation. `musicTrackStoredName` is the
 * storedName from the tracker-music library (see src/audio/trackerPlayer.ts);
 * an empty string means no custom track was selected.
 */
export interface DemoCreationInput {
  name: string;
  type: ProductionType;
  platform: PlatformId;
  duration: DemoDuration;
  optimizationFocus: OptimizationFocus;
  artisticDirection: ArtisticDirection;
  effects: string[];
  musicTrackStoredName: string;
  /** Allocated effort percentages — must sum to 100. */
  effort: {
    coding: number;
    art: number;
    music: number;
    optimization: number;
  };
}
