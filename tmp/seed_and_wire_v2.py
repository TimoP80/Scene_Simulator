"""
Create empty JSON content files and wire dev tools into App.tsx.

The ContentLoader has a fallback to @sim/data static seeds, so empty
JSON files are fine — the game will load static data if /data/ is
empty or missing. The user (or a future migration script) can populate
the JSON files incrementally.
"""

import re
import json
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Create empty data files
# ---------------------------------------------------------------------------

DATA = Path("data")
DATA.mkdir(exist_ok=True)
for name in [
    "sceners",
    "groups",
    "effects",
    "research",
    "parties",
    "bbs_threads",
    "productions",
]:
    p = DATA / f"{name}.json"
    p.write_text("{}\n", encoding="utf-8")
    print(f"OK: wrote empty {p}")

# manifest.json was already created in an earlier step; leave it alone.

# ---------------------------------------------------------------------------
# 2. Wire DevModeProvider and DevMenu into App.tsx
# ---------------------------------------------------------------------------

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 2a. Add imports
OLD_IMPORT = (
    "import DemoSummaryModal from \"./components/DemoSummary\";\n"
    "import { useTrackerPlayer } from \"./hooks/useTrackerPlayer\";"
)
NEW_IMPORT = (
    "import DemoSummaryModal from \"./components/DemoSummary\";\n"
    "import { useTrackerPlayer } from \"./hooks/useTrackerPlayer\";\n"
    "import { DevModeProvider } from \"./devtools/DevModeContext\";\n"
    "import { DevMenu } from \"./devtools/DevMenu\";\n"
    "import { loadBaseContent } from \"./content/ContentLoader\";"
)
if OLD_IMPORT not in src:
    raise SystemExit("Could not find import anchor for dev tools")
src = src.replace(OLD_IMPORT, NEW_IMPORT)

# 2b. Mount <DevMenu /> after the DemoSummaryModal
OLD_FOOTER = (
    "      {/* Post-compile demo summary modal — shows the multi-category\n"
    "          score breakdown, triggered synergies, awards, and\n"
    "          competition predictions. Portal-rendered to document.body\n"
    "          so it sits above the floating music player. */}\n"
    "      <DemoSummaryModal\n"
    "        summary={lastDemoSummary}\n"
    "        open={showDemoSummary}\n"
    "        onClose={() => setShowDemoSummary(false)}\n"
    "      />\n"
    "\n"
    "      {/* Footer credits and references */}"
)
NEW_FOOTER = (
    "      {/* Post-compile demo summary modal — shows the multi-category\n"
    "          score breakdown, triggered synergies, awards, and\n"
    "          competition predictions. Portal-rendered to document.body\n"
    "          so it sits above the floating music player. */}\n"
    "      <DemoSummaryModal\n"
    "        summary={lastDemoSummary}\n"
    "        open={showDemoSummary}\n"
    "        onClose={() => setShowDemoSummary(false)}\n"
    "      />\n"
    "\n"
    "      {/* Developer Tools — only visible when dev mode is active\n"
    "          (set via ?dev=1 URL param or localStorage devMode flag). */}\n"
    "      <DevMenu />\n"
    "\n"
    "      {/* Footer credits and references */}"
)
if OLD_FOOTER not in src:
    raise SystemExit("Could not find footer anchor for DevMenu mount")
src = src.replace(OLD_FOOTER, NEW_FOOTER)

# 2c. Add a useEffect to load base content on mount. Insert just before
#     the SIM_LOOP_BOOTSTRAP sentinel.
OLD_SENTINEL = "  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 ====="
NEW_SENTINEL = (
    "  // ---- Dev tools: load base content from /data/ on mount ----\n"
    "  useEffect(() => {\n"
    "    loadBaseContent().then((result) => {\n"
    "      if (result.source === \"fallback\") {\n"
    "        console.info(\"[devtools] Using static fallback content (no /data/ JSON). Errors:\", result.errors);\n"
    "      } else if (result.errors.length > 0) {\n"
    "        console.warn(\"[devtools] Loaded content with warnings:\", result.errors);\n"
    "      } else {\n"
    "        console.info(\"[devtools] Loaded base content pack from /data/.\");\n"
    "      }\n"
    "    });\n"
    "  }, []);\n"
    "\n"
    "  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 ====="
)
if OLD_SENTINEL not in src:
    raise SystemExit("Could not find SIM_LOOP_BOOTSTRAP sentinel anchor")
src = src.replace(OLD_SENTINEL, NEW_SENTINEL)

# 2d. Wrap the main return in <DevModeProvider>. The main return is
#     the last `return (` in the file. We wrap by replacing the opening
#     and closing of the main JSX block.
last_return = src.rfind("  return (")
if last_return == -1:
    raise SystemExit("Could not find last return statement")

src = (
    src[:last_return]
    + "  return (\n    <DevModeProvider>\n"
    + src[last_return + len("  return ("):]
)

# Close the DevModeProvider before the final `);` of the return. The
# main JSX ends with `      </footer>\n    </div>\n  );\n}`. We
# insert `    </DevModeProvider>` before the `);`.
END_PATTERN = "    </div>\n  );\n}"
END_REPLACEMENT = "    </DevModeProvider>\n  );\n}"
if END_PATTERN not in src:
    raise SystemExit("Could not find end of main return")
src = src.replace(END_PATTERN, END_REPLACEMENT, 1)

APP_TS.write_text(src, encoding="utf-8")
print("OK: wired DevModeProvider, DevMenu, and content loading into App.tsx")
