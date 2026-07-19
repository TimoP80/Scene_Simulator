/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * BBS message variety — the canonical pool of seed threads, voice profiles,
 * rumor scribes, sysop replies, era-based topic variants, spyline templates,
 * and random BBS events that the demoscene simulator draws from.
 *
 * Per docs/architecture.md, this lives in /sim/data: pure data + pure
 * generator functions. NO React, NO DOM, NO fetch, NO setState. A Vite SSR
 * or Node test target must be able to load this file.
 *
 * Three eras map to the canonical demoscene platform generations:
 *   - early (1985-1989):  8-bit — C64, ZX Spectrum, cassette distribution
 *   - mid  (1990-1995):  16-bit — Amiga, DOS, 386/486, copper/blitter tricks
 *   - late (1996-2005):  PC 3D — Pentium, 3Dfx, OpenGL, procedural shaders
 *
 * Topic variants and voice profiles are indexed by era so a 1985 thread
 * never accidentally references a 1998 3Dfx card. Random picks at call time
 * still preserve era-appropriateness.
 */

import {
  SpecialtyType,
  type BBSMessage,
  type BBSThread,
  type Character,
} from "@packages/types";

// ============================================================================
// 1. Board definitions
// ============================================================================

export const BBS_BOARDS = [
  "CODERS_CORNER",
  "SCENE_RUMORS",
  "PARTY_GOSSIP",
  "PIXEL_PERFECTION",
  "TOOL_RELEASES",
  "LEAKS",
  "TRACKER_TUNES",
] as const;
export type BBSBoard = (typeof BBS_BOARDS)[number];

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
      "Cracktro compo needs 5 more entries or the category gets cancelled. Step up.",
      "Wildcard round: best copper effect wins a box of floppy disks from the organizers.",
    ],
    mid: [
      "Tracking 23 confirmed entries for the 64K compo. This is going to be a bloodbath.",
      "Wild compo announced: 4K intro for any platform. Modem the binary by Saturday.",
      "Compo machine specs finalized. No last-minute changes. Read the rules board.",
      "Demo compo is at 40 entries. We may need a second screen.",
      "Music compo judges announced: Purple Motion and Skaven confirmed. Expect high standards.",
      "Wild compo: best demo soundtrack using only SID chip samples. Winner gets a brand new 1541-II.",
    ],
    late: [
      "The 64K compo just hit 40 entries. The judges will need a week to recover.",
      "Online voting opens next week. No more paper ballots. Welcome to 1998.",
      "Compos go live on stream this year. The future is now and it is bandwidth-hungry.",
      "4K intro compo has a surprise rule change: no external tools. Pure assembler or GLSL only.",
      "Streaming the compo on IRC with live commentary. Multiple view angles. Welcome to the 21st century.",
    ],
  },
  TECHNICAL_DISCUSSIONS: {
    early: [
      "VGA tricks and planar memory debates — who is right, the manual or the German hackers?",
      "Fast Fourier transforms on a 6502? Yes, if you enjoy 2 minutes per sample.",
      "Tracker module recommendations — Protracker 2.3d or Noisetracker? Fight!",
      "Assembly optimization debates — 6502 vs Z80. The C64 kids vs the ZX crowd.",
      "Sprite multiplexing on the VIC-II: is 8 sprites per scanline a wall or a challenge?",
      "FLI (Flexible Line Interpretation) mode tricks — share your undocumented discoveries.",
      "Cycle-counting vs raster IRQ: which technique gives cleaner splits on a loaded C64?",
    ],
    mid: [
      "Anyone got a working Mode-X unchained routine for VGA? The manuals lie.",
      "Register allocation in 68000 assembly: who has the cleanest macros?",
      "Best 4-channel MOD player for 1995? Protracker 2.3d or FastTracker 2.04?",
      "Coprocessor math vs pure ASM for polygon math. The coprocessor kids are winning.",
      "Dynamic memory allocation on a 68000 without an OS: heap fragmentation strategies.",
      "Bitplane DMA timing: why does your Amiga demo flicker on real hardware but not in emulation?",
      "The holy grail: perfect audio-video sync on a loaded Amiga 500. Post your interrupt chains.",
    ],
    late: [
      "MMX intrinsics vs raw SSE: who wins on a Pentium III? Intrinsics are cheating, fight me.",
      "GLSL fragment shaders: is anyone still using fixed-function? Asking for a friend.",
      "Wavetable synthesis on a GUS PnP — the dark horse of late-90s audio.",
      "Vertex buffer objects vs display lists in OpenGL 1.5. VBOs won, display lists lost.",
      "AGP texturing vs system memory: does fast writes actually matter for a 64K intro?",
      "Branch prediction on Pentium Pro: the silent killer of cycle-counted demo effects.",
      "Multi-texture blending with register combiners vs shaders: the Voodoo 5 swansong.",
    ],
  },
  FRIENDLY_RIVALRY: {
    early: [
      "PixelForge claims they'll win again this year. Sure, Jan.",
      "Bitstorm says last year's victory was pure luck. The flame war begins.",
      "Razor 1911 vs Fairlight: who really wrote the multicolor loader? The plot thickens.",
      "Dutch vs German scene: which country has better copper coders? The BBS flames are legendary.",
      "C64 vs ZX Spectrum: the 8-bit wars rage on. Both sides are wrong, the Amiga is coming.",
    ],
    mid: [
      "Future Crew vs Razor 1911: the BBS wars continue. The modems are smoking.",
      "Fairlight challenges anyone to a cracktro speed-coding contest. 4 hours, one intro.",
      "Triad says their 3D engine will blow everyone away. Show us the binary.",
      "Amiga vs PC demo scene: the eternal debate. Copper coprocessor vs VGA Mode-X.",
      "Norwegian vs Swedish sceners: who throws the better after-party? Evidence from 4 parties.",
    ],
    late: [
      "Farbrausch vs Black Maiden: the 64K arms race continues. Bytes are getting smaller.",
      "Trauma claims their new intro is the best since Werkzeug. Big words, empty proof.",
      "Conspiracy: the 4K compo is rigged. We all know it. The Nordic mafia runs the scene.",
      "GLSL vs HLSL: the shader language war is just DirectX vs OpenGL all over again.",
      "Pouet.net drama: is the scene stuck in the past or just respecting its roots? Flame on.",
    ],
  },
  HARDWARE_WOES: {
    early: [
      "Sound card refusing to cooperate. The IRQ jumper is a lie.",
      "386 overheats during rendering. The case fan is decorative at best.",
      "Finally got EMS memory working. Limine 4.0 forever.",
      "My 1541 drive head is misaligned by 0.1mm. Any calibration tools on the Swedish nodes?",
      "C64 VIC-II chip is dying. The character set is glitching on every 34th row. Replacement chips anyone?",
      "My 300 baud modem keeps dropping carrier on long downloads. The acoustic coupler picks up every truck passing by.",
    ],
    mid: [
      "GUS PnP won't initialize on a 486. IRQ conflict with the sound blaster?",
      "Amiga blitter keeps corrupting copper lists. Known bug, undocumented fix.",
      "Voodoo 1 overheating during long renders. The heatsink is a sticker.",
      "My Amiga 1200's PSU is making a whining noise under load. Anyone know a replacement that does not cost a fortune?",
      "SCSI terminator nightmares: daisy-chaining a hard drive and a CD-ROM on an Amiga 3000. Pray for me.",
    ],
    late: [
      "GeForce 3 drivers crash on a 4K intro. Anyone have a stable beta from the underground?",
      "Audigy 2 has 200ms latency in DOS mode. Unusable for tracker workarounds.",
      "My LCD monitor flickers at 85Hz. Stuck at 60Hz. The CRT gang is winning again.",
      "The AGP slot on my motherboard just died. My Voodoo 5 is now a paperweight. Anyone have a PCI Voodoo 3 for sale?",
      "DDR vs RDRAM: my Pentium 4 board needs the expensive RAMBUS. The budget is crying.",
      "ATX PSU pinout on a 1998 motherboard: someone swapped the ground and the power good wire. Magic smoke escaped.",
    ],
  },
  SCENE_GOSSIP: {
    early: [
      "Groups recruiting members across Europe. Floppy swappers preferred.",
      "Someone switching groups — internal drama confirmed by two independent nodes.",
      "Rumors about an upcoming production from an unnamed group. Codename: TITANIC.",
      "Heard a Polish coder is working on a 64K intro solo. The ambition is unreal.",
      "A new BBS node just opened in Athens. The scene is finally reaching Southern Europe.",
    ],
    mid: [
      "Three members just left Future Crew. Internal drama confirmed by leaked mail.",
      "Heard through the grapevine: a new group is forming in Finland. Codename: COLDPLAY.",
      "Razor 1911 split is imminent. Internal mail leaked via a Stockholm node.",
      "A French crew is developing a new tracker. If it supports 64 channels it will change everything.",
      "Anonymous source: a major PC demo is being ported to Amiga by a third-party team. Expect it at Assembly 1993.",
    ],
    late: [
      "Farbrausch is winding down. New project: a 4K engine rewrite with shaders.",
      "Black Maiden's next release is a 1K intro. Yes, one kilobyte. The arms race continues.",
      "The scene is migrating to IRC. BBS nodes are dying. Modem handshake RIP.",
      "Conspiracy theory: Trauma's 4K engine is actually Farbrausch's code with a new wrapper. Prove me wrong.",
      "The 64K compo at Breakpoint 2002 will have more entries than the mega-demo compo. Size optimization is the new king.",
      "A Dutch demo group just announced they are going open source. The scene is divided on whether this is heresy or evolution.",
    ],
  },
  HUMOR: {
    early: [
      "Fake flame wars — is this real or just sysop trolling? Asking for a friend in Warsaw.",
      "ASCII art of a 1541 drive eating a floppy. In copper palette. Send your best.",
      "Running jokes about debugging at 3 AM. The modem handshake is the only lullaby I need.",
      "I just spent 6 hours debugging a raster routine. The bug was a missing semicolon. In assembly. There are no semicolons in assembly.",
      "My friend said 'it compiles, ship it'. We shipped it. It crashed the compo machine. We are banned from the party.",
    ],
    mid: [
      "My code compiled on the first try. I don't trust it. Burning a floppy as a sacrifice.",
      "3 AM: the demo gods demand a sacrifice. I offered a floppy disk. They wanted a CD-ROM.",
      "The modem handshake noise is actually a secret message. Decoded it. It says BUY MORE RAM.",
      "I named my variable 'temp123' six months ago. I have six temp123 variables now. The compiler can figure it out.",
      "A coder, an artist, and a musician walk into a demoparty. The musician leaves with the artist's girlfriend. The coder does not notice because he is optimizing a for loop.",
    ],
    late: [
      "I optimized one instruction and lost 10fps. Send help. The compiler is laughing at me.",
      "The 4K compo is just a measurement of who can delete more code. Delete is the new write.",
      "My shader compiles in 0.3 seconds. The demo runs at 200fps. I am become death, destroyer of frames.",
      "Found a bug in my GLSL shader. The bug is the entire shader. Starting over with a different approach.",
      "A perfect 4K intro is one where you delete 3.9KB of code and the remaining 0.1KB generates the whole demo. This is my design philosophy and also my therapist's concern.",
    ],
  },
};

