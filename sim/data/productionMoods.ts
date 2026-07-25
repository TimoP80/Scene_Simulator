/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PRODUCTION_MOOD_DEFS — the data behind the player's "Production Mood"
 * choice in the expanded studio. Each mood is an orthogonal dimension to
 * Artistic Direction: the direction describes *how* the production is
 * approached (technically, artistically), while the mood describes the
 * emotional and visual *tone*.
 *
 * Moods affect scoring through graphics and music multipliers, giving
 * the player a second creative axis to tune.
 */

import type { ProductionMood } from "@packages/types";

export interface ProductionMoodDef {
  id: ProductionMood;
  description: string;
  /** Per-category multipliers (1.0 = neutral). Mostly affects graphics
   * and music, with small effects on originality and audience appeal. */
  scoreMultipliers: {
    graphics: number;
    music: number;
    originality: number;
    audienceAppeal: number;
  };
  /** Flavor text shown next to the mood selector. */
  flavor: string;
  /** Effect synergy tags that pair well with this mood. */
  preferredSynergyTags: string[];
}

export const PRODUCTION_MOOD_DEFS: Record<ProductionMood, ProductionMoodDef> = {
  "Dark Cyberpunk": {
    id: "Dark Cyberpunk",
    description:
      "High-contrast neon on black, with glitch artifacts, scanlines, and gritty industrial textures.",
    scoreMultipliers: {
      graphics: 1.1,
      music: 1.05,
      originality: 1.1,
      audienceAppeal: 1.0,
    },
    flavor: "Neon, chrome, rain, and rebellion. The future is dystopian.",
    preferredSynergyTags: ["glitch", "vector", "procedural"],
  },
  "Neon Retro": {
    id: "Neon Retro",
    description:
      "Synthwave sunsets, magenta grids, and warm CRT glow. Pure 80s aesthetic.",
    scoreMultipliers: {
      graphics: 1.15,
      music: 1.1,
      originality: 0.9,
      audienceAppeal: 1.15,
    },
    flavor: "Outrun the night to a pulse-pounding analog synth beat.",
    preferredSynergyTags: ["raster", "copper", "palette"],
  },
  "Colorful Abstract": {
    id: "Colorful Abstract",
    description:
      "Explosive rainbow gradients, flowing organic shapes, and vibrant procedural chaos.",
    scoreMultipliers: {
      graphics: 1.2,
      music: 0.95,
      originality: 1.15,
      audienceAppeal: 1.0,
    },
    flavor: "A psychedelic kaleidoscope of pure computational expression.",
    preferredSynergyTags: ["procedural", "palette", "trig"],
  },
  "Monochrome Minimal": {
    id: "Monochrome Minimal",
    description:
      "Stark black-and-white precision. Every pixel is deliberate; negative space is content.",
    scoreMultipliers: {
      graphics: 0.9,
      music: 1.0,
      originality: 1.2,
      audienceAppeal: 0.85,
    },
    flavor: "Less is more. Discipline over spectacle.",
    preferredSynergyTags: ["sdf", "raycast", "cycle-exact"],
  },
  "Nature Organic": {
    id: "Nature Organic",
    description:
      "Earth tones, flowing water-like simulations, pollen-like particle systems, and bioluminescent lifeforms.",
    scoreMultipliers: {
      graphics: 1.05,
      music: 1.15,
      originality: 1.0,
      audienceAppeal: 1.1,
    },
    flavor: "Technology meets the natural world. Code becomes life.",
    preferredSynergyTags: ["physics", "procedural", "easing"],
  },
  "Surreal Dreamlike": {
    id: "Surreal Dreamlike",
    description:
      "Impossible geometries, melting landscapes, Escher-like recursion, and soft pastel gradients.",
    scoreMultipliers: {
      graphics: 1.1,
      music: 1.0,
      originality: 1.25,
      audienceAppeal: 0.9,
    },
    flavor: "Nothing makes sense, and that is exactly the point.",
    preferredSynergyTags: ["novel", "sdf", "procedural-audio"],
  },
};
