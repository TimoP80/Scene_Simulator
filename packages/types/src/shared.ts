/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Shared sim types \u2014 groups, scene magazine entries.
 * The barrel re-exports Character/Production via /packages/types/src/index.ts
 * once npc.ts and demo.ts are imported there, so this file does NOT re-export
 * those types (avoids double export under the same name).
 */

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
