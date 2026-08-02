/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PARTYGOER_DIALOGUE — authored dialogue pools for the living demoparty
 * simulation. Pure data. No React, no LLM.
 *
 * The DialogueEngine (sim/domain/partygoers.ts) filters these templates by
 * context (personality, role, phase, location, sleep, player reputation,
 * friendship, meetings) and fills {placeholder} tokens at pick time.
 *
 * Placeholders supported by the filler:
 *   {handle} {group} {project} {platform} {party} {year} {playerGroup}
 *   {rival} {hour}
 */

import type {
  DialogueTemplate,
  SceneKnowledgeEntry,
  PartygoerPlatform,
  PartygoerRole,
  PartyLocationId,
  PartygoerEventType,
} from "@packages/types";

// ---------------------------------------------------------------------------
// Procedural identity pools
// ---------------------------------------------------------------------------

export const HANDLE_PREFIXES: string[] = [
  "Mega", "Dark", "Cyber", "Pixel", "Turbo", "Retro", "Neon", "Zero", "Byte", "Frame",
  "Vector", "Plasma", "Raster", "Sync", "Bit", "Hex", "Data", "Glitch", "Hyper", "Laser",
  "Mono", "Poly", "Quantum", "Radio", "Static", "Synth", "Track", "Voxel", "Warp", "Xero",
];

export const HANDLE_SUFFIXES: string[] = [
  "Masta", "Wizard", "Knight", "Fox", "Rat", "Wolf", "Coder", "Lord", "King", "Byte",
  "Zone", "Core", "Storm", "Blade", "Force", "Hero", "Ninja", "Pirate", "Rebel", "Tron",
  "Wave", "Bit", "Drift", "Synth", "Error", "Hacker", "Phreak", "Ripper", "Slinger", "Ops",
];

export const COUNTRY_POOL: string[] = [
  "Finland", "Sweden", "Germany", "Norway", "Denmark", "Poland", "Netherlands", "France",
  "UK", "Hungary", "Spain", "Italy", "Czechia", "Russia", "USA", "Canada", "Japan", "Australia",
  "Austria", "Switzerland", "Belgium", "Estonia", "Slovakia", "Croatia", "Portugal", "Greece",
];

export const REAL_FIRST_NAMES: string[] = [
  "Mikko", "Lars", "Janne", "Erik", "Anders", "Timo", "Markus", "Jonas", "Pekka", "Sven",
  "Jukka", "Henrik", "Ville", "Magnus", "Antti", "Thomas", "Kai", "Jesper", "Samu", "Oskar",
  "Petri", "Mikael", "Jan", "Tuomas", "Rolf", "Jani", "Fredrik", "Esa", "Niklas", "Sami",
];

export const REAL_LAST_NAMES: string[] = [
  "Lindqvist", "Virtanen", "Johansson", "Korhonen", "Nielsen", "Mäkinen", "Larsson", "Heikkinen",
  "Berg", "Nieminen", "Jensen", "Koskinen", "Hansen", "Rantanen", "Olsen", "Hämäläinen",
  "Carlsson", "Lehtinen", "Pettersson", "Salonen", "Eriksson", "Lindholm", "Aaltonen", "Svensson",
];

// ---------------------------------------------------------------------------
// Role + platform project pools (currentProject pick)
// ---------------------------------------------------------------------------

export const PROJECTS_BY_ROLE: Record<PartygoerRole, string[]> = {
  coder: [
    "debugging shaders", "a 4K intro", "a 64K intro", "a raymarching engine",
    "an SDF scene", "a particle system", "a disk-based megademo", "a texture mapper",
  ],
  musician: [
    "a chiptune track", "a MOD soundtrack", "a tracker module", "a live synth set",
    "an XM tune", "a SID cover", "a music disk", "an ambient pad loop",
  ],
  graphician: [
    "a pixel art logo", "a copper sky", "a voxel landscape", "a palette animation",
    "a Deluxe Paint backdrop", "a 4K texture pack", "a hires portrait", "a logo splash",
  ],
  organizer: [
    "the compo schedule", "the voting sheets", "the venue power plan", "the awards ceremony",
    "the entrant checklist", "the prize pool", "the livestream", "the party booklets",
  ],
  visitor: [
    "just enjoying demos", "watching the compo", "browsing the retro corner",
    "collecting diskmags", "waiting for the party", "taking photos", "chatting at the bar",
  ],
  newcomer: [
    "my first intro", "learning trackers", "my first demo", "a first 4K attempt",
    "my first MOD", "figure out the scene", "my first compo entry", "an intro with help",
  ],
};

