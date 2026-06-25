/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * RIVAL_RELEASES \u2014 typed seed for party contest rivals.
 * Backed the inline `rivalsList` block that previously lived in src/App.tsx.
 * Pure data; no React, no DOM, no LLM. Read by /apps/ui through selectors.
 *
 * Schema fields (only what the contest ui+tick actually consume today):
 *   - id            unique stable identifier reused as the tally key
 *   - name          display name (e.g. "Second Reality")
 *   - group         producing crew (Future Crew, Farbrausch, ...)
 *   - title         one-line contest tagline (e.g. "SPHERICAL FLUIDS")
 *   - platform      the rig they released on (used for cross-referencing rig prose in news)
 *   - year, month   release date in the calendar timeline (used to filter rivals that
 *                   existed at the player's current month)
 *   - platformFocus the PartyEvent.focus band the rival competes in ("all" | "amiga" | "c64" | "pc")
 *   - baselineScore technical-quality floor (the inline code used base + Math.random()*variance)
 *   - scoreVariance  max random roll added on top of baselineScore at contest time
 *   - [disbandedAfter] optional year \u2014 if set, the rival is filtered out once currentYear >
 *                     disbandedAfter. Replaces the in-line `group === "Spaceballs"` hack.
 *   - description   short prose flavour saved for the post-party news ticker
 */

import { PlatformId } from "@packages/types";
import type { RivalPlatformFocus } from "../domain/party";

export interface RivalRelease {
  id: string;
  name: string;
  group: string;
  title: string;
  platform: PlatformId;
  year: number;
  month: number;
  platformFocus: RivalPlatformFocus;
  baselineScore: number;
  scoreVariance: number;
  disbandedAfter?: number;
  description: string;
}

export const RIVAL_RELEASES: RivalRelease[] = [
  // 8-bit / C64
  {
    id: "deus_ex_machina",
    name: "Deus Ex Machina",
    group: "Crest",
    title: "VOXEL ASCENSION",
    platform: PlatformId.C64,
    year: 2000, month: 8,
    platformFocus: "c64",
    baselineScore: 88,
    scoreVariance: 8,
    description: "Pushed 1MHz 6502 assembler to render volumetric pixel fields and fluid demo loops far beyond the C64's norms."
  },

  // 16-bit Amiga
  {
    id: "hardwired",
    name: "Hardwired",
    group: "The Silents & Crionics",
    title: "VECTOR HARDWARE",
    platform: PlatformId.AMIGA_500,
    year: 1991, month: 12,
    platformFocus: "amiga",
    baselineScore: 86,
    scoreVariance: 12,
    description: "Incredible Amiga presentation of dynamic scaling, zoom routines, and copper-driven vector polygons."
  },
  {
    id: "state_of_the_art",
    name: "State of the Art",
    group: "Spaceballs",
    title: "VECTORS GREETING",
    platform: PlatformId.AMIGA_500,
    year: 1992, month: 4,
    platformFocus: "amiga",
    baselineScore: 78,
    scoreVariance: 14,
    disbandedAfter: 1999, // Mirrors the original inline rivalsList filter that dropped Spaceballs at currentYear > 1999..
    description: "Stylistic Amiga vector animation display that shocked the scene by emphasising direction and techno beats over raw assembler maths."
  },
  {
    id: "lifeforce",
    name: "Lifeforce",
    group: "Andromeda",
    title: "COPPER CODES",
    platform: PlatformId.AMIGA_500,
    year: 1992, month: 6,
    platformFocus: "amiga",
    baselineScore: 70,
    scoreVariance: 20,
    description: "A late-16-bit entrance by Andromeda showcasing heavy copper-list automation and a creeping chiptune soundtrack."
  },

  // 16-bit / early PC dawn (PC_486 era)
  {
    id: "second_reality",
    name: "Second Reality",
    group: "Future Crew",
    title: "SPHERICAL FLUIDS",
    platform: PlatformId.PC_486,
    year: 1993, month: 8,
    platformFocus: "pc",
    baselineScore: 92,
    scoreVariance: 8,
    description: "Undisputed masterpiece of PC rendering history \u2014 voxel mountains, rotating spheres, and a haunting chiptune soundtrack."
  },
  {
    id: "panic",
    name: "Panic",
    group: "Future Crew",
    title: "FLAT PANIC",
    platform: PlatformId.PC_386,
    year: 1992, month: 8,
    platformFocus: "pc",
    baselineScore: 84,
    scoreVariance: 14,
    description: "High-speed VGA effects that demonstrated what raw PC CPUs could do without custom maths chipsets."
  },

  // 3D Shader era
  {
    id: "werkzeug",
    name: ".fr-08: Werkzeug",
    group: "Farbrausch",
    title: "PROCESSED PIXELS",
    platform: PlatformId.PC_PENTIUM_III,
    year: 2000, month: 12,
    platformFocus: "pc",
    baselineScore: 88,
    scoreVariance: 12,
    description: "Gorgeous 64KB masterpiece with procedural music synthesizers and full procedural texture rendering."
  }
];
