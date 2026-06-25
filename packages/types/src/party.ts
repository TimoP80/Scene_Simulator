/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Party types — demoparty contest events.
 */

import { ProductionType } from "./demo";

export interface PartyEvent {
  id: string;
  name: string;
  month: number; // 1 - 12
  isAnnual: boolean;
  platformFocus: "all" | "amiga" | "c64" | "pc";
  attendance: number;
  prestige: number; // 0 - 100
  competitions: {
    type: ProductionType;
    prizePool: number;
    entrants: string[]; // list of prod IDs
  }[];
  headlineNews: string;
  location: string;
}
