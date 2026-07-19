"""
Wire the dev tools into App.tsx and create the seed JSON data files.

Steps:
  1. Extract INITIAL_NPCS from sim/data/initialNpcs.ts and write to
     /data/sceners.json (stripping the `cognitive` field which is
     runtime state, not seed data).
  2. Create an empty /data/bbs_threads.json (BBS threads are generated
     at runtime from the BBS message seed, not pre-authored).
  3. Create empty stubs for the other content types so the loader
     doesn't 404 on them.
  4. Wire DevModeProvider and DevMenu into App.tsx (wrap the existing
     app content, load base content on mount, mount DevMenu at the
     end of the main return).
"""

import re
import json
from pathlib import Path

# ---------------------------------------------------------------------------
# 1. Extract INITIAL_NPCS to /data/sceners.json
# ---------------------------------------------------------------------------

NPCS_TS = Path("sim/data/initialNpcs.ts")
src = NPCS_TS.read_text(encoding="utf-8")

# The file looks like:
#   export const INITIAL_NPCS: Record<string, Character> = {
#     "id_1": { id: "id_1", name: "...", ... },
#     "id_2": { id: "id_2", name: "...", ... },
#   };
#
# We'll do a simple line-by-line parse: find the opening brace after
# the export, then track brace depth to find the matching close.

m = re.search(r"export const INITIAL_NPCS:[^{]*\{", src)
if not m:
    raise SystemExit("Could not find INITIAL_NPCS opening brace")

start = m.end() - 1  # position of the opening {
depth = 0
end = start
for i in range(start, len(src)):
    c = src[i]
    if c == "{":
        depth += 1
    elif c == "}":
        depth -= 1
        if depth == 0:
            end = i + 1
            break

body = src[start:end]

# Now convert the TS object literal to a JSON object. The main
# differences:
#   - Keys can be unquoted: "id_1": { ... } is fine in TS
#   - String values can be single-quoted: 'John' → "John"
#   - Trailing commas are OK

# Step 1: wrap unquoted keys in quotes
# Match: word followed by colon, at start of line or after whitespace/comma/{
json_body = re.sub(
    r'([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)\s*:',
    r'\1"\2":',
    body,
)
# Step 2: replace single-quoted strings with double-quoted
# This is a naive replacement — works for the seed data which doesn't
# contain escaped single quotes inside strings.
json_body = json_body.replace("'", '"')
# Step 3: remove trailing commas before } or ]
json_body = re.sub(r",\s*([}\]])", r"\1", json_body)

# Parse and re-serialize to get clean indentation
try:
    parsed = json.loads(json_body)
except json.JSONDecodeError as e:
    raise SystemExit(f"Failed to parse NPC data: {e}\n\nBody:\n{json_body[:500]}")

# Strip runtime-only fields (cognitive, status that's specific to a
# given moment) so the JSON file represents pure seed data.
for char_id, char in parsed.items():
    # Remove cognitive model (runtime memory)
    char.pop("cognitive", None)
    # Keep status as-is — it's part of the seed (idle for new NPCs)

DATA = Path("data")
DATA.mkdir(exist_ok=True)
sceners_path = DATA / "sceners.json"
sceners_path.write_text(
    json.dumps(parsed, indent=2, ensure_ascii=False) + "\n",
    encoding="utf-8",
)
print(f"OK: wrote {len(parsed)} sceners to {sceners_path}")

# ---------------------------------------------------------------------------
# 2. Create empty /data/bbs_threads.json
# ---------------------------------------------------------------------------

bbs_path = DATA / "bbs_threads.json"
bbs_path.write_text("{}\n", encoding="utf-8")
print(f"OK: wrote empty bbs_threads.json")

# ---------------------------------------------------------------------------
# 3. Create empty stubs for the other content types
# ---------------------------------------------------------------------------

for name in ["groups", "effects", "research", "parties", "productions"]:
    p = DATA / f"{name}.json"
    if not p.exists():
        p.write_text("{}\n", encoding="utf-8")
        print(f"OK: wrote empty {name}.json")

# ---------------------------------------------------------------------------
# 4. Wire DevModeProvider and DevMenu into App.tsx
# ---------------------------------------------------------------------------

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 4a. Add imports for DevModeProvider + DevMenu right after the
#     PlaylistManager import.
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

# 4b. Wrap the main return in DevModeProvider and mount DevMenu.
#     The main return is the final `return ( <div ...>...</div> );`
#     at the end of App. We need to:
#       1. Wrap the return value in <DevModeProvider>
#       2. Mount <DevMenu /> at the end (before the closing </div>)

