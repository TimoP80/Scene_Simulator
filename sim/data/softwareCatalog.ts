/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SOFTWARE_CATALOG — typed seed of dev tools, trackers and image editors
 * the player can buy through `SoftwarePurchased` events. Each tool carries
 * `effectUnlocks: DemoEffectId[]` — those ids should cross-reference
 * sim/data/demoEffects.ts so a future "owned software -> enabled effect"
 * projection can derive compile-time capability without an explicit state
 * transition.
 *
 * Pure data. No React, no LLM. Numbers are calibrated as a coarse
 * progression ladder — early tools are cheap and immediately assist
 * 8-bit-era effects; late tools are expensive but essential for 4K intros
 * / shader pipelines.
 */

import type { SoftwareOffering } from "@packages/types";

export const SOFTWARE_CATALOG: SoftwareOffering[] = [
  // ---- 8-bit (1985–1989) -------------------------------------------------
  {
    id: "sw_turbo_assembler_c64",
    name: "Turbo Assembler (C64)",
    type: "assembler",
    releaseYear: 1985,
    purchasePrice: 60,
    effectUnlocks: ["raster_bars", "sine_scroller", "starfield_2d"],
    description:
      "Cycle-accurate 6502 macro assembler with copper-list syntax extensions. Indispensable for raster tricks.",
  },
  {
    id: "sw_sid_wizard",
    name: "SID-Wizard",
    type: "tracker",
    releaseYear: 1987,
    purchasePrice: 90,
    effectUnlocks: ["sine_scroller"],
    description: "Tracker-style SID composer with envelope arpeggio macros. Loops SID thru ADSR sweeps.",
  },

  // ---- 16-bit (1990–1995) -------------------------------------------------
  {
    id: "sw_devpac_3",
    name: "DevPac 3 (ST/Amiga)",
    type: "assembler",
    releaseYear: 1990,
    purchasePrice: 120,
    effectUnlocks: ["twister", "animated_plasma"],
    description:
      "Motorola 68000 assembler with debug symbols and Blitter-aware optimization pragmas.",
  },
  {
    id: "sw_octamed_pro",
    name: "OctaMED Pro",
    type: "tracker",
    releaseYear: 1991,
    purchasePrice: 110,
    effectUnlocks: ["animated_plasma", "chunky_to_planar"],
    description: "Eight-channel Amiga tracker with stereo PCM recording and full VST-style buses.",
  },
  {
    id: "sw_deluxe_paint_4",
    name: "Deluxe Paint IV",
    type: "image_editor",
    releaseYear: 1991,
    purchasePrice: 140,
    effectUnlocks: ["vector_cube", "chunky_to_planar"],
    description:
      "The Amiga pixel artist's right hand. HAM mode animations, copper gradients, anti-aliased scope.",
  },
  {
    id: "sw_fasttracker_2",
    name: "FastTracker II",
    type: "tracker",
    releaseYear: 1994,
    purchasePrice: 130,
    effectUnlocks: ["metaballs_2d", "tunnel_effect"],
    description:
      "DOS tracker that pushed Gravis Ultrasound to the limit. Modular patterns, sample-accurate timing.",
  },

  // ---- PC dawn (1996–2000) -----------------------------------------------
  {
    id: "sw_tasm_5",
    name: "TASM 5.0",
    type: "assembler",
    releaseYear: 1996,
    purchasePrice: 180,
    effectUnlocks: ["texture_mapper", "voxel_hills"],
    description:
      "32-bit flat-mode assembler with MMX-aware macros. The wizard's choice for 4K voxel intros.",
  },
  {
    id: "sw_modplug_tracker",
    name: "MODPlug Tracker",
    type: "tracker",
    releaseYear: 1997,
    purchasePrice: 90,
    effectUnlocks: ["gouraud_shading", "voxel_hills"],
    description:
      "Tracker + VST plugin host. Lets demo crews reuse pirated VSTs in their own miniature synth stubs.",
  },
  {
    id: "sw_photoshop_5",
    name: "Photoshop 5 LE",
    type: "image_editor",
    releaseYear: 1998,
    purchasePrice: 280,
    // NOTE: the first entry `"procedural_textures"` is a deliberate stale
    // ref (the string is the TechNode id `procedural_textures`, NOT an
    // effect id) — it is load-bearing for sim/__tests__/effectUnlocks.smoke.ts
    // Scenario 5, which pins the sanitize step's behaviour against exactly
    // this fixture. Removing it silently flips the test's expected stale-ref
    // fingerprint and breaks the deliberate-fixture contract. See the giant
    // ⚠️ NOTE block at the top of that test before editing this array.
    effectUnlocks: ["procedural_textures", "domain_warp_field", "cloth_physics"],
    description:
      "Limited Photoshop release with bundled Kodak CMS. Used by intro crews to author texture sets for shaders.",
  },
  {
    id: "sw_exe_cranker",
    name: "EXE Cranker 1.6",
    type: "compressor",
    releaseYear: 1997,
    purchasePrice: 220,
    effectUnlocks: ["procedural_synth"],
    description:
      "LZSS + Huffman executable packer aimed at the 4KB intro category. Pairs with apack against movfuscation.",
  },

  // ---- Modern shader (2001–2005) -----------------------------------------
  {
    id: "sw_msvc_6_lean",
    name: "Visual C++ 6.0 Lean Build",
    type: "ide",
    releaseYear: 1998,
    purchasePrice: 320,
    effectUnlocks: ["raymarching_3d", "cloth_physics", "procedural_synth"],
    description:
      "Trims Microsoft's reference IDE down to the linker + assembler bytes for 4KB / 64KB intros.",
  },
  {
    id: "sw_cranker_cruncher",
    name: "APACK Cranker 3.0",
    type: "compressor",
    releaseYear: 2002,
    purchasePrice: 350,
    effectUnlocks: ["raymarching_3d"],
    description:
      "Latest apack lineage — squeezes entire shaders under bytewise limits while preserving fast startup.",
  },
];
