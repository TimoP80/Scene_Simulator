/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PARTY_CALENDAR — moved verbatim from src/data.ts.
 * Pure static schedule of historic demo parties. Expanded in 2026 to
 * cover the full 1985–2026 demoscene timeline: from the cracktros /
 * "horror demos" era (where C64 parties dominated) through the
 * Amiga/PC 16-bit golden age, the early-2000s shader / 64k-intro scene,
 * and into the HD/online era (2006–2026) with livestreamed compos.
 */

import { PartyEvent, ProductionType } from "@packages/types";

export const PARTY_CALENDAR: PartyEvent[] = [
  // ---------------------------- 1985 – 1989 -------------------------------
  // The underground cracktros era. Hardware is almost entirely C64 / ZX.
  {
    id: "copy_party_1989",
    name: "Copy Party",
    year: 1989,
    month: 2,
    isAnnual: true,
    platformFocus: "c64",
    attendance: 250,
    prestige: 28,
    competitions: [
      { type: ProductionType.Cracktro, prizePool: 60, entrants: [] }
    ],
    headlineNews: "Disk-swappers unite in a smelly gymnasium to swap cracked floppies and bet on the loudest crack intro. Highest density of SID 6581 music per square meter on the planet.",
    location: "Hannover, Germany"
  },
  {
    id: "venlo_party",
    name: "Venlo Meeting",
    year: 1987,
    month: 5,
    isAnnual: true,
    platformFocus: "c64",
    attendance: 180,
    prestige: 22,
    competitions: [
      { type: ProductionType.Cracktro, prizePool: 35, entrants: [] }
    ],
    headlineNews: "Early C64 demo swap meet. Mostly Dutch crackers trading floppy disk labels and BBS phone numbers by candlelight behind the gym.",
    location: "Venlo, Netherlands"
  },

  // ---------------------------- 1990 – 1994 -------------------------------
  // Amiga dominance. The classic 16-bit parties begin spinning up.
  {
    id: "the_gathering",
    name: "The Gathering",
    year: 1992,
    month: 4,
    isAnnual: true,
    platformFocus: "all",
    attendance: 4500,
    prestige: 92,
    competitions: [
      { type: ProductionType.Demo, prizePool: 2200, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 700, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 1100, entrants: [] }
    ],
    headlineNews: "Massive Scandinavian Easter gathering with thousands of terminals in a single convention hall. The Amiga and PC underground collide for one weekend only.",
    location: "Hamar, Norway"
  },
  {
    id: "twilight_zone",
    name: "Twilight Zone",
    year: 1992,
    month: 6,
    isAnnual: true,
    platformFocus: "amiga",
    attendance: 700,
    prestige: 60,
    competitions: [
      { type: ProductionType.Demo, prizePool: 500, entrants: [] },
      { type: ProductionType.Cracktro, prizePool: 150, entrants: [] }
    ],
    headlineNews: "A classic mid-90s German Amiga-only meetup. Copper-list tricks on AGA, dynamic Ham8 palettes, and tracker versus synth drama.",
    location: "Oberhausen, Germany"
  },
  {
    id: "horror_demos",
    name: "Horror Demos",
    year: 1987,
    month: 7,
    isAnnual: true,
    platformFocus: "c64",
    attendance: 320,
    prestige: 38,
    competitions: [
      { type: ProductionType.Demo, prizePool: 220, entrants: [] }
    ],
    headlineNews: "Sunken church-hall packed entirely with C64 rebels. Half the crowd still wears cracked leather jackets and talks in l33t-only.",
    location: "Birmingham, UK"
  },
  {
    id: "assembly_summer",
    name: "Assembly Summer",
    year: 1992,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 3500,
    prestige: 98,
    competitions: [
      { type: ProductionType.Demo, prizePool: 2500, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 1200, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 800, entrants: [] }
    ],
    headlineNews: "Assembly hosts the peak competition of the year in Helsinki. Thousands of computers wired to local network hubs.",
    location: "Helsinki, Finland"
  },
  {
    id: "sun_demoparty",
    name: "Sun Demoparty",
    year: 1992,
    month: 9,
    isAnnual: true,
    platformFocus: "all",
    attendance: 950,
    prestige: 78,
    competitions: [
      { type: ProductionType.Demo, prizePool: 900, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 450, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 200, entrants: [] }
    ],
    headlineNews: "Mid-sized Swiss gathering famous for its friendly vibe and surprise live-coding performances. Pin tables, tap water, mountain air.",
    location: "Winterthur, Switzerland"
  },

  // ---------------------------- 1995 – 1999 -------------------------------
  // The peak 16-bit end + early 3D card era. New parties explode.
  {
    id: "mekka_symposium",
    name: "Mekka & Symposium",
    year: 1992,
    month: 1,
    isAnnual: true,
    platformFocus: "amiga",
    attendance: 1800,
    prestige: 96,
    competitions: [
      { type: ProductionType.Demo, prizePool: 2000, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 900, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 350, entrants: [] }
    ],
    headlineNews: "The biggest Amiga-only spectacle of the year. Ham8 palette wars and copper-list wizardry dominate the giant cinema screen.",
    location: "Weilheim, Germany"
  },
  {
    id: "fishtank_party",
    name: "Fishtank Party",
    year: 1992,
    month: 3,
    isAnnual: false,
    platformFocus: "all",
    attendance: 280,
    prestige: 30,
    competitions: [
      { type: ProductionType.Cracktro, prizePool: 80, entrants: [] }
    ],
    headlineNews: "Tiny experimental party held in an actual converted fish-tank shop. Coffee cups double as monitor stands.",
    location: "Aarhus, Denmark"
  },
  {
    id: "breakpoint",
    name: "Breakpoint",
    year: 1992,
    month: 4,
    isAnnual: true,
    platformFocus: "amiga",
    attendance: 1200,
    prestige: 80,
    competitions: [
      { type: ProductionType.Demo, prizePool: 800, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 400, entrants: [] }
    ],
    headlineNews: "Breakpoint gathers hackers in Germany for non-stop floppy swap and massive Amiga competitions.",
    location: "Bingen, Germany"
  },
  {
    id: "buenzli",
    name: "Buenzli",
    year: 1992,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 750,
    prestige: 70,
    competitions: [
      { type: ProductionType.Demo, prizePool: 650, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 300, entrants: [] }
    ],
    headlineNews: "Swiss underground classic. Big-warehouse 'scene-meets-summer-camp' energy with legendary outdoor BBQ & chiptune battles.",
    location: "Roggwil, Switzerland"
  },
  {
    id: "nordlicht",
    name: "Nordlicht",
    year: 1992,
    month: 10,
    isAnnual: true,
    platformFocus: "all",
    attendance: 850,
    prestige: 72,
    competitions: [
      { type: ProductionType.Demo, prizePool: 700, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 350, entrants: [] }
    ],
    headlineNews: "Northern-lights themed PC + Amiga hybrid gathering. Mixes 3DFX shader previews with direct VGA flip tricks in the same bracket.",
    location: "Hamburg, Germany"
  },
  {
    id: "outline",
    name: "Outline",
    year: 1992,
    month: 11,
    isAnnual: true,
    platformFocus: "all",
    attendance: 900,
    prestige: 74,
    competitions: [
      { type: ProductionType.Demo, prizePool: 800, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 400, entrants: [] },
      { type: ProductionType.ArtSlide, prizePool: 250, entrants: [] }
    ],
    headlineNews: "Dutch multi-platform showcase with a focus on x86 demomaking. Heavy 3D card lineup and pixel-graphics slam contests.",
    location: "Eindhoven, Netherlands"
  },
  {
    id: "the_party",
    name: "The Party",
    year: 1992,
    month: 12,
    isAnnual: true,
    platformFocus: "all",
    attendance: 2000,
    prestige: 85,
    competitions: [
      { type: ProductionType.Demo, prizePool: 1500, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 750, entrants: [] },
      { type: ProductionType.Cracktro, prizePool: 300, entrants: [] }
    ],
    headlineNews: "Danish end-of-year spectacle featuring legendary 16-bit and PC demo battles inside active ice hockey arenas.",
    location: "Aars, Denmark"
  },

  // ---------------------------- 2000 – 2005 -------------------------------
  // The 3D shader revolution. Parties get smaller, more intense.

  {
    id: "chaos_constructions",
    name: "Chaos Constructions",
    year: 1998,
    month: 2,
    isAnnual: true,
    platformFocus: "pc",
    attendance: 650,
    prestige: 82,
    competitions: [
      { type: ProductionType.Demo, prizePool: 1200, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 600, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 400, entrants: [] }
    ],
    headlineNews: "Russia's premier demoparty: 64k intros and shader-coded sweeps fill a freezing Saint Petersburg warehouse all weekend.",
    location: "Saint Petersburg, Russia"
  },
  {
    id: "wired",
    name: "Wired",
    year: 1998,
    month: 5,
    isAnnual: true,
    platformFocus: "pc",
    attendance: 480,
    prestige: 65,
    competitions: [
      { type: ProductionType.Intro4k, prizePool: 320, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 480, entrants: [] }
    ],
    headlineNews: "Czech 4k/64k showcase. Café-chic with espresso bars next to the voting machines, and heavy discussion of cranker compression.",
    location: "Brno, Czech Republic"
  },
  {
    id: "x_party",
    name: "X",
    year: 1998,
    month: 6,
    isAnnual: true,
    platformFocus: "pc",
    attendance: 700,
    prestige: 84,
    competitions: [
      { type: ProductionType.Demo, prizePool: 1700, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 700, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 900, entrants: [] }
    ],
    headlineNews: "Poland's answer to Assembly. Battle of the shaders, megapixel intros, and who-can-shade-more-fragments-per-pixel.",
    location: "Kraków, Poland"
  },
  {
    id: "evoke",
    name: "Evoke",
    year: 1992,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 1100,
    prestige: 79,
    competitions: [
      { type: ProductionType.Demo, prizePool: 950, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 400, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 500, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 250, entrants: [] }
    ],
    headlineNews: "Modern Germany's late-summer hybrid. Mixes retro 8-bit, Amiga and PC shader crews in a single amphitheatre.",
    location: "Cologne, Germany"
  },
  {
    id: "paradize",
    name: "Paradize",
    year: 1998,
    month: 10,
    isAnnual: true,
    platformFocus: "pc",
    attendance: 380,
    prestige: 55,
    competitions: [
      { type: ProductionType.Intro4k, prizePool: 260, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 380, entrants: [] }
    ],
    headlineNews: "Cuddly French intro-only party. Tiny attendance, huge love for cranked-up tiny executables. Crepes and baguette on standby.",
    location: "Paris, France"
  },
  {
    id: "solskogen",
    name: "Solskogen",
    year: 2002,
    month: 7,
    isAnnual: true,
    platformFocus: "all",
    attendance: 500,
    prestige: 68,
    competitions: [
      { type: ProductionType.Demo, prizePool: 600, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 300, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 200, entrants: [] }
    ],
    headlineNews: "Norway's cosy summer-gathering under the midnight sun. Retro 8-bit meets shader-driven 4K intros in a single cabin village.",
    location: "Fredrikstad, Norway"
  },

  // ---------------------------- 2006 – 2012 -------------------------------
  // The HD online era. Parties livestream, multi-monitor setups arrive.
  {
    id: "revision",
    name: "Revision",
    year: 2006,
    month: 4,
    isAnnual: true,
    platformFocus: "all",
    attendance: 1400,
    prestige: 90,
    competitions: [
      { type: ProductionType.Demo, prizePool: 3000, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 1500, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 800, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 400, entrants: [] }
    ],
    headlineNews: "Revision rises as the spiritual successor to Breakpoint. The Easter demoparty returns to Germany with HD projectors and real-time streaming to the world.",
    location: "Saarbrücken, Germany"
  },
  {
    id: "function_2007",
    name: "Function",
    year: 2007,
    month: 11,
    isAnnual: true,
    platformFocus: "pc",
    attendance: 300,
    prestige: 62,
    competitions: [
      { type: ProductionType.Intro4k, prizePool: 350, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 500, entrants: [] }
    ],
    headlineNews: "Hungarian modern-demoparty. Tight-knit coder circles compete on real-time raymarching and GPU compute shader prototypes.",
    location: "Budapest, Hungary"
  },
  {
    id: "syntax_party_2008",
    name: "Syntax Party",
    year: 2008,
    month: 12,
    isAnnual: true,
    platformFocus: "all",
    attendance: 350,
    prestige: 58,
    competitions: [
      { type: ProductionType.Demo, prizePool: 500, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 250, entrants: [] }
    ],
    headlineNews: "Netherlands' modern answer to The Party. Projection-mapped walls and multi-screen demos are the new frontier.",
    location: "Utrecht, Netherlands"
  },

  // ---------------------------- 2013 – 2019 -------------------------------
  // The GPU compute & live-coding era. Real-time raymarching dominates.
  {
    id: "revision_2013",
    name: "Revision (Spring Edition)",
    year: 2013,
    month: 4,
    isAnnual: true,
    platformFocus: "all",
    attendance: 1800,
    prestige: 93,
    competitions: [
      { type: ProductionType.Demo, prizePool: 3500, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 1800, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 1000, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 500, entrants: [] }
    ],
    headlineNews: "Revision becomes the world's largest demoparty. 4K projectors, pixel-perfect live-streams, and GPU-compute entries push the scene to new heights.",
    location: "Saarbrücken, Germany"
  },
  {
    id: "datastorm_2013",
    name: "Datastorm",
    year: 2013,
    month: 3,
    isAnnual: true,
    platformFocus: "all",
    attendance: 600,
    prestige: 72,
    competitions: [
      { type: ProductionType.Demo, prizePool: 800, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 400, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 250, entrants: [] }
    ],
    headlineNews: "Swedish spring party bridging the old-school Amiga scene with modern GPU-accelerated intros. Known for its friendly workshop vibe.",
    location: "Gothenburg, Sweden"
  },
  {
    id: "evoke_2015",
    name: "Evoke",
    year: 2015,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 1200,
    prestige: 82,
    competitions: [
      { type: ProductionType.Demo, prizePool: 2000, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 900, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 500, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 300, entrants: [] }
    ],
    headlineNews: "Cologne's late-summer demo-classic returns with modern vigour. Raymarched 4K intros share the screen with nostalgic Amiga copper demos.",
    location: "Cologne, Germany"
  },
  {
    id: "demobit_2016",
    name: "Demobit",
    year: 2016,
    month: 6,
    isAnnual: true,
    platformFocus: "all",
    attendance: 350,
    prestige: 60,
    competitions: [
      { type: ProductionType.Demo, prizePool: 500, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 300, entrants: [] }
    ],
    headlineNews: "Slovakia's intimate demoparty. Famous for its relaxed hacker-camp atmosphere, all-night coding sessions, and legendary BBQ.",
    location: "Bratislava, Slovakia"
  },

  // ---------------------------- 2020 – 2026 -------------------------------
  // The online/hybrid era. Global streaming, remote compos, scene thrives.
  {
    id: "revision_online_2020",
    name: "Revision Online",
    year: 2020,
    month: 4,
    isAnnual: true,
    platformFocus: "all",
    attendance: 3000,
    prestige: 88,
    competitions: [
      { type: ProductionType.Demo, prizePool: 2500, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 1200, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 700, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 400, entrants: [] }
    ],
    headlineNews: "Pandemic pivots Revision to a fully online event. Record-breaking attendance from 50+ countries proves the demoscene thrives in any format.",
    location: "Global (Online)"
  },
  {
    id: "love_byte_2021",
    name: "Love Byte",
    year: 2021,
    month: 8,
    isAnnual: true,
    platformFocus: "all",
    attendance: 400,
    prestige: 55,
    competitions: [
      { type: ProductionType.Demo, prizePool: 400, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 250, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 150, entrants: [] }
    ],
    headlineNews: "A brand-new Finnish online-meets-local party. Combines Discord-streamed compos with small regional meetups for a hybrid experience.",
    location: "Helsinki, Finland (Hybrid)"
  },
  {
    id: "solskogen_2023",
    name: "Solskogen",
    year: 2023,
    month: 7,
    isAnnual: true,
    platformFocus: "all",
    attendance: 650,
    prestige: 75,
    competitions: [
      { type: ProductionType.Demo, prizePool: 1200, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 600, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 350, entrants: [] }
    ],
    headlineNews: "Solskogen returns stronger than ever. The legendary Norway gathering sells out for the first time, with GPU demos projected on outdoor screens.",
    location: "Fredrikstad, Norway"
  },
  {
    id: "revision_2024",
    name: "Revision",
    year: 2024,
    month: 4,
    isAnnual: true,
    platformFocus: "all",
    attendance: 2500,
    prestige: 95,
    competitions: [
      { type: ProductionType.Demo, prizePool: 4000, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 2000, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 1200, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 600, entrants: [] }
    ],
    headlineNews: "Revision 2024 shatters attendance records. The demoscene's biggest weekend features 4K 120Hz projection and a dedicated retro corner for C64/Amiga.",
    location: "Saarbrücken, Germany"
  },
  {
    id: "inercia_2025",
    name: "Inércia Demoparty",
    year: 2025,
    month: 9,
    isAnnual: true,
    platformFocus: "all",
    attendance: 250,
    prestige: 50,
    competitions: [
      { type: ProductionType.Demo, prizePool: 300, entrants: [] },
      { type: ProductionType.Intro4k, prizePool: 200, entrants: [] }
    ],
    headlineNews: "Portugal's first-ever demoparty. A small but passionate gathering proving the scene continues to inspire new generations across Europe.",
    location: "Lisbon, Portugal"
  },
  {
    id: "flashback_2026",
    name: "Flashback",
    year: 2026,
    month: 6,
    isAnnual: true,
    platformFocus: "all",
    attendance: 350,
    prestige: 52,
    competitions: [
      { type: ProductionType.Demo, prizePool: 400, entrants: [] },
      { type: ProductionType.Intro64k, prizePool: 200, entrants: [] },
      { type: ProductionType.MusicDisk, prizePool: 100, entrants: [] }
    ],
    headlineNews: "A new Australian demoparty rises. The Southern Hemisphere finally enters the scene map with a packed weekend of demos, chiptunes, and LAN parties.",
    location: "Sydney, Australia"
  }
];
