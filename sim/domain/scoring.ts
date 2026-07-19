/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo scoring engine — pure functions that turn a `DemoCreationInput`
 * + crew skills + platform + selected music track into a multi-category
 * `ScoreBreakdown` and a list of `CompetitionPrediction`s.
 *
 * NO React. NO LLM. NO DOM. Side-effect free. Safe to call from the
 * reducer, the UI, and the smoke tests.
 *
 * Pipeline:
 *   1. computeSkillContributions   (programmer / artist / musician)
 *   2. computeEffectContributions  (visualImpact, complexity, originality)
 *   3. applySynergies              (per-pair bonus from EFFECT_SYNERGIES)
 *   4. applyArtisticDirection      (per-category multipliers)
 *   5. applyOptimizationFocus      (Speed vs Visual Quality tradeoff)
 *   6. applyMusicModuleBonus       (custom tracker track from playlist)
 *   7. applyPlatformFit            (how well effects fit the rig)
 *   8. applyDevelopmentTime        (longer dev = better polish, but more risk)
 *   9. sumCategories               (clamp each to 0..100)
 *  10. predictPlacements           (fold breakdown through judging profile)
 */

import type {
  ArtisticDirection,
  CompetitionPrediction,
  DemoAward,
  DemoCreationInput,
  DemoEffect,
  DemoSummary,
  JudgingProfile,
  PlatformId,
  ProductionType,
  ScoreBreakdown,
} from "@packages/types";
import { EraId, PRODUCTION_TYPE_CONFIGS } from "@packages/types";
import { ARTISTIC_DIRECTION_DEFS } from "../data/artisticDirections";
import { EFFECT_SYNERGIES } from "../data/effectSynergies";
import {
  JUDGING_PROFILES,
  judgingProfileForParty,
  judgingProfileForProductionType,
} from "../data/judgingProfiles";

// ---------------------------------------------------------------------------
// Public input shape
// ---------------------------------------------------------------------------

