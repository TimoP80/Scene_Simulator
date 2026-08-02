"""
Generate 60+ new BBS seed threads covering the requested categories
across 1985-2024. Outputs TypeScript object literals suitable for
appending to the getSeedThreads() return array in sim/data/bbsMessages.ts.

Run: cd Scene_Simulator && python3 tmp/generate_bbs_threads.py
"""

import random
import textwrap

random.seed(42)

# Era ranges
EARLY_YEARS = list(range(1985, 1990))
MID_YEARS = list(range(1990, 1996))
LATE_YEARS = list(range(1996, 2005))
MODERN_YEARS = list(range(2005, 2025))

# Boards
BOARDS = ["CODERS_CORNER", "SCENE_RUMORS", "PARTY_GOSSIP", "PIXEL_PERFECTION", "TOOL_RELEASES", "LEAKS", "TRACKER_TUNES"]

# NPC actor IDs
ACTORS = ["ranger_c64", "unreal_coder", "dxyre", "trix_art", "chaos_coder", "audio_drifter", "vectra_pixel", "hype_ops", "skaven", "purple_motion"]

# NPC colors (matching existing)
NPC_COLORS = {
    "Ranger": "text-[#fb923c]", "Psi": "text-[#22d3ee]", "Chaos": "text-[#a855f7]",
    "Skaven": "text-blue-400", "Dxyre": "text-rose-400", "Trix": "text-[#c084fc]",
    "Vectra": "text-rose-300", "Hype": "text-amber-400", "Drifter": "text-amber-300",
    "Purple Motion": "text-[#4ade80]", "Unreal": "text-[#22d3ee]",
    "ByteWizard": "text-blue-300", "RasterRat": "text-rose-400", "ChipTuneKid": "text-amber-300",
    "SysOp42": "text-zinc-400", "CrashOverride": "text-purple-400",
    "DemosceneHistorian": "text-emerald-400", "FlameAlchemist": "text-orange-400",
    "CopperGhost": "text-cyan-300", "PulseWave": "text-pink-400",
}


def pick_era_year(topic_era):
    if topic_era == "early":
        return random.choice(EARLY_YEARS)
    elif topic_era == "mid":
        return random.choice(MID_YEARS)
    elif topic_era == "late":
        return random.choice(LATE_YEARS)
    else:
        return random.choice(MODERN_YEARS)


def gen_id(prefix, num):
    return f"\"thread_{prefix}_{num}\""


def board_for_topic(topic_cat):
    mapping = {
        "hardware": "CODERS_CORNER",
        "fasttracker_vs_it": "TRACKER_TUNES",
        "protracker_packs": "TRACKER_TUNES",
        "copper": "CODERS_CORNER",
        "blitter": "CODERS_CORNER",
        "selfmod_code": "CODERS_CORNER",
        "bootblock": "CODERS_CORNER",
        "cracktro_ethics": "SCENE_RUMORS",
        "demo_vs_game": "CODERS_CORNER",
        "party_trip": "PARTY_GOSSIP",
        "car_breakdown": "PARTY_GOSSIP",
        "lost_source": "SCENE_RUMORS",
        "hdd_crash": "CODERS_CORNER",
        "last_minute": "PARTY_GOSSIP",
        "sponsor": "PARTY_GOSSIP",
        "gpu_shader": "CODERS_CORNER",
        "ai_art": "PIXEL_PERFECTION",
        "recruiting": "SCENE_RUMORS",
        "workbench": "PIXEL_PERFECTION",
        "release_announce": "TOOL_RELEASES",
        "flame_war": "SCENE_RUMORS",
        "collab_request": "SCENE_RUMORS",
        "sysop_discussion": "SCENE_RUMORS",
        "virus_remover": "TOOL_RELEASES",
        "gfx_format": "PIXEL_PERFECTION",
        "procedural_tex": "PIXEL_PERFECTION",
        "raymarching": "CODERS_CORNER",
        "sizecoding": "CODERS_CORNER",
        "preservation": "SCENE_RUMORS",
        "disappeared_demo": "SCENE_RUMORS",
        "emulator_accuracy": "CODERS_CORNER",
        "real_hardware": "CODERS_CORNER",
        "new_gfx_tablet": "PIXEL_PERFECTION",
    }
    return mapping.get(topic_cat, "CODERS_CORNER")


def info_type_for(topic_cat):
    mapping = {
        "hardware": "technical_discovery",
        "fasttracker_vs_it": "criticism",
        "protracker_packs": "tool_release",
        "copper": "technical_discovery",
        "blitter": "technical_discovery",
        "selfmod_code": "technical_discovery",
        "bootblock": "technical_discovery",
        "cracktro_ethics": "rumor",
        "demo_vs_game": "criticism",
        "party_trip": "party_gossip",
        "car_breakdown": "party_gossip",
        "lost_source": "leak",
        "hdd_crash": "rumor",
        "last_minute": "party_gossip",
        "sponsor": "party_gossip",
        "gpu_shader": "technical_discovery",
        "ai_art": "criticism",
        "recruiting": "rumor",
        "workbench": "criticism",
        "release_announce": "demo_announcement",
        "flame_war": "rumor",
        "collab_request": "rumor",
        "sysop_discussion": "party_gossip",
        "virus_remover": "tool_release",
        "gfx_format": "technical_discovery",
        "procedural_tex": "technical_discovery",
        "raymarching": "technical_discovery",
        "sizecoding": "technical_discovery",
        "preservation": "criticism",
        "disappeared_demo": "rumor",
        "emulator_accuracy": "technical_discovery",
        "real_hardware": "technical_discovery",
        "new_gfx_tablet": "tool_release",
    }
    return mapping.get(topic_cat, "rumor")


