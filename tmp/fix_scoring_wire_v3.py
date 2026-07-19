"""
Fix the last typecheck errors:
  1. scoring.ts: move EraId out of `import type` to a value import
     (enums don't work well with `import type` in all TS configs)
  2. App.tsx: fix remaining `p.year` and `track.sizeBytes` references
  3. App.tsx: move `const overallScore` to the top of finishCompilation
"""

from pathlib import Path

# ---------------------------------------------------------------------------
# 1. scoring.ts: EraId must be a value import
# ---------------------------------------------------------------------------

SCORING = Path("sim/domain/scoring.ts")
src = SCORING.read_text(encoding="utf-8")

# Remove EraId from the `import type` block and add a separate value import.
OLD = "  PlatformId,\n  ScoreBreakdown,\n  EraId,\n} from \"@packages/types\";"
NEW = "  PlatformId,\n  ScoreBreakdown,\n} from \"@packages/types\";\nimport { EraId } from \"@packages/types\";"
if OLD in src:
    src = src.replace(OLD, NEW)
    print("OK: moved EraId to value import in scoring.ts")
else:
    print("WARN: could not find EraId in scoring.ts import type block")

SCORING.write_text(src, encoding="utf-8")

# ---------------------------------------------------------------------------
# 2-3. App.tsx: fix remaining references + move const overallScore
# ---------------------------------------------------------------------------

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 2a. Fix any remaining `p.year` references (line 1164 area)
# The earlier fix replaced `p.year` with `currentYear` but the replacement
# string had a trailing newline. Let me do a more robust replace.
import re
# Replace any `year: p.year,` with `year: currentYear,`
src = re.sub(r"year:\s*p\.year,", "year: currentYear,", src)

# 2b. Fix any remaining `track.sizeBytes` references (line 3705 area)
# The music module dropdown has a second reference: the display string
# `(t.sizeBytes / 1024).toFixed(1)}KB`
src = re.sub(r"track\.sizeBytes", "track.size", src)
src = re.sub(r"t\.sizeBytes", "t.size", src)

# 3. Move `const overallScore` to the top of finishCompilation
# Currently it's after the state setters. Move it next to `finalOverall`.
OLD_TAIL = (
    "    setLastDemoSummary(summaryWithProd);\n"
    "    setShowDemoSummary(true);\n"
    "    // Local alias for downstream code (news-feed / research-points)\n"
    "    // that still references the old `overallScore` variable name.\n"
    "    const overallScore = finalOverall;"
)
NEW_TAIL = (
    "    setLastDemoSummary(summaryWithProd);\n"
    "    setShowDemoSummary(true);"
)
if OLD_TAIL in src:
    src = src.replace(OLD_TAIL, NEW_TAIL)
    print("OK: removed trailing const overallScore from finishCompilation")
else:
    print("WARN: could not find finishCompilation tail anchor")

# Add `const overallScore = finalOverall;` right after `finalOverall` is defined.
OLD_FINAL = (
    "    const reputationIncrement = Math.floor(finalOverall / 3);\n"
    "\n"
    "    const newProd: Production = {"
)
NEW_FINAL = (
    "    const reputationIncrement = Math.floor(finalOverall / 3);\n"
    "    // Alias for downstream news-feed / research-points code that\n"
    "    // still references the old `overallScore` variable name.\n"
    "    const overallScore = finalOverall;\n"
    "\n"
    "    const newProd: Production = {"
)
if OLD_FINAL in src:
    src = src.replace(OLD_FINAL, NEW_FINAL)
    print("OK: moved const overallScore to top of finishCompilation")
else:
    print("WARN: could not find finalOverall anchor")

APP_TS.write_text(src, encoding="utf-8")
print("OK: fixed remaining App.tsx references")
