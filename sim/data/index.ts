/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barrel re-export for /sim/data \u2014 historical / seed data only.
 * No React, no LLM. Anything in /sim or /apps reads seed data from here.
 */

export { HISTORICAL_PLATFORMS } from "./platforms";
export { DEMO_EFFECTS } from "./demoEffects";
export { TECHNOLOGY_TREE } from "./technologyTree";
export { INITIAL_NPCS } from "./initialNpcs";
export { INITIAL_GROUPS } from "./initialGroups";
export { PARTY_CALENDAR } from "./partyCalendar";
export { RIVAL_RELEASES } from "./rivalReleases";
export type { RivalRelease } from "./rivalReleases";
