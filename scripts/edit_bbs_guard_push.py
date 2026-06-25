FILE = "src/App.tsx"
with open(FILE, encoding="utf-8") as f:
    s = f.read()

old = (
    "      const composite = `${idBase}|${chosenScenario.topic}`;\n"
)
new = (
    "      // Guard: chosenScenario.topic could be empty for a future scenario\n"
    "      // template without a topic body. Fall back to the base scenario's\n"
    "      // canonical topic so the composite key is always valid.\n"
    "      const composite = `${idBase}|${chosenScenario.topic || basePick.topic}`;\n"
)

assert old in s, "EDIT anchor missing -- push line was modified"
assert s.count(old) == 1, f"expected 1 occurrence, got {s.count(old)}"

s = s.replace(old, new, 1)

with open(FILE, "w", encoding="utf-8") as f:
    f.write(s)

print("OK: composite key now falls back to basePick.topic if chosenScenario.topic is empty")
