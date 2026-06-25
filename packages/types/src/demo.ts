/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Demo types — effects, tech tree, productions.
 */

import { PlatformId, EraId } from "./platform";

export interface DemoEffect {
  id: string;
  name: string;
  era: EraId;
  minPlatform: PlatformId;
  cpuCost: number;       // power units
  ramCostKb: number;     // RAM cost
  difficulty: number;    // 1 - 100
  originality: number;   // 1 - 100
  audienceAppeal: number; // 1 - 100
  category: "vector" | "raster" | "procedural" | "rendering" | "pixel_trick";
  description: string;
}

export interface TechNode {
  id: string;
  name: string;
  description: string;
  costPoints: number;
  preRequisiteIds: string[];
  era: EraId;
  platformUnlocks: PlatformId[];
  effectUnlocks: string[]; // List of DemoEffect IDs unlocked
  bonusAttribute?: {
    type: "coding" | "music" | "graphics" | "size_reduction" | "optimization";
    value: number;
  };
  researched: boolean;
}

export enum ProductionType {
  Demo = "Mega-Demo",
  Intro64k = "64KB Intro",
  Intro4k = "4KB Intro",
  MusicDisk = "Music Disk",
  Cracktro = "Cracktro/Trainer",
  ArtSlide = "Slide Show"
}

export interface Production {
  id: string;
  name: string;
  year: number;
  month: number;
  type: ProductionType;
  platform: PlatformId;
  groupName: string;
  effects: string[]; // DemoEffect ids included
  codingEffort: number;
  artEffort: number;
  musicEffort: number;
  optimizationLevel: number; // 1 - 5
  compressionLevel: number;  // 1 - 5
  sizeB: number; // Actual size in bytes calculated
  scoreTechnical: number; // 0 - 100
  scoreAesthetic: number; // 0 - 100
  scoreAudio: number;     // 0 - 100
  scoreOriginality: number; // 0 - 100
  totalScore: number;     // calculated average/weighted
  reputationGained: number;
  placement?: number; // Post-party competition ranking
  partyName?: string;
}
