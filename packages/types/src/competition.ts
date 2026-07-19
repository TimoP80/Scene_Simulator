/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Competition & party simulation types — judges, audience reactions,
 * rankings, scene awards, dynamic events, rival group AI, hall of fame,
 * production history, and statistics. v0.5.0 expansion.
 *
 * Pure data structures. NO React, NO LLM, NO side effects.
 */

import { ProductionType } from "./demo";
import type { Production } from "./demo";

// ============================================================================
// 1. Judge personality traits
// ============================================================================

/** A judge's personality archetype — influences how they weight scoring. */
export type JudgePersonality =
  | "oldschool"
  | "technical"
  | "artistic"
  | "experimental"
  | "music_focused"
  | "graphics_focused";

/** All judge personalities in display order. */
export const JUDGE_PERSONALITIES: JudgePersonality[] = [
  "oldschool",
  "technical",
  "artistic",
  "experimental",
  "music_focused",
  "graphics_focused",
];

/**
 * Per-personality scoring biases. Each archetype modifies the base
 * ScoreBreakdown weights when judging an entry.
 */
export interface JudgePersonalityConfig {
  id: JudgePersonality;
  name: string;
  /** Displayed as the judge's "vibe" in the ceremony UI. */
  flavor: string;
  /**
   * Multipliers applied to each scoring category.
   * Values > 1 mean the judge cares more about that category.
   * Values < 1 mean they discount it.
   */
  multipliers: {
    programming: number;
    graphics: number;
    music: number;
    originality: number;
    optimization: number;
    audienceAppeal: number;
    technicalDifficulty: number;
  };
  /** Catchphrases the judge says when giving a high score in their focus areas. */
  catchphrases: string[];
}

export const JUDGE_PERSONALITY_CONFIGS: Record<JudgePersonality, JudgePersonalityConfig> = {
  oldschool: {
    id: "oldschool",
    name: "Oldschool Purist",
    flavor: "Respects cycle-counted raster tricks and copper-list wizardry. Shaders are cheating.",
    multipliers: {
      programming: 1.3, graphics: 0.9, music: 1.0,
      originality: 0.8, optimization: 1.4, audienceAppeal: 0.7,
      technicalDifficulty: 1.2,
    },
    catchphrases: [
      "Now THAT is how you count cycles!",
      "They don't make demos like this anymore.",
      "Real hardware, real skill, real respect.",
      "The copper list alone deserves a prize.",
      "You can keep your shaders. This is art.",
    ],
  },
  technical: {
    id: "technical",
    name: "Technical Judge",
    flavor: "Analyzes code quality, compression, and algorithmic elegance.",
    multipliers: {
      programming: 1.4, graphics: 0.8, music: 0.8,
      originality: 1.0, optimization: 1.4, audienceAppeal: 0.6,
      technicalDifficulty: 1.5,
    },
    catchphrases: [
      "The SIMD optimization is exquisite.",
      "Procedural generation at its finest.",
      "The compression ratio alone is award-worthy.",
      "I've never seen that algorithm used in a demo before.",
      "Every byte pulled its weight in that 4K.",
    ],
  },
  artistic: {
    id: "artistic",
    name: "Artistic Director",
    flavor: "Judges composition, color theory, pacing, and emotional impact.",
    multipliers: {
      programming: 0.7, graphics: 1.4, music: 1.1,
      originality: 1.3, optimization: 0.6, audienceAppeal: 1.2,
      technicalDifficulty: 0.7,
    },
    catchphrases: [
      "The color palette tells a story.",
      "Composition and pacing were flawless.",
      "A visual poem set to tracker music.",
      "Every frame was a painting.",
      "The transitions were as beautiful as the effects.",
    ],
  },
  experimental: {
    id: "experimental",
    name: "Experimental Visionary",
    flavor: "Rewards risk-taking, weird techniques, and things nobody has seen before.",
    multipliers: {
      programming: 0.9, graphics: 1.0, music: 1.0,
      originality: 1.6, optimization: 0.7, audienceAppeal: 1.1,
      technicalDifficulty: 1.0,
    },
    catchphrases: [
      "I have literally never seen that before.",
      "This breaks every rule and I love it.",
      "The audacity alone deserves a trophy.",
      "Experimental. Bold. Brilliant.",
      "That shouldn't work, but it does — beautifully.",
    ],
  },
  music_focused: {
    id: "music_focused",
    name: "Music Connoisseur",
    flavor: "Judges the soundtrack first. Sync, composition, and format quality matter most.",
    multipliers: {
      programming: 0.7, graphics: 0.8, music: 1.6,
      originality: 1.0, optimization: 0.7, audienceAppeal: 1.2,
      technicalDifficulty: 0.7,
    },
    catchphrases: [
      "That tracker module is a masterpiece.",
      "The music-demo sync was perfection.",
      "I'd buy that soundtrack on vinyl.",
      "The SID chip never sounded this good.",
      "Finally, a demo where the music leads.",
    ],
  },
  graphics_focused: {
    id: "graphics_focused",
    name: "Visual Auteur",
    flavor: "Judges visual quality, effects complexity, and graphical ambition above all.",
    multipliers: {
      programming: 0.8, graphics: 1.5, music: 0.8,
      originality: 1.1, optimization: 0.8, audienceAppeal: 1.3,
      technicalDifficulty: 1.0,
    },
    catchphrases: [
      "The particle system was jaw-dropping.",
      "That voxel engine is cutting edge.",
      "Visual density AND clarity — rare combination.",
      "The lighting model alone deserves a standing ovation.",
      "Peak visual quality for the platform.",
    ],
  },
};

