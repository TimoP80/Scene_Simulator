/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Platform, era, skill, and specialty types — split from src/types.ts.
 * Pure data structures. NO React, NO LLM, NO side effects.
 */

export enum PlatformId {
  C64 = "C64",
  ZX_SPECTRUM = "ZX_SPECTRUM",
  AMIGA_500 = "AMIGA_500",
  AMIGA_1200 = "AMIGA_1200",
  ATARI_ST = "ATARI_ST",
  PC_386 = "PC_386",
  PC_486 = "PC_486",
  PC_PENTIUM = "PC_PENTIUM",
  PC_PENTIUM_II = "PC_PENTIUM_II",
  PC_PENTIUM_III = "PC_PENTIUM_III"
}

export enum EraId {
  ERA_8_BIT = "ERA_8_BIT",       // 1985-1889
  ERA_16_BIT = "ERA_16_BIT",     // 1990-1995
  ERA_PC_DAWN = "ERA_PC_DAWN",   // 1996-2000
  ERA_3D_SHADER = "ERA_3D_SHADER"// 2001-2005
}

export interface PlatformConfig {
  id: PlatformId;
  name: string;
  year: number;
  cost: number;
  cpuLimit: number;      // Arbitrary power units
  ramLimitKb: number;    // Available RAM
  graphicsMaxColors: number;
  audioChannels: number;
  audioTech: string;
  graphicsTech: string;
  description: string;
}

export enum SkillType {
  Coding = "Coding",
  Music = "Music",
  Graphics = "Graphics",
  Organization = "Organization"
}

export enum SpecialtyType {
  AssemblyWizard = "Assembly Wizard",
  TrackerLegend = "Tracker Legend",
  PixelPerfectionist = "Pixel Perfectionist",
  OpenGLPioneer = "OpenGL Pioneer",
  EffectCoder = "Effect Coder",
  DemoDirector = "Demo Director",
  OrganizerExtraordinaire = "Organizer",
  CrackerSwapper = "Swapper/BBS Op"
}

export interface SkillSet {
  coding: number;       // 1 - 100
  music: number;        // 1 - 100
  graphics: number;     // 1 - 100
  organization: number; // 1 - 100
}
