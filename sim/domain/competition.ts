/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Competition engine — pure functions for the v0.5.0 party simulation
 * expansion. Multi-judge scoring with personality traits, audience
 * reaction resolution, ranking calculation, scene award allocation,
 * hall of fame, rival AI evolution, and statistics tracking.
 *
 * NO React. NO LLM. NO DOM. Side-effect free.
 */

import type {
  AudienceReactionType,
  CompetitionCeremony,
  DynamicPartyEvent,
  HallOfFameEntry,
  Judge,
  JudgePersonality,
  JudgePersonalityConfig,
  JudgeScore,
  PartyRankingEntry,
  PlayerStatistics,
  ProductionHistoryRecord,
  ProductionType,
  ReputationTier,
  SceneAwardConfig,
  SceneAwardType,
  ScoreBreakdown,
  Production,
} from "@packages/types";
import {
  JUDGE_PERSONALITY_CONFIGS,
  AUDIENCE_REACTION_CONFIGS,
  SCENE_AWARD_CONFIGS,
  REPUTATION_TIERS,
} from "@packages/types";
import { weightedScore } from "./scoring";
import { JUDGING_PROFILES, judgingProfileForParty } from "../data/judgingProfiles";
import { PARTY_CALENDAR } from "../data/partyCalendar";
import { DYNAMIC_PARTY_EVENTS } from "../data/competitionEvents";

// ============================================================================
// Helpers
// ============================================================================

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, n));

const randomInt = (min: number, max: number, rng: () => number = Math.random): number =>
  Math.floor(rng() * (max - min + 1)) + min;

const pickRandom = <T>(arr: T[], rng: () => number = Math.random): T =>
  arr[Math.floor(rng() * arr.length)];

// ============================================================================
// 1. Generate a judging panel for a party
// ============================================================================

const JUDGE_NAMES: Array<{ name: string; handle: string }> = [
  { name: "Erik 'Optical' Nilsson", handle: "Optical" },
  { name: "Mikael 'Cuddle' Svanfeldt", handle: "Cuddle" },
  { name: "Jani 'Zardax' Tarvainen", handle: "Zardax" },
  { name: "Samuli 'Pixel' Pitkänen", handle: "Pixel" },
  { name: "Tomas 'Addi' Andersson", handle: "Addi" },
  { name: "Markus 'Memb' Nässelqvist", handle: "Memb" },
  { name: "Anders 'Vega' Nilsson", handle: "Vega" },
  { name: "Linus 'Syna' Svanberg", handle: "Syna" },
  { name: "Petter 'Largo' Larsen", handle: "Largo" },
  { name: "Johan 'Cosmos' Andersson", handle: "Cosmos" },
  { name: "Fredrik 'Gizmo' Johansson", handle: "Gizmo" },
  { name: "Olle 'Bitman' Svensson", handle: "Bitman" },
];

const PERSONALITIES: JudgePersonality[] = [
  "oldschool", "technical", "artistic", "experimental",
  "music_focused", "graphics_focused",
];

/**
 * Generate a panel of 3-5 judges for a party, each with a random
 * personality drawn from the pool.
 */
export function generateJudgingPanel(
  partyId: string,
  year: number,
  rng: () => number = Math.random,
): Judge[] {
  const judgeCount = year >= 2000 ? 5 : year >= 1995 ? 4 : 3;
  const panel: Judge[] = [];
  const usedPersonalities = new Set<JudgePersonality>();
  const usedNames = new Set<string>();

  for (let i = 0; i < judgeCount; i++) {
    // Pick an unused personality, or fall back to any
    let personality: JudgePersonality;
    const availablePools = PERSONALITIES.filter((p) => !usedPersonalities.has(p));
    if (availablePools.length > 0) {
      personality = pickRandom(availablePools, rng);
    } else {
      personality = pickRandom(PERSONALITIES, rng);
    }
    usedPersonalities.add(personality);

    // Pick an unused judge name
    let nameEntry = pickRandom(JUDGE_NAMES.filter((n) => !usedNames.has(n.handle)), rng);
    if (!nameEntry) nameEntry = pickRandom(JUDGE_NAMES, rng);
    usedNames.add(nameEntry.handle);

    const config = JUDGE_PERSONALITY_CONFIGS[personality];
    panel.push({
      id: `judge_${partyId}_${i}`,
      name: nameEntry.name,
      handle: nameEntry.handle,
      personality,
      experience: clamp(randomInt(40, 95, rng)),
      bio: config.flavor,
    });
  }

  return panel;
}

