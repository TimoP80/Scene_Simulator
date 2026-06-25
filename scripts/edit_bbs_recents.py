import sys
FILE = "src/App.tsx"
with open(FILE, encoding="utf-8") as f:
    src = f.read()

print(f"Loaded {FILE}, length={len(src)}")

EDIT_COUNT = 5

# EDIT 1 - state rename
old1 = '''  // Tracks idBase of last 6 BBS scenarios spawned each month, so the picker can
  // avoid immediate repeats. Without this, after a few clicks of "next month"
  // the same handful of topics (bps_ranger_limit, bps_dxyre_burnout, etc.)
  // cycles and the board feels stale.
  const [recentBbsScenarioIds, setRecentBbsScenarioIds] = useState<string[]>([]);'''
new1 = '''  // Tracks the last 6 (idBase|topic) pairs spawned each month, so the picker
  // can avoid BOTH immediate idBase repeats AND immediate same-topic-line
  // repeats. Each entry is composite "${idBase}|${topic}". Without this,
  // after a few clicks of "next month" the same handful of topic lines
  // cycles twice (once at idBase level, again at the same idBase's variant).
  const [recentBbsTopicPairs, setRecentBbsTopicPairs] = useState<string[]>([]);'''
assert old1 in src, "EDIT 1 anchor missing"
src = src.replace(old1, new1, 1)
print(f"EDIT 1/{EDIT_COUNT} applied: state renamed to recentBbsTopicPairs")

# EDIT 2 - pickBbsTopicVariant signature + body
old2 = '''function pickBbsTopicVariant(idBase: string, originalTopic: string): string {
  const variants = BBS_TOPIC_VARIANTS[idBase];
  if (!variants || variants.length === 0) return originalTopic;
  const idx = Math.floor(Math.random() * (variants.length + 1));
  return idx === variants.length ? originalTopic : variants[idx];
}'''
new2 = '''function pickBbsTopicVariant(
  idBase: string,
  originalTopic: string,
  recentTopicsForBase: string[]
): string {
  const variants = BBS_TOPIC_VARIANTS[idBase];
  if (!variants || variants.length === 0) return originalTopic;
  // Variant-level dedup: exclude topic lines that have been spawned recently
  // for THIS idBase, so a respawn never reuses the same topic line within
  // the 6-spawn recency window.
  const recentSet = new Set(recentTopicsForBase);
  const eligible = variants.filter((v) => !recentSet.has(v));
  // If every variant is recent, fall back to the original topic so the picker
  // still produces a thread instead of stalling.
  if (eligible.length === 0) return originalTopic;
  // Lane: 25% probability of the original topic, 75% eligibility-weighted
  // among the remaining variants. Keeps base storyline visible occasionally.
  if (Math.random() < 0.25) return originalTopic;
  return eligible[Math.floor(Math.random() * eligible.length)];
}'''
assert old2 in src, "EDIT 2 anchor missing"
src = src.replace(old2, new2, 1)
print(f"EDIT 2/{EDIT_COUNT} applied: pickBbsTopicVariant now skips recent variant topics")

# EDIT 3 - filter extracts idBase from composite keys
old3 = '''    const recentSet = new Set(recentBbsScenarioIds);
    // Compute idBase inline since BBSThread has no idBase field; scenario ids
    // are templated "bps_<topic>_<year>_<month>", so slice(-2) gives topic base.
    const eligibleScenarios = scenarioPool.filter((s) => {
      const candidateBase = s.id.split("_").slice(0, -2).join("_");
      return !recentSet.has(candidateBase);
    });'''
new3 = '''    // Build idBase-only set from composite "idBase|topic" keys by splitting
    // off the part before the first "|". This filters out candidates whose
    // idBase appeared in any recent spawn -- idBase-level dedup window.
    const recentIdBaseSet = new Set(
      recentBbsTopicPairs.map((k) => k.split("|", 1)[0])
    );
    // BBSThread has no idBase field; scenario ids are templated
    // "bps_<topic>_<year>_<month>", so slice(-2) gives the topic base.
    const eligibleScenarios = scenarioPool.filter((s) => {
      const candidateBase = s.id.split("_").slice(0, -2).join("_");
      return !recentIdBaseSet.has(candidateBase);
    });'''
assert old3 in src, "EDIT 3 anchor missing"
src = src.replace(old3, new3, 1)
print(f"EDIT 3/{EDIT_COUNT} applied: filter extracts idBase from composite keys")

# EDIT 4 - inject topic override into chosenScenario construction
old4 = '''      messages: flipOrder ? [...basePick.messages].reverse() : basePick.messages,
      year: nextY,
      month: nextM
    };'''
new4 = '''      messages: flipOrder ? [...basePick.messages].reverse() : basePick.messages,
      year: nextY,
      month: nextM,
      // Override topic per idBase AND exclude variants that have fired recently
      // at the same idBase (variant-level dedup with composite-key tracking).
      topic: pickBbsTopicVariant(
        idBase,
        basePick.topic,
        // Pull only the topic half of composite keys whose idBase half matches.
        recentBbsTopicPairs
          .filter((k) => k.startsWith(idBase + "|"))
          .map((k) => k.slice(idBase.length + 1))
      ),
    };'''
assert old4 in src, "EDIT 4 anchor missing"
src = src.replace(old4, new4, 1)
print(f"EDIT 4/{EDIT_COUNT} applied: chosenScenario picks a variant avoiding recent topics")

# EDIT 5 - push to recents uses new name + composite key
old5 = '''      // Track this spawn for recency dedupe (cap at 6 entries).
      setRecentBbsScenarioIds((prev) => {
        const next = [idBase, ...prev.filter((x) => x !== idBase)];
        return next.slice(0, 6);
      });'''
new5 = '''      // Track this spawn for recency dedupe (cap at 6 entries).
      // Stores composite "idBase|topic" key so respawns avoid BOTH the same
      // idBase AND the same exact topic line within the dedup window.
      setRecentBbsTopicPairs((prev) => {
        const composite = `${idBase}|${chosenScenario.topic}`;
        const next = [composite, ...prev.filter((x) => x !== composite)];
        return next.slice(0, 6);
      });'''
assert old5 in src, "EDIT 5 anchor missing"
src = src.replace(old5, new5, 1)
print(f"EDIT 5/{EDIT_COUNT} applied: push stores composite (idBase|topic) key")

with open(FILE, "w", encoding="utf-8") as f:
    f.write(src)
print(f"All {EDIT_COUNT} edits saved. Total lines: {len(src.splitlines())}")
