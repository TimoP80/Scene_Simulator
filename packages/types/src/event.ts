/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Event types — historical scene events surfaced in the Event Editor.
 * Pure data structures. NO React, NO LLM, NO side effects.
 */

import { PlatformId } from "./platform";

/** The category of a scene event. Mirrors the Zod enum in src/content/schema.ts. */
export type SceneEventType =
  | "rival_release"
  | "party"
  | "bbs_drama"
  | "tool_launch"
  | "magazine_issue"
  | "other";

/**
 * A historical scene event — rival demo releases, BBS controversies,
 * key underground moments. The Event Editor (Newspaper icon in the
 * DevMenu) edits entities of this shape. The `id` is the stable
 * identity; the app never mutates these at runtime, so all fields
 * are plain data.
 */
export interface SceneEvent {
  id: string;
  name: string;
  year: number;
  month: number; // 1-12
  type: SceneEventType;
  /** Free-form group / crew / person who triggered the event. */
  actor: string;
  /** Short one-line tagline shown in the list view. */
  headline: string;
  /** Long-form description (2-4 sentences). */
  description: string;
  /** Optional link to the platform the event centered on. */
  platform?: PlatformId;
  /** Optional prestige weight (0-100) used by the social graph to
   *  influence weight of the corresponding event-node edge. */
  prestige?: number;
}
