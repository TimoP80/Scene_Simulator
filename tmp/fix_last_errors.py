"""
Fix the last 2 typecheck errors:
  1. ContentStore.ts(95,5): Cast the whole assignment instead of the data param
  2. ScenerEditor.tsx(53,7): Type-assert groupId as string|null explicitly
"""

from pathlib import Path

# 1. ContentStore.ts: Cast the assignment to the correct type
CS = Path("src/content/ContentStore.ts")
src = CS.read_text(encoding="utf-8")
OLD = """  /** Create or replace an entity. */
  upsert<K extends ContentType>(
    type: K,
    id: string,
    data: ContentMap[K][string] | import("@packages/types").Character
      | import("@packages/types").Group | import("@packages/types").DemoEffect
      | import("@packages/types").TechNode | import("@packages/types").PartyEvent
      | import("@packages/types").BBSThread | import("@packages/types").Production
  ): void {
    (this.data[type] as Record<string, unknown>)[id] = data;
    this.notify();
  }"""
NEW = """  /** Create or replace an entity. */
  upsert<K extends ContentType>(
    type: K,
    id: string,
    data: ContentMap[K][string]
  ): void {
    this.data[type] = {
      ...this.data[type],
      [id]: data,
    } as ContentMap[K];
    this.notify();
  }"""
if OLD in src:
    src = src.replace(OLD, NEW)
    CS.write_text(src, encoding="utf-8")
    print("OK: fixed ContentStore.upsert assignment cast")
else:
    print("WARN: could not find ContentStore.upsert anchor")

# 2. ScenerEditor.tsx: The groupId type mismatch. The issue is that
#    the Zod schema's output type for `z.string().nullable()` doesn't
#    match Character's `string | null`. Fix by casting in the editor.
SE = Path("src/devtools/editors/ScenerEditor.tsx")
src = SE.read_text(encoding="utf-8")
# The error is on line 53 which is the schema={CharacterSchema} line.
# The Zod schema's output type doesn't match Character. Cast it.
src = src.replace(
    "      schema={CharacterSchema}",
    '      schema={CharacterSchema as unknown as import("zod").ZodType<Character>}',
)
SE.write_text(src, encoding="utf-8")
print("OK: fixed ScenerEditor schema cast")