// ============================================================================
// 2. Score a single entry through a panel of judges
// ============================================================================

/**
 * Score a single production through a single judge's personality lens.
 * Applies the judge's personality multipliers and adds a small random
 * variance based on the judge's experience.
 */
export function judgeScore(
  breakdown: ScoreBreakdown,
  judge: Judge,
  rng: () => number = Math.random,
): JudgeScore {
  const config = JUDGE_PERSONALITY_CONFIGS[judge.personality];
  const m = config.multipliers;

  // Base scores from the breakdown
  const base = {
    programming: breakdown.programming,
    graphics: breakdown.graphics,
    music: breakdown.music,
    originality: breakdown.originality,
    optimization: breakdown.optimization,
    audienceAppeal: breakdown.audienceAppeal,
    technicalDifficulty: breakdown.technicalDifficulty,
  };

  // Apply personality multipliers with experience-based variance
  // More experienced judges = less variance (more consistent)
  const variance = Math.max(1, 15 - Math.round(judge.experience * 0.12));
  const v = () => randomInt(-variance, variance, rng);

  const scores = {
    programming: clamp(Math.round(base.programming * m.programming + v())),
    graphics: clamp(Math.round(base.graphics * m.graphics + v())),
    music: clamp(Math.round(base.music * m.music + v())),
    originality: clamp(Math.round(base.originality * m.originality + v())),
    optimization: clamp(Math.round(base.optimization * m.optimization + v())),
    audienceAppeal: clamp(Math.round(base.audienceAppeal * m.audienceAppeal + v())),
    technicalDifficulty: clamp(Math.round(base.technicalDifficulty * m.technicalDifficulty + v())),
  };

  const overall = Math.round(
    (scores.programming + scores.graphics + scores.music +
     scores.originality + scores.optimization + scores.audienceAppeal +
     scores.technicalDifficulty) / 7
  );

  // Pick a catchphrase if score is high enough in the judge's focus areas
  const topScore = Math.max(...Object.values(scores));
  let comment = "A solid entry. Nothing remarkable, nothing terrible.";
  if (topScore >= 75 && config.catchphrases.length > 0) {
    comment = pickRandom(config.catchphrases, rng);
  } else if (topScore >= 60) {
    comment = "Decent work. Some nice moments, some areas to improve.";
  } else if (topScore < 40) {
    comment = "This needs more work. The basics are there but the execution is lacking.";
  }

  return {
    judgeId: judge.id,
    judgeName: judge.name,
    judgeHandle: judge.handle,
    personality: judge.personality,
    scores,
    overall,
    comment,
  };
}

/**
 * Score all entries through a panel of judges.
 */
export function scoreAllEntries(
  entries: Array<{
    productionId: string;
    productionName: string;
    groupName: string;
    productionType: ProductionType;
    isPlayer: boolean;
    breakdown: ScoreBreakdown;
  }>,
  judges: Judge[],
  rng: () => number = Math.random,
): JudgeScore[][] {
  return entries.map((entry) =>
    judges.map((judge) => judgeScore(entry.breakdown, judge, rng))
  );
}

// ============================================================================
// 3. Resolve audience reaction from overall score
// ============================================================================

/**
 * Map a final overall score to an audience reaction.
 * Uses score thresholds to determine the reaction type.
 */
