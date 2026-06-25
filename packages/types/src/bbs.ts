/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BBS types — messages, threads, info economy classification.
 */

export type BBSInfoType =
  | "rumor"
  | "leak"
  | "technical_discovery"
  | "demo_announcement"
  | "party_gossip"
  | "tool_release"
  | "criticism";

export interface BBSMessage {
  sender: string;
  text: string;
  color?: string;
}

export interface BBSThread {
  id: string;
  board: string;
  topic: string;
  year: number;
  month: number;
  actorId: string;
  messages: BBSMessage[];
  interacted: boolean;
  playerActionTaken: string | null;
  dramaFinished: boolean;
  choices: Array<{
    text: string;
    type: string;
    effectDescription: string;
  }>;
  followed?: boolean;

  // Information Economy fields
  infoType: BBSInfoType;
  credibilityScore: number;     // 0 - 100
  propagationSpeed: number;     // 1 - 100
  distortionRate: number;       // 0 - 100
  influenceWeight: number;      // 1 - 100
  viralSpreadRank: number;      // 1 = normal, 2 = trending, 3 = viral, 4 = epidemic
  isSuppressed: boolean;
  originalTopic: string;
  mutationCount: number;
}
