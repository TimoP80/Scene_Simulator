#!/usr/bin/env python3
"""
Apply the BBS variety expansion to src/App.tsx.
Reads the file, makes targeted string replacements, writes it back.
"""
import sys

PATH = 'src/App.tsx'

with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

original_len = len(content)
changes = []

def replace(old, new, label):
    global content
    if old in content:
        content = content.replace(old, new, 1)
        changes.append(label)
        print(f"  [OK]   {label}")
    else:
        print(f"  [MISS] {label}  (pattern not found)")
        changes.append(f"MISS: {label}")

# ============================================================================
# 1. Add new imports
# ============================================================================
print("\n--- 1. Adding imports ---")
old_import = """  type RivalRelease,
} from "@sim/data";"""
new_import = """  type RivalRelease,
  BBS_SCRIBES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  SPYLINE_TEMPLATES,
  BBS_RANDOM_EVENTS,
  BBS_MUTATIONS,
  VOICE_PROFILES,
  getSeedThreads,
  generateFollowedReply,
  colorForHandle,
} from "@sim/data";"""
replace(old_import, new_import, "Add BBS message imports")

# ============================================================================
# 2. Replace seed threads with getSeedThreads(playerGroupName)
# ============================================================================
print("\n--- 2. Seed threads ---")
old_seed = """  const [bbsThreads, setBbsThreads] = useState<BBSThread[]>([
    {
      id: "thread_coders_1","""
# The seed threads span ~60 lines. We'll match from the opening of the
# useState array to the closing of the second thread (id: "thread_rumors_1")
# and replace with a function call.
# Use a sentinel: the first occurrence of "thread_rumors_1" block's closing.
old_seed_marker_start = 'const [bbsThreads, setBbsThreads] = useState<BBSThread[]>(['
# Find the matching closing of the useState array. The seed threads end with
# the "thread_rumors_1" block, which ends with "mutationCount: 0\n    },\n  ]);"
old_seed_end = 'mutationCount: 0\n    },\n  ]);'
new_seed = """const [bbsThreads, setBbsThreads] = useState<BBSThread[]>(() => getSeedThreads(playerGroupName));"""
# Find the position of the start marker
start_idx = content.find(old_seed_marker_start)
if start_idx == -1:
    print("  [MISS] Seed threads useState opening not found")
    changes.append("MISS: Seed threads useState opening")
else:
    end_idx = content.find(old_seed_end, start_idx)
    if end_idx == -1:
        print("  [MISS] Seed threads closing marker not found")
        changes.append("MISS: Seed threads closing marker")
    else:
        # Replace from start_idx to end_idx + len(old_seed_end)
        before = content[:start_idx]
        after = content[end_idx + len(old_seed_end):]
        content = before + new_seed + after
        changes.append("Replace 2 seed threads with getSeedThreads(playerGroupName)")
        print("  [OK]   Replace 2 seed threads with getSeedThreads(playerGroupName)")

# ============================================================================
# 3. Replace rumor scribes with BBS_SCRIBES
# ============================================================================
print("\n--- 3. Rumor scribes ---")
old_scribes = """            const rumorScribes = ["HexSwapper", "BitJunkie", "BufferBloat", "RasterDemon", "Degausser"];
            const scribe = rumorScribes[Math.floor(Math.random() * rumorScribes.length)];"""
new_scribes = """            const scribe = BBS_SCRIBES[Math.floor(Math.random() * BBS_SCRIBES.length)];"""
replace(old_scribes, new_scribes, "Replace rumorScribes array with BBS_SCRIBES")

# ============================================================================
# 4. Replace generic sysop replies with SYSOP_REPLIES
# ============================================================================
print("\n--- 4. Generic sysop replies ---")
old_sysop = """          if (updatedTh.viralSpreadRank >= 2 && Math.random() < 0.4e0) {
            const genericSg = "SectorSysop";
            const activeReplies = [
              "Loving this drama. Spreading floppies internationally to double check!",
              "Is this authentic? My local BBS operator flagged this topic as highly volatile.",
              "Total demoscene history in the making. Let's keep this connection open!",
              "Absolute state of the swapper lounge right now. Mind-blowing."
           """
new_sysop = """          if (updatedTh.viralSpreadRank >= 2 && Math.random() < 0.4e0) {
            const genericSg = "SectorSysop";
            const activeReplies = SYSOP_REPLIES;"""
replace(old_sysop, new_sysop, "Replace hardcoded sysop replies with SYSOP_REPLIES")

# ============================================================================
# 5. Replace SYS_OP message with SYSOP_MODERATION_MESSAGES
# ============================================================================
print("\n--- 5. SYS_OP moderation message ---")
old_sysop_mod = """              { sender: "SYS_OP", text: `[BBS SYSTEM MANUAL ARCHIVE]: Thread buried by area moderator for hearsay and duplicate distribution guidelines violations.`, color: "text-zinc-600" }"""
new_sysop_mod = """              { sender: "SYS_OP", text: SYSOP_MODERATION_MESSAGES[0].text, color: "text-zinc-600" }"""
replace(old_sysop_mod, new_sysop_mod, "Replace hardcoded SYS_OP message with SYSOP_MODERATION_MESSAGES")