// ============================================================================
// 2. Judge instance (a specific judge at a specific party)
// ============================================================================

export interface Judge {
  id: string;
  name: string;
  handle: string;
  personality: JudgePersonality;
  /** 0-100 experience level — affects score variance. */
  experience: number;
  /** Short bio shown in the ceremony UI. */
  bio: string;
}

// ============================================================================
// 3. Audience reaction types
// ============================================================================

export type AudienceReactionType =
  | "standing_ovation"
  | "loud_applause"
  | "huge_cheers"
  | "applause"
  | "mixed_reactions"
  | "silence"
  | "confused_audience"
  | "booing"
  | "legendary_moment";

/** All audience reaction types in intensity order. */
export const AUDIENCE_REACTIONS: AudienceReactionType[] = [
  "legendary_moment",
  "standing_ovation",
  "huge_cheers",
  "loud_applause",
  "applause",
  "mixed_reactions",
  "silence",
  "confused_audience",
  "booing",
];

export interface AudienceReactionConfig {
  type: AudienceReactionType;
  label: string;
  emoji: string;
  /** Minimum overall score required. */
  minScore: number;
  /** Score multiplier applied as excitement bonus. */
  excitementBonus: number;
  /** Reputation gain multiplier. */
  repMultiplier: number;
  /** Flavor description. */
  description: string;
}