export const PLATFORM_LABELS: Record<PartygoerPlatform, string> = {
  PC: "PC",
  Amiga: "Amiga",
  C64: "C64",
  "Atari ST": "Atari ST",
  "Fantasy Console": "fantasy console",
};

// ---------------------------------------------------------------------------
// Group affiliation pool
// ---------------------------------------------------------------------------

export const GENERIC_GROUP_NAMES: string[] = [
  "Northline", "Chipwork", "Bytelords", "Hydralab", "Pixelforge", "Mode 13", "Rasterforce",
  "Silicon Rebels", "Null Byters", "Coppercrew", "Vectral", "Synthwave Kollective", "Blitter Bunch",
  "Frame Farers", "Megahertz", "Kilohertz Kings", "Polygon Punkz", "Groove Generators",
];

// ---------------------------------------------------------------------------
// Dialogue pools — keyed by broad topic, filtered by context at pick time.
// Templates carry optional personality/role/sleep/reputation/friendship gates.
// ---------------------------------------------------------------------------

export const PARTYGOER_DIALOGUE: DialogueTemplate[] = [
  // ---- Demo coding / crunch time (pre-compo) ----
  { topic: "coding", personality: "technical", text: "I've been debugging shaders for six hours. The compiler is winning." },
  { topic: "coding", personality: "technical", text: "Our intro crashes on one GPU. ONE. I don't even own that GPU." },
  { topic: "coding", text: "Still optimizing. The demo compo deadline is breathing down my neck." },
  { topic: "coding", personality: "competitive", text: "We haven't packed the executable yet. Five minutes to the compo, someone's still in the shower." },
  { topic: "coding", text: "The shader broke after one tiny change. One. Tiny. Change." },
  { topic: "coding", personality: "sarcastic", text: "Oh sure, it's a 'quick fix'. Said every coder forty minutes before the deadline." },
  { topic: "coding", role: "newcomer", text: "Everyone here writes assembly in their sleep. I'm still learning what a raster interrupt is." },
  { topic: "coding", personality: "veteran", text: "Son, I've missed deadlines since before you were born. It gets easier. The excuses get better, anyway." },
  { topic: "coding", role: "coder", text: "Still debugging {project}. The party is a terrible place to code, and yet here we are." },
  { topic: "coding", maxSleep: 20, text: "I haven't slept since yesterday. The code started looking good around 4 AM, which is never a good sign." },
  { topic: "coding", minPlayerReputation: 300, text: "Heard you know your way around a compo entry. Any advice for a last-minute 4K?" },
  { topic: "coding", minPlayerReputation: 700, text: "The legend walks among us. If our intro half as good as your last one, we'll take the win." },

  // ---- Shader programming ----
  { topic: "shaders", personality: "technical", text: "The raymarcher is 900 bytes. The compiler wants another hundred. I will not be beaten by a linker." },
  { topic: "shaders", text: "I keep adding effects to the fragment shader. My GPU has filed a complaint." },
  { topic: "shaders", personality: "competitive", text: "They said it couldn't run at 60fps on a potato GPU. Watch this." },
  { topic: "shaders", personality: "sarcastic", text: "A shader that works first try? In THIS economy?" },
  { topic: "shaders", personality: "veteran", text: "We used to do this with copper lists. You kids and your compute shaders have it easy." },
  { topic: "shaders", role: "newcomer", text: "I typed a raymarching tutorial and my laptop now sounds like a jet engine. Progress?" },

  // ---- Music production / trackers ----
  { topic: "music", personality: "technical", text: "The track is 3:47 of pure MOD. The bassline alone took two nights." },
  { topic: "music", text: "Our musician disappeared. I repeat — the MUSICIAN disappeared. The compo is in two hours." },
  { topic: "music", personality: "friendly", text: "Want to hear my module? It's only 900KB and I'm very proud of the breakdown." },
  { topic: "music", personality: "competitive", text: "The music compo is stacked this year. My 4-channel is going to hurt some feelings." },
  { topic: "music", personality: "sarcastic", text: "I composed a masterpiece. Then I realized I left the master volume at zero." },
  { topic: "music", personality: "veteran", text: "Back in '91 we tracked on actual hardware with a mouse with a real ball in it. You kids and your VSTs." },

  // ---- Pixel art ----
  { topic: "pixel_art", personality: "friendly", text: "I just finished a 128-color landscape. The dithering took forever but it's beautiful." },
  { topic: "pixel_art", text: "Four colors per cell, they said. Impossible, they said. Have you SEEN my sky?" },
  { topic: "pixel_art", personality: "technical", text: "The palette swap is frame-perfect now. Copper lists, am I right?" },
  { topic: "pixel_art", personality: "competitive", text: "My logo splash will be the prettiest thing at this party. Print that." },
  { topic: "pixel_art", personality: "sarcastic", text: "I drew a portrait of the organizer. He said it looked like a potato. The man has no soul." },
  { topic: "pixel_art", personality: "veteran", text: "Deluxe Paint, 32 colors, one mouse button. That's how we made the classics." },

  // ---- Compression / size coding ----
  { topic: "compression", personality: "technical", text: "We're 300 bytes over the 4K limit. Time to delete the music and call it 'ambient'." },
  { topic: "compression", text: "Compression is just deleting code with extra steps. I've deleted a lot of code this weekend." },
  { topic: "compression", personality: "competitive", text: "My 4K intro has a full orchestra. Generated procedurally, in 2KB. Beat that." },
  { topic: "compression", personality: "sarcastic", text: "4K is a lot of space, really. I mean, it's FOUR WHOLE KILOBYTES." },
  { topic: "compression", personality: "veteran", text: "In the 8-bit days we called this 'fitting the game on one side of a disk'. Kids today call it 'crunching'." },

  // ---- Procedural generation / raymarching / SDF / particles ----
  { topic: "procedural", personality: "technical", text: "Procedural generation is the only honest kind. Why draw a mountain when you can compute it?" },
  { topic: "raymarching", personality: "technical", text: "The SDF scene is 60fps now. I'm still not sure how, but I'm not asking questions." },
  { topic: "raymarching", text: "I don't want to miss the next demo — I heard someone SDF'd an entire city." },
  { topic: "particles", personality: "friendly", text: "My particle system can do 100,000 sparks. It's basically a campfire. A beautiful, GPU-melting campfire." },
  { topic: "procedural", role: "newcomer", text: "I made a procedural starfield! It's 50 lines and I understand... 12 of them." },
  { topic: "procedural", personality: "veteran", text: "We had procedural mountains in 1987. They were called 'sine waves' and we loved them." },

  // ---- Graphics APIs (WebGL / Vulkan / OpenGL) ----
  { topic: "graphics_api", personality: "technical", text: "Vulkan is great until you need to talk to it. Then it's 200 lines of boilerplate to clear a screen." },
  { topic: "graphics_api", personality: "technical", text: "WebGL2 in a browser, at 120fps. The browser is a demo platform now, deal with it." },
  { topic: "graphics_api", text: "OpenGL legacy will outlive us all. It's the demo scene's cockroach." },
  { topic: "graphics_api", personality: "sarcastic", text: "My favourite graphics API is the one that just works. So, none of them." },
  { topic: "graphics_api", personality: "veteran", text: "We did 3D before graphics cards were a thing. Software rendering, 320x200, 15fps, and we LIKED it." },

  // ---- AI tools ----
  { topic: "ai_tools", personality: "technical", text: "I let an AI write half my shader. The other half is me fixing what it broke." },
  { topic: "ai_tools", personality: "sarcastic", text: "AI-generated demo? Sure, if your idea of art is a slideshow of someone else's work." },
  { topic: "ai_tools", personality: "veteran", text: "AI this, AI that. In my day we had one shared brain and it ran on pizza." },
  { topic: "ai_tools", role: "newcomer", text: "I used an AI to explain SDFs to me. It was wrong, but confidently wrong. Progress?" },

  // ---- Retro hardware ----
  { topic: "retro_hardware", personality: "veteran", text: "The C64 did more with 64KB than your phone does with 128GB. I'll die on this hill." },
  { topic: "retro_hardware", personality: "technical", text: "The Amiga blitter is still the best piece of hardware ever made. Don't @ me." },
  { topic: "retro_hardware", personality: "friendly", text: "The retro corner has an actual working C64. I've been there for three hours." },
  { topic: "retro_hardware", personality: "sarcastic", text: "My retro machine needs a recap. It's not vintage, it's leaking." },
  { topic: "retro_hardware", text: "Fantasy consoles are great. All the nostalgia, none of the capacitor leakage." },

  // ---- Group history / famous demos ----
  { topic: "group_history", personality: "veteran", text: "Ask me about Second Reality. Ask me about Assembly '93. I was THERE." },
  { topic: "group_history", personality: "veteran", text: "Every group has that one legendary demo that set the bar. And every newcomer insists they'll beat it." },
  { topic: "group_history", personality: "friendly", text: "My group is only two years old but we already won a wild compo. Small trophies count!" },
  { topic: "group_history", personality: "competitive", text: "Our group history? We were born winning. The trophies are just evidence." },

  // ---- Party memories ----
  { topic: "party_memories", personality: "veteran", text: "Last year someone's intro bluescreened the compo machine. The applause was DEAFENING." },
  { topic: "party_memories", personality: "friendly", text: "This party is my favourite weekend of the year. The projector smell alone is worth the trip." },
  { topic: "party_memories", text: "I still think about the power outage at the last party. We improvised a jam session in the dark." },
  { topic: "party_memories", personality: "sarcastic", text: "My favourite party memory is the pizza. The demo scene's finest achievement." },

  // ---- Hardware failures ----
  { topic: "hardware_failures", personality: "technical", text: "My PSU died 40 minutes before the compo. The backup machine had a broken spacebar." },
  { topic: "hardware_failures", text: "The compo machine crashed mid-intro yesterday. The recovery was the best part of the party." },
  { topic: "hardware_failures", personality: "sarcastic", text: "Hardware failure? You mean the machine finally agreeing with my code review." },
  { topic: "hardware_failures", personality: "veteran", text: "We once lost a whole megademo to a failing floppy. The disk was fine. The DRIVE was lying." },

  // ---- Sleeping / coffee / food ----
  { topic: "sleep", text: "I haven't slept. The demo compo is in three hours. This is fine. Everything is fine." },
  { topic: "sleep", maxSleep: 20, text: "I fell asleep on a keyboard in the seating area. My face is now a work of abstract art." },
  { topic: "sleep", personality: "friendly", text: "There's a guy asleep in the hallway with a crash helmet on. I respect the commitment." },
  { topic: "food", personality: "friendly", text: "This pizza isn't bad. For party pizza, it's practically gourmet." },
  { topic: "food", personality: "sarcastic", text: "The cafeteria ran out of pizza. War has been declared." },
  { topic: "coffee", text: "Need more coffee. The machine by the infodesk has been out for an hour and it's a CRISIS." },
  { topic: "coffee", personality: "technical", text: "My blood is 60% coffee at this point. It's the only thing keeping the frame rate up." },
  { topic: "coffee", personality: "veteran", text: "In my day we survived on battery acid and pride. The coffee machine is a luxury you don't appreciate." },

  // ---- Upcoming compos / waiting ----
  { topic: "compos", text: "I'm waiting for the music compo. The demo compo had a 40-minute delay and I haven't forgiven anyone." },
  { topic: "compos", personality: "competitive", text: "We're submitting in five minutes. If the USB drive doesn't work, someone is walking home." },
  { topic: "compos", personality: "friendly", text: "The 4K compo is going to be wild this year. I've heard three different groups claim they'll win." },
  { topic: "compos", text: "Did you watch the demo compo? The last entry had a full-blown raymarched city." },
  { topic: "compos", role: "newcomer", text: "I don't know what 'compo' rules are. Do I clap when the music ends? I clapped a lot." },

  // ---- Relationship-gated unlock lines (minMeetings / minFriendship) ----
  { topic: "relationship", minMeetings: 2, personality: "friendly", text: "Hey {handle} — good to see you again. Still hanging around the compo hall, huh?" },
  { topic: "relationship", minMeetings: 3, personality: "friendly", text: "We keep running into each other. The scene is small. Or we're both just very committed to this compo hall." },
  { topic: "relationship", minMeetings: 4, minFriendship: 40, personality: "friendly", text: "You're all right, {handle}. Want to grab a coffee after the compo?" },
  { topic: "relationship", minMeetings: 5, minFriendship: 60, personality: "friendly", text: "{handle}! Save me a seat in the compo hall. We're basically a crew at this point." },
  { topic: "relationship", minMeetings: 6, minFriendship: 75, personality: "friendly", text: "You know what? If you ever start a group, I'm in. I mean it. This party needs more people like you." },
  { topic: "relationship", minMeetings: 2, personality: "sarcastic", text: "You AGAIN. At some point I'm going to start charging you for these conversations." },
  { topic: "relationship", minMeetings: 3, personality: "competitive", text: "We've met. Don't think for a second I forgot your group beat ours last party. This year changes things." },
];

