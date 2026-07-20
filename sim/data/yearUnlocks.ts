/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Year milestone unlocks — maps calendar years to tech IDs that
 * automatically unlock when the player advances to that year.
 *
 * Pure data. NO React, NO LLM, NO side effects.
 *
 * These are the "free" auto-unlocks that happen as the calendar ticks:
 * foundational techniques that become available at historically
 * appropriate years, without requiring the player to spend research points.
 *
 * Techs with `researchRequired: true` on their effects are NOT auto-
 * unlocked here — the player must research them manually.
 * Techs with effects that are `researchRequired: false` get their
 * effects auto-unlocked, but the tech node itself still shows as
 * "available" rather than "researched" (unless the tech has a 0 cost).
 *
 * Convention: each entry's tech IDs should be a subset of the full
 * TECH_YEAR_UNLOCK_MAP keys. A tech can belong to multiple years
 * (e.g., foundational techs like raster_sync are available from day 1).
 */

/** Tech IDs that auto-unlock at the start of each calendar year. */
export const YEAR_UNLOCK_MAP: Record<number, string[]> = {
  // 1985 — the dawn; raster is always there
  1985: ["raster_sync", "sid_analog_mod"],

  // 1986 — sprite & scroller basics
  1988: ["custom_spr_tricky"],

  // 1990 — 16-bit era begins: Amiga copper, trackers, overscan
  1990: ["copper_lists", "tracker_mod_composition", "overscan_trick"],

  // 1991 — Blitter abuse & vector basics, tracker MOD scene explodes
  1991: ["blitter_abuse"],

  // 1992 — PC VGA mode 13h unlocks, Amiga 1200 pushes AGA
  1992: ["vga_mode13h_flat", "c2p_assembly"],

  // 1994 — Fixed-point 3D math goes mainstream, voxel experiments begin
  1994: ["asm3d_pipeline", "voxel_heightfield"],

  // 1995 — GUS audio + texture mapping arrive with the Pentium
  1995: ["gus_hardware_mixing", "compress_cranker"],

  // 1998 — OpenGL changes everything, procedural textures emerge
  1998: ["opengl_direct3d", "procedural_textures"],

  // 2001 — programmable GPUs, pixel pipelines
  2001: ["raymarching_sdf"],

  // 2002 — pixel shader 2.0 unlocks real-time procedural art
  2002: ["pixel_shader_20"],

  // 2005 — GLSL high-level shading
  2005: ["glsl_shading"],

  // 2010 — compute shaders, massive parallelism
  2010: ["compute_shaders"],

  // 2015 — raymarching goes mainstream in 4K/64K intros
  2015: ["advanced_raymarching"],

  // 2020+ — modern era tools
  2020: ["modern_procedural", "ai_assisted_tools"],
};

/** Convenience: get all tech IDs that auto-unlock at or before a given year. */
export function getYearUnlockedTechIds(year: number): Set<string> {
  const ids = new Set<string>();
  for (const [yrStr, techIds] of Object.entries(YEAR_UNLOCK_MAP)) {
    const yr = parseInt(yrStr, 10);
    if (yr <= year) {
      for (const id of techIds) ids.add(id);
    }
  }
  return ids;
}
