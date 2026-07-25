/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Blueprint storage — persist and retrieve Demo Studio configuration
 * snapshots in localStorage. Each blueprint is a named ProductionBlueprint
 * that captures every configurable studio field so the player can save
 * their favourite setups and restore them in any playthrough.
 *
 * Storage layout (single key):
 *   localStorage["demoscene_blueprints"] = JSON.stringify({
 *     "My 4K Racer": { name, updatedAt, productionTitle, ... },
 *     "Neon Dreams":  { name, updatedAt, productionTitle, ... },
 *   })
 *
 *   The per-blueprint `updatedAt` timestamp lets a future "sort by
 *   last-used" feature be implemented without schema changes.
 */

import type { ProductionBlueprint } from "@packages/types";

const STORAGE_KEY = "demoscene_blueprints";

/** Load all saved blueprints keyed by name. */
function loadAll(): Record<string, ProductionBlueprint> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Overwrite the entire blueprint map. */
function persistAll(map: Record<string, ProductionBlueprint>): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch (e) {
    console.warn("[blueprintStorage] failed to persist:", e);
  }
}

// ─── Public API ───

/** Return every saved blueprint as an array (newest-first). */
export function listBlueprints(): ProductionBlueprint[] {
  const map = loadAll();
  return Object.values(map).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

/** Save (or overwrite) a blueprint by name. */
export function saveBlueprint(bp: ProductionBlueprint): void {
  const map = loadAll();
  map[bp.name] = { ...bp, updatedAt: new Date().toISOString() };
  persistAll(map);
}

/**
 * Load a single blueprint by name. Returns undefined if not found.
 * Never returns stale data (reads fresh from localStorage each call).
 */
export function loadBlueprint(name: string): ProductionBlueprint | undefined {
  const map = loadAll();
  return map[name];
}

/** Delete a blueprint by name. Silently succeeds if absent. */
export function deleteBlueprint(name: string): void {
  const map = loadAll();
  delete map[name];
  persistAll(map);
}

/** Return the number of saved blueprints. */
export function blueprintCount(): number {
  return Object.keys(loadAll()).length;
}

/** Remove all blueprints. */
export function clearBlueprints(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch { /* ignore */ }
}