// ---------------------------------------------------------------------------
// Phase-gated dialogue — before compos, during compos, after results
// ---------------------------------------------------------------------------

export const PRE_COMPO_DIALOGUE: DialogueTemplate[] = [
  { topic: "deadline", text: "Still optimizing. {project} is not done and the deadline is not moving." },
  { topic: "deadline", text: "We haven't packed the executable yet. The upload is in twenty minutes." },
  { topic: "deadline", personality: "sarcastic", text: "The compo organisers keep saying 'no extensions'. Bold of them." },
  { topic: "deadline", personality: "technical", text: "One more bug. Just one more. Then it's perfect. Then I sleep." },
  { topic: "deadline", personality: "friendly", text: "Good luck with your entry! I hope we're not in the same compo. Actually, I hope we ARE. It'll be fun." },
  { topic: "deadline", personality: "veteran", text: "First party? The trick is to back up early and often. I learned that the hard way. Twice." },
  { topic: "deadline", minPlayerReputation: 500, text: "You're competing this year? I'll keep an eye on your entry. Everyone will." },
];

export const COMPO_RUNNING_DIALOGUE: DialogueTemplate[] = [
  { topic: "compo", text: "That intro was amazing. Did you SEE that intro?!" },
  { topic: "compo", personality: "technical", text: "I didn't expect procedural animation that good. The SDF work is unreal." },
  { topic: "compo", personality: "technical", text: "The soundtrack fit perfectly. Whoever composed that knows their tracker." },
  { topic: "compo", personality: "competitive", text: "Okay, that entry just set the bar. We can beat it. Probably. Maybe." },
  { topic: "compo", personality: "friendly", text: "The compo hall projector is on fire tonight. In a good way." },
  { topic: "compo", role: "newcomer", text: "I don't understand how they did that. I'm going to ask every coder here." },
  { topic: "compo", personality: "sarcastic", text: "That entry was so good it made me want to quit. Then the next one crashed and I felt better." },
  { topic: "compo", minPlayerReputation: 400, text: "Your group's entry is coming up soon, right? The crowd is already hyped." },
  { topic: "compo", minPlayerReputation: 800, text: "When {playerGroup}'s entry plays, the whole hall goes quiet. You've got the scene's attention, legend." },
];