export const AUDIENCE_REACTION_CONFIGS: Record<AudienceReactionType, AudienceReactionConfig> = {
  legendary_moment: {
    type: "legendary_moment",
    label: "LEGENDARY MOMENT!",
    emoji: "🏆🔥",
    minScore: 95,
    excitementBonus: 1.5,
    repMultiplier: 3.0,
    description: "The crowd ERUPTS. This will be talked about for years. A defining moment in demoscene history.",
  },
  standing_ovation: {
    type: "standing_ovation",
    label: "Standing Ovation!",
    emoji: "👏👏",
    minScore: 88,
    excitementBonus: 1.3,
    repMultiplier: 2.0,
    description: "The entire hall rises to applaud. Unforgettable.",
  },
  huge_cheers: {
    type: "huge_cheers",
    label: "Huge Cheers!",
    emoji: "🎉🎊",
    minScore: 82,
    excitementBonus: 1.2,
    repMultiplier: 1.5,
    description: "Loud, enthusiastic cheers fill the venue. The crowd loves it.",
  },
  loud_applause: {
    type: "loud_applause",
    label: "Loud Applause",
    emoji: "👏",
    minScore: 75,
    excitementBonus: 1.1,
    repMultiplier: 1.2,
    description: "Strong, sustained applause. Clearly a crowd-pleaser.",
  },
  applause: {
    type: "applause",
    label: "Applause",
    emoji: "🙌",
    minScore: 65,
    excitementBonus: 1.0,
    repMultiplier: 1.0,
    description: "Polite but genuine applause. A solid entry.",
  },
  mixed_reactions: {
    type: "mixed_reactions",
    label: "Mixed Reactions",
    emoji: "🤷",
    minScore: 55,
    excitementBonus: 0.9,
    repMultiplier: 0.8,
    description: "Some love it, some don't get it. The room is divided.",
  },
  silence: {
    type: "silence",
    label: "Silence",
    emoji: "🤐",
    minScore: 40,
    excitementBonus: 0.7,
    repMultiplier: 0.5,
    description: "The room falls quiet. Not in a good way.",
  },
  confused_audience: {
    type: "confused_audience",
    label: "Confused Audience",
    emoji: "😕",
    minScore: 30,
    excitementBonus: 0.5,
    repMultiplier: 0.3,
    description: "Audience murmurs in confusion. The demo didn't land.",
  },
  booing: {
    type: "booing",
    label: "Booing",
    emoji: "👎",
    minScore: 0,
    excitementBonus: 0.3,
    repMultiplier: 0.0,
    description: "The crowd is NOT happy. This one missed the mark entirely.",
  },
};

// ============================================================================
// 4. Party ranking entry
// ============================================================================

export interface PartyRankingEntry {
  productionId: string;
  productionName: string;
  groupName: string;
  productionType: ProductionType;
  /** The player's or rival's production. */
  isPlayer: boolean;
  /** Overall score from the judging panel. */
  finalScore: number;
  /** Per-judge scores (for the detailed breakdown). */
  judgeScores: JudgeScore[];
  /** Resolved audience reaction. */
  audienceReaction: AudienceReactionType;
  /** Final placement (1 = first). */
  placement: number;
  /** Prize money awarded for this placement. */
  prizeMoney: number;
  /** Reputation gained from this result. */
  reputationGained: number;
  /** Whether this entry triggered a special award. */
  sceneAwards: SceneAwardType[];
}

export interface JudgeScore {
  judgeId: string;
  judgeName: string;
  judgeHandle: string;
  personality: JudgePersonality;
  scores: {
    programming: number;
    graphics: number;
    music: number;
    originality: number;
    optimization: number;
    audienceAppeal: number;
    technicalDifficulty: number;
  };
  overall: number;
  /** A quote from this judge about the entry. */
  comment: string;
}

// ============================================================================
// 5. Scene awards
// ============================================================================

export type SceneAwardType =
  | "best_graphics"
  | "best_music"
  | "best_code"
  | "best_design"
  | "best_intro"
  | "best_demo"
  | "audience_favorite"
  | "rookie_award"
  | "technical_excellence";

export interface SceneAwardConfig {
  type: SceneAwardType;
  label: string;
  emoji: string;
  description: string;
  /** Scoring category this award checks. */
  category: keyof JudgeScore["scores"] | "overall";
  /** Minimum score threshold. */
  threshold: number;
  /** Bonus cash for winning this award. */
  cashBonus: number;
  /** Bonus reputation. */
  repBonus: number;
  /** Whether this award can be won by the player. */
  canWin: boolean;
}

