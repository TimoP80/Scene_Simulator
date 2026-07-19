#!/usr/bin/env python3
"""
Fix the two remaining issues in sim/data/bbsMessages.ts:
1. Add the 3 missing SpecialtyType entries to VOICE_PROFILES
   (Effect Coder, Demo Director, Swapper/BBS Op)
2. Add an always-mutates terminal case to BBS_MUTATIONS
"""
PATH = 'sim/data/bbsMessages.ts'

with open(PATH, 'r', encoding='utf-8') as f:
    content = f.read()

# ============================================================================
# Fix 1: Add 3 missing SpecialtyType entries to VOICE_PROFILES
# ============================================================================
old_marker = """  [SpecialtyType.OrganizerExtraordinaire]: {
    early: [
      "BBS distribution networks are the only way a 4-disk demo reaches Finland in under a month.",
      "Vote-pack coordination is the unsung backbone of every party compo.",
      "A good sysop can make or break a local scene. Respect your node operator.",
      "Swap meets are where real collaborations get started, not on the forums.",
      "Floppy duplication speed is the only metric that matters at 3am on party eve.",
    ],
    mid: [
      "Compo machine specs are a contract with the audience. Do not change them at the last minute.",
      "Voting terminals crash when 200 people try to submit at once. Always have a paper backup.",
      "International sceners are the best part of any party. Invite them first, sponsors second.",
      "A demoparty without a beer garden is a tech conference. Save the soul.",
      "Network coordination between BBS nodes is what makes a rumor become a viral sensation.",
    ],
    late: [
      "Online distribution via FTP and IRC changed the scene forever, for better and worse.",
      "Web-based party results in 1998 are finally killing the disk-mag monopoly on news.",
      "Compo organizers who ignore the streaming era are missing the next generation of sceners.",
      "A 64k intro compo is the purest form of the demoparty. Protect it at all costs.",
      "Sponsorship deals are how we pay for the venue. Do not let them dictate the compo rules.",
    ],
  },
};"""

new_entries = """  [SpecialtyType.OrganizerExtraordinaire]: {
    early: [
      "BBS distribution networks are the only way a 4-disk demo reaches Finland in under a month.",
      "Vote-pack coordination is the unsung backbone of every party compo.",
      "A good sysop can make or break a local scene. Respect your node operator.",
      "Swap meets are where real collaborations get started, not on the forums.",
      "Floppy duplication speed is the only metric that matters at 3am on party eve.",
    ],
    mid: [
      "Compo machine specs are a contract with the audience. Do not change them at the last minute.",
      "Voting terminals crash when 200 people try to submit at once. Always have a paper backup.",
      "International sceners are the best part of any party. Invite them first, sponsors second.",
      "A demoparty without a beer garden is a tech conference. Save the soul.",
      "Network coordination between BBS nodes is what makes a rumor become a viral sensation.",
    ],
    late: [
      "Online distribution via FTP and IRC changed the scene forever, for better and worse.",
      "Web-based party results in 1998 are finally killing the disk-mag monopoly on news.",
      "Compo organizers who ignore the streaming era are missing the next generation of sceners.",
      "A 64k intro compo is the purest form of the demoparty. Protect it at all costs.",
      "Sponsorship deals are how we pay for the venue. Do not let them dictate the compo rules.",
    ],
  },
  [SpecialtyType.EffectCoder]: {
    early: [
      "Smooth scroll routines beat any sprite trick. Just do the math right.",
      "Copper bars are not a hack, they are the reason we bought an Amiga.",
      "A well-tuned sine scroller is worth more than a thousand plasma clouds.",
      "Cycle-counted effects are the only effects worth demoing.",
    ],
    mid: [
      "Procedural texture generators are the new raster bars. Embrace the math.",
      "Voxel heightfields are overused but still the easiest way to impress a crowd.",
      "A clean roto-zoomer with 200 fps on a 386 is the peak of the form.",
      "Sub-pixel accuracy in a 2D scroller is a lost art. Bring it back.",
    ],
    late: [
      "GLSL fragment shaders are not a replacement for procedural generation, they are a superset.",
      "A 4k intro that runs at 60fps on integrated graphics is the new 4k intro that fits in 4 kilobytes.",
      "Raymarching in a shader is just a fancy way of writing a polygon engine.",
      "Particle systems with 100k particles at 60fps prove the hardware has finally caught up with the artists.",
    ],
  },
  [SpecialtyType.DemoDirector]: {
    early: [
      "A great demo is not about the effects, it is about the pacing between them.",
      "Music sync is the difference between a demo and a slideshow. Get the timing right.",
      "If your scroller does not have a 3-line drop shadow, you are not trying.",
      "The intro logo is the first 3 seconds. Make them count.",
    ],
    mid: [
      "Demo direction is a real skill. Anyone can chain effects, few can tell a story.",
      "A good megademo has a clear arc: intro, buildup, climax, credits. Not just a list.",
      "Soundtrack sync is harder than any single effect. Respect the audio engineers.",
      "The best demos know when to stop. A 4-minute demo that feels like 2 is the goal.",
    ],
    late: [
      "4k intros are the purest form of demo direction. Every byte matters, every frame matters more.",
      "A great modern demo respects the audience's time. 3 minutes of perfection beats 10 of filler.",
      "The 64k compo is where the best directors prove themselves. Constraints breed creativity.",
      "Demo direction in 2004 means understanding both the hardware and the human watching it.",
    ],
  },
  [SpecialtyType.Swapper]: {
    early: [
      "Floppy disk labels are an art form. Hand-drawn copper logos beat any print.",
      "A 4-disk demo swap is the only way to get a copy before the BBS nodes catch up.",
      "Snail mail floppy trades built the European scene. Respect the postal workers.",
      "A good swap meet has free pizza and a working XT keyboard. Everything else is optional.",
    ],
    mid: [
      "CD-ROM distribution in 1994 is the death of the floppy swapper. Adapt or die.",
      "A 50-disk mailer to Finland costs $15. A BBS upload is free. The math is obvious.",
      "International swap networks are the backbone of the global scene. Maintain your contacts.",
      "A swapper with a fast postal route and a sharp pen is worth more than any coder.",
    ],
    late: [
      "FTP distribution killed the physical swap meet. The new swap meet is the IRC channel.",
      "Online distribution means everyone has the demo in 10 minutes. The swap meet is over.",
      "A modern swapper's job is moderation and quality control, not physical media.",
      "The scene survives on the swapper's spirit even when the floppies are gone.",
    ],
  },
};"""

if old_marker in content:
    content = content.replace(old_marker, new_entries, 1)
    print("[OK] Added 3 missing SpecialtyType entries to VOICE_PROFILES")
else:
    print("[MISS] VOICE_PROFILES closing marker not found")

# ============================================================================
# Fix 2: Add always-mutates terminal case to BBS_MUTATIONS
# ============================================================================
old_mutations = """  (t) => `${t} (MUTATED EXTRA)`,
];"""

new_mutations = """  (t) => `${t} (MUTATED EXTRA)`,
  // Always-mutates terminal case: guarantees distortionRate > 0 produces
  // visible change even if none of the regex transforms above matched.
  (t) => `${t.slice(0, Math.max(0, t.length - 1))}!! [MUTANT]`,
];"""

if old_mutations in content:
    content = content.replace(old_mutations, new_mutations, 1)
    print("[OK] Added always-mutates terminal case to BBS_MUTATIONS")
else:
    print("[MISS] BBS_MUTATIONS closing marker not found")

with open(PATH, 'w', encoding='utf-8') as f:
    f.write(content)
print(f"\nWrote {PATH} ({len(content)} chars)")