# Find the last `return (` in the component and the matching `);`.
# The simplest approach: find the last occurrence of the MusicPlayer +
# PlaylistManager + DemoSummaryModal block, and insert DevMenu after it.

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

# 4c. Wrap the main return in DevModeProvider. The main return starts
#     with the header and is the only `return (` in the App component.
#     Find the opening of the return and insert the wrapper.
#     We look for the first <div className="min-h-screen ..."> which
#     is the root of the main UI.

# Actually, the simplest approach: find the line with the main return
# statement. It's typically just `return (`.
# We use a heuristic: find the last `return (` in the function body
# and wrap the return value.

# Better approach: find the closing of the component's return JSX and
# wrap the return statement. Since the component ends with
# `  );\n}` and the return JSX ends with `</div>\n  );`, we can
# find the pattern and wrap.

# The main return is: `return (\n    <div className="min-h-screen ...`
# We insert the wrapper just before the `return (`.

# Use the closing pattern of the main return.
ROOT_DIV_START = src.find('    <div className="min-h-screen')
if ROOT_DIV_START == -1:
    # Try alternate patterns
    ROOT_DIV_START = src.find('    <div className={\n      "min-h-screen')
if ROOT_DIV_START == -1:
    raise SystemExit("Could not find root div of main return")

# Find the line containing this position
return_line_start = src.rfind("\n  return (", 0, ROOT_DIV_START)
if return_line_start == -1:
    # Try: maybe the return is just `return (`
    return_line_start = src.rfind("return (", 0, ROOT_DIV_START)
if return_line_start == -1:
    raise SystemExit("Could not find return statement")

# The return statement starts at the line beginning. We insert the
# wrapper to return:
#   return (
#     <DevModeProvider>
#       <div ...>...</div>
#     </DevModeProvider>
#   );

# Find the start of the line containing `return (`
line_start = src.rfind("\n", 0, return_line_start) + 1

# Insert "  return (\n    <DevModeProvider>\n" just before the return
# Actually simpler: replace `return (` with `return (\n    <DevModeProvider>`
# and the matching `);` with `);\n  });`.

# We do a targeted find: the LAST `return (` in the file should be
# the main return.
last_return = src.rfind("  return (")
if last_return == -1:
    raise SystemExit("Could not find last return statement")

# Insert the wrapper. The return is:
#   return (
#     <div className="min-h-screen ...">
#       ...
#     </div>
#   );
#
# We transform to:
#   return (
#     <DevModeProvider>
#       <div className="min-h-screen ...">
#         ...
#       </div>
#     </DevModeProvider>
#   );

# Simpler: wrap the entire return JSX in DevModeProvider by replacing
# the opening `<div` and closing `</div>` of the root.
src = src[:last_return] + "  return (\n    <DevModeProvider>\n" + src[last_return + len("  return ("):]

# Find the matching closing `);` for this return. It's the last `);`
# in the file (before the final `}` of the function).
# We look for the pattern `</div>\n  );\n}` near the end.
END_PATTERN = "      </footer>\n    </div>\n  );\n}"
END_REPLACEMENT = "      </footer>\n    </div>\n    </DevModeProvider>\n  );\n}"
if END_PATTERN not in src:
    # Try without the </footer>
    END_PATTERN = "    </div>\n  );\n}"
    END_REPLACEMENT = "    </DevModeProvider>\n  );\n}"
if END_PATTERN not in src:
    raise SystemExit("Could not find end of main return")
src = src.replace(END_PATTERN, END_REPLACEMENT, 1)  # only first occurrence

# 4d. Add a useEffect to load base content on mount. We add it right
#     after the existing useEffect for the simulation loop.

# Find a good anchor: the line with `setSaveNotice` (which is near
# the other useEffects in the component body).
OLD_USEEFFECT = (
    "  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 =====\n"
    "  // Sim-loop bootstrap per docs/architecture.md + docs/event-sourcing.md."
)
NEW_USEEFFECT = (
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
    "  // ===== SENTINEL: SIM_LOOP_BOOTSTRAP_V1 =====\n"
    "  // Sim-loop bootstrap per docs/architecture.md + docs/event-sourcing.md."
)
if OLD_USEEFFECT not in src:
    raise SystemExit("Could not find useEffect anchor for content loading")
src = src.replace(OLD_USEEFFECT, NEW_USEEFFECT)

APP_TS.write_text(src, encoding="utf-8")
print("OK: wired DevModeProvider, DevMenu, and content loading into App.tsx")