export const POST_RESULTS_DIALOGUE: DialogueTemplate[] = [
  { topic: "results", personality: "competitive", text: "We placed fourth. Fourth! The scoring was a crime." },
  { topic: "results", personality: "friendly", text: "We're happy with that. Honestly, we were just glad the compo machine didn't eat it." },
  { topic: "results", text: "Next year we'll do better. Next year we'll CRUSH it." },
  { topic: "results", personality: "technical", text: "The winning entry was technically superb. I'm taking notes. Many notes." },
  { topic: "results", personality: "sarcastic", text: "We didn't place, but the judges' comments made for a great comedy routine." },
  { topic: "results", personality: "veteran", text: "Winning is nice. The friends you make arguing about a score table? Those last forever." },
  { topic: "results", role: "newcomer", text: "We didn't place but we didn't crash! I'm counting that as a victory lap." },
  { topic: "results", minPlayerReputation: 600, text: "Congrats on your release, by the way. The whole hall was talking about it." },
  { topic: "results", minPlayerReputation: 800, text: "Everyone's talking about your latest production. You've got the scene's respect — earned it." },
  { topic: "results", minFriendship: 50, text: "We should celebrate. Or commiserate. Either way, I'm buying the next round of coffee." },
];

// ---------------------------------------------------------------------------
// Event reactions — temporarily bias dialogue when a world event fires.
// ---------------------------------------------------------------------------

