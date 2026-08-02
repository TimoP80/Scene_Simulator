/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PARTY_ATTENDANCE_DATA — authored content for Party Attendance Mode.
 * Pure data. No React, no LLM.
 *
 * Consumed by the pure engine (sim/domain/partyAttendance.ts). The data
 * describes the venue map, the Friday→Sunday schedule, the competition
 * board (with submission deadlines), and the random-event pool.
 */

import type {
  AttendanceVenue,
  AttendanceVenueId,
  ScheduleEvent,
  CompetitionCategory,
  RandomPartyEventDef,
  AttendanceActivity,
} from "@packages/types";

// ---------------------------------------------------------------------------
// Venue map — every location has unique ambiance + ambient chatter.
// ---------------------------------------------------------------------------

export const ATTENDANCE_VENUE_DEFS: Record<AttendanceVenueId, AttendanceVenue> = {
  entrance: {
    id: "entrance",
    label: "Entrance",
    description: "Registration, wristbands, and the first rush of arrivals.",
    ambient: "The door hisses open constantly. New sceners trickle in with duffel bags and CRT-shaped dreams.",
    ambientChatter: [
      "They gave me a wristband AND a booklet. Feeling official.",
      "Is this the queue? I thought this was the queue.",
      "I traveled 900km for this weekend. Worth it already.",
    ],
  },
  main_hall: {
    id: "main_hall",
    label: "Main Hall",
    description: "The beating heart of the party — banners, projectors, and constant motion.",
    ambient: "A low roar of chatter, beeps, and the occasional victory yell. Someone is testing a PA system.",
    ambientChatter: [
      "The banners look great this year.",
      "I heard the schedule changed. Check the screen.",
      "Who brought the good coffee? Asking for a friend.",
    ],
  },
  seating: {
    id: "seating",
    label: "Seating Area",
    description: "Ranks of tables stacked with monitors, keyboards, and half-finished demos.",
    ambient: "The gentle hum of a thousand fans. Someone mutters about frame rates in their sleep.",
    ambientChatter: [
      "Don't touch my laptop. I mean it.",
      "My machine bluescreened twice already and it's only Friday.",
      "Who's got a spare USB stick?",
    ],
  },
  compo_hall: {
    id: "compo_hall",
    label: "Compo Hall",
    description: "The big screen, the rows of seats, the moment everything is decided.",
    ambient: "Projector hum, hush, gasps, applause. The room holds its breath between entries.",
    ambientChatter: [
      "I don't want to miss the next demo.",
      "That intro was SMOOTH.",
      "The SDF work in this one is unreal.",
    ],
  },
  stage: {
    id: "stage",
    label: "Stage",
    description: "Live concerts, opening ceremonies, and the awards podium.",
    ambient: "Lighting rigs sweep the room. A soundcheck thumps somewhere behind the curtain.",
    ambientChatter: [
      "The live set tonight is going to be legendary.",
      "Stage crew just sound-checked a chiptune. My ears are blessed.",
      "Where's the confetti? There's supposed to be confetti.",
    ],
  },
  cafeteria: {
    id: "cafeteria",
    label: "Cafeteria",
    description: "Pizza, coffee, and the party's lifeblood.",
    ambient: "The clatter of plates, the hiss of the espresso machine, urgent whispers about the compo schedule.",
    ambientChatter: [
      "This pizza isn't bad. For party pizza, it's gourmet.",
      "The coffee machine is the most contested hardware here.",
      "They're out of pizza. War has been declared.",
    ],
  },
  sleeping: {
    id: "sleeping",
    label: "Sleeping Hall",
    description: "Rows of sleeping bags and the scene's darkest hour.",
    ambient: "Soft snoring, the glow of a few laptops, someone whispering about a deadline.",
    ambientChatter: [
      "ZZZ...",
      "Just an hour. I'll code better after an hour.",
      "The snoring is loud enough to power the venue.",
    ],
  },
  showers: {
    id: "showers",
    label: "Showers",
    description: "The great reset — hot water and the return of humanity.",
    ambient: "Steam, running water, and the primal comfort of being clean again.",
    ambientChatter: [
      "I forgot what warm water felt like.",
      "72 hours awake? Nope. Shower first.",
      "That's the freshest I've felt since Thursday.",
    ],
  },
  retro: {
    id: "retro",
    label: "Retro Exhibition",
    description: "C64s, Amigas, and warm capacitors. History, hands-on.",
    ambient: "The smell of warm electronics. Someone is loading a game from a floppy that groans on every revolution.",
    ambientChatter: [
      "The C64 did more with 64KB than my phone does with 128GB.",
      "Look — an actual working Amiga!",
      "The floppy drive is singing its ancient song.",
    ],
  },
  merch: {
    id: "merch",
    label: "Merchandise Shop",
    description: "T-shirts, pins, diskmags, and the physical memory of the weekend.",
    ambient: "The rustle of fabric, the clink of pins, someone haggling over a sticker sheet.",
    ambientChatter: [
      "They have a sticker of my favourite group. Take my money.",
      "The diskmag stack goes all the way back to the 90s.",
      "I need the hoodie. The hoodie is non-negotiable.",
    ],
  },
  outdoor: {
    id: "outdoor",
    label: "Outdoor Area",
    description: "Fresh air, smoke breaks, and impromptu synth jams.",
    ambient: "Crisp evening air. A portable synth loops a bassline while someone argues about compression.",
    ambientChatter: [
      "Fresh air! My body forgot this existed.",
      "The stars are out. The scene is alive.",
      "Someone's filming a demo on their phone. For the trip report.",
    ],
  },
  quiet_workspace: {
    id: "quiet_workspace",
    label: "Quiet Workspace",
    description: "A silent room for heads-down coding, away from the roar.",
    ambient: "Only the click of keys and the occasional sigh. Productivity lives here.",
    ambientChatter: [
      "Shh. Shader work in progress.",
      "I wrote more code in two hours here than in all of Friday.",
      "This room is a cheat code.",
    ],
  },
  organizer_desk: {
    id: "organizer_desk",
    label: "Organizer Desk",
    description: "Where the party is actually being held together with clipboards and willpower.",
    ambient: "A radio crackles. Someone is juggling a clipboard, a schedule, and three panicked newcomers.",
    ambientChatter: [
      "Compo deadlines are firm. FIRM.",
      "The schedule is a suggestion. The deadline is not.",
      "Yes, I'll announce it. No, I won't forget.",
    ],
  },
  infopoint: {
    id: "infopoint",
    label: "Information Point",
    description: "Where's the compo hall? Where's the pizza? All questions answered here.",
    ambient: "A whiteboard of scribbled schedule updates. A queue of first-timers with excellent questions.",
    ambientChatter: [
      "Where's the toilet? Asking for a friend. It's me.",
      "The schedule changed AGAIN?",
      "Registration is at the entrance, compo hall is straight ahead.",
    ],
  },
};