export const SCENE_AWARD_CONFIGS: Record<SceneAwardType, SceneAwardConfig> = {
  best_graphics: {
    type: "best_graphics", label: "Best Graphics", emoji: "🎨",
    description: "Awarded for outstanding visual quality and graphical ambition.",
    category: "graphics", threshold: 85,
    cashBonus: 200, repBonus: 30, canWin: true,
  },
  best_music: {
    type: "best_music", label: "Best Music", emoji: "🎵",
    description: "Awarded for exceptional soundtrack composition and sync.",
    category: "music", threshold: 85,
    cashBonus: 200, repBonus: 30, canWin: true,
  },
  best_code: {
    type: "best_code", label: "Best Code", emoji: "💻",
    description: "Awarded for technical programming excellence and optimization.",
    category: "programming", threshold: 85,
    cashBonus: 200, repBonus: 30, canWin: true,
  },
  best_design: {
    type: "best_design", label: "Best Design", emoji: "✏️",
    description: "Awarded for outstanding demo direction, pacing, and artistic vision.",
    category: "audienceAppeal", threshold: 85,
    cashBonus: 150, repBonus: 25, canWin: true,
  },
  best_intro: {
    type: "best_intro", label: "Best Intro", emoji: "🚀",
    description: "Awarded to the best 4K or 64KB intro in the compo.",
    category: "technicalDifficulty", threshold: 82,
    cashBonus: 250, repBonus: 35, canWin: true,
  },
  best_demo: {
    type: "best_demo", label: "Best Demo", emoji: "🏆",
    description: "The overall best production — first place in the main compo.",
    category: "overall", threshold: 90,
    cashBonus: 500, repBonus: 50, canWin: true,
  },
  audience_favorite: {
    type: "audience_favorite", label: "Audience Favorite", emoji: "❤️",
    description: "Voted by the audience as their favorite production of the party.",
    category: "audienceAppeal", threshold: 85,
    cashBonus: 300, repBonus: 40, canWin: true,
  },
  rookie_award: {
    type: "rookie_award", label: "Rookie Award", emoji: "🌟",
    description: "Awarded to the best first-time competitor.",
    category: "overall", threshold: 60,
    cashBonus: 100, repBonus: 20, canWin: true,
  },
  technical_excellence: {
    type: "technical_excellence", label: "Technical Excellence", emoji: "🔬",
    description: "Awarded for outstanding technical achievement and innovation.",
    category: "technicalDifficulty", threshold: 90,
    cashBonus: 300, repBonus: 35, canWin: true,
  },
};

// ============================================================================
// 6. Dynamic party events
// ============================================================================

export interface DynamicPartyEvent {
  id: string;
  name: string;
  description: string;
  /** Type determines how scoring is modified. */
  type: "positive" | "negative" | "neutral";
  /** Scoring modifier applied to affected entries. */
  scoreModifier: number; // -30 to +30
  /** Which phase of the competition this can fire in. */
  phase: "projection" | "judging" | "presentation";
  /** Flavor text shown in the ceremony UI. */
  flavorText: string;
  /** Probability weight (higher = more likely). */
  weight: number;
}

// ============================================================================
// 7. Rival group AI identity
// ============================================================================

export type RivalGroupIdentity =
  | "technical_legends"
  | "graphics_masters"
  | "music_specialists"
  | "experimental_artists"
  | "comedy_productions";

export interface RivalGroupAI {
  groupId: string;
  groupName: string;
  identity: RivalGroupIdentity;
  /** Win rate (0-100). */
  winRate: number;
  /** Favorite production type they tend to enter. */
  favoriteType: ProductionType;
  /** Average ranking over all entries. */
  averageRanking: number;
  /** Total competitions entered. */
  competitionsEntered: number;
  /** Historical rivalry score against player (-100 to 100). */
  rivalryWithPlayer: number;
  /** Consistency score (0-100) — how reliable their quality is. */
  consistency: number;
  /** Innovation rating (0-100) — how often they try new techniques. */
  innovationRating: number;
}