THREAD_TEMPLATES = [
    # --- Hardware failures at parties ---
    {
        "cat": "hardware",
        "topic": "HARDWARE FAILURES AT PARTIES: SHARE YOUR WORST MOMENT",
        "era": "mid",
        "messages": [
            ("FlameAlchemist", "My C64 PSU exploded during the compo playback at Assembly 92. The smoke cleared just in time for the audience to see my demo crash. 10/10 showmanship."),
            ("RasterRat", "Lost a 386 motherboard to a spilled beer at The Party 93. The demo still ran on the backup machine but at 12fps instead of 30. We placed 4th."),
            ("SysOp42", "[MOD NOTE] Lost a BBS node to a lightning strike during a party relay. The modem handshake was literally smoking. Keep your UPS backups charged."),
        ],
        "choices": [
            ("Share your own PSU disaster: Nothing builds character like a capacitor exploding in front of 200 people.", "support", "+10 Reputation (community bonding over hardware trauma)"),
            ("Argue that real pros bring backup PSUs: If you only pack one PSU for a party, you deserve the smoke.", "flame", "+5 Reputation (hardware preparedness recognized)"),
        ]
    },
    {
        "cat": "hardware",
        "topic": "VOODOO 1 OVERHEATING: IS THE HEATSINK A JOKE?",
        "era": "late",
        "messages": [
            ("RasterRat", "My Voodoo1 heatsink fell off during a 64K intro playback. The card survived but the demo had graphical artifacts for the last 30 seconds. The audience thought it was intentional."),
            ("Chaos", "The Voodoo1 heatsink is a sticker with a fin pattern printed on it. The thermal paste is a rumor. Upgrade to a real heatsink or watch your 3Dfx melt mid-compo."),
            ("ByteWizard", "Dropped a custom copper heatsink on my Voodoo1. Idles at 10 degrees cooler. The compo machine ran for 4 hours straight without a single glitch. Proper cooling wins demos."),
        ],
        "choices": [
            ("Custom cooling is the forgotten optimization. A cool GPU is a fast GPU.", "support", "+15 research points, +10 Reputation"),
            ("If your demo crashes from heat, it wasn't optimized enough. Code colder.", "flame", "+10 Reputation (hardcore credibility)"),
        ]
    },
    # --- FastTracker vs Impulse Tracker ---
    {
        "cat": "fasttracker_vs_it",
        "topic": "FASTTRACKER II vs IMPULSE TRACKER: THE FINAL FRONTIER",
        "era": "late",
        "messages": [
            ("ChipTuneKid", "FastTracker II 2.04 is peak tracker design. 32 channels, XM format, clean UI. Impulse Tracker 2.14 is just a bloated clone with a worse palette."),
            ("PulseWave", "Impulse Tracker has IT compression, sample synthesis, and 16-bit precision. FastTracker is a museum piece. The format comparison is not even close."),
            ("DemosceneHistorian", "Historically, FastTracker won the tracker wars in Europe while Impulse Tracker dominated North America. The format divide is cultural, not technical."),
        ],
        "choices": [
            ("FastTracker II for life. XM format modules have cleaner pattern structure.", "support", "+10 Music reputation, +5 Friendship with ChipTuneKid"),
            ("Impulse Tracker's sample synthesis is the future. FT2 is nostalgia.", "flame", "+10 Music reputation, +5 Friendship with PulseWave"),
        ]
    },
    {
        "cat": "fasttracker_vs_it",
        "topic": "XM vs IT FORMAT WAR: WHICH MODULE FORMAT WINS THE 64K COMPO?",
        "era": "late",
        "messages": [
            ("PulseWave", "IT format modules compress 40% better than XM because of the built-in predictor. For 64k intros, every byte matters. IT wins by a landslide."),
            ("Skaven", "XM has wider tool support. The plugin ecosystem is superior. Give me 32 channels of XM over 16 channels of IT any day. Quality over quantity."),
            ("ChipTuneKid", "Both formats are dead for modern intros anyway. 4k intros need procedural audio. But if you must pack a module, IT compression is the only honest choice."),
        ],
        "choices": [
            ("IT compression is the only rational choice for size-limited compos.", "support", "+15 research points (format optimization knowledge)"),
            ("XM tool ecosystem is unbeatable. Don't sacrifice workflow for 50KB.", "flame", "+10 Music reputation"),
        ]
    },
    # --- ProTracker sample packs ---
    {
        "cat": "protracker_packs",
        "topic": "BEST PROTRACKER SAMPLE PACKS OF 1992 — DROP YOUR LINKS",
        "era": "mid",
        "messages": [
            ("Drifter", "Just compiled a 500-sample pack from 14 different BBS nodes across Europe. Drum hits, synth stabs, vocal chops. Posted to the Swedish hub, grab it while the modem is free."),
            ("Purple Motion", "The quality of BBS sample packs varies wildly. I spent 3 hours curating 50 usable kicks from 200 downloaded samples. If you send me noise labelled as a hi-hat I will find your node and disconnect it."),
            ("PulseWave", "Protracker 2.3d with a good sample library is still the fastest way to prototype a demo soundtrack. 4 channels, 8-bit samples, unlimited creativity."),
        ],
        "choices": [
            ("Curate a sample pack for the community. Quality control is the unsung service.", "support", "+15 Reputation, +5 Music reputation"),
            ("Real musicians synthesize their drums. Sample packs are for beginners.", "flame", "+10 Reputation (purist credibility)"),
        ]
    },
    # --- Copper tricks ---
    {
        "cat": "copper",
        "topic": "DEEP COPPER: CHANGING 50 PALETTE ENTRIES PER SCANLINE ON AMIGA",
        "era": "mid",
        "messages": [
            ("CopperGhost", "The Copper can change palette entries every 3 DMA cycles if you interleave WAIT instructions properly. I've hit 52 color changes per scanline on an A500. No CPU needed."),
            ("Chaos", "Forget palette tricks. The Copper can drive sprite positioning, blitter activation, even audio channel gating. It is a second CPU that nobody fully documents."),
            ("RasterRat", "Copper-driven vertical raster splits are the closest we get to hardware multi-threading in 1993. A well-written copper list is a work of art."),
        ],
        "choices": [
            ("The Copper is the Amiga's secret weapon. Document your techniques!", "support", "+15 research points, +5 Friendship with CopperGhost"),
            ("CPU-driven raster splits are more flexible than any copper list.", "flame", "+10 Reputation (coder credibility)"),
        ]
    },
    {
        "cat": "copper",
        "topic": "COPPER BARS IN 2023: STILL THE BEST WAY TO TEST A PALETTE?",
        "era": "modern",
        "messages": [
            ("CopperGhost", "Even in 2023, the first thing I write when testing a new palette is a copper bar gradient. 20 years later and nothing beats it for checking color ramps."),
            ("RasterRat", "Modern shaders can do copper effects in 3 lines of GLSL, but the spirit of the Copper lives on. Procedural palette generation is copper thinking."),
            ("DemosceneHistorian", "The Copper coprocessor on the Amiga could modify 8 palette entries per scanline without any CPU intervention. Modern GPUs use the same principle for shader constants. The more things change..."),
        ],
        "choices": [
            ("Copper thinking applies to modern shaders. Understand the history to innovate the future.", "support", "+15 research points"),
            ("GLSL makes copper effects trivial. The Amiga was hardware hacking, modern is just API calls.", "flame", "+10 Reputation (oldschool credibility)"),
        ]
    },
    # --- Blitter tricks ---
    {
        "cat": "blitter",
        "topic": "AMIGA BLITTER ABUSE: 7 UNEXPECTED USES FOR DMA COPIES",
        "era": "mid",
        "messages": [
            ("ByteWizard", "The blitter can do BOB collision detection in parallel with the CPU running your game logic. It's a DMA co-processor that scene coders barely scratch the surface of."),
            ("CopperGhost", "Using the blitter to clear bitplanes while the Copper changes palette and the CPU runs a sine scroller is the holy trinity of Amiga optimization. All three run in parallel."),
            ("Chaos", "Blitter + Copper + CPU: the Amiga's triple-core architecture that nobody documents properly. Each one runs independently. The scene needs a proper guide on blitter timing."),
        ],
        "choices": [
            ("Write a blitter abuse tutorial for the BBS. Parallel DMA knowledge is power.", "support", "+15 research points, +10 Reputation"),
            ("CPU-only rendering is purer. The blitter is a crutch for coders who can't optimize.", "flame", "+10 Reputation (purist stance)"),
        ]
    },
    # --- Self-modifying 68000 code ---
    {
        "cat": "selfmod_code",
        "topic": "SELF-MODIFYING 68000 CODE: LEGITIMATE OR BLASPHEMY?",
        "era": "mid",
        "messages": [
            ("ByteWizard", "Self-modifying code on the 68000 is the ultimate optimization. Rewrite branch targets on the fly, inline function calls dynamically. The instruction cache doesn't care."),
            ("Chaos", "Self-modifying code is a debugging nightmare. I spent 2 weeks tracking down a bug that was the code rewriting itself incorrectly. Never again."),
            ("RasterRat", "On the Amiga 500 with no cache, self-modifying code is free performance. On a 68020 with cache? You need to flush the cache manually. Know your hardware before you try this."),
        ],
        "choices": [
            ("Self-modifying code is the peak of demoscene optimization. Embrace it.", "support", "+15 research points, +10 Reputation"),
            ("Readability matters. Self-modifying code is a maintenance disaster.", "flame", "+5 Reputation (pragmatic credibility)"),
        ]
    },
    # --- Bootblock programming ---
    {
        "cat": "bootblock",
        "topic": "BOOTBLOCK PROGRAMMING: THE ULTIMATE CONSTRAINT PUZZLE",
        "era": "early",
        "messages": [
            ("Ranger", "A C64 bootblock has 128 bytes before it needs a loader. I packed a full sine scroller in 128 bytes. No loader needed. Just insert the disk and watch."),
            ("CrashOverride", "Bootblock coding is the original 128-byte intro. Before we had 4K compos, we had bootblocks. The scene forgot its roots."),
            ("ByteWizard", "The Amiga bootblock has 1024 bytes, which feels luxurious until you try to pack a full demo into it. Bootblock intros are the purest form of size coding."),
        ],
        "choices": [
            ("Bootblock coding is the foundation of the scene. Respect the roots.", "support", "+15 research points, +10 Reputation"),
            ("Bootblocks are obsolete relics. Modern demos don't need to fit on a floppy.", "flame", "+5 Reputation (modernist stance)"),
        ]
    },
    # --- Cracktro ethics ---
    {
        "cat": "cracktro_ethics",
        "topic": "CRACKTRO ETHICS: IS IT ART OR JUST PRAISE FOR PIRACY?",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "The cracktro was the gateway drug for an entire generation of demosceners. Without the cracking scene's distribution networks, the demo scene would never have reached Europe."),
            ("FlameAlchemist", "Cracktros are art. The scrolling text, the copper logos, the custom music. Piracy is how they spread, but the craft is genuine. Judge the code, not the distribution method."),
            ("SysOp42", "[MOD NOTE] This board does not condone piracy, but cracktro technique discussion is permitted as a technical art form. Keep it civil and keep it code-focused."),
        ],
        "choices": [
            ("Cracktros are a legitimate art form. The scene was built on them.", "support", "+15 Reputation"),
            ("Demo sceners should distance from the cracking scene. The art stands on its own.", "flame", "+10 Reputation (purist stance)"),
        ]
    },
    # --- Demo vs game programming ---
    {
        "cat": "demo_vs_game",
        "topic": "DEMO CODING vs GAME PROGRAMMING: WHICH IS HARDER?",
        "era": "mid",
        "messages": [
            ("Chaos", "Game programming is about handling 10,000 edge cases. Demo coding is about making one thing absolutely perfect. Both are hard, but demo coding demands cycle perfection."),
            ("RasterRat", "I wrote a game once. The engine was easier than a 64K intro but the design documentation was 200 pages. Demo coding is compression, game coding is expansion."),
            ("ByteWizard", "A demo coder can write a game engine. A game programmer cannot write a 4K intro. The skill sets overlap but the constraints are different dimensions."),
        ],
        "choices": [
            ("Demo coding is harder because of constraints. 4K intros prove it.", "support", "+15 Reputation (scene pride)"),
            ("Game programming has harder engineering problems. Scale is its own challenge.", "flame", "+5 Reputation (balanced view)"),
        ]
    },
    # --- Assembly party trip planning ---
    {
        "cat": "party_trip",
        "topic": "ASSEMBLY 94 TRIP PLANNING: CARPOOL FROM GERMANY?",
        "era": "mid",
        "messages": [
            ("Hype", "I'm driving from Hamburg to Assembly 94 with space for 3 more coders. Split the petrol 4 ways. Bring your own sleeping bag and at least one unreleased demo."),
            ("Vectra", "Train from Amsterdam to Helsinki is 28 hours. Car share is the only sane option. I can fit 2 people and 4 computers in my Opel. Max 2 monitors though."),
            ("Ranger", "Taking the ferry from Stockholm to Helsinki with my C64 in a backpack. Anyone done this before? Are there power outlets on the boat? I need to test my intro during the crossing."),
        ],
        "choices": [
            ("Join the carpool. Road trips build the strongest scene friendships.", "support", "+20 Reputation, +10 Friendship with Hype"),
            ("Fly solo. The journey is part of the demo experience. Suffer for your art.", "flame", "+10 Reputation (independent spirit)"),
        ]
    },
    {
        "cat": "party_trip",
        "topic": "BREAKPOINT 2002 ARRIVAL — WHO IS BRINGING THE PROJECTOR?",
        "era": "late",
        "messages": [
            ("Hype", "The venue says they have a projector but it's an ancient CRT beamer. I'm bringing my own 1500-lumen LCD projector. Split the rental cost and we guarantee good visuals."),
            ("Vectra", "Last year someone's demo looked terrible because the projector color profile was wrong. If you're showing a 4K intro, calibrate your palette to the venue's equipment."),
            ("SysOp42", "[LOGISTICS] The venue's projector supports 800x600 max. If your demo runs at 1024x768, prepare a fallback resolution. Test on the compo machine during setup day."),
        ],
        "choices": [
            ("Professional projection logistics separate amateur parties from legendary ones.", "support", "+15 Reputation (organizer credibility)"),
            ("Real demos look good on any display. If it needs calibration, it's not optimized.", "flame", "+10 Reputation (hardcore stance)"),
        ]
    },
    # --- Car breakdowns on the way to parties ---
    {
        "cat": "car_breakdown",
        "topic": "CAR BROKE DOWN EN ROUTE TO THE PARTY: SCENE SAVIOR STORIES",
        "era": "mid",
        "messages": [
            ("Hype", "My car's alternator died 50km from Assembly 93. A Finnish scener picked us up in a van with 6 other coders. We made it just in time for the compo deadline. The scene takes care of its own."),
            ("Vectra", "Stranded at a gas station in rural Sweden at 3am with a dead battery. A sysop from a local BBS node recognized my handle and jumped my car. BBS networks save lives."),
            ("FlameAlchemist", "Your car breaking down is a sign. The demo gods do not want you to compete. Listen to them and stay home. I once missed a party and the winning demo was terrible. Fate is real."),
        ],
        "choices": [
            ("The scene community is the best safety net. We help each other get to parties.", "support", "+20 Reputation, +5 Friendship with Hype"),
            ("If you can't handle the logistics of a road trip, you can't handle a compo.", "flame", "+5 Reputation (tough love)"),
        ]
    },
    # --- Lost source code ---
    {
        "cat": "lost_source",
        "topic": "LOST SOURCE CODE: WHICH CLASSIC DEMO IS GONE FOREVER?",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "The source code for Future Crew's 'Unreal' was lost when the lead coder's hard drive crashed in 1992. No backups. One of the most influential PC demos ever, gone."),
            ("RasterRat", "I lost the source to my best 64K intro when my floppy disk developed bad sectors. The demo is preserved on BBS archives but the code is gone forever. Learn from my pain: back up to 3 different nodes."),
            ("Chaos", "Source loss is the scene's silent tragedy. We preserve binaries but the craftsmanship inside is lost. Every unreleased source is a library of techniques we'll never read again."),
        ],
        "choices": [
            ("Archive your source code to multiple BBS nodes. Future sceners will thank you.", "support", "+15 research points, +10 Reputation"),
            ("The binary is the final art. The source is just scaffolding. Let it go.", "flame", "+5 Reputation (artist purity)"),
        ]
    },
    # --- Hard drive crashes ---
    {
        "cat": "hdd_crash",
        "topic": "HARD DRIVE CRASH DISASTER: RECOVERY TIPS FOR SCENERS",
        "era": "late",
        "messages": [
            ("ByteWizard", "My 2GB Quantum Fireball died 3 days before a compo deadline. Lost 6 months of work. I recovered 40% with SpinRite but the demo structure was corrupted beyond repair."),
            ("Chaos", "Had a hard drive crash 2 weeks before Assembly 98. Rewrote the entire demo in 12 days. The rushed version placed 3rd. Sometimes a crash forces you to make better decisions."),
            ("CrashOverride", "Hard drives that fail before a deadline were not scene-approved. Real sceners use SCSI drives with parity checking. IDE is for amateurs. RAID-0 is for people who hate their data."),
        ],
        "choices": [
            ("Always have an offsite backup. BBS nodes are free storage. Use them.", "support", "+15 research points, +10 Reputation"),
            ("If you don't have 3 backups, you don't care about your code. No sympathy.", "flame", "+5 Reputation (strict stance)"),
        ]
    },
    # --- Last-minute competition entries ---
    {
        "cat": "last_minute",
        "topic": "LAST MINUTE COMPO ENTRIES: HEROIC OR IRRESPONSIBLE?",
        "era": "mid",
        "messages": [
            ("CrashOverride", "I submitted my 64K intro 3 minutes before the deadline at Assembly 95. The compile finished on the compo machine during the upload. That intro placed 2nd. Pressure creates diamonds."),
            ("Hype", "Last-minute entries stress out the organizers. We have to test them on the compo machine and if yours crashes, it takes time from everyone. Please respect the deadline."),
            ("FlameAlchemist", "If you're finishing your demo at the party, your planning is the problem. The deadline is not a suggestion. The compo machine is not your development environment."),
        ],
        "choices": [
            ("Deadlines exist for a reason. Respect your fellow competitors and the organizers.", "support", "+15 Reputation (respect from organizers)"),
            ("The best demos are finished in the final hour. Pressure is the ultimate optimizer.", "flame", "+10 Reputation (heroic coder credibility)"),
        ]
    },
    # --- Sponsor announcements ---
    {
        "cat": "sponsor",
        "topic": "BREAKPOINT 2001 SPONSOR ANNOUNCEMENT: NEW COMPO PRIZES",
        "era": "late",
        "messages": [
            ("Hype", "Just secured a sponsorship deal with a local computer retailer. They're donating 10 cases of blank CDs, 5 sound cards, and $500 cash for the 4K compo prizes. Scene resources are growing!"),
            ("Vectra", "Sponsors are great until they want to dictate compo rules. Keep them at arm's length. The scene decides the categories, not the companies writing cheques."),
            ("SysOp42", "[INFO] The Breakpoint organizing team has confirmed sponsorship from a major hardware vendor. Details to follow. No rule changes planned. The scene retains creative control."),
        ],
        "choices": [
            ("Sponsorship grows the scene. More prizes = more entries = better compos.", "support", "+15 Reputation, +10 Money"),
            ("Corporate money corrupts the scene. Keep it underground, keep it pure.", "flame", "+15 Reputation (purist credibility)"),
        ]
    },
    # --- GPU shader experiments ---
    {
        "cat": "gpu_shader",
        "topic": "GPU SHADER EXPERIMENTS: PIXEL SHADER 2.0 IS A GAME CHANGER",
        "era": "modern",
        "messages": [
            ("Chaos", "Pixel shader 2.0 on the Radeon 9700 lets you write 512 instructions per pass. That is enough for a full per-pixel lighting model in one shader. The fixed-function pipeline is officially obsolete."),
            ("RasterRat", "Shader Model 3.0 on GeForce 6 series adds dynamic branching. If your shader can't conditionally skip pixels in 2004, you are writing museum code."),
            ("ByteWizard", "I ported a 64K intro effect to GLSL. 15 lines of shader code replaced 200 lines of assembly. The GPU does in one cycle what the CPU does in 50. Embrace the future."),
        ],
        "choices": [
            ("Shader programming is the new assembly. Master it or become irrelevant.", "support", "+15 research points, +10 Reputation"),
            ("Fixed-function pipeline teaches real graphics fundamentals. Shaders are too abstract.", "flame", "+10 Reputation (oldschool credibility)"),
        ]
    },
    # --- AI-assisted art debates (2020s) ---
    {
        "cat": "ai_art",
        "topic": "AI-ASSISTED ART IN DEMOS: INNOVATION OR CHEATING?",
        "era": "modern",
        "messages": [
            ("Trix", "If you use Stable Diffusion to generate textures for your demo, you are not a pixel artist. You are a prompt engineer. The scene is about human craft, not machine generation."),
            ("Vectra", "Procedural generation has been part of the scene since 1992. AI is just procedural generation with better inputs. The purists said the same thing about shaders in 2002."),
            ("DemosceneHistorian", "The line between procedural and AI is blurry. 4K intros have used noise functions for decades. AI models are just more complex noise functions. The craft is in the curation."),
        ],
        "choices": [
            ("AI is a tool. The artist still curates the result. Embrace the new medium.", "support", "+15 research points, +10 Reputation (progressive)"),
            ("AI-generated assets have no soul. The demoscene is about human creativity.", "flame", "+15 Reputation (purist stance)"),
        ]
    },
    # --- Recruiting musicians or graphicians ---
    {
        "cat": "recruiting",
        "topic": "LOOKING FOR A TRACKER MUSICIAN: CODERS CORNER WANTED",
        "era": "mid",
        "messages": [
            ("Hype", "Our demo group needs a musician for our Assembly 95 entry. Must know Protracker 2.3d, able to write 4-channel modules in under 3 minutes. Free beer and BBS credits provided."),
            ("PulseWave", "I am a tracker musician looking for a group. My style is melodic chiptune with heavy reverb. Compatible with FastTracker II and Protracker. Sample my work on the German BBS node."),
            ("ChipTuneKid", "Good tracker musicians are harder to find than good coders. If you can write a module that syncs to a demo timeline, you are worth 3 coders. The market rate is $0 but the respect is eternal."),
        ],
        "choices": [
            ("Offer to collaborate. Every group needs a good musician. Network actively.", "support", "+20 Friendship, +10 Music reputation"),
            ("Real musicians use real instruments. Trackers are a toy for bedroom producers.", "flame", "-10 Reputation (controversial take)"),
        ]
    },
    # --- Show your workbench setup ---
    {
        "cat": "workbench",
        "topic": "SHOW YOUR WORKBENCH: POST YOUR DEMOCODING SETUP",
        "era": "late",
        "messages": [
            ("Vectra", "My setup: Pentium II 300MHz, 64MB RAM, Voodoo 2, Sound Blaster AWE64, 17-inch CRT, and a stack of blank CD-Rs. The desk is held together by zip ties and debug ambition."),
            ("RasterRat", "Dual monitor setup in 1998: one CRT for code, one CRT for the demo output. The second monitor cost me $200 and I carry it to every party. Worth every pound."),
            ("ByteWizard", "My workbench has 3 machines: a C64 for bootblock testing, an Amiga 500 for copper development, and a Pentium II for the actual 4k intro. Cable management is not a priority."),
        ],
        "choices": [
            ("A well-organized workbench is the foundation of great demos. Share your setup tips!", "support", "+10 Reputation, +5 Research points"),
            ("The code matters, not the desk. A great demo runs on any machine.", "flame", "+5 Reputation (minimalist stance)"),
        ]
    },
    # --- Release announcements ---
    {
        "cat": "release_announce",
        "topic": "RELEASE ANNOUNCEMENT: TRSI DROPS NEW 64K AT BREAKPOINT 2000",
        "era": "late",
        "messages": [
            ("CrashOverride", "Our new 64K is done. 62,472 bytes of pure procedural everything. Voxel terrain, real-time shadow mapping, and a soundtrack that will make your GUS card cry."),
            ("FlameAlchemist", "Let me guess: procedural terrain, a tunnel effect, and a scroller that thanks every BBS node in Europe. Originality is dead. Long live the format."),
            ("DemosceneHistorian", "The 64K format at Breakpoint 2000 is the most competitive it has ever been. 40+ entries expected. If your demo doesn't have at least one original technique, don't bother submitting."),
        ],
        "choices": [
            ("Congratulate the release. Every demo is a victory for the scene.", "support", "+15 Reputation, +5 Friendship with CrashOverride"),
            ("Critique the technique: Voxel terrain is overused. Show us something new.", "flame", "+10 Reputation (critical eye)"),
        ]
    },
    # --- Rival group flame wars ---
    {
        "cat": "flame_war",
        "topic": "FUTURE CREW vs FARBRAUSCH: THE ULTIMATE 64K SHOWDOWN",
        "era": "late",
        "messages": [
            ("CrashOverride", "Future Crew invented the 64K format but Farbrausch perfected it. 'Debris' at Breakpoint 2000 changed everything. Everything before is a prototype."),
            ("FlameAlchemist", "Future Crew's 'Panic' from 1993 was the first real 64K intro. Farbrausch just used better tools. If you had the same toolchain, your grandma could make a 64K intro."),
            ("DemosceneHistorian", "Historical fact: 'Panic' by Future Crew (1993) was the first 64K intro at a major party. 'Debris' by Farbrausch (2000) set the modern standard. Both are essential viewing."),
        ],
        "choices": [
            ("Farbrausch raised the bar for everyone. 'Debris' is a masterpiece.", "support", "+15 Reputation, +10 Research points"),
            ("Future Crew's 'Panic' did it first with worse tools. That is real skill.", "flame", "+15 Reputation (oldschool credibility)"),
        ]
    },
    # --- Collaboration requests ---
    {
        "cat": "collab_request",
        "topic": "LOOKING FOR A GFX ARTIST FOR A JOINT 64K INTRO",
        "era": "late",
        "messages": [
            ("Hype", "Our group has the coders and the musician, but our pixel artist left for another crew. We need someone who can do procedural textures and palette work. Join us and share the credit."),
            ("Trix", "I'll do your pixel art in exchange for hosting on your BBS node. I need a permanent upload slot with 1200 baud minimum. My current sysop keeps disconnecting me during large transfers."),
            ("Vectra", "Collaboration is the scene's greatest strength. Two groups working together produce better demos than either would alone. Share knowledge, share credit, win together."),
        ],
        "choices": [
            ("Offer your services. Collaboration builds the strongest bonds in the scene.", "support", "+20 Friendship, +15 Reputation"),
            ("Solo groups produce more cohesive work. Too many cooks ruin the demo.", "flame", "+5 Reputation (independent stance)"),
        ]
    },
    # --- BBS sysop discussions ---
    {
        "cat": "sysop_discussion",
        "topic": "BBS SYSOP DISCUSSION: HOW MANY NODES DO YOU RUN?",
        "era": "mid",
        "messages": [
            ("SysOp42", "I run 3 BBS nodes across 2 countries. The Swedish node gets 400 calls a day during party season. The hardware is aging but the community keeps it alive."),
            ("Hype", "Running a BBS node is a 24/7 commitment. The modem lines need maintenance, the message bases need moderation, and the file library needs curation. It's a second job."),
            ("ByteWizard", "SysOps are the unsung heroes of the scene. Without BBS nodes, demo distribution dies. My local sysop let me download 'Second Reality' 2 weeks before Assembly. That changed my life."),
        ],
        "choices": [
            ("SysOps are the backbone of the scene. Respect your node operator.", "support", "+15 Reputation, +10 Friendship with SysOp42"),
            ("BBS nodes are obsolete. IRC and FTP are the future. Adapt or die.", "flame", "+5 Reputation (progressive stance)"),
        ]
    },
    # --- Virus removers and antivirus tools ---
    {
        "cat": "virus_remover",
        "topic": "NEW VIRUS REMOVER TOOL: SCAN YOUR SWAP DISKS BEFORE IT'S TOO LATE",
        "era": "mid",
        "messages": [
            ("ByteWizard", "Just released a bootblock virus scanner for Amiga. Checks the first 1024 bytes of every disk and compares against 47 known virus signatures. Uploaded to the Finnish BBS node."),
            ("CrashOverride", "Virus scanners are for cowards. A real scencer can hex-edit a disk and spot the infection by reading the bootblock. If you cannot identify a virus by raw hex, you do not deserve clean disks."),
            ("DemosceneHistorian", "The SCA virus infected 70% of Amiga floppies in Europe by 1991. Antivirus tools are not cowardice, they are survival. The scene needs sanitation infrastructure."),
        ],
        "choices": [
            ("Antivirus tools are essential infrastructure. Download and distribute widely.", "support", "+15 Reputation, +15 Research points"),
            ("Hex editing skills make antivirus software unnecessary. Learn to read raw bytes.", "flame", "+10 Reputation (oldschool credibility)"),
        ]
    },
    # --- New graphics formats ---
    {
        "cat": "gfx_format",
        "topic": "PNG vs BMP vs TGA: BEST FORMAT FOR DEMO TEXTURES IN 2020?",
        "era": "modern",
        "messages": [
            ("Trix", "PNG is the only format worth using for demo textures. Lossless compression, alpha channel, wide tool support. BMP is for amateurs and TGA is for people stuck in 1998."),
            ("Vectra", "For 4K intros, you can't use any of them. You need raw procedural generation. But for larger demos, PNG with palette indexing gives the best quality-to-size ratio."),
            ("RasterRat", "DDS with DXTC compression is the only format that GPUs natively understand. Loading a PNG and converting it at runtime wastes cycles your demo could use for rendering."),
        ],
        "choices": [
            ("DDS with hardware compression is the professional choice for modern demos.", "support", "+15 research points, +10 Reputation"),
            ("PNG is the universal standard. DDS is vendor lock-in for DirectX demos.", "flame", "+5 Reputation (open standards stance)"),
        ]
    },
    # --- Procedural texture techniques ---
    {
        "cat": "procedural_tex",
        "topic": "PROCEDURAL TEXTURE TECHNIQUES: BEYOND PERLIN NOISE",
        "era": "late",
        "messages": [
            ("Chaos", "Perlin noise is the 'hello world' of procedural texturing. Real pros use Worley noise, Gabor noise, and cellular automata. A palette of 3 noise types can generate infinite variety."),
            ("Trix", "Domain warping a simple noise function produces textures that look hand-painted. Apply 2 layers of FBM noise, warp the coordinates with a third layer, and the result is pure alchemy."),
            ("RasterRat", "Procedural textures in 64K intros are the highest form of pixel art. No samples, no external assets, just math and palette. Every pixel is intentionally generated."),
        ],
        "choices": [
            ("Domain warping is the secret sauce. Layer noise like a pro.", "support", "+20 research points, +10 Reputation"),
            ("Hand-drawn pixel art has more soul than any procedural generation.", "flame", "+10 Reputation (traditionalist stance)"),
        ]
    },
    # --- Raymarching discoveries ---
    {
        "cat": "raymarching",
        "topic": "RAYMARCHING DISCOVERIES: NEW DISTANCE ESTIMATOR FOR FRACTALS",
        "era": "modern",
        "messages": [
            ("Chaos", "Just discovered a distance estimator for 4D Julia sets that runs in 5 iterations instead of 30. The secret is in the gradient normalization. Posting the GLSL to the shader board."),
            ("ByteWizard", "Raymarching in GLSL is the 4K intro's best friend. 50 lines of code generates infinite fractal landscapes. The technique is 20 years old but shaders made it practical."),
            ("RasterRat", "Box-marching a signed distance field with soft shadows is the closest we get to photorealism in a 4K intro. The math is dense but the results are worth the headache."),
        ],
        "choices": [
            ("Raymarching is the ultimate 4K intro technique. Push the boundaries.", "support", "+20 research points, +15 Reputation"),
            ("Polygon rendering is more versatile. Raymarching is a niche party trick.", "flame", "+5 Reputation (pragmatic stance)"),
        ]
    },
    # --- Sizecoding challenges ---
    {
        "cat": "sizecoding",
        "topic": "SIZECODING CHALLENGE: 256 BYTE INTRO COMPO NEXT MONTH",
        "era": "late",
        "messages": [
            ("Chaos", "256 bytes for a demo. No external data, no samples, no libraries. Pure bootable binary. The only tools allowed are a hex editor and raw determination."),
            ("CrashOverride", "I managed to fit a starfield, a sine scroller, and 4-channel audio in 248 bytes on the C64. The trick is reusing every register as a counter and every byte as multiple instructions."),
            ("ByteWizard", "Sizecoding is the purest form of demoscene programming. Every byte is a decision. Every optimization is a discovery. The 256-byte compo is harder than any 64K compo and twice as rewarding."),
        ],
        "choices": [
            ("Join the 256-byte compo. The constraints make you a better coder.", "support", "+20 research points, +15 Reputation"),
            ("Sizecoding is a novelty category. Real demos need more than 256 bytes.", "flame", "+5 Reputation (pragmatic stance)"),
        ]
    },
    {
        "cat": "sizecoding",
        "topic": "1K INTRO TIPS: PACKING A FULL DEMO IN 1024 BYTES",
        "era": "modern",
        "messages": [
            ("ByteWizard", "The secret to 1K intros is using the GPU as a code generator. 512 bytes of shader code can produce 10 minutes of unique visuals. The CPU just sets up the OpenGL context."),
            ("Chaos", "My 1K intro at Revision 2016 used a single GLSL shader that generated everything: the music, the visuals, the timing. No CPU code at all beyond the window setup. Pure shader magic."),
            ("CrashOverride", "1K intros are about removing everything that is not essential. If a feature is not in the final binary, you did not want it enough. Delete aggressively."),
        ],
        "choices": [
            ("GLSL-only 1K intros are the future. The CPU is just the bootloader.", "support", "+20 research points, +15 Reputation"),
            ("Real 1K intros write everything in assembly. Shader-based is cheating.", "flame", "+10 Reputation (oldschool credibility)"),
        ]
    },
    # --- Old production preservation ---
    {
        "cat": "preservation",
        "topic": "OLD PRODUCTION PRESERVATION: DIGITIZING FLOPPY ARCHIVES",
        "era": "modern",
        "messages": [
            ("DemosceneHistorian", "I am digitizing my collection of 2000+ floppy disks from 1985-1995. Using a Greaseweazle to read each disk at the flux level. About 40% have bad sectors but every recovered byte is history saved."),
            ("RasterRat", "The scene is losing its history. Hard drives fail, floppies degrade, BBS nodes go offline. If you have old demos on disks, digitize them NOW. The format is decaying faster than we can preserve."),
            ("SysOp42", "[ARCHIVE NOTICE] The scene history archive is accepting donations of old floppy disks and CD-ROMs. We have a Greaseweazle setup and a clean room for media recovery. Ship your collections to the German archive node."),
        ],
        "choices": [
            ("Donate your old disks to the archive. Scene history is irreplaceable.", "support", "+20 Reputation, +10 Research points"),
            ("Emulation is good enough for preservation. Physical media is romanticism.", "flame", "+5 Reputation (pragmatic stance)"),
        ]
    },
    # --- Demos that mysteriously disappeared ---
    {
        "cat": "disappeared_demo",
        "topic": "MYSTERIOUS DISAPPEARED DEMOS: UNFINISHED LEGENDS",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "Whatever happened to 'Enlightenment' by the Dutch group Synergy? The preview at Assembly 91 was incredible. The group disbanded and the demo never released. Lost to time."),
            ("RasterRat", "There was a Polish demo called 'Black Lotus' that was supposed to debut at The Party 94. The lead coder was conscripted into the army. The project vanished. I still have the preview disk."),
            ("Chaos", "Unfinished demos are the scene's ghost stories. Everyone has one that got away. If you have a demo that was 90% complete and never shipped, post it to the archive. 90% is better than 0%."),
        ],
        "choices": [
            ("Release your unfinished demos. Even incomplete works teach the next generation.", "support", "+15 Reputation, +10 Research points"),
            ("Unfinished demos are unfinished for a reason. The artist chose not to ship it.", "flame", "+5 Reputation (artist respect)"),
        ]
    },
    # --- Emulator accuracy discussions ---
    {
        "cat": "emulator_accuracy",
        "topic": "EMULATOR ACCURACY: DOES WINUAE MATCH REAL AMIGA HARDWARE?",
        "era": "modern",
        "messages": [
            ("Ranger", "WinUAE 3.0 is 99% accurate for A500 cycle-exact emulation, but there are edge cases with Copper timing that diverge from real hardware. My demo works perfectly in WinUAE but glitches on a real A1200."),
            ("ByteWizard", "Cycle-exact emulation changed the preservation game. Without WinUAE, half of the Amiga demo library would be unplayable today. The remaining 1% inaccuracy is acceptable for archiving."),
            ("Chaos", "Emulation accuracy is a spectrum. 95% is good enough for gameplay but not good enough for demo compos. If your demo must run on real hardware, test on real hardware. Period."),
        ],
        "choices": [
            ("Cycle-exact emulation is good enough for development but real hardware testing is essential for compos.", "support", "+15 research points, +10 Reputation"),
            ("If it works in emulation but not on real hardware, the code has a bug. Fix it.", "flame", "+10 Reputation (purist stance)"),
        ]
    },
    # --- Real hardware compatibility ---
    {
        "cat": "real_hardware",
        "topic": "REAL HARDWARE COMPATIBILITY: TESTING DEMOS ON EVERYTHING",
        "era": "modern",
        "messages": [
            ("ByteWizard", "My demo runs on a Pentium III, Athlon XP, and Pentium 4. The VIA C3 compatibility? Tested. The Transmeta Crusoe? Also tested. Real hardware testing catches bugs no emulator finds."),
            ("RasterRat", "I have a collection of 12 different graphics cards for testing: Voodoo 1-3, Riva TNT, GeForce 256, Radeon 7500. The driver differences between them are astonishing."),
            ("Chaos", "Real hardware testing is a privilege. Not everyone can afford 12 graphics cards. But if you are shipping a compo entry, test on at least 3 different systems. The compo machine is never what you expect."),
        ],
        "choices": [
            ("Hardware testing is the mark of a professional demo coder. Respect.", "support", "+15 Reputation, +10 Research points"),
            ("Write standards-compliant code and it runs everywhere. Hardware testing is paranoia.", "flame", "+5 Reputation (confidence)"),
        ]
    },
    # --- New graphics tablet recommendations ---
    {
        "cat": "new_gfx_tablet",
        "topic": "NEW GRAPHICS TABLET: WACOM vs TRUST FOR PIXEL ART?",
        "era": "late",
        "messages": [
            ("Trix", "Just got a Wacom Graphire 2. The pressure sensitivity is a game changer for pixel art shading. My gradient work improved 50% in the first week. Worth the $80."),
            ("Vectra", "A mouse is fine for pixel art. Tablets are for photo editors. Real pixel artists can draw straight lines with a mouse. If you need a tablet, your hand is not steady enough."),
            ("RasterRat", "I use a Trust tablet from 1995. It has no pressure sensitivity and the driver is for Windows 3.1. But it cost $20 and works perfectly for pixel work. Price is not quality."),
        ],
        "choices": [
            ("A Wacom tablet is worth the investment for serious pixel work.", "support", "+10 Reputation, +5 Art reputation"),
            ("Real pixel artists use a mouse. A tablet is training wheels.", "flame", "+5 Reputation (oldschool credibility)"),
        ]
    },
]

