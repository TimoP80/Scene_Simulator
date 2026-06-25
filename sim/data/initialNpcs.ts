/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INITIAL_NPCS \u2014 moved verbatim from src/data.ts.
 * Pure data. Cognitive models attached by /sim/domain/npc via reducer.
 */

import { Character, PlatformId, SpecialtyType } from "@packages/types";

export const INITIAL_NPCS: Record<string, Character> = {
  "purple_motion": {
    id: "purple_motion",
    name: "Jonne Valtonen",
    handle: "Purple Motion",
    avatarSeed: 105,
    role: "scene_npc",
    groupId: "future_crew",
    skills: { coding: 30, music: 98, graphics: 45, organization: 50 },
    specialty: SpecialtyType.TrackerLegend,
    motivation: 95, burnout: 10, reputation: 880, friendship: 45,
    salaryDemand: 80,
    preferredPlatform: PlatformId.PC_486,
    status: "idle",
    bio: "Pioneering PC tracker musician of Future Crew. Creator of breathtaking synth MODs like Starshine and Unreal."
  },
  "skaven": {
    id: "skaven",
    name: "Peter Hajba",
    handle: "Skaven",
    avatarSeed: 204,
    role: "scene_npc",
    groupId: "future_crew",
    skills: { coding: 25, music: 96, graphics: 90, organization: 40 },
    specialty: SpecialtyType.TrackerLegend,
    motivation: 90, burnout: 5, reputation: 850, friendship: 40,
    salaryDemand: 90,
    preferredPlatform: PlatformId.PC_486,
    status: "idle",
    bio: "Incredibly talented tracker audio wizard and pixel artist. Co-designer of classic PC demo effects."
  },
  "unreal_coder": {
    id: "unreal_coder",
    name: "Sami Tammilehto",
    handle: "Psi",
    avatarSeed: 309,
    role: "scene_npc",
    groupId: "future_crew",
    skills: { coding: 97, music: 15, graphics: 40, organization: 60 },
    specialty: SpecialtyType.AssemblyWizard,
    motivation: 92, burnout: 12, reputation: 920, friendship: 30,
    salaryDemand: 100,
    preferredPlatform: PlatformId.PC_486,
    status: "idle",
    bio: "Main code architect behind Second Reality. Known for fast software polygon texture mappers and assembler loops."
  },
  "dxyre": {
    id: "dxyre",
    name: "Eric G.",
    handle: "Dxyre",
    avatarSeed: 401,
    role: "scene_npc",
    groupId: "razor_1911",
    skills: { coding: 40, music: 35, graphics: 88, organization: 66 },
    specialty: SpecialtyType.PixelPerfectionist,
    motivation: 85, burnout: 15, reputation: 640, friendship: 50,
    salaryDemand: 50,
    preferredPlatform: PlatformId.AMIGA_500,
    status: "idle",
    bio: "Prolific artist on Commodore Amiga. Excellent with metal textures and robotic pixel logos."
  },
  "trix_art": {
    id: "trix_art",
    name: "Garry G.",
    handle: "Trix",
    avatarSeed: 502,
    role: "scene_npc",
    groupId: "fairlight",
    skills: { coding: 20, music: 20, graphics: 94, organization: 50 },
    specialty: SpecialtyType.PixelPerfectionist,
    motivation: 88, burnout: 8, reputation: 780, friendship: 52,
    salaryDemand: 70,
    preferredPlatform: PlatformId.C64,
    status: "idle",
    bio: "C64 multi-color pixel master. Known for pushing the VIC-II's palette constraints to complete hyper-real portraits."
  },
  "chaos_coder": {
    id: "chaos_coder",
    name: "Claudio G.",
    handle: "Chaos",
    avatarSeed: 601,
    role: "scene_npc",
    groupId: "farbrausch",
    skills: { coding: 99, music: 40, graphics: 50, organization: 70 },
    specialty: SpecialtyType.OpenGLPioneer,
    motivation: 98, burnout: 5, reputation: 950, friendship: 35,
    salaryDemand: 120,
    preferredPlatform: PlatformId.PC_PENTIUM_III,
    status: "idle",
    bio: "Pioneer of extreme software procedural compression and DirectX API tricks. Main coder behind '.fr-08: Werkzeug'."
  },
  "ranger_c64": {
    id: "ranger_c64",
    name: "Morten S.",
    handle: "Ranger",
    avatarSeed: 703,
    role: "scene_npc",
    groupId: null,
    skills: { coding: 80, music: 40, graphics: 45, organization: 75 },
    specialty: SpecialtyType.AssemblyWizard,
    motivation: 80, burnout: 25, reputation: 420, friendship: 70,
    salaryDemand: 30,
    preferredPlatform: PlatformId.C64,
    status: "idle",
    bio: "Freelance 8-bit assembly freak. Passionate about 6502 register instructions and low-level raster line hacks."
  },
  "audio_drifter": {
    id: "audio_drifter",
    name: "Marc H.",
    handle: "Drifter",
    avatarSeed: 808,
    role: "scene_npc",
    groupId: null,
    skills: { coding: 30, music: 85, graphics: 50, organization: 60 },
    specialty: SpecialtyType.TrackerLegend,
    motivation: 85, burnout: 10, reputation: 390, friendship: 65,
    salaryDemand: 25,
    preferredPlatform: PlatformId.AMIGA_500,
    status: "idle",
    bio: "A highly motivated tracker musician who composes upbeat chiptunes and Amiga synth loops."
  },
  "vectra_pixel": {
    id: "vectra_pixel",
    name: "Sonia R.",
    handle: "Vectra",
    avatarSeed: 909,
    role: "scene_npc",
    groupId: null,
    skills: { coding: 15, music: 20, graphics: 84, organization: 40 },
    specialty: SpecialtyType.PixelPerfectionist,
    motivation: 90, burnout: 5, reputation: 310, friendship: 75,
    salaryDemand: 20,
    preferredPlatform: PlatformId.PC_386,
    status: "idle",
    bio: "Enthusiastic female pixel artist starting in VGA mode 13h. Loves copper colors and space backgrounds."
  },
  "hype_ops": {
    id: "hype_ops",
    name: "Dirk M.",
    handle: "Hype",
    avatarSeed: 101,
    role: "scene_npc",
    groupId: null,
    skills: { coding: 20, music: 30, graphics: 40, organization: 88 },
    specialty: SpecialtyType.OrganizerExtraordinaire,
    motivation: 92, burnout: 12, reputation: 400, friendship: 80,
    salaryDemand: 15,
    preferredPlatform: PlatformId.AMIGA_500,
    status: "idle",
    bio: "An energetic BBS sysop and organizer. Knows every swapper in Europe and spreads disk magazines wide and far."
  }
};