export const ATTENDANCE_VENUES_LIST: AttendanceVenueId[] = Object.keys(ATTENDANCE_VENUE_DEFS) as AttendanceVenueId[];

// ---------------------------------------------------------------------------
// Weekend schedule — Friday → Sunday.
// ---------------------------------------------------------------------------

export const PARTY_WEEKEND_SCHEDULE: ScheduleEvent[] = [
  // ---- Friday ----
  { id: "fri_registration", day: 1, hour: 16, type: "registration", title: "Registration Opens", location: "entrance", description: "Wristbands, booklets, and the first handshakes of the weekend." },
  { id: "fri_setup", day: 1, hour: 17, type: "workshop", title: "Hardware Setup", location: "seating", description: "Monitors stacked, cables tangled, dreams plugged in." },
  { id: "fri_coding_1", day: 1, hour: 18, type: "workshop", title: "First Coding Sessions", location: "seating", description: "The hall fills with the sound of keyboards warming up." },
  { id: "fri_opening", day: 1, hour: 20, type: "opening", title: "Opening Ceremony", location: "stage", description: "The organizers welcome everyone. The weekend officially begins." },
  { id: "fri_concert", day: 1, hour: 22, type: "concert", title: "Evening Concert", location: "stage", description: "Live chiptune and synth sets under the lights." },
  { id: "fri_late_coding", day: 1, hour: 23, type: "workshop", title: "Late-Night Coding", location: "quiet_workspace", description: "The night shift takes over. Coffee becomes currency." },
  // ---- Saturday ----
  { id: "sat_morning", day: 2, hour: 9, type: "workshop", title: "Saturday Coding Marathon", location: "seating", description: "The main event begins. Every minute counts." },
  { id: "sat_graphics_compo", day: 2, hour: 14, type: "compo", title: "Graphics Compo", location: "compo_hall", description: "Pixel art and logotypes hit the big screen." },
  { id: "sat_music_compo", day: 2, hour: 16, type: "compo", title: "Music Compo", location: "compo_hall", description: "Trackers and MODs fill the hall with melody." },
  { id: "sat_wild_compo", day: 2, hour: 18, type: "compo", title: "Wild Competition", location: "compo_hall", description: "Anything goes. Chaos is the point." },
  { id: "sat_workshop", day: 2, hour: 20, type: "seminar", title: "Shader Showdown Seminar", location: "main_hall", description: "A masterclass in raymarching and SDFs." },
  { id: "sat_overnight", day: 2, hour: 23, type: "workshop", title: "Overnight Coding", location: "quiet_workspace", description: "The demo deadline looms. The hall gets serious." },
  // ---- Sunday ----
  { id: "sun_final_submissions", day: 3, hour: 10, type: "compo", title: "Final Submissions", location: "organizer_desk", description: "Deadlines arrive. The USB sticks start flying." },
  { id: "sun_demo_compo", day: 3, hour: 13, type: "compo", title: "Demo Compo", location: "compo_hall", description: "The main event — the entire scene holds its breath." },
  { id: "sun_awards", day: 3, hour: 18, type: "awards", title: "Prize Ceremony", location: "stage", description: "Trophies, tears, and confetti." },
  { id: "sun_farewell", day: 3, hour: 20, type: "closing", title: "Farewell & Closing", location: "main_hall", description: "Goodbyes, packing, and the long road home." },
];