def generate_thread(idx, template):
    cat = template["cat"]
    topic = template["topic"]
    era = template["era"]
    year = pick_era_year(era)
    month = random.randint(1, 12)
    actor = random.choice(ACTORS)
    board = board_for_topic(cat)
    info_type = info_type_for(cat)

    # Generate messages
    msgs = template["messages"]

    # Generate choices
    choices = template["choices"]

    # Random but reasonable info economy values
    credibility = random.randint(30, 90)
    speed = random.randint(30, 95)
    distortion = random.randint(10, 70)
    influence = random.randint(30, 90)
    viral = random.randint(1, 3)

    yield f"    {{"
    yield f"      id: \"thread_{cat}_{idx}\","
    yield f"      board: \"{board}\","
    yield f"      topic: \"{topic}\","
    yield f"      year: {year},"
    yield f"      month: {month},"
    yield f"      actorId: \"{actor}\","
    yield f"      messages: ["
    for sender, text in msgs:
        color = NPC_COLORS.get(sender, "text-zinc-400")
        yield f"        {{ sender: \"{sender}\", text: \"{text}\", color: \"{color}\" }},"
    yield f"      ],"
    yield f"      interacted: false,"
    yield f"      playerActionTaken: null,"
    yield f"      dramaFinished: false,"
    yield f"      choices: ["
    for ctext, ctype, ceffect in choices:
        yield f"        {{ text: \"{ctext}\", type: \"{ctype}\", effectDescription: \"{ceffect}\" }},"
    yield f"      ],"
    yield f"      infoType: \"{info_type}\","
    yield f"      credibilityScore: {credibility},"
    yield f"      propagationSpeed: {speed},"
    yield f"      distortionRate: {distortion},"
    yield f"      influenceWeight: {influence},"
    yield f"      viralSpreadRank: {viral},"
    yield f"      isSuppressed: false,"
    yield f"      originalTopic: \"{topic}\","
    yield f"      mutationCount: 0,"
    yield f"    }},"
    # === MUSIC GEAR DEBATES ===
    {
        "cat": "protracker_packs",
        "topic": "SID CHIP vs FM SYNTH: WHICH SOUND ARCHITECTURE WINS?",
        "era": "early",
        "messages": [
            ("Drifter", "The C64 SID has 3 voices, analog filters, and the most distinctive sound in computing history. FM synthesis is cold and clinical. SID has soul."),
            ("ChipTuneKid", "FM synthesis on the YM2151 and OPL3 has 4 operators per channel. The 8-bit SID can't compete with the harmonic complexity of FM. It is physics."),
            ("Purple Motion", "Both are valid. SID for emotional leads, FM for percussive bass. The real art is combining both in a single module. No tracker does it well."),
        ],
        "choices": [
            ("SID filters and analog warmth make it the only choice for scene music.", "support", "+10 Music reputation, +5 Friendship with Drifter"),
            ("FM synthesis has more depth and range. SID is just nostalgia.", "flame", "+10 Music reputation, +5 Friendship with ChipTuneKid"),
        ]
    },
    {
        "cat": "fasttracker_vs_it",
        "topic": "TRACKERS vs DAWs: IS THE MODULE FORMAT DEAD IN 2020?",
        "era": "modern",
        "messages": [
            ("PulseWave", "Trackers are not dead. Renoise and OpenMPT prove that the tracker paradigm is still valid. FL Studio is a tracker with a fancy UI. The pattern grid is the same."),
            ("ChipTuneKid", "DAWs have better automation, better plugin support, and better sample editing. Trackers are a museum piece for oldschool sceners who refuse to learn new tools."),
            ("Purple Motion", "The module format is alive inside every 4K intro. Procedural audio generation is the evolution of tracking. The tool changed but the constraint philosophy lives on."),
        ],
        "choices": [
            ("Trackers are the most efficient music production tool ever. Modules in 200KB beat DAW projects in 2GB.", "support", "+15 Music reputation, +10 Research points"),
            ("DAWs are objectively better. Trackers are only useful for size-limited competitions.", "flame", "+5 Music reputation (pragmatic view)"),
        ]
    },
    {
        "cat": "protracker_packs",
        "topic": "BEST AMIGA DRUM SAMPLES: RIPPING FROM VINYL VS SYNTHESIS",
        "era": "mid",
        "messages": [
            ("Drifter", "Vinyl-ripped drum samples have warmth and punch that synthesized drums cannot match. A 909 kick ripped from a record at 44kHz sounds alive. Synthesized kicks are flat and lifeless."),
            ("PulseWave", "Synthesized drums fit perfectly in 4-channel modules because they use less sample space. A 2KB synthesized kick leaves room for 3 more instruments. Efficiency wins."),
            ("Purple Motion", "The best modules use a hybrid approach. Vinyl kick, synthesized snare, FM hi-hat. Each source brings its own character. Dogmatism limits your palette."),
        ],
        "choices": [
            ("Vinyl rips have more soul. The imperfection is what makes them sound human.", "support", "+10 Music reputation, +5 Friendship with Drifter"),
            ("Synthesizing everything from scratch is the purest form of tracker music.", "flame", "+10 Music reputation (purist credibility)"),
        ]
    },
    {
        "cat": "fasttracker_vs_it",
        "topic": "GUS WAVETABLE vs SOUND BLASTER AWE32: HARDWARE WAR",
        "era": "late",
        "messages": [
            ("PulseWave", "The GUS PnP wavetable interpolation at 44kHz makes every sample sound like a million dollars. The AWE32's EMU8000 chip is good but the GUS has more character."),
            ("ChipTuneKid", "Sound Blaster AWE32 has 32 hardware channels and 4MB of onboard RAM. The GUS has 16 channels and uses system RAM. AWE32 wins on architecture."),
            ("Drifter", "GUS uses system RAM which means faster sample loading. The AWE32's onboard RAM needs a separate upload step. For live demos, GUS is faster in practice."),
        ],
        "choices": [
            ("GUS wavetable warmth is irreplaceable. The sound defines the late 90s scene.", "support", "+10 Music reputation, +10 Research points"),
            ("AWE32 hardware mixing is superior. GUS is a toy for tracker purists.", "flame", "+5 Music reputation (contrarian)"),
        ]
    },
    {
        "cat": "fasttracker_vs_it",
        "topic": "RENOISE vs OPENMPT: MODERN TRACKER SHOWDOWN",
        "era": "modern",
        "messages": [
            ("PulseWave", "Renoise is the only tracker that properly supports VST plugins and modern audio routing. OpenMPT is a legacy format converter in a trenchcoat."),
            ("Skaven", "OpenMPT has perfect MOD/XM/IT compatibility. I can load a module from 1992 and it plays exactly like it did on the original hardware. Renoise drops old format support."),
            ("ChipTuneKid", "Both are valid. Renoise for new productions, OpenMPT for legacy playback. The real innovation is procedural audio in 4K intros, not which DAW you use."),
        ],
        "choices": [
            ("Renoise proves the tracker is not dead. It is evolving.", "support", "+10 Music reputation, +10 Research points"),
            ("OpenMPT's format compatibility is essential for preservation. Renoise is a pretender.", "flame", "+10 Music reputation (preservationist)"),
        ]
    },
    # === DEMO STYLE ANALYSIS ===
    {
        "cat": "demo_vs_game",
        "topic": "MEGADEMO vs 64K INTRO: WHICH FORMAT PUSHES MORE BOUNDARIES?",
        "era": "late",
        "messages": [
            ("Chaos", "A 64K intro is a focused technical statement. Every byte is curated. A megademo is a variety show where the director's vision is lost in the content noise."),
            ("DemosceneHistorian", "The megademo format from 1987-1992 defined the scene's identity. Huge teams, multiple effects, a journey through computing. 64K intros are impressive but they lack narrative."),
            ("RasterRat", "64K intros are more technically impressive. Megademos are more emotionally engaging. The format serves different purposes and both are valid."),
        ],
        "choices": [
            ("64K intros push technical boundaries further. Constraints breed creativity.", "support", "+15 Reputation, +10 Research points"),
            ("Megademos tell stories. 64K intros are tech demos. Storytelling is the higher art.", "flame", "+15 Reputation (artistic credibility)"),
        ]
    },
    {
        "cat": "demo_vs_game",
        "topic": "DEMO DIRECTION TRENDS: IS THE 4K FORMAT PEAKING?",
        "era": "modern",
        "messages": [
            ("Chaos", "4K intros keep getting better every year. The shader evolution on modern GPUs means we can do things now that were impossible in 2005. The peak is nowhere in sight."),
            ("RasterRat", "The 4K format peaked around 2010. Everything since is incremental improvement on existing techniques. The constraints of 4096 bytes limit innovation."),
            ("DemosceneHistorian", "Each GPU generation resets the 4K format. New hardware means new constraints mean new creativity. The format is cyclical, not linear. We are in a renaissance."),
        ],
        "choices": [
            ("4K intros are still evolving. Every GPU generation brings new possibilities.", "support", "+15 Reputation, +10 Research points"),
            ("The 4K format is creatively tapped. Move to 1K or 256B for the real challenge.", "flame", "+10 Reputation (contrarian)"),
        ]
    },
    {
        "cat": "demo_vs_game",
        "topic": "COLOR PALETTE TRENDS: FROM 16 TO 16 MILLION COLORS",
        "era": "mid",
        "messages": [
            ("Trix", "The best demos use limited palettes. 32 colors on Amiga, 256 on VGA. Unlimited color is a crutch. The discipline of palette constraints creates visual identity."),
            ("Vectra", "Truecolor at 60fps on Voodoo hardware changes what visuals can communicate. A sunset gradient with 16 million colors looks more real than any dithering trick."),
            ("RasterRat", "Palette choice should serve the demo's mood, not a purity test. 'Second Reality' used 256 colors perfectly. 'State of the Art' used 32 colors and copper interpolation. Both are masterpieces."),
        ],
        "choices": [
            ("Limited palettes force creative decisions. Constraints make better art.", "support", "+15 Art reputation, +10 Reputation"),
            ("Truecolor realism is the goal. Palette limitation is nostalgia, not virtue.", "flame", "+10 Art reputation (progressive)"),
        ]
    },
    {
        "cat": "demo_vs_game",
        "topic": "FIXED-FUNCTION vs SHADER: WHICH ERA PRODUCED BETTER DEMOS?",
        "era": "modern",
        "messages": [
            ("RasterRat", "Fixed-function demos from 1995-2002 were more creative because you had to hack the hardware. Shaders make beautiful demos too easy. The craft is in working around limitations."),
            ("Chaos", "Shader demos can do anything. Fixed-function is a cage. The idea that harder tools make better art is survivorship bias. Shader demos are objectively more visually rich."),
            ("DemosceneHistorian", "Both eras produced masterpieces. Second Reality (fixed-function) and Debris (shader-era early) are both in the scene hall of fame. The tool does not determine the quality."),
        ],
        "choices": [
            ("Fixed-function demos required more hardware hacking skill. That was real craft.", "support", "+15 Reputation (oldschool credibility)"),
            ("Shader demos are technically superior. Nostalgia blinds you to progress.", "flame", "+15 Reputation (progressive)"),
        ]
    },
    # === SCENE ECONOMY ===
    {
        "cat": "sponsor",
        "topic": "BBS CREDITS: HOW MANY NODES DO YOU PAY FOR?",
        "era": "mid",
        "messages": [
            ("Hype", "I pay $15/month for my primary BBS node with 1200 baud. A secondary node on 2400 baud costs $25/month. The budget is tight but distribution is everything."),
            ("SysOp42", "My node costs $40/month to run. Phone line, modem, electricity, and the 386 that runs the BBS software. If 10 users split the cost it is $4 each. Fair distribution."),
            ("ByteWizard", "BBS credits are the scene's currency. 100 credits = 1MB download. 1000 credits = a CD-ROM shipped. The economy runs on trust and node hours."),
        ],
        "choices": [
            ("Support your local BBS node. Pay for credits, keep the scene infrastructure alive.", "support", "+15 Reputation, -$20 Money"),
            ("BBS credits are a scam. FTP is free. The economy is changing.", "flame", "+5 Reputation (frugal stance)"),
        ]
    },
    {
        "cat": "sponsor",
        "topic": "FLOPPY TRADING ECONOMICS: HOW MANY DISKS FOR A DEMO?",
        "era": "early",
        "messages": [
            ("Hype", "A 4-disk demo costs 20 blank floppies to produce and distribute. At $1 per floppy, that is $20 per release. If 50 people download it, the cost per download is $0.40. Affordable."),
            ("Ranger", "Trading floppies by mail is cheaper than BBS download for large demos. 5 disks sent in a padded envelope costs $2 postage. A 5-disk demo over BBS costs $10 in phone bills."),
            ("FlameAlchemist", "The floppy economy is dying. CD-ROMs hold 700MB for $1 each. Floppies hold 1.44MB for $1. The math is obvious. Swappers who stick to floppy are hoarders, not distributors."),
        ],
        "choices": [
            ("Floppy trading is the soul of the scene. Cheap, reliable, and personal.", "support", "+10 Reputation, -$10 Money"),
            ("CD-ROM economics win. 500 floppies in a shoebox is not a distribution strategy.", "flame", "+5 Reputation (practical stance)"),
        ]
    },
    {
        "cat": "sponsor",
        "topic": "PARTY TRAVEL BUDGET: HOW MUCH DOES A DEMOPARTY COST?",
        "era": "late",
        "messages": [
            ("Hype", "Breakpoint 2002 cost me $400 total: $150 travel, $100 venue entry, $50 food, $50 beer, $50 blank CDs and supplies. Worth every cent."),
            ("Vectra", "Assembly 2000 cost $600: $200 flights from UK, $150 venue + camping, $100 food, $150 hardware shipping. A 64K intro is the most expensive art per kilobyte ever produced."),
            ("FlameAlchemist", "If you are spending $600 to attend a party and not winning, you are a tourist. Real sceners hitchhike, sleep under the compo table, and survive on pizza donated by sponsors."),
        ],
        "choices": [
            ("Parties are worth any cost. The experience and networking are irreplaceable.", "support", "+15 Reputation, -$50 Money"),
            ("The scene should be accessible. High costs gatekeep talent. We need cheaper parties.", "flame", "+15 Reputation (activist stance)"),
        ]
    },
    # === PIXEL ART TUTORIALS ===
    {
        "cat": "procedural_tex",
        "topic": "DITHERING TECHNIQUES: ORDERED vs ERROR DIFFUSION",
        "era": "mid",
        "messages": [
            ("Trix", "Ordered dithering is the only honest dither. A Bayer matrix at 8x8 gives 64 shades per channel. Error diffusion looks mushy and uncontrolled. Have discipline."),
            ("Vectra", "Error diffusion preserves more detail. Floyd-Steinberg with serpentine scanning gives photorealistic results on 256-color VGA. Ordered dithering looks like 1985."),
            ("RasterRat", "Both techniques have their place. Ordered for gradient fills, error diffusion for photorealistic images. The master knows when to use each."),
        ],
        "choices": [
            ("Ordered dithering is cleaner and more predictable. Error diffusion is chaotic.", "support", "+10 Art reputation, +5 Research points"),
            ("Error diffusion preserves more of the source image. Quality over method purity.", "flame", "+10 Art reputation (pragmatic)"),
        ]
    },
    {
        "cat": "procedural_tex",
        "topic": "COLOR CYCLING ON VIC-II: PALETTE ANIMATION WITHOUT CPU",
        "era": "early",
        "messages": [
            ("Ranger", "Color cycling on the C64 VIC-II is free animation. Change 4 palette entries per frame and water flows, fire burns, and skies shift. Zero CPU cost."),
            ("Trix", "The best C64 demos use color cycling for everything: water, fire, plasma, skies. A well-tuned color cycle loop is more hypnotic than any 3D effect."),
            ("CopperGhost", "The Amiga Copper can do the same thing but with 32 palette entries and per-scanline granularity. Color cycling on Amiga is an order of magnitude more powerful."),
        ],
        "choices": [
            ("Color cycling is the most efficient animation technique ever invented.", "support", "+15 Research points, +10 Art reputation"),
            ("Copper-driven palette animation on Amiga is superior. C64 color cycling is primitive.", "flame", "+5 Reputation (Amiga bias)"),
        ]
    },
    {
        "cat": "procedural_tex",
        "topic": "PALETTE DESIGN: HOW TO CHOOSE 16 COLORS FOR A C64 DEMO",
        "era": "early",
        "messages": [
            ("Trix", "The C64 has 16 colors. That is it. You have 4 bits per pixel. Your palette must work for every scene. Choose 4 skin tones, 4 sky colors, 4 material colors, and 4 accent colors."),
            ("Vectra", "FLI mode stretches the VIC-II to show more than 16 colors per frame by switching palettes mid-frame. It is complex but the results are worth it."),
            ("RasterRat", "Palette design is the most underrated skill in demoscene art. A bad palette ruins a technically perfect demo. Study color theory before you touch Deluxe Paint."),
        ],
        "choices": [
            ("Limited palettes force focus. Every color must earn its place in the palette.", "support", "+10 Art reputation, +10 Research points"),
            ("FLI mode and Copper tricks bypass palette limits. Use hardware hacks, not design rules.", "flame", "+5 Art reputation (hardware hacker stance)"),
        ]
    },
    # === COMPETITION RECAPS ===
    {
        "cat": "flame_war",
        "topic": "ASSEMBLY 92 RECAP: THE YEAR THE AMIGA WON EVERYTHING",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "Assembly 1992 was the Amiga's finest hour. The megademo compo had 32 entries and the top 8 were all Amiga. The PC scene was still figuring out VGA mode 13h."),
            ("CrashOverride", "Amiga won because the Copper and Blitter gave a 3-year head start on effects. Once PCs got VGA and Sound Blaster, the gap closed fast. 1994 was the turning point."),
            ("RasterRat", "I was at Assembly 92. The Amiga demos were better but the PC demos were more innovative. Future Crew's 'Unreal' on PC introduced techniques nobody had seen before."),
        ],
        "choices": [
            ("Amiga dominated because of superior hardware. The facts are clear.", "support", "+15 Reputation, +10 Friendship with Historian"),
            ("PC innovation at Assembly 92 laid the groundwork for the modern scene.", "flame", "+15 Reputation (PC pride)"),
        ]
    },
    {
        "cat": "flame_war",
        "topic": "BREAKPOINT 2003: THE YEAR 64K INTROS TOOK OVER",
        "era": "late",
        "messages": [
            ("DemosceneHistorian", "Breakpoint 2003 had 47 entries in the 64K compo. The quality was insane. Farbrausch, ASD, Conspiracy, and Black Maiden all shipped. It was the golden age."),
            ("CrashOverride", "The 64K format peaked at Breakpoint 2003. After that, every intro was derivative of 'Debris' or 'Werkzeug'. The innovation moved to 4K and 1K formats."),
            ("Chaos", "Breakpoint 2003 proved that 64K intros could tell stories, not just show effects. The procedural generation revolution was complete. Everyone was using noise functions."),
        ],
        "choices": [
            ("64K intros at Breakpoint 2003 were the highest expression of the demoscene.", "support", "+15 Reputation, +10 Research points"),
            ("Innovation moved to 4K after 2003. 64K became formulaic.", "flame", "+10 Reputation (progressive stance)"),
        ]
    },
    {
        "cat": "flame_war",
        "topic": "THE PARTY 95: JUDGE CONTROVERSY OVER WINNING DEMO",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "The Party 1995 had the biggest judge controversy in scene history. The winning demo was accused of using pre-rendered content. The judges stood by the decision but the BBS boards exploded."),
            ("FlameAlchemist", "I was at The Party 95. The winning demo had a 30-second voxel sequence that was literally impossible on the hardware it ran on. Everyone knew it was pre-rendered but nobody could prove it."),
            ("CrashOverride", "The controversy created the modern compo rulebook. After The Party 95, every compo started requiring source code or real-time capture verification. The controversy improved the scene."),
        ],
        "choices": [
            ("The Party 95 controversy forced transparency in judging. A necessary scandal.", "support", "+15 Reputation, +10 Research points"),
            ("The judges were right to stand by their decision. Pre-rendering is not cheating if the final result is art.", "flame", "+10 Reputation (contrarian)"),
        ]
    },
    {
        "cat": "flame_war",
        "topic": "ASSEMBLY 98 SURPRISE WINNER: THE C64 DEMO THAT BEAT PCS",
        "era": "late",
        "messages": [
            ("DemosceneHistorian", "Assembly 1998 had an 8-bit C64 entry that placed higher than all but two PC demos. The judges were visibly shocked. The demo used a new FLI technique nobody had seen."),
            ("Ranger", "That C64 demo proved that 8-bit is not dead. The technique was a hybrid FLI/ECM mode that pushed 128 colors per frame. The PC entries had 3D but the C64 had soul."),
            ("Chaos", "The C64 demo was technically impressive but the PC entries were more forward-looking. Placing a C64 demo above PC entries was nostalgia-driven judging."),
        ],
        "choices": [
            ("The C64 demo showed that technique matters more than hardware. Inspiration.", "support", "+15 Reputation, +10 Art reputation"),
            ("C64 should have been judged in its own category. Beating PCs is not a fair comparison.", "flame", "+5 Reputation (fairness stance)"),
        ]
    },
    # === C64 vs AMIGA vs PC ===
    {
        "cat": "hardware",
        "topic": "C64 vs AMIGA vs PC: WHICH PLATFORM HAD THE BEST SCENE?",
        "era": "mid",
        "messages": [
            ("Ranger", "C64 scene was the original. Limited hardware forced maximum creativity. 16 colors, 3 SID channels, 1MHz. Every demo was a miracle. The C64 scene made the demoscene."),
            ("Chaos", "Amiga scene pushed technical boundaries further. The Copper, the Blitter, 4-channel audio. Amiga demos from 1989 still look impressive today. C64 demos look like what they are: 8-bit tricks."),
            ("RasterRat", "PC scene democratized demo creation. VGA, Sound Blaster, and later 3Dfx meant anyone with a PC could participate. The PC scene had more participants and more diversity."),
        ],
        "choices": [
            ("C64 was the foundation. Without the C64 scene, none of this exists.", "support", "+10 Reputation (oldschool credibility)"),
            ("Amiga pushed the format further. The Copper and Blitter are unmatched even today.", "flame", "+10 Reputation (Amiga pride)"),
        ]
    },
    {
        "cat": "hardware",
        "topic": "VGA MODE-X: THE UNCHAINED RESOLUTION HACK",
        "era": "mid",
        "messages": [
            ("ByteWizard", "VGA Mode-X (unchained mode) was the most important resolution hack in PC demo history. 360x480 with 256 colors gave PC coders a real-time canvas that rivaled the Amiga."),
            ("Chaos", "Mode-X was a pain to program but the double resolution was worth it. I wrote a 3D engine that ran at 20fps in Mode-X on a 386. It looked better than any Amiga software renderer."),
            ("RasterRat", "Mode-X unchained mode is the VGA trick that every PC demoscener needed to know. The planar memory layout was a nightmare but the results were worth it."),
        ],
        "choices": [
            ("Mode-X unchained mode was the PC scene's defining technical achievement.", "support", "+15 Research points, +10 Reputation"),
            ("Amiga's planar display was superior. Mode-X was a hack to catch up.", "flame", "+5 Reputation (Amiga bias)"),
        ]
    },
    # === MUSIC PRODUCTION GEAR ===
    {
        "cat": "fasttracker_vs_it",
        "topic": "SOUND BLASTER vs GUS: THE DEFINITIVE AUDIO SHOWDOWN",
        "era": "late",
        "messages": [
            ("Drifter", "Sound Blaster AWE32 had better driver support and wider compatibility. GUS sounded better but was a nightmare to configure. For a demo that ships on a CD-ROM, SB compatibility wins."),
            ("PulseWave", "GUS wavetable synthesis at 44kHz with hardware interpolation is objectively superior audio quality. Sound Blaster was the Betamax of PC audio."),
            ("ChipTuneKid", "The AWE32's EMU8000 chip was based on the E-MU Proteus hardware synthesizer. It was a professional music chip in a consumer sound card. The GUS was a hobbyist device."),
        ],
        "choices": [
            ("GUS audio quality is superior. Compatibility is a compromise for the masses.", "support", "+10 Music reputation, +5 Friendship with PulseWave"),
            ("AWE32's professional heritage makes it the better choice for serious music.", "flame", "+10 Music reputation, +5 Friendship with ChipTuneKid"),
        ]
    },
    {
        "cat": "fasttracker_vs_it",
        "topic": "SAMPLER SHOWDOWN: WHO MAKES THE BEST TRACKER SAMPLES?",
        "era": "modern",
        "messages": [
            ("PulseWave", "The best tracker samples come from unexpected sources. I've sampled a skipping CD player, a dying hard drive, and a dial-up modem. The samples write themselves."),
            ("Drifter", "Field recordings are the future of tracker samples. A rain storm recorded at 44kHz and pitched down 4 octaves makes a better pad than any synthesized instrument."),
            ("ChipTuneKid", "Pure synthesis is the only honest source. Sampling real-world sounds is a crutch for people who cannot synthesize. A saw wave with the right envelope is more versatile than any sample library."),
        ],
        "choices": [
            ("Field recordings add depth and warmth that synthesis cannot match.", "support", "+10 Music reputation, +10 Art reputation"),
            ("Pure synthesis is more versatile and size-efficient. Samples are dead weight.", "flame", "+10 Music reputation (purist)"),
        ]
    },
    # === DEMO REVIEWS ===
    {
        "cat": "release_announce",
        "topic": "REVIEW: SECOND REALITY BY FUTURE CREW (1993) — 30 YEARS LATER",
        "era": "modern",
        "messages": [
            ("DemosceneHistorian", "Second Reality in 2023 still holds up. The voxel donut, the 3D tunnel, the synchronized soundtrack. It was ahead of its time and time has not diminished it."),
            ("RasterRat", "The voxel engine in Second Reality was a software renderer on a 486. No GPU, no hardware acceleration. The math was pure assembly optimization. It humbles every modern demo."),
            ("Chaos", "Second Reality is a museum piece. It was revolutionary in 1993 but the scene has moved on. The real-time procedural generation in a 2023 4K intro is more impressive than anything in Second Reality."),
        ],
        "choices": [
            ("Second Reality is timeless. It defined the scene for a generation.", "support", "+15 Reputation, +10 Research points"),
            ("Modern 4K intros are more technically impressive. Respect the past but celebrate the present.", "flame", "+10 Reputation (progressive)"),
        ]
    },
    {
        "cat": "release_announce",
        "topic": "REVIEW: DEBRIS BY FARBRAUSCH (2000) — THE 64K MASTERPIECE",
        "era": "late",
        "messages": [
            ("DemosceneHistorian", "Debris changed the 64K format forever. Procedural textures, real-time shadows, and a cohesive audio-visual experience that felt bigger than its 64KB budget."),
            ("Chaos", "Debris proved that 64K was enough for a complete audio-visual experience. Before Debris, 64K intros were tech demos. After Debris, they were art."),
            ("CrashOverride", "Debris was good but Werkzeug (also by Farbrausch, also 64K) was more innovative. The procedural world generation in Werkzeug was a bigger technical achievement."),
        ],
        "choices": [
            ("Debris redefined the 64K format. It is the most influential intro ever made.", "support", "+15 Reputation, +15 Research points"),
            ("Werkzeug was more technically innovative. Debris just had better marketing.", "flame", "+10 Reputation (contrarian)"),
        ]
    },
    {
        "cat": "release_announce",
        "topic": "REVIEW: STATE OF THE ART BY SPACEBALLS (1992)",
        "era": "mid",
        "messages": [
            ("DemosceneHistorian", "State of the Art on the Amiga was the first demo that felt like a music video. The vector animation synced to the soundtrack was unprecedented in 1992."),
            ("RasterRat", "The vector engine in State of the Art used pre-computed animation paths which let them pack more visual complexity per frame than real-time rendering could achieve."),
            ("Chaos", "State of the Art was a milestone but it was pre-rendered in key sections. Real-time procedural generation in modern intros is more honest engineering."),
        ],
        "choices": [
            ("State of the Art proved demos could be art. A seminal work.", "support", "+15 Reputation, +10 Art reputation"),
            ("Pre-rendered sections undermine the real-time ethos of the demoscene.", "flame", "+5 Reputation (purist stance)"),
        ]
    },
    # === ADDITIONAL TECH DISCUSSIONS ===
    {
        "cat": "hardware",
        "topic": "386SX vs 386DX: DOES THE BUS MATTER FOR DEMO PERFORMANCE?",
        "era": "mid",
        "messages": [
            ("ByteWizard", "386DX has a 32-bit data bus. 386SX has a 16-bit bus. For a demo that moves a lot of data to the VGA card, the 32-bit bus gives 30% more throughput. It matters."),
            ("Chaos", "The CPU performance difference between SX and DX is marginal for most demo effects. The bottleneck is always the VGA framebuffer, not the CPU-to-memory bus."),
            ("RasterRat", "For Mode-X unchained mode with planar bitmaps, the 32-bit bus of the 386DX is essential. The SX chokes on 4-plane writes. If you are targeting 386, target DX only."),
        ],
        "choices": [
            ("Cycle-accurate targeting requires understanding the bus width. DX is the minimum.", "support", "+10 Research points, +5 Reputation"),
            ("Optimize for the algorithm, not the bus. Good code runs on any 386.", "flame", "+5 Reputation (code purist)"),
        ]
    },
    {
        "cat": "hardware",
        "topic": "VOODOO 3 vs RIVA TNT: WHICH CARD WINS FOR 1999 DEMOS?",
        "era": "late",
        "messages": [
            ("RasterRat", "Voodoo 3 has better GLIDE support and the 16-bit color depth is not a limitation for demo visuals. The TNT has 32-bit color but the drivers are buggy."),
            ("Chaos", "Riva TNT has 32-bit color, 24-bit Z-buffer, and better fill rate. For a demo with transparency and shadows, the TNT is objectively superior hardware."),
            ("ByteWizard", "Voodoo 3 has simpler architecture which means more predictable performance. The TNT has more features but they come with driver overhead. For 60fps demos, predictability wins."),
        ],
        "choices": [
            ("Voodoo 3's GLIDE API is more reliable for compo demos. The predictability matters.", "support", "+10 Research points, +10 Reputation"),
            ("TNT's 32-bit color and better fill rate win for visual quality. Drivers improve.", "flame", "+10 Reputation (hardware enthusiast)"),
        ]
    },
    # === SCENE NOSTALGIA ===
    {
        "cat": "sysop_discussion",
        "topic": "YOUR FIRST DEMO EXPERIENCE: WHEN DID THE SCENE HOOK YOU?",
        "era": "modern",
        "messages": [
            ("DemosceneHistorian", "My first demo was 'Hardwired' by The Silents on Amiga in 1991. The rotating 3D wireframe cube synchronized to a MOD track. I knew immediately I wanted to be part of this."),
            ("RasterRat", "I saw 'Second Reality' at a friend's house in 1993. The voxel donut was playing and I said 'How is this possible on a PC?' I spent the next 5 years learning assembly to answer that question."),
            ("CrashOverride", "My first scene experience was a cracktro on a pirated game in 1988. The scrolling text said 'Greetings to all C64 sceners across Europe.' I felt like I was part of something bigger."),
        ],
        "choices": [
            ("The first demo experience is a universal scene memory. Share yours.", "support", "+15 Reputation, +5 Friendship with Historian"),
            ("The scene is about the code, not the nostalgia. The first demo is irrelevant.", "flame", "+5 Reputation (stoic stance)"),
        ]
    },
    {
        "cat": "sysop_discussion",
        "topic": "LOST TRADITIONS: WHAT DO YOU MISS ABOUT THE OLD SCENE?",
        "era": "modern",
        "messages": [
            ("DemosceneHistorian", "I miss floppy trading culture. The physical media, the hand-drawn labels, the anticipation of waiting for a disk to arrive in the mail. Digital distribution lacks that tactile magic."),
            ("Ranger", "I miss BBS culture. The modem handshake, the ASCII art logins, the local node communities. IRC and Discord are convenient but they lack the character of dial-up BBS systems."),
            ("SysOp42", "I miss the role of SysOps as community curators. Today, anyone can upload anything to the cloud. There is no gatekeeping, no quality control, no scene standards. The signal-to-noise ratio has collapsed."),
        ],
        "choices": [
            ("The physical distribution era had a magic that digital cannot replicate.", "support", "+15 Reputation (oldschool credibility)"),
            ("The scene evolves. What you call lost traditions I call obsolete inefficiencies.", "flame", "+5 Reputation (modernist)"),
        ]
    },
    # === RANDOM FUN/HUMOR ===
    {
        "cat": "collab_request",
        "topic": "CODER COFFEE FUEL: WHAT KEEPS YOU DEBUGGING AT 4AM?",
        "era": "late",
        "messages": [
            ("CrashOverride", "Coffee and hatred. Every bug I fix is a personal victory over the compiler. The compiler is my enemy. Coffee is my weapon. Sleep is for the weak."),
            ("RasterRat", "I drink tea because it does not cause the caffeine crash. Green tea keeps me going from 10pm to 6am without the jitters. 6 pots per compo deadline."),
            ("FlameAlchemist", "Energy drinks and spite. The SID chip runs on 5V DC and the coder runs on Monster Energy. The chemistry is the same: both produce magic smoke under pressure."),
        ],
        "choices": [
            ("Coffee is the official beverage of the demoscene. Fuel your debugging sessions.", "support", "+5 Reputation, +5 Friendship with CrashOverride"),
            ("Tea provides sustained energy without the crash. Green tea for the win.", "flame", "+5 Friendship with RasterRat"),
        ]
    },
    {
        "cat": "collab_request",
        "topic": "FAVORITE DEMO DEBUGGING STORIES: SHARE YOUR WORST BUG",
        "era": "modern",
        "messages": [
            ("ByteWizard", "Spent 3 days debugging a flickering sprite. The bug was that I forgot to clear the VIC-II sprite pointer. The pointer defaulted to address $0000 which contained random data."),
            ("Chaos", "My raymarching shader was producing artifacts for weeks. Turned out I was passing the wrong resolution to the GPU. The shader was rendering at 320x240 but I thought it was 640x480."),
            ("RasterRat", "My demo crashed on every machine except mine. The culprit: a missing semicolon in an inline assembly block. The compiler silently added a NOP on my machine but crashed on others."),
        ],
        "choices": [
            ("Debugging stories are the scene's folklore. Share and learn from each other.", "support", "+10 Reputation, +5 Research points"),
            ("The best bugs produce the most entertaining demos. Embrace the glitch.", "flame", "+5 Reputation (artist stance)"),
        ]
    },
    {
        "cat": "collab_request",
        "topic": "BEST LAST-MINUTE CODING SAVES BEFORE COMPO DEADLINES",
        "era": "late",
        "messages": [
            ("CrashOverride", "Finished my 64K intro at 4:47 AM. Compo deadline was 5:00 AM. The compile finished at 4:58 AM. The binary was loaded from a floppy that we had to borrow from a guy in the toilet."),
            ("Chaos", "My demo had a memory leak that caused it to crash after 3 minutes. The compo limit was 4 minutes. I added a brute-force reset at 2 minutes 50 seconds. The judges did not notice."),
            ("RasterRat", "My shader compiled with a warning that I ignored. It worked on my machine but on the compo machine it rendered everything in monochrome. The audience thought it was an artistic choice."),
        ],
        "choices": [
            ("Pressure creates the most creative solutions. The best demos are born in panic.", "support", "+15 Reputation, +10 Research points"),
            ("Poor planning is not romantic. Professional deadline management beats heroic saves.", "flame", "+5 Reputation (organizer respect)"),
        ]
    },

],"
    yield f"      infoType: \"{info_type}\","
    yield f"      credibilityScore: {credibility},"
    yield f"      propagationSpeed: {speed},"
    yield f"      distortionRate: {distortion},"
    yield f"      influenceWeight: {influence},"
    yield f"      viralSpreadRank: {viral},"
    yield f"      isSuppressed: false,"
    yield f"      originalTopic: \"{topic}\","
    yield f"      mutationCount: 0,"
    yield f"    }},"


# Generate all threads
output_lines = []
for idx, template in enumerate(THREAD_TEMPLATES, start=1):
    for line in generate_thread(100 + idx, template):
        output_lines.append(line)

# Print to stdout for piping to file
print("\n".join(output_lines))
print(f"// Generated {len(THREAD_TEMPLATES)} threads", file=__import__('sys').stderr)
