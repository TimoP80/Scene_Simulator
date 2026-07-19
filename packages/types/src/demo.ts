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

/**
 * Transition style between demo scenes. Adds variety to the demo
 * structure and can influence audience appeal scoring.
 */
export type SceneTransition =
  | "cut"
  | "fade_to_black"
  | "crossfade"
  | "slide_left"
  | "slide_right"
  | "zoom_in"
  | "dissolve";

/** All scene transitions in display order. */
export const SCENE_TRANSITIONS: SceneTransition[] = [
  "cut",
  "fade_to_black",
  "crossfade",
  "slide_left",
  "slide_right",
  "zoom_in",
  "dissolve",
];

/**
 * A single scene within a production. Each scene has its own subset
 * of effects, a transition from the previous scene, and a label.
 */
export interface DemoScene {
  id: string;
  name: string;
  /** Effect ids selected for this scene. */
  effects: string[];
  /** Transition from the previous scene (first scene ignores this). */
  transition: SceneTransition;
  /** Duration bucket override (falls back to production duration). */
  durationOverride?: DemoDuration;
}

/**
 * Per-production-type configuration — controls how many effects
 * can be selected, size budgets, and scoring bonuses.
 */
export interface ProductionTypeConfig {
  /** Production type this config applies to. */
  type: ProductionType;
  /** Display label. */
  label: string;
  /** Human-readable description of what this production type is about. */
  description: string;
  /** Maximum number of effects that can be selected. 0 = unlimited. */
  maxEffects: number;
  /** Maximum file size in bytes. 0 = no limit. */
  sizeLimitB: number;
  /** Default effect slots available. */
  defaultSceneCount: number;
  /** Whether multi-scene sequencing is supported. */
  supportsScenes: boolean;
  /** Per-category score bonus/penalty applied to the production. */
  scoreBonuses: {
    programming: number;
    graphics: number;
    music: number;
    originality: number;
    optimization: number;
    audienceAppeal: number;
    technicalDifficulty: number;
  };
  /** Recommended minimum effort percentages. */
  suggestedEffort: {
    coding: number;
    art: number;
    music: number;
    optimization: number;
  };
}

export const PRODUCTION_TYPE_CONFIGS: Record<ProductionType, ProductionTypeConfig> = {
  [ProductionType.Demo]: {
    type: ProductionType.Demo,
    label: "Mega-Demo",
    description: "The ultimate showpiece. Multiple scenes, full creative freedom, maximum visual impact. Expect long development cycles.",
    maxEffects: 6,
    sizeLimitB: 0,
    defaultSceneCount: 3,
    supportsScenes: true,
    scoreBonuses: {
      programming: 0, graphics: 5, music: 0,
      originality: 0, optimization: 0, audienceAppeal: 5,
      technicalDifficulty: 5,
    },
    suggestedEffort: { coding: 35, art: 30, music: 20, optimization: 15 },
  },
  [ProductionType.Intro64k]: {
    type: ProductionType.Intro64k,
    label: "64KB Intro",
    description: "A size-crunched demo that must fit within 65,536 bytes. Every byte counts — procedural generation and extreme compression are key.",
    maxEffects: 4,
    sizeLimitB: 65536,
    defaultSceneCount: 1,
    supportsScenes: false,
    scoreBonuses: {
      programming: 5, graphics: 0, music: 0,
      originality: 5, optimization: 10, audienceAppeal: 0,
      technicalDifficulty: 8,
    },
    suggestedEffort: { coding: 45, art: 20, music: 15, optimization: 20 },
  },
  [ProductionType.Intro4k]: {
    type: ProductionType.Intro4k,
    label: "4KB Intro",
    description: "The ultimate size-coding challenge. Just 4,096 bytes for effects, music, and everything. Only procedural synthesis will fit.",
    maxEffects: 2,
    sizeLimitB: 4096,
    defaultSceneCount: 1,
    supportsScenes: false,
    scoreBonuses: {
      programming: 8, graphics: 0, music: 0,
      originality: 8, optimization: 12, audienceAppeal: -5,
      technicalDifficulty: 12,
    },
    suggestedEffort: { coding: 55, art: 15, music: 10, optimization: 20 },
  },
  [ProductionType.MusicDisk]: {
    type: ProductionType.MusicDisk,
    label: "Music Disk",
    description: "A self-contained music player with visualizations. The soundtrack takes center stage — visuals serve the beat.",
    maxEffects: 3,
    sizeLimitB: 0,
    defaultSceneCount: 1,
    supportsScenes: false,
    scoreBonuses: {
      programming: -5, graphics: 0, music: 12,
      originality: 5, optimization: 0, audienceAppeal: 5,
      technicalDifficulty: -5,
    },
    suggestedEffort: { coding: 20, art: 15, music: 50, optimization: 15 },
  },
  [ProductionType.Cracktro]: {
    type: ProductionType.Cracktro,
    label: "Cracktro/Trainer",
    description: "A quick loader intro for cracked games. Short, punchy, focused on group branding and scrolling messages.",
    maxEffects: 3,
    sizeLimitB: 0,
    defaultSceneCount: 1,
    supportsScenes: false,
    scoreBonuses: {
      programming: 0, graphics: 0, music: -5,
      originality: -5, optimization: 5, audienceAppeal: 8,
      technicalDifficulty: -8,
    },
    suggestedEffort: { coding: 40, art: 25, music: 15, optimization: 20 },
  },
  [ProductionType.ArtSlide]: {
    type: ProductionType.ArtSlide,
    label: "Slide Show",
    description: "A curated gallery of pixel art and digital paintings with smooth transitions. Pure visual expression.",
    maxEffects: 1,
    sizeLimitB: 0,
    defaultSceneCount: 4,
    supportsScenes: true,
    scoreBonuses: {
      programming: -10, graphics: 15, music: -3,
      originality: 3, optimization: -5, audienceAppeal: 8,
      technicalDifficulty: -10,
    },
    suggestedEffort: { coding: 15, art: 60, music: 10, optimization: 15 },
  },
};

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
  /** Optional: multi-scene structure (scenes with per-scene effects/transitions). */
  scenes?: DemoScene[];
  /** Scene count used for this production (1 = traditional single-scene). */
  sceneCount?: number;
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
    /** Modifier from the production type config. */
    productionTypeModifier: number;
    /** Bonus from multi-scene structure. */
    sceneVarietyBonus: number;
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
  /** Number of scenes for multi-scene productions (Mega-Demo, Slide Show). */
  sceneCount: number;
  /** Per-scene details (effects, transitions). Ignored unless sceneCount > 1. */
  scenes?: DemoScene[];
}
