"""
Fix the z.nativeEnum() regression: revert the three string-union
schemas (BBSInfoType, CharacterStatus, CharacterRole) back to
z.enum([...]) with the correct values, and clean up the unused
imports. The four that ARE real TypeScript enums stay as
z.nativeEnum().

Also fix TechBonusType — it may not exist as an enum, so revert
that too to z.enum([...]).
"""

from pathlib import Path

SCHEMA = Path("src/content/schema.ts")
src = SCHEMA.read_text(encoding="utf-8")

# 1. Remove the enum imports that don't exist or are string unions
#    (only keep PlatformId, EraId, SpecialtyType, DemoEffectCategory,
#    ProductionType which are real enums).
OLD_IMPORT = """import {
  PlatformId,
  EraId,
  SpecialtyType,
  CharacterStatus,
  CharacterRole,
  DemoEffectCategory,
  ProductionType,
  BBSInfoType,
  TechBonusType,
} from "@packages/types";"""
NEW_IMPORT = """import {
  PlatformId,
  EraId,
  SpecialtyType,
  DemoEffectCategory,
  ProductionType,
} from "@packages/types";"""
if OLD_IMPORT in src:
    src = src.replace(OLD_IMPORT, NEW_IMPORT)
    print("OK: cleaned up enum imports (removed string-union enums)")
else:
    print("WARN: import anchor not found, trying alternate")
    # Try with different formatting
    import re
    m = re.search(
        r'import \{[^}]*\} from "@packages/types";',
        src,
    )
    if m:
        block = m.group(0)
        # Remove the string-union enums
        for name in ["CharacterStatus", "CharacterRole", "BBSInfoType", "TechBonusType"]:
            block = re.sub(rf"\s*{name},?\n", "\n", block)
        src = src.replace(m.group(0), block)
        print("OK: cleaned up enum imports (regex fallback)")
    else:
        print("ERROR: could not find import block")

# 2. Revert BBSInfoTypeSchema to z.enum (string union, not enum)
OLD_BBS = "export const BBSInfoTypeSchema = z.nativeEnum(BBSInfoType);"
NEW_BBS = """export const BBSInfoTypeSchema = z.enum([
  "rumor",
  "leak",
  "technical_discovery",
  "demo_announcement",
  "party_gossip",
  "tool_release",
  "criticism",
]);"""
if OLD_BBS in src:
    src = src.replace(OLD_BBS, NEW_BBS)
    print("OK: reverted BBSInfoTypeSchema to z.enum")
else:
    # Maybe it's still the old hand-written version
    if 'z.enum([\n  "rumor",' in src:
        print("SKIP: BBSInfoTypeSchema already z.enum")
    else:
        print("WARN: BBSInfoTypeSchema anchor not found")

# 3. Revert CharacterStatusSchema
OLD_STATUS = "export const CharacterStatusSchema = z.nativeEnum(CharacterStatus);"
NEW_STATUS = """export const CharacterStatusSchema = z.enum([
  "idle",
  "coding",
  "arranging",
  "drawing",
  "burnt_out",
  "retired",
]);"""
if OLD_STATUS in src:
    src = src.replace(OLD_STATUS, NEW_STATUS)
    print("OK: reverted CharacterStatusSchema to z.enum")
else:
    if 'z.enum([\n  "idle",' in src:
        print("SKIP: CharacterStatusSchema already z.enum")
    else:
        print("WARN: CharacterStatusSchema anchor not found")

# 4. Revert CharacterRoleSchema
OLD_ROLE = "export const CharacterRoleSchema = z.nativeEnum(CharacterRole);"
NEW_ROLE = """export const CharacterRoleSchema = z.enum([
  "player",
  "crew",
  "scene_npc",
]);"""
if OLD_ROLE in src:
    src = src.replace(OLD_ROLE, NEW_ROLE)
    print("OK: reverted CharacterRoleSchema to z.enum")
else:
    if 'z.enum(["player", "crew", "scene_npc"])' in src:
        print("SKIP: CharacterRoleSchema already z.enum")
    else:
        print("WARN: CharacterRoleSchema anchor not found")

# 5. Revert TechBonusAttribute.type (TechBonusType doesn't exist as an enum)
OLD_BONUS = "  type: z.nativeEnum(TechBonusType),"
NEW_BONUS = '  type: z.enum(["coding", "music", "graphics", "size_reduction", "optimization"]),'
if OLD_BONUS in src:
    src = src.replace(OLD_BONUS, NEW_BONUS)
    print("OK: reverted TechBonusAttribute.type to z.enum")
else:
    if 'z.enum(["coding", "music", "graphics", "size_reduction", "optimization"])' in src:
        print("SKIP: TechBonusAttribute.type already z.enum")
    else:
        print("WARN: TechBonusAttribute.type anchor not found")

SCHEMA.write_text(src, encoding="utf-8")
print("\nOK: regression fixed")
