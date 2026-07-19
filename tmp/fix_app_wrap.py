"""
Fix the broken DevModeProvider wrap in App.tsx.

The previous script used `rfind("  return (")` which found a return
statement that wasn't the main one. The main return is the one that
returns the root `<div className="min-h-screen ...">` (line ~3196).

Strategy:
  1. Find all `<DevModeProvider>` and `</DevModeProvider>` lines in
     the file. The opening tag was placed at the wrong spot; the
     closing tag is at the correct end of the main return.
  2. Remove the incorrect opening tag.
  3. Insert a new opening tag right after the main `return (` at
     line ~3196 (the one that returns the root min-h-screen div).
"""

import re
from pathlib import Path

APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")

# 1. Find all <DevModeProvider> lines and remove them. The closing
#    tag at the end of the file is correct, so we only remove the
#    opening tags.
lines = src.split("\n")
new_lines = []
removed = 0
for line in lines:
    # Match standalone <DevModeProvider> tags (not the import or the
    # closing tag).
    if re.match(r"^\s*<DevModeProvider>\s*$", line):
        removed += 1
        continue
    new_lines.append(line)

print(f"Removed {removed} incorrect <DevModeProvider> opening tag(s)")
src = "\n".join(new_lines)

# 2. Insert the opening tag at the correct location: right after the
#    main `return (` that returns the root `<div className="min-h-screen ...">`.
#    The unique anchor is the root div with the min-h-screen class.
ANCHOR = '    <div className="min-h-screen'
if ANCHOR not in src:
    raise SystemExit(f"Could not find main return anchor: {ANCHOR}")

# Insert `<DevModeProvider>` on the line before the root div.
src = src.replace(
    ANCHOR,
    "    <DevModeProvider>\n" + ANCHOR,
    1,  # only the first occurrence
)
print("OK: inserted <DevModeProvider> before the root min-h-screen div")

APP_TS.write_text(src, encoding="utf-8")
print("OK: fixed DevModeProvider wrap")
