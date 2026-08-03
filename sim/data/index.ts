/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Barrel re-export for /sim/data \u2014 historical / seed data only.
 * No React, no LLM. Anything in /sim or /apps reads seed data from here.
 */

export { HISTORICAL_PLATFORMS, platformsAvailableAtYear } from "./platforms";
export { DEMO_EFFECTS } from "./demoEffects";
export { TECHNOLOGY_TREE } from "./technologyTree";
export {
  collectDeclaredUnlocks,
  getUnlockedEffectIds,
  getUnregisteredEffectIds,
} from "./effectUnlocks";
export { ARTISTIC_DIRECTION_DEFS } from "./artisticDirections";
export type { ArtisticDirectionDef } from "./artisticDirections";
export { EFFECT_SYNERGIES } from "./effectSynergies";
export type { EffectSynergy } from "./effectSynergies";
export {
  JUDGING_PROFILES,
  judgingProfileForParty,
  judgingProfileForProductionType,
} from "./judgingProfiles";
export { INITIAL_NPCS } from "./initialNpcs";
export { INITIAL_GROUPS } from "./initialGroups";
export { PARTY_CALENDAR } from "./partyCalendar";
export { RIVAL_RELEASES } from "./rivalReleases";
export type { RivalRelease } from "./rivalReleases";

// ---- Year milestone unlocks (v0.6.0 Phase 1b) ----
export { YEAR_UNLOCK_MAP, getYearUnlockedTechIds } from "./yearUnlocks";

// ---- Economy seed ----
export { HARDWARE_CATALOG, HARDWARE_CATALOG_INDEX } from "./hardwareCatalog";
export type { HardwareItem } from "@packages/types";
export { JOB_TEMPLATES } from "./jobTemplates";
export type { JobTemplate } from "@packages/types";
export { SOFTWARE_CATALOG } from "./softwareCatalog";
export type { SoftwareOffering } from "@packages/types";
export { SPONSORSHIP_CATALOG } from "./sponsorshipCatalog";
export type { SponsorshipOffering } from "@packages/types";

// ---- Party Attendance Mode ----
export {
  ATTENDANCE_VENUE_DEFS,
  ATTENDANCE_VENUES_LIST,
  PARTY_WEEKEND_SCHEDULE,
  COMPETITION_CATEGORIES,
  RANDOM_PARTY_EVENTS,
  ATTENDANCE_ACTIVITIES,
} from "./partyAttendance";

// ---- Partygoer dialogue system ----
export {
  HANDLE_PREFIXES,
  HANDLE_SUFFIXES,
  COUNTRY_POOL,
  REAL_FIRST_NAMES,
  REAL_LAST_NAMES,
  PROJECTS_BY_ROLE,
  GENERIC_GROUP_NAMES,
  PARTYGOER_DIALOGUE,
  PRE_COMPO_DIALOGUE,
  COMPO_RUNNING_DIALOGUE,
  POST_RESULTS_DIALOGUE,
  EVENT_REACTIONS,
  LOCATION_AMBIENT,
  AMBIENT_CHATTER,
  REPUTATION_GREETINGS,
  SCENE_KNOWLEDGE,
  OPENER_LINES,
} from "./partygoers";
// NOTE: PLATFORM_LABELS intentionally NOT exported from the barrel — no
// consumer uses it yet (the panel renders favoritePlatform raw). Keep it in
// the data file for future UI work; export on first real use.

// ---- BBS message variety ----
export {
  getEffectIdsAvailableAtYear,
} from "./effectUnlocks";

// ---- Era configuration ----
export { ERA_BOUNDARIES, eraForYear } from "./eraConfig";
export type { EraBoundary } from "./eraConfig";

export {
  BBS_BOARDS,
  BBS_SCRIBES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  ERA_TOPICS,
  SPYLINE_TEMPLATES,
  BBS_RANDOM_EVENTS,
  BBS_MUTATIONS,
  VOICE_PROFILES,
  CATEGORY_MESSAGES,
  BBS_PERSONALITIES,
  getSeedThreads,
  getEra,
  generateFollowedReply,
  generatePersonalityMessage,
  generateVirusDebateThread,
  colorForHandle,
} from "./bbsMessages";
export type {
  BBSBoard,
  Era,
  SpylineTemplate,
  BBSRandomEvent,
  BBSCategory,
  BBSPersonality,
} from "./bbsMessages";