export function resolveAudienceReaction(
  overallScore: number,
  rng: () => number = Math.random,
): AudienceReactionType {
  const configs = Object.values(AUDIENCE_REACTION_CONFIGS)
    .sort((a, b) => b.minScore - a.minScore);

  // Find the highest threshold met
  for (const config of configs) {
    if (overallScore >= config.minScore) {
      // Small chance of one level down for variety
      if (rng() < 0.15) continue;
      return config.type;
    }
  }
  return "booing";
}

// ============================================================================
// 4. Build full rankings with sorting + awards
// ============================================================================

export interface RankingInput {
  productionId: string;
  productionName: string;
  groupName: string;
  productionType: ProductionType;
  isPlayer: boolean;
  breakdown: ScoreBreakdown;
  /** Original raw overall score before judge modifiers. */
  rawScore: number;
}

/**
 * Run a full competition for a set of entries and a panel of judges.
 * Returns the complete competition ceremony state.
 */
export function runCompetition(
  input: {
    partyId: string;
    partyName: string;
    year: number;
    month: number;
    prizePool: number;
    entries: RankingInput[];
    judges: Judge[];
    isFirstCompetition?: boolean;
  },
  rng: () => number = Math.random,
): CompetitionCeremony {
  const { partyId, partyName, year, month, prizePool, entries, judges } = input;

  // 1. Score all entries through all judges
  const allJudgeScores = scoreAllEntries(entries, judges, rng);

  // 2. Build ranking entries with final scores (average across judges)
  const rankings: PartyRankingEntry[] = entries.map((entry, i) => {
    const jScores = allJudgeScores[i];
    const finalScore = Math.round(
      jScores.reduce((s, j) => s + j.overall, 0) / jScores.length
    );

    const audienceReaction = resolveAudienceReaction(finalScore, rng);
    const reactionConfig = AUDIENCE_REACTION_CONFIGS[audienceReaction];

    return {
      productionId: entry.productionId,
      productionName: entry.productionName,
      groupName: entry.groupName,
      productionType: entry.productionType,
      isPlayer: entry.isPlayer,
      finalScore,
      judgeScores: jScores,
      audienceReaction,
      placement: 0, // filled below
      prizeMoney: 0,
      reputationGained: 0,
      sceneAwards: [],
    };
  });

  // 3. Sort by final score (descending)
  rankings.sort((a, b) => b.finalScore - a.finalScore);

  // 4. Assign placements + prizes
  const totalEntries = rankings.length;
  for (let i = 0; i < totalEntries; i++) {
    const r = rankings[i];
    const placement = i + 1;
    r.placement = placement;

    // Prize distribution: 50% to 1st, 25% to 2nd, 12.5% to 3rd
    // Remaining 12.5% split among 4th-8th
    let prizeMoney = 0;
    if (placement === 1) prizeMoney = Math.round(prizePool * 0.5);
    else if (placement === 2) prizeMoney = Math.round(prizePool * 0.25);
    else if (placement === 3) prizeMoney = Math.round(prizePool * 0.125);
    else if (placement <= 8) prizeMoney = Math.round(prizePool * 0.125 / Math.max(1, totalEntries - 3));

    r.prizeMoney = prizeMoney;

    // Reputation gained
    const reactionConfig = AUDIENCE_REACTION_CONFIGS[r.audienceReaction];
    const baseRepMap: Record<number, number> = {
      1: 50, 2: 35, 3: 25, 4: 15, 5: 10, 6: 5, 7: 3, 8: 2,
    };
    const baseRep = baseRepMap[placement] ?? 1;
    r.reputationGained = Math.round(baseRep * (reactionConfig?.repMultiplier ?? 1));
  }

  // 5. Allocate scene awards
  const awards = allocateSceneAwards(rankings, rng);

  // 6. Resolve dynamic events
  const events = resolveDynamicEvents(year, rng);

  // 7. Apply event modifiers
  let totalPrizePoolDistributed = prizePool;
  for (const event of events) {
    if (event.type === "positive") {
      // Boost top-3 scores slightly
      for (let i = 0; i < Math.min(3, rankings.length); i++) {
        rankings[i].finalScore = clamp(rankings[i].finalScore + event.scoreModifier);
      }
    } else if (event.type === "negative") {
      // Penalize all scores slightly
      for (const r of rankings) {
        r.finalScore = clamp(r.finalScore + event.scoreModifier);
      }
    }
    // Neutral events just add flavor
  }

  return {
    partyId,
    partyName,
    year,
    month,
    judges,
    rankings,
    events,
    awards,
    awardWinners: awards.reduce<Partial<Record<SceneAwardType, string>>>((acc, award) => {
      // Find the entry with this award assigned
      const bestEntry = rankings.find((r) => r.sceneAwards.includes(award));
      if (bestEntry) acc[award] = bestEntry.productionId;
      return acc;
    }, {} as Partial<Record<SceneAwardType, string>>),
    totalPrizePool: totalPrizePoolDistributed,
    ceremonyStep: 0,
  };
}

