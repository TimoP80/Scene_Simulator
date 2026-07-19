import fs from 'node:fs';

const p = String.raw`C:\CodeProjects\demoprodz\scenesim\Scene_Simulator\sim\data\demoEffects.ts`;
let b = fs.readFileSync(p);
const CRLF = Buffer.from('\r\n');
const isCrlf = b.includes(CRLF);
console.log('crlf=' + isCrlf);
const nl = isCrlf ? CRLF : Buffer.from('\n');

const COLS = {
  C64_ZX:          '\n    compatiblePlatforms: C64_ZX,',
  AMIGA_ALL:       '\n    compatiblePlatforms: AMIGA_ALL,',
  AMIGA_ST:        '\n    compatiblePlatforms: AMIGA_ST,',
  PC_DAWN_PLUS:    '\n    compatiblePlatforms: PC_DAWN_PLUS,',
  PC_PENTIUM_PLUS: '\n    compatiblePlatforms: PC_PENTIUM_PLUS,',
  PC_PII_PLUS:     '\n    compatiblePlatforms: PC_PII_PLUS,',
  PC_PIII:         '\n    compatiblePlatforms: PC_PIII,',
};

function mk(id, name, era, plat, cpuram, dif, orig, aud, cat, desc, compl, vimp, tags, resReq, compat) {
  return '\n  {\n    id: "' + id + '",\n    name: "' + name + '",\n    era: EraId.' + era + ',\n    minPlatform: PlatformId.' + plat + ',\n    cpuCost: ' + cpuram[0] + ', ramCostKb: ' + cpuram[1] + ',\n    difficulty: ' + dif + ', originality: ' + orig + ', audienceAppeal: ' + aud + ',\n    category: "' + cat + '",\n    description: "' + desc + '",\n    complexity: ' + compl + ', visualImpact: ' + vimp + ',' + COLS[compat] + '\n    synergyTags: ' + JSON.stringify(tags) + ',\n    researchRequired: ' + resReq + ',\n  },';
}