// ============================================================================
// 8. Hall of Fame entry
// ============================================================================

export interface HallOfFameEntry {
  id: string;
  productionName: string;
  groupName: string;
  productionType: ProductionType;
  year: number;
  month: number;
  partyName: string;
  placement: number;
  finalScore: number;
  audienceReaction: AudienceReactionType;
  sceneAwards: SceneAwardType[];
  isPlayer: boolean;
}

// ============================================================================
// 9. Production history record
// ============================================================================

export interface ProductionHistoryRecord {
  production: Production;
  partyName?: string;
  placement?: number;
  finalScore?: number;
  audienceReaction?: AudienceReactionType;
  downloads?: number;
  sceneAwards?: SceneAwardType[];
  judgeComments?: string[];
  /** When the entry was submitted (game year/month). */
  submittedYear: number;
  submittedMonth: number;
}

// ============================================================================
// 10. Statistics snapshot
// ============================================================================

export interface PlayerStatistics {
  productionsReleased: number;
  competitionsEntered: number;
  wins: number;
  podiums: number;
  averagePlacing: number;
  highestScore: number;
  averageOriginality: number;
  averageTechnicalScore: number;
  audiencePopularity: number;
  mostUsedEffects: string[];
  favoriteProductionType: ProductionType;
  totalDownloads: number;
  totalPrizeMoney: number;
  totalReputation: number;
  currentReputation: number;
  /** Count of each production type released. */
  typeBreakdown: Record<string, number>;
}

// ============================================================================
// 11. Reputation tiers
// ============================================================================

export interface ReputationTier {
  level: number;
  name: string;
  minReputation: number;
  unlocks: string[];
  flavorText: string;
}

export const REPUTATION_TIERS: ReputationTier[] = [
  { level: 1, name: "Newcomer", minReputation: 0, unlocks: ["Basic BBS access"], flavorText: "Every legend starts somewhere." },
  { level: 2, name: "Active Scener", minReputation: 100, unlocks: ["Party invitations", "Freelance gigs"], flavorText: "People are starting to notice your handle." },
  { level: 3, name: "Respected Coder", minReputation: 250, unlocks: ["Sponsorship offers", "BBS mod status"], flavorText: "Your name carries weight in the scene." },
  { level: 4, name: "Scene Veteran", minReputation: 500, unlocks: ["VIP party access", "Judge invitations"], flavorText: "You've earned your place in demoscene history." },
  { level: 5, name: "Legendary Figure", minReputation: 1000, unlocks: ["Hall of Fame induction", "Special competitions"], flavorText: "Future generations will study your productions." },
  { level: 6, name: "Immortal", minReputation: 2000, unlocks: ["Legend status", "All parties open"], flavorText: "Your name is synonymous with the demoscene itself." },
];

// ============================================================================
// 12. Competition result (full ceremony state)
// ============================================================================

export interface CompetitionCeremony {
  partyId: string;
  partyName: string;
  year: number;
  month: number;
  /** The panel of judges for this competition. */
  judges: Judge[];
  /** All entries ranked by final score. */
  rankings: PartyRankingEntry[];
  /** Dynamic events that fired during this competition. */
  events: DynamicPartyEvent[];
  /** Scene awards allocated. */
  awards: SceneAwardType[];
  /** Which ranking entry won each award. */
  awardWinners: Partial<Record<SceneAwardType, string>>; // productionId
  /** Total prize pool distributed. */
  totalPrizePool: number;
  /** Current animation step for the ceremony UI. */
  ceremonyStep: number;
}

// ============================================================================
// 13. Event types for the competition system
// ============================================================================

export type CompetitionEventType =
  | "COMPETITION_STARTED"
  | "JUDGE_SCORES_SUBMITTED"
  | "AUDIENCE_REACTION_RESOLVED"
  | "RANKINGS_CALCULATED"
  | "AWARDS_ALLOCATED"
  | "CEREMONY_COMPLETED";
