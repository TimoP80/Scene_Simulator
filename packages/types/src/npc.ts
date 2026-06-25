/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Character, CognitiveModel, MemoryItem — NPC and cognitive model types.
 */

import { PlatformId, SkillSet, SpecialtyType } from "./platform";

export interface MemoryItem {
  id: string;
  type: "bbs_post" | "demo_release" | "party_event" | "rivalry" | "legendary_release" | "betrayal";
  description: string;
  timestamp: string; // "Y1990 M5" etc.
  strength: number;  // 0 - 100 memory decay indicator
  sentiment: "positive" | "negative" | "neutral";
}

export interface CognitiveModel {
  shortTermMemory: MemoryItem[];
  longTermMemory: MemoryItem[];
  opinionVectors: Record<string, number>; // entity (e.g. group, coder, technology name) -> score (-100 to 100)
  emotionalState: {
    stress: number;      // 0 - 100
    hype: number;        // 0 - 100
    burnout: number;     // 0 - 100 (keeps general track of tension)
    inspiration: number;  // 0 - 100
  };
  trustGraph: Record<string, number>; // otherNPCId -> trust percentage (0 - 100)
}

export interface Character {
  id: string;
  name: string;
  handle: string;
  avatarSeed: number;
  role: "player" | "crew" | "scene_npc";
  groupId: string | null; // null if freelance, special IDs for rivals
  skills: SkillSet;
  specialty: SpecialtyType;
  motivation: number;  // 0 - 100
  burnout: number;     // 0 - 100
  reputation: number;  // 0 - 1000
  friendship: number;  // 0 - 100 with player
  salaryDemand: number; // Cost in pocket change (monthly) or disk supplies
  joiningDate?: string;
  preferredPlatform: PlatformId;
  status: "idle" | "coding" | "arranging" | "drawing" | "burnt_out" | "retired";
  bio: string;
  cognitive?: CognitiveModel;
}