// ============================================================================
// 5. Scene award allocation
// ============================================================================

/**
 * Allocate scene awards to the best-performing entries.
 * Each award checks its threshold category and assigns to the highest
 * scorer that meets the threshold.
 */
export function allocateSceneAwards(
  rankings: PartyRankingEntry[],
  rng: () => number = Math.random,
): SceneAwardType[] {
  const awards: SceneAwardType[] = [];
  const awardConfigs = Object.values(SCENE_AWARD_CONFIGS);

  for (const config of awardConfigs) {
    // Find the entry with the highest score in this category that meets threshold
    let bestEntry: PartyRankingEntry | null = null;
    let bestScore = 0;

    for (const rank of rankings) {
      let catScore = 0;
      if (config.category === "overall") {
        catScore = rank.finalScore;
      } else {
        // config.category is constrained to keyof JudgeScore["scores"] here
        // by the `overall` special case above, so the cast is safe.
        type ScoreKey = keyof typeof rank.judgeScores[number]["scores"];
        const avg = Math.round(
          rank.judgeScores.reduce((s, j) => s + (j.scores[config.category as ScoreKey] as number), 0) /
          Math.max(1, rank.judgeScores.length)
        );
        catScore = avg;
      }

      if (catScore >= config.threshold && catScore > bestScore) {
        bestScore = catScore;
        bestEntry = rank;
      }
    }

    if (bestEntry) {
      bestEntry.sceneAwards.push(config.type);
      awards.push(config.type);
    }
  }

  return awards;
}

// ============================================================================
// 6. Dynamic party events
// ============================================================================

/**
 * Resolve dynamic events that can fire during a competition.
 * Returns events that actually fire (based on weight probability).
 */
export function resolveDynamicEvents(
  year: number,
  rng: () => number = Math.random,
): DynamicPartyEvent[] {
  const events: DynamicPartyEvent[] = [];
  const totalWeight = DYNAMIC_PARTY_EVENTS.reduce((s, e) => s + e.weight, 0);

  // Roll for 0-2 events
  const eventCount = rng() < 0.4 ? 1 : rng() < 0.15 ? 2 : 0;

  for (let i = 0; i < eventCount; i++) {
    let roll = rng() * totalWeight;
    for (const event of DYNAMIC_PARTY_EVENTS) {
      roll -= event.weight;
      if (roll <= 0) {
        events.push(event);
        break;
      }
    }
  }

  return events;
}

// ============================================================================
// 7. Hall of Fame management
// ============================================================================

/**
 * Check if a result qualifies for the Hall of Fame.
 * Threshold: placement in top 3 OR audience reaction is "legendary_moment"
 * OR scored a scene award.
 */
export function qualifiesForHallOfFame(entry: PartyRankingEntry): boolean {
  return (
    entry.placement <= 3 ||
    entry.audienceReaction === "legendary_moment" ||
    entry.sceneAwards.length > 0
  );
}

/**
 * Convert a ranking entry + party info to a Hall of Fame entry.
 */
