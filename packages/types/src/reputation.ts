/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reputation types — multi-dimensional reputation vector for v0.6.0
 * expansion. Replaces the single scalar reputation with 8 orthogonal
 * axes so different gameplay actions affect different aspects of
 * the player's standing in the demoscene.
 *
 * Pure data structures. NO React, NO LLM, NO side effects.
 *
 * Axes:
 *   technical        — coding prowess, algorithm innovation, effect mastery
 *   artistic         — visual composition, color theory, pixel art
 *   music            — tracker skill, soundtrack composition
 *   graphics         — 3D modeling, texture art, procedural visuals
 *   partyPopularity  — how well-known at demoparties, attendance fame
 *   sceneRespect     — overall standing among scene elders & legends
 *   communityRespect — BBS reputation, helpfulness, community service
 *   oldschoolCredibility — retro cred, 8-bit/16-bit era authenticity
 */

export interface ReputationVector {
  technical: number;
  artistic: number;
  music: number;
  graphics: number;
  partyPopularity: number;
  sceneRespect: number;
  communityRespect: number;
  oldschoolCredibility: number;
}

/** All reputation dimension keys in display order. */
export const REPUTATION_DIMENSIONS: Array<keyof ReputationVector> = [
  "technical",
  "artistic",
  "music",
  "graphics",
  "partyPopularity",
  "sceneRespect",
  "communityRespect",
  "oldschoolCredibility",
];

/** Human-readable labels for each dimension. */
export const REPUTATION_LABELS: Record<keyof ReputationVector, string> = {
  technical: "Technical",
  artistic: "Artistic",
  music: "Music",
  graphics: "Graphics",
  partyPopularity: "Party Popularity",
  sceneRespect: "Scene Respect",
  communityRespect: "Community Respect",
  oldschoolCredibility: "Oldschool Cred",
};

/** Compact single-line labels for cramped UI surfaces. */
export const REPUTATION_SHORT_LABELS: Record<keyof ReputationVector, string> = {
  technical: "TECH",
  artistic: "ART",
  music: "MUS",
  graphics: "GFX",
  partyPopularity: "PARTY",
  sceneRespect: "SCENE",
  communityRespect: "COMM",
  oldschoolCredibility: "RETRO",
};

/** Default starting reputation vector for a new game (total ~160, matching legacy 20 avg). */
export const DEFAULT_REPUTATION_VECTOR: ReputationVector = {
  technical: 20,
  artistic: 20,
  music: 20,
  graphics: 20,
  partyPopularity: 20,
  sceneRespect: 20,
  communityRespect: 20,
  oldschoolCredibility: 20,
};

/** Clamp all axes to 0-1000. */
export const REPUTATION_MIN = 0;
export const REPUTATION_MAX = 1000;

/**
 * Compute a legacy scalar reputation (0-1000) from a vector.
 * Used for backward-compatible reads by parts of the codebase
 * that haven't been migrated yet.
 */
export function reputationVectorToLegacy(v: ReputationVector): number {
  return Math.round(
    (v.technical + v.artistic + v.music + v.graphics +
     v.partyPopularity + v.sceneRespect + v.communityRespect +
     v.oldschoolCredibility) / 8
  );
}

/** Clamp an individual axis value. */
export function clampReputationAxis(n: number): number {
  return Math.max(REPUTATION_MIN, Math.min(REPUTATION_MAX, Math.round(n)));
}

/**
 * Apply a partial delta to a reputation vector and return a new vector.
 * Each axis is clamped independently. Negative deltas won't go below 0;
 * positive deltas won't exceed 1000.
 */
export function applyReputationDelta(
  current: ReputationVector,
  delta: Partial<ReputationVector>,
): ReputationVector {
  const next = { ...current };
  for (const key of REPUTATION_DIMENSIONS) {
    const d = delta[key];
    if (d !== undefined) {
      next[key] = clampReputationAxis(current[key] + d);
    }
  }
  return next;
}
