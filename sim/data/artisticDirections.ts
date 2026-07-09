/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ARTISTIC_DIRECTION_DEFS — the data behind the player's "Artistic
 * Direction" choice in the expanded studio. Each direction biases the
 * multi-category scoring formula (see sim/domain/scoring.ts) and grants
 * a small set of synergy-tag bonuses that amplify compatible effects.
 *
 * Why a separate data file:
 *   The scoring math lives in sim/domain/scoring.ts. The per-direction
 *   numbers live here so the engine can stay pure (no hardcoded magic
 *   numbers in the math) and so future patches can A/B-test direction
 *   balance without touching the engine.
 */

import type { ArtisticDirection } from "@packages/types";

export interface ArtisticDirectionDef {
  id: ArtisticDirection;
  description: string;
  /** Per-category multipliers applied to the base score (1.0 = neutral). */
  scoreMultipliers: {
    programming: number;
    graphics: number;
    music: number;
    originality: number;
    optimization: number;
    audienceAppeal: number;
    technicalDifficulty: number;
  };
  /**
   * Bonus applied when a selected effect carries any of these
   * `synergyTags`. The bonus stacks additively across multiple matching
   * effects (capped at `cap`).
   */
  synergyTagBonuses: { tag: string; bonus: number }[];
  /** Hard cap on cumulative synergy tag bonus (0-30). */
  cap: number;
  /**
   * Multiplier on the base development time. Experimental + Visual
   * Quality push this up; Speed push it down.
   */
  devTimeMultiplier: number;
}

export const ARTISTIC_DIRECTION_DEFS: Record<ArtisticDirection, ArtisticDirectionDef> = {
  "Technical Showcase": {
    id: "Technical Showcase",
    description:
      "Bragging-rights production. Optimization, clean code, and CPU/RAM discipline win the room.",
    scoreMultipliers: {
      programming: 1.25,
      graphics: 0.9,
      music: 0.9,
      originality: 1.0,
      optimization: 1.3,
      audienceAppeal: 0.85,
      technicalDifficulty: 1.35,
    },
    synergyTagBonuses: [
      { tag: "asm", bonus: 4 },
      { tag: "cycle-exact", bonus: 4 },
      { tag: "fixed-point", bonus: 3 },
    ],
    cap: 12,
    devTimeMultiplier: 1.15,
  },
  Artistic: {
    id: "Artistic",
    description:
      "Composition, palette, motion. Beauty wins over brute force.",
    scoreMultipliers: {
      programming: 0.9,
      graphics: 1.3,
      music: 1.15,
      originality: 1.1,
      optimization: 0.9,
      audienceAppeal: 1.25,
      technicalDifficulty: 0.85,
    },
    synergyTagBonuses: [
      { tag: "palette", bonus: 4 },
      { tag: "easing", bonus: 3 },
      { tag: "copper", bonus: 2 },
    ],
    cap: 12,
    devTimeMultiplier: 1.1,
  },
  Experimental: {
    id: "Experimental",
    description:
      "Try something nobody has shipped. Originality is the only currency that matters.",
    scoreMultipliers: {
      programming: 1.1,
      graphics: 1.0,
      music: 1.0,
      originality: 1.4,
      optimization: 0.85,
      audienceAppeal: 0.9,
      technicalDifficulty: 1.2,
    },
    synergyTagBonuses: [
      { tag: "novel", bonus: 5 },
      { tag: "sdf", bonus: 4 },
      { tag: "procedural", bonus: 3 },
    ],
    cap: 15,
    devTimeMultiplier: 1.3,
  },
  Oldschool: {
    id: "Oldschool",
    description:
      "Cycle-exact hardware abuse. Restricted to 8-bit / 16-bit era tricks. Style is the discipline.",
    scoreMultipliers: {
      programming: 1.2,
      graphics: 1.0,
      music: 1.0,
      originality: 0.95,
      optimization: 1.25,
      audienceAppeal: 1.05,
      technicalDifficulty: 1.15,
    },
    synergyTagBonuses: [
      { tag: "raster", bonus: 4 },
      { tag: "blitter", bonus: 3 },
      { tag: "copper", bonus: 3 },
    ],
    cap: 12,
    devTimeMultiplier: 1.0,
  },
  "Music-Driven": {
    id: "Music-Driven",
    description:
      "The soundtrack is the demo. Visuals serve the beat; the beat drives the room.",
    scoreMultipliers: {
      programming: 0.95,
      graphics: 1.1,
      music: 1.4,
      originality: 1.0,
      optimization: 0.9,
      audienceAppeal: 1.3,
      technicalDifficulty: 0.9,
    },
    synergyTagBonuses: [
      { tag: "sync", bonus: 5 },
      { tag: "tracker", bonus: 4 },
      { tag: "procedural-audio", bonus: 3 },
    ],
    cap: 12,
    devTimeMultiplier: 1.05,
  },
};