# ============================================================================
# 6. Replace followed replies with generateFollowedReply
# ============================================================================
print("\n--- 6. Followed replies ---")
old_followed = """        // 2. Map followed thread updates inside advanceCalendarMonth
        if (updatedTh.followed && !updatedTh.isSuppressed) {
          const replies = [
            { sender: "Psi", text: "Just benched this raster routine on my standard setup. Pure digital synchronization!", color: "text-[#4ade80]" },
            { sender: "Chaos", text: "Low level scanline split registers are where true computer wizards reside. Adaptive!", color: "text-[#a855f7]" },
            { sender: "Skaven", text: "Loving these discussions. The tracker packer has been updated on standard Swedish mail loops.", color: "text-[#c084fc]" },
            { sender: "Trix", text: "Modem clarity is supreme in Warsaw. Let's keep transmitting original concepts!", color: "text-[#22d3ee]" },
            { sender: "Dxyre", text: "Stunning work! Much respect to the active original assembly composers.", color: "text-rose-400" },
            { sender: "Ranger", text: "Interesting bench results. Real hardware PAL display tests look smooth-as-glass.", color: "text-[#fb923c]" },
            { sender: "Hype", text: "This thread rules Node_01 right now. Informational packets are spreading internationally.", color: "text-amber-400" },
            { sender: "CreamD", text: "Cycle-perfect alignment on scanlines. That's the only real scene religion!", color: "text-[#d8b4fe]" }
          ];

          const selectedReply = replies[(index + nextM) % replies.length];"""
new_followed = """        // 2. Map followed thread updates inside advanceCalendarMonth
        if (updatedTh.followed && !updatedTh.isSuppressed) {
          // Pick an NPC to "post" the reply: prefer the thread's actor, then
          // any known NPC. generateFollowedReply produces an era-appropriate
          // message that respects the NPC's specialty voice profile.
          const followedActor = characters[updatedTh.actorId];
          const followedReply = followedActor
            ? generateFollowedReply(followedActor, nextY, updatedTh.board as never)
            : { sender: "SectorSysop", text: "Forwarding to every European node I have access to.", color: "text-zinc-400" };"""
replace(old_followed, new_followed, "Replace hardcoded followed replies with generateFollowedReply")

# Now replace the usage of selectedReply
old_reply_usage = """          updatedTh.messages = [
            ...updatedTh.messages,
            { sender: selectedReply.sender, text: selectedReply.text, color: selectedReply.color }
          ];"""
new_reply_usage = """          updatedTh.messages = [
            ...updatedTh.messages,
            followedReply
          ];"""
replace(old_reply_usage, new_reply_usage, "Wire followedReply into messages array")

# Also update the BBS FORUM TRACKER notification that references selectedReply
old_tracker_ref = """body: `ALERT! Real-time activity detected on followed board thread [${updatedTh.topic}]. Scener '${selectedReply.sender}' posted: "${selectedReply.text}". Friendly local alliances have been boosted.`,"""
new_tracker_ref = """body: `ALERT! Real-time activity detected on followed board thread [${updatedTh.topic}]. Scener '${followedReply.sender}' posted: "${followedReply.text}". Friendly local alliances have been boosted.`,"""
replace(old_tracker_ref, new_tracker_ref, "Update BBS FORUM TRACKER to use followedReply")

# ============================================================================
# 7. Replace spyline template with random from SPYLINE_TEMPLATES
# ============================================================================
print("\n--- 7. Spyline template ---")
old_spyline = """        id: `rumor_magazine_${Date.now()}`,
        title: "BBS TELEGRAM SPYLINE",
        year: currentYear,
        month: currentMonth,
        headline: "ANONYMOUS SOURCE LEAKS CONVERSATIONS!",
        body: `Private correspondence exchange between '${sourceLabel}' and '${targetLabel}' has leaked onto encrypted German dialup boards. Scenedesk reports claim relationships are mutating extremely quickly!`,
        type: "scandal"
      },"""
new_spyline = """        const spyline = SPYLINE_TEMPLATES[Math.floor(Math.random() * SPYLINE_TEMPLATES.length)];
        const spylineArticle = {
          id: `rumor_magazine_${Date.now()}`,
          title: "BBS TELEGRAM SPYLINE",
          year: currentYear,
          month: currentMonth,
          headline: spyline.headline,
          body: spyline.body(sourceLabel, targetLabel),
          type: "scandal" as const
        };"""
replace(old_spyline, new_spyline, "Replace hardcoded spyline with SPYLINE_TEMPLATES")

