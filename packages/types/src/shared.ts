/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared sim types — groups, scene magazine entries, scenario presets.
 * The barrel re-exports Character/Production via /packages/types/src/index.ts
 * once npc.ts and demo.ts are imported there, so this file does NOT re-export
 * those types (avoids double export under the same name).
 */

import type { PlatformId } from "./platform";
import type { Production } from "./demo";

export interface Group {
  id: string;
  name: string;
  isPlayerGroup: boolean;
  fanbase: number;
  reputation: number;
  memberIds: string[];
  releaseIds: string[];
  hqLocation: string;
  motto: string;
}

export interface SceneMagazine {
  id: string;
  title: string;
  year: number;
  month: number;
  headline: string;
  body: string;
  type: "review" | "scandal" | "tech_breakthrough" | "party_results" | "editorial";
}

/**
 * Named scenario preset configuration — every field needed to bootstrap
 * a historical starting point. The reducer file exports concrete
 * SCENARIO_PRESET_1985 / _1991 / _1998 constants, and App.tsx's
 * applyScenarioPreset() turns one into a chain of dispatch calls.
 */
export interface ScenarioPreset {
  id: "1985_8bit" | "1991_16bit" | "1998_pc3d";
  /** Calendar year the scenario jumps to. */
  year: number;
  /** Player-money target (the delta is computed at apply time). */
  money: number;
  /** Player-reputation target. */
  reputation: number;
  /** Research-points target. */
  researchPoints: number;
  /** Platform IDs the player should own (applied via RigPurchased). */
  rigs: PlatformId[];
  /** Tech IDs the player should have unlocked (TechResearched). */
  techs: string[];
  /** Character IDs to hire into the player crew (CrewHired). */
  crewHires: string[];
  /** Optional seed releases to inject into the production archive. */
  seedReleases?: Record<string, Production>;
  /** CRT preview effect IDs to show after loading. */
  crtEffects: string[];
  /** CRT preview demo name. */
  crtDemoName: string;
  /**
   * NPC group-id overrides — maps charId → groupId.
   * Hired NPCs whose groupId should be set to "player".
   */
  npcGroupAssignments: Record<string, string>;
  /** The seed magazine article for this scenario. */
  article: SceneMagazine;
}