// ============================================================================
// 2. Era helper
// ============================================================================

export type Era = "early" | "mid" | "late";

export function getEra(year: number): Era {
  if (year < 1990) return "early";
  if (year < 1996) return "mid";
  return "late";
}

// ============================================================================
// 3. NPC color palette (used by followed reply generator + seed threads)
// ============================================================================

const NPC_COLORS: Record<string, string> = {
  "Purple Motion": "text-[#4ade80]",
  "Skaven": "text-blue-400",
  "Psi": "text-[#22d3ee]",
  "Dxyre": "text-rose-400",
  "Trix": "text-[#c084fc]",
  "Chaos": "text-[#a855f7]",
  "Ranger": "text-[#fb923c]",
  "Drifter": "text-amber-300",
  "Vectra": "text-rose-300",
  "Hype": "text-amber-400",
  "CreamD": "text-[#d8b4fe]",
  // Recurring BBS personalities (recognized handles, not NPCs)
  "ByteWizard": "text-blue-300",
  "RasterRat": "text-rose-400",
  "ChipTuneKid": "text-amber-300",
  "SysOp42": "text-zinc-400",
  "CrashOverride": "text-purple-400",
  "DemosceneHistorian": "text-emerald-400",
  "FlameAlchemist": "text-orange-400",
  "CopperGhost": "text-cyan-300",
  "PulseWave": "text-pink-400",
};

export function colorForHandle(handle: string): string {
  return NPC_COLORS[handle] ?? "text-zinc-400";
}

// ============================================================================
// 4. Voice profiles by specialty × era
// ============================================================================

/**
 * Each entry is a short BBS-style one-liner the NPC would plausibly type.
 * Tone is period-accurate, jargon-dense, and slightly opinionated. Used by
 * `generateFollowedReply` and the seed-thread `messages` arrays.
 */