export function toHallOfFameEntry(
  ranking: PartyRankingEntry,
  partyName: string,
  year: number,
  month: number,
): HallOfFameEntry {
  return {
    id: `hof_${ranking.productionId}`,
    productionName: ranking.productionName,
    groupName: ranking.groupName,
    productionType: ranking.productionType,
    year,
    month,
    partyName,
    placement: ranking.placement,
    finalScore: ranking.finalScore,
    audienceReaction: ranking.audienceReaction,
    sceneAwards: ranking.sceneAwards,
    isPlayer: ranking.isPlayer,
  };
}

// ============================================================================
// 8. Statistics computation
// ============================================================================

/**
 * Compute player statistics from production history.
 */
export function computePlayerStatistics(
  history: ProductionHistoryRecord[],
  currentReputation: number,
): PlayerStatistics {
  const productionsReleased = history.length;
  const competitionsEntered = history.filter((h) => h.placement !== undefined).length;
  const wins = history.filter((h) => h.placement === 1).length;
  const podiums = history.filter((h) => h.placement !== undefined && h.placement <= 3).length;

  const placements = history.filter((h) => h.placement !== undefined).map((h) => h.placement!);
  const averagePlacing = placements.length > 0
    ? Math.round(placements.reduce((s, p) => s + p, 0) / placements.length)
    : 0;

  const scores = history.filter((h) => h.finalScore !== undefined).map((h) => h.finalScore!);
  const highestScore = scores.length > 0 ? Math.max(...scores) : 0;

  const originalities = history
    .map((h) => h.production.scoreOriginality ?? 0)
    .filter((s) => s > 0);
  const averageOriginality = originalities.length > 0
    ? Math.round(originalities.reduce((s, o) => s + o, 0) / originalities.length)
    : 0;

  const techScores = history
    .map((h) => h.production.scoreTechnical ?? 0)
    .filter((s) => s > 0);
  const averageTechnicalScore = techScores.length > 0
    ? Math.round(techScores.reduce((s, t) => s + t, 0) / techScores.length)
    : 0;

  // Most used effects
  const effectCounts = new Map<string, number>();
  for (const h of history) {
    for (const eff of h.production.effects) {
      effectCounts.set(eff, (effectCounts.get(eff) ?? 0) + 1);
    }
  }
  const mostUsedEffects = [...effectCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  // Favorite production type
  const typeCounts = new Map<string, number>();
  for (const h of history) {
    const t = h.production.type;
    typeCounts.set(t, (typeCounts.get(t) ?? 0) + 1);
  }
  const favoriteProductionType = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([type]) => type as ProductionType)[0] ?? "Mega-Demo" as ProductionType;

  const totalDownloads = history.reduce((s, h) => s + (h.downloads ?? 0), 0);
  const totalPrizeMoney = history.reduce((s, h) => {
    if (h.placement && h.placement <= 3) {
      // Estimate from placement
      return s + (h.placement === 1 ? 500 : h.placement === 2 ? 250 : 125);
    }
    return s;
  }, 0);
  const totalReputation = history.reduce((s, h) => s + h.production.reputationGained, 0);

  const typeBreakdown: Record<string, number> = {};
  for (const h of history) {
    const t = h.production.type;
    typeBreakdown[t] = (typeBreakdown[t] ?? 0) + 1;
  }

  return {
    productionsReleased,
    competitionsEntered,
    wins,
    podiums,
    averagePlacing,
    highestScore,
    averageOriginality,
    averageTechnicalScore,
    audiencePopularity: clamp(currentReputation),
    mostUsedEffects,
    favoriteProductionType,
    totalDownloads,
    totalPrizeMoney,
    totalReputation,
    currentReputation,
    typeBreakdown,
  };
}

// ============================================================================
// 9. Reputation tier helpers
// ============================================================================

/**
 * Get the highest reputation tier the player has achieved.
 */
export function currentReputationTier(reputation: number): ReputationTier {
  let highest = REPUTATION_TIERS[0];
  for (const tier of REPUTATION_TIERS) {
    if (reputation >= tier.minReputation) {
      highest = tier;
    }
  }
  return highest;
}

