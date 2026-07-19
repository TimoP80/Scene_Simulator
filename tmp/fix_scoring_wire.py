"""
Fix all typecheck errors from the scoring engine wire:
  - sim/domain/index.ts: add `export * from "./scoring"`
  - App.tsx imports: ARTISTIC_DIRECTIONS/OPTIMIZATION_FOCUSES/DEMO_DURATIONS
    come from @packages/types (they're const arrays there), not @sim/data
  - App.tsx: add ArtisticDirection/OptimizationFocus/DemoDuration to the
    @packages/types import and remove inline `import("@packages/types").X`
    annotations
  - App.tsx: PartyEvent has no `year` field — use currentYear for all
    upcomingParties
  - App.tsx: MusicFile has `size` not `sizeBytes`
  - App.tsx: rename `overallScore` references to `finalOverall`
  - scoring.ts: remove duplicate `import { EraId }` and `export { EraId }`
  - scoring.ts: remove unused `import type { PartyEvent }`
  - scoring.ts: fix Object.values(syn.bonus) type — bonus is Partial<ScoreBreakdown>
    which includes the `factors` object, so Object.values returns mixed types
  - scoring.ts: change ERA_START_YEAR fallback from `?? 0` to `?? 9999`
"""

import re
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. sim/domain/index.ts: add `export * from "./scoring"`
# ---------------------------------------------------------------------------

DOMAIN_INDEX = Path("sim/domain/index.ts")
src = DOMAIN_INDEX.read_text(encoding="utf-8")
if "./scoring" not in src:
    src = src.rstrip() + "\n\n// ---- Demo scoring engine (v2) ----\nexport * from \"./scoring\";\n"
    DOMAIN_INDEX.write_text(src, encoding="utf-8")
    print("OK: added export * from ./scoring to sim/domain/index.ts")
else:
    print("SKIP: ./scoring already exported from sim/domain/index.ts")

# ---------------------------------------------------------------------------
# 2. scoring.ts: remove duplicate EraId + unused PartyEvent + Object.values type
# ---------------------------------------------------------------------------

SCORING = Path("sim/domain/scoring.ts")
src = SCORING.read_text(encoding="utf-8")

# Remove the duplicate `import { EraId }` and `import type { PartyEvent }` block
# that was appended after my first edit.
OLD_DUP = (
    "import type { PartyEvent } from \"@packages/types\";\n"
    "import { EraId } from \"@packages/types\";\n"
)
if OLD_DUP in src:
    src = src.replace(OLD_DUP, "")
    print("OK: removed duplicate imports from scoring.ts")

# Remove the trailing `export { EraId };`
OLD_REEXPORT = "\n// ---------------------------------------------------------------------------\n// Re-export EraId for callers that need it\n// ---------------------------------------------------------------------------\n\nexport { EraId };\n"
if OLD_REEXPORT in src:
    src = src.replace(OLD_REEXPORT, "\n")
    print("OK: removed export { EraId } from scoring.ts")

# Fix the Object.values type error — bonus is Partial<ScoreBreakdown> which
# includes the `factors` object. Filter to numeric values only.
OLD_OV = "  working.factors.synergyBonus = Object.values(syn.bonus).reduce((s, v) => s + (typeof v === \"number\" ? v : 0), 0);"
NEW_OV = "  working.factors.synergyBonus = (Object.values(syn.bonus) as number[]).reduce<number>((s, v) => s + (typeof v === \"number\" ? v : 0), 0);"
if OLD_OV in src:
    src = src.replace(OLD_OV, NEW_OV)
    print("OK: fixed Object.values type in scoring.ts")

# Change ERA_START_YEAR fallback from ?? 0 to ?? 9999
OLD_ERA = "    const eraStart = ERA_START_YEAR[e.era] ?? 0;"
NEW_ERA = "    // Default to 9999 (far future) so an unknown era id locks the\n    // effect rather than silently passing the era check.\n    const eraStart = ERA_START_YEAR[e.era] ?? 9999;"
if OLD_ERA in src:
    src = src.replace(OLD_ERA, NEW_ERA)
    print("OK: fixed ERA_START_YEAR fallback in scoring.ts")

SCORING.write_text(src, encoding="utf-8")

