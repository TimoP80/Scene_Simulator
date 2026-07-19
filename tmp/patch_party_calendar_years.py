"""
Add `year: number` to every PARTY_CALENDAR entry. Derive the year from:
  1. The party id (e.g. "copy_party_1989" → 1989, "mekka_1998" → 1998)
  2. Fall back to platformFocus (c64 → 1985, amiga → 1990, pc → 1996, all → 1990)
"""

import re
from pathlib import Path

CAL = Path("sim/data/partyCalendar.ts")
src = CAL.read_text(encoding="utf-8")

# Platform focus → default year fallback
FOCUS_YEAR = {
    "c64": 1987,
    "amiga": 1992,
    "pc": 1998,
    "all": 1992,
}

# Try to extract year from id, e.g. "copy_party_1989" → 1989
def year_for_entry(entry_text: str) -> int | None:
    id_match = re.search(r'id:\s*"([^"]+)"', entry_text)
    if id_match:
        # Look for a 4-digit year in the id
        year_m = re.search(r"(\d{4})", id_match.group(1))
        if year_m:
            return int(year_m.group(1))
    # Fall back to platformFocus
    pf_match = re.search(r'platformFocus:\s*"(\w+)"', entry_text)
    if pf_match:
        return FOCUS_YEAR.get(pf_match.group(1), 1990)
    return 1990

# Process each entry. Entries are top-level objects in the PARTY_CALENDAR array.
# We split on the opening brace of each entry and insert `year: N,` after `id: "..."`.

# Use a stateful pass: find each `id: "..."` followed by `name: "..."` and
# insert `year: N,` right after the `name: "..."` line.
def patch_entry(match: re.Match) -> str:
    entry = match.group(0)
    if "year:" in entry:
        return entry  # already patched
    year = year_for_entry(entry)
    # Insert `year: YYYY,` right after the `name: "..."` line
    return re.sub(
        r'(name:\s*"[^"]+",\n)',
        lambda m: m.group(1) + f"    year: {year},\n",
        entry,
        count=1,
    )

# Match each top-level entry: starts with `{` at indent level 2 and ends with `}`
# before the next entry or the closing `]`.
entry_pattern = re.compile(
    r"  \{\n(?:    [^\n]*\n)+?  \}",
    re.MULTILINE,
)

new_src = entry_pattern.sub(patch_entry, src)

if new_src != src:
    CAL.write_text(new_src, encoding="utf-8")
    years = re.findall(r"year: (\d+)", new_src)
    print(f"OK: patched {len(years)} entries with years (range {min(years)}-{max(years)})")
else:
    print("WARN: no entries were patched")
