#!/usr/bin/env python3
"""Remove the duplicate generateDemoSummary block at the end of
scoring.ts (it was appended by the previous fix script, but the
str_replace earlier in the conversation also added one inline near
applyDevelopmentTime, so now there are two). Also fix the import line
so `DemoSummary` is in scope."""

import re
import sys
from pathlib import Path

PATH = Path("sim/domain/scoring.ts")
src = PATH.read_text(encoding="utf-8")
original = src

# ---- 1. Import DemoSummary --------------------------------------------
# The import block is:
#   import type {
#     ArtisticDirection,
#     CompetitionPrediction,
#     DemoCreationInput,
#     DemoEffect,
#     DemoAward,
#     JudgingProfile,
#     PlatformId,
#     ScoreBreakdown,
#   } from "@packages/types";
old_import = (
    "import type {\n"
    "  ArtisticDirection,\n"
    "  CompetitionPrediction,\n"
    "  DemoCreationInput,\n"
    "  DemoEffect,\n"
    "  DemoAward,\n"
    "  JudgingProfile,\n"
    "  PlatformId,\n"
    "  ScoreBreakdown,\n"
    "} from \"@packages/types\";"
)
new_import = (
    "import type {\n"
    "  ArtisticDirection,\n"
    "  CompetitionPrediction,\n"
    "  DemoAward,\n"
    "  DemoCreationInput,\n"
    "  DemoEffect,\n"
    "  DemoSummary,\n"
    "  JudgingProfile,\n"
    "  PlatformId,\n"
    "  ScoreBreakdown,\n"
    "} from \"@packages/types\";"
)
if old_import in src:
    src = src.replace(old_import, new_import, 1)
    print("  [OK] Added DemoSummary to imports")
else:
    # Maybe the ordering is different; try a fuzzy check.
    if "DemoSummary" in src[:800]:
        print("  [SKIP] DemoSummary already imported")
    else:
        print("ABORT: import block not found", file=sys.stderr)
        sys.exit(1)

# ---- 2. Remove the appended duplicate generateDemoSummary ------------
# The appendix starts after the last `}` of the file. We'll find the
# marker "// Top-level summary builder" and remove from that line to
# the end of the file.
marker = "// ---------------------------------------------------------------------------"
# Find the LAST occurrence of the marker, then find the next "// ---" before
# "Top-level summary builder".
idx = src.find("// Top-level summary builder")
if idx < 0:
    print("  [SKIP] No appended duplicate to remove")
else:
    # Walk backwards to find the start of the duplicate block.
    start = src.rfind(marker, 0, idx)
    if start < 0:
        start = idx
    # Find the end of the file (or the end of the duplicate block).
    # The duplicate ends with the compatibleEffects function's closing
    # brace + the file end.
    end = len(src)
    # Trim trailing whitespace after the duplicate.
    truncated = src[:start].rstrip() + "\n"
    src = truncated
    print("  [OK] Removed appended duplicate generateDemoSummary block")

# ---- Write back --------------------------------------------------------
if src == original:
    print("ABORT: no changes made", file=sys.stderr)
    sys.exit(1)
PATH.write_text(src, encoding="utf-8")
print(f"\nAll edits applied. {len(src.splitlines())} lines total.")