# ---------------------------------------------------------------------------
# 3. App.tsx: fix imports
# ---------------------------------------------------------------------------

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 3a. Remove ARTISTIC_DIRECTIONS, OPTIMIZATION_FOCUSES, DEMO_DURATIONS from
#     the @sim/data import (they live in @packages/types).
OLD_DATA = (
    "  type BBSBoard,\n"
    "  ARTISTIC_DIRECTIONS,\n"
    "  OPTIMIZATION_FOCUSES,\n"
    "  DEMO_DURATIONS,\n"
    "  ARTISTIC_DIRECTION_DEFS,\n"
    "} from \"@sim/data\";\n"
)
NEW_DATA = (
    "  type BBSBoard,\n"
    "  ARTISTIC_DIRECTION_DEFS,\n"
    "} from \"@sim/data\";\n"
)
assert OLD_DATA in src, "Could not find @sim/data import block"
src = src.replace(OLD_DATA, NEW_DATA)

# 3b. Add ArtisticDirection, OptimizationFocus, DemoDuration to the
#     @packages/types import (right after DemoSummary).
OLD_TYPES = (
    "  Production,\n"
    "  DemoSummary,\n"
    "  TechNode,"
)
NEW_TYPES = (
    "  Production,\n"
    "  DemoSummary,\n"
    "  ArtisticDirection,\n"
    "  OptimizationFocus,\n"
    "  DemoDuration,\n"
    "  TechNode,"
)
assert OLD_TYPES in src, "Could not find @packages/types DemoSummary import"
src = src.replace(OLD_TYPES, NEW_TYPES)

# 3c. Add ARTISTIC_DIRECTIONS, OPTIMIZATION_FOCUSES, DEMO_DURATIONS to the
#     @packages/types import block (they're const arrays there).
OLD_TYPES_TAIL = (
    "  ArtisticDirection,\n"
    "  OptimizationFocus,\n"
    "  DemoDuration,\n"
    "  TechNode,"
)
NEW_TYPES_TAIL = (
    "  ArtisticDirection,\n"
    "  ARTISTIC_DIRECTIONS,\n"
    "  OptimizationFocus,\n"
    "  OPTIMIZATION_FOCUSES,\n"
    "  DemoDuration,\n"
    "  DEMO_DURATIONS,\n"
    "  TechNode,"
)
assert OLD_TYPES_TAIL in src, "Could not find @packages/types type tail"
src = src.replace(OLD_TYPES_TAIL, NEW_TYPES_TAIL)

# 3d. Replace inline `import("@packages/types").ArtisticDirection` etc.
src = src.replace(
    "import(\"@packages/types\").ArtisticDirection",
    "ArtisticDirection",
)
src = src.replace(
    "import(\"@packages/types\").OptimizationFocus",
    "OptimizationFocus",
)
src = src.replace(
    "import(\"@packages/types\").DemoDuration",
    "DemoDuration",
)
# Also clean up the `useState<import("...").X>` wrapper
src = re.sub(
    r"useState<\s*import\(\"@packages/types\"\)\.ArtisticDirection\s*>",
    "useState<ArtisticDirection>",
    src,
)
src = re.sub(
    r"useState<\s*import\(\"@packages/types\"\)\.OptimizationFocus\s*>",
    "useState<OptimizationFocus>",
    src,
)
src = re.sub(
    r"useState<\s*import\(\"@packages/types\"\)\.DemoDuration\s*>",
    "useState<DemoDuration>",
    src,
)

# 3e. Fix PartyEvent.year — PartyEvent has no year field. Use currentYear
#     for all upcoming parties (the calendar is already filtered by month).
src = src.replace(
    "          year: p.year,\n",
    "          year: currentYear,\n",
)

# 3f. Fix MusicFile.sizeBytes → size
src = src.replace("track.sizeBytes", "track.size")

# 3g. Fix overallScore references in the news-feed / research-points block
#     (lines ~1438, 1464). These were the old variable name; the new
#     finishCompilation uses `finalOverall` locally. Wrap the summary in
#     a local var so those references resolve.
# Find the start of finishCompilation and inject `const overallScore = finalOverall;`
# right after the `setLastDemoSummary` line so the downstream code that
# references `overallScore` still works.
OLD_FC_TAIL = (
    "    setLastDemoSummary(summaryWithProd);\n"
    "    setShowDemoSummary(true);"
)
NEW_FC_TAIL = (
    "    setLastDemoSummary(summaryWithProd);\n"
    "    setShowDemoSummary(true);\n"
    "    // Local alias for downstream code (news-feed / research-points)\n"
    "    // that still references the old `overallScore` variable name.\n"
    "    var overallScore = finalOverall;"
)
assert OLD_FC_TAIL in src, "Could not find finishCompilation tail anchor"
src = src.replace(OLD_FC_TAIL, NEW_FC_TAIL)

APP_TS.write_text(src, encoding="utf-8")
print("OK: fixed App.tsx imports, type annotations, PartyEvent.year, MusicFile.size, overallScore alias")
