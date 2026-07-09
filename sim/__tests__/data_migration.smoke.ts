/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Smoke test for `data/*.json` schema drift.
 *
 * Per docs/architecture.md "Content drives simulation":
 *   "Game content is data, not code. Seed data lives in data/*.json
 *    and is loaded at startup. The TypeScript types in
 *    packages/types/src/ define the shape; the Zod schemas in
 *    src/content/schema.ts mirror them for runtime validation."
 *
 * If a future contributor adds a required field to a TypeScript type
 * (e.g. `Character.cognitive: CognitiveModel`) but forgets to:
 *   (a) re-run `npm run migrate:data` to regenerate the JSON, OR
 *   (b) update the corresponding Zod schema to require the field,
 * ...the JSON in data/*.json will silently drift out of sync with the
 * type. This test catches that drift at CI time, not at editor load
 * time (which only happens when dev mode is active).
 *
 * Strategy:
 *   - For files WITH a Zod schema: parse the JSON and validate each
 *     top-level entry against the schema. Collect ALL errors (not
 *     just the first) so a contributor sees every drift in one run.
 *   - For files WITHOUT a Zod schema (economy types + empty stubs +
 *     manifest): just verify they parse as JSON. These are covered
 *     by the migration script's round-trip validation when it runs.
 *
 * The 5 Zod-validated files (the ones the dev tools edit):
 *   data/sceners.json      → CharacterSchema
 *   data/groups.json       → GroupSchema
 *   data/effects.json      → DemoEffectSchema
 *   data/research.json     → TechNodeSchema
 *   data/parties.json      → PartyEventSchema
 *
 * The 9 JSON-parse-only files (no Zod schema yet):
 *   data/hardware.json, data/jobs.json, data/software.json,
 *   data/sponsorships.json, data/rival_releases.json,
 *   data/platforms.json, data/bbs_threads.json, data/productions.json,
 *   data/manifest.json
 *
 * Run with: `npx tsx sim/__tests__/data_migration.smoke.ts`
 */
import { strict as assert } from "node:assert";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { z } from "zod";
import {
  CharacterSchema,
  GroupSchema,
  DemoEffectSchema,
  TechNodeSchema,
  PartyEventSchema,
} from "../../src/content/schema";

// ---------------------------------------------------------------------------
// Test harness — same check/failures pattern as the other smoke tests.
// ---------------------------------------------------------------------------

let failures = 0;
function check(label: string, run: () => void): void {
  try {
    run();
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${(err as Error).message}`);
  }
}

/** Resolve a path under data/ and return the parsed JSON, or fail. */
function readJsonFile<T>(name: string): T {
  const path = resolve(process.cwd(), "data", name);
  if (!existsSync(path)) {
    throw new Error(`data/${name} does not exist`);
  }
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

// ---------------------------------------------------------------------------
// SCENARIO 1 — ContentLoader-style integration (Zod map schema).
// ---------------------------------------------------------------------------
//
// This scenario replicates the ContentLoader's exact validation
// pattern (`z.record(z.string(), file.schema)`) for each of the 5
// Zod-backed content files. It catches schema drift in CI the moment
// a seed type changes — not whenever someone next runs
// `npm run migrate:data`.
//
// Note: we don't call `loadBaseContent()` directly because it uses
// `fetch('/data/...')` which only works in a browser context. The
// `z.record` validation here is the same one the loader runs after
// fetching, so a regression in the JSON shape (added required field,
// wrong type, missing enum value) surfaces here with the same error
// message the loader would produce.

console.log("\nScenario 1: ContentLoader-style Zod map validation");

// Tuples (not objects) so TypeScript infers the per-schema record type
// without a `z.ZodType<unknown>` cast.
const LOADER_VALIDATIONS = [
  ["sceners.json", "CharacterSchema", CharacterSchema] as const,
  ["groups.json", "GroupSchema", GroupSchema] as const,
  ["effects.json", "DemoEffectSchema", DemoEffectSchema] as const,
  ["research.json", "TechNodeSchema", TechNodeSchema] as const,
  ["parties.json", "PartyEventSchema", PartyEventSchema] as const,
];

for (const [name, schemaName, schema] of LOADER_VALIDATIONS) {
  check(`data/${name} passes z.record(${schemaName})`, () => {
    const data = readJsonFile<Record<string, unknown>>(name);
    // ContentLoader-style integration: matches the exact validation
    // shape the runtime loader uses, so a regression in the JSON
    // (added required field, wrong type, missing enum value) surfaces
    // here with the same error message the loader would produce.
    // The `as z.ZodTypeAny` widens the per-schema tuple element to
    // the top Zod type that `z.record` accepts.
    const result = z
      .record(z.string(), schema as z.ZodTypeAny)
      .safeParse(data);
    if (!result.success) {
      throw new Error(result.error.message);
    }
  });
}

// ---------------------------------------------------------------------------
// SCENARIO 2 — JSON-parse sanity check for the 9 schema-less files.
// ---------------------------------------------------------------------------

console.log("\nScenario 2: JSON-parse the 9 schema-less content files");

const SCHEMALESS_FILES = [
  "hardware.json",
  "jobs.json",
  "software.json",
  "sponsorships.json",
  "rival_releases.json",
  "platforms.json",
  "bbs_threads.json",
  "productions.json",
  "manifest.json",
];

for (const name of SCHEMALESS_FILES) {
  check(`data/${name} parses as valid JSON`, () => {
    const data = readJsonFile<unknown>(name);
    // Lightweight shape check: must be an object (not an array or primitive).
    assert.equal(
      typeof data,
      "object",
      `${name} should be a JSON object (got ${typeof data})`
    );
    assert.ok(data !== null, `${name} should not be null`);
  });
}

// ---------------------------------------------------------------------------
// SCENARIO 3 — Cross-file consistency: id keys match entity.id.
// ---------------------------------------------------------------------------

console.log("\nScenario 3: id-key consistency");

// Tuples (not objects) to avoid a verbose inline type annotation.
const ID_KEYED_FILES = [
  "sceners.json",
  "groups.json",
  "effects.json",
  "research.json",
  "parties.json",
] as const;

for (const name of ID_KEYED_FILES) {
  check(`data/${name}: each entry's key matches its "id" field`, () => {
    const data = readJsonFile<Record<string, { id?: string }>>(name);
    const mismatches: string[] = [];
    for (const [key, value] of Object.entries(data)) {
      if (value.id !== undefined && value.id !== key) {
        mismatches.push(`  - key="${key}" but id="${value.id}"`);
      }
    }
    if (mismatches.length > 0) {
      throw new Error(
        `${mismatches.length} mismatches:\n${mismatches.join("\n")}`
      );
    }
  });
}

// ---------------------------------------------------------------------------
// Final tally
// ---------------------------------------------------------------------------

console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "content JSON files match their Zod schemas." : `${failures} check(s) failed.`}`
);
if (failures > 0) process.exit(1);
