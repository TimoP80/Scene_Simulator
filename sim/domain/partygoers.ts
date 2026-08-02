/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Partygoer domain — the living demoparty social engine.
 *
 * Pure, side-effect-free logic (no React, no DOM, no LLM). Safe to call
 * from the reducer, projections, /apps/ui, and /tools — mirrors the
 * convention of the other /sim/domain modules.
 *
 * EXPORTS:
 *   - generatePartygoer      — deterministic procedural attendee generation
 *   - generateCrowd          — a whole hall of partygoers for a PartyEvent
 *   - reputationTierFor      — player reputation → tier
 *   - generateDialogue       — the DialogueGenerator (context → line)
 *   - generateOpener         — first-meeting opener line
 *   - pickAmbientChatter     — random ambient line from a location
 *   - updateRelationship     — RelationshipManager (meeting/dialogue effects)
 *   - applyPartygoerEvent    — EventManager (push + expire events)
 *   - advancePartygoerMood   — time progression (sleep decay, mood)
 *   - findSceneKnowledge     — veteran lore lookup
 *   - partyPhaseForStep      — party UI step → PartyPhase
 */

import type {
  Partygoer,
  PartygoerEvent,
  PartygoerEventType,
  PartygoerRelationship,
  PartyPhase,
  PartygoerRole,
  PartygoerPersonality,
  PartygoerPlatform,
  PartyLocationId,
  DialogueContext,
  DialogueLine,
  AmbientChatter,
  PartygoerRepTier,
  SceneKnowledgeEntry,
} from "@packages/types";
import { PARTYGOER_PERSONALITIES, PARTY_LOCATIONS } from "@packages/types";
import {
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
} from "@sim/data/partygoers";

// ---------------------------------------------------------------------------
// Deterministic PRNG — mulberry32. Same seed → same crowd every time.
// ---------------------------------------------------------------------------

/** Hash a string into a 32-bit unsigned int (FNV-1a). */
export function hashString(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG — returns a function producing floats in [0, 1). */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Pick a random element with a provided PRNG. */
export function pickFrom<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)];
}

