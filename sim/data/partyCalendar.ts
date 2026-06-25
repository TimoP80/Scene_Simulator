/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * PARTY_CALENDAR \u2014 moved verbatim from src/data.ts.
 * Pure static schedule of historic demo parties.
 */

import { PartyEvent, ProductionType } from "@packages/types";

export const PARTY_CALENDAR: PartyEvent[] = [
  {
    id: "breakpoint",
    name: "Breakpoint",
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
    id: "assembly_summer",
    name: "Assembly Summer",
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
    id: "the_party",
    name: "The Party",
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
  }
];
