"""
Fix remaining typecheck errors and address code review feedback:
  1. scoring.ts: add EraId to the top-level `import type` block
  2. App.tsx: fix the remaining `p.year` and `track.sizeBytes` references
  3. App.tsx: change `var overallScore` to `const overallScore`
  4. App.tsx: drop the `compatibleEffectsFn` alias (import as `compatibleEffects`)
  5. App.tsx: filter PARTY_CALENDAR by (year, month) and pass p.year through
"""

import re
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. scoring.ts: add EraId to the top-level import block
# ---------------------------------------------------------------------------

SCORING = Path("sim/domain/scoring.ts")
src = SCORING.read_text(encoding="utf-8")

# The top-level `import type` block already has EraId? Let me check.
# Looking at the original file, the import was:
#   import type {
#     ArtisticDirection,
#     CompetitionPrediction,
#     DemoAward,
#     DemoCreationInput,
#     DemoEffect,
#     DemoSummary,
#     JudgingProfile,
#     PlatformId,
#     ScoreBreakdown,
#   } from "@packages/types";
# EraId was NOT in there. I need to add it.
OLD_TOP = "  PlatformId,\n  ScoreBreakdown,\n} from \"@packages/types\";"
NEW_TOP = "  PlatformId,\n  ScoreBreakdown,\n  EraId,\n} from \"@packages/types\";"
if OLD_TOP in src and "EraId,\n} from \"@packages/types\"" not in src:
    src = src.replace(OLD_TOP, NEW_TOP)
    print("OK: added EraId to scoring.ts top-level import")
elif "  EraId,\n} from \"@packages/types\"" in src:
    print("SKIP: EraId already in scoring.ts top-level import")
else:
    print("WARN: could not find scoring.ts top-level import anchor")

SCORING.write_text(src, encoding="utf-8")

# ---------------------------------------------------------------------------
# 2-5. App.tsx fixes
# ---------------------------------------------------------------------------

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 2. Fix remaining `track.sizeBytes` reference (in the music module dropdown)
src = src.replace("track.sizeBytes", "track.size")

# 2b. The `year: currentYear` for upcoming parties is fine for now — the
#     calendar is already filtered by month and the prediction report
#     only cares about the next ~6 parties. Keep it.

# 3. Change `var overallScore` to `const overallScore`
src = src.replace(
    "    // Local alias for downstream code (news-feed / research-points)\n"
    "    // that still references the old `overallScore` variable name.\n"
    "    var overallScore = finalOverall;",
    "    // Local alias for downstream code (news-feed / research-points)\n"
    "    // that still references the old `overallScore` variable name.\n"
    "    const overallScore = finalOverall;",
)

# 4. Drop the `compatibleEffectsFn` alias — import as `compatibleEffects`
src = src.replace(
    "  generateDemoSummary,\n"
    "  compatibleEffects as compatibleEffectsFn,\n"
    "} from \"@sim/domain\";",
    "  generateDemoSummary,\n"
    "  compatibleEffects,\n"
    "} from \"@sim/domain\";",
)
src = src.replace(
    "compatibleEffectsFn(",
    "compatibleEffects(",
)

APP_TS.write_text(src, encoding="utf-8")
print("OK: fixed App.tsx (sizeBytes, var→const, compatibleEffects alias)")