const fx = [
  mk('color_cycling','Palette Color Cycling','ERA_8_BIT','C64',[1,1],8,18,45,'raster','Animates a looping rainbow or lava effect by rotating the color indices in a lookup table, making static art appear to flow without touching pixels.',14,50,['palette','raster','copper'],false,'C64_ZX'),
  mk('interlace_flicker','Interlace Flicker (Extra Colors)','ERA_8_BIT','C64',[1,1],18,30,38,'pixel_trick','Alternates two different palettes on odd/even scanlines at 50/60Hz so the eye blends them into phantom colors beyond the machine\'s real palette.',20,44,['raster','palette','copper'],false,'C64_ZX'),
  mk('dither_gradient_sky','Ordered-Dither Gradient Sky','ERA_8_BIT','C64',[2,2],14,22,42,'pixel_trick','Fake smooth gradients and sunsets on a few-color machine by tiling a Bayer-ordered dither pattern across bands of solid color.',18,48,['palette','raster'],false,'C64_ZX'),
  mk('roto_zoomer','Rotozoomer','ERA_16_BIT','AMIGA_500',[18,32],35,40,64,'pixel_trick','Continuously rotates and zooms a tiled bitmap using incremental affine transforms, producing the hypnotic spinning-floor look.',42,66,['blitter','palette','procedural'],false,'AMIGA_ST'),
  mk('copper_sprite_multiplex','Copper Sprite Multiplexer','ERA_16_BIT','AMIGA_500',[10,8],55,50,60,'raster','Reuses the limited hardware sprites on every scanline via timed Copper IRQs, packing dozens of moving objects where the chip only allows eight.',60,55,['copper','blitter','asm'],true,'AMIGA_ALL'),
  mk('dual_playfield_parallax','Dual-Playfield Parallax Layers','ERA_16_BIT','AMIGA_500',[8,16],38,42,66,'raster','Splits the display into two independently scrollable bitplanes, so foreground and background scroll at different speeds for fake depth.',48,64,['copper','blitter','parallax'],true,'AMIGA_ALL'),
  mk('blitter_zoomsprite','Blitter Zoom/Scale Sprite','ERA_16_BIT','AMIGA_500',[12,16],42,45,62,'pixel_trick','Uses the blitter to scale and rotate a sprite on the fly, letting a single object grow, shrink, and spin without pre-rendered frames.',50,60,['blitter','asm','copper'],true,'AMIGA_ALL'),
  mk('wireframe_flythrough','Wireframe Landscape Flythrough','ERA_16_BIT','ATARI_ST',[16,8],30,35,55,'vector','Flys a camera through a grid of connected line-vertices forming hills and valleys, a minimalist precursor to voxel terrain.',38,56,['vector','fixed-point','asm'],false,'AMIGA_ST'),
  mk('rotating_logo','Extruded Rotating Logo','ERA_16_BIT','AMIGA_500',[22,16],40,45,68,'vector','Extrudes a group\'s logo into 3D and spins it on a fixed-point rotation matrix, the classic group tag centerpiece.',50,62,['vector','fixed-point','asm'],true,'AMIGA_ALL'),
  mk('particle_system','Particle Fountain / Explosion System','ERA_PC_DAWN','PC_386',[30,96],35,50,70,'procedural','Spawns hundreds of points with velocity, gravity, and decay to simulate fireworks, sparks, and smoke from a tiny state array.',45,74,['procedural','physics','palette'],true,'PC_DAWN_PLUS'),
  mk('l_system_plants','L-System Fractal Plants','ERA_PC_DAWN','PC_486',[40,32],45,60,58,'procedural','Grows organic branching trees by recursively rewriting a string grammar into line segments, animated as it unfurls.',52,66,['procedural','novel','fractal'],true,'PC_DAWN_PLUS'),
  mk('perlin_noise_clouds','Perlin / FBM Noise Clouds','ERA_PC_DAWN','PC_486',[45,64],48,55,60,'procedural','Stacks several octaves of value noise (fractal Brownian motion) to sculpt rolling smoke and marble skies in real time.',55,72,['procedural','palette','fbm'],true,'PC_DAWN_PLUS'),
  mk('chromatic_aberration','RGB Split / Chromatic Aberration','ERA_PC_DAWN','PC_486',[14,32],28,38,60,'pixel_trick','Offsets the red, green, and blue channels of a source image by a few pixels to fake a lens/glitch vibe and add cheap depth.',30,58,['palette','procedural'],false,'PC_DAWN_PLUS'),
  mk('bump_mapped_torus','Phong + Bump-Mapped Torus','ERA_PC_DAWN','PC_486',[60,128],60,58,74,'vector','Shades a spinning torus with per-pixel Phong lighting and a perturbed normal map for a convincingly dimpled metal surface.',65,74,['vector','fixed-point'],true,'PC_DAWN_PLUS'),
  mk('environment_mapping','Sphere Environment Mapping','ERA_PC_DAWN','PC_PENTIUM',[70,256],64,68,80,'rendering','Reflects a pre-rendered spherical sky onto shiny chrome objects per pixel, faking real reflections without a raytracer.',70,82,['vector','procedural'],true,'PC_PENTIUM_PLUS'),
  mk('boids_flocking','Boids Flocking Swarm','ERA_3D_SHADER','PC_PENTIUM_II',[90,64],62,75,78,'vector','Emergent bird-like motion from three simple rules (separation, alignment, cohesion) steering thousands of agents as a living swarm.',68,78,['vector','physics','procedural'],true,'PC_PII_PLUS'),
  mk('morphing_mesh','Keyframe Mesh Morphing','ERA_3D_SHADER','PC_PENTIUM_III',[140,256],70,80,82,'vector','Interpolates vertex positions between sculpted keyframes so a head melts into a sphere or a face lip-syncs to the soundtrack.',72,84,['vector','fixed-point','novel'],true,'PC_PIII'),
  mk('domain_warp_field','Domain-Warped Noise Field','ERA_3D_SHADER','PC_PENTIUM_II',[120,128],65,78,72,'procedural','Feeds noise coordinates through more noise to bend the domain, creating silky marble-vein and liquid-metal flows that never repeat.',70,80,['procedural','palette','sdf'],true,'PC_PII_PLUS'),
  mk('reaction_diffusion','Gray-Scott Reaction-Diffusion','ERA_3D_SHADER','PC_PENTIUM',[200,256],70,82,75,'procedural','Two chemicals diffuse and react on a grid, spontaneously growing amoeba-like spots, stripes, and coral that crawl across the screen.',75,82,['procedural','novel','palette'],true,'PC_PENTIUM_PLUS'),
  mk('raytraced_spheres','Recursive Raytraced Spheres','ERA_3D_SHADER','PC_PENTIUM_II',[300,512],85,88,90,'rendering','Casts rays per pixel with recursive reflections and shadows between chrome and glass orbs, the definitive we have a fast CPU flex.',88,92,['sdf','novel','raycast'],true,'PC_PII_PLUS'),
  mk('volumetric_fog','Volumetric Light Shafts / Fog','ERA_3D_SHADER','PC_PENTIUM_III',[260,1024],82,85,86,'rendering','Marches a density field to accumulate god-rays and creeping mist, giving scenes tangible atmosphere and cinematic depth.',84,88,['sdf','procedural','novel'],true,'PC_PIII'),
  mk('voxel_city','Voxel City Flythrough','ERA_3D_SHADER','PC_PENTIUM_III',[200,1024],78,82,88,'rendering','Raycasts a towering blocky metropolis from a heightfield, banking between skyscrapers at low altitude for a Comanche-meets-cyberpunk vibe.',80,90,['raycast','heightfield','fixed-point'],true,'PC_PIII'),
  mk('realtime_vocoder','Realtime Formant Vocoder','ERA_3D_SHADER','PC_PENTIUM_II',[70,32],78,88,80,'procedural','Synthesizes robotic, talking-instrument voices by shaping carrier oscillators with an analyser\'s formant bands, fully math-generated audio.',82,25,['procedural-audio','sync','novel'],true,'PC_PII_PLUS'),
];

// mk() now emits a trailing comma after each entry, so consecutive
// entries already concatenate cleanly. The last entry's trailing comma
// is harmless in TypeScript arrays (allowed since 2017).
let block = '';
for (const entry of fx) {
  block += entry;
}

const needle = Buffer.concat([nl, Buffer.from('];')]).toString();
const lastIdx = b.toString().lastIndexOf(needle);
if (lastIdx < 0) {
  console.error('closing ]; not found');
  process.exit(1);
}

const header = '\n\n  // --- JSON-only catalogue (additions from data/effects.json) ---';
const out =
  b.toString().slice(0, lastIdx) +
  header +
  block +
  b.toString().slice(lastIdx);

fs.writeFileSync(p, out);
console.log('inserted ' + fx.length + ' entries with trailing commas');
