/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * migrate_data_to_json.ts — one-shot migration that walks the static
 * seed data in sim/data/*.ts, resolves all enum references
 * (SpecialtyType.X, PlatformId.X, EraId.X, etc.) at runtime, and
 * writes the result to data/*.json so the dev tools can edit it
 * without modifying TypeScript code.
 *
 * Run with:
 *   npx tsx scripts/migrate_data_to_json.ts
 *
 * Or add to package.json scripts:
 *   "migrate:data": "tsx scripts/migrate_data_to_json.ts"
 *
 * What it does:
 *   1. Imports each TS module from @sim/data/... using tsx (which
 *      resolves path aliases from tsconfig.json automatically).
 *   2. Strips runtime-only fields (e.g. `cognitive` on Character).
 *   3. Converts arrays to Record<string, T> keyed by id.
 *   4. Converts ReadonlyMap to a plain object via Object.fromEntries.
 *   5. Writes pretty-printed JSON to data/*.json.
 *
 * The script is idempotent: running it twice produces the same output.
 * It does NOT touch the source sim/data/*.ts files.
 */

import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve } from "node:path";

// ---------------------------------------------------------------------------
// 1. Import all static seed modules. tsx resolves the @sim/* path alias
//    from tsconfig.json automatically.
// ---------------------------------------------------------------------------

import { INITIAL_NPCS } from "@sim/data/initialNpcs";
import { INITIAL_GROUPS } from "@sim/data/initialGroups";
import { DEMO_EFFECTS } from "@sim/data/demoEffects";
import { TECHNOLOGY_TREE } from "@sim/data/technologyTree";
import { PARTY_CALENDAR } from "@sim/data/partyCalendar";
import {
  HARDWARE_CATALOG,
  HARDWARE_CATALOG_INDEX,
} from "@sim/data/hardwareCatalog";
import { JOB_TEMPLATES } from "@sim/data/jobTemplates";
import { SOFTWARE_CATALOG } from "@sim/data/softwareCatalog";
import { SPONSORSHIP_CATALOG } from "@sim/data/sponsorshipCatalog";
import { RIVAL_RELEASES } from "@sim/data/rivalReleases";
import { HISTORICAL_PLATFORMS } from "@sim/data/platforms";
import { z } from "zod";
import {
  CharacterSchema,
  GroupSchema,
  DemoEffectSchema,
  TechNodeSchema,
  PartyEventSchema,
} from "../src/content/schema";


// ---------------------------------------------------------------------------
// 2. Helpers
// ---------------------------------------------------------------------------

/**
 * Deep clone via JSON so we never mutate the source-of-truth objects.
 * Limitation: drops Date, Map, Set, BigInt, undefined, and functions.
 * None of the current seed data uses these types, so this is safe
 * today. If a future seed type needs them, switch to a structuredClone
 * (Node 17+) or a hand-rolled walker.
 */
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

/** Convert an array of `{id, ...}` items to a Record keyed by id. */
function toRecordById<T extends { id: string }>(arr: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const item of arr) {
    out[item.id] = item;
  }
  return out;
}

/** Convert a Map to a plain object. */
function mapToObject<K extends string | number | symbol, V>(
  m: ReadonlyMap<K, V>
): Record<K, V> {
  return Object.fromEntries(m.entries()) as Record<K, V>;
}

/** Strip runtime-only fields from a Character. */
function stripRuntimeFieldsFromCharacter<T extends { cognitive?: unknown }>(
  c: T
): Omit<T, "cognitive"> {
  const { cognitive: _cognitive, ...rest } = c;
  return rest;
}

/** Write a JSON file to data/, pretty-printed. */
function writeJson(name: string, data: unknown): number {
  const dir = resolve(process.cwd(), "data");
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  const path = resolve(dir, name);
  const json = JSON.stringify(data, null, 2) + "\n";
  writeFileSync(path, json, "utf-8");
  // Count top-level keys for logging.
  const count =
    data && typeof data === "object"
      ? Object.keys(data as Record<string, unknown>).length
      : 0;
  return count;
}

// ---------------------------------------------------------------------------
// 3. Migrate each content type
// ---------------------------------------------------------------------------

