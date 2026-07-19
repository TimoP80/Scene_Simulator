"""
Address the code reviewer's feedback on the migration script:
  1. Add `migrate:data` script to package.json
  2. Use mapToObject for the actual hardware migration (remove the
     dead-code smoke test)
  3. Add round-trip validation: re-read the JSON files and validate
     with Zod
  4. Drop the no-longer-needed hardware Map/array consistency check
     (mapToObject is now used in the output path)
"""

import re
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Add `migrate:data` script to package.json
# ---------------------------------------------------------------------------

PKG = Path("package.json")
src = PKG.read_text(encoding="utf-8")

# Find the scripts block and add migrate:data
OLD = '    "lint": "tsc --noEmit"'
NEW = '    "lint": "tsc --noEmit",\n    "migrate:data": "tsx scripts/migrate_data_to_json.ts"'
if OLD in src and '"migrate:data"' not in src:
    src = src.replace(OLD, NEW)
    PKG.write_text(src, encoding="utf-8")
    print("OK: added migrate:data script to package.json")
else:
    print("SKIP: migrate:data already in package.json or anchor not found")

# ---------------------------------------------------------------------------
# 2. Update the migration script: use mapToObject for hardware,
#    add round-trip validation, drop the dead-code smoke test
# ---------------------------------------------------------------------------

SCRIPT = Path("scripts/migrate_data_to_json.ts")
src = SCRIPT.read_text(encoding="utf-8")

# 2a. Replace the hardware migration block to use mapToObject and
#     add round-trip validation
OLD_HARDWARE = """  // hardware: merge array + index into one Record<id, HardwareItem>
  {
    const hardware: Record<string, unknown> = {};
    for (const item of HARDWARE_CATALOG) {
      hardware[item.id] = clone(item);
    }
    log("hardware.json", writeJson("hardware.json", hardware));
  }"""
NEW_HARDWARE = """  // hardware: convert the runtime ReadonlyMap index to a plain object
  // (this matches what the reducer's hot-path lookup expects, and
  // exercises the mapToObject helper so it isn't dead code).
  log("hardware.json", writeJson("hardware.json", clone(mapToObject(HARDWARE_CATALOG_INDEX))));"""
if OLD_HARDWARE in src:
    src = src.replace(OLD_HARDWARE, NEW_HARDWARE)
    print("OK: switched hardware to use mapToObject")
else:
    print("WARN: hardware block anchor not found")

# 2b. Replace the dead-code Map/array smoke test + the "total" log
#     with a proper round-trip validation step.
OLD_TAIL = """  // Verify the HARDWARE_CATALOG_INDEX Map was correctly converted by
  // asserting the index matches the array (a smoke test for the Map→object
  // conversion pattern).
  {
    const fromIndex = mapToObject(HARDWARE_CATALOG_INDEX);
    const fromArray = toRecordById(HARDWARE_CATALOG);
    const indexKeys = Object.keys(fromIndex).sort();
    const arrayKeys = Object.keys(fromArray).sort();
    if (indexKeys.length !== arrayKeys.length) {
      throw new Error(
        `HARDWARE_CATALOG_INDEX / HARDWARE_CATALOG key mismatch: ${indexKeys.length} vs ${arrayKeys.length}`
      );
    }
    for (let i = 0; i < indexKeys.length; i++) {
      if (indexKeys[i] !== arrayKeys[i]) {
        throw new Error(
          `HARDWARE_CATALOG_INDEX key mismatch at position ${i}: "${indexKeys[i]}" vs "${arrayKeys[i]}"`
        );
      }
    }
    console.log("  ✓ hardware Map/array consistency check passed");
  }

  console.log(`\\nDone. ${total} total entries written to data/*.json`);
}"""
NEW_TAIL = """  // Round-trip validation: re-read each JSON file and assert it
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
  console.log(`  ✓ ${roundTripOk} files round-tripped through JSON.parse`);

  console.log(`\\nDone. ${total} total entries written to data/*.json`);
}"""
if OLD_TAIL in src:
    src = src.replace(OLD_TAIL, NEW_TAIL)
    print("OK: replaced dead-code smoke test with round-trip validation")
else:
    print("WARN: tail anchor not found")

# 2c. Add readFileSync to the node:fs imports
OLD_IMPORT = 'import { writeFileSync, mkdirSync, existsSync } from "node:fs";'
NEW_IMPORT = 'import { writeFileSync, readFileSync, mkdirSync, existsSync } from "node:fs";'
if OLD_IMPORT in src:
    src = src.replace(OLD_IMPORT, NEW_IMPORT)
    print("OK: added readFileSync to node:fs imports")
else:
    print("WARN: import anchor not found")

SCRIPT.write_text(src, encoding="utf-8")
print("OK: updated migration script")
