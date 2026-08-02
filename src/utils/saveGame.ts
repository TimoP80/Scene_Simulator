/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Canonical save-game serialization contract for the localStorage
 * autosave slot (`demoscene_sim_autosave`).
 *
 * WHY THIS MODULE EXISTS
 * ----------------------
 * The v0.7.4 WorldState migration renamed the App.tsx state mirrors to
 * `ws*` (wsMoney, wsReputation, wsOwnedRigs, ...) and the writer
 * (`triggerAutoSave`) was updated to emit those names — but the two
 * readers (`loadSavedGame` and the mount-time hydrate effect) were left
 * reading the pre-migration legacy names (`playerMoney`, `ownedRigs`,
 * `playerHandle`, ...). Since `data.playerMoney` never matched the stored
 * `wsMoney` key, every `?? fallback` fired and a save→load cycle reset
 * money / reputation / rigs / techs / crew / releases to their defaults.
 *
 * This module owns the single canonical shape (`AutosaveData`), stamps a
 * schema version, and exposes `migrateSave()` which normalizes BOTH the
 * legacy pre-migration shape AND the buggy-window `ws*` shape into the
 * canonical shape. Both readers go through it; the writer emits it
 * directly — so writer/reader key drift is impossible by construction.
 */

import type {
  BBSThread,
  DemoSummary,
  PlatformId,
  Production,
  TaskAssignments,
} from "@packages/types";

/** Schema version of the canonical autosave shape (v2 = ws* keys). */
export const SAVE_VERSION = 2;

/**
 * Canonical autosave payload. Every field the game persists, in one
 * shape, shared by the writer and both readers.
 */
export interface AutosaveData {
  version: number;
  wsMoney: number;
  wsReputation: number;
  currentYear: number;
  currentMonth: number;
  /** Active platform at save time (restored via a final RigPurchased). */
  activePlatform: PlatformId;
  wsOwnedRigs: PlatformId[];
  wsUnlockedTechs: string[];
  wsHiredCrewIds: string[];
  wsMyReleases: Record<string, Production>;
  productionSummaries: Record<string, DemoSummary>;
  productionDownloads: Record<string, number>;
  wsResearchPoints: number;
  wsPlayerHandle: string;
  wsPlayerGroupName: string;
  bbsDialed: boolean;
  bbsThreads: BBSThread[];
  taskAssignments: TaskAssignments;
}

/**
 * Pre-migration (v1) key → canonical (v2) key mapping. v1 saves were
 * written when the state still lived in `playerMoney` / `ownedRigs` /
 * `playerHandle` etc. `migrateSave` remaps any legacy key that is
 * present so old saves load correctly after the migration.
 */
const LEGACY_KEY_TO_CANONICAL: Record<string, keyof AutosaveData> = {
  playerMoney: "wsMoney",
  playerReputation: "wsReputation",
  ownedRigs: "wsOwnedRigs",
  unlockedTechs: "wsUnlockedTechs",
  hiredCrewIds: "wsHiredCrewIds",
  myReleases: "wsMyReleases",
  researchPoints: "wsResearchPoints",
  playerHandle: "wsPlayerHandle",
  playerGroupName: "wsPlayerGroupName",
};

/**
 * Parse + normalize a raw localStorage save string into the canonical
 * AutosaveData shape. Returns null for unparseable / non-object input
 * so callers can surface the corruption error instead of silently
 * defaulting.
 *
 * Normalization rules:
 *   1. Canonical `ws*` keys pass through untouched.
 *   2. Legacy pre-migration keys are remapped to their canonical name
 *      when the canonical key is absent (canonical wins if both exist).
 *   3. The schema version is always stamped with SAVE_VERSION.
 */
export function migrateSave(raw: string): AutosaveData | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return null;
  }

  const src = parsed as Record<string, unknown>;
  const out: Record<string, unknown> = { ...src };

  for (const [legacy, canonical] of Object.entries(LEGACY_KEY_TO_CANONICAL)) {
    if (out[canonical] === undefined && out[legacy] !== undefined) {
      out[canonical] = out[legacy];
    }
  }

  out.version = SAVE_VERSION;
  return out as unknown as AutosaveData;
}
