#!/usr/bin/env python3
"""
Add 6 new BBS message categories, 5 recurring personalities, and a 7th
seed thread to sim/data/bbsMessages.ts. Update the barrel exports.
"""
import sys

DATA_PATH = 'sim/data/bbsMessages.ts'
INDEX_PATH = 'sim/data/index.ts'

# ============================================================================
# 1. Read bbsMessages.ts
# ============================================================================
with open(DATA_PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================================
# 2. Add BBSCategory type + CATEGORY_MESSAGES
# ============================================================================
# Insert after the `BBSBoard` type definition (line 36 area).
# Find the end of: `export type BBSBoard = (typeof BBS_BOARDS)[number];\n`
old_board_end = 'export type BBSBoard = (typeof BBS_BOARDS)[number];'
new_board_and_category = '''export type BBSBoard = (typeof BBS_BOARDS)[number];

// ============================================================================
// 1b. Message categories (for the new 6 topic pools + recurring personalities)
// ============================================================================

/**
 * Topical message categories that drive the 6 new message pools. Each is
 * era-indexed so a 1985 thread never accidentally cites a 1998 3Dfx card.
 * Used by `generatePersonalityMessage` and the seed-thread initial messages.
 */
export type BBSCategory =
  | "COMPETITION_ANNOUNCEMENTS"
  | "TECHNICAL_DISCUSSIONS"
  | "FRIENDLY_RIVALRY"
  | "HARDWARE_WOES"
  | "SCENE_GOSSIP"
  | "HUMOR";

export const CATEGORY_MESSAGES: Record<BBSCategory, Partial<Record<Era, string[]>>> = {
  COMPETITION_ANNOUNCEMENTS: {
    early: [
      "Deadline extended by one week. Yes, really.",
      "64K compo entries are piling up. The sysop had to add a second node.",
      "Who's bringing an Amiga production this year? Vote now on the Swedish node.",
      "Registration closes Friday — no exceptions, not even for Future Crew.",
    ],
    mid: [
      "Tracking 23 confirmed entries for the 64K compo. This is going to be a bloodbath.",
      "Wild compo announced: 4K intro for any platform. Modem the binary by Saturday.",
      "Compo machine specs finalized. No last-minute changes. Read the rules board.",
      "Demo compo is at 40 entries. We may need a second screen.",
    ],
    late: [
      "The 64K compo just hit 40 entries. The judges will need a week to recover.",
      "Online voting opens next week. No more paper ballots. Welcome to 1998.",
      "Compos go live on stream this year. The future is now and it is bandwidth-hungry.",
    ],
  },
  TECHNICAL_DISCUSSIONS: {
    early: [
      "VGA tricks and planar memory debates — who is right, the manual or the German hackers?",
      "Fast Fourier transforms on a 6502? Yes, if you enjoy 2 minutes per sample.",
      "Tracker module recommendations — Protracker 2.3d or Noisetracker? Fight!",
      "Assembly optimization debates — 6502 vs Z80. The C64 kids vs the ZX crowd.",
    ],
    mid: [
      "Anyone got a working Mode-X unchained routine for VGA? The manuals lie.",
      "Register allocation in 68000 assembly: who has the cleanest macros?",
      "Best 4-channel MOD player for 1995? Protracker 2.3d or FastTracker 2.04?",
      "Coprocessor math vs pure ASM for polygon math. The coprocessor kids are winning.",
    ],
    late: [
      "MMX intrinsics vs raw SSE: who wins on a Pentium III? Intrinsics are cheating, fight me.",
      "GLSL fragment shaders: is anyone still using fixed-function? Asking for a friend.",
      "Wavetable synthesis on a GUS PnP — the dark horse of late-90s audio.",
      "Vertex buffer objects vs display lists in OpenGL 1.5. VBOs won, display lists lost.",
    ],
  },
  FRIENDLY_RIVALRY: {
    early: [
      "PixelForge claims they'll win again this year. Sure, Jan.",
      "Bitstorm says last year's victory was pure luck. The flame war begins.",
      "Razor 1911 vs Fairlight: who really wrote the multicolor loader? The plot thickens.",
    ],
    mid: [
      "Future Crew vs Razor 1911: the BBS wars continue. The modems are smoking.",
      "Fairlight challenges anyone to a cracktro speed-coding contest. 4 hours, one intro.",
      "Triad says their 3D engine will blow everyone away. Show us the binary.",
    ],
    late: [
      "Farbrausch vs Black Maiden: the 64K arms race continues. Bytes are getting smaller.",
      "Trauma claims their new intro is the best since Werkzeug. Big words, empty proof.",
      "Conspiracy: the 4K compo is rigged. We all know it. The Nordic mafia runs the scene.",
    ],
  },
  HARDWARE_WOES: {
    early: [
      "Sound card refusing to cooperate. The IRQ jumper is a lie.",
      "386 overheats during rendering. The case fan is decorative at best.",
      "Finally got EMS memory working. Limine 4.0 forever.",
      "My 1541 drive head is misaligned by 0.1mm. Any calibration tools on the Swedish nodes?",
    ],
    mid: [
      "GUS PnP won't initialize on a 486. IRQ conflict with the sound blaster?",
      "Amiga blitter keeps corrupting copper lists. Known bug, undocumented fix.",
      "Voodoo 1 overheating during long renders. The heatsink is a sticker.",
    ],
    late: [
      "GeForce 3 drivers crash on a 4K intro. Anyone have a stable beta from the underground?",
      "Audigy 2 has 200ms latency in DOS mode. Unusable for tracker workarounds.",
      "My LCD monitor flickers at 85Hz. Stuck at 60Hz. The CRT gang is winning again.",
    ],
  },
  SCENE_GOSSIP: {
    early: [
      "Groups recruiting members across Europe. Floppy swappers preferred.",
      "Someone switching groups — internal drama confirmed by two independent nodes.",
      "Rumors about an upcoming production from an unnamed group. Codename: TITANIC.",
    ],
    mid: [
      "Three members just left Future Crew. Internal drama confirmed by leaked mail.",
      "Heard through the grapevine: a new group is forming in Finland. Codename: COLDPLAY.",
      "Razor 1911 split is imminent. Internal mail leaked via a Stockholm node.",
    ],
    late: [
      "Farbrausch is winding down. New project: a 4K engine rewrite with shaders.",
      "Black Maiden's next release is a 1K intro. Yes, one kilobyte. The arms race continues.",
      "The scene is migrating to IRC. BBS nodes are dying. Modem handshake RIP.",
    ],
  },
  HUMOR: {
    early: [
      "Fake flame wars — is this real or just sysop trolling? Asking for a friend in Warsaw.",
      "ASCII art of a 1541 drive eating a floppy. In copper palette. Send your best.",
      "Running jokes about debugging at 3 AM. The modem handshake is the only lullaby I need.",
    ],
    mid: [
      "My code compiled on the first try. I don't trust it. Burning a floppy as a sacrifice.",
      "3 AM: the demo gods demand a sacrifice. I offered a floppy disk. They wanted a CD-ROM.",
      "The modem handshake noise is actually a secret message. Decoded it. It says BUY MORE RAM.",
    ],
    late: [
      "I optimized one instruction and lost 10fps. Send help. The compiler is laughing at me.",
      "The 4K compo is just a measurement of who can delete more code. Delete is the new write.",
      "My shader compiles in 0.3 seconds. The demo runs at 200fps. I am become death, destroyer of frames.",
    ],
  },
};'''

if old_board_end in content and "CATEGORY_MESSAGES" not in content:
    content = content.replace(old_board_end, new_board_and_category, 1)
    print("[OK] Added BBSCategory type + CATEGORY_MESSAGES")
else:
    print("[SKIP] BBSCategory/CATEGORY_MESSAGES already present or marker missing")

# ============================================================================
# 3. Add BBSPersonality interface + BBS_PERSONALITIES
# ============================================================================
# Insert after CATEGORY_MESSAGES block, before "// 5. Rumor scribes"
old_marker = "// ============================================================================\n// 5. Rumor scribes (15 — was 5)"
new_personalities = '''// ============================================================================
// 4b. Recurring personalities (5) — recognizable handles that appear across
// categories so players start associating names with topic expertise.
// ============================================================================

export interface BBSPersonality {
  handle: string;
  color: string;
  /** Categories this personality gravitates toward. Empty = wildcard. */
  focusCategories: BBSCategory[];
  /** Era-aware catchphrase pool. */
  messages: Partial<Record<Era, string[]>>;
}

export const BBS_PERSONALITIES: Record<string, BBSPersonality> = {
  ByteWizard: {
    handle: "ByteWizard",
    color: "text-blue-300",
    focusCategories: ["TECHNICAL_DISCUSSIONS", "HARDWARE_WOES"],
    messages: {
      early: [
        "Try unrolling the inner loop. You're losing 3 cycles per iteration to branch prediction.",
        "VIC-II raster interrupts are the answer. Always.",
        "6502 register tricks beat any modern compiler optimization.",
        "Sound card refusing to cooperate? Check the IRQ jumper, not the drivers.",
      ],
      mid: [
        "Amiga blitter abuse is the path to 50fps fluid effects on a 500.",
        "Motorola 68000 pipeline optimization separates the men from the boys.",
        "Register allocation in 68000 assembly: who has the cleanest macros?",
      ],
      late: [
        "MMX intrinsics are pure cheating. Write real SIMD assembler!",
        "3DNow! vs SSE: AMD had the right idea first, Intel copied them years later.",
        "GLSL fragment shaders: is anyone still using fixed-function?",
      ],
    },
  },
  RasterRat: {
    handle: "RasterRat",
    color: "text-rose-400",
    focusCategories: ["TECHNICAL_DISCUSSIONS", "FRIENDLY_RIVALRY"],
    messages: {
      early: [
        "Did you see those copper gradients? The palette interpolation is buttery smooth.",
        "C64 multicolor bitmap mode is the only real canvas. Hi-res is for cowards.",
        "Dithering a 16-color palette to fake a 256-color gradient is the real art.",
      ],
      mid: [
        "Amiga 32-color palette + copper gradient beats any PC mode 13h demo.",
        "Deluxe Paint IV brush dynamics still outperform every modern pixel tool.",
        "Coprocessor math vs pure ASM for polygon math: the coprocessor kids are winning.",
      ],
      late: [
        "Mipmap levels are not optional, they are the difference between a demo and a slideshow.",
        "32-bit truecolor breaks the discipline that made 8-bit pixel art great.",
        "My shader compiles in 0.3 seconds. The demo runs at 200fps. I am become death, destroyer of frames.",
      ],
    },
  },
  ChipTuneKid: {
    handle: "ChipTuneKid",
    color: "text-amber-300",
    focusCategories: ["COMPETITION_ANNOUNCEMENTS", "TECHNICAL_DISCUSSIONS"],
    messages: {
      early: [
        "The new MOD has 4 channels of pure chiptune bliss. No samples, just SID waveforms.",
        "SID chip envelopes are deeper than any FM synth ever dreamed of being.",
        "Tracker module recommendations — Protracker 2.3d or Noisetracker? Fight!",
      ],
      mid: [
        "Protracker 2.3d final is the last tracker that ever mattered. Fight me.",
        "A 32-channel FastTracker II module is the closest we get to symphonic chiptune.",
        "Best 4-channel MOD player for 1995? Protracker 2.3d or FastTracker 2.04?",
      ],
      late: [
        "Streaming OGG Vorbis is a betrayal of the tracker spirit. Use IT compression!",
        "Impulse Tracker 2.14's new sample synthesizer features make FastTracker obsolete.",
        "Wavetable synthesis on a GUS PnP — the dark horse of late-90s audio.",
      ],
    },
  },
  SysOp42: {
    handle: "SysOp42",
    color: "text-zinc-400",
    focusCategories: [], // Wildcard: appears on every board for moderation
    messages: {
      early: [
        "Reminder: no warez, no cracking requests, no personal attacks. This is a creative board.",
        "Thread locked pending verification. Do not crosspost until cleared by node administrator.",
        "Node maintenance scheduled for tonight. Expect 30 minutes of downtime.",
      ],
      mid: [
        "This is your third warning about cross-posting. Next offense is a 24-hour ban.",
        "Reminder: keep discussions civil. Personal attacks are not tolerated.",
        "Archive protocol: this thread is being moved to the historical scene-buffer.",
      ],
      late: [
        "Reminder: keep discussions civil. Personal attacks are not tolerated.",
        "Node maintenance scheduled for tonight. Expect 30 minutes of downtime.",
        "Archive protocol: this thread is being moved to the historical scene-buffer.",
      ],
    },
  },
  CrashOverride: {
    handle: "CrashOverride",
    color: "text-purple-400",
    focusCategories: ["FRIENDLY_RIVALRY", "SCENE_GOSSIP"],
    messages: {
      early: [
        "My next demo will fit in 2K. Watch me. I'm not even using compression yet.",
        "Prepare to be destroyed. Our next intro uses techniques you haven't even theorized.",
        "Razor 1911 vs Fairlight: who really wrote the multicolor loader? We did, obviously.",
      ],
      mid: [
        "We have a 3D engine that runs at 60fps on a 386. You cannot compete.",
        "Our new cracktro has 256 colors and a copper list. Top that.",
        "Triad says their 3D engine will blow everyone away. Ours already does.",
      ],
      late: [
        "My 4K intro uses vertex shaders. The compo doesn't stand a chance.",
        "We're shipping a 1K intro next month. One. Kilobyte. Get ready.",
        "Trauma claims their new intro is the best since Werkzeug. Big words, empty proof.",
      ],
    },
  },
};

/**
 * Pick a random message from a personality that matches the given category
 * (or any personality if `category` is undefined). Falls back to the
 * personality's `mid` era messages if the requested era is empty.
 */
export function generatePersonalityMessage(
  category: BBSCategory | undefined,
  era: Era,
  rng: () => number = Math.random,
): BBSMessage | null {
  const matchingPersonalities = Object.values(BBS_PERSONALITIES).filter(
    (p) => category === undefined || p.focusCategories.length === 0 || p.focusCategories.includes(category),
  );
  if (matchingPersonalities.length === 0) return null;
  const personality = matchingPersonalities[Math.floor(rng() * matchingPersonalities.length)];
  if (!personality) return null;
  const pool = personality.messages[era] ?? personality.messages.mid ?? personality.messages.early ?? [];
  if (pool.length === 0) return null;
  const text = pool[Math.floor(rng() * pool.length)];
  if (!text) return null;
  return { sender: personality.handle, text, color: personality.color };
}

''' + old_marker

if old_marker in content and "BBS_PERSONALITIES" not in content:
    content = content.replace(old_marker, new_personalities, 1)
    print("[OK] Added BBSPersonality interface + BBS_PERSONALITIES + generatePersonalityMessage")
else:
    print("[SKIP] Personalities already present or marker missing")

# ============================================================================
# 4. Update generateFollowedReply to use personalities 20% of the time
# ============================================================================
old_followed_body = '''export function generateFollowedReply(
  npc: Character,
  year: number,
  board: BBSBoard,
): BBSMessage {
  const era = getEra(year);
  const profile = VOICE_PROFILES[npc.specialty]?.[era]
    ?? VOICE_PROFILES[npc.specialty]?.mid
    ?? VOICE_PROFILES[npc.specialty]?.early
    ?? [];
  if (profile.length === 0) {
    return { sender: npc.handle, text: "Loving this thread. Keep the discussion alive.", color: colorForHandle(npc.handle) };
  }
  const text = profile[Math.floor(Math.random() * profile.length)];
  return { sender: npc.handle, text, color: colorForHandle(npc.handle) };
}'''

new_followed_body = '''export function generateFollowedReply(
  npc: Character,
  year: number,
  board: BBSBoard,
): BBSMessage {
  const era = getEra(year);
  // 20% chance to insert a recognizable personality instead of the NPC.
  // SysOp42 (empty focusCategories) is a wildcard so it can appear on any
  // board as a moderation voice.
  if (Math.random() < 0.2) {
    const personality = generatePersonalityMessage(undefined, era);
    if (personality) return personality;
  }
  const profile = VOICE_PROFILES[npc.specialty]?.[era]
    ?? VOICE_PROFILES[npc.specialty]?.mid
    ?? VOICE_PROFILES[npc.specialty]?.early
    ?? [];
  if (profile.length === 0) {
    return { sender: npc.handle, text: "Loving this thread. Keep the discussion alive.", color: colorForHandle(npc.handle) };
  }
  const text = profile[Math.floor(Math.random() * profile.length)];
  return { sender: npc.handle, text, color: colorForHandle(npc.handle) };
}'''

if old_followed_body in content:
    content = content.replace(old_followed_body, new_followed_body, 1)
    print("[OK] Updated generateFollowedReply to use personalities 20% of the time")
else:
    print("[MISS] generateFollowedReply marker not found")

# ============================================================================
# 5. Add SysOp42 quotes to SYSOP_REPLIES
# ============================================================================
old_sysop_replies = '''  "Three flame replies already and it's only been live for an hour. Classic.",
  "Pinging the mod-tier sysops. Someone is going to lose their node privileges over this.",
];'''
new_sysop_replies = '''  "Three flame replies already and it's only been live for an hour. Classic.",
  "Pinging the mod-tier sysops. Someone is going to lose their node privileges over this.",
  // SysOp42-flavored moderation quotes (recognizable handle)
  "SysOp42 says: This is your third cross-posting warning. Next offense is a 24-hour ban.",
  "SysOp42 says: Node maintenance scheduled for tonight. Expect 30 minutes of downtime.",
  "SysOp42 says: Reminder: no warez, no cracking requests, no personal attacks. This is a creative board.",
];'''

if old_sysop_replies in content:
    content = content.replace(old_sysop_replies, new_sysop_replies, 1)
    print("[OK] Added 3 SysOp42 quotes to SYSOP_REPLIES")
else:
    print("[MISS] SYSOP_REPLIES closing marker not found")

# ============================================================================
# 6. Add 2 personality-based random events
# ============================================================================
old_events_close = '''  {
    head: "WIRING TUTORIAL DOWNLOAD",
    body: "A German BBS node uploaded a 200-page PDF on cycle-exact 68000 interrupt handling. Gained +12 research points!",
    type: "research",
    amount: 12,
  },
];'''
new_events_close = '''  {
    head: "WIRING TUTORIAL DOWNLOAD",
    body: "A German BBS node uploaded a 200-page PDF on cycle-exact 68000 interrupt handling. Gained +12 research points!",
    type: "research",
    amount: 12,
  },
  // Personality-flavored events
  {
    head: "BYTEWIZARD RELEASES NEW CODING TUTORIAL",
    body: "ByteWizard just uploaded a 150-page PDF on 68000 register allocation. Gained +15 research points!",
    type: "research",
    amount: 15,
  },
  {
    head: "CHIPTUNEKID LEAKS A SAMPLE PACK",
    body: "ChipTuneKid uploaded a 200-sample SID-ripped pack to the Swedish node. Spend $10 for the disk, +5 Reputation for the network cred!",
    type: "money",
    amount: -10,
  },
];'''

if old_events_close in content:
    content = content.replace(old_events_close, new_events_close, 1)
    print("[OK] Added 2 personality-based random events")
else:
    print("[MISS] BBS_RANDOM_EVENTS closing marker not found")

# ============================================================================
# 7. Add 7th seed thread featuring personalities
# ============================================================================
# Insert before the closing `];` of the seed threads array.
# The seed threads end with: `      mutationCount: 0,\n    },\n  ]);\n}\n`
# We need to add a 7th thread before the `  ]);`.
old_seed_close = '''      mutationCount: 0,
    },
  ]);
}'''
new_seed_close = '''      mutationCount: 0,
    },
    {
      id: "thread_personality_1",
      board: "SCENE_RUMORS",
      topic: "CRASH OVERRIDE CLAIMS 64K DOMINATION NEXT MONTH",
      year: 1985,
      month: 1,
      actorId: "chaos_coder",
      messages: [
        { sender: "CrashOverride", text: "Prepare to be destroyed. Our next 64k intro uses techniques you haven't even theorized. ByteWizard himself couldn't optimize this code.", color: "text-purple-400" },
        { sender: "ByteWizard", text: "Unless you found a way to bypass the DMA limits, your math doesn't add up. Show me the binary or stop wasting my cycles.", color: "text-blue-300" },
        { sender: "SysOp42", text: "Locking this thread if you don't provide a binary. No empty boasts here. Evidence or silence.", color: "text-zinc-400" },
        { sender: "RasterRat", text: "Even if they ship, the visuals are going to be derivative. 64K intros live or die on palette work, not raw code.", color: "text-rose-400" },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Support CrashOverride: Bold claims deserve bold rewards. Sponsor their entry!`, type: "support", effectDescription: "CrashOverride appreciation: +15 Reputation, +10 Research" },
        { text: `Flame CrashOverride: Empty boasts are the lazy scener's crutch. Demand the binary.`, type: "flame", effectDescription: "CrashOverride hostility: -10 Friendship" },
        { text: `Consult ByteWizard: Ask for a code review of CrashOverride's claims.`, type: "support", effectDescription: "ByteWizard appreciation: +20 Research, +10 Friendship with ByteWizard" },
      ],
      infoType: "demo_announcement",
      credibilityScore: 45,
      propagationSpeed: 70,
      distortionRate: 50,
      influenceWeight: 75,
      viralSpreadRank: 2,
      isSuppressed: false,
      originalTopic: "CRASH OVERRIDE CLAIMS 64K DOMINATION NEXT MONTH",
      mutationCount: 0,
    },
  ]);
}'''

if old_seed_close in content and "thread_personality_1" not in content:
    content = content.replace(old_seed_close, new_seed_close, 1)
    print("[OK] Added 7th seed thread featuring personalities")
else:
    print("[SKIP] 7th seed thread already present or marker missing")

# ============================================================================
# Write bbsMessages.ts back
# ============================================================================
with open(DATA_PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"\nWrote {DATA_PATH} ({len(content)} chars)")

# ============================================================================
# 8. Update barrel exports in sim/data/index.ts
# ============================================================================
with open(INDEX_PATH, 'r', encoding='utf-8') as f:
    index_content = f.read()

old_index_block = '''export {
  BBS_BOARDS,
  BBS_SCRIBES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  ERA_TOPICS,
  SPYLINE_TEMPLATES,
  BBS_RANDOM_EVENTS,
  BBS_MUTATIONS,
  VOICE_PROFILES,
  getSeedThreads,
  getEra,
  generateFollowedReply,
  colorForHandle,
} from "./bbsMessages";
export type { BBSBoard, Era, SpylineTemplate, BBSRandomEvent } from "./bbsMessages";'''

new_index_block = '''export {
  BBS_BOARDS,
  BBS_SCRIBES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  ERA_TOPICS,
  SPYLINE_TEMPLATES,
  BBS_RANDOM_EVENTS,
  BBS_MUTATIONS,
  VOICE_PROFILES,
  CATEGORY_MESSAGES,
  BBS_PERSONALITIES,
  getSeedThreads,
  getEra,
  generateFollowedReply,
  generatePersonalityMessage,
  colorForHandle,
} from "./bbsMessages";
export type {
  BBSBoard,
  Era,
  SpylineTemplate,
  BBSRandomEvent,
  BBSCategory,
  BBSPersonality,
} from "./bbsMessages";'''

if old_index_block in index_content:
    index_content = index_content.replace(old_index_block, new_index_block, 1)
    with open(INDEX_PATH, 'w', encoding='utf-8') as f:
        f.write(index_content)
    print(f"[OK] Updated barrel exports in {INDEX_PATH}")
else:
    print("[MISS] Index block marker not found")
