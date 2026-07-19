#!/usr/bin/env python3
"""
Fix the typecheck errors and code review issues in src/App.tsx.
"""
PATH = 'src/App.tsx'

with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================================
# Fix 1: Import BBSBoard type
# ============================================================================
old_import = "  colorForHandle,\n} from \"@sim/data\";"
new_import = "  colorForHandle,\n  type BBSBoard,\n} from \"@sim/data\";"
content = content.replace(old_import, new_import, 1)
print("[OK] Added BBSBoard type import")

# ============================================================================
# Fix 2: Spyline syntax — move variables outside the setNewsLog array
# ============================================================================
old_spyline = """    setNewsLog((prevNews) => [
      {
        const spyline = SPYLINE_TEMPLATES[Math.floor(Math.random() * SPYLINE_TEMPLATES.length)];
        const spylineArticle = {
          id: `rumor_magazine_${Date.now()}`,
          title: "BBS TELEGRAM SPYLINE",
          year: currentYear,
          month: currentMonth,
          headline: spyline.headline,
          body: spyline.body(sourceLabel, targetLabel),
          type: "scandal" as const
        };
      ...prevNews
    ]);"""
new_spyline = """    const spyline = SPYLINE_TEMPLATES[Math.floor(Math.random() * SPYLINE_TEMPLATES.length)];
    const spylineArticle = {
      id: `rumor_magazine_${Date.now()}`,
      title: "BBS TELEGRAM SPYLINE",
      year: currentYear,
      month: currentMonth,
      headline: spyline.headline,
      body: spyline.body(sourceLabel, targetLabel),
      type: "scandal" as const
    };
    setNewsLog((prevNews) => [
      spylineArticle,
      ...prevNews
    ]);"""
if old_spyline in content:
    content = content.replace(old_spyline, new_spyline, 1)
    print("[OK] Fixed spyline syntax (moved vars outside array)")
else:
    print("[MISS] Spyline pattern not found")

# ============================================================================
# Fix 3: 'as never' → 'as BBSBoard'
# ============================================================================
old_cast = "generateFollowedReply(followedActor, nextY, updatedTh.board as never)"
new_cast = "generateFollowedReply(followedActor, nextY, updatedTh.board as BBSBoard)"
if old_cast in content:
    content = content.replace(old_cast, new_cast, 1)
    print("[OK] Fixed 'as never' → 'as BBSBoard'")
else:
    print("[MISS] 'as never' cast not found")

# ============================================================================
# Fix 4: Randomize SYSOP_MODERATION_MESSAGES pick
# ============================================================================
old_sysop = "text: SYSOP_MODERATION_MESSAGES[0].text,"
new_sysop = "text: SYSOP_MODERATION_MESSAGES[Math.floor(Math.random() * SYSOP_MODERATION_MESSAGES.length)].text,"
if old_sysop in content:
    content = content.replace(old_sysop, new_sysop, 1)
    print("[OK] Randomized SYSOP_MODERATION_MESSAGES pick")
else:
    print("[MISS] SYSOP pattern not found")

# ============================================================================
# Write back
# ============================================================================
with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"\nWrote {PATH} ({len(content)} chars)")
