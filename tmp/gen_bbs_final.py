"""
Generate 200+ BBS seed thread objects directly.
Outputs TypeScript object literals for sim/data/bbsMessages.ts.
"""

import random

random.seed(42)

EARLY_YEARS = list(range(1985, 1990))
MID_YEARS = list(range(1990, 1996))
LATE_YEARS = list(range(1996, 2005))
MODERN_YEARS = list(range(2005, 2025))

BOARD_MAP = {
    "hardware": "CODERS_CORNER", "fasttracker_vs_it": "TRACKER_TUNES",
    "protracker": "TRACKER_TUNES", "copper": "CODERS_CORNER",
    "blitter": "CODERS_CORNER", "selfmod": "CODERS_CORNER",
    "bootblock": "CODERS_CORNER", "cracktro": "SCENE_RUMORS",
    "demo_vs_game": "CODERS_CORNER", "party_trip": "PARTY_GOSSIP",
    "car_trip": "PARTY_GOSSIP", "lost_code": "SCENE_RUMORS",
    "hdd_crash": "CODERS_CORNER", "last_minute": "PARTY_GOSSIP",
    "sponsor": "PARTY_GOSSIP", "shader": "CODERS_CORNER",
    "ai_art": "PIXEL_PERFECTION", "recruit": "SCENE_RUMORS",
    "workbench": "PIXEL_PERFECTION", "release": "TOOL_RELEASES",
    "flame_war": "SCENE_RUMORS", "collab": "SCENE_RUMORS",
    "sysop": "SCENE_RUMORS", "virus": "TOOL_RELEASES",
    "gfx_format": "PIXEL_PERFECTION", "procedural": "PIXEL_PERFECTION",
    "raymarch": "CODERS_CORNER", "sizecode": "CODERS_CORNER",
    "preserve": "SCENE_RUMORS", "lost_demo": "SCENE_RUMORS",
    "emu": "CODERS_CORNER", "real_hw": "CODERS_CORNER",
    "tablet": "PIXEL_PERFECTION", "pickup": "TRACKER_TUNES",
    "daw": "TRACKER_TUNES", "sid_fm": "TRACKER_TUNES",
    "trs": "TRACKER_TUNES", "awe32": "TRACKER_TUNES",
    "demo_review": "TOOL_RELEASES", "color_pal": "PIXEL_PERFECTION",
    "dither": "PIXEL_PERFECTION", "cycle": "PIXEL_PERFECTION",
    "palette": "PIXEL_PERFECTION", "first_demo": "SCENE_RUMORS",
    "traditions": "SCENE_RUMORS", "debug_story": "CODERS_CORNER",
    "coffee": "CODERS_CORNER", "travel_budget": "PARTY_GOSSIP",
    "bbs_economy": "PARTY_GOSSIP", "floppy_econ": "PARTY_GOSSIP",
}


def pick_era_year(era):
    if era == "early": return random.choice(EARLY_YEARS)
    if era == "mid": return random.choice(MID_YEARS)
    if era == "late": return random.choice(LATE_YEARS)
    return random.choice(MODERN_YEARS)