export const VOICE_PROFILES: Record<SpecialtyType, Partial<Record<Era, string[]>>> = {
  [SpecialtyType.AssemblyWizard]: {
    early: [
      "Cycle-perfect raster splits are the only true scene religion!",
      "6502 register tricks beat any modern compiler optimization, period.",
      "If you can count the cycles, you can bend the raster. Everything else is faking it.",
      "VIC-II badlines are not a bug, they are a feature. Learn to ride them.",
      "C64 NMI raster interrupts separate the coders from the scripters.",
      "Zero-page addressing on the 6502 is the closest we get to having registers. Guard it with your life.",
      "Sprite multiplexing via raster IRQ is the only way to push 64 sprites on a C64. Eight is never enough.",
    ],
    mid: [
      "Amiga blitter abuse is the path to 50fps fluid effects on a 7MHz 68000.",
      "Motorola 68000 pipeline optimization separates the men from the boys.",
      "Copper lists are not magic, they are an 8-channel DMA scheduler. Read the manual.",
      "Who needs a GPU when you have a properly abused blitter queue?",
      "Planar-to-chunky conversion via lookup tables is the only sane approach.",
      "68000 register allocation is an art form. You have 16 data registers and 8 address registers. Use them wisely or waste them.",
      "Self-modifying code on the Amiga 500 is not a hack, it's a legitimate performance strategy. Fight me.",
    ],
    late: [
      "MMX intrinsics are pure cheating. Write real SIMD assembler!",
      "3DNow! vs SSE: AMD had the right idea first, Intel copied them years later.",
      "Vertex shader optimization on a Pentium III is a 3am coffee-only sport.",
      "Cache misses are the silent killer of every 4k intro.",
      "Pentium Pro out-of-order execution breaks naive cycle counting. Welcome to the new hell.",
      "SIMD throughput is the only metric that matters on modern x86. Scalar code is dead, long live vector code.",
      "Prefetch instructions on Pentium III are a dark art. One wrong hint and your pipeline stalls for 20 cycles.",
    ],
  },
  [SpecialtyType.TrackerLegend]: {
    early: [
      "SID chip envelopes are deeper than any FM synth ever dreamed of being.",
      "4-channel MOD composition is the only honest way to write chiptune music.",
      "Sample rate below 8kHz is not a limitation, it is a style choice.",
      "The Amiga audio interrupt is the only clock that matters in 1987.",
      "Pulse-width modulation on the SID sounds like the future, even today.",
      "Arpeggio on the C64 SID is not just for chords. Use it for percussion too. It changes everything.",
      "Tracking drums on a 4-channel MOD is like solving a puzzle where every sample slot is precious.",
    ],
    mid: [
      "Protracker 2.3d final is the last tracker that ever mattered. Fight me.",
      "FastTracker II XM format vs MOD: there is no contest, XM wins on flexibility.",
      "A 32-channel FastTracker II module is the closest we get to symphonic chiptune.",
      "Gus hardware mixing is the only way to hear what the composer actually intended.",
      "If your module does not have a vibrato macro, you are not trying hard enough.",
      "GUS wavetable interpolation at 44kHz makes 22kHz samples sound like they belong in a concert hall.",
      "Stereo separation in XM modules is the unsung hero of 16-bit tracker music. Pan your instruments!",
    ],
    late: [
      "Streaming OGG Vorbis is a betrayal of the tracker spirit. Use IT compression!",
      "Impulse Tracker 2.14's new sample synthesizer features make FastTracker obsolete.",
      "A clean 4-channel IT module still hits harder than 90s mainstream electronica.",
      "Wavetable synthesis on a GUS PnP is the dark horse of late-90s tracker music.",
      "Modules that load in 64KB intros prove that less is always more in tracker composition.",
      "Procedurally generated samples in 64K intros are the next frontier. Why sample a piano when you can synthesize one in 200 bytes?",
      "The IT format's compressor is criminally underused. A 2MB module can fit in 300KB with intelligent instrument packing.",
    ],
  },
  [SpecialtyType.PixelPerfectionist]: {
    early: [
      "C64 multicolor bitmap mode is the only real canvas. Hi-res is for cowards.",
      "Dithering a 16-color palette to fake a 256-color gradient is the real art.",
      "FLI bug stretching is not a hack, it is a feature. Embrace the glitch.",
      "Color cycling on the VIC-II produces more atmosphere than any modern shader.",
      "If you cannot draw a face in 320x200 with 4 colors, you cannot draw.",
    ],
    mid: [
      "Amiga 32-color palette + copper gradient = more visual range than any 256-color PC mode.",
      "HAM mode is criminally underrated. Yes the fringing is ugly. Yes it is also iconic.",
      "Chunky-to-planar blit tricks beat any PC mode 13h pixel plotter, hands down.",
      "Copper-driven palette swaps every scanline is the only legitimate use of overdraw.",
      "Deluxe Paint IV brush dynamics still outperform every modern pixel tool I have tried.",
    ],
    late: [
      "Mipmap levels are not optional, they are the difference between a demo and a slideshow.",
      "32-bit truecolor breaks the discipline that made 8-bit pixel art great.",
      "Procedural texture generation in a 64k intro is the new pixel art. Embrace it.",
      "Anti-aliasing is a crutch for people who cannot commit to a pixel.",
      "Alpha blending at 60fps on a Voodoo Graphics is what 8-bit dithering always wanted to be.",
    ],
  },
  [SpecialtyType.OpenGLPioneer]: {
    early: [
      "VGA mode 13h 320x200x256 is the only real-time 3D canvas an indie dev needs.",
      "Software polygon rasterization at 30fps is a triumph, not a compromise.",
      "Fixed-point 16.16 math is faster than floats on a 386. Trust the integer.",
      "If your engine does not have a Z-buffer, you do not have a 3D engine.",
      "Mode-X unchained mode is the dark art that the VGA manual does not document.",
    ],
    mid: [
      "OpenGL 1.1 vs Direct3D 5: the API wars are settled by who ships drivers first.",
      "Perspective-correct texture mapping without hardware is a 4am-only operation.",
      "Gouraud shading is the minimum. Phong is the goal. Flat shading is for cowards.",
      "A 64x64 texture with mipmaps looks better than a 512x512 texture without them.",
      "Vertex buffers changed everything. Pre-3Dfx demos feel like cave paintings now.",
    ],
    late: [
      "Vertex shaders are not optional. If you are not writing GLSL, you are not shipping a 4k.",
      "Procedural noise functions beat pre-baked textures every single time.",
      "A 3Dfx Voodoo 1 + a 64k intro is the peak of the demoscene form. Everything after is just polish.",
      "GeForce 3 vertex programs are a quantum leap. Light at the end of the fixed-function tunnel.",
      "Shader model 3.0 is when the real-time graphics revolution actually started, not the Voodoo.",
    ],
  },
  [SpecialtyType.OrganizerExtraordinaire]: {
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
      "Unrolled loops in a plasma effect gain you 12 raster lines per frame. Worth every byte.",
      "If your rotozoomer does not use precomputed sin/cos tables, you are burning extra cycles for no reason.",
    ],
    mid: [
      "Procedural texture generators are the new raster bars. Embrace the math.",
      "Voxel heightfields are overused but still the easiest way to impress a crowd.",
      "A clean roto-zoomer with 200 fps on a 386 is the peak of the form.",
      "Sub-pixel accuracy in a 2D scroller is a lost art. Bring it back.",
      "Fire effects are the gateway drug to procedural generation. Everyone starts with fire.",
      "Plasma clouds in 16 colors on a C64 teach you more about color theory than 32-bit truecolor ever will.",
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
      "A demo without a proper fade-in is like a film without an opening title. Set the mood first.",
      "Timing the first effect drop to hit exactly on the downbeat of the music is the cheapest way to impress a crowd.",
    ],
    mid: [
      "Demo direction is a real skill. Anyone can chain effects, few can tell a story.",
      "A good megademo has a clear arc: intro, buildup, climax, credits. Not just a list.",
      "Soundtrack sync is harder than any single effect. Respect the audio engineers.",
      "The best demos know when to stop. A 4-minute demo that feels like 2 is the goal.",
      "A well-placed text scroller after a visual climax gives the audience time to breathe before the next effect wave.",
      "Demo transitions are more important than the effects themselves. A bad transition ruins both effects.",
    ],
    late: [
      "4k intros are the purest form of demo direction. Every byte matters, every frame matters more.",
      "A great modern demo respects the audience's time. 3 minutes of perfection beats 10 of filler.",
      "The 64k compo is where the best directors prove themselves. Constraints breed creativity.",
      "Demo direction in 2004 means understanding both the hardware and the human watching it.",
      "A 4K intro that tells a micro-story in 60 seconds is harder to direct than a 10-minute megademo. Discipline is everything.",
      "The credits roll is the last thing the audience remembers. Do not rush it.",
    ],
  },
  [SpecialtyType.CrackerSwapper]: {
    early: [
      "Floppy disk labels are an art form. Hand-drawn copper logos beat any print.",
      "A 4-disk demo swap is the only way to get a copy before the BBS nodes catch up.",
      "Snail mail floppy trades built the European scene. Respect the postal workers.",
      "A good swap meet has free pizza and a working XT keyboard. Everything else is optional.",
      "Label your floppies properly. Nothing worse than a box of 50 unlabeled disks at 2am before a party deadline.",
      "The best demos arrive on customized disks with hand-drawn labels. Make your media match your art.",
    ],
    mid: [
      "CD-ROM distribution in 1994 is the death of the floppy swapper. Adapt or die.",
      "A 50-disk mailer to Finland costs $15. A BBS upload is free. The math is obvious.",
      "International swap networks are the backbone of the global scene. Maintain your contacts.",
      "A swapper with a fast postal route and a sharp pen is worth more than any coder.",
      "Setting up an FTP drop for your group is the modern equivalent of maintaining a BBS node. Do it properly.",
      "The swapper network in 1995 routes more unreleased demos than any official channel. We are the internet before the internet.",
    ],
    late: [
      "FTP distribution killed the physical swap meet. The new swap meet is the IRC channel.",
      "Online distribution means everyone has the demo in 10 minutes. The swap meet is over.",
      "A modern swapper's job is moderation and quality control, not physical media.",
      "The scene survives on the swapper's spirit even when the floppies are gone.",
    ],
  },
};

