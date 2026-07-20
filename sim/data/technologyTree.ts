/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TECHNOLOGY_TREE catalogue — moved verbatim from src/data.ts.
 * Static tech graph nodes; pure data only.
 *
 * Expanded for v0.6.0 Phase 1b: all techs spanning 1985-2026 with
 * year-appropriate effect unlocks and autoUnlockYear gates.
 */

import { EraId, PlatformId, TechNode } from "@packages/types";

export const TECHNOLOGY_TREE: TechNode[] = [
  // ==========================================================================
  // 8-BIT ERA (1985-1989)
  // ==========================================================================

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
  {
    id: "color_cycling_tech",
    name: "Palette Color Cycling Techniques",
    description: "Animate static images by rotating color register indices through the palette RAM, creating flowing lava, water, and starfield effects without moving a single pixel.",
    costPoints: 15,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_8_BIT,
    platformUnlocks: [PlatformId.C64, PlatformId.ZX_SPECTRUM],
    effectUnlocks: ["color_cycling"],
    bonusAttribute: { type: "graphics", value: 8 },
    researched: false
  },

  // ==========================================================================
  // 16-BIT ERA (1990-1995)
  // ==========================================================================

  {
    id: "copper_lists",
    name: "Amiga Copper Program Lists",
    description: "Learn to write autonomous micro-code for the Amiga's Copper display processor.",
    costPoints: 50,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_500, PlatformId.AMIGA_1200],
    effectUnlocks: ["animated_plasma", "roto_zoomer"],
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
    effectUnlocks: ["vector_cube", "twister", "copper_sprite_multiplex"],
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
    id: "dual_playfield_tech",
    name: "Dual-Playfield Hardware Scrolling",
    description: "Split the Amiga display into two independent bitmap planes that scroll at different speeds for parallax depth.",
    costPoints: 40,
    preRequisiteIds: ["copper_lists"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [PlatformId.AMIGA_500, PlatformId.AMIGA_1200],
    effectUnlocks: ["dual_playfield_parallax", "blitter_zoomsprite"],
    bonusAttribute: { type: "graphics", value: 18 },
    researched: false
  },

  // ==========================================================================
  // PC DAWN ERA (1996-2000)
  // ==========================================================================

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
  {
    id: "compress_cranker",
    name: "LZSS & Huffman Executable Compressors",
    description: "Special tools that compress executables so complex programs can squeeze under extreme small 4KB sizes.",
    costPoints: 80,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_PENTIUM, PlatformId.PC_PENTIUM_II],
    effectUnlocks: [],
    bonusAttribute: { type: "size_reduction", value: 35 },
    researched: false
  },
  {
    id: "particle_engine",
    name: "Particle System Engine",
    description: "Spawn, update, and render thousands of lightweight points with velocity, gravity, and decay for fire, smoke, and magic effects.",
    costPoints: 55,
    preRequisiteIds: ["vga_mode13h_flat"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486, PlatformId.PC_PENTIUM],
    effectUnlocks: ["particle_system"],
    bonusAttribute: { type: "graphics", value: 20 },
    researched: false
  },
  {
    id: "procedural_noise",
    name: "Perlin & Fractal Brownian Motion Noise",
    description: "Stack octaves of value noise to sculpt rolling clouds, marble, fire, and organic terrains in real time.",
    costPoints: 65,
    preRequisiteIds: ["vga_mode13h_flat"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486, PlatformId.PC_PENTIUM],
    effectUnlocks: ["perlin_noise_clouds", "chromatic_aberration"],
    bonusAttribute: { type: "graphics", value: 22 },
    researched: false
  },
  {
    id: "bump_mapping",
    name: "Phong Lighting & Bump Mapping",
    description: "Per-pixel lighting with perturbed surface normals, giving flat polygons the illusion of dimpled, reflective metal.",
    costPoints: 85,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_PENTIUM],
    effectUnlocks: ["bump_mapped_torus", "environment_mapping"],
    bonusAttribute: { type: "graphics", value: 28 },
    researched: false
  },
  {
    id: "l_system_plants",
    name: "L-System Procedural Botany",
    description: "Grow organic trees, ferns, and coral from a recursive string grammar, animated as they unfurl on screen.",
    costPoints: 50,
    preRequisiteIds: ["vga_mode13h_flat"],
    era: EraId.ERA_PC_DAWN,
    platformUnlocks: [PlatformId.PC_486],
    effectUnlocks: ["l_system_plants"],
    bonusAttribute: { type: "graphics", value: 18 },
    researched: false
  },

  // ==========================================================================
  // 3D SHADER ERA (2001-2005)
  // ==========================================================================

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
    id: "raymarching_sdf",
    name: "SDF Signed Distance Functions & Shaders",
    description: "The absolute zenith of mathematical graphics. Evaluate complete virtual worlds within single fragment programs.",
    costPoints: 150,
    preRequisiteIds: ["opengl_direct3d", "procedural_textures"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["raymarching_3d", "procedural_synth"],
    bonusAttribute: { type: "coding", value: 40 },
    researched: false
  },
  {
    id: "pixel_shader_20",
    name: "Pixel Shader 2.0 Programmable Pipelines",
    description: "Run small assembly programs per-pixel on the GPU to compute lighting, refraction, and procedural color — the dawn of GPU computing.",
    costPoints: 120,
    preRequisiteIds: ["opengl_direct3d"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_4, PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["domain_warp_field", "reaction_diffusion"],
    bonusAttribute: { type: "graphics", value: 35 },
    researched: false
  },
  {
    id: "boids_swarm",
    name: "Boids Emergent Flocking",
    description: "Simulate bird flocking and fish schooling from three simple steering rules without central coordination.",
    costPoints: 75,
    preRequisiteIds: ["asm3d_pipeline"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_II],
    effectUnlocks: ["boids_flocking"],
    bonusAttribute: { type: "graphics", value: 25 },
    researched: false
  },
  {
    id: "mesh_morphing",
    name: "Keyframe Mesh Morphing",
    description: "Interpolate vertex positions between sculpted keyframes so a head melts into a sphere or a character lip-syncs to the soundtrack.",
    costPoints: 90,
    preRequisiteIds: ["opengl_direct3d"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["morphing_mesh"],
    bonusAttribute: { type: "graphics", value: 28 },
    researched: false
  },
  {
    id: "realtime_raytracing",
    name: "Recursive Raytraced Reflections",
    description: "Cast rays per pixel with recursive reflections and shadows between chrome and glass orbs, the definitive we-have-a-fast-CPU flex.",
    costPoints: 130,
    preRequisiteIds: ["opengl_direct3d"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["raytraced_spheres", "voxel_city"],
    bonusAttribute: { type: "coding", value: 35 },
    researched: false
  },
  {
    id: "volumetric_rendering",
    name: "Volumetric Light Shafts & Fog",
    description: "March a density field to accumulate god-rays and creeping mist, giving 3D scenes tangible atmosphere and cinematic depth.",
    costPoints: 110,
    preRequisiteIds: ["raymarching_sdf"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_III],
    effectUnlocks: ["volumetric_fog"],
    bonusAttribute: { type: "graphics", value: 32 },
    researched: false
  },
  {
    id: "realtime_vocoder",
    name: "Realtime Formant Vocoder",
    description: "Synthesize robotic, talking-instrument voices by shaping carrier oscillators with an analyzer's formant bands — fully math-generated audio.",
    costPoints: 80,
    preRequisiteIds: ["tracker_mod_composition"],
    era: EraId.ERA_3D_SHADER,
    platformUnlocks: [PlatformId.PC_PENTIUM_II],
    effectUnlocks: ["realtime_vocoder"],
    bonusAttribute: { type: "music", value: 30 },
    researched: false
  },

  // ==========================================================================
  // HD SHADER ERA (2006-2026)
  // ==========================================================================

  {
    id: "glsl_shading",
    name: "GLSL High-Level Shader Language",
    description: "Write pixel and vertex shaders in C-like syntax instead of assembly, enabling complex multi-pass effects and GPU compute routines.",
    costPoints: 100,
    preRequisiteIds: ["pixel_shader_20"],
    era: EraId.ERA_HD_SHADER,
    platformUnlocks: [PlatformId.PC_CORE_DUO, PlatformId.PC_PENTIUM_4],
    effectUnlocks: [],
    bonusAttribute: { type: "coding", value: 30 },
    researched: false
  },
  {
    id: "compute_shaders",
    name: "GPU Compute Shaders & General-Purpose Compute",
    description: "Harness the GPU for non-graphics parallel computation: particle physics, fluid simulation, and massive data transforms.",
    costPoints: 140,
    preRequisiteIds: ["glsl_shading"],
    era: EraId.ERA_HD_SHADER,
    platformUnlocks: [PlatformId.PC_CORE_DUO],
    effectUnlocks: [],
    bonusAttribute: { type: "optimization", value: 40 },
    researched: false
  },
  {
    id: "advanced_raymarching",
    name: "Advanced Raymarching & Procedural Worlds",
    description: "Combined SDF boolean operations, domain deformation, and ambient occlusion for photorealistic procedural environments in real time.",
    costPoints: 160,
    preRequisiteIds: ["raymarching_sdf", "glsl_shading"],
    era: EraId.ERA_HD_SHADER,
    platformUnlocks: [PlatformId.PC_CORE_DUO],
    effectUnlocks: [],
    bonusAttribute: { type: "graphics", value: 45 },
    researched: false
  },
  {
    id: "modern_procedural",
    name: "Modern Procedural Generation Suite",
    description: "Combine noise, cellular automata, wave-function collapse, and agent-based generation for infinitely varied environments from a tiny seed.",
    costPoints: 120,
    preRequisiteIds: ["compute_shaders"],
    era: EraId.ERA_HD_SHADER,
    platformUnlocks: [PlatformId.PC_CORE_DUO],
    effectUnlocks: [],
    bonusAttribute: { type: "coding", value: 35 },
    researched: false
  },
  {
    id: "ai_assisted_tools",
    name: "AI-Assisted Production Tools",
    description: "Leverage neural networks for texture upscaling, code completion, and generative music — the cutting edge of demoscene production pipelines.",
    costPoints: 100,
    preRequisiteIds: ["modern_procedural"],
    era: EraId.ERA_HD_SHADER,
    platformUnlocks: [PlatformId.PC_CORE_DUO],
    effectUnlocks: [],
    bonusAttribute: { type: "optimization", value: 30 },
    researched: false
  },

  // ==========================================================================
  // ANTIVIRUS / DISK PROTECTION (cross-era utility)
  // ==========================================================================

  {
    id: "antivirus_scanning",
    name: "Disk Antivirus Scanning",
    description: "Essential disk sanitation tools that detect and remove boot-block viruses from floppy disks before they can infect your production pipeline. Vital for any group that swaps disks at copy parties.",
    costPoints: 35,
    preRequisiteIds: ["raster_sync"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [],
    effectUnlocks: [],
    bonusAttribute: { type: "optimization", value: 5 },
    researched: false
  },
  {
    id: "disk_mag_protection",
    name: "Write-Protect Tab Discipline",
    description: "Rigorous protocol for write-protecting master disks during production. Combined with CRC verification, this nearly eliminates the risk of virus infection during the compilation pipeline.",
    costPoints: 25,
    preRequisiteIds: ["antivirus_scanning"],
    era: EraId.ERA_16_BIT,
    platformUnlocks: [],
    effectUnlocks: [],
    bonusAttribute: { type: "optimization", value: 10 },
    researched: false
  }
];