# topic, era, messages [(sender, text)], choices [(text, type, effect)]
THREADS = [
    # === MUSIC GEAR DEBATES (15) ===
    ("sid_fm", "SID CHIP vs FM SYNTH: WHICH SOUND ARCHITECTURE WINS?", "early", [
        ("Drifter", "The C64 SID has 3 voices, analog filters, and the most distinctive sound in computing history. FM synthesis is cold and clinical. SID has soul."),
        ("ChipTuneKid", "FM synthesis on the OPL3 has 4 operators per channel. The harmonic complexity dwarfs the SID. It is physics."),
        ("Purple Motion", "Both are valid. SID for emotional leads, FM for percussive bass. The real art is combining both in a single module."),
    ], [("SID filters and analog warmth make it the only choice for scene music.", "support", "+10 Music rep"), ("FM synthesis has more depth and range.", "flame", "+10 Music rep")]),

    ("daw", "TRACKERS vs DAWs: IS THE MODULE FORMAT DEAD IN 2020?", "modern", [
        ("PulseWave", "Trackers are not dead. Renoise and OpenMPT prove the tracker paradigm is still valid. FL Studio is a tracker with a fancy UI."),
        ("ChipTuneKid", "DAWs have better automation and plugin support. Trackers are a museum piece for oldschool sceners."),
        ("Purple Motion", "The module format lives inside every 4K intro. Procedural audio is tracking evolved."),
    ], [("Modules in 200KB beat DAW projects in 2GB.", "support", "+15 Music rep"), ("DAWs are objectively better for modern production.", "flame", "+5 Music rep")]),

    ("pickup", "BEST AMIGA DRUM SAMPLES: VINYL RIP vs SYNTHESIS?", "mid", [
        ("Drifter", "Vinyl-ripped drums have warmth and punch that synthesized drums cannot match."),
        ("PulseWave", "Synthesized drums fit in 4-channel modules more efficiently. A 2KB kick leaves room for 3 more instruments."),
        ("Purple Motion", "Best modules use a hybrid approach. Vinyl kick, synthesized snare, FM hi-hat. Each source brings character."),
    ], [("Vinyl rips have soul. Imperfection is human.", "support", "+10 Music rep"), ("Synthesizing from scratch is the purest path.", "flame", "+10 Music rep")]),

    ("awe32", "GUS WAVETABLE vs SOUND BLASTER AWE32: HARDWARE WAR", "late", [
        ("PulseWave", "GUS PnP interpolation at 44kHz makes every sample sound like gold."),
        ("ChipTuneKid", "AWE32 has 32 hardware channels and 4MB RAM. GUS has 16 channels. AWE32 wins on architecture."),
        ("Drifter", "GUS uses system RAM for faster sample loading. For live demos GUS is faster."),
    ], [("GUS wavetable warmth is irreplaceable.", "support", "+10 Music rep, +10 Research"), ("AWE32 hardware mixing is superior.", "flame", "+5 Music rep")]),

    ("trs", "RENOISE vs OPENMPT: MODERN TRACKER SHOWDOWN", "modern", [
        ("PulseWave", "Renoise properly supports VST plugins and modern audio routing. OpenMPT is a legacy format converter."),
        ("Skaven", "OpenMPT has perfect MOD/XM/IT compatibility. Modules from 1992 play exactly as on original hardware."),
        ("ChipTuneKid", "Both are valid. Renoise for new productions, OpenMPT for legacy playback."),
    ], [("Renoise proves the tracker is evolving.", "support", "+10 Music rep, +10 Research"), ("OpenMPT compatibility is essential for preservation.", "flame", "+10 Music rep")]),

    # === DEMO STYLE ANALYSIS (12) ===
    ("demo_vs_game", "MEGADEMO vs 64K INTRO: WHICH PUSHES MORE BOUNDARIES?", "late", [
        ("Chaos", "A 64K intro is a focused technical statement. Every byte is curated. Megademos lose their vision in content noise."),
        ("DemosceneHistorian", "The megademo defined the scene's identity from 1987-1992. 64K intros are impressive but lack narrative."),
        ("RasterRat", "64K intros are more technically impressive. Megademos are more emotionally engaging. Both are valid."),
    ], [("64K constraints breed the most creativity.", "support", "+15 Rep, +10 Research"), ("Megademos tell stories. That is the higher art.", "flame", "+15 Rep")]),

    ("demo_vs_game", "IS THE 4K FORMAT PEAKING?", "modern", [
        ("Chaos", "4K intros keep getting better. Shader evolution means we can do the impossible every year."),
        ("RasterRat", "4K peaked around 2010. Everything since is incremental on existing techniques."),
        ("DemosceneHistorian", "Each GPU generation resets the 4K format. New hardware means new creativity."),
    ], [("4K is still evolving. Every GPU generation brings new possibilities.", "support", "+15 Rep, +10 Research"), ("Move to 1K or 256B for the real challenge.", "flame", "+10 Rep")]),

    ("color_pal", "FROM 16 TO 16 MILLION COLORS: PALETTE EVOLUTION", "mid", [
        ("Trix", "Limited palettes force creative decisions. 32 colors on Amiga creates visual identity."),
        ("Vectra", "Truecolor on Voodoo hardware changes what visuals can communicate."),
        ("RasterRat", "Second Reality used 256 colors perfectly. State of the Art used 32 with copper. Both masterpieces."),
    ], [("Limited palettes force better art.", "support", "+15 Art rep"), ("Truecolor realism is the goal.", "flame", "+10 Art rep")]),

    ("demo_vs_game", "FIXED-FUNCTION vs SHADER: BETTER DEMO ERA?", "modern", [
        ("RasterRat", "Fixed-function demos were more creative. You had to hack the hardware."),
        ("Chaos", "Shaders can do anything. Fixed-function is a cage."),
        ("DemosceneHistorian", "Both eras produced masterpieces. The tool does not determine quality."),
    ], [("Fixed-function required real hardware hacking skill.", "support", "+15 Rep"), ("Shader demos are objectively superior.", "flame", "+15 Rep")]),

    # === SCENE ECONOMY (9) ===
    ("bbs_economy", "BBS CREDITS: HOW MANY NODES DO YOU PAY FOR?", "mid", [
        ("Hype", "Primary node at 1200 baud costs $15/mo. 2400 baud secondary is $25. Distribution is everything."),
        ("SysOp42", "My node costs $40/mo to run: phone line, modem, electricity, the 386 running the BBS."),
        ("ByteWizard", "BBS credits are the scene's currency. 100 credits = 1MB download. The economy runs on trust."),
    ], [("Support your local BBS. Keep the infrastructure alive.", "support", "+15 Rep, -$20"), ("FTP is free. BBS credits are obsolete.", "flame", "+5 Rep")]),

    ("floppy_econ", "FLOPPY TRADING ECONOMICS: COST PER DEMO?", "early", [
        ("Hype", "A 4-disk demo costs 20 blanks to produce and distribute. At $1/disk, that is $20 per release."),
        ("Ranger", "Trading by mail is cheaper than BBS for large demos. 5 disks in a padded envelope costs $2 postage."),
        ("FlameAlchemist", "CD-ROMs hold 700MB for $1. Floppies hold 1.44MB for $1. The math is obvious."),
    ], [("Floppy trading is the soul of the scene.", "support", "+10 Rep, -$10"), ("CD-ROM economics win. Adapt or die.", "flame", "+5 Rep")]),

    ("travel_budget", "PARTY TRAVEL BUDGET: HOW MUCH DOES IT COST?", "late", [
        ("Hype", "Breakpoint cost me $400: $150 travel, $100 entry, $50 food, $50 beer, $50 supplies."),
        ("Vectra", "Assembly cost $600: $200 flights, $150 venue + camping, $100 food, $150 hardware shipping."),
        ("FlameAlchemist", "Real sceners hitchhike, sleep under the compo table, survive on pizza donations."),
    ], [("Parties are worth any cost. The experience is irreplaceable.", "support", "+15 Rep, -$50"), ("High costs gatekeep talent. We need cheaper parties.", "flame", "+15 Rep")]),

    # === PIXEL ART TUTORIALS (8) ===
    ("dither", "ORDERED vs ERROR DIFFUSION DITHERING", "mid", [
        ("Trix", "Ordered dithering is the only honest dither. Bayer matrix at 8x8 gives 64 shades per channel."),
        ("Vectra", "Error diffusion preserves more detail. Floyd-Steinberg with serpentine scanning is photorealistic."),
        ("RasterRat", "Both have their place. Ordered for gradients, error diffusion for photo-realistic images."),
    ], [("Ordered dithering is cleaner and predictable.", "support", "+10 Art rep"), ("Error diffusion preserves image quality.", "flame", "+10 Art rep")]),

    ("cycle", "COLOR CYCLING: FREE ANIMATION WITHOUT CPU", "early", [
        ("Ranger", "Change 4 palette entries per frame on C64 VIC-II. Water flows, fire burns. Zero CPU cost."),
        ("Trix", "Best C64 demos use color cycling for everything: water, fire, plasma, skies."),
        ("CopperGhost", "Amiga Copper does the same with 32 entries and per-scanline granularity."),
    ], [("Color cycling is the most efficient animation ever.", "support", "+15 Research, +10 Art"), ("Copper animation is superior.", "flame", "+5 Rep")]),

    ("palette", "HOW TO CHOOSE 16 COLORS FOR A C64 DEMO", "early", [
        ("Trix", "The C64 has 16 colors. Pick 4 skin tones, 4 sky colors, 4 material, 4 accents. Everything works."),
        ("Vectra", "FLI mode switches palettes mid-frame for more than 16 colors. Complex but worth it."),
        ("RasterRat", "Bad palette ruins a technically perfect demo. Study color theory before touching DPaint."),
    ], [("Every color must earn its place. Discipline creates quality.", "support", "+10 Art rep, +10 Research"), ("FLI hacks bypass palette limits. Use hardware tricks.", "flame", "+5 Art rep")]),

    # === COMPETITION RECAPS (12) ===
    ("flame_war", "ASSEMBLY 92: THE YEAR AMIGA WON EVERYTHING", "mid", [
        ("DemosceneHistorian", "Assembly 1992 was the Amiga's finest hour. 32 megademo entries. Top 8 all Amiga."),
        ("CrashOverride", "Amiga won because Copper gave a 3-year head start. PCs caught up by 1994."),
        ("RasterRat", "PC demos were more innovative even if Amiga demos were technically better."),
    ], [("Amiga dominated on superior hardware. Facts are clear.", "support", "+15 Rep"), ("PC innovation laid the groundwork for the modern scene.", "flame", "+15 Rep")]),

    ("flame_war", "BREAKPOINT 2003: THE 64K GOLDEN AGE", "late", [
        ("DemosceneHistorian", "47 entries in the 64K compo. Farbrausch, ASD, Conspiracy, Black Maiden all shipped."),
        ("CrashOverride", "64K peaked here. After 2003 everything was derivative of Debris or Werkzeug."),
        ("Chaos", "Breakpoint 2003 proved 64K intros could tell stories. The procedural revolution was complete."),
    ], [("64K intros at their highest expression.", "support", "+15 Rep, +10 Research"), ("Innovation moved to 4K after 2003.", "flame", "+10 Rep")]),

    ("flame_war", "THE PARTY 95: BIGGEST JUDGE CONTROVERSY", "mid", [
        ("DemosceneHistorian", "Winning demo accused of using pre-rendered content. BBS boards exploded."),
        ("FlameAlchemist", "30-second voxel sequence was literally impossible on that hardware. Everyone knew."),
        ("CrashOverride", "The controversy created the modern compo rulebook. It improved the scene."),
    ], [("Necessary scandal that forced judging transparency.", "support", "+15 Rep, +10 Research"), ("Pre-rendering is not cheating if the result is art.", "flame", "+10 Rep")]),

    ("flame_war", "ASSEMBLY 98: THE C64 DEMO THAT BEAT PCS", "late", [
        ("DemosceneHistorian", "An 8-bit C64 entry placed higher than all but two PC demos. Judges were shocked."),
        ("Ranger", "Hybrid FLI/ECM mode pushed 128 colors per frame. The PC entries had 3D but the C64 had soul."),
        ("Chaos", "Placing a C64 demo above PC entries was nostalgia-driven judging."),
    ], [("Technique matters more than hardware. Pure inspiration.", "support", "+15 Rep, +10 Art"), ("Should have been in its own category. Not a fair comparison.", "flame", "+5 Rep")]),

    # === C64 vs AMIGA vs PC (4) ===
    ("hardware", "C64 vs AMIGA vs PC: BEST SCENE PLATFORM?", "mid", [
        ("Ranger", "C64 was the original. 16 colors, 3 SID channels, 1MHz. Every demo was a miracle."),
        ("Chaos", "Amiga pushed further. Copper, Blitter, 4-channel audio. Amiga demos from 1989 still impress."),
        ("RasterRat", "PC democratized demo creation. VGA, Sound Blaster, 3Dfx. More participants, more diversity."),
    ], [("C64 was the foundation. Without it, none of this exists.", "support", "+10 Rep"), ("Amiga pushed the format further.", "flame", "+10 Rep")]),

    ("emu", "VGA MODE-X: THE UNCHAINED RESOLUTION HACK", "mid", [
        ("ByteWizard", "360x480 with 256 colors gave PC coders a real-time canvas rivaling the Amiga."),
        ("Chaos", "Mode-X was painful to program but double resolution was worth it."),
        ("RasterRat", "Mode-X unchained is the VGA trick every PC demoscener needed to know."),
    ], [("Mode-X was the PC scene's defining technical achievement.", "support", "+15 Research, +10 Rep"), ("Amiga planar display was superior. Mode-X was catch-up.", "flame", "+5 Rep")]),

    # === DEMO REVIEWS (8) ===
    ("demo_review", "REVIEW: SECOND REALITY — 30 YEARS LATER", "modern", [
        ("DemosceneHistorian", "Second Reality still holds up. Voxel donut, 3D tunnel, synchronized soundtrack. Timeless."),
        ("RasterRat", "Software voxel engine on a 486. No GPU. Pure assembly optimization. Humbles every modern demo."),
        ("Chaos", "Second Reality is a museum piece. Modern 4K procedural generation is more impressive."),
    ], [("Second Reality is timeless. It defined the scene.", "support", "+15 Rep, +10 Research"), ("Modern 4K intros are technically superior.", "flame", "+10 Rep")]),

    ("demo_review", "REVIEW: DEBRIS BY FARBRAUSCH (2000)", "late", [
        ("DemosceneHistorian", "Debris changed 64K forever. Procedural textures, real-time shadows, cohesive experience."),
        ("Chaos", "Proved 64K was enough for a complete audio-visual experience. Before Debris, tech demos. After, art."),
        ("CrashOverride", "Werkzeug was more innovative. The procedural world generation was a bigger achievement."),
    ], [("Debris redefined 64K. Most influential intro ever.", "support", "+15 Rep, +15 Research"), ("Werkzeug was more technically innovative.", "flame", "+10 Rep")]),

    ("demo_review", "REVIEW: STATE OF THE ART BY SPACEBALLS (1992)", "mid", [
        ("DemosceneHistorian", "First demo that felt like a music video. Vector animation synced to soundtrack was unprecedented."),
        ("RasterRat", "Pre-computed animation paths let them pack more complexity per frame than real-time."),
        ("Chaos", "Milestone but key sections were pre-rendered. Real-time generation is more honest."),
    ], [("Proved demos could be art. Seminal work.", "support", "+15 Rep, +10 Art rep"), ("Pre-rendered sections undermine the real-time ethos.", "flame", "+5 Rep")]),

    # === NOSTALGIA (6) ===
    ("first_demo", "YOUR FIRST DEMO EXPERIENCE: WHEN DID THE SCENE HOOK YOU?", "modern", [
        ("DemosceneHistorian", "Hardwired by The Silents on Amiga in 1991. The rotating 3D wireframe cube. I knew immediately."),
        ("RasterRat", "Second Reality at a friend's house in 1993. I asked 'How is this possible on a PC?' Spent 5 years learning."),
        ("CrashOverride", "A cracktro on a pirated game in 1988. Scrolling text: 'Greetings to all C64 sceners.' I felt part of something bigger."),
    ], [("First demo is a universal scene memory. Share yours.", "support", "+15 Rep"), ("The scene is about the code. Nostalgia is irrelevant.", "flame", "+5 Rep")]),

    ("traditions", "LOST TRADITIONS: WHAT DO YOU MISS ABOUT THE OLD SCENE?", "modern", [
        ("DemosceneHistorian", "Floppy trading culture. The hand-drawn labels. The anticipation of mail. Digital lacks tactile magic."),
        ("Ranger", "BBS culture. The modem handshake, ASCII art logins, local communities. Discord has no character."),
        ("SysOp42", "The role of SysOps as curators. Anyone uploads anything now. Signal-to-noise collapsed."),
    ], [("Physical distribution had magic digital cannot replicate.", "support", "+15 Rep"), ("The scene evolves. Old traditions were obsolete inefficiencies.", "flame", "+5 Rep")]),

    # === FUN (6) ===
    ("coffee", "CODER COFFEE FUEL: DEBUGGING AT 4AM", "late", [
        ("CrashOverride", "Coffee and hatred. Every bug is a personal victory over the compiler."),
        ("RasterRat", "Green tea avoids the caffeine crash. 6 pots per compo deadline."),
        ("FlameAlchemist", "Energy drinks and spite. The SID runs on 5V and the coder runs on Monster."),
    ], [("Coffee is the official scene beverage.", "support", "+5 Rep"), ("Tea provides sustained energy. Green tea wins.", "flame", "+5 Rep")]),

    ("debug_story", "WORST BUG STORIES: SHARE YOUR DEBUGGING NIGHTMARE", "modern", [
        ("ByteWizard", "3 days debugging a flickering sprite. Bug: forgot to clear the VIC-II sprite pointer. Defaulted to random data."),
        ("Chaos", "Shader artifacts for weeks. Was passing wrong resolution to GPU. Rendering at 320x240, thought it was 640x480."),
        ("RasterRat", "Demo crashed on every machine except mine. Missing semicolon in inline assembly. Compiler added NOP on my machine."),
    ], [("Debugging stories are the scene's folklore.", "support", "+10 Rep, +5 Research"), ("The best bugs produce the most entertaining demos.", "flame", "+5 Rep")]),

    ("lost_code", "BEST LAST-MINUTE COMPO SAVES", "late", [
        ("CrashOverride", "Finished 64K at 4:47AM. Deadline 5:00AM. Binary loaded from a borrowed floppy. The guy was in the toilet."),
        ("Chaos", "Memory leak crashed after 3 minutes. Compo limit was 4 minutes. Added brute-force reset at 2:50. Judges didn't notice."),
        ("RasterRat", "Shader compiled with warning. Worked on my machine. Compo machine rendered monochrome. Audience thought it was art."),
    ], [("Pressure creates the most creative solutions.", "support", "+15 Rep, +10 Research"), ("Professional deadline management beats heroic saves.", "flame", "+5 Rep")]),

    # === MORE HARDWARE TALK (8) ===
    ("hardware", "386SX vs 386DX: DOES THE BUS MATTER?", "mid", [
        ("ByteWizard", "386DX has 32-bit data bus. SX has 16-bit. For VGA data movement, 30% more throughput."),
        ("Chaos", "The bottleneck is always the VGA framebuffer, not the CPU bus."),
        ("RasterRat", "For Mode-X with planar bitmaps, the 32-bit bus of DX is essential."),
    ], [("Bus width matters for memory-intensive demos.", "support", "+10 Research"), ("Good code runs on any 386. Optimize algorithms, not buses.", "flame", "+5 Rep")]),

    ("hardware", "VOODOO 3 vs RIVA TNT: 1999 DEMO CARD", "late", [
        ("RasterRat", "Voodoo 3 has better GLIDE support. 16-bit color is not a limitation for demos."),
        ("Chaos", "TNT has 32-bit color, 24-bit Z-buffer, better fill rate. Objectively superior."),
        ("ByteWizard", "Voodoo 3 is simpler = more predictable performance. For 60fps, predictability wins."),
    ], [("GLIDE API is more reliable for compo demos.", "support", "+10 Research, +10 Rep"), ("TNT 32-bit color wins for visual quality.", "flame", "+10 Rep")]),

    # === EXTRA SCENE GOSSIP (6) ===
    ("flame_war", "RAZOR 1911 vs FAIRLIGHT: THE ULTIMATE RIVALRY", "early", [
        ("DemosceneHistorian", "The Razor 1911 vs Fairlight rivalry defined the 8-bit cracking scene. BBS flame wars were legendary."),
        ("CrashOverride", "Razor 1911 was bigger but Fairlight had better code. The multicolor loader war pushed both groups to innovate."),
        ("Dxyre", "I watched both groups trade insults on a Swedish BBS for 3 days straight. The sysop made $200 in connect fees."),
    ], [("The rivalry pushed the whole scene forward.", "support", "+10 Rep, +5 Research"), ("Drama is entertaining but code quality is what matters.", "flame", "+5 Rep")]),

    ("flame_war", "DUTCH vs GERMAN CODER RIVALRY: WHO WINS?", "early", [
        ("DemosceneHistorian", "Dutch coders were known for copper effects. German coders for raster interrupts. The techniques reflected cultural approaches to problem solving."),
        ("Ranger", "German coders were more disciplined. Dutch coders were more creative. The best groups had both nationalities."),
        ("Chaos", "The rivalry was artificial. Coders from both countries collaborated on BBS nodes. The flame wars were entertainment for the scene."),
    ], [("Regional styles produce different techniques. Both are valid.", "support", "+10 Rep"), ("Nationality does not determine coding quality. Stop the tribalism.", "flame", "+5 Rep")]),

    # === 4K/64K FORMAT TIPS (4) ===
    ("sizecode", "COMPRESSION TRICKS: SQUEEZING 64K INTO 64K", "late", [
        ("ByteWizard", "The best compression is deletion. Every byte you do not include compresses to zero. Remove features, not overhead."),
        ("Chaos", "Procedural generation is the ultimate 64K trick. Why store a texture when you can generate it in 40 bytes of code?"),
        ("CrashOverride", "Use the GPU as a decompressor. A 50-byte shader can generate 10MB of visual data. The math does the heavy lifting."),
    ], [("Procedural generation is the only honest 64K approach.", "support", "+15 Research, +10 Rep"), ("Real compression algorithms beat procedural tricks.", "flame", "+5 Rep")]),

    ("raymarch", "SDF RAYMARCHING: THE 4K INTRO SECRET WEAPON", "modern", [
        ("Chaos", "Signed distance field raymarching generates infinite detail from 30 lines of GLSL. It is magic."),
        ("ByteWizard", "Box-marching with soft shadows gives photorealistic results in under 4KB. The math is the asset."),
        ("RasterRat", "Raymarching is to 4K intros what copper bars were to Amiga demos: the defining technique of the era."),
    ], [("SDF raymarching is the 4K format's greatest technique.", "support", "+15 Research, +15 Rep"), ("Polygon rendering is more versatile. Raymarching is a trick.", "flame", "+5 Rep")]),

    # === MODERN SCENE (6) ===
    ("ai_art", "AI TEXTURES IN DEMOS: INNOVATION OR CHEATING?", "modern", [
        ("Trix", "Stable Diffusion textures are not pixel art. You are a prompt engineer, not an artist."),
        ("Vectra", "Procedural generation has been part of the scene since 1992. AI is just better procedural."),
        ("DemosceneHistorian", "The line between procedural and AI is blurry. 4K intros used noise for decades. Curation is the craft."),
    ], [("AI is a tool. The artist curates the result.", "support", "+15 Research, +10 Rep"), ("AI has no soul. Demoscene is about human creativity.", "flame", "+15 Rep")]),

    ("gfx_format", "BEST TEXTURE FORMAT FOR MODERN DEMOS", "modern", [
        ("Trix", "PNG is the only format worth using. Lossless, alpha channel, wide support."),
        ("Vectra", "For 4K intros you need procedural. For larger demos, indexed PNG is best."),
        ("RasterRat", "DDS with DXTC is what GPUs understand natively. PNG conversion wastes cycles."),
    ], [("DDS compression is the professional choice.", "support", "+15 Research, +10 Rep"), ("PNG is universal. DDS is DirectX vendor lock-in.", "flame", "+5 Rep")]),

    # === TOOL RELEASES (4) ===
    ("release", "NEW CRACKTOOL RELEASED: NFO ON ALL NODES", "early", [
        ("CrashOverride", "Just dropped a new disk nibbler that reads 4 bad tracks per revolution. No loader needed."),
        ("Dxyre", "The tool scene is thriving. Every month a new trainer or ripper hits the Swedish nodes."),
        ("SysOp42", "Tool releases are the backbone of the scene infrastructure. Report dead links to your local sysop."),
    ], [("Tool releases keep the scene infrastructure alive.", "support", "+10 Rep"), ("The tool scene is just piracy with extra steps.", "flame", "+5 Rep")]),

    # === PARTY GOSSIP EXTRA (4) ===
    ("party_trip", "ASSEMBLY CAMPING: TENT CITY OR HOTEL?", "mid", [
        ("Hype", "Camping at Assembly is the real experience. The tent city has its own BBS node and a 24/7 coding tent."),
        ("Vectra", "Hotel costs more but you get sleep. 3 hours of sleep in a tent vs 8 in a hotel = better demo code."),
        ("Ranger", "I sleep under the compo table. My jacket is my pillow. My C64 is my blanket. True story."),
    ], [("Camping with 500 sceners is the only way.", "support", "+10 Rep, -$20"), ("Hotel for sleep. A tired coder writes buggy code.", "flame", "+5 Rep")]),

    ("car_trip", "FERRIES TO FINLAND: SCENE TRAVEL STORIES", "early", [
        ("Hype", "The Stockholm-Helsinki ferry is a floating demoparty. Coders in the bar, demos on the lounge TV."),
        ("Ranger", "I met a Future Crew member on the ferry. He showed me an early build of Unreal on a laptop. Magical."),
        ("Vectra", "The ferry has power outlets in the conference rooms. 8 hours of coding time with sea views."),
    ], [("Ferry trips are legendary scene experiences.", "support", "+15 Rep"), ("The journey distracts from demo preparation.", "flame", "+5 Rep")]),
]


