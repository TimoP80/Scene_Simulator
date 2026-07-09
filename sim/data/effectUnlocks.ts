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
 */

import { DEMO_EFFECTS } from "./demoEffects";
import { TECHNOLOGY_TREE } from "./technologyTree";
import { SOFTWARE_CATALOG } from "./softwareCatalog";

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
 * nodes they have researched and the software they own.
 *
 * Unlock rules (in order):
 *   1. Every effect with `researchRequired: false` — these are always
 *      available from game start.
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
): Set<string> {
  const unlocked = new Set<string>();

  // Free effects — anything marked `researchRequired: false` is always
  // available, regardless of whether a tech-node also references it
  // (e.g. `animated_plasma` is open from year 1990 onward without
  // requiring the copper_lists tech to be researched).
  for (const eff of DEMO_EFFECTS) {
    if (!eff.researchRequired) unlocked.add(eff.id);
  }

  // Researched effects — only added by an explicitly researched tech node.
  for (const tId of unlockedTechIds) {
    const node = TECHNOLOGY_TREE.find((t) => t.id === tId);
    if (node) for (const id of node.effectUnlocks) unlocked.add(id);
  }
  // Owned software offerings work the same way.
  for (const sId of ownedSoftwareIds) {
    const sw = SOFTWARE_CATALOG.find((s) => s.id === sId);
    if (sw) for (const id of sw.effectUnlocks) unlocked.add(id);
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