// ---------------------------------------------------------------------------
// Competition board — with submission deadlines.
// ---------------------------------------------------------------------------

export const COMPETITION_CATEGORIES: CompetitionCategory[] = [
  { id: "pc_demo", label: "PC Demo", description: "The showpiece. Full creative freedom, maximum impact.", deadlineDay: 3, deadlineHour: 12, compoDay: 3, compoHour: 13, productionTypes: ["Mega-Demo"], compoEventType: "compo_started" },
  { id: "intro_64k", label: "64k Intro", description: "Everything in 65,536 bytes. Every byte is a decision.", deadlineDay: 3, deadlineHour: 12, compoDay: 3, compoHour: 14, productionTypes: ["64KB Intro"], compoEventType: "compo_started" },
  { id: "intro_4k", label: "4k Intro", description: "The ultimate size-coding challenge. 4,096 bytes.", deadlineDay: 3, deadlineHour: 11, compoDay: 3, compoHour: 13, productionTypes: ["4KB Intro"], compoEventType: "compo_started" },
  { id: "shader_showdown", label: "Shader Showdown", description: "Real-time GLSL, live on stage. No offline rendering.", deadlineDay: 2, deadlineHour: 22, compoDay: 3, compoHour: 10, productionTypes: ["Mega-Demo", "4KB Intro"], compoEventType: "compo_started" },
  { id: "graphics", label: "Graphics", description: "Pixel art and logotypes, judged frame by frame.", deadlineDay: 2, deadlineHour: 13, compoDay: 2, compoHour: 14, productionTypes: ["Slide Show"], compoEventType: "compo_started" },
  { id: "music", label: "Music", description: "Tracker modules and executable music, ears first.", deadlineDay: 2, deadlineHour: 15, compoDay: 2, compoHour: 16, productionTypes: ["Music Disk"], compoEventType: "compo_started" },
  { id: "executable_music", label: "Executable Music", description: "The music must play from a self-contained binary.", deadlineDay: 2, deadlineHour: 17, compoDay: 2, compoHour: 18, productionTypes: ["Music Disk"], compoEventType: "compo_started" },
  { id: "fast_compo", label: "Fast Compo", description: "One hour, one entry, no mercy.", deadlineDay: 3, deadlineHour: 11, compoDay: 3, compoHour: 12, productionTypes: ["Mega-Demo", "4KB Intro", "64KB Intro"], compoEventType: "compo_started" },
  { id: "game_dev", label: "Game Development", description: "A playable game in a weekend. Scope discipline required.", deadlineDay: 3, deadlineHour: 11, compoDay: 3, compoHour: 12, productionTypes: ["Mega-Demo"], compoEventType: "compo_started" },
  { id: "wild", label: "Wild", description: "Anything that runs. Chaos is the aesthetic.", deadlineDay: 3, deadlineHour: 11, compoDay: 3, compoHour: 12, productionTypes: ["Mega-Demo", "Slide Show", "Music Disk"], compoEventType: "compo_started" },
];