export interface ScoringInput {
  creation: DemoCreationInput;
  effects: DemoEffect[];        // resolved from the player's selected ids
  crewSkills: {
    programming: number;       // 0-100
    graphics: number;
    music: number;
  };
  /** When the player picked a custom tracker track, pass its metadata. */
  musicModule?: {
    format: "MOD" | "XM" | "IT" | "S3M" | "OTHER";
    sizeBytes: number;
  };
  /** Platform CPU/RAM limits so we can score platform fit. */
  platform: {
    id: PlatformId;
    cpuLimit: number;
    ramLimitKb: number;
  };
  /** Upcoming parties the player can predict placement for. */
  upcomingParties: Array<{
    id: string;
    name: string;
    platformFocus: "c64" | "amiga" | "pc" | "all";
    prestige: number;
    attendance: number;
    year: number;
  }>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const clamp = (n: number, min = 0, max = 100): number =>
  Math.max(min, Math.min(max, n));

const safeDiv = (n: number, d: number): number => (d > 0 ? n / d : 0);

const FORMAT_BONUS: Record<string, number> = {
  XM: 6,
  IT: 5,
  S3M: 3,
  MOD: 2,
  OTHER: 0,
};

// ---------------------------------------------------------------------------
// Stage 1+2: base contributions
// ---------------------------------------------------------------------------

function computeSkillContributions(input: ScoringInput): {
  programming: number;
  graphics: number;
  music: number;
} {
  const { crewSkills, creation } = input;
  // Skill contributes a baseline; effort allocation amplifies it.
  const programming = clamp(
    (crewSkills.programming * 0.6) +
      (creation.effort.coding * 0.5) +
      (creation.effort.optimization * 0.3)
  );
  const graphics = clamp(
    (crewSkills.graphics * 0.6) + (creation.effort.art * 0.6)
  );
  const music = clamp(
    (crewSkills.music * 0.6) + (creation.effort.music * 0.6)
  );
  return { programming, graphics, music };
}

function computeEffectContributions(
  effects: DemoEffect[]
): { visualImpact: number; complexity: number; originality: number } {
  if (effects.length === 0) {
    return { visualImpact: 0, complexity: 0, originality: 0 };
  }
  // Average is weighted: more effects means broader appeal but also
  // dilutes each individual effect's impact slightly.
  const count = effects.length;
  const visualImpact = clamp(
    effects.reduce((s, e) => s + e.visualImpact, 0) / count
  );
  const complexity = clamp(
    effects.reduce((s, e) => s + e.complexity, 0) / count
  );
  const originality = clamp(
    effects.reduce((s, e) => s + e.originality, 0) / count
  );
  return { visualImpact, complexity, originality };
}

// ---------------------------------------------------------------------------
// Stage 3a: production type modifiers — each type biases scoring categories
// ---------------------------------------------------------------------------

function applyProductionTypeModifiers(
  score: ScoreBreakdown,
  type: ProductionType
): { score: ScoreBreakdown; typeModifier: number } {
  const cfg = PRODUCTION_TYPE_CONFIGS[type];
  if (!cfg) return { score, typeModifier: 50 };

  const b = cfg.scoreBonuses;
  return {
    score: {
      ...score,
      programming: clamp(score.programming + b.programming),
      graphics: clamp(score.graphics + b.graphics),
      music: clamp(score.music + b.music),
      originality: clamp(score.originality + b.originality),
      optimization: clamp(score.optimization + b.optimization),
      audienceAppeal: clamp(score.audienceAppeal + b.audienceAppeal),
      technicalDifficulty: clamp(score.technicalDifficulty + b.technicalDifficulty),
    },
    // Type modifier: average of bonuses gives a 0-100 magnitude
    typeModifier: clamp(
      50 + Math.round(
        (b.programming + b.graphics + b.music + b.originality +
         b.optimization + b.audienceAppeal + b.technicalDifficulty) / 3
      )
    ),
  };
}

// ---------------------------------------------------------------------------
// Stage 3b: scene variety bonus — multi-scene productions get a bonus for
// each unique scene transition and per-scene effect variety.
// ---------------------------------------------------------------------------

function applySceneVarietyBonus(
  score: ScoreBreakdown,
  creation: DemoCreationInput
): { score: ScoreBreakdown; sceneVarietyBonus: number } {
  const sceneCount = creation.sceneCount ?? 1;
  const scenes = creation.scenes ?? [];

  if (sceneCount <= 1 || scenes.length < 2) {
    return { score, sceneVarietyBonus: 0 };
  }

  // Bonus for number of scenes: more scenes = more structure, but
  // the returns diminish after 4 scenes.
  const sceneCountBonus = clamp(Math.round(Math.min(sceneCount, 6) * 3));

  // Bonus for variety in transitions: unique transitions = creative
  // direction. Max bonus when using 4+ unique transitions.
  const uniqueTransitions = new Set(scenes.map((s) => s.transition));
  const transitionVariety = clamp(
    Math.round((uniqueTransitions.size / 7) * 10)
  );

  // Bonus for distributing effects across scenes (not cramming them all into one)
  const scenesWithEffects = scenes.filter(
    (s) => s.effects.length > 0
  ).length;
  const distributionBonus =
    scenes.length > 0
      ? clamp(Math.round((scenesWithEffects / scenes.length) * 8))
      : 0;

  const total = sceneCountBonus + transitionVariety + distributionBonus;

  return {
    score: {
      ...score,
      audienceAppeal: clamp(score.audienceAppeal + Math.round(total / 2)),
      graphics: clamp(score.graphics + Math.round(total / 3)),
      originality: clamp(score.originality + Math.round(total / 3)),
    },
    sceneVarietyBonus: total,
  };
}

// ---------------------------------------------------------------------------
// Stage 3: synergies
// ---------------------------------------------------------------------------

function applySynergies(
  effects: DemoEffect[],
  selectedIds: Set<string>
): { bonus: Partial<ScoreBreakdown>; triggered: string[] } {
  const bonus: Partial<ScoreBreakdown> = {};
  const triggered: string[] = [];
  for (const syn of EFFECT_SYNERGIES) {
    if (syn.effectIds.every((id) => selectedIds.has(id))) {
      triggered.push(syn.id);
      for (const [k, v] of Object.entries(syn.bonus)) {
        if (typeof v === "number") {
          (bonus as Record<string, number>)[k] =
            ((bonus as Record<string, number>)[k] ?? 0) + v;
        }
      }
    }
  }
  return { bonus, triggered };
}

// ---------------------------------------------------------------------------
// Stage 4: artistic direction multipliers + tag bonuses
// ---------------------------------------------------------------------------

function applyArtisticDirection(
  base: ScoreBreakdown,
  direction: ArtisticDirection,
  effects: DemoEffect[]
): { score: ScoreBreakdown; directionModifier: number } {
  const def = ARTISTIC_DIRECTION_DEFS[direction];
  // Apply per-category multipliers.
  const score: ScoreBreakdown = {
    ...base,
    programming: clamp(base.programming * def.scoreMultipliers.programming),
    graphics: clamp(base.graphics * def.scoreMultipliers.graphics),
    music: clamp(base.music * def.scoreMultipliers.music),
    originality: clamp(base.originality * def.scoreMultipliers.originality),
    optimization: clamp(base.optimization * def.scoreMultipliers.optimization),
    audienceAppeal: clamp(
      base.audienceAppeal * def.scoreMultipliers.audienceAppeal
    ),
    technicalDifficulty: clamp(
      base.technicalDifficulty * def.scoreMultipliers.technicalDifficulty
    ),
  };
  // Apply direction-specific synergy-tag bonuses: for every effect in
  // the production, sum the bonuses for each of its `synergyTags` that
  // matches an entry in `def.synergyTagBonuses`, then clamp the total
  // to `def.cap`. The bonus is split evenly across the four
  // "style-driven" categories (graphics / audienceAppeal / originality
  // / music) so a single direction doesn't accidentally dominate one
  // axis.
  let tagBonusTotal = 0;
  for (const eff of effects) {
    for (const tag of eff.synergyTags) {
      const entry = def.synergyTagBonuses.find((b) => b.tag === tag);
      if (entry) tagBonusTotal += entry.bonus;
    }
  }
  tagBonusTotal = Math.min(def.cap, tagBonusTotal);
  if (tagBonusTotal > 0) {
    const each = Math.round(tagBonusTotal / 4);
    score.graphics = clamp(score.graphics + each);
    score.audienceAppeal = clamp(score.audienceAppeal + each);
    score.originality = clamp(score.originality + each);
    score.music = clamp(score.music + each);
  }
  // Direction modifier: a 0-100 magnitude describing how much the
  // direction shifted the raw scores. UI uses this to show a
  // "Direction modifier" badge.
  const directionModifier = clamp(
    Math.round(
      ((def.scoreMultipliers.programming - 1) * 30) +
        ((def.scoreMultipliers.graphics - 1) * 30) +
        ((def.scoreMultipliers.originality - 1) * 30) +
        50
    )
  );
  return { score, directionModifier };
}

// ---------------------------------------------------------------------------
// Stage 5: optimization focus tradeoff
// ---------------------------------------------------------------------------

function applyOptimizationFocus(
  score: ScoreBreakdown,
  focus: "Speed" | "Balanced" | "Visual Quality"
): { score: ScoreBreakdown; optimizationModifier: number } {
  switch (focus) {
    case "Speed":
      return {
        score: {
          ...score,
          optimization: clamp(score.optimization + 8),
          graphics: clamp(score.graphics - 5),
          technicalDifficulty: clamp(score.technicalDifficulty - 3),
        },
        optimizationModifier: 80, // fast turnaround
      };
    case "Balanced":
      return { score, optimizationModifier: 55 };
    case "Visual Quality":
      return {
        score: {
          ...score,
          graphics: clamp(score.graphics + 8),
          audienceAppeal: clamp(score.audienceAppeal + 4),
          optimization: clamp(score.optimization - 5),
        },
        optimizationModifier: 35, // slower
      };
  }
}

// ---------------------------------------------------------------------------
// Stage 6: music module bonus
// ---------------------------------------------------------------------------

function applyMusicModuleBonus(
  score: ScoreBreakdown,
  musicModule?: ScoringInput["musicModule"]
): { score: ScoreBreakdown; musicModuleBonus: number } {
  if (!musicModule) return { score, musicModuleBonus: 0 };
  const formatBonus = FORMAT_BONUS[musicModule.format] ?? 0;
  // Size proxy: modules < 4KB are short jingles; > 256KB are epic.
  const sizeKb = musicModule.sizeBytes / 1024;
  const sizeBonus = clamp(Math.round((sizeKb / 64) * 6), 0, 12);
  const total = formatBonus + sizeBonus;
  return {
    score: {
      ...score,
      music: clamp(score.music + total),
      audienceAppeal: clamp(score.audienceAppeal + Math.round(total / 2)),
    },
    musicModuleBonus: total,
  };
}

// ---------------------------------------------------------------------------
// Stage 7: platform fit
// ---------------------------------------------------------------------------

function applyPlatformFit(
  score: ScoreBreakdown,
  effects: DemoEffect[],
  platform: ScoringInput["platform"]
): { score: ScoreBreakdown; platformFit: number } {
  if (effects.length === 0) {
    return { score, platformFit: 0 };
  }
  // CPU/RAM headroom: how much of the rig's budget is left after these
  // effects. A demo that exactly fills the rig is "tight" (good); one
  // that overflows is "broken" (UI rejects it pre-scoring).
  const totalCpu = effects.reduce((s, e) => s + e.cpuCost, 0);
  const totalRam = effects.reduce((s, e) => s + e.ramCostKb, 0);
  const cpuFit = clamp(100 - Math.round(safeDiv(totalCpu, platform.cpuLimit) * 60));
  const ramFit = clamp(100 - Math.round(safeDiv(totalRam, platform.ramLimitKb) * 60));
  // Compatibility: how many selected effects are compatible with the rig.
  const compatibleCount = effects.filter((e) =>
    e.compatiblePlatforms.includes(platform.id)
  ).length;
  const compatibility = clamp(
    Math.round((compatibleCount / effects.length) * 100)
  );
  const platformFit = clamp(Math.round((cpuFit + ramFit + compatibility) / 3));
  return {
    score: {
      ...score,
      optimization: clamp(score.optimization + Math.round((platformFit - 50) / 5)),
      technicalDifficulty: clamp(
        score.technicalDifficulty + Math.round((100 - platformFit) / 10)
      ),
    },
    platformFit,
  };
}

// ---------------------------------------------------------------------------
// Stage 8: development time factor
// ---------------------------------------------------------------------------

function applyDevelopmentTime(
  score: ScoreBreakdown,
  creation: DemoCreationInput
): { score: ScoreBreakdown; developmentTimeFactor: number; months: number } {
  const dirDef = ARTISTIC_DIRECTION_DEFS[creation.artisticDirection];
  // Base months per duration bucket.
  const baseMonths: Record<string, number> = {
    Short: 1,
    Medium: 2,
    Long: 4,
    Epic: 7,
  };
  const focusMultiplier: Record<string, number> = {
    Speed: 0.5,
    Balanced: 1.0,
    "Visual Quality": 1.6,
  };
  const months = Math.max(
    1,
    Math.round(
      (baseMonths[creation.duration] ?? 2) *
        dirDef.devTimeMultiplier *
        (focusMultiplier[creation.optimizationFocus] ?? 1)
    )
  );
  // Longer dev = more polish (bonus to graphics/optimization) but more
  // risk (slight penalty to technical difficulty as complexity grows).
  const polish = clamp(months * 4); // 1mo=4, 7mo=28
  const risk = clamp(months * 2); // 1mo=2, 7mo=14
  return {
    score: {
      ...score,
      graphics: clamp(score.graphics + Math.round(polish / 3)),
      optimization: clamp(score.optimization + Math.round(polish / 4)),
      technicalDifficulty: clamp(score.technicalDifficulty - Math.round(risk / 4)),
    },
    developmentTimeFactor: clamp(50 + polish - risk),
    months,
  };
}

// ---------------------------------------------------------------------------
// Stage 9: sum categories + final clamp
// ---------------------------------------------------------------------------

function sumCategories(partial: Partial<ScoreBreakdown>): ScoreBreakdown {
  const s = partial as ScoreBreakdown;
  const round = (n: number) => Math.round(clamp(n));
  return {
    programming: round(s.programming ?? 0),
    graphics: round(s.graphics ?? 0),
    music: round(s.music ?? 0),
    originality: round(s.originality ?? 0),
    optimization: round(s.optimization ?? 0),
    audienceAppeal: round(s.audienceAppeal ?? 0),
    technicalDifficulty: round(s.technicalDifficulty ?? 0),
    overall: 0,
    factors: s.factors ?? {
      skillContributions: { programming: 0, graphics: 0, music: 0 },
      effectContributions: { visualImpact: 0, complexity: 0, originality: 0 },
      synergyBonus: 0,
      directionModifier: 0,
      optimizationModifier: 0,
      musicModuleBonus: 0,
      platformFit: 0,
      developmentTimeFactor: 0,
      productionTypeModifier: 0,
      sceneVarietyBonus: 0,
    },
    synergiesTriggered: s.synergiesTriggered ?? [],
  };
}

// ---------------------------------------------------------------------------
// Stage 10: predict placements
// ---------------------------------------------------------------------------

/** Fold a `ScoreBreakdown` through a `JudgingProfile` to a 0-100 score. */
export function weightedScore(
  breakdown: ScoreBreakdown,
  profile: JudgingProfile
): number {
  const w = profile.weights;
  const totalWeight =
    w.programming + w.graphics + w.music + w.originality +
    w.optimization + w.audienceAppeal + w.technicalDifficulty;
  if (totalWeight <= 0) return 0;
  const sum =
    breakdown.programming * w.programming +
    breakdown.graphics * w.graphics +
    breakdown.music * w.music +
    breakdown.originality * w.originality +
    breakdown.optimization * w.optimization +
    breakdown.audienceAppeal * w.audienceAppeal +
    breakdown.technicalDifficulty * w.technicalDifficulty;
  return Math.round(sum / totalWeight);
}

function predictPlacements(
  breakdown: ScoreBreakdown,
  upcomingParties: ScoringInput["upcomingParties"],
  productionTypeName: string
): CompetitionPrediction[] {
  const out: CompetitionPrediction[] = [];
  for (const party of upcomingParties) {
    const baseProfileId = judgingProfileForParty({
      partyId: party.id,
      platformFocus: party.platformFocus,
      year: party.year,
    });
    const profileId = judgingProfileForProductionType(baseProfileId, productionTypeName);
    const profile = JUDGING_PROFILES[profileId] ?? JUDGING_PROFILES["default"];
    const score = weightedScore(breakdown, profile);
    // Heuristic placement: prestige + attendance dilutes the field.
    // Higher score = lower (better) placement number.
    const fieldStrength = Math.round(party.prestige * 0.4 + party.attendance * 0.05);
    const adjusted = score - Math.round(fieldStrength * 0.15);
    const predictedPlacement = Math.max(
      1,
      Math.min(fieldStrength || 8, Math.round(100 - adjusted) + 1)
    );
    // Confidence band.
    let confidence: "low" | "medium" | "high" = "medium";
    if (adjusted >= 75) confidence = "high";
    else if (adjusted < 50) confidence = "low";
    out.push({
      partyId: party.id,
      partyName: party.name,
      judgingProfileId: profileId,
      weightedScore: score,
      predictedPlacement,
      confidence,
    });
  }
  // Sort: best placement first.
  out.sort((a, b) => a.predictedPlacement - b.predictedPlacement);
  return out;
}

// ---------------------------------------------------------------------------
// Awards
// ---------------------------------------------------------------------------

/** Pick the awards this breakdown qualifies for. */
export function awardsForBreakdown(breakdown: ScoreBreakdown): import("@packages/types").DemoAward[] {
  const awards: import("@packages/types").DemoAward[] = [];
  if (breakdown.graphics >= 82) awards.push("Best Effects");
  if (breakdown.music >= 82) awards.push("Best Music");
  if (breakdown.originality >= 82) awards.push("Most Original");
  if (breakdown.optimization >= 82) awards.push("Best Optimization");
  if (breakdown.audienceAppeal >= 82) awards.push("Audience Favorite");
  if (breakdown.technicalDifficulty >= 82) awards.push("Technical Marvel");
  return awards;
}

// ---------------------------------------------------------------------------
// Judge comments (procedural flavor text)
// ---------------------------------------------------------------------------

export function judgeCommentsFor(
  breakdown: ScoreBreakdown,
  direction: ArtisticDirection,
  triggered: string[]
): string[] {
  const out: string[] = [];
  if (breakdown.graphics >= 85) {
    out.push("Stunning visual composition; the palette discipline reads as a coherent vision, not a clip-art dump.");
  } else if (breakdown.graphics < 45) {
    out.push("Visual layer is under-developed for the compo. The room wants to see more happening on screen.");
  }
  if (breakdown.music >= 85) {
    out.push("Music sync is on point. The soundtrack drives the demo, not the other way around.");
  } else if (breakdown.music < 40) {
    out.push("A canned SID tune would land harder than the track supplied. Score this with a real composer next time.");
  }
  if (breakdown.optimization >= 80) {
    out.push("Cycle-exact work. The fact this runs at full framerate is the demo.");
  } else if (breakdown.optimization < 40) {
    out.push("Frame pacing collapses on real hardware. Polish the inner loop before you touch the visuals.");
  }
  if (breakdown.originality >= 85) {
    out.push(`A ${direction.toLowerCase()} piece that actually attempts something new. Respect.`);
  } else if (breakdown.originality < 40) {
    out.push("We've seen these techniques stitched together in a dozen other entries this year.");
  }
  if (triggered.length > 0) {
    out.push(`${triggered.length} synergy combo${triggered.length === 1 ? "" : "s"} fired — the whole reads greater than the sum of its parts.`);
  }
  if (breakdown.audienceAppeal >= 85) {
    out.push("The crowd was into it from the first frame. That's a placement-winning read.");
  } else if (breakdown.audienceAppeal < 45) {
    out.push("Technical merits aside, the room didn't lean in. The audience vote will punish this.");
  }
  if (out.length === 0) {
    out.push("A workmanlike entry. Nothing to call out, nothing to complain about.");
  }
  return out;
}

// ---------------------------------------------------------------------------
// Era start years (for the compatibleEffects era filter AND for
// researchNode validation in App.tsx — exported so callers can refuse
// researching future-era techs).
// ---------------------------------------------------------------------------

export const ERA_START_YEAR: Record<EraId, number> = {
  [EraId.ERA_8_BIT]: 1985,
  [EraId.ERA_16_BIT]: 1990,
  [EraId.ERA_PC_DAWN]: 1996,
  [EraId.ERA_3D_SHADER]: 2001,
  [EraId.ERA_HD_SHADER]: 2006,
};

// ---------------------------------------------------------------------------
// Public: compatibleEffects
// ---------------------------------------------------------------------------

/**
 * Filter the effect catalog down to effects the player can legally use
 * on a given platform at the current game year. Effects are gated by:
 *   - `compatiblePlatforms` includes the active platform id
 *   - the effect's era has already begun (currentYear >= era start year)
 * Effects that fail EITHER check are returned in a parallel array
 * (`incompatible`) with a reason, so the UI can show *why* an effect is
 * disabled (not just hide it).
 */
export function compatibleEffects(
  effects: DemoEffect[],
  platform: PlatformId,
  currentYear: number
): {
  compatible: DemoEffect[];
  incompatible: { effect: DemoEffect; reason: "platform" | "era" | "both" }[];
} {
  const compatible: DemoEffect[] = [];
  const incompatible: { effect: DemoEffect; reason: "platform" | "era" | "both" }[] = [];
  for (const e of effects) {
    const platformOk = e.compatiblePlatforms.includes(platform);
    // Default to 9999 (far future) so an unknown era id locks the
    // effect rather than silently passing the era check.
    const eraStart = ERA_START_YEAR[e.era] ?? 9999;
    const eraOk = currentYear >= eraStart;
    if (platformOk && eraOk) {
      compatible.push(e);
    } else {
      const reason =
        !platformOk && !eraOk ? "both" : !platformOk ? "platform" : "era";
      incompatible.push({ effect: e, reason });
    }
  }
  return { compatible, incompatible };
}

// ---------------------------------------------------------------------------
// Public: generateDemoSummary (one-call builder)
// ---------------------------------------------------------------------------

/**
 * One-call builder that runs the full pipeline and returns a complete
 * `DemoSummary`. The caller passes:
 *   - `creation`        : the player's `DemoCreationInput`
 *   - `effects`         : resolved `DemoEffect` objects (from DEMO_EFFECTS)
 *   - `crewSkills`      : aggregated crew programming/graphics/music
 *   - `musicModule`     : optional tracker metadata if a playlist track
 *                         was selected
 *   - `platform`        : the active rig (id, cpuLimit, ramLimitKb)
 *   - `upcomingParties` : the party calendar entries to predict against
 *   - `currentYear`     : for era gating in `compatibleEffects`
 *
 * The function is pure — no I/O, no React, no LLM.
 */
export function generateDemoSummary(args: {
  creation: DemoCreationInput;
  effects: DemoEffect[];
  crewSkills: { programming: number; graphics: number; music: number };
  musicModule?: ScoringInput["musicModule"];
  platform: ScoringInput["platform"];
  upcomingParties: ScoringInput["upcomingParties"];
  currentYear: number;
  /** Optional pre-computed production object; if omitted, one is built. */
  production?: import("@packages/types").Production;
}): DemoSummary {
  const { creation, effects, crewSkills, musicModule, platform, upcomingParties, currentYear } = args;

  // 1+2: base contributions
  const skills = computeSkillContributions({ creation, effects, crewSkills, platform, upcomingParties });
  const effectsContrib = computeEffectContributions(effects);

  // Build a base ScoreBreakdown from skills + effect contributions.
  const basePartial: Partial<ScoreBreakdown> = {
    programming: skills.programming,
    graphics: skills.graphics,
    music: skills.music,
    originality: effectsContrib.originality,
    // Below three are derived later but we need a starting point.
    optimization: 30,
    audienceAppeal: 40,
    technicalDifficulty: 30,
    factors: {
      skillContributions: skills,
      effectContributions: effectsContrib,
      synergyBonus: 0,
      directionModifier: 0,
      optimizationModifier: 0,
      musicModuleBonus: 0,
      platformFit: 0,
      developmentTimeFactor: 0,
      productionTypeModifier: 0,
      sceneVarietyBonus: 0,
    },
    synergiesTriggered: [],
  };
  let working = sumCategories(basePartial);

  // 3: synergies
  const selectedIds = new Set(creation.effects);
  const syn = applySynergies(effects, selectedIds);
  if (syn.bonus.graphics) working.graphics = clamp(working.graphics + syn.bonus.graphics);
  if (syn.bonus.music) working.music = clamp(working.music + syn.bonus.music);
  if (syn.bonus.originality) working.originality = clamp(working.originality + syn.bonus.originality);
  if (syn.bonus.audienceAppeal) working.audienceAppeal = clamp(working.audienceAppeal + syn.bonus.audienceAppeal);
  if (syn.bonus.technicalDifficulty) working.technicalDifficulty = clamp(working.technicalDifficulty + syn.bonus.technicalDifficulty);
  if (syn.bonus.programming) working.programming = clamp(working.programming + syn.bonus.programming);
  working.synergiesTriggered = syn.triggered;
  working.factors.synergyBonus = (Object.values(syn.bonus) as number[]).reduce<number>((s, v) => s + (typeof v === "number" ? v : 0), 0);

  // 3a: production type modifiers
  const typeMod = applyProductionTypeModifiers(working, creation.type);
  working = typeMod.score;
  working.factors.productionTypeModifier = typeMod.typeModifier;

  // 3b: scene variety bonus
  const sceneVar = applySceneVarietyBonus(working, creation);
  working = sceneVar.score;
  working.factors.sceneVarietyBonus = sceneVar.sceneVarietyBonus;

  // 4: artistic direction
  const dir = applyArtisticDirection(working, creation.artisticDirection, effects);
  working = dir.score;
  working.factors.directionModifier = dir.directionModifier;

  // 5: optimization focus
  const opt = applyOptimizationFocus(working, creation.optimizationFocus);
  working = opt.score;
  working.factors.optimizationModifier = opt.optimizationModifier;

  // 6: music module bonus
  const mus = applyMusicModuleBonus(working, musicModule);
  working = mus.score;
  working.factors.musicModuleBonus = mus.musicModuleBonus;

  // 7: platform fit
  const fit = applyPlatformFit(working, effects, platform);
  working = fit.score;
  working.factors.platformFit = fit.platformFit;

  // 8: development time
  const dt = applyDevelopmentTime(working, creation);
  working = dt.score;
  working.factors.developmentTimeFactor = dt.developmentTimeFactor;

  // 9: final overall
  working.overall = Math.round(
    clamp(
      (working.programming + working.graphics + working.music +
        working.originality + working.optimization + working.audienceAppeal +
        working.technicalDifficulty) / 7
    )
  );

  // 10: predictions
  const predictions = predictPlacements(working, upcomingParties, String(creation.type));

  // Awards + judge comments
  const awards = awardsForBreakdown(working);
  const judgeComments = judgeCommentsFor(working, creation.artisticDirection, working.synergiesTriggered);

  // Build the production object (reuse the caller's if provided).
  const production =
    args.production ??
    ({
      id: `prod_${Date.now()}`,
      name: creation.name,
      // year/month are filled by the caller (App.tsx knows the game clock).
      year: 0,
      month: 0,
      type: creation.type,
      platform: creation.platform,
      groupName: "",
      effects: [...creation.effects],
      codingEffort: creation.effort.coding,
      artEffort: creation.effort.art,
      musicEffort: creation.effort.music,
      optimizationLevel: Math.ceil(creation.effort.optimization / 20),
      compressionLevel: Math.ceil(creation.effort.optimization / 20),
      sizeB: 0,
      scoreTechnical: working.programming,
      scoreAesthetic: working.graphics,
      scoreAudio: working.music,
      scoreOriginality: working.originality,
      totalScore: working.overall,
      reputationGained: Math.floor(working.overall / 3),
      artisticDirection: creation.artisticDirection,
      optimizationFocus: creation.optimizationFocus,
      duration: creation.duration,
      musicTrackStoredName: creation.musicTrackStoredName,
    } as import("@packages/types").Production);

  return {
    production,
    breakdown: working,
    predictions,
    awards,
    judgeComments,
    developmentTimeMonths: dt.months,
  };
}

