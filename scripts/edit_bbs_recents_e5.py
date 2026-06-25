FILE = "src/App.tsx"
with open(FILE, encoding="utf-8") as f:
    s = f.read()

# Anchor: lines have 4-space outer indent (from cat -A inspection).
# The push call sits at advanceCalendarMonth top-level inside the function
# body, NOT nested inside setBbsThreads.
old = (
    "    // Track this spawn for recency dedupe (cap at 6 entries).\n"
    "    setRecentBbsScenarioIds((prev) => {\n"
    "      const next = [idBase, ...prev.filter((x) => x !== idBase)];\n"
    "      return next.slice(0, 6);\n"
    "    });"
)
new = (
    "    // Track this spawn for recency dedupe (cap at 6 entries).\n"
    "    // Stores composite \"idBase|topic\" key so respawns avoid BOTH the\n"
    "    // same idBase AND the same exact topic line within the dedup window.\n"
    "    setRecentBbsTopicPairs((prev) => {\n"
    "      const composite = `${idBase}|${chosenScenario.topic}`;\n"
    "      const next = [composite, ...prev.filter((x) => x !== composite)];\n"
    "      return next.slice(0, 6);\n"
    "    });"
)

assert old in s, "EDIT 5 anchor still missing"
s_count_old = s.count(old)
assert s_count_old == 1, f"Expected 1 occurrence, got {s_count_old}"
s = s.replace(old, new, 1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(s)

print("EDIT 5 OK: push stores composite (idBase|topic) key")
