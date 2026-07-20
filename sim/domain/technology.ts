/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Technology domain helpers — reactive calendar-aware helpers for the
 * technology tree (v0.6.0 Phase 1b).
 *
 * Pure functions. NO React, NO LLM, NO side effects.
 *
 * Responsibilities:
 *   - `eraForYear()` — map a calendar year to the correct EraId
 *   - `getTechsAutoUnlockedByYear()` — which techs auto-unlock at a year
 *   - `getTechnologiesAvailableAtYear()` — filtered tech tree for a year
 *   - `getEffectsAvailableAtYear()` — effects the player can select based on year
 */

import { EraId, type DemoEffect, type TechNode } from "@packages/types";
import { DEMO_EFFECTS } from "../data/demoEffects";
import { TECHNOLOGY_TREE } from "../data/technologyTree";
import { ERA_BOUNDARIES, eraForYear } from "../data/eraConfig";
export type { EraBoundary } from "../data/eraConfig";
export { ERA_BOUNDARIES, eraForYear };

/**
 * Get all tech nodes that are discoverable in a given year.
 * Filters by era, then by prereqs being satisfied by other nodes
 * in the same era range.
 */
export function getTechnologiesAvailableAtYear(
  tree: readonly TechNode[],
  year: number,
): TechNode[] {
  const era = eraForYear(year);
  return tree.filter((t) => {
    // Node must belong to this era or an earlier one
    const nodeEraIdx = ERA_BOUNDARIES.findIndex((b) => b.era === t.era);
    const currentEraIdx = ERA_BOUNDARIES.findIndex((b) => b.era === era);
    if (nodeEraIdx === -1 || currentEraIdx === -1) return false;
    return nodeEraIdx <= currentEraIdx;
  });
}

/**
 * Check whether a specific year boundary was JUST crossed.
 * Returns the new era if the year changed into a different era,
 * or null if still within the same era.
 */
export function detectEraTransition(
  previousYear: number,
  nextYear: number,
): EraId | null {
  if (previousYear === nextYear) return null;
  const prevEra = eraForYear(previousYear);
  const nextEra = eraForYear(nextYear);
  return prevEra !== nextEra ? nextEra : null;
}

/**
 * Detect if a calendar year boundary was crossed (e.g. Dec→Jan).
 * Returns the new year, or null if same year.
 */
export function detectYearBoundary(
  previousYear: number,
  previousMonth: number,
  nextYear: number,
  nextMonth: number,
): number | null {
  // Year boundary only when we transition from December to January
  if (previousMonth === 12 && nextMonth === 1) {
    return nextYear;
  }
  return null;
}

/**
 * Get the human-readable era label for a given year.
 */
export function eraLabelForYear(year: number): string {
  const b = ERA_BOUNDARIES.find((b) => year >= b.fromYear && year <= b.toYear);
  return b?.label ?? "Unknown Era";
}