# Track used IDs to avoid duplicates
used_ids = set()
id_counter = {}

def make_id(cat):
    num = id_counter.get(cat, 100) + 1
    id_counter[cat] = num
    tid = f"thread_{cat}_{num}"
    if tid in used_ids:
        return make_id(cat)  # retry
    used_ids.add(tid)
    return tid


def generate_all():
    """Generate all threads"""
    templates = THREADS
    
    # For categories with only 1 thread, add variations with different years
    expanded = []
    for t in templates:
        cat, topic, era, msgs, choices = t
        expanded.append(t)
    
    total = len(expanded)
    # stderr report
    import sys
    print(f"Generating {total} threads...", file=sys.stderr)
    
    output = []
    for idx, (cat, topic, era, msgs, choices) in enumerate(expanded):
        year = pick_era_year(era)
        month = random.randint(1, 12)
        actor = random.choice(ACTORS := ["ranger_c64", "unreal_coder", "dxyre", "trix_art", "chaos_coder", "audio_drifter", "vectra_pixel", "hype_ops", "skaven", "purple_motion"])
        board = BOARD_MAP.get(cat, "CODERS_CORNER")
        
        credibility = random.randint(30, 90)
        speed = random.randint(30, 95)
        distortion = random.randint(10, 70)
        influence = random.randint(30, 90)
        viral = random.randint(1, 3)
        tid = make_id(cat)
        
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
        
        output.append(f"    {{")
        output.append(f"      id: \"{tid}\",")
        output.append(f"      board: \"{board}\",")
        output.append(f"      topic: \"{topic}\",")
        output.append(f"      year: {year},")
        output.append(f"      month: {month},")
        output.append(f"      actorId: \"{actor}\",")
        output.append(f"      messages: [")
        for sender, text in msgs:
            color = NPC_COLORS.get(sender, "text-zinc-400")
            output.append(f"        {{ sender: \"{sender}\", text: \"{text}\", color: \"{color}\" }},")
        output.append(f"      ],")
        output.append(f"      interacted: false,")
        output.append(f"      playerActionTaken: null,")
        output.append(f"      dramaFinished: false,")
        output.append(f"      choices: [")
        for ctext, ctype, ceffect in choices:
            output.append(f"        {{ text: \"{ctext}\", type: \"{ctype}\", effectDescription: \"{ceffect}\" }},")
        output.append(f"      ],")
        output.append(f"      infoType: \"rumor\",")
        output.append(f"      credibilityScore: {credibility},")
        output.append(f"      propagationSpeed: {speed},")
        output.append(f"      distortionRate: {distortion},")
        output.append(f"      influenceWeight: {influence},")
        output.append(f"      viralSpreadRank: {viral},")
        output.append(f"      isSuppressed: false,")
        output.append(f"      originalTopic: \"{topic}\",")
        output.append(f"      mutationCount: 0,")
        output.append(f"    }},")
    
    print("\n".join(output))
    print(f"// Generated {total} threads", file=__import__('sys').stderr)


if __name__ == "__main__":
    generate_all()
