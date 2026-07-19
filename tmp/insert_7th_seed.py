#!/usr/bin/env python3
"""
Insert the 7th seed thread (thread_personality_1) with the corrected
actorId 'hype_ops' into the getSeedThreads function. The previous script
skipped this because its closing marker didn't match exactly.
"""
PATH = 'sim/data/bbsMessages.ts'

with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# The exact closing of getSeedThreads (after thread_leaks_1):
old_closing = '''      originalTopic: "[ALERT] SOURCE CODE FOR UPCOMING CRACKTRO LEAKED!",
      mutationCount: 0,
    },
  ];
}'''

new_closing = '''      originalTopic: "[ALERT] SOURCE CODE FOR UPCOMING CRACKTRO LEAKED!",
      mutationCount: 0,
    },
    {
      id: "thread_personality_1",
      board: "SCENE_RUMORS",
      topic: "CRASH OVERRIDE CLAIMS 64K DOMINATION NEXT MONTH",
      year: 1985,
      month: 1,
      actorId: "hype_ops",
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
        { text: "Support CrashOverride: Bold claims deserve bold rewards. Sponsor their entry!", type: "support", effectDescription: "CrashOverride appreciation: +15 Reputation, +10 Research" },
        { text: "Flame CrashOverride: Empty boasts are the lazy scener's crutch. Demand the binary.", type: "flame", effectDescription: "CrashOverride hostility: -10 Friendship" },
        { text: "Consult ByteWizard: Ask for a code review of CrashOverride's claims.", type: "support", effectDescription: "ByteWizard appreciation: +20 Research, +10 Friendship with ByteWizard" },
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
  ];
}'''

if old_closing in content:
    content = content.replace(old_closing, new_closing, 1)
    with open(PATH, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"[OK] Inserted 7th seed thread (thread_personality_1) with actorId 'hype_ops'")
    print(f"  Wrote {PATH} ({len(content)} chars)")
else:
    print("[MISS] Closing pattern not found")