// ============================================================================
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
  DemosceneHistorian: {
    handle: "DemosceneHistorian",
    color: "text-emerald-400",
    focusCategories: ["TECHNICAL_DISCUSSIONS", "SCENE_GOSSIP"],
    messages: {
      early: [
        "For context, the Dutch cracked the VIC-II color burst back in 1983. This debate was settled before most of you picked up a soldering iron.",
        "The very first copper list was written in 1984 on an Amiga 1000 prototype. Read the Jay Miner notes — they are essential reading.",
        "People forget that the C64 was designed to be a video game console first. The computer part was an accident.",
        "The first 4-channel tracker was written on an Amiga 500 in 1987. Before that we had 3-channel monsters on the C64.",
      ],
      mid: [
        "The first scene demo competition was at the 1986 Copy Party in Finland. Only 7 entries, all C64 cracktros. Look how far we have come.",
        "Future Crew's Unreal was the first PC demo that made Amiga sceners nervous. 1990 was a turning point.",
        "The term 'megademo' was coined by The Silents in 1988. Before that everything was just a 'demo' or a 'cracktro'.",
        "History lesson: Second Reality's voxel engine was inspired by a 1992 Commodore Amiga demo called 'Hardwired'. The lineage is clear.",
      ],
      late: [
        "The 64K intro format was pioneered by Future Crew in 1993 with 'Panic'. Farbrausch's 'Debris' perfected it 7 years later.",
        "The term 'procedural generation' entered scene vocabulary around 1998 when Farbrausch started publishing their toolchain.",
        "Assembly 1999 was the last year the 4K compo used floppy disks. The future was CD-ROMs, and the scene adapted.",
        "Historians agree: the demoscene's golden era was 1992-1995. Everything after is a refinement of what came before.",
      ],
    },
  },
  FlameAlchemist: {
    handle: "FlameAlchemist",
    color: "text-orange-400",
    focusCategories: ["FRIENDLY_RIVALRY", "HUMOR"],
    messages: {
      early: [
        "Your code is slower than a 1541 loading from a scratched disk. Go back to BASIC.",
        "I've seen better raster splits from a 1970s calculator. Did you even count the cycles?",
        "Calling that a demo is generous. My toaster has more artistic merit and it doesn't even have video output.",
        "Your scroller has a typo on line 3. Actually, the whole thing is a typo. Start over.",
      ],
      mid: [
        "That '3D engine' you are so proud of runs at 12fps on a 386. My abacus renders faster.",
        "I have seen better copper gradients in a 1985 cracktro. Your palette work is an embarrassment to the Amiga name.",
        "You call that a texture mapper? My breakfast toast has more polygons and better filtering.",
        "That demo is 90% filler, 10% effects, and 100% boring. Cut 3 minutes and start from the intro.",
      ],
      late: [
        "Your vertex shader is slower than fixed-function. You managed to make 1997 technology faster than 2000 technology. Impressively backwards.",
        "That 4K intro uses 3.9KB of framework and 0.1KB of actual content. The ratio is telling.",
        "I have seen procedural textures with more variety from a broken GIMP plugin. Your noise function is a single octave, lazy.",
        "Streaming audio in a 64K intro is cheating. Real demosceners synthesize their drums. Go back to protracker.",
      ],
    },
  },
  CopperGhost: {
    handle: "CopperGhost",
    color: "text-cyan-300",
    focusCategories: ["TECHNICAL_DISCUSSIONS"],
    messages: {
      early: [
        "The Copper coprocessor on the Amiga can change 8 palette entries per scanline without CPU intervention. The C64 kids have no idea what they are missing.",
        "Dual-playfield parallax with copper-timed palette swaps is the closest we got to a 3D engine in 1987.",
        "If you are not using the Copper to drive your raster interrupts, you are doing the Amiga a disservice.",
        "The Amiga Copper is not a hack tool, it is a second processor. Treat it with respect.",
      ],
      mid: [
        "A well-timed copper list can drive 50 color changes per scanline without a single CPU cycle. Try doing that on a VGA card.",
        "Copper-driven sprite multiplexing on the Amiga is the most elegant hack in scene history.",
        "Planar bitplanes are not a limitation. The Copper can re-map them in real time. That is the feature, not the bug.",
        "The Amiga Copper is still unmatched for palette-driven effects. 256 colors per frame if you time it right.",
      ],
      late: [
        "Modern GPUs have nothing on a properly programmed Amiga Copper for palette wizardry. The principles are the same, the hardware is just faster.",
        "Fragment shaders are the Copper's spiritual successor. They just took 15 years to catch up.",
        "Every time someone writes a palette cycle effect in GLSL, the ghost of Jay Miner smiles.",
        "Copper-era thinking: why render 16 million colors when 32 perfectly chosen ones tell a better story?",
      ],
    },
  },
  PulseWave: {
    handle: "PulseWave",
    color: "text-pink-400",
    focusCategories: ["COMPETITION_ANNOUNCEMENTS", "TECHNICAL_DISCUSSIONS"],
    messages: {
      early: [
        "Just finished a new 4-channel MOD that uses pulse-width modulation on every track. The C64 SID is crying.",
        "New sample pack: 200kb of Amiga drum hits ripped from vinyl. Posting to the Finnish node tonight.",
        "My ears are bleeding from 12 hours of tracker work. Worth it. The new module has 8 pattern breaks and a key change in the outro.",
        "Arpeggio macros in Protracker 2.3d: share your best patterns. I will trade a full 4-channel template.",
      ],
      mid: [
        "XM format allows 32 channels but who actually uses more than 16 without losing the audience? Quality over quantity.",
        "GUS wavetable interpolation at 44kHz is a game changer for tracker music. The future is here and it sounds warm.",
        "Just ported a 4-channel MOD to a 16-channel XM. The extra headroom for reverb is sublime.",
        "Impulse Tracker 2.08's new filter effects make FastTracker sound like a toy. Change my mind.",
      ],
      late: [
        "IT compression is underrated. A 4-minute module with 8 channels fits in 180KB. Try that with OGG streaming.",
        "Procedural synth modules in 64K intros are the highest form of tracker art. Pure math, no samples, all soul.",
        "Module music in 2003 is not dead. It has evolved. The 4K intro scene is pushing more audio innovation than the music industry.",
        "Trackers are not retro nostalgia. They are the most efficient music production tool ever invented. 200KB = 4 minutes of stereo heaven.",
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

// ============================================================================
// 5. Rumor scribes (15 — was 5)
// ============================================================================

export const BBS_SCRIBES = [
  "HexSwapper",
  "BitJunkie",
  "BufferBloat",
  "RasterDemon",
  "Degausser",
  "PhreakWave",
  "NullPointer",
  "ModemMaster",
  "BaudRateBandit",
  "ParityError",
  "SectorCrash",
  "VblankWatcher",
  "FloppyNinja",
  "GigaChad_X",
  "SysOp_Z",
];

// ============================================================================
// 6. Generic sector sysop replies (12 — was 4)
// ============================================================================

export const SYSOP_REPLIES = [
  "Is this authentic? My local BBS operator flagged this topic as highly volatile.",
  "Total demoscene history in the making. Let's keep this connection open!",
  "Loving this drama. Spreading floppies internationally to double check!",
  "Absolute state of the swapper lounge right now. Mind-blowing.",
  "My node has logged 47 new connections in the last hour. The scene is listening.",
  "Forwarding this to every European node I have access to. Stand by for replies.",
  "Cross-posted to the German sub-board. Two replies already, both contradicting each other.",
  "Thread archived for historical reference. This is going in next month's disk-mag.",
  "Local sysop here: flagged as high-engagement. Expecting virality within 24 hours.",
  "Inserting this into the next mod-mag rumor column. Editors will love it.",
  "Three flame replies already and it's only been live for an hour. Classic.",
  "Pinging the mod-tier sysops. Someone is going to lose their node privileges over this.",
  // SysOp42-flavored moderation quotes (recognizable handle)
  "SysOp42 says: This is your third cross-posting warning. Next offense is a 24-hour ban.",
  "SysOp42 says: Node maintenance scheduled for tonight. Expect 30 minutes of downtime.",
  "SysOp42 says: Reminder: no warez, no cracking requests, no personal attacks. This is a creative board.",
];

// ============================================================================
// 7. SYS_OP moderation messages (6 — was 1)
// ============================================================================

export const SYSOP_MODERATION_MESSAGES: BBSMessage[] = [
  { sender: "SYS_OP", text: "[BBS SYSTEM MANUAL ARCHIVE]: Thread buried by area moderator for hearsay and duplicate distribution guidelines violations.", color: "text-zinc-600" },
  { sender: "SYS_OP", text: "[MODERATION ALERT]: Thread locked pending verification. Do not crosspost until cleared by node administrator.", color: "text-zinc-600" },
  { sender: "SYS_OP", text: "[ARCHIVE PROTOCOL]: This thread has been moved to the historical scene-buffer for permanent record.", color: "text-zinc-600" },
  { sender: "SYS_OP", text: "[WARNING]: Do not link unreleased binaries in public threads. Use private courier channels for pre-release distribution.", color: "text-zinc-600" },
  { sender: "SYS_OP", text: "[BAN NOTICE]: User banned from this board for repeated flame violations. Appeals to node admin only.", color: "text-zinc-600" },
  { sender: "SYS_OP", text: "[VERIFICATION PENDING]: Sources unconfirmed. Thread demoted to rumor-tier until corroborated by a second node.", color: "text-zinc-600" },
];

// ============================================================================
// 8. Era-based topic variants per board (7 boards × 3 eras × 5-6 topics)
// ============================================================================

export const ERA_TOPICS: Record<BBSBoard, Record<Era, string[]>> = {
  CODERS_CORNER: {
    early: [
      "COPPER CONTEMPT ON AMIGA vs RASTER LINE HACKS",
      "6502 vs Z80: WHICH 8-BIT REIGNS SUPREME?",
      "VIC-II BADLINE RIDING: TECHNIQUE OR TRICKERY?",
      "NMI vs IRQ FOR RASTER INTERRUPTS — PROS AND CONS",
      "OPTIMIZING CASSETTE LOADER CODE BY 12 BYTES — IS IT WORTH IT?",
      "C64 ASSEMBLER: WHICH CROSS-COMPILER TARGETS ARE LEGIT?",
    ],
    mid: [
      "AMIGA BLITTER ABUSE: REAL 50FPS ON A 500?",
      "COPPER LISTS vs CPU RASTER POLLING: WHO WINS?",
      "68000 PIPELINE OPTIMIZATION — CYCLE COUNTS ARE LYING",
      "PLANAR-TO-CHUNKY VIA LOOKUP TABLES — SHARE YOUR ROUTINES",
      "FAST RAM vs CHIP RAM: WHAT REALLY LIMITS THE BLITTER?",
      "WHY IS MY 68000 CODE SLOWER THAN ASMONE SAYS?",
    ],
    late: [
      "3DFX vs SOFTWARE RENDERING — WHO WINS A 4K INTRO?",
      "PENTIUM III VERTEX SHADER OPTIMIZATION GUIDE",
      "MMX INTRINSICS: LAZY SHORTCUT OR LEGITIMATE TOOL?",
      "WHY YOUR OPENGL DEMO IS DROPPING FRAMES — COMMON MISTAKES",
      "3DNOW vs SSE: AMD WAS RIGHT ALL ALONG",
      "CACHE MISS PROFILING ON A PENTIUM PRO — REAL TALK",
    ],
  },
  SCENE_RUMORS: {
    early: [
      "FUTURE CREW CODES RUMORED TO PLAGIARIZE REGISTER OFFSETS?",
      "DID RAZOR 1911 REALLY STEAL THAT C64 CRACKTRO INTRO?",
      "FAIRLIGHT VS RAZOR 1911: WHO REALLY WROTE THE MULTICOLOR LOADER?",
      "SCANDAL: UNDERGROUND SYSOP SELLING PIRATED SWEDISH CHARTS?",
      "IS THE UK SCENE ACTUALLY ORGANIZED OR JUST CHAOS?",
    ],
    mid: [
      "DID SOMEONE REALLY PORT SECOND REALITY TO AMIGA?",
      "LEAKED: FUTURE CREW'S INTERNAL DEMO COMPO RESULTS",
      "RAZOR 1911 SPLIT IMMINENT — INTERNAL MAIL LEAKED",
      "FAIRLIGHT FOUNDER QUIETLY JOINING TRIAD — TRUE OR FALSE?",
      "DARKSTYLE VS TRIAD: WHO IS REALLY WINNING THE BBS WARS?",
    ],
    late: [
      "IS FARBRAUSCH'S DEBRIS REALLY A 64K INTRO OR ARE THEY CHEATING?",
      "CONSPIRACY: WHO LEAKED WERKZEUG'S SOURCE TWO WEEKS EARLY?",
      "BLACK MAIDEN'S NEW 4K — IS IT REALLY UNDER 4096 BYTES?",
      "RUMOR: TRAUMA IS SECRETLY THREE GROUPS IN A TRENCHCOAT",
      "DID ASUS LITERALLY BUY OUT THE WHOLE 3DFX R&D TEAM?",
    ],
  },
  PARTY_GOSSIP: {
    early: [
      "ASSEMBLY 1989 — ANYONE GOING? HOW MUCH ARE FLIGHTS?",
      "WHO ACTUALLY SHOWED UP TO THE REVISION UK MEET?",
      "DID THE X DEMO MEET REALLY HAPPEN OR WAS IT CANCELLED?",
      "SWEDISH PARTIES: WORTH THE TRIP OR OVERRATED?",
      "SPEEDLOCK AMIGA MEET — POST YOUR FAVORITE MOMENT",
    ],
    mid: [
      "ASSEMBLY OR THE PARTY? WHERE ARE THE REAL ELITES GOING?",
      "BREAKPOINT 1993 — WAS THE BIG SCREEN REALLY 200 INCHES?",
      "COMPO MACHINE CRASHED MID-INTRO — DID ANYONE SEE THE RECOVERY?",
      "WHO PAID FOR THE ICE HOCKEY ARENA VENUE? INSIDE STORY?",
      "MEET REPORT: MET 5 FUTURE CREW MEMBERS AT THE SAUNA",
    ],
    late: [
      "ASSEMBLY 1999 — IS THE NEW VENUE BIGGER OR JUST LOUDER?",
      "EVOKE 2000: WAS THE 64K COMPO THE BEST IN YEARS?",
      "BREAKPOINT 2001 — WHO ACTUALLY SHIPPED A 4K TO THE COMPO?",
      "PARTY ORGANIZERS: ARE STREAMING BATTLES KILLING THE VIBE?",
      "MEGAPARTIES 2003 — IS THE SCENE STILL RELEVANT OR A MUSEUM?",
    ],
  },
  PIXEL_PERFECTION: {
    early: [
      "IS PALETTE DITHERING DEAD? 256-COLOR SUPREMACY",
      "VIC-II MULTICOLOR: LEGITIMATE ART FORM OR LIMITATION FETISH?",
      "WHO REALLY DREW THE BEST C64 SKULL LOGO — SUBJECTIVELY?",
      "FLI BUG STRETCHING: ART OR EXPLOIT?",
      "DELUXE PAINT VS KOALAPAINTS — FIGHT!",
    ],
    mid: [
      "AMIGA 32-COLOR PALETTE + COPPER GRADIENT > ANY PC MODE 13H DEMO",
      "HAM MODE: ICONIC FRINGING OR VISUAL NUISANCE?",
      "CHUNKY-TO-PLANAR BLIT TRICKS — SHARE YOUR FAVORITES",
      "DELUXE PAINT IV BRUSH DYNAMICS STILL UNBEATEN IN 1995?",
      "WHO IS THE BEST METAL-TEXTURE ARTIST IN EUROPE RIGHT NOW?",
    ],
    late: [
      "32-BIT TRUECOLOR BREAKS THE DISCIPLINE THAT MADE 8-BIT GREAT",
      "PROCEDURAL TEXTURE GENERATION IN 64K INTROS — NEW PIXEL ART?",
      "MIPMAP LEVELS: NON-NEGOTIABLE FOR A MODERN 3D DEMO",
      "ALPHA BLENDING AT 60FPS ON A VOODOO — PEAK OF THE FORM?",
      "IS DELUXE PAINT STILL THE STANDARD OR HAVE WE MOVED ON?",
    ],
  },
  TOOL_RELEASES: {
    early: [
      "[NFO] PROTRACKER NEW BETA DROPPED ON SWEDISH NODES",
      "TURBO ASSEMBLER 5.0 — ANY IMPROVEMENTS WORTH MENTIONING?",
      "ACTION REPLAY MK VI CARTRIDGE — WORTH THE $80?",
      "WHO HAS THE FASTEST DISK COPY UTILITY RIGHT NOW?",
      "BBS TERMINAL SOFTWARE: QMODEM VS TELIX — DEBATE!",
    ],
    mid: [
      "FASTTRACKER II 2.04 RELEASED — XM FORMAT SUPPORT IS INSANE",
      "DEVPAC 3 NEW VERSION — MACRO SUPPORT FINALLY USABLE",
      "GUS CLASSIC DRIVERS UPDATED — STABLE AT 44KHZ NOW?",
      "STARGUIDE 2 — STELLAR ATLAS TOOL FOR DEMO SCENE?",
      "GFA BASIC COMPILER — ANYONE STILL USING IT FOR PROTOTYPING?",
    ],
    late: [
      "3DS MAX 2.5 RELEASED — IS IT USABLE FOR DEMO SCENE ASSETS?",
      "DEVC++ + MINGW — FREE C++ TOOLCHAIN WORTH MIGRATING TO?",
      "GIMP 1.0 — REAL TALK: IS IT A PHOTOSHOP KILLER YET?",
      "WAILUA POLYRAY ENGINE — BEST FREE RAYTRACER FOR INTRO CREDITS?",
      "IMPULSE TRACKER 2.14 FINAL — LAST UPDATE BEFORE THE FORMAT DIED?",
    ],
  },
  LEAKS: {
    early: [
      "[ALERT] SOURCE CODE FOR UPCOMING CRACKTRO LEAKED!",
      "REVIEW COPY OF UNRELEASED GAME STOLEN FROM UK DISTRIBUTOR",
      "PRE-RELEASE DISK IMAGE CIRCULATING ON AMIGA NET — WHO LEAKED?",
      "FAIRLIGHT INTERNAL BBS HACKED — DEMO ASSETS POSTED PUBLICLY",
      "CRACKER GROUP SAYS THEY HAVE FULL SOURCE OF MAJOR TOOL RELEASE",
    ],
    mid: [
      "LEAKED: SECOND REALITY SOURCE CODE POSTED ON FINNISH NODE",
      "WHO LEAKED THE UNRELEASED FASTTRACKER II FINAL BINARY?",
      "RAZOR 1911 CRACKER TOOLS DUMPED ON A SWEDISH PIRATE BOARD",
      "INTERNAL FUTURE CREW MAIL ARCHIVE POSTED ON UNDERGROUND NODE",
      "AMIGA DEMO GROUP'S UNRELEASED INTRO SHIPPED EARLY VIA LEAK",
    ],
    late: [
      "[ALERT] WERKZEUG SOURCE LEAKED 2 WEEKS BEFORE RELEASE",
      "WHO POSTED THE UNRELEASED FARBRAUSCH 4K ON IRC YESTERDAY?",
      "DEBRIS BUILD ARTIFACTS CIRCULATING BEFORE COMPO — INSIDE JOB?",
      "BLACK MAIDEN 4K BINARY LEAKED BEFORE OFFICIAL RELEASE",
      "PRE-RELEASE 3DFX DRIVERS CIRCULATING ON PIRATE FTP NODES",
    ],
  },
  TRACKER_TUNES: {
    early: [
      "WHICH SID CHIPTUNE FROM 1986 STILL HITS HARDEST TODAY?",
      "AMIGA MODULE COMPOSITION: PROTRACKER VS NOISETRACKER",
      "BEST 4-CHANNEL MOD INTROS FROM THE LAST 12 MONTHS?",
      "SAMPLE SWAPPING NETWORKS: WHO HAS THE BEST LIBRARY?",
      "OCTAMED VS PROTRACKER — STILL A REAL DEBATE IN 1989?",
    ],
    mid: [
      "FASTTRACKER II XM FORMAT vs MOD: PRODUCTION QUALITY WIN?",
      "BEST 32-CHANNEL XM MODULES FROM 1994?",
      "WHO COMPOSED THE BEST PC SPEAKER INTRO MUSIC?",
      "GUS INTERPOLATION: NECESSARY OR OVERKILL?",
      "FAVORITE TRACKER MUSICIAN WHO NEVER GOT CREDIT?",
    ],
    late: [
      "IMPULSE TRACKER IT FORMAT: FINAL WORD IN MODULE HISTORY?",
      "OGG VORBIS STREAMING vs IT COMPRESSION — WHICH WINS IN 64K?",
      "BEST MODULE MUSIC IN 64K INTROS OF THE LAST 2 YEARS?",
      "WAVETABLE SYNTHESIS ON A GUS PNP — UNDERRATED HERO?",
      "TRACKER MUSIC IN 2004: NOSTALGIA OR STILL EVOLVING?",
    ],
  },
};

// ============================================================================
// 9. Seed threads (6 — was 2)
// ============================================================================

export function getSeedThreads(playerGroupName: string): BBSThread[] {
  return [
    {
      id: "thread_coders_1",
      board: "CODERS_CORNER",
      topic: "COPPER CONTEMPT ON AMIGA vs RASTER LINE HACKS",
      year: 1985,
      month: 1,
      actorId: "ranger_c64",
      messages: [
        { sender: "Psi", text: "Some scene groups think writing COPPER lists on Amiga is real art. No! A real scener manages raster splits strictly in horizontal assembler code.", color: NPC_COLORS["Psi"] },
        { sender: "Ranger", text: "Yes! 6502 assembly rules! Pushing raster registers manually at cycle-perfect clock ticks is pure hardcore engineering.", color: NPC_COLORS["Ranger"] },
        { sender: "Chaos", text: "You are romanticizing prehistoric hardware. Procedural pixel generators on modern processors will soon conquer your tiny copper loops.", color: NPC_COLORS["Chaos"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Support Ranger: Limit and 6502 register control is the zenith of computer science!`, type: "support", effectDescription: "Ranger appreciation: +25 Friendship, +20 Motivation" },
        { text: `Flame Ranger: Get real, 1MHz 8-bit computers can't render fluid voxel fields.`, type: "flame", effectDescription: "Ranger hostility: -25 Friendship with Ranger" },
        { text: `Recruit Ranger: ${playerGroupName} needs a low-level master. Code with us!`, type: "recruit", effectDescription: "Recruit offer: +20 friendship, Ranger salary demand decreases" },
      ],
      infoType: "criticism",
      credibilityScore: 80,
      propagationSpeed: 40,
      distortionRate: 20,
      influenceWeight: 60,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "COPPER CONTEMPT ON AMIGA vs RASTER LINE HACKS",
      mutationCount: 0,
    },
    {
      id: "thread_rumors_1",
      board: "SCENE_RUMORS",
      topic: "FUTURE CREW CODES RUMORED TO PLAGIARIZE REGISTER OFFSETS?",
      year: 1985,
      month: 1,
      actorId: "unreal_coder",
      messages: [
        { sender: "Dxyre", text: "Has anyone decompiled FC's vectors? Their 3D rotation loops look too fast to be computed in real-time. Are they pre-rendering offsets?", color: NPC_COLORS["Dxyre"] },
        { sender: "Psi", text: "Watch your words, Eric. It is called custom trigonometrical lookup tables and extreme matrix optimization. Do some research!", color: NPC_COLORS["Psi"] },
        { sender: "Skaven", text: "Seriously, why flame? If you joined our swaps you would see the sources. We don't cheat, we compile.", color: NPC_COLORS["Skaven"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Support FC: Math and lookup array acceleration is completely legal!`, type: "support", effectDescription: "Psi appreciation: +25 Friendship, +15 Reputation" },
        { text: `Flame FC: Dxyre is right. Pre-rendered tables are a cheap cheat.`, type: "flame", effectDescription: "Psi hostility: -30 Friendship with Psi" },
        { text: `Recruit Psi: Leave the FC flame battles behind. Build with us!`, type: "recruit", effectDescription: "Recruitment discount: Psi salary demand drops, +15 Friendship" },
      ],
      infoType: "rumor",
      credibilityScore: 35,
      propagationSpeed: 75,
      distortionRate: 65,
      influenceWeight: 80,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "FUTURE CREW CODES RUMORED TO PLAGIARIZE REGISTER OFFSETS?",
      mutationCount: 0,
    },
    {
      id: "thread_pixel_1",
      board: "PIXEL_PERFECTION",
      topic: "IS PALETTE DITHERING DEAD? 256-COLOR SUPREMACY",
      year: 1985,
      month: 1,
      actorId: "dxyre",
      messages: [
        { sender: "Trix", text: "Dithering a 16-color palette to fake a 256-color gradient is the only honest pixel art. Anything else is just photorealism cosplay.", color: NPC_COLORS["Trix"] },
        { sender: "Vectra", text: "I started on VGA mode 13h with 256 colors. Trust me, the extra range changes what is possible. Dithering is a nostalgia crutch.", color: NPC_COLORS["Vectra"] },
        { sender: "Dxyre", text: "Both of you are missing the point. The DISCIPLINE of limited palettes is what makes a pixel artist an artist, not a color picker.", color: NPC_COLORS["Dxyre"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Side with Trix: Limited palettes force real craft. 256-color art is lazy.`, type: "support", effectDescription: "Trix appreciation: +25 Friendship, +10 Art reputation" },
        { text: `Side with Vectra: 256 colors unlock new genres. Dithering is a relic.`, type: "flame", effectDescription: "Trix hostility: -25 Friendship with Trix" },
        { text: `Recruit Dxyre: ${playerGroupName} needs a pixel philosopher. Join us!`, type: "recruit", effectDescription: "Dxyre recruitment discount: salary demand drops, +15 Friendship" },
      ],
      infoType: "criticism",
      credibilityScore: 65,
      propagationSpeed: 55,
      distortionRate: 30,
      influenceWeight: 50,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "IS PALETTE DITHERING DEAD? 256-COLOR SUPREMACY",
      mutationCount: 0,
    },
    {
      id: "thread_tools_1",
      board: "TOOL_RELEASES",
      topic: "[NFO] PROTRACKER NEW BETA DROPPED ON SWEDISH NODES",
      year: 1985,
      month: 1,
      actorId: "skaven",
      messages: [
        { sender: "Skaven", text: "Just pulled the new Protracker beta from a Swedish node. 8-channel mixing, sample interpolation, and a new pattern jump command. This changes everything.", color: NPC_COLORS["Skaven"] },
        { sender: "Drifter", text: "Sample interpolation on Amiga audio? I had to drop a sample to 4kHz to make room but the smoothing is worth it. Genuine studio quality now.", color: NPC_COLORS["Drifter"] },
        { sender: "Purple Motion", text: "Forget the interpolation. The new pattern jump command alone saves 3 bars of my typical song structure. Productivity unlocked.", color: NPC_COLORS["Purple Motion"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Praise the release: Skaven's taste in tools is unmatched. Subscribe to the Swedish node!`, type: "support", effectDescription: "Skaven appreciation: +20 Friendship, +10 Reputation" },
        { text: `Critique the beta: Real tracker pros do not need auto-interpolation. Ship the raw.`, type: "flame", effectDescription: "Skaven hostility: -20 Friendship with Skaven" },
        { text: `Recruit Skaven: ${playerGroupName} needs a tracker legend. Compose for us!`, type: "recruit", effectDescription: "Skaven recruitment discount: salary demand drops, +15 Friendship" },
      ],
      infoType: "tool_release",
      credibilityScore: 90,
      propagationSpeed: 85,
      distortionRate: 10,
      influenceWeight: 70,
      viralSpreadRank: 2,
      isSuppressed: false,
      originalTopic: "[NFO] PROTRACKER NEW BETA DROPPED ON SWEDISH NODES",
      mutationCount: 0,
    },
    {
      id: "thread_party_1",
      board: "PARTY_GOSSIP",
      topic: "ASSEMBLY OR THE PARTY? WHERE ARE THE REAL ELITES GOING?",
      year: 1985,
      month: 1,
      actorId: "hype_ops",
      messages: [
        { sender: "Hype", text: "Both Assembly and The Party are scheduled within 3 weeks of each other again. Anyone else have to choose between Finnish saunas and Danish beer gardens?", color: NPC_COLORS["Hype"] },
        { sender: "Vectra", text: "Assembly has the better compo machine specs, but The Party has the bigger hall. Tough call for a first-time attendee like me.", color: NPC_COLORS["Vectra"] },
        { sender: "Ranger", text: "The Party has the better coder atmosphere. You can sit in a corner and discuss raster tricks for 6 hours straight. Assembly is too big for that.", color: NPC_COLORS["Ranger"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Back Assembly: Smaller scene, tighter compo, real craft on display.`, type: "support", effectDescription: "Vectra appreciation: +20 Friendship, +15 Reputation" },
        { text: `Back The Party: Bigger venue, more networking, better after-parties.`, type: "flame", effectDescription: "Vectra hostility: -20 Friendship with Vectra" },
        { text: `Recruit Hype: ${playerGroupName} needs an organizer. Coordinate our releases!`, type: "recruit", effectDescription: "Hype recruitment discount: salary demand drops, +20 Friendship" },
      ],
      infoType: "party_gossip",
      credibilityScore: 70,
      propagationSpeed: 60,
      distortionRate: 25,
      influenceWeight: 55,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "ASSEMBLY OR THE PARTY? WHERE ARE THE REAL ELITES GOING?",
      mutationCount: 0,
    },
    {
      id: "thread_leaks_1",
      board: "LEAKS",
      topic: "[ALERT] SOURCE CODE FOR UPCOMING CRACKTRO LEAKED!",
      year: 1985,
      month: 1,
      actorId: "dxyre",
      messages: [
        { sender: "Dxyre", text: "Someone just dumped the full source of a major group's upcoming cracktro on an underground node. The scroll routine, the copper palette, everything. This is huge.", color: NPC_COLORS["Dxyre"] },
        { sender: "Trix", text: "This is a disaster for whoever leaked it. Whoever they are, they are now public enemy number one across three continents.", color: NPC_COLORS["Trix"] },
        { sender: "Ranger", text: "On the other hand, this is the most interesting code I have read all year. Whoever wrote this scroll routine is a genius. Studying it now.", color: NPC_COLORS["Ranger"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Steal the code: Forward to your own crew. Knowledge is power, leaking is fair.`, type: "support", effectDescription: "Reputation: +20, but source group hostility: -30 Friendship" },
        { text: `Report the leak: Notify the source group so they can patch and respond.`, type: "flame", effectDescription: "Source group appreciation: +25 Friendship with affected crew" },
        { text: `Recruit Dxyre: ${playerGroupName} needs an inside man. Dyxre's BBS network is unmatched.`, type: "recruit", effectDescription: "Dxyre recruitment discount: salary demand drops, +15 Friendship" },
      ],
      infoType: "leak",
      credibilityScore: 25,
      propagationSpeed: 95,
      distortionRate: 80,
      influenceWeight: 90,
      viralSpreadRank: 3,
      isSuppressed: false,
      originalTopic: "[ALERT] SOURCE CODE FOR UPCOMING CRACKTRO LEAKED!",
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
    {
      id: "thread_tracker_1",
      board: "TRACKER_TUNES",
      topic: "WHICH SID CHIPTUNE FROM 1986 STILL HITS HARDEST TODAY?",
      year: 1985,
      month: 1,
      actorId: "skaven",
      messages: [
        { sender: "Skaven", text: "The SID in 'International Karate' is unbeatable for raw aggression. Four channels of pure 8-bit fury that still gives me goosebumps.", color: NPC_COLORS["Skaven"] },
        { sender: "Drifter", text: "'Monty on the Run' by Rob Hubbard changed what a chiptune could do. The bass line alone rewrote the rulebook.", color: NPC_COLORS["Drifter"] },
        { sender: "Purple Motion", text: "For emotional depth, 'The Last V8' by Martin Galway. The harmonized lead channels set a standard nobody matched for years.", color: NPC_COLORS["Purple Motion"] },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: `Side with Skaven: Raw aggression and technical density win. Kraftwerk would approve.`, type: "support", effectDescription: "Skaven appreciation: +15 Friendship, +10 Music reputation" },
        { text: `Side with Drifter: Rob Hubbard's structural complexity changed the scene forever.`, type: "support", effectDescription: "Drifter appreciation: +15 Friendship, +15 Reputation" },
        { text: `Recruit Purple Motion: ${playerGroupName} needs a soundtrack composer. Join the crew!`, type: "recruit", effectDescription: "Purple Motion recruitment discount: salary demand drops, +20 Friendship" },
      ],
      infoType: "criticism",
      credibilityScore: 70,
      propagationSpeed: 45,
      distortionRate: 25,
      influenceWeight: 40,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "WHICH SID CHIPTUNE FROM 1986 STILL HITS HARDEST TODAY?",
      mutationCount: 0,
    },
    {
      id: "thread_humor_1",
      board: "CODERS_CORNER",
      topic: "MY MULTICOLOR LOADER HAS MORE COLORS THAN YOUR ENTIRE DEMO",
      year: 1985,
      month: 1,
      actorId: "hype_ops",
      messages: [
        { sender: "FlameAlchemist", text: "I counted the colors in your multicolor loader. 8 colors. My loading bar has more palette entries than your entire compo entry. Sad.", color: "text-orange-400" },
        { sender: "ChipTuneKid", text: "The loading music in that loader was better than the demo too. 4-channel SID jams are peak content.", color: "text-amber-300" },
        { sender: "SysOp42", text: "This thread is descending into a roast session. Keep it civil or I lock it. Also, the multicolor loader reference is historically accurate, I logged it.", color: "text-zinc-400" },
      ],
      interacted: false,
      playerActionTaken: null,
      dramaFinished: false,
      choices: [
        { text: "Join the roast: Post ASCII art of a 1541 drive ejecting the offending disk in shame.", type: "support", effectDescription: "FlameAlchemist appreciation: +10 Friendship, +10 Reputation" },
        { text: "Defend the loader: 8 colors on a C64 is the maximum without FLI tricks. Get your facts straight!", type: "flame", effectDescription: "FlameAlchemist hostility: -15 Friendship" },
        { text: "Ask ChipTuneKid for the SID track: That loading music sounds promising. Drop a download link.", type: "support", effectDescription: "ChipTuneKid appreciation: +15 Friendship, +5 Tracker skill" },
      ],
      infoType: "rumor",
      credibilityScore: 30,
      propagationSpeed: 55,
      distortionRate: 60,
      influenceWeight: 25,
      viralSpreadRank: 1,
      isSuppressed: false,
      originalTopic: "MY MULTICOLOR LOADER HAS MORE COLORS THAN YOUR ENTIRE DEMO",
      mutationCount: 0,
    },
  ];
}

// ============================================================================
// 10. Followed reply generator
// ============================================================================

/**
 * Returns an era-appropriate reply from the given NPC for the given board.
 * Falls back to a generic scener reply if the NPC's specialty has no profile
 * for the current era (e.g. a very early-era thread where the specialist
 * hadn't formed their voice yet).
 */
export function generateFollowedReply(
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
}

// ============================================================================
// 11. Spyline templates (4 — was 1)
// ============================================================================

export interface SpylineTemplate {
  headline: string;
  body: (sourceLabel: string, targetLabel: string) => string;
}

export const SPYLINE_TEMPLATES: SpylineTemplate[] = [
  {
    headline: "ANONYMOUS SOURCE LEAKS CONVERSATIONS!",
    body: (sourceLabel, targetLabel) =>
      `Private correspondence exchange between '${sourceLabel}' and '${targetLabel}' has leaked onto encrypted German dialup boards. Scenedesk reports claim relationships are mutating extremely quickly!`,
  },
  {
    headline: "INTERCEPTED COURIER MESSAGES REVEAL SPLIT!",
    body: (sourceLabel, targetLabel) =>
      `Floppy courier packages between '${sourceLabel}' and '${targetLabel}' were intercepted at a Swedish mail drop. The contents suggest a major crew split is imminent — BBS operators across 4 countries have already confirmed the package contents.`,
  },
  {
    headline: "BBS LOGS CRACKED: SCENE RIVALRY CONFIRMED!",
    body: (sourceLabel, targetLabel) =>
      `A Polish sysop leaked private BBS session logs between '${sourceLabel}' and '${targetLabel}'. The flame war transcript reveals deep personal animosity that has been building for months under the surface.`,
  },
  {
    headline: "MODEM INTERCEPT REVEALS SECRET PACT!",
    body: (sourceLabel, targetLabel) =>
      `Amateur radio operators picked up modem handshake signals between '${sourceLabel}' and '${targetLabel}' at 3am local time. A secret joint demo collaboration pact has reportedly been signed in the encrypted session.`,
  },
];

// ============================================================================
// 12. BBS random events (6 — was 3)
// ============================================================================

export interface BBSRandomEvent {
  head: string;
  body: string;
  /** Discriminator so App.tsx can apply the correct state delta. */
  type: "money" | "reputation" | "research";
  /** Signed amount to apply. Negative for costs. */
  amount: number;
}

export const BBS_RANDOM_EVENTS: BBSRandomEvent[] = [
  {
    head: "BBS COUPLER NOISE REDUCTION",
    body: "Your local 1200 baud modem link experiences perfect copper clarity. Sceners download your trainer cracktros instantly. Gained +10 Reputation!",
    type: "reputation",
    amount: 10,
  },
  {
    head: "LOCAL FLOOPY BOX SHIPPED",
    body: "A container of colorful brand-new double-sided floppy disks was received. You gain some storage layout. Spend $10.",
    type: "money",
    amount: -10,
  },
  {
    head: "HACKATHON SEMINAR BOOST",
    body: "Reading old assembler manuals from your senior school library gives you pristine optimization ideas. Unlocked +15 research points!",
    type: "research",
    amount: 15,
  },
  {
    head: "VIRAL FORWARD CHAIN DETECTED",
    body: "Your last BBS post was forwarded across 12 European nodes overnight. The scene is paying attention. Gained +15 Reputation!",
    type: "reputation",
    amount: 15,
  },
  {
    head: "PIRATE FLOPPY TRADER VISITS",
    body: "A shady swapper in a leather jacket offers you 5 unlicensed software titles for a cool $25. Storage unlocked, cash debited.",
    type: "money",
    amount: -25,
  },
  {
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
  {
    head: "DEMOSCENE HISTORIAN ARCHIVE DROP",
    body: "DemosceneHistorian just posted a scanned archive of 1987 disk-mag back issues. The historical value is enormous. Gained +15 research points!",
    type: "research",
    amount: 15,
  },
  {
    head: "COPPER GHOST SHARES COPPER LIST SECRETS",
    body: "CopperGhost uploaded a collection of optimized Amiga copper lists to the Swedish BBS node. The DMA timing diagrams alone are worth the download. Gained +12 research points!",
    type: "research",
    amount: 12,
  },
  {
    head: "FLAME ALCHEMIST SPARKS VIRAL ARGUMENT",
    body: "FlameAlchemist posted a controversial take on the SCENE_RUMORS board that spread across 23 nodes overnight. The bandwidth bill is your problem. Spend $15, gain +20 Reputation!",
    type: "reputation",
    amount: 20,
  },
];

// ============================================================================
// 13. Rumor mutation dictionary (used by the distortText helper)
// ============================================================================

/**
 * Pre-defined vocabulary mutations for the BBS information-distortion engine.
 * Kept here so it lives next to the other BBS message pools.
 */
export const BBS_MUTATIONS: Array<(text: string) => string> = [
  (t) => t.replace(/RUMORED/g, "CONFIRMED"),
  (t) => t.replace(/PLAGIARIZE/g, "STEAL"),
  (t) => t.replace(/LAZY/g, "GENIUS"),
  (t) => t.replace(/RASTER/g, "COPPER BEAM"),
  (t) => t.replace(/done/i, "ELITE!"),
  (t) => t.replace(/VIC-II/g, "AMIGA FAT AGNUS"),
  (t) => t.replace(/FUTURE CREW/g, "PAST CREW"),
  (t) => t.replace(/UNRELEASED/g, "LEAKED_FREE"),
  (t) => t.replace(/\?/g, "!!! [ALERT]"),
  (t) => `${t} (MUTATED EXTRA)`,
  // Always-mutates terminal case: guarantees distortionRate > 0 produces
  // visible change even if none of the regex transforms above matched.
  (t) => `${t.slice(0, Math.max(0, t.length - 1))}!! [MUTANT]`,
];
