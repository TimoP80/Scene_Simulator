"""
Fix all hand-written z.enum schemas in src/content/schema.ts to use
z.nativeEnum(EnumType) so they stay in sync with the TypeScript enums
and can never drift again. This is a systemic fix that replaces the
entire class of schema-drift bugs.
"""

from pathlib import Path

SCHEMA = Path("src/content/schema.ts")
src = SCHEMA.read_text(encoding="utf-8")

# 1. Add the enum imports. The schemas already import PlatformId and
#    EraId, so we just need to add the rest.
OLD_IMPORT = (
    "import { PlatformId, EraId } from \"@packages/types\";"
)
NEW_IMPORT = (
    "import {\n"
    "  PlatformId,\n"
    "  EraId,\n"
    "  SpecialtyType,\n"
    "  CharacterStatus,\n"
    "  CharacterRole,\n"
    "  DemoEffectCategory,\n"
    "  ProductionType,\n"
    "  BBSInfoType,\n"
    "  TechBonusType,\n"
    "} from \"@packages/types\";"
)
# Only replace if the simple import is present (not the multi-line one)
if OLD_IMPORT in src and "SpecialtyType," not in src:
    src = src.replace(OLD_IMPORT, NEW_IMPORT)
    print("OK: added enum imports")
elif "SpecialtyType," in src:
    print("SKIP: enum imports already present")
else:
    print("WARN: import anchor not found, trying multi-line")
    # Try to add to the existing multi-line import
    OLD_MULTI = "import { z } from \"zod\";\nimport { PlatformId, EraId } from \"@packages/types\";"
    if OLD_MULTI in src and "SpecialtyType" not in src:
        src = src.replace(OLD_MULTI, OLD_MULTI + "\nimport {\n  SpecialtyType,\n  CharacterStatus,\n  CharacterRole,\n  DemoEffectCategory,\n  ProductionType,\n  BBSInfoType,\n  TechBonusType,\n} from \"@packages/types\";")
        print("OK: added enum imports (multi-line)")
    else:
        print("WARN: could not add imports")

# 2. Replace each hand-written z.enum with z.nativeEnum.
#    We use the enum's own values as the source of truth.

REPLACEMENTS = [
    # SpecialtyTypeSchema — already fixed, skip if correct
    # (we'll just leave it as z.nativeEnum to be safe)
    (
        'export const SpecialtyTypeSchema = z.enum([\n  "coder",\n  "artist",\n  "musician",\n  "organizer",\n  "all-rounder",\n]);',
        "export const SpecialtyTypeSchema = z.nativeEnum(SpecialtyType);",
    ),
    (
        'export const CharacterStatusSchema = z.enum([\n  "idle",\n  "coding",\n  "arranging",\n  "drawing",\n  "burnt_out",\n  "retired",\n]);',
        "export const CharacterStatusSchema = z.nativeEnum(CharacterStatus);",
    ),
    (
        'export const CharacterRoleSchema = z.enum(["player", "crew", "scene_npc"]);',
        "export const CharacterRoleSchema = z.nativeEnum(CharacterRole);",
    ),
    (
        'export const DemoEffectCategorySchema = z.enum([\n  "vector",\n  "raster",\n  "procedural",\n  "rendering",\n  "pixel_trick",\n]);',
        "export const DemoEffectCategorySchema = z.nativeEnum(DemoEffectCategory);",
    ),
    (
        'export const BBSInfoTypeSchema = z.enum([\n  "rumor",\n  "leak",\n  "technical_discovery",\n  "demo_announcement",\n  "party_gossip",\n  "tool_release",\n  "criticism",\n]);',
        "export const BBSInfoTypeSchema = z.nativeEnum(BBSInfoType);",
    ),
    (
        'export const ProductionTypeSchema = z.enum([\n  "Mega-Demo",\n  "64KB Intro",\n  "4KB Intro",\n  "Music Disk",\n  "Cracktro/Trainer",\n  "Slide Show",\n]);',
        "export const ProductionTypeSchema = z.nativeEnum(ProductionType);",
    ),
    # TechBonusType
    (
        '  type: z.enum(["coding", "music", "graphics", "size_reduction", "optimization"]),',
        "  type: z.nativeEnum(TechBonusType),",
    ),
    # PlatformId and EraId are already nativeEnum — but the schema uses
    # them differently. Check if they're hand-written:
    (
        "export const PlatformIdSchema = z.nativeEnum(PlatformId);",
        "export const PlatformIdSchema = z.nativeEnum(PlatformId);",  # noop, already correct
    ),
    (
        "export const EraIdSchema = z.nativeEnum(EraId);",
        "export const EraIdSchema = z.nativeEnum(EraId);",  # noop, already correct
    ),
    # party platformFocus uses an inline enum
    (
        'platformFocus: z.enum(["all", "amiga", "c64", "pc"]),',
        'platformFocus: z.enum(["all", "amiga", "c64", "pc"]),',  # no PartyEventPlatformFocus enum exists
    ),
]

applied = 0
for old, new in REPLACEMENTS:
    if old == new:
        continue  # noop
    if old in src:
        src = src.replace(old, new)
        applied += 1
        # Extract a short label for logging
        label = old.split("=")[0].strip().replace("export const ", "")
        print(f"  ✓ {label}")
    else:
        # The SpecialtyTypeSchema may have already been fixed
        if "z.nativeEnum(SpecialtyType)" in src and "z.enum([\n  \"coder\"" in old:
            print(f"  SKIP: {old[:50]}... already fixed")
        else:
            label = old.split("=")[0].strip().replace("export const ", "")[:40]
            print(f"  WARN: {label} anchor not found")

SCHEMA.write_text(src, encoding="utf-8")
print(f"\nApplied {applied} replacements")
