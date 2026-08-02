/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Partygoer types — the living demoparty social simulation.
 *
 * A partygoer is a procedurally generated scener attending a PartyEvent.
 * They carry a personality, role, country, age, group affiliation, and a
 * current project. The DialogueEngine (sim/domain/partygoers.ts) turns a
 * DialogueContext into context-aware dialogue lines, and the
 * RelationshipManager tracks friendship / respect / rivalry with the player
 * across repeated conversations.
 *
 * Pure data structures. NO React, NO LLM, NO side effects.
 */

/** Canonical role list — derived union so consumers can build runtime sets. */
export const PARTYGOER_ROLES = [
  "coder",
  "musician",
  "graphician",
  "organizer",
  "visitor",
  "newcomer",
] as const;
export type PartygoerRole = (typeof PARTYGOER_ROLES)[number];

/** Canonical personality list — drives dialogue voice + selection bias. */
export const PARTYGOER_PERSONALITIES = [
  "friendly",
  "shy",
  "competitive",
  "talkative",
  "technical",
  "sarcastic",
  "veteran",
] as const;
export type PartygoerPersonality = (typeof PARTYGOER_PERSONALITIES)[number];

/** Canonical favourite-platform list — drives topic + project flavour. */
export const PARTYGOER_PLATFORMS = [
  "PC",
  "Amiga",
  "C64",
  "Atari ST",
  "Fantasy Console",
] as const;
export type PartygoerPlatform = (typeof PARTYGOER_PLATFORMS)[number];

/** Canonical venue locations — dialogue changes by location. */
export const PARTY_LOCATIONS = [
  "seating",
  "compo_hall",
  "cafeteria",
  "hallway",
  "sleeping",
  "retro",
  "entrance",
  "outdoor",
  "infodesk",
] as const;
export type PartyLocationId = (typeof PARTY_LOCATIONS)[number];

/** Party timeline phase — before compos, during compos, after results. */
export const PARTY_PHASES = ["pre_compo", "compo_running", "post_results"] as const;
export type PartyPhase = (typeof PARTY_PHASES)[number];

/** World-event types partygoers react to (temporarily swap dialogue). */
export const PARTYGOER_EVENT_TYPES = [
  "compo_started",
  "award_ceremony",
  "new_demo_released",
  "power_outage",
  "network_issue",
  "announcement",
  "concert",
  "fire_alarm",
  "late_night",
] as const;
export type PartygoerEventType = (typeof PARTYGOER_EVENT_TYPES)[number];

/**
 * Player-reputation tier — drives how partygoers address the player.
 *
 * NOTE: named PARTYGOER_REP_TIERS (not REPUTATION_TIERS) because
 * packages/types/src/competition.ts already exports REPUTATION_TIERS /
 * ReputationTier with a DIFFERENT shape (tier defs with minReputation /
 * name / unlocks). Re-exporting both under the same name would make the
 * barrel ambiguous and silently break competition.ts + StatsDashboard.
 */
export const PARTYGOER_REP_TIERS = ["unknown", "recognized", "well_known", "legend"] as const;
export type PartygoerRepTier = (typeof PARTYGOER_REP_TIERS)[number];

/** A procedurally generated attendee of a demoparty. */
export interface Partygoer {
  /** Stable id — derived from party id + seed index. */
  id: string;
  /** Scene nickname (handle). */
  handle: string;
  /** Optional real name. */
  realName?: string;
  country: string;
  age: number;
  /** Group affiliation — null when attending solo / freelancing. */
  groupName: string | null;
  role: PartygoerRole;
  /** 0-100 scene experience. High values unlock scene-knowledge answers. */
  experience: number;
  personality: PartygoerPersonality;
  favoritePlatform: PartygoerPlatform;
  /** What they are currently working on at the party. */
  currentProject: string;
  /** 0-100 sleep reserve — low values surface sleep-deprivation dialogue. */
  sleep: number;
  /** Which venue location they are standing in right now. */
  location: PartyLocationId;
  /** Deterministic avatar seed (unused directly — kept for renderers). */
  avatarSeed: number;
}

/** Persistent per-partygoer relationship with the player. */
export interface PartygoerRelationship {
  /** 0-100 friendship. */
  friendship: number;
  /** 0-100 respect for the player's scene standing. */
  respect: number;
  /** 0-100 rivalry / dislike. */
  rivalry: number;
  /** How many times the player has talked to them. */
  meetings: number;
  /** Topics already covered in the current conversation (anti-repeat). */
  coveredTopics: string[];
}

/** A world event the partygoers are currently reacting to. */
export interface PartygoerEvent {
  id: string;
  type: PartygoerEventType;
  label: string;
  /** Sim tick the event fired on. */
  startTick: number;
  /** How long the event keeps biasing dialogue (ticks). */
  durationTicks: number;
}

/** Everything the dialogue engine needs to pick a line. */
export interface DialogueContext {
  partygoer: Partygoer;
  relationship: PartygoerRelationship;
  /** Player scene reputation (0-1000 — matches Character.reputation scale). */
  playerReputation: number;
  playerHandle: string;
  playerGroupName: string;
  /** Venue the partygoer is at. */
  location: PartyLocationId;
  phase: PartyPhase;
  /** Sim hour 0-23 (partygoers sleep less at night). */
  hour: number;
  /** Party day index (1-based). */
  day: number;
  /** Currently active party events (fire alarm, compo started, ...). */
  events: PartygoerEvent[];
  /** Rival group names mentioned in compo chatter. */
  rivalGroupNames: string[];
  /** The party's name. */
  partyName: string;
  /** The party's year. */
  year: number;
}

/** A single generated line of dialogue. */
export interface DialogueLine {
  partygoerId: string;
  text: string;
  /** Category / topic this line belongs to (for UI tags). */
  topic: string;
  /** Player-rep tier the line was generated against (for the UI badge). */
  tier: PartygoerRepTier;
}

/** Ambient chatter entry — partygoers talking without the player. */
export interface AmbientChatter {
  partygoerId: string;
  handle: string;
  text: string;
  location: PartyLocationId;
  /** Sim tick the line was emitted on. */
  tick: number;
}

/** One authored dialogue template in the data pools. */
export interface DialogueTemplate {
  topic: string;
  /** Template text — may contain {handle}, {group}, {project}, {platform}, {party}, {year} placeholders. */
  text: string;
  /** Optional personality restriction. */
  personality?: PartygoerPersonality;
  /** Optional role restriction. */
  role?: PartygoerRole;
  /** Optional minimum sleep threshold this line requires (0-100). */
  minSleep?: number;
  /** Optional maximum sleep (lines about exhaustion surface only when tired). */
  maxSleep?: number;
  /** Optional player-reputation floor (0-1000). */
  minPlayerReputation?: number;
  /** Optional friendship floor — repeated interactions unlock new lines. */
  minFriendship?: number;
  /** Optional minimum meetings — repeated interactions unlock new lines. */
  minMeetings?: number;
}

/** An authored scene-knowledge fact veterans can explain. */
export interface SceneKnowledgeEntry {
  /** Slug used by "ask about X" prompts, e.g. "amiga_history". */
  id: string;
  label: string;
  /** Full explanation a veteran gives when asked. */
  fact: string;
}
