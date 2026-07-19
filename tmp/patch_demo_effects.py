#!/usr/bin/env python3
"""Patch sim/data/demoEffects.ts to add the new expanded-metadata fields
to every entry. The new fields are:
  - complexity: number
  - visualImpact: number
  - compatiblePlatforms: PlatformId[]
  - synergyTags: string[]
  - researchRequired: boolean
"""

import re
import sys
from pathlib import Path

PATH = Path("sim/data/demoEffects.ts")
src = PATH.read_text(encoding="utf-8")

# ---- Step 1: prepend the platform-shorthand constants --------------------
old_imports = (
    "import { DemoEffect, EraId, PlatformId } from \"@packages/types\";\n"
    "\n"
    "export const DEMO_EFFECTS: DemoEffect[] = ["
)
new_imports = (
    "import { DemoEffect, EraId, PlatformId } from \"@packages/types\";\n"
    "\n"
    "/** A shorthand: \"every modern PC platform\" for shader-era effects. */\n"
    "const PC_DAWN_PLUS: PlatformId[] = [\n"
    "  PlatformId.PC_386,\n"
    "  PlatformId.PC_486,\n"
    "  PlatformId.PC_PENTIUM,\n"
    "  PlatformId.PC_PENTIUM_II,\n"
    "  PlatformId.PC_PENTIUM_III,\n"
    "];\n"
    "const PC_PENTIUM_PLUS: PlatformId[] = [\n"
    "  PlatformId.PC_PENTIUM,\n"
    "  PlatformId.PC_PENTIUM_II,\n"
    "  PlatformId.PC_PENTIUM_III,\n"
    "];\n"
    "const PC_PII_PLUS: PlatformId[] = [PlatformId.PC_PENTIUM_II, PlatformId.PC_PENTIUM_III];\n"
    "const PC_PIII: PlatformId[] = [PlatformId.PC_PENTIUM_III];\n"
    "const AMIGA_ALL: PlatformId[] = [PlatformId.AMIGA_500, PlatformId.AMIGA_1200];\n"
    "const AMIGA_ST: PlatformId[] = [PlatformId.AMIGA_500, PlatformId.AMIGA_1200, PlatformId.ATARI_ST];\n"
    "const C64_ZX: PlatformId[] = [PlatformId.C64, PlatformId.ZX_SPECTRUM];\n"
    "\n"
    "export const DEMO_EFFECTS: DemoEffect[] = ["
)
if old_imports not in src:
    print("ABORT: imports anchor not found", file=sys.stderr)
    sys.exit(1)
src = src.replace(old_imports, new_imports, 1)
print("  [OK] Prepended platform-shorthand constants")

# ---- Step 2: patch every effect entry ----------------------------------
# We do this by finding each {...} block ending with `description: "..."`
# and inserting the new fields just before the closing brace.
# Use a regex to find each effect object.

# Per-id patch map: id -> (complexity, visualImpact, compatiblePlatforms, synergyTags, researchRequired)
PATCH = {
    "raster_bars":       (15, 55, "C64_ZX",                        ["raster", "copper", "palette"], False),
    "sine_scroller":     (22, 45, "C64_ZX",                        ["trig", "easing", "palette"], False),
    "starfield_2d":      (12, 50, "C64_ZX",                        ["vector", "parallax", "asm"], False),
    "twister":           (55, 72, "AMIGA_ST",                       ["blitter", "palette", "copper"], True),
    "animated_plasma":   (40, 70, "AMIGA_ALL",                      ["trig", "palette", "procedural"], False),
    "vector_cube":       (45, 58, "AMIGA_ALL",                      ["vector", "fixed-point", "asm"], True),
    "pixel_fire":        (28, 68, "PC_DAWN_PLUS",                   ["procedural", "palette"], False),
    "chunky_to_planar":  (60, 30, "[PlatformId.AMIGA_1200, PlatformId.AMIGA_500]", ["blitter", "asm", "cycle-exact"], True),
    "texture_mapper":    (70, 80, "PC_DAWN_PLUS",                   ["vector", "fixed-point"], True),
    "tunnel_effect":     (38, 76, "PC_DAWN_PLUS",                   ["trig", "palette", "procedural"], True),
    "voxel_hills":       (78, 88, "PC_DAWN_PLUS",                   ["raycast", "heightfield", "fixed-point"], True),
    "gouraud_shading":    (60, 70, "PC_DAWN_PLUS",                   ["vector", "fixed-point"], True),
    "metaballs_2d":      (45, 72, "PC_DAWN_PLUS",                   ["procedural", "palette", "novel"], True),
    "fractal_renderer":  (55, 80, "PC_PENTIUM_PLUS",                ["procedural", "sdf", "novel"], True),
    "raymarching_3d":    (95, 96, "PC_PIII",                        ["sdf", "procedural", "novel"], True),
    "procedural_synth":  (85, 20, "PC_PII_PLUS",                    ["procedural-audio", "sync", "asm"], True),
    "cloth_physics":     (78, 80, "PC_PII_PLUS",                    ["vector", "fixed-point", "physics"], True),
}

# Regex to find each effect object: starts with `    {\n    id: "..."`
# and ends with `    }` at the same indent level.
entry_re = re.compile(
    r'    \{\n        id: "([^"]+)",\n(.*?)\n    \},',
    re.DOTALL,
)

def patch_entry(match: re.Match) -> str:
    eid = match.group(1)
    body = match.group(2)
    if eid not in PATCH:
        print(f"  [WARN] no patch defined for {eid}", file=sys.stderr)
        return match.group(0)
    complexity, visualImpact, compatPlatforms, synergyTags, researchRequired = PATCH[eid]
    new_fields = (
        f"\n        complexity: {complexity}, visualImpact: {visualImpact},\n"
        f"        compatiblePlatforms: {compatPlatforms},\n"
        f"        synergyTags: [{', '.join(repr(t) for t in synergyTags)}],\n"
        f"        researchRequired: {'true' if researchRequired else 'false'},"
    )
    # Insert just before the final description line for readability.
    # The body ends with `        description: "..."`.
    new_body = re.sub(
        r'(\n        description: "[^"]*",?)$',
        new_fields + r"\1",
        body,
        count=1,
    )
    return f'    {{\n        id: "{eid}",\n{new_body}\n    }},'

src, n = entry_re.subn(patch_entry, src)
print(f"  [OK] Patched {n} effect entries")

# ---- Write back --------------------------------------------------------
PATH.write_text(src, encoding="utf-8")
print(f"\nAll edits applied. {len(src.splitlines())} lines total.")
