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

/**
 * Factory function that creates a properly-typed BBSMessage.
 * Always use this instead of ad-hoc object literals to prevent
 * field name drift (e.g. `handle` vs `sender`).
 */
/**
 * CustomBBSMessage extends BBSMessage with fields used by the
 * custom message composition form in the BBS tab. These fields
 * are populated by the message creation path and consumed by
 * the rendering path within the same codebase.
 */
export interface CustomBBSMessage extends BBSMessage {
  /** Unique message identifier for React keys and dedup. */
  id: string;
  /** Client-side timestamp for ordering. */
  timestamp: number;
  /** True when the player authored this message (styling toggle). */
  isPlayer: boolean;
}

/**
 * Factory function that creates a properly-typed BBSMessage.
 * Always use this instead of ad-hoc object literals to prevent
 * field name drift (e.g. `handle` vs `sender`).
 */
export function createBbsMessage(
  sender: string,
  text: string,
  options?: { color?: string },
): BBSMessage {
  return { sender, text, ...options };
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