// ---------------------------------------------------------------------------
// Random events — dynamic situations with gameplay effects.
// ---------------------------------------------------------------------------

export const RANDOM_PARTY_EVENTS: RandomPartyEventDef[] = [
  { id: "coffee_spill", label: "Coffee Spill", description: "A mug of coffee meets your keyboard. The casualty count: one spacebar.", needs: { stress: 8, motivation: -6 }, weight: 8 },
  { id: "computer_crash", label: "Computer Crash", description: "The blue screen of death pays a visit. Unpushed work trembles.", needs: { stress: 10, motivation: -8 }, weight: 7 },
  { id: "gpu_driver", label: "GPU Driver Problem", description: "The driver update was a trap. The display is a slideshow now.", needs: { stress: 8, motivation: -5 }, weight: 6 },
  { id: "network_outage", label: "Network Outage", description: "The party LAN dies. Downloads stall. Panic is measured in decibels.", needs: { stress: 6 }, weight: 6 },
  { id: "internet_restored", label: "Internet Restored", description: "The LAN is back! A cheer rolls through the seating area.", needs: { motivation: 8, stress: -6 }, weight: 6 },
  { id: "lost_usb", label: "Lost USB Stick", description: "Your backup stick is gone. The hunt begins. You find it in a pizza box.", needs: { stress: 6, motivation: -4 }, weight: 6 },
  { id: "keyboard_failure", label: "Keyboard Failure", description: "The 'W' key dies mid-word. You remap and carry on like a soldier.", needs: { stress: 5 }, weight: 5 },
  { id: "unexpected_visitor", label: "Unexpected Visitor", description: "A friend you met at the last party shows up. Reunion energy!", needs: { motivation: 10, stress: -4 }, weight: 6 },
  { id: "famous_scener", label: "Famous Scener Arrives", description: "A legend walks through the door. The hall murmurs in recognition.", needs: { motivation: 12, stress: -3 }, partygoerEvent: "announcement", weight: 4 },
  { id: "live_performance", label: "Live Performance Begins", description: "An impromptu chiptune set erupts on the stage. Everyone gathers.", needs: { motivation: 10, stress: -5 }, partygoerEvent: "concert", weight: 6 },
  { id: "hardware_raffle", label: "Hardware Raffle", description: "The organizers raffle off a vintage machine. Hope is free; winning is not.", needs: { motivation: 6 }, weight: 4 },
  { id: "fire_alarm", label: "Fire Alarm", description: "The fire alarm blares. Everyone files out, laptops in hand, then files back in.", needs: { stress: 8 }, partygoerEvent: "fire_alarm", weight: 3 },
  { id: "pizza_delivery", label: "Pizza Delivery", description: "A fresh pizza shipment arrives. The crowd materializes from nowhere.", needs: { hunger: 20, motivation: 8 }, weight: 7 },
];