export const EVENT_REACTIONS: Record<PartygoerEventType, DialogueTemplate[]> = {
  compo_started: [
    { topic: "event", text: "The compo is starting! Find a seat, this is the moment." },
    { topic: "event", personality: "competitive", text: "Lights down. This is what we came for. Our group is up in a few entries." },
    { topic: "event", personality: "veteran", text: "You can feel it in the room when the compo starts. Goosebumps, every year." },
    { topic: "event", role: "newcomer", text: "It's starting!! Do I clap now?" },
  ],
  award_ceremony: [
    { topic: "event", text: "The awards ceremony! Someone's about to become a scene legend overnight." },
    { topic: "event", personality: "competitive", text: "The results are in. I can't watch. I also can't look away." },
    { topic: "event", personality: "friendly", text: "No matter who wins, the party's been amazing this year." },
    { topic: "event", personality: "sarcastic", text: "The ceremony is longer than some demos. Where's the confetti?" },
  ],
  new_demo_released: [
    { topic: "event", text: "Did you hear? There's a new {project} circulating — people are passing it around on USB sticks." },
    { topic: "event", personality: "technical", text: "The new release is being dissected in the seating area. The effect work is unreal." },
    { topic: "event", personality: "friendly", text: "Someone just dropped a new demo on the party file server. Get in there." },
  ],
  power_outage: [
    { topic: "event", text: "Power outage! Someone check the compo machines!" },
    { topic: "event", personality: "sarcastic", text: "Power outage. The one thing even the demo scene can't render." },
    { topic: "event", personality: "veteran", text: "Ah, the traditional party power flicker. Last time it reset a 4K mid-entry. Glorious chaos." },
    { topic: "event", role: "newcomer", text: "Is this a demo effect or is the power actually out?" },
  ],
  network_issue: [
    { topic: "event", text: "The party LAN just died. The file server is unreachable. This is a disaster." },
    { topic: "event", personality: "technical", text: "Someone tripped over the switch cable again. Every. Single. Party." },
    { topic: "event", personality: "sarcastic", text: "The network is down. How will we download demos at a party whose whole point is sharing?" },
  ],
  announcement: [
    { topic: "event", text: "Announcement over the PA — check the schedule board, sounds like a schedule change." },
    { topic: "event", role: "organizer", text: "Announcement: I'm the one who has to announce. Wish me luck." },
    { topic: "event", personality: "friendly", text: "They announced extra time before the compo. Free pizza AND a schedule reprieve." },
  ],
  concert: [
    { topic: "event", text: "There's a live chiptune concert in the hall tonight. Best part of the party." },
    { topic: "event", personality: "friendly", text: "The live set was incredible — they did a medley of classic MODs." },
    { topic: "event", personality: "veteran", text: "The concert made me cry. The scene's music hits different live." },
  ],
  fire_alarm: [
    { topic: "event", text: "Fire alarm! Grab your laptops and your unfinished demos!" },
    { topic: "event", personality: "sarcastic", text: "The fire alarm. Everyone evacuates except the coder mid-save, who refuses to leave until the file is written." },
    { topic: "event", personality: "veteran", text: "First party? This happens. It's always someone burning toast in the cafeteria." },
  ],
  late_night: [
    { topic: "event", text: "It's 3 AM and the compo hall is still packed. This is the real party." },
    { topic: "event", personality: "technical", text: "The late-night coding session is legendary — the best ideas happen after midnight." },
    { topic: "event", role: "newcomer", text: "Everyone's still awake at 3 AM?! I've got so much to learn." },
    { topic: "event", personality: "veteran", text: "The 3 AM crowd is the scene's soul. We're all running on caffeine and stubbornness." },
  ],
};

