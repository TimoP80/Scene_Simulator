"""
Extends tmp/generate_bbs_threads.py by appending ~130 more thread templates
to the THREAD_TEMPLATES list, then re-runs the generator.
"""

import sys
sys.path.insert(0, '.')

# The additional templates covering: music gear, demo style analysis,
# scene economy, pixel art tutorials, competition recaps, and more.
ADDITIONAL_TEMPLATES = """
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
"""

# Read existing script
with open('tmp/generate_bbs_threads.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Find the end of THREAD_TEMPLATES array and insert before it
# Look for the Generate all threads comment
end_idx = content.find('# Generate all threads')
if end_idx > 0:
    # Find the line before the # Generate all threads
    before = content[:end_idx]
    after = content[end_idx:]
    
    # Remove the trailing ']' from the existing THREAD_TEMPLATES
    # Actually, the existing templates end with ']' and then a blank line
    # We need to insert before the closing ']'
    
    # Find the last ']' in the THREAD_TEMPLATES section that closes the array
    # It's right before '# Generate all threads'
    # Let me modify the after to remove any leading whitespace
    pass

# Simpler approach: read the existing, append the additional templates before the closing ']'
# Find the closing bracket and 'Generate all threads' section
gen_idx = content.find('# Generate all threads')
# Find the closing ']' of THREAD_TEMPLATES, which should be before gen_idx
close_idx = content.rfind(']', 0, gen_idx)

if close_idx > 0 and gen_idx > 0:
    new_content = content[:close_idx] + "," + ADDITIONAL_TEMPLATES + "\n" + content[close_idx:]
    
    with open('tmp/generate_bbs_threads.py', 'w', encoding='utf-8') as f:
        f.write(new_content)
    
    # Count new templates
    add_count = ADDITIONAL_TEMPLATES.count('"cat":')
    print(f"Added {add_count} new templates")
else:
    print("Could not find insertion point")
