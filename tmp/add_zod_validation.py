"""
Add real Zod round-trip validation to the migration script so schema
drift between sim/data/*.ts and the JSON output is caught at migration
time, not at editor load time. Also add a comment to clone() about
its limitations.
"""

from pathlib import Path

SCRIPT = Path("scripts/migrate_data_to_json.ts")
src = SCRIPT.read_text(encoding="utf-8")

# 1. Add Zod imports + the validation step.
#    We import only the schemas that correspond to the 11 files we write.
#    The Zod schemas live in src/content/schema.ts (already exists).
ZOD_IMPORT = (
    "import { z } from \"zod\";\n"
    "import {\n"
    "  CharacterSchema,\n"
    "  GroupSchema,\n"
    "  DemoEffectSchema,\n"
    "  TechNodeSchema,\n"
    "  PartyEventSchema,\n"
    "} from \"../src/content/schema\";\n"
)

# Insert the import after the existing @sim/data imports block.
ANCHOR = "import { HISTORICAL_PLATFORMS } from \"@sim/data/platforms\";"
if ANCHOR in src and "CharacterSchema" not in src:
    src = src.replace(ANCHOR, ANCHOR + "\n" + ZOD_IMPORT)
    print("OK: added Zod schema imports")
else:
    print("SKIP: Zod imports already present or anchor not found")

# 2. Replace the JSON.parse round-trip with real Zod validation.
OLD_VALIDATION = """  // Round-trip validation: re-read each JSON file and assert it
  // round-trips through JSON.parse without error. This catches
  // accidental NaN/Infinity/circular-reference issues that would
  // otherwise silently corrupt the output. A full Zod validation
  // step lives in sim/__tests__/ (TODO: add migrate:validate script).
  let roundTripOk = 0;
  for (const name of [
    "sceners.json",
    "groups.json",
    "effects.json",
    "research.json",
    "parties.json",
    "hardware.json",
    "jobs.json",
    "software.json",
    "sponsorships.json",
    "rival_releases.json",
    "platforms.json",
  ]) {
    const path = resolve(process.cwd(), "data", name);
    const raw = readFileSync(path, "utf-8");
    JSON.parse(raw); // throws on malformed JSON
    roundTripOk += 1;
  }
  console.log(`  ✓ ${roundTripOk} files round-tripped through JSON.parse`);"""
NEW_VALIDATION = """  // Real Zod round-trip validation: re-read each JSON file, parse it,
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
  console.log(`  ✓ ${validated} files validated (${zodCount} with Zod schemas, ${VALIDATIONS.length - zodCount} with JSON.parse only)`);"""
if OLD_VALIDATION in src:
    src = src.replace(OLD_VALIDATION, NEW_VALIDATION)
    print("OK: replaced JSON.parse round-trip with real Zod validation")
else:
    print("WARN: validation block anchor not found")

# 3. Add a comment to clone() about its limitations.
OLD_CLONE = "/** Deep clone via JSON so we never mutate the source-of-truth objects. */"
NEW_CLONE = """/**
 * Deep clone via JSON so we never mutate the source-of-truth objects.
 * Limitation: drops Date, Map, Set, BigInt, undefined, and functions.
 * None of the current seed data uses these types, so this is safe
 * today. If a future seed type needs them, switch to a structuredClone
 * (Node 17+) or a hand-rolled walker.
 */"""
if OLD_CLONE in src:
    src = src.replace(OLD_CLONE, NEW_CLONE)
    print("OK: added limitation comment to clone()")
else:
    print("WARN: clone() comment anchor not found")

SCRIPT.write_text(src, encoding="utf-8")
print("OK: updated migration script with Zod validation")
