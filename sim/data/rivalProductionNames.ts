/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rival production names — pools of demoscene-style production names
 * organized by era. Generated names are deterministic (seeded by a
 * numeric index) so the same group + release count always produces
 * the same name, making the simulation reproducible.
 */

// ─── Name pools by era ──────────────────────────────────────────────

const ERA_8BIT_NAMES: string[] = [
  "MEGA MIX",
  "NUDE DEMO",
  "TRI-MATRIX",
  "BORDERLINE",
  "CYBER SHOCK",
  "SILICON DREAMS",
  "COMPUTER MUSIC",
  "DIGITAL NOISE",
  "PIXEL PARADE",
  "LOAD ERROR",
  "ROTOR",
  "UNREAL",
  "SYNTH RUSH",
  "VECTOR FORCE",
  "FIRE STARTER",
  "COPPER FEVER",
  "SINE WAVE",
  "RASTER ATTACK",
  "SPRITE MAGIC",
  "TURBO CHARSET",
];

const ERA_16BIT_NAMES: string[] = [
  "STATE OF THE ART",
  "DESERT DREAM",
  "NINE FINGERS",
  "ENLIGHTENMENT",
  "JESUS ON E'S",
  "PERSONAL PAIN",
  "DREAMS",
  "ODDITY",
  "SYMPHONY",
  "MULTIMEDIA REVOLUTION",
  "COPPER LIST",
  "BLITTER BABY",
  "HAM TIME",
  "TRUE COLOR",
  "AGA OVERLOAD",
  "HARDWARE HACK",
  "NOISE",
  "RETRO VECTOR",
  "PLASMA PUNCH",
  "METAL EDGE",
];

const ERA_PCDAWN_NAMES: string[] = [
  "SECOND REALITY",
  "STARBREEZE",
  "VOYAGE",
  "EXTREME",
  "PARADOX",
  "TOTAL CHAOS",
  "MEGA 2000",
  "PENTIUM POISON",
  "VGA SYMPHONY",
  "3D WARP",
  "VOXEL MOUNTAINS",
  "TEXTURE NIGHTMARE",
  "FIXED POINT",
  "GOURAUD GLOW",
  "Z-BUFFER HEAVEN",
  "SOFTWARE OVERDRIVE",
  "PROCEDURAL",
  "L-SYSTEM",
  "PARTICLE STORM",
  "FIRE DEMO",
];

const ERA_3DSHADER_NAMES: string[] = [
  "WERKZEUG",
  "CONE OF SILENCE",
  "ACID VISIONS",
  "FURY",
  "INERTIA",
  "EXCESS",
  "ALTERNATE REALITY",
  "TRANSCODE",
  "POLLEN",
  "DEITY",
  "ZER0",
  "PIXEL POISON",
  "GLIDE UNDER",
  "BUMP NIGHT",
  "SDF DREAMS",
  "RAYMARCH HYMN",
  "SHADER TOY",
  "FRAGMENT",
  "UNIFORM FLOW",
  "VERTEX PULSE",
];

const ERA_HD_NAMES: string[] = [
  "ELEVATED",
  "INFINITE",
  "DEBRIEF",
  "CATHEDRAL",
  "HELIOS",
  "PROCEDURAL PARADISE",
  "COMPUTE INTENSE",
  "NEURAL NOISE",
  "RASTER GODS",
  "DIGITAL ALCHEMY",
  "SEQUEL",
  "REMIX",
  "REBOOT",
  "UPSCALE",
  "RETRO FUTURE",
  "SUPER RESOLUTION",
  "AI OVERDRIVE",
  "GENERATIVE DREAMS",
  "CLOCK CYCLE",
  "PARALLEL VISIONS",
];

// Pool index by year range (inclusive).
const YEAR_POOLS: [number, number, string[]][] = [
  [1985, 1989, ERA_8BIT_NAMES],
  [1990, 1995, ERA_16BIT_NAMES],
  [1996, 2000, ERA_PCDAWN_NAMES],
  [2001, 2005, ERA_3DSHADER_NAMES],
  [2006, 2026, ERA_HD_NAMES],
];

// ─── Multilingual / remix suffix pool ───────────────────────────────

const SUFFIXES: string[] = [
  "",
  " 2",
  " 3",
  " REVISION",
  " RELOADED",
  " REMIX",
  " V2",
  " 'S THEME",
  " REPRISE",
  " FINAL",
  " ANNIVERSARY",
];

// ─── Public API ─────────────────────────────────────────────────────

/**
 * Deterministic production name for a rival group.
 * Uses the group's id string and release count to seed the index,
 * so the same group + release number always yields the same name.
 *
 * @param groupId - Stable group identifier (e.g. "future_crew").
 * @param year    - The year of release (selects the era pool).
 * @param index   - Release index (0-based, increments per release).
 */
export function getRivalProductionName(
  groupId: string,
  year: number,
  index: number,
): string {
  // Find the matching era pool
  const pool = YEAR_POOLS.find(([lo, hi]) => year >= lo && year <= hi);

  if (!pool) {
    // Fallback to the last pool if year is out of range
    const lastPool = YEAR_POOLS[YEAR_POOLS.length - 1]![2];
    const nameIdx = Math.abs(hashCode(groupId + index.toString())) % lastPool.length;
    return lastPool[nameIdx]!;
  }

  const [, , names] = pool;
  // Deterministic index: hash the groupId + index for stable naming
  const nameIdx = Math.abs(hashCode(groupId + index.toString())) % names.length;
  const baseName = names[nameIdx]!;

  // Add a suffix for releases beyond the initial pool size
  const suffixIdx = Math.abs(hashCode(groupId + year.toString() + index.toString())) % SUFFIXES.length;
  const suffix = SUFFIXES[suffixIdx]!;

  return suffix ? `${baseName}${suffix}` : baseName;
}

/**
 * Simple string hash function for deterministic naming.
 * Not crypto-safe — purely for reproducible index generation.
 */
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32-bit integer
  }
  return hash;
}
