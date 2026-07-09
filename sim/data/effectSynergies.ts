/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * EFFECT_SYNERGIES — when two (or more) effects are bundled in the same
 * production, certain combinations produce a score bonus in specific
 * judging categories. The list below is a flat array of `EffectSynergy`
 * entries; the scoring engine sums the bonuses of every fired pair and
 * clamps the result to a sensible cap.
 *
 * Why a flat list and not a graph:
 *   The bonus only fires when ALL listed `effectIds` are selected. A flat
 *   list of (effectIds, perCategoryBonus) is the simplest data shape that
 *   supports 2-pair, 3-pair, and (future) n-pair synergies uniformly.
 *   Adding a new synergy is a one-line append.
 */

import type { ScoreBreakdown } from "@packages/types";

export interface EffectSynergy {
  id: string;
  /** Human-readable name shown in the Demo Summary "Synergies" section. */
  name: string;
  description: string;
  /** Effect IDs that must ALL be selected to trigger this synergy. */
  effectIds: string[];
  /** Per-category bonus added to the breakdown when fired. */
  bonus: Partial<Pick<ScoreBreakdown, "graphics" | "programming" | "music" | "originality" | "audienceAppeal" | "technicalDifficulty">>;
}

export const EFFECT_SYNERGIES: EffectSynergy[] = [
  {
    id: "syn_plasma_copper",
    name: "Plasma + Copper Bars",
    description:
      "The classic Amiga combo: animated plasma breathing under a copper-bar gradient. The two feed off each other and read as a single composition.",
    effectIds: ["animated_plasma", "raster_bars"],
    bonus: { graphics: 8, audienceAppeal: 6 },
  },
  {
    id: "syn_tunnel_starfield",
    name: "Tunnel + Starfield",
    description:
      "A precalculated tunnel with parallax star sprites flying past. The depth reads as infinite and the room loses its mind.",
    effectIds: ["tunnel_effect", "starfield_2d"],
    bonus: { graphics: 7, audienceAppeal: 7 },
  },
  {
    id: "syn_voxel_texmap",
    name: "Voxel + Texture Mapping",
    description:
      "Textured triangles over a voxel heightfield. Mountain ranges you can almost touch.",
    effectIds: ["voxel_hills", "texture_mapper"],
    bonus: { graphics: 8, technicalDifficulty: 5, programming: 3 },
  },
  {
    id: "syn_raymarch_procsynth",
    name: "Raymarching + Procedural Synth",
    description:
      "Signed-distance fields paired with a few-hundred-byte synth. Both are size-optimized; together they're a 64k flex.",
    effectIds: ["raymarching_3d", "procedural_synth"],
    bonus: { programming: 6, originality: 8, technicalDifficulty: 6 },
  },
  {
    id: "syn_vector_plasma",
    name: "Vector Cube + Sine Plasma",
    description:
      "Flat-shaded geometry drifting over a sine-plasma backdrop. Reads as '90s demoscene wallpaper' — the good kind.",
    effectIds: ["vector_cube", "animated_plasma"],
    bonus: { graphics: 6, audienceAppeal: 4 },
  },
  {
    id: "syn_fire_tunnel",
    name: "Pixel Fire + Tunnel",
    description:
      "Doom-fire sprites flowing through a precalculated tunnel. Surprisingly warm; the demo equivalent of a fireplace.",
    effectIds: ["pixel_fire", "tunnel_effect"],
    bonus: { graphics: 5, originality: 4 },
  },
  {
    id: "syn_cloth_gouraud",
    name: "Cloth + Gouraud Shading",
    description:
      "Mass-spring cloth over a Gouraud-shaded ground plane. The fabric catches the light the way the audience expects it to.",
    effectIds: ["cloth_physics", "gouraud_shading"],
    bonus: { graphics: 6, technicalDifficulty: 4 },
  },
  {
    id: "syn_chunky_twister",
    name: "Chunky-to-Planar + Twister",
    description:
      "The classic Amiga technique: convert chunky buffers to planar bitplanes every frame, then twist them. Pure 16-bit pain, pure 16-bit joy.",
    effectIds: ["chunky_to_planar", "twister"],
    bonus: { programming: 7, originality: 5 },
  },
  {
    id: "syn_metaball_fractal",
    name: "Metaballs + Mandelbrot Zoomer",
    description:
      "Liquid metaballs reflected inside a Mandelbrot interior. Two procedurals feeding each other.",
    effectIds: ["metaballs_2d", "fractal_renderer"],
    bonus: { originality: 8, audienceAppeal: 5, graphics: 4 },
  },
  {
    id: "syn_scroller_fire",
    name: "Sine Scroller + Pixel Fire",
    description:
      "A scrolltext over a doom-fire flame bed. BBS-magazine classic; the audience reads every line.",
    effectIds: ["sine_scroller", "pixel_fire"],
    bonus: { audienceAppeal: 6, music: 3 },
  },
];