// ---------------------------------------------------------------------------
// Location-specific ambient + dialogue flavour
// ---------------------------------------------------------------------------

export const LOCATION_AMBIENT: Record<PartyLocationId, string[]> = {
  seating: [
    "Someone just rewired a monitor with a paperclip.",
    "A coder is muttering about frame rates in their sleep.",
    "Laptops everywhere. It's a forest of backlit keyboards.",
    "Two sceners are arguing about the best tracker. It's getting heated.",
  ],
  compo_hall: [
    "The projector hums. Everyone's eyes are on the screen.",
    "I don't want to miss the next demo.",
    "A hush falls as the next entry starts.",
    "Someone gasps at a particularly smooth raymarch.",
  ],
  cafeteria: [
    "This pizza isn't bad.",
    "The coffee machine is the most contested piece of hardware here.",
    "Three tired sceners are staring at the menu like it owes them money.",
    "The snack supply is critically low. Send help.",
  ],
  hallway: [
    "A stream of sceners flows between the compo hall and the cafeteria.",
    "Someone is fast asleep against a wall, a diskette still in hand.",
    "Quick whispers about the rumoured entry list.",
  ],
  sleeping: [
    "ZZZ... someone is out cold under a pile of cables.",
    "A row of sleeping bags. The scene's darkest hour.",
    "Snoring so loud it could power the venue.",
  ],
  retro: [
    "A real C64 is humming. Someone's hands hover over the keyboard like it's sacred.",
    "The retro corner smells like warm capacitors and nostalgia.",
    "A kid is trying to load a game from a floppy. The drive groans. Classic.",
  ],
  entrance: [
    "New arrivals keep rolling in, laptops over shoulders.",
    "The registration desk hands out party booklets and wristbands.",
    "Someone's checking in a suspiciously large CRT monitor.",
  ],
  outdoor: [
    "A group of sceners is taking a smoke break and arguing about 4K shader tricks.",
    "Fresh air! And an impromptu jam session on a portable synth.",
    "The evening air is crisp. Someone's filming a demo on a phone.",
  ],
  infodesk: [
    "Where's the compo hall? Where's the toilet? Where's the pizza? All questions for the desk.",
    "An organizer is juggling a clipboard, a radio, and three panicked newcomers.",
    "Schedule updates are being scribbled onto a whiteboard.",
  ],
};

