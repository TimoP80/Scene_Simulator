/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * ContentLoader — fetches the base content pack from /data/ and loads it
 * into the ContentStore. Designed so future mod packs from /mods/ can be
 * deep-merged on top of the base pack without code changes.
 *
 * Loading strategy:
 *   1. Fetch /data/manifest.json to get the pack metadata + version.
 *   2. Fetch each content file in parallel (/data/sceners.json, etc.).
 *   3. Validate each file with its Zod schema (schema.ts).
 *   4. On success: replaceAll() into the ContentStore.
 *   5. On failure: fall back to the static seed data from
 *      @sim/data (so the game still runs if /data/ is missing).
 *
 * Future: `loadModPack(packId)` will fetch a mod from /mods/<id>/
 * and deep-merge it on top of the base pack. Mods can override
 * entities by matching id, or add new ones.
 */

import { getContentStore, type ContentPack } from "./ContentStore";
import {
  CharacterSchema,
  GroupSchema,
  DemoEffectSchema,
  TechNodeSchema,
  PartyEventSchema,
  BBSThreadSchema,
  ProductionSchema,
} from "./schema";
import { z } from "zod";

/** The list of content files to load. */
const CONTENT_FILES = [
  { type: "sceners", schema: CharacterSchema, path: "/data/sceners.json" },
  { type: "groups", schema: GroupSchema, path: "/data/groups.json" },
  { type: "effects", schema: DemoEffectSchema, path: "/data/effects.json" },
  { type: "research", schema: TechNodeSchema, path: "/data/research.json" },
  { type: "parties", schema: PartyEventSchema, path: "/data/parties.json" },
  { type: "bbsThreads", schema: BBSThreadSchema, path: "/data/bbs_threads.json" },
  { type: "productions", schema: ProductionSchema, path: "/data/productions.json" },
] as const;

const ManifestSchema = z.object({
  id: z.string(),
  version: z.string(),
  name: z.string().optional(),
  author: z.string().optional(),
  priority: z.number().optional(),
});

export interface LoadResult {
  ok: boolean;
  source: "json" | "fallback" | "empty";
  errors: string[];
}

/** Load the base content pack. Returns a summary of what happened. */
export async function loadBaseContent(): Promise<LoadResult> {
  const errors: string[] = [];
  const store = getContentStore();

  // 1. Fetch manifest
  let manifestOk = false;
  try {
    const res = await fetch("/data/manifest.json");
    if (res.ok) {
      const raw = await res.json();
      const m = ManifestSchema.safeParse(raw);
      if (m.success) {
        manifestOk = true;
      } else {
        errors.push(`manifest.json: ${m.error.message}`);
      }
    }
  } catch (e) {
    errors.push(`manifest.json fetch failed: ${String(e)}`);
  }

  // 2. Fetch each content file
  const partialPack: Partial<ContentPack> = {};
  for (const file of CONTENT_FILES) {
    try {
      const res = await fetch(file.path);
      if (!res.ok) {
        errors.push(`${file.path}: HTTP ${res.status}`);
        continue;
      }
      const raw = await res.json();
      // Each file is a Record<string, T> keyed by id. Validate the shape.
      const mapSchema = z.record(z.string(), file.schema);
      const parsed = mapSchema.safeParse(raw);
      if (!parsed.success) {
        errors.push(`${file.path}: ${parsed.error.message}`);
        continue;
      }
      (partialPack as Record<string, unknown>)[file.type] = parsed.data;
    } catch (e) {
      errors.push(`${file.path} fetch failed: ${String(e)}`);
    }
  }

  // 3. Decide: did we get any data?
  const loaded = Object.keys(partialPack).length;
  if (loaded === 0) {
    // Fall back to static seed data.
    try {
      const fallback = await loadFallbackFromStatic();
      store.replaceAll(fallback);
      return { ok: true, source: "fallback", errors };
    } catch (e) {
      errors.push(`static fallback failed: ${String(e)}`);
      return { ok: false, source: "empty", errors };
    }
  }

  // 4. Load the partial pack into the store.
  store.replaceAll(partialPack);
  return {
    ok: true,
    source: "json",
    errors: errors.length > 0 ? errors : [],
  };
}

/**
 * Fallback loader: import the static seed data from @sim/data and
 * convert it into the ContentPack shape. This ensures the game still
 * runs if /data/ is missing (e.g. during dev with vite, or in SSR).
 */
async function loadFallbackFromStatic(): Promise<Partial<ContentPack>> {
  const [
    { INITIAL_NPCS },
    { INITIAL_GROUPS },
    { DEMO_EFFECTS },
    { TECHNOLOGY_TREE },
    { PARTY_CALENDAR },
  ] = await Promise.all([
    import("@sim/data/initialNpcs"),
    import("@sim/data/initialGroups"),
    import("@sim/data/demoEffects"),
    import("@sim/data/technologyTree"),
    import("@sim/data/partyCalendar"),
  ]);

  // Convert arrays to Record<string, T>
  const effects: Record<string, (typeof DEMO_EFFECTS)[number]> = {};
  for (const e of DEMO_EFFECTS) effects[e.id] = e;
  const research: Record<string, (typeof TECHNOLOGY_TREE)[number]> = {};
  for (const t of TECHNOLOGY_TREE) research[t.id] = t;
  const parties: Record<string, (typeof PARTY_CALENDAR)[number]> = {};
  for (const p of PARTY_CALENDAR) parties[p.id] = p;

  return {
    sceners: INITIAL_NPCS,
    groups: INITIAL_GROUPS,
    effects,
    research,
    parties,
    bbsThreads: {},
    productions: {},
  };
}

/** Reload the base content pack from /data/. Used by the DevMenu
 *  "Reload Content" button. */
export async function reloadBaseContent(): Promise<LoadResult> {
  return loadBaseContent();
}