/** Integer in [min, max] inclusive. */
export function intBetween(rng: () => number, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

// ---------------------------------------------------------------------------
// Procedural generation
// ---------------------------------------------------------------------------

/**
 * Platform weighted by era (favouritePlatform pool). Deterministic when
 * given the partygoer's own seeded rng — the rng MUST be the per-partygoer
 * stream so the favourite platform varies within a single year (seeding
 * purely from the year would hand every attendee the same platform).
 */
export function pickPlatformForYear(rng: () => number, year: number): PartygoerPlatform {
  const pool: PartygoerPlatform[] = [];
  if (year <= 1990) pool.push("C64", "Amiga", "Atari ST", "C64", "Amiga", "PC");
  else if (year <= 1998) pool.push("Amiga", "Amiga", "PC", "PC", "Atari ST", "C64");
  else if (year <= 2008) pool.push("PC", "PC", "PC", "Amiga", "Atari ST", "C64", "Fantasy Console");
  else pool.push("PC", "PC", "Fantasy Console", "Fantasy Console", "Amiga", "Atari ST", "C64");
  return pickFrom(rng, pool);
}

/** Deterministic role weighted so the hall feels like a real party. */
export function pickRole(rng: () => number): PartygoerRole {
  const weights: [PartygoerRole, number][] = [
    ["coder", 28],
    ["musician", 18],
    ["graphician", 16],
    ["organizer", 8],
    ["visitor", 18],
    ["newcomer", 12],
  ];
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let roll = rng() * total;
  for (const [role, w] of weights) {
    roll -= w;
    if (roll <= 0) return role;
  }
  return "visitor";
}

/** Deterministic personality. */
export function pickPersonality(rng: () => number): PartygoerPersonality {
  return pickFrom(rng, PARTYGOER_PERSONALITIES);
}

/** Experience — veterans cluster at high values, newcomers low. */
export function pickExperience(rng: () => number): number {
  // Triangular-ish distribution around the middle; veterans push high.
  return Math.min(100, Math.max(0, Math.round((rng() + rng() + rng()) / 3 * 100)));
}

/** Generate a single deterministic partygoer for a party. */
export function generatePartygoer(opts: {
  partyId: string;
  index: number;
  year: number;
}): Partygoer {
  const { partyId, index, year } = opts;
  const seed = hashString(`${partyId}#${index}#${year}`);
  const rng = mulberry32(seed);
  const role = pickRole(rng);
  const personality = pickPersonality(rng);

  const handle = `${pickFrom(rng, HANDLE_PREFIXES)}${pickFrom(rng, HANDLE_SUFFIXES)}`;
  const realName = `${pickFrom(rng, REAL_FIRST_NAMES)} ${pickFrom(rng, REAL_LAST_NAMES)}`;
  const country = pickFrom(rng, COUNTRY_POOL);
  const age = intBetween(rng, 15, 45);
  const experience = pickExperience(rng);
  const groupName = rng() < 0.55 ? pickFrom(rng, GENERIC_GROUP_NAMES) : null;
  const favoritePlatform = pickPlatformForYear(rng, year);
  const currentProject = pickFrom(rng, PROJECTS_BY_ROLE[role]);
  const sleep = intBetween(rng, 10, 100);
  const location = pickLocationForRole(partyId, role, year, index);
  const avatarSeed = seed % 100000;

  return {
    id: `${partyId}-pg-${index}`,
    handle,
    realName,
    country,
    age,
    groupName,
    role,
    experience,
    personality,
    favoritePlatform,
    currentProject,
    sleep,
    location,
    avatarSeed,
  };
}

/** Initial location — organisers at infodesk, coders near the hall, etc. */
function pickLocationForRole(partyId: string, role: PartygoerRole, year: number, index: number): PartyLocationId {
  // Include partyId so two parties in the same year don't share the exact
  // same initial location layout (moods drift would mask it, but the seed
  // should reflect the venue).
  const rng = mulberry32(hashString(`loc-${partyId}-${year}-${index}`));
  const pool: PartyLocationId[] =
    role === "organizer" ? ["infodesk", "entrance", "compo_hall"] :
    role === "coder" ? ["seating", "compo_hall", "seating"] :
    role === "musician" ? ["compo_hall", "seating", "outdoor"] :
    role === "graphician" ? ["seating", "retro"] :
    role === "newcomer" ? ["entrance", "hallway", "retro", "infodesk"] :
    ["cafeteria", "outdoor", "hallway", "retro", "compo_hall"];
  return pickFrom(rng, pool);
}

/** Generate a full crowd for a party. `count` = how many partygoers. */
export function generateCrowd(partyId: string, year: number, count: number): Partygoer[] {
  const seen = new Set<string>();
  const out: Partygoer[] = [];
  for (let i = 0; i < count; i++) {
    const pg = generatePartygoer({ partyId, index: i, year });
    if (seen.has(pg.id)) continue;
    seen.add(pg.id);
    out.push(pg);
  }
  return out;
}

/** Default relationship state for a brand-new partygoer. */
export function createRelationship(): PartygoerRelationship {
  return {
    friendship: 0,
    respect: 0,
    rivalry: 0,
    meetings: 0,
    coveredTopics: [],
  };
}

// ---------------------------------------------------------------------------
// Reputation tiers
// ---------------------------------------------------------------------------

/** Map a 0-1000 player reputation to a tier. */
export function reputationTierFor(playerReputation: number): PartygoerRepTier {
  if (playerReputation < 100) return "unknown";
  if (playerReputation < 300) return "recognized";
  if (playerReputation < 700) return "well_known";
  return "legend";
}

// ---------------------------------------------------------------------------
// Dialogue generation
// ---------------------------------------------------------------------------

function fillTemplate(text: string, ctx: DialogueContext): string {
  const group = ctx.partygoer.groupName ?? "a solo act";
  return text
    .replace(/\{handle\}/g, ctx.playerHandle)
    .replace(/\{group\}/g, group)
    .replace(/\{project\}/g, ctx.partygoer.currentProject)
    .replace(/\{platform\}/g, ctx.partygoer.favoritePlatform)
    .replace(/\{party\}/g, ctx.partyName)
    .replace(/\{year\}/g, String(ctx.year))
    .replace(/\{playerGroup\}/g, ctx.playerGroupName)
    .replace(/\{rival\}/g, ctx.rivalGroupNames[0] ?? "the usual suspects")
    .replace(/\{hour\}/g, String(ctx.hour));
}

interface WeightedTemplate {
  template: { topic: string; text: string };
  weight: number;
}

/** Filter a template pool down to context-legal lines, then weight by affinity. */
function filterAndWeight(
  pool: { topic: string; text: string; personality?: PartygoerPersonality; role?: PartygoerRole; minSleep?: number; maxSleep?: number; minPlayerReputation?: number; minFriendship?: number; minMeetings?: number }[],
  ctx: DialogueContext,
  rng: () => number,
): WeightedTemplate[] {
  const { partygoer: pg, relationship: rel } = ctx;
  const weighted: WeightedTemplate[] = [];
  for (const t of pool) {
    if (t.personality && t.personality !== pg.personality) continue;
    if (t.role && t.role !== pg.role) continue;
    if (t.minSleep !== undefined && pg.sleep < t.minSleep) continue;
    if (t.maxSleep !== undefined && pg.sleep > t.maxSleep) continue;
    if (t.minPlayerReputation !== undefined && ctx.playerReputation < t.minPlayerReputation) continue;
    if (t.minFriendship !== undefined && rel.friendship < t.minFriendship) continue;
    if (t.minMeetings !== undefined && rel.meetings < t.minMeetings) continue;
    // Anti-repeat: skip topics already covered this conversation.
    if (rel.coveredTopics.includes(t.topic)) continue;
    let weight = 1;
    // Personality affinity — personalities naturally prefer matching voice.
    if (t.personality === pg.personality) weight *= 2;
    weighted.push({ template: { topic: t.topic, text: t.text }, weight });
  }
  return weighted;
}

function weightedPick(rng: () => number, items: WeightedTemplate[]): { topic: string; text: string } {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let roll = rng() * total;
  for (const it of items) {
    roll -= it.weight;
    if (roll <= 0) return it.template;
  }
  return items[items.length - 1].template;
}

/** Active (non-expired) events for a context, newest first. */
export function activeEventsFor(
  events: PartygoerEvent[],
  tick: number,
): PartygoerEvent[] {
  return events
    .filter((e) => tick - e.startTick <= e.durationTicks)
    .sort((a, b) => b.startTick - a.startTick);
}

/**
 * The DialogueGenerator. Returns one context-aware line for a partygoer.
 *
 * Priority:
 *   1. Active world events (fire alarm, compo started, ...) — if a legal
 *      event-reaction template exists, use it.
 *   2. Phase-gated pools (pre_compo / compo_running / post_results).
 *   3. The general PARTYGOER_DIALOGUE pool (personality/role/sleep/
 *      reputation/friendship gated).
 *   4. Fallback: location ambient flavour.
 */
export function generateDialogue(ctx: DialogueContext, tick: number): DialogueLine {
  const rng = mulberry32(
    hashString(`${ctx.partygoer.id}#${ctx.phase}#${ctx.location}#${ctx.hour}#${tick}`),
  );
  const tier = reputationTierFor(ctx.playerReputation);

  // (Anti-repeat note: coveredTopics is filtered per-pool in
  // filterAndWeight — a topic covered in one pool simply falls through
  // to the next pool, so a phase pool that runs dry naturally degrades
  // to the general pool. This is what makes the minMeetings unlock test
  // deterministic: once "deadline" is covered, pre_compo drains and the
  // general pool's relationship lines become reachable.)

  // 1. Event reactions. Events are transient — a partygoer reacts once per
  // event type (coveredTopics stores `event:<type>`), then falls through to
  // the phase/general pools. This keeps the same fire-alarm line from
  // repeating on every talk while still letting a NEW event fire fresh.
  const active = activeEventsFor(ctx.events, tick);
  for (const ev of active) {
    const eventTopic = `event:${ev.type}`;
    if (ctx.relationship.coveredTopics.includes(eventTopic)) continue;
    const pool = EVENT_REACTIONS[ev.type];
    if (pool) {
      const legal = filterAndWeight(pool, ctx, rng);
      if (legal.length > 0) {
        const t = weightedPick(rng, legal);
        return {
          partygoerId: ctx.partygoer.id,
          text: fillTemplate(t.text, ctx),
          topic: eventTopic,
          tier,
        };
      }
    }
  }

  // 2. Phase pools.
  const phasePool =
    ctx.phase === "pre_compo" ? PRE_COMPO_DIALOGUE :
    ctx.phase === "compo_running" ? COMPO_RUNNING_DIALOGUE :
    POST_RESULTS_DIALOGUE;
  const phaseLegal = filterAndWeight(phasePool, ctx, rng);
  if (phaseLegal.length > 0) {
    const t = weightedPick(rng, phaseLegal);
    return {
      partygoerId: ctx.partygoer.id,
      text: fillTemplate(t.text, ctx),
      topic: t.topic,
      tier,
    };
  }

  // 3. General pool.
  const generalLegal = filterAndWeight(PARTYGOER_DIALOGUE, ctx, rng);
  if (generalLegal.length > 0) {
    const t = weightedPick(rng, generalLegal);
    return {
      partygoerId: ctx.partygoer.id,
      text: fillTemplate(t.text, ctx),
      topic: t.topic,
      tier,
    };
  }

  // 4. Location ambient fallback (always legal).
  const ambient = LOCATION_AMBIENT[ctx.location] ?? AMBIENT_CHATTER;
  const t = pickFrom(rng, ambient);
  return {
    partygoerId: ctx.partygoer.id,
    text: fillTemplate(t, ctx),
    topic: "ambient",
    tier,
  };
}

/** First-meeting opener — friendly greeting that remembers the player. */
export function generateOpener(ctx: DialogueContext): DialogueLine {
  const rng = mulberry32(hashString(`${ctx.partygoer.id}#opener`));
  const tier = reputationTierFor(ctx.playerReputation);
  const greetingPool = REPUTATION_GREETINGS[tier] ?? REPUTATION_GREETINGS.unknown;
  // Veterans + friendly personalities sometimes go straight to a genuine line.
  if (ctx.partygoer.experience >= 75 && ctx.partygoer.personality === "veteran") {
    const lore = pickFrom(rng, SCENE_KNOWLEDGE);
    return {
      partygoerId: ctx.partygoer.id,
      text: `${pickFrom(rng, greetingPool)} Ask me about ${lore.label} — that's a story worth hearing.`,
      topic: "opener",
      tier,
    };
  }
  return {
    partygoerId: ctx.partygoer.id,
    text: fillTemplate(pickFrom(rng, OPENER_LINES), ctx),
    topic: "opener",
    tier,
  };
}

// ---------------------------------------------------------------------------
// Ambient chatter — partygoers speak without the player
// ---------------------------------------------------------------------------

/** Random ambient line overheard in the hall. */
export function pickAmbientChatter(
  partygoers: Partygoer[],
  location: PartyLocationId,
  tick: number,
): AmbientChatter {
  const pg = partygoers[Math.floor(Math.random() * partygoers.length)] ?? partygoers[0];
  const rng = mulberry32(hashString(`${pg?.id ?? "nobody"}#ambient#${tick}`));
  const locationLines = LOCATION_AMBIENT[location] ?? [];
  const pool = rng() < 0.6 && locationLines.length > 0 ? locationLines : AMBIENT_CHATTER;
  const text = pickFrom(rng, pool);
  return {
    partygoerId: pg?.id ?? "hall",
    handle: pg?.handle ?? "A scener",
    text,
    location,
    tick,
  };
}

// ---------------------------------------------------------------------------
// Relationship manager — repeated interactions evolve the relationship.
// ---------------------------------------------------------------------------

export interface RelationshipDelta {
  friendship?: number;
  respect?: number;
  rivalry?: number;
}

/** Apply a dialogue exchange to the player's relationship with a partygoer. */
export function updateRelationship(
  rel: PartygoerRelationship,
  topic: string,
  deltas: RelationshipDelta = {},
): PartygoerRelationship {
  const next: PartygoerRelationship = {
    ...rel,
    friendship: clamp(rel.friendship + (deltas.friendship ?? 0), 0, 100),
    respect: clamp(rel.respect + (deltas.respect ?? 0), 0, 100),
    rivalry: clamp(rel.rivalry + (deltas.rivalry ?? 0), 0, 100),
    meetings: rel.meetings + 1,
    coveredTopics: rel.coveredTopics.includes(topic)
      ? rel.coveredTopics
      : [...rel.coveredTopics, topic],
  };
  return next;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

/** Delta recommendation based on the topic the player engaged with. */
export function deltaForTopic(topic: string, personality: PartygoerPersonality): RelationshipDelta {
  switch (topic) {
    case "group_history":
    case "party_memories":
      return { friendship: 4, respect: 2 };
    case "compo":
    case "results":
      return personality === "competitive" ? { respect: 3, rivalry: -2 } : { friendship: 2, respect: 1 };
    case "shaders":
    case "coding":
    case "compression":
      return { respect: 3, friendship: 1 };
    case "music":
    case "pixel_art":
      return { friendship: 3, respect: 1 };
    default:
      return { friendship: 2, respect: 1 };
  }
}

// ---------------------------------------------------------------------------
// Event manager
// ---------------------------------------------------------------------------

/** Push a new event onto the crowd's event list (older ones expire naturally). */
export function applyPartygoerEvent(
  events: PartygoerEvent[],
  type: PartygoerEventType,
  label: string,
  tick: number,
  durationTicks = 12,
): PartygoerEvent[] {
  const event: PartygoerEvent = {
    id: `${type}-${tick}`,
    type,
    label,
    startTick: tick,
    durationTicks,
  };
  return [...events.filter((e) => tick - e.startTick <= e.durationTicks), event];
}

// ---------------------------------------------------------------------------
// Living party — mood/sleep progression each tick
// ---------------------------------------------------------------------------

export interface PartygoerMood {
  sleep: number;
  location: PartyLocationId;
}

/** Tick a partygoer: sleep decays at night, people drift between locations. */
export function advancePartygoerMood(
  pg: Partygoer,
  hour: number,
  tick: number,
): PartygoerMood {
  const rng = mulberry32(hashString(`${pg.id}#mood#${tick}`));
  const night = hour < 7 || hour >= 23;
  const sleep = night
    ? Math.max(0, pg.sleep - 2)
    : Math.min(100, pg.sleep + (rng() < 0.3 ? 1 : 0));

  // Small chance to drift location.
  let location = pg.location;
  if (rng() < 0.18) {
    const candidates = PARTY_LOCATIONS.filter((l) => l !== location);
    location = pickFrom(rng, candidates);
  }
  return { sleep, location };
}

// ---------------------------------------------------------------------------
// Scene knowledge — veteran lore
// ---------------------------------------------------------------------------

/** Find a scene-knowledge entry by id (or fuzzy label match). */
export function findSceneKnowledge(
  query: string,
): SceneKnowledgeEntry | undefined {
  const q = query.toLowerCase().replace(/[^a-z0-9]/g, "");
  return SCENE_KNOWLEDGE.find(
    (e) =>
      e.id.toLowerCase().replace(/[^a-z0-9]/g, "") === q ||
      e.label.toLowerCase().replace(/[^a-z0-9]/g, "") === q,
  );
}

/** All scene-knowledge entries (for the UI "ask a veteran" list). */
export function listSceneKnowledge(): SceneKnowledgeEntry[] {
  return SCENE_KNOWLEDGE;
}

// ---------------------------------------------------------------------------
// Party phase mapping
// ---------------------------------------------------------------------------

/** Map the party UI step (0 signup, 1 battle, 2 scoreboard, 3 awards) → phase. */
export function partyPhaseForStep(step: number): PartyPhase {
  if (step <= 0) return "pre_compo";
  if (step <= 2) return "compo_running";
  return "post_results";
}