// ---------------------------------------------------------------------------
// Ambient chatter — partygoers speaking without the player
// ---------------------------------------------------------------------------

export const AMBIENT_CHATTER: string[] = [
  "Need more coffee.",
  "Almost finished.",
  "Did you see that shader?",
  "Our musician disappeared.",
  "I haven't slept.",
  "The compo machine is cursed.",
  "That entry was SMOOTH.",
  "Anyone got a USB stick?",
  "The SDF scene is getting out of hand.",
  "Four hours until the deadline.",
  "I've been up since yesterday.",
  "The projector just flickered. Nothing to worry about.",
  "Who brought the good coffee?",
  "My intro crashed on the compo machine. Twice.",
  "The demo compo is going to be legendary this year.",
  "Don't touch my laptop.",
  "Is there anywhere to sleep in this place?",
  "The music compo had some absolute bangers.",
  "Someone's writing code in the dark again.",
  "Where did everyone go? Oh. The pizza arrived.",
];

// ---------------------------------------------------------------------------
// Player-reputation greetings — NPCs remember the player.
// ---------------------------------------------------------------------------

export const REPUTATION_GREETINGS: Record<string, string[]> = {
  unknown: ["Hi.", "Hey. You're new around here, right?", "Oh — hi. Didn't see you there."],
  recognized: ["I watched your intro. Nice work.", "Hey, you're {handle}, right? I've seen your name around.", "I remember you from the party last year."],
  well_known: ["Congratulations on your release. The scene's been talking.", "{handle}! Good to see a familiar face. Your last demo was great.", "Hey — big fan of what {playerGroup} put out."],
  legend: ["Everyone's talking about your latest production.", "{handle}?! Honoured. May I shake the hand that rendered that raymarch?", "The legend approaches. The compo hall is not worthy."],
};

// ---------------------------------------------------------------------------
// Scene knowledge — veterans explain the scene to newcomers.
// ---------------------------------------------------------------------------