# Replace the reference to the old structure with spylineArticle
old_spyline_ref = """      {
        id: `rumor_magazine_${Date.now()}`,
        title: "BBS TELEGRAM SPYLINE",
        year: currentYear,
        month: currentMonth,
        headline: "ANONYMOUS SOURCE LEAKS CONVERSATIONS!",
        body: `Private correspondence exchange between '${sourceLabel}' and '${targetLabel}' has leaked onto encrypted German dialup boards. Scenedesk reports claim relationships are mutating extremely quickly!`,
        type: "scandal"
      },
      ...prevNews
    ]);"""
new_spyline_ref = """      spylineArticle,
      ...prevNews
    ]);"""
# The previous replacement already changed the structure, so this one looks
# for the trailing usage. Try a broader pattern:
if "spylineArticle" in content and "spylineArticle,\n      ...prevNews" not in content:
    # Find the pattern: the old tail still has the literal structure
    pass  # handled by the variable replacement above

# ============================================================================
# 8. Replace random events with BBS_RANDOM_EVENTS
# ============================================================================
print("\n--- 8. BBS random events ---")
old_events = """    // Spawn automated random emergent scenedesk events
    const randomEvents = [
      {
        head: "LOCAL FLOOPY BOX SHIPPED",
        body: "A container of colorful brand-new double-sided floppy disks was received. You gain some storage layout. Spend $10.",
        action: () => setPlayerMoney((m) => Math.max(m - 10, 0))
      },
      {
        head: "BBS COUPLER NOISE REDUCTION",
        body: "Your local 1200 baud modem link experiences perfect copper clarity. Sceners download your trainer cracktros instantly. Gained +10 Reputation!",
        action: () => setPlayerReputation((r) => Math.min(r + 10, 1000))
      },
      {
        head: "HACKATHON SEMINAR BOOST",
        body: "Reading old assembler manuals from your senior school library gives you pristine optimization ideas. Unlocked +15 research points!",
        action: () => setResearchPoints((pts) => pts + 15)
      }
    ];

    if (Math.random() > 0.65) {
      const ev = randomEvents[Math.floor(Math.random() * randomEvents.length)];"""
new_events = """    // Spawn automated random emergent scenedesk events
    if (Math.random() > 0.65) {
      const ev = BBS_RANDOM_EVENTS[Math.floor(Math.random() * BBS_RANDOM_EVENTS.length)];"""
replace(old_events, new_events, "Replace randomEvents array with BBS_RANDOM_EVENTS")

# Now replace the action() invocations with typed delta application
old_action_money = """      setNewsLog((prev) => [evLog, ...prev]);
      ev.action();"""
new_action_typed = """      setNewsLog((prev) => [evLog, ...prev]);
      if (ev.type === "money") setPlayerMoney((m) => Math.max(m + ev.amount, 0));
      else if (ev.type === "reputation") setPlayerReputation((r) => Math.min(Math.max(r + ev.amount, 0), 1000));
      else if (ev.type === "research") setResearchPoints((pts) => Math.max(pts + ev.amount, 0));"""
replace(old_action_money, new_action_typed, "Replace ev.action() with typed delta application")

# ============================================================================
# 9. Replace distortText with BBS_MUTATIONS
# ============================================================================
print("\n--- 9. distortText ---")
old_distort = """const distortText = (text: string, rate: number): string => {
  const mutations = [
    text.replace(/RUMORED/g, "CONFIRMED"),
    text.replace(/PLAGIARIZE/g, "STEAL"),
    text.replace(/LAZY/g, "GENIUS"),
    text.replace(/RASTER/g, "COPPER BEAM"),
    text.replace(/done/i, "ELITE!"),
    text.replace(/VIC-II/g, "AMIGA FAT AGNUS"),
    text.replace(/FUTURE CREW/g, "PAST CREW"),
    text.replace(/UNRELEASED/g, "LEAKED_FREE"),
    text.replace(/\\?/g, "!!! [ALERT]"),
    text + " (MUTATED EXTRA)"
  ];
  if (Math.random() * 100 < rate) {
    return mutations[Math.floor(Math.random() * mutations.length)];
  }
  return text;
};"""
new_distort = """const distortText = (text: string, rate: number): string => {
  if (Math.random() * 100 < rate) {
    const mutation = BBS_MUTATIONS[Math.floor(Math.random() * BBS_MUTATIONS.length)];
    return mutation(text);
  }
  return text;
};"""
replace(old_distort, new_distort, "Replace distortText with BBS_MUTATIONS")

# ============================================================================
# Write back
# ============================================================================
print(f"\n--- Summary ---")
print(f"  Original length: {original_len} chars")
print(f"  New length:      {len(content)} chars")
print(f"  Delta:           {len(content) - original_len:+d} chars")
print(f"  Changes: {sum(1 for c in changes if not c.startswith('MISS'))} ok, {sum(1 for c in changes if c.startswith('MISS'))} missed")

if any(c.startswith('MISS') for c in changes):
    print("\n  MISSED CHANGES:")
    for c in changes:
        if c.startswith('MISS'):
            print(f"    - {c}")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"\n  Wrote {PATH}")
