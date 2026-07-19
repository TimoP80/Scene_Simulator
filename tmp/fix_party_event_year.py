"""
Final fix: add `year: number` to the PartyEvent interface and use `p.year`
in App.tsx (revert the `currentYear` simplification to preserve calendar data).
"""

from pathlib import Path

# 1. Add year field to PartyEvent
PARTY_TYPES = Path("packages/types/src/party.ts")
src = PARTY_TYPES.read_text(encoding="utf-8")

OLD = "  id: string;\n  name: string;\n  month: number; // 1 - 12"
NEW = "  id: string;\n  name: string;\n  year: number;\n  month: number; // 1 - 12"
if OLD in src:
    src = src.replace(OLD, NEW)
    PARTY_TYPES.write_text(src, encoding="utf-8")
    print("OK: added year field to PartyEvent")
else:
    print("WARN: could not find PartyEvent anchor")

# 2. Revert App.tsx `year: currentYear` back to `year: p.year`
APP_TS = Path("src/App.tsx")
src = APP_TS.read_text(encoding="utf-8")
src = src.replace("          year: currentYear,", "          year: p.year,")
APP_TS.write_text(src, encoding="utf-8")
print("OK: reverted year: currentYear to year: p.year in App.tsx")