export const SCENE_KNOWLEDGE: SceneKnowledgeEntry[] = [
  {
    id: "second_reality",
    label: "Second Reality",
    fact: "Second Reality (Future Crew, 1993) is the most influential PC demo ever released. A full-screen 3D world with real-time texture mapping, it ran on a 486 and made the scene's jaw drop. It's the reason everyone here takes the PC demo seriously.",
  },
  {
    id: "state_of_the_art",
    label: "State of the Art",
    fact: "State of the Art (Spaceballs, 1992) was the Amiga's defining vector showcase. Smooth 3D animation with a soundtrack that still gets played at parties. It set the benchmark for what a 16-bit machine could render in real time.",
  },
  {
    id: "amiga_history",
    label: "Amiga history",
    fact: "The Amiga (1985) had custom chips — Agnus, Denise, Paula — that let coders do things no other home computer could. The blitter moved memory, the copper changed colours mid-frame, and Paula played four channels of sampled sound. It basically invented the modern demo.",
  },
  {
    id: "tracker_culture",
    label: "Tracker culture",
    fact: "Trackers (Ultimate Soundtracker, ProTracker, FastTracker) are the demoscene's music instruments. Tunes are written note-by-note in a grid. The four-channel MOD format defined the 90s sound and is still loved today for its pure, raw synthesis.",
  },
  {
    id: "intro_sizes",
    label: "Intro sizes",
    fact: "Size-coding is the scene's sport. A 4K intro is 4,096 bytes — effects, music, everything — generated procedurally. 64K intros have more room but still demand genius compression. Every byte is a decision.",
  },
  {
    id: "demo_effects",
    label: "Demo effects",
    fact: "Classic demo effects: raster bars (colour bands scrolling by rewriting the copper), sine scrollers, plasma (fractal-like colour fields), vector tunnels, and SDF raymarching in the modern era. Each one is a trick to make hardware do something beautiful.",
  },
  {
    id: "coding_tricks",
    label: "Coding tricks",
    fact: "Old-school tricks: writing the copper list mid-frame, abusing the blitter to fill a screen while you do something else, pre-shifting sprites, and HAM-mode on the Amiga. Modern tricks: packing a full scene into a signed distance field in a fragment shader.",
  },
  {
    id: "assembly_history",
    label: "Assembly parties",
    fact: "Assembly is the granddaddy of demoparties, held in Finland since 1992. Thousands of sceners, a massive compo hall, and an atmosphere no stream can capture. Revision (Germany) and The Party (Denmark) are its legendary cousins.",
  },
  {
    id: "future_crew",
    label: "Future Crew",
    fact: "Future Crew (1986-1994) were the undisputed kings of the early PC scene. Second Reality, Panic, and Unreal 2 came from them. Their demos weren't just good — they were proof that the PC could compete with the Amiga.",
  },
  {
    id: "c64_history",
    label: "C64 history",
    fact: "The Commodore 64 (1982) is the most popular home computer ever sold, and its SID chip made it a music monster. With 64KB of RAM and a 1MHz CPU, C64 coders achieved impossible-looking effects through cycle-perfect raster tricks.",
  },
  {
    id: "pouet",
    label: "Pouet",
    fact: "Pouet is the scene's living archive — a website where every production ever released gets its page, its votes, and its eternal argument in the comments. If it's not on Pouet, did it even happen?",
  },
  {
    id: "diskmags",
    label: "Disk magazines",
    fact: "Disk mags (Hugi, Pain, Imphobia) were the scene's newspapers, distributed as executable files. Interviews, editorials, flame wars, and news about every release. The BBS era ran on them.",
  },
  {
    id: "chiptune",
    label: "Chiptune",
    fact: "Chiptune is music made with sound chips — the SID, the Amiga's Paula, or the Game Boy's APU. The limitations ARE the aesthetic: square waves, noise, and arpeggios that somehow feel alive.",
  },
  {
    id: "bbs_era",
    label: "BBS era",
    fact: "Before the internet, the scene ran on Bulletin Board Systems — dial-up servers where sceners uploaded demos, traded diskmags, and argued at 2400 baud. Downloading one demo could take an hour. We cherished every byte.",
  },
  {
    id: "realtime_vs_rendered",
    label: "Real-time vs rendered",
    fact: "A demo is real-time — the machine renders it live, frame by frame. That's the whole point. If it were pre-rendered it would just be a video, and the scene would have nothing to argue about.",
  },
  {
    id: "sdf_raymarching",
    label: "SDF raymarching",
    fact: "Signed Distance Fields let a shader describe a whole 3D scene as math — a function that tells you how far any point is from a surface. Raymarch along the field and you get detailed, infinite worlds in a few kilobytes. It's modern size-coding.",
  },
];

// ---------------------------------------------------------------------------
// Partygoer first-line openers (when greeting first time)
// ---------------------------------------------------------------------------

export const OPENER_LINES: string[] = [
  "Hi! You're {handle}, right? Welcome to {party}.",
  "Hey, {handle}! What do you think of {party} so far?",
  "Oh hey. I'm {group} at {party} this year.",
  "First time here? No? Cool, me neither. Well — I'm here every year.",
  "Welcome to {party}! The compo hall is that way, the coffee is this way, and sleep is a myth.",
];
