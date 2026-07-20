/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * effectUnlocks — the single source of truth that wires every defined
 * demo effect into the unlock graph.
 *
 * Historically each effect had to be hand-listed in a tech node's
 * `effectUnlocks` (or a software offering's) before a player could use
 * it. That is brittle: adding an effect to data/effects.json left it
 * unreachable until someone also edited research.json / software.json.
 *
 * This module drives unlock rules from two per-effect / per-catalog
 * sources of truth:
 *   - `DemoEffect.researchRequired` — when `false`, the effect is open
 *     from game start regardless of research.
 *   - `TechNode.effectUnlocks` / `SoftwareOffering.effectUnlocks` —
 *     explicit "home" lists that respect prereqs, era, and platform.
 *
 * Pure data / helpers. NO React, NO LLM, NO side effects.
 *
 * Optimization (v0.6.0): YEAR_TO_EFFECTS_MAP is pre-computed once at
 * module load time, giving getEffectIdsAvailableAtYear O(1) lookups
 * for the canonical DEMO_EFFECTS array.
 */

import type { DemoEffect } from "@packages/types";
import { DEMO_EFFECTS } from "./demoEffects";
import { TECHNOLOGY_TREE } from "./technologyTree";
import { SOFTWARE_CATALOG } from "./softwareCatalog";
import { ERA_BOUNDARIES, eraForYear } from "./eraConfig";

/**
 * Build a module-level cache: for every year in the supported range,
 * pre-compute which effect IDs are era-appropriate. Built once at load.
 *
 * An effect at ERA_16_BIT is available from 1990 onward but not in 1985.
 * The cache eliminates the O(n) iteration over DEMO_EFFECTS on every call.
 */
function buildYearToEffectsMap(): Map<number, ReadonlySet<string>> {
  const MIN_YEAR = Math.min(...ERA_BOUNDARIES.map((b) => b.fromYear));
  const MAX_YEAR = Math.max(...ERA_BOUNDARIES.map((b) => b.toYear));
  const map = new Map<number, ReadonlySet<string>>();

  // Pre-compute era index for each era for fast comparison
  const eraIndices = new Map(
    ERA_BOUNDARIES.map((b, i) => [b.era, i] as const),
  );

  for (let year = MIN_YEAR; year <= MAX_YEAR; year++) {
    const currentEra = eraForYear(year);
    const currentEraIdx = eraIndices.get(currentEra) ?? -1;
    const available = new Set<string>();

    for (const eff of DEMO_EFFECTS) {
      const effEraIdx = eraIndices.get(eff.era) ?? -1;
      if (
        effEraIdx !== -1 &&
        currentEraIdx !== -1 &&
        effEraIdx <= currentEraIdx
      ) {
        available.add(eff.id);
      }
    }

    map.set(year, available);
  }

  return map;
}

/** Pre-computed cache: year → set of era-appropriate effect IDs. */
const YEAR_TO_EFFECTS_MAP: ReadonlyMap<number, ReadonlySet<string>> =
  buildYearToEffectsMap();

/**
 * Filter effect IDs by calendar year — effects from later eras are
 * locked until the calendar reaches that era. O(1) lookup via the
 * pre-computed module-level map when querying DEMO_EFFECTS.
 *
 * @param effects - The effects array to filter. When this is the
 *   canonical DEMO_EFFECTS (the common case), uses the cached map.
 *   Otherwise falls back to an iterative computation.
 * @param year - The calendar year to check availability for.
 * @returns A new Set (safe for mutation by the caller).
 */
export function getEffectIdsAvailableAtYear(
  effects: readonly DemoEffect[],
  year: number,
): Set<string> {
  // Fast path: use the pre-computed map for O(1) lookup. Clone the set
  // so callers can mutate the result without corrupting the cache.
  if (effects === DEMO_EFFECTS) {
    const cached = YEAR_TO_EFFECTS_MAP.get(year);
    return new Set(cached ?? []);
  }

  // Slow path: custom effects array — compute on the fly.
  const available = new Set<string>();
  const era = eraForYear(year);
  const eraIndices = new Map(
    ERA_BOUNDARIES.map((b, i) => [b.era, i] as const),
  );
  const currentEraIdx = eraIndices.get(era) ?? -1;

  for (const eff of effects) {
    const effEraIdx = eraIndices.get(eff.era) ?? -1;
    if (
      effEraIdx !== -1 &&
      currentEraIdx !== -1 &&
      effEraIdx <= currentEraIdx
    ) {
      available.add(eff.id);
    }
  }
  return available;
}

/** Union of every effect id referenced by any tech node or software offering. */
export function collectDeclaredUnlocks(): Set<string> {
  const ids = new Set<string>();
  for (const node of TECHNOLOGY_TREE) {
    for (const id of node.effectUnlocks) ids.add(id);
  }
  for (const sw of SOFTWARE_CATALOG) {
    for (const id of sw.effectUnlocks) ids.add(id);
  }
  return ids;
}

/**
 * Compute the full set of effect ids the player can use, given the tech
 * nodes they have researched, the software they own, and the current
 * calendar year (effects from later eras are locked until the calendar
 * reaches that era).
 *
 * Unlock rules (in order):
 *   1. Every effect with `researchRequired: false` AND whose era is at
 *      or before the current year's era — these are always available
 *      once the calendar enters the right era.
 *   2. Every effect explicitly unlocked by a researched tech node.
 *   3. Every effect explicitly unlocked by an owned software offering.
 *
 * Effects with `researchRequired: true` are only added by steps 2-3 — so
 * the studio's "RESEARCH REQUIRED" badge stays meaningful.
 *
 * Any id that points at a non-existent effect (a stale reference in a
 * tech/software entry) is dropped, so the returned set is always a
 * subset of the live DEMO_EFFECTS array.
 */
export function getUnlockedEffectIds(
  unlockedTechIds: Iterable<string>,
  ownedSoftwareIds: Iterable<string> = [],
  currentYear?: number,
): Set<string> {
  const unlocked = new Set<string>();

  // If a year is provided, compute the era-gated set of effect ids
  // that are historically available at that year.
  const yearAvailable =
    currentYear !== undefined
      ? getEffectIdsAvailableAtYear(DEMO_EFFECTS, currentYear)
      : null;

  // Free effects — anything marked `researchRequired: false` AND
  // era-appropriate (if year is provided) is always available.
  for (const eff of DEMO_EFFECTS) {
    if (!eff.researchRequired) {
      if (yearAvailable === null || yearAvailable.has(eff.id)) {
        unlocked.add(eff.id);
      }
    }
  }

  // Researched effects — only added by an explicitly researched tech node.
  for (const tId of unlockedTechIds) {
    const node = TECHNOLOGY_TREE.find((t) => t.id === tId);
    if (node) {
      for (const id of node.effectUnlocks) {
        // Even researched effects are gated by year
        if (yearAvailable === null || yearAvailable.has(id)) {
          unlocked.add(id);
        }
      }
    }
  }
  // Owned software offerings work the same way.
  for (const sId of ownedSoftwareIds) {
    const sw = SOFTWARE_CATALOG.find((s) => s.id === sId);
    if (sw) {
      for (const id of sw.effectUnlocks) {
        if (yearAvailable === null || yearAvailable.has(id)) {
          unlocked.add(id);
        }
      }
    }
  }

  // Sanitize against the live DEMO_EFFECTS array so any future catalogue
  // edits propagate immediately without a module-reload race.
  for (const id of [...unlocked]) {
    if (!DEMO_EFFECTS.some((e) => e.id === id)) unlocked.delete(id);
  }
  return unlocked;
}

/**
 * Effects defined in data/effects.json that are NOT referenced by any
 * tech node or software offering. They are still available (since
 * unlocked by either the research gate or the free-effect gate) but
 * have no explicit research "home" — useful for auditing / balancing
 * the tech tree.
 */
export function getUnregisteredEffectIds(): string[] {
  const allIds = DEMO_EFFECTS.map((e) => e.id);
  const declared = collectDeclaredUnlocks();
  return allIds.filter((id) => !declared.has(id));
}