/**
 * Get the next reputation tier (for progress display).
 */
export function nextReputationTier(reputation: number): ReputationTier | null {
  for (const tier of REPUTATION_TIERS) {
    if (reputation < tier.minReputation) {
      return tier;
    }
  }
  return null;
}

/**
 * Progress percentage toward the next tier (0-100).
 */
export function reputationTierProgress(reputation: number): number {
  const current = currentReputationTier(reputation);
  const next = nextReputationTier(reputation);
  if (!next) return 100;
  const range = next.minReputation - current.minReputation;
  if (range <= 0) return 100;
  const progress = ((reputation - current.minReputation) / range) * 100;
  return clamp(Math.round(progress));
}

// ============================================================================
// 10. Generate rival entries for competition
// ============================================================================

/**
 * Generate a set of rival entries with varying scores, group names,
 * and production types for a competition.
 */
export function generateRivalEntries(
  year: number,
  count: number,
  playerScore: number,
  rng: () => number = Math.random,
): RankingInput[] {
  const rivalGroups = [
    "Future Crew", "Razor 1911", "Fairlight", "Triad", "Trsi",
    "Crest", "Spaceballs", "Triton", "Complex",
    "Maniacs of Noise", "Rebels", "Darkage", "Byterapers",
  ];
  const rivalProductionNames = [
    "Neon Pulse", "Digital Dream", "Raster Rhapsody", "Vector Vortex",
    "Plasma Planet", "Copper Cascade", "Pixel Storm", "Shader Symphony",
    "Voxel Visions", "Binary Ballet", "Algorithm Anthem", "Fractal Fury",
    "Matrix Mirage", "Waveform Warriors", "Byte Blitz",
  ];
  const types: ProductionType[] = [
    "Mega-Demo" as ProductionType, "64KB Intro" as ProductionType,
    "4KB Intro" as ProductionType, "Music Disk" as ProductionType,
    "Cracktro/Trainer" as ProductionType,
  ];

  const entries: RankingInput[] = [];

  // Generate rival entries with scores distributed around the player score
  for (let i = 0; i < count; i++) {
    const groupName = rivalGroups[i % rivalGroups.length];
    const prodName = rivalProductionNames[Math.floor(rng() * rivalProductionNames.length)];

    // Score distribution: some better, some worse
    // Uses a normal-ish distribution centered on playerScore +/- 20
    const scoreOffset = Math.round((rng() - 0.5) * 40);
    const rawScore = clamp(playerScore + scoreOffset, 20, 100);

    entries.push({
      productionId: `rival_prod_${year}_${i}`,
      productionName: prodName,
      groupName,
      productionType: types[Math.floor(rng() * types.length)],
      isPlayer: false,
      // We need a simplified breakdown — create a minimal one
      breakdown: {
        programming: clamp(rawScore + randomInt(-15, 15, rng)),
        graphics: clamp(rawScore + randomInt(-15, 15, rng)),
        music: clamp(rawScore + randomInt(-15, 15, rng)),
        originality: clamp(rawScore + randomInt(-15, 15, rng)),
        optimization: clamp(rawScore + randomInt(-10, 10, rng)),
        audienceAppeal: clamp(rawScore + randomInt(-20, 20, rng)),
        technicalDifficulty: clamp(rawScore + randomInt(-10, 10, rng)),
        overall: rawScore,
        factors: {
          skillContributions: { programming: 0, graphics: 0, music: 0 },
          effectContributions: { visualImpact: 0, complexity: 0, originality: 0 },
          synergyBonus: 0, directionModifier: 0, optimizationModifier: 0,
          musicModuleBonus: 0, platformFit: 0, developmentTimeFactor: 0,
          productionTypeModifier: 0, sceneVarietyBonus: 0,
        },
        synergiesTriggered: [],
      },
      rawScore,
    });
  }

  return entries;
}