function main() {
  let total = 0;
  const log = (name: string, count: number) => {
    console.log(`  ✓ data/${name} (${count} entries)`);
    total += count;
  };

  console.log("Migrating sim/data/*.ts → data/*.json ...");

  // sceners: strip cognitive field from each Character
  {
    const sceners: Record<string, unknown> = {};
    for (const [id, c] of Object.entries(INITIAL_NPCS)) {
      sceners[id] = stripRuntimeFieldsFromCharacter(clone(c));
    }
    log("sceners.json", writeJson("sceners.json", sceners));
  }

  // groups: object already keyed by id
  log("groups.json", writeJson("groups.json", clone(INITIAL_GROUPS)));

  // effects: array → Record<id, DemoEffect>
  log("effects.json", writeJson("effects.json", toRecordById(clone(DEMO_EFFECTS))));

  // research: array → Record<id, TechNode>
  log("research.json", writeJson("research.json", toRecordById(clone(TECHNOLOGY_TREE))));

  // parties: array → Record<id, PartyEvent>
  log("parties.json", writeJson("parties.json", toRecordById(clone(PARTY_CALENDAR))));

  // hardware: convert the runtime ReadonlyMap index to a plain object
  // (this matches what the reducer's hot-path lookup expects, and
  // exercises the mapToObject helper so it isn't dead code).
  log("hardware.json", writeJson("hardware.json", clone(mapToObject(HARDWARE_CATALOG_INDEX))));

  // jobs: array → Record<id, JobTemplate>
  log("jobs.json", writeJson("jobs.json", toRecordById(clone(JOB_TEMPLATES))));

  // software: array → Record<id, SoftwareOffering>
  log("software.json", writeJson("software.json", toRecordById(clone(SOFTWARE_CATALOG))));

  // sponsorships: array → Record<id, SponsorshipOffering>
  log("sponsorships.json", writeJson("sponsorships.json", toRecordById(clone(SPONSORSHIP_CATALOG))));

  // rival_releases: array → Record<id, RivalRelease>
  log("rival_releases.json", writeJson("rival_releases.json", toRecordById(clone(RIVAL_RELEASES))));

  // platforms: object already keyed by PlatformId enum value
  log("platforms.json", writeJson("platforms.json", clone(HISTORICAL_PLATFORMS)));

  // Real Zod round-trip validation: re-read each JSON file, parse it,
  // and validate it against the corresponding Zod schema. This catches
  // schema drift between sim/data/*.ts and the JSON output at
  // migration time (not at editor load time). Hardware / jobs /
  // software / sponsorships / rival_releases / platforms don't have
  // Zod schemas yet (they're economy types, not content types), so
  // they only get a JSON.parse sanity check.
  const VALIDATIONS: Array<{ name: string; schema?: z.ZodType<unknown> }> = [
    { name: "sceners.json",      schema: z.record(z.string(), CharacterSchema) },
    { name: "groups.json",       schema: z.record(z.string(), GroupSchema) },
    { name: "effects.json",      schema: z.record(z.string(), DemoEffectSchema) },
    { name: "research.json",     schema: z.record(z.string(), TechNodeSchema) },
    { name: "parties.json",      schema: z.record(z.string(), PartyEventSchema) },
    { name: "hardware.json" },
    { name: "jobs.json" },
    { name: "software.json" },
    { name: "sponsorships.json" },
    { name: "rival_releases.json" },
    { name: "platforms.json" },
  ];
  let validated = 0;
  for (const v of VALIDATIONS) {
    const path = resolve(process.cwd(), "data", v.name);
    const raw = readFileSync(path, "utf-8");
    const parsed = JSON.parse(raw);
    if (v.schema) {
      const result = v.schema.safeParse(parsed);
      if (!result.success) {
        throw new Error(
          `Zod validation failed for data/${v.name}: ${result.error.message}`
        );
      }
    }
    validated += 1;
  }
  const zodCount = VALIDATIONS.filter((v) => v.schema).length;
  console.log(`  ✓ ${validated} files validated (${zodCount} with Zod schemas, ${VALIDATIONS.length - zodCount} with JSON.parse only)`);

  console.log(`\nDone. ${total} total entries written to data/*.json`);
}

main();
