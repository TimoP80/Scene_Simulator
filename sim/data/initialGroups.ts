/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * INITIAL_GROUPS \u2014 moved verbatim from src/data.ts.
 * Pure data. Pure data only.
 */

import { Group } from "@packages/types";

export const INITIAL_GROUPS: Record<string, Group> = {
  "future_crew": {
    id: "future_crew",
    name: "Future Crew",
    isPlayerGroup: false,
    fanbase: 1200,
    reputation: 950,
    memberIds: ["purple_motion", "skaven", "unreal_coder"],
    releaseIds: [],
    hqLocation: "Finland",
    motto: "Simply the king of PC real-time rendering."
  },
  "razor_1911": {
    id: "razor_1911",
    name: "Razor 1911",
    isPlayerGroup: false,
    fanbase: 1100,
    reputation: 800,
    memberIds: ["dxyre"],
    releaseIds: [],
    hqLocation: "Norway / Sweden",
    motto: "Demolishing boundaries since the 1911 era."
  },
  "fairlight": {
    id: "fairlight",
    name: "Fairlight",
    isPlayerGroup: false,
    fanbase: 1050,
    reputation: 880,
    memberIds: ["trix_art"],
    releaseIds: [],
    hqLocation: "Sweden",
    motto: "A legendary family of coders, crackers, and pixel pioneers."
  },
  "farbrausch": {
    id: "farbrausch",
    name: "Farbrausch",
    isPlayerGroup: false,
    fanbase: 950,
    reputation: 920,
    memberIds: ["chaos_coder"],
    releaseIds: [],
    hqLocation: "Germany",
    motto: "Procedural beauty packed in few kilobytes."
  }
};