// ---------------------------------------------------------------------------
// Activities — what the player can do at each venue. Costs hours, adjusts
// needs, and may push the current production toward completion.
// ---------------------------------------------------------------------------

export const ATTENDANCE_ACTIVITIES: AttendanceActivity[] = [
  // ---- Rest & recovery ----
  { id: "sleep", label: "Sleep", description: "Six hours in the sleeping hall. Your body files a formal thank-you.", hours: 6, needs: { sleep: 60, energy: 45, motivation: 10, stress: -25 }, venues: ["sleeping"], stat: "sleep" },
  { id: "nap", label: "Nap", description: "A quick two-hour recharge in a quiet corner.", hours: 2, needs: { sleep: 25, energy: 18, stress: -8 }, venues: ["sleeping", "quiet_workspace"], stat: "sleep" },
  { id: "shower", label: "Shower", description: "Hot water, soap, and the return of human dignity.", hours: 1, needs: { hygiene: 70, energy: 8, stress: -6 }, venues: ["showers"] },
  { id: "rest", label: "Rest", description: "Sit down, breathe, and let the party happen around you.", hours: 1, needs: { energy: 10, stress: -6 }, venues: ["main_hall", "outdoor", "seating"] },
  // ---- Fuel ----
  { id: "eat", label: "Eat", description: "Pizza, energy drinks, and the obligatory salad someone brought.", hours: 1, needs: { hunger: 45, thirst: 20, energy: 6, motivation: 4 }, venues: ["cafeteria"] },
  { id: "coffee", label: "Coffee", description: "The scene's true lifeblood. Caffeine in, productivity out.", hours: 1, needs: { energy: 14, motivation: 8, sleep: -5, stress: -3 }, venues: ["cafeteria", "main_hall", "seating", "quiet_workspace"], stat: "coffee" },
  // ---- Production work ----
  { id: "code", label: "Code", description: "Head down, keys clacking. The demo takes shape.", hours: 2, needs: { energy: -12, motivation: -3, stress: 5 }, venues: ["seating", "quiet_workspace"], productionProgress: 20, stat: "code" },
  { id: "optimize", label: "Optimize", description: "Shave bytes, squeeze frames, chase the profiler.", hours: 2, needs: { energy: -10, stress: 4 }, venues: ["seating", "quiet_workspace"], productionProgress: 6, quality: 8, stat: "code" },
  { id: "test", label: "Test & Debug", description: "Break it on purpose so it never breaks on stage.", hours: 1, needs: { energy: -4, stress: 2 }, venues: ["seating", "quiet_workspace"], productionProgress: 4, quality: 6, stat: "code" },
  { id: "package", label: "Package", description: "Zip it, label it, burn the final build — make it a real release.", hours: 1, needs: { energy: -2, stress: -3 }, venues: ["seating", "quiet_workspace"], productionProgress: 0 },
  // ---- Social & exploration ----
  { id: "socialize", label: "Socialize", description: "Talk to sceners, trade stories, make friends.", hours: 1, needs: { energy: -3, motivation: 12, stress: -8 }, venues: ["main_hall", "cafeteria", "outdoor", "entrance", "merch"], stat: "chat" },
  { id: "watch_compo", label: "Watch Compo", description: "Take a seat in the dark and watch the big screen.", hours: 1, needs: { motivation: 10, stress: -5 }, venues: ["compo_hall"], stat: "chat" },
  { id: "explore", label: "Explore", description: "Check out the retro corner, the merch, the view.", hours: 1, needs: { motivation: 6, stress: -4 } },
  { id: "souvenir", label: "Buy Merch", description: "T-shirts, pins, stickers — the physical memory of the weekend.", hours: 1, needs: { motivation: 8 }, venues: ["merch"] },
  { id: "seminar", label: "Attend Seminar", description: "Learn a new technique from a scene veteran.", hours: 1, needs: { motivation: 12, energy: -2 }, venues: ["main_hall", "organizer_desk"], quality: 4 },
];
