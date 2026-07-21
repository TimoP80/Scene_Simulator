/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Rival group types — living state for every AI-controlled demogroup.
 * These types track motivation, morale, current projects, personality
 * traits, and activity history. Updated each month by the simulation
 * loop's rival simulation tick.
 *
 * Pure data. No React, no DOM, no LLM.
 */

import { PlatformId } from "./platform";
import { Production, ProductionType } from "./demo";

// ─── Rival Group Living State ────────────────────────────────────────

/** Personality traits that shape a rival group's behaviour over decades. */
export interface RivalPersonality {
  /** Ambition (0-100): willingness to take risks, push boundaries. */
  ambition: number;
  /** Technical focus (0-100): how much they prioritise tech vs art. */
  technicalFocus: number;
  /** Artistic focus (0-100): how much they prioritise visual/music quality. */
  artisticFocus: number;
  /** Stability (0-100): how resilient against disbanding/splitting. */
  stability: number;
  /** Platforms this group prefers to release on. */
  preferredPlatforms: PlatformId[];
  /** Production types this group tends to create. */
  preferredTypes: ProductionType[];
}

/** Current project a rival group is working on. */
export interface RivalProject {
  name: string;
  type: ProductionType;
  /** Progress 0-100. At 100, the project is released as a production. */
  progressPct: number;
  startedYear: number;
  startedMonth: number;
  /** Baseline quality roll (0-100) determined at project start. */
  quality: number;
}

/**
 * Living state of one rival demogroup. Updated each month by the
 * simulation engine's `simulateRivalGroups()` call.
 */
export interface RivalGroupState {
  id: string;
  name: string;

  // ── Static personality (set once at bootstrap) ──
  personality: RivalPersonality;

  // ── Dynamic state ──
  activityStatus: "active" | "hiatus" | "inactive" | "disbanded";
  /** Year/month the group became inactive/disbanded (for resurrection checks). */
  inactiveSinceYear?: number;
  inactiveSinceMonth?: number;

  /** Current production project, or null if idle. */
  currentProject: RivalProject | null;

  motivation: number;
  morale: number;
  reputation: number;
  fanbase: number;
  releaseCount: number;
  lastReleaseYear: number;
  lastReleaseMonth: number;
  foundingYear: number;
  hqLocation: string;
  motto: string;
  memberIds: string[];

  /** Relationship heatmap: target groupId → intensity (-100 to 100). */
  rivalries: Record<string, number>;
}

// ─── Rival Production (released by an AI group) ─────────────────────

/**
 * A production released by a rival (AI-controlled) group. Stored in
 * WorldState so the UI can render a "scene news" feed of recent
 * releases.
 */
export interface RivalProduction {
  id: string;
  groupId: string;
  groupName: string;
  name: string;
  type: ProductionType;
  platformId: PlatformId;
  totalScore: number;
  technicalScore: number;
  artisticScore: number;
  musicScore: number;
  graphicsScore: number;
  releasedYear: number;
  releasedMonth: number;
  /** Party name where this was released (if any). */
  partyName?: string;
  /** Placement at that party (1-based). */
  placement?: number;
}

// ─── Rival Activity Log Entry ───────────────────────────────────────

/** Types of activity a rival group can perform in a given month. */
export type RivalActivityType =
  | "started_project"
  | "released_production"
  | "disbanded"
  | "formed"
  | "hiatus"
  | "returned"
  | "member_left"
  | "member_joined"
  | "morale_change"
  | "idle";

/** One entry in the rival activity log shown to the player. */
export interface RivalActivityEntry {
  groupId: string;
  groupName: string;
  year: number;
  month: number;
  type: RivalActivityType;
  description: string;
  productionId?: string;
  productionName?: string;
}

// ─── Monthly tick summary ───────────────────────────────────────────

/** Result returned by `simulateRivalGroups` each month. */
export interface RivalTickResult {
  events: RivalTickEvent[];
  log: RivalActivityEntry[];
}

/**
 * Internal event produced by the rival simulation. These are converted
 * to proper SimEvents by the caller (SimulationLoop.advanceMonth).
 * Keeping them as a light tuple avoids importing SimEvent into domain.
 */
export interface RivalTickEvent {
  type: "production_released" | "group_disbanded" | "group_formed" | "member_transferred";
  groupId: string;
  payload: Record<string, unknown>;
}
