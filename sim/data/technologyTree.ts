/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TECHNOLOGY_TREE catalogue \u2014 moved verbatim from src/data.ts.
 * Static tech graph nodes; pure data only.
 */

import { EraId, PlatformId, TechNode } from "@packages/types";

export const TECHNOLOGY_TREE: TechNode[] = [
  // 8-bit era
  {
    id: "raster_sync",
    name: "Raster Interrupt Synchronization",
    description: "Allows executing CPU code precisely when a specific screen line is drawn. Vital for retro stability.",
    costPoints: 20,
    preRequisiteIds: [],
    era: EraId.ERA_8_BIT,
    platformUnlocks: [PlatformId.C64, PlatformId.ZX_SPECTRUM],
    effectUnlocks: ["raster_bars", "sine_scroller"],
    bonusAttribute: { type: "coding", value: 10 },
    researched: false
  },
  {
    id: "custom_spr_tricky",
    name: "VIC-II Sprite Multiplexing",
    description: "Trick the hardware to display more than 8 sprites on screen by swapping coordinates during middle-screen interrupts.",
    costPoints: 40,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_8_BIT,
    platformUnlocks: [PlatformId.C64],
    effectUnlocks: ["starfield_2d"],
    bonusAttribute: { type: "optimization", value: 15 },
    researched: false
  },
  {
    id: "sid_analog_mod",
    name: "SID ADSR Filter Sweeps",
    description: "Mastering the analog envelope capabilities of the Commodore 64 SID chip for juicy bass waveforms.",
    costPoints: 25,
    preRequisiteIds: [],
    era: EraId.ERA_8_BIT,
    platformUnlocks: [PlatformId.C64],
    effectUnlocks: [],
    bonusAttribute: { type: "music", value: 20 },
    researched: false
  },
  // 16-bit era
  {
    id: "copper_lists",
    name: "Amiga Copper Program Lists",
    description: "Learn to write autonomous micro-code for the Amiga's Copper display processor.",
    costPoints: 50,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_500, PlatformId.AMIGA_1200],
    effectUnlocks: ["animated_plasma"],
    bonusAttribute: { type: "graphics", value: 15 },
    researched: false
  },
  {
    id: "blitter_abuse",
    name: "Blitter Co-processor Overdrive",
    description: "Offload pixel-filling, block copies, and line vectors directly to high-speed graphics hardware.",
    costPoints: 60,
    preRequisiteIds: ["copper_lists"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_500, PlatformId.AMIGA_1200],
    effectUnlocks: ["vector_cube", "twister"],
    bonusAttribute: { type: "optimization", value: 25 },
    researched: false
  },
  {
    id: "tracker_mod_composition",
    name: "4-Channel SoundTracker MOD Engine",
    description: "Pioneered by Karsten Obarski. Uses stereophonic instrument WAV samples triggered across tracks.",
    costPoints: 30,
    preRequisiteIds: [],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_500, PlatformId.ATARI_ST],
    effectUnlocks: [],
    bonusAttribute: { type: "music", value: 25 },
    researched: false
  },
  {
    id: "overscan_trick",
    name: "Border-Busting Overscan Assembly",
    description: "Timing CPU changes near horizontal limits to display artwork inside safety boundaries.",
    costPoints: 45,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.ATARI_ST],
    effectUnlocks: [],
    bonusAttribute: { type: "graphics", value: 20 },
    researched: false
  },
  // PC dawn
  {
    id: "c2p_assembly",
    name: "Highly Optimized Chunky-to-Planar (C2P)",
    description: "Amiga relies on planar screens; PCs use linear arrays. Custom CPU code bridges the gap.",
    costPoints: 70,
    preRequisiteIds: ["blitter_abuse"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_1200],
    effectUnlocks: ["chunky_to_planar"],
    bonusAttribute: { type: "coding", value: 25 },
    researched: false
  },
  {
    id: "vga_mode13h_flat",
    name: "Linear Frame Buffer Mode-13h",
    description: "Gain direct access to 64,000 screen pixels under DOS on PC systems. Enables custom software graphics.",
    costPoints: 40,
    preRequisiteIds: [],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_386, PlatformId.PC_486],
    effectUnlocks: ["pixel_fire", "tunnel_effect", "metaballs_2d"],
    bonusAttribute: { type: "coding", value: 15 },
    researched: false
  },
  {
    id: "asm3d_pipeline",
    name: "Fixed-Point 3D Vector Math",
    description: "Perform trigonometric operations using integers and bitwise shifts instead of slow float registers.",
    costPoints: 80,
    preRequisiteIds: ["vga_mode13h_flat"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486, PlatformId.PC_PENTIUM],
    effectUnlocks: ["texture_mapper", "gouraud_shading"],
    bonusAttribute: { type: "optimization", value: 30 },
    researched: false
  },
  {
    id: "gus_hardware_mixing",
    name: "Gravis Ultrasound Audio Streaming",
    description: "Pumps audio samples directly to internal card RAM, saving dozens of CPU clock cycles on PC systems.",
    costPoints: 50,
    preRequisiteIds: ["tracker_mod_composition"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486, PlatformId.PC_PENTIUM],
    effectUnlocks: [],
    bonusAttribute: { type: "music", value: 30 },
    researched: false
  },
  {
    id: "voxel_heightfield",
    name: "Raycast Volumetric Heightfields",
    description: "DDA calculations that project height buffers slice-by-slice. Yields realistic organic outdoor terrains.",
    costPoints: 100,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486, PlatformId.PC_PENTIUM],
    effectUnlocks: ["voxel_hills"],
    bonusAttribute: { type: "graphics", value: 30 },
    researched: false
  },
  // 3D shader era
  {
    id: "compress_cranker",
    name: "LZSS & Huffman Executable Compressors",
    description: "Special tools that compress executables so complex programs can squeeze under extreme small 4KB sizes.",
    costPoints: 80,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM, PlatformId.PC_PENTIUM_II],
    effectUnlocks: [],
    bonusAttribute: { type: "size_reduction", value: 35 },
    researched: false
  },
  {
    id: "procedural_textures",
    name: "Noise-Based Procedural Textures",
    description: "Generate bricks, marble, and organic materials mathematically using sine waves and pseudo-random offsets.",
    costPoints: 90,
    preRequisiteIds: ["vga_mode13h_flat"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_II, PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["fractal_renderer", "cloth_physics"],
    bonusAttribute: { type: "graphics", value: 25 },
    researched: false
  },
  {
    id: "opengl_direct3d",
    name: "OpenGL Hardware Graphics Pipeline",
    description: "Command modern accelerator chips (3dfx Voodoo, GeForce) to compute polygons and smooth vectors.",
    costPoints: 110,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_II, PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["cloth_physics"],
    bonusAttribute: { type: "graphics", value: 35 },
    researched: false
  },
  {
    id: "raymarching_sdf",
    name: "SDF signed distance functions & Shaders",
    description: "The absolute zenith of mathematical graphics. Evaluate complete virtual worlds within single fragment programs.",
    costPoints: 150,
    preRequisiteIds: ["opengl_direct3d", "procedural_textures"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["raymarching_3d", "procedural_synth"],
    bonusAttribute: { type: "coding", value: 40 },
    researched: false
  }
];
