/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Party Attendance Mode domain — the full-weekend demoparty life engine.
 *
 * Pure, side-effect-free logic (no React, no DOM, no LLM). Mirrors the
 * /sim/domain convention: anything here is safe to call from the reducer,
 * projections, /apps/ui, and /tools.
 *
 * EXPORTS:
 *   - createAttendanceState   — bootstrap a weekend (Fri 16:00 → Sun 21:00)
 *   - advanceTime             — advance the clock N hours (needs decay,
 *                               schedule firing, random events, compo resolve)
 *   - moveTo                  — change venue (arrival log)
 *   - performActivity         — do an activity at the current venue
 *   - startProduction         — begin a production for a competition
 *   - submitProduction        — submit (late = rejected)
 *   - computeWeekendSummary   — the end-of-weekend trip report
 *   - venueDefFor / dayLabel  — UI helpers
 *
 * DETERMINISM: all randomness is seeded from (partyName, partyYear,
 * totalHours) via the shared mulberry32/hashString PRNG — the same weekend
 * plays out identically every time, which the smoke test pins.
 */

import { hashString, mulberry32 } from "./partygoers";
import type {
  AttendanceActivity,
  AttendanceClock,
  AttendanceState,
  AttendanceVenueId,
  CompetitionCategory,
  PlayerNeeds,
  RandomPartyEventDef,
  ScheduleEvent,
  WeekendProduction,
  WeekendSummary,
} from "@packages/types";
import {
  ATTENDANCE_ACTIVITIES,
  ATTENDANCE_VENUE_DEFS,
  COMPETITION_CATEGORIES,
  PARTY_WEEKEND_SCHEDULE,
  RANDOM_PARTY_EVENTS,
} from "@sim/data/partyAttendance";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Party opens Friday 16:00. */
export const START_DAY = 1;
export const START_HOUR = 16;

const clamp = (v: number, min = 0, max = 100): number => Math.max(min, Math.min(max, v));

/** Convert a (day, hour) moment to absolute hours since party start. */
export function hoursFromStart(day: number, hour: number): number {
  return (day - START_DAY) * 24 + (hour - START_HOUR);
}

/** Absolute sim hour of the current clock. */
export function clockToHours(clock: AttendanceClock): number {
  return hoursFromStart(clock.day, clock.hour);
}

/** Day label: 1 = Friday, 2 = Saturday, 3 = Sunday. */
export function dayLabel(day: number): string {
  return ["Friday", "Saturday", "Sunday"][day - 1] ?? `Day ${day}`;
}

/** Compact "Fri 18:00" style label. */
export function shortDayLabel(day: number): string {
  return ["Fri", "Sat", "Sun"][day - 1] ?? `D${day}`;
}

/** Venue definition lookup for the UI. */
export function venueDefFor(venue: AttendanceVenueId) {
  return ATTENDANCE_VENUE_DEFS[venue];
}

/** Competition lookup by id. */
export function competitionForId(id: string): CompetitionCategory | undefined {
  return COMPETITION_CATEGORIES.find((c) => c.id === id);
}

/** Activity lookup by id. */
export function activityForId(id: string): AttendanceActivity | undefined {
  return ATTENDANCE_ACTIVITIES.find((a) => a.id === id);
}

// ---------------------------------------------------------------------------
// State bootstrap
// ---------------------------------------------------------------------------

export function createAttendanceState(partyName: string, partyYear: number): AttendanceState {
  const base: AttendanceState = {
    partyName,
    partyYear,
    clock: { day: START_DAY, hour: START_HOUR, totalHours: 0 },
    needs: {
      sleep: 85,
      hunger: 80,
      thirst: 80,
      hygiene: 85,
      energy: 80,
      motivation: 75,
      stress: 15,
    },
    venue: "entrance",
    production: null,
    submissions: {},
    results: {},
    resolvedCompetitions: [],
    firedEvents: [],
    randomEvents: [],
    log: [
      {
        hour: 0,
        text: `You arrive at ${partyName} (${partyYear}). The halls hum with possibility.`,
      },
    ],
    coffees: 0,
    hoursSlept: 0,
    hoursCoded: 0,
    chats: 0,
    completedProductions: 0,
    friendships: 0,
    endDay: 3,
    endHour: 21,
    finished: false,
  };
  // Fire schedule events due at the opening hour (registration, setup).
  return fireDueEvents(base, base.clock).state;
}

// ---------------------------------------------------------------------------
// Passive needs decay (per sim hour)
// ---------------------------------------------------------------------------

function decayNeeds(needs: PlayerNeeds): PlayerNeeds {
  const next: PlayerNeeds = {
    sleep: clamp(needs.sleep - 1.2),
    hunger: clamp(needs.hunger - 1.1),
    thirst: clamp(needs.thirst - 1.5),
    hygiene: clamp(needs.hygiene - 0.4),
    energy: clamp(needs.energy - 0.8),
    motivation: clamp(needs.motivation - 0.3),
    stress: clamp(needs.stress + 0.45),
  };
  // Tired players get more stressed and lose motivation faster.
  if (next.sleep < 25) {
    next.stress = clamp(next.stress + 0.6);
    next.motivation = clamp(next.motivation - 0.4);
  }
  return next;
}

// ---------------------------------------------------------------------------
// Random events (deterministic per absolute hour)
// ---------------------------------------------------------------------------

function weightedEventPick(rng: () => number): RandomPartyEventDef {
  const total = RANDOM_PARTY_EVENTS.reduce((s, e) => s + e.weight, 0);
  let roll = rng() * total;
  for (const ev of RANDOM_PARTY_EVENTS) {
    roll -= ev.weight;
    if (roll <= 0) return ev;
  }
  return RANDOM_PARTY_EVENTS[RANDOM_PARTY_EVENTS.length - 1];
}

function applyNeedsDelta(needs: PlayerNeeds, delta?: Partial<PlayerNeeds>): PlayerNeeds {
  if (!delta) return needs;
  const next = { ...needs };
  (Object.keys(delta) as (keyof PlayerNeeds)[]).forEach((k) => {
    next[k] = clamp(next[k] + (delta[k] ?? 0));
  });
  return next;
}

// ---------------------------------------------------------------------------
// Competition resolution
// ---------------------------------------------------------------------------

/**
 * Deterministic rival field for a competition. Scores are seeded per
 * party/year/competition, so placements are stable across replays.
 */
function rivalScores(comp: CompetitionCategory, partyName: string, partyYear: number): number[] {
  const rng = mulberry32(hashString(`${partyName}#${partyYear}#${comp.id}#rivals`));
  const count = 6 + Math.floor(rng() * 6); // 6-11 rivals
  const scores: number[] = [];
  for (let i = 0; i < count; i++) scores.push(Math.round(30 + rng() * 65));
  return scores;
}

/** Resolve a competition whose compo time has arrived. */
function resolveCompetition(
  state: AttendanceState,
  comp: CompetitionCategory,
  log: { hour: number; text: string }[],
): { state: AttendanceState; log: { hour: number; text: string }[] } {
  const hour = state.clock.totalHours;
  const submitted = state.submissions[comp.id] !== undefined;
  const next = { ...state, resolvedCompetitions: [...state.resolvedCompetitions, comp.id] };

  if (!submitted) {
    return {
      state: next,
      log: [...log, { hour, text: `📺 The ${comp.label} compo ran — you didn't enter.` }],
    };
  }

  const playerScore = state.submissions[comp.id];
  const rivals = rivalScores(comp, state.partyName, state.partyYear);
  const better = rivals.filter((r) => r > playerScore).length;
  const placement = better + 1;

  if (placement === 1) {
    return {
      state: { ...next, results: { ...next.results, [comp.id]: placement } },
      log: [...log, { hour, text: `🏆 ${comp.label}: YOU WON FIRST PLACE!` }],
    };
  }
  return {
    state: { ...next, results: { ...next.results, [comp.id]: placement } },
    log: [
      ...log,
      {
        hour,
        text: `🏅 ${comp.label} results: you placed #${placement} of ${rivals.length + 1}.`,
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Clock advancement
// ---------------------------------------------------------------------------

/** Advance the clock by one sim hour and return the new clock. */
function tickClock(clock: AttendanceClock): AttendanceClock {
  let { day, hour, totalHours } = clock;
  hour += 1;
  totalHours += 1;
  if (hour >= 24) {
    hour = 0;
    day += 1;
  }
  return { day, hour, totalHours };
}

export interface AdvanceResult {
  state: AttendanceState;
  /** Schedule events that fired during the advance. */
  firedSchedule: ScheduleEvent[];
  /** Random events that fired during the advance. */
  firedRandom: RandomPartyEventDef[];
}

/**
 * Fire any schedule events whose (day, hour) matches `clock`, appending to
 * the state's log + firedEvents and returning the newly fired events.
 * Shared by createAttendanceState (opening hour) and advanceTime (each tick).
 */
function fireDueEvents(
  state: AttendanceState,
  clock: AttendanceClock,
): { state: AttendanceState; fired: ScheduleEvent[] } {
  let log = state.log;
  let firedEvents = state.firedEvents;
  const fired: ScheduleEvent[] = [];
  const hour = clock.totalHours;
  for (const ev of PARTY_WEEKEND_SCHEDULE) {
    if (ev.day === clock.day && ev.hour === clock.hour && !firedEvents.includes(ev.id)) {
      firedEvents = [...firedEvents, ev.id];
      fired.push(ev);
      log = [...log, { hour, text: `📣 ${ev.title} — ${ev.description}` }];
    }
  }
  return { state: { ...state, log, firedEvents }, fired };
}

/**
 * Advance the sim clock `hours` hours. Applies passive needs decay each
 * hour, fires schedule events at their (day, hour), rolls deterministic
 * random events, resolves competitions when their compo time arrives, and
 * marks the weekend finished once the closing hour passes.
 */
export function advanceTime(state: AttendanceState, hours: number): AdvanceResult {
  let s = { ...state };
  const firedSchedule: ScheduleEvent[] = [];
  const firedRandom: RandomPartyEventDef[] = [];

  for (let i = 0; i < hours && !s.finished; i++) {
    const clock = tickClock(s.clock);
    const hour = clock.totalHours;

    // Passive needs decay.
    const needs = decayNeeds(s.needs);

    // Schedule events at this moment.
    const due = fireDueEvents(s, clock);
    s = due.state;
    firedSchedule.push(...due.fired);
    let log = s.log;
    const firedEvents = s.firedEvents;
    const randomEvents = [...s.randomEvents];

    // Deterministic random event roll (~12% per hour).
    const rng = mulberry32(hashString(`${s.partyName}#${s.partyYear}#${hour}#rand`));
    if (rng() < 0.12) {
      const ev = weightedEventPick(rng);
      randomEvents.push({ id: ev.id, hour });
      firedRandom.push(ev);
      const needsAfter = applyNeedsDelta(needs, ev.needs);
      s = { ...s, needs: needsAfter };
      log.push({ hour, text: `⚡ ${ev.label} — ${ev.description}` });
    } else {
      s = { ...s, needs };
    }

    // Resolve competitions whose compo time has arrived.
    let resolved = s.resolvedCompetitions;
    let results = s.results;
    for (const comp of COMPETITION_CATEGORIES) {
      if (comp.compoDay === clock.day && comp.compoHour === clock.hour && !resolved.includes(comp.id)) {
        const r = resolveCompetition({ ...s, resolvedCompetitions: resolved, results }, comp, log);
        resolved = r.state.resolvedCompetitions;
        results = r.state.results;
        log = r.log;
      }
    }

    // Finished once the closing hour passes.
    const finished =
      clock.day > s.endDay || (clock.day === s.endDay && clock.hour >= s.endHour);
    if (finished) {
      log.push({ hour, text: "🌅 The party is over. Time to pack up and head home." });
    }

    s = { ...s, clock, log, firedEvents, randomEvents, resolvedCompetitions: resolved, results, finished };
  }

  // Trim the log so a long weekend doesn't grow unboundedly.
  if (s.log.length > 120) s = { ...s, log: s.log.slice(-120) };
  return { state: s, firedSchedule, firedRandom };
}

// ---------------------------------------------------------------------------
// Movement
// ---------------------------------------------------------------------------

export function moveTo(state: AttendanceState, venue: AttendanceVenueId): AttendanceState {
  if (state.venue === venue) return state;
  const def = ATTENDANCE_VENUE_DEFS[venue];
  return {
    ...state,
    venue,
    log: [
      ...state.log,
      { hour: state.clock.totalHours, text: `🚶 You head to the ${def.label}. ${def.ambient}` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Production lifecycle
// ---------------------------------------------------------------------------

export function startProduction(
  state: AttendanceState,
  competitionId: string,
  name: string,
): AttendanceState {
  const comp = competitionForId(competitionId);
  const prod: WeekendProduction = {
    id: `prod-${competitionId}-${state.clock.totalHours}`,
    competitionId,
    name: name.trim() || "Untitled Release",
    progress: 0,
    packaged: false,
    quality: 25,
    hoursSpent: 0,
  };
  const log = [...state.log];
  if (state.production && state.production.progress < 100) {
    log.push({
      hour: state.clock.totalHours,
      text: `🗑️ You shelve "${state.production.name}" unfinished and start something new.`,
    });
  }
  log.push({
    hour: state.clock.totalHours,
    text: `🛠️ You begin "${prod.name}" for the ${comp?.label ?? competitionId} compo.`,
  });
  return { ...state, production: prod, log };
}

/**
 * Submit the current production. Rejected when: no production, not
 * packaged, or the deadline has passed.
 */
export function submitProduction(state: AttendanceState): AttendanceState {
  const hour = state.clock.totalHours;
  const log = [...state.log];
  if (!state.production) {
    return { ...state, log: [...log, { hour, text: "You have nothing to submit." }] };
  }
  if (!state.production.packaged) {
    return { ...state, log: [...log, { hour, text: `"${state.production.name}" isn't packaged yet.` }] };
  }
  const comp = competitionForId(state.production.competitionId);
  if (!comp) {
    return { ...state, log: [...log, { hour, text: "Unknown competition." }] };
  }
  const now = clockToHours(state.clock);
  const deadline = hoursFromStart(comp.deadlineDay, comp.deadlineHour);
  if (now > deadline) {
    return {
      ...state,
      log: [
        ...log,
        { hour, text: `⛔ TOO LATE — the ${comp.label} deadline (${shortDayLabel(comp.deadlineDay)} ${String(comp.deadlineHour).padStart(2, "0")}:00) passed. Submission rejected.` },
      ],
    };
  }
  return {
    ...state,
    submissions: { ...state.submissions, [comp.id]: state.production.quality },
    log: [
      ...log,
      { hour, text: `📤 Submitted "${state.production.name}" to ${comp.label} (quality ${state.production.quality}).` },
    ],
  };
}

// ---------------------------------------------------------------------------
// Activities
// ---------------------------------------------------------------------------

/** Productivity multiplier from current needs (0.2x – 1.2x). */
function productivityFactor(needs: PlayerNeeds): number {
  const energy = needs.energy / 100;
  const motivation = needs.motivation / 100;
  const sleep = needs.sleep / 100;
  return clamp(0.25 + energy * 0.4 + motivation * 0.35 + sleep * 0.25, 0.2, 1.2);
}

/**
 * Perform an activity at the current venue. Applies need deltas + any
 * production progress/quality, then advances the clock by the activity's
 * hours (schedule/random events fire during that window).
 */
export function performActivity(state: AttendanceState, activityId: string): AdvanceResult {
  const activity = activityForId(activityId);
  if (!activity) return { state, firedSchedule: [], firedRandom: [] };
  // Venue gate.
  if (activity.venues && !activity.venues.includes(state.venue)) {
    return {
      state: {
        ...state,
        log: [...state.log, { hour: state.clock.totalHours, text: `You can't "${activity.label}" here.` }],
      },
      firedSchedule: [],
      firedRandom: [],
    };
  }

  let log = [...state.log];
  let needs = state.needs;
  let production = state.production;
  let { coffees, hoursSlept, hoursCoded, chats, completedProductions, friendships } = state;
  let logged = false;

  // Apply activity need deltas.
  if (activity.needs) needs = applyNeedsDelta(needs, activity.needs);

  // Production work — scaled by current needs.
  if (activity.id === "package") {
    // Explicit packaging step: the release is only submittable once it is
    // both 100% built AND packaged (see submitProduction).
    if (!production) {
      log.push({ hour: state.clock.totalHours, text: "You have no production started yet." });
    } else if (production.packaged) {
      log.push({ hour: state.clock.totalHours, text: `"${production.name}" is already packaged.` });
    } else if (production.progress < 100) {
      log.push({
        hour: state.clock.totalHours,
        text: `"${production.name}" is only ${production.progress}% built — finish it before packaging.`,
      });
    } else {
      production = { ...production, packaged: true };
      completedProductions += 1;
      log.push({ hour: state.clock.totalHours, text: `📦 "${production.name}" is packaged and ready to submit!` });
    }
    logged = true; // every package sub-case writes a log line
  } else if ((activity.productionProgress || activity.quality) && production) {
    const gain =
      (activity.productionProgress ?? 0) > 0
        ? Math.max(1, Math.round((activity.productionProgress ?? 0) * productivityFactor(needs)))
        : 0;
    const progress = clamp(production.progress + gain);
    const justFinished = progress >= 100 && production.progress < 100;
    production = {
      ...production,
      progress,
      hoursSpent: production.hoursSpent + activity.hours,
      quality: clamp(production.quality + (activity.quality ?? 0)),
    };
    if (justFinished) {
      log.push({
        hour: state.clock.totalHours,
        text: `✅ "${production.name}" is 100% built! Package it at your seat to submit.`,
      });
    } else if (gain > 0 || (activity.quality ?? 0) > 0) {
      log.push({
        hour: state.clock.totalHours,
        text: `⌨️ ${activity.label}: "${production.name}" at ${progress}% (quality ${production.quality}).`,
      });
    }
    logged = true; // production work always writes a progress line
  } else if ((activity.productionProgress || activity.quality) && !production) {
    log.push({ hour: state.clock.totalHours, text: "You have no production started yet." });
    logged = true;
  }

  // Everything else (eat, coffee, sleep, socialize, explore, ...) gets a
  // short ambient log line so the trip log reads like a real weekend — no
  // matter whether a production is in progress. `logged` guarantees we never
  // double-write when a production/package branch already logged.
  if (!logged) {
    const needBits: string[] = [];
    if (activity.needs) {
      if ((activity.needs.energy ?? 0) > 0) needBits.push(`energy +${activity.needs.energy}`);
      if ((activity.needs.motivation ?? 0) > 0) needBits.push(`motivation +${activity.needs.motivation}`);
      if ((activity.needs.stress ?? 0) < 0) needBits.push(`stress -${-activity.needs.stress}`);
    }
    log.push({
      hour: state.clock.totalHours,
      text: `🕐 ${activity.label}.${needBits.length > 0 ? ` (${needBits.join(", ")})` : ""}`,
    });
  }

  // Stat buckets.
  if (activity.stat === "sleep") hoursSlept += activity.hours;
  if (activity.stat === "code") hoursCoded += activity.hours;
  if (activity.stat === "coffee") coffees += 1;
  if (activity.stat === "chat") {
    chats += 1;
    // Socializing at decent motivation earns friendships.
    if (needs.motivation >= 45 && rngFor(state, "friendship")() < 0.4) friendships += 1;
  }

  const advanced: AttendanceState = {
    ...state,
    needs,
    production,
    coffees,
    hoursSlept,
    hoursCoded,
    chats,
    completedProductions,
    friendships,
    log,
  };

  const result = advanceTime(advanced, activity.hours);
  return result;
}

/** Seeded rng for outcome rolls (kept deterministic per party+hour). */
function rngFor(state: AttendanceState, salt: string): () => number {
  return mulberry32(hashString(`${state.partyName}#${state.partyYear}#${state.clock.totalHours}#${salt}`));
}

// ---------------------------------------------------------------------------
// Weekend summary (trip report)
// ---------------------------------------------------------------------------

export function computeWeekendSummary(state: AttendanceState): WeekendSummary {
  const entered = Object.keys(state.submissions);
  const placements = Object.values(state.results);
  const awards = placements.filter((p) => p <= 3).length;
  const best = placements.length > 0 ? Math.min(...placements) : null;
  const reputationGained =
    awards * 60 + entered.length * 25 + state.friendships * 8 + state.completedProductions * 20;

  const lines: string[] = [];
  lines.push(`— ${state.partyName} ${state.partyYear} TRIP REPORT —`);
  lines.push(`You spent ${state.clock.totalHours} hours at the party (Fri 16:00 → Sun 21:00).`);

  if (state.completedProductions > 0) {
    lines.push(
      `You finished ${state.completedProductions} production${state.completedProductions > 1 ? "s" : ""} — the deadline gods smiled.`,
    );
  } else {
    lines.push("You left with nothing finished. The demo will live another weekend.");
  }

  if (entered.length > 0) {
    const compList = entered
      .map((id) => {
        const comp = competitionForId(id);
        const place = state.results[id];
        return place ? `${comp?.label}: #${place}` : `${comp?.label}: entered`;
      })
      .join(" · ");
    lines.push(`Competitions entered (${entered.length}): ${compList}.`);
  } else {
    lines.push("You never made it to the submission desk.");
  }

  if (best !== null) {
    lines.push(
      awards > 0
        ? `Podium finishes: ${awards} award${awards > 1 ? "s" : ""}, best placement #${best}.`
        : `Best placement: #${best}. So close.`,
    );
  }

  lines.push(`You slept ${state.hoursSlept} hours and coded ${state.hoursCoded}.`);
  lines.push(`You drank ${state.coffees} coffees, made ${state.friendships} friends, and had ${state.chats} chats.`);
  lines.push(`You weathered ${state.randomEvents.length} unexpected moments.`);
  lines.push(`Scene standing: +${reputationGained} reputation.`);
  lines.push("You leave the venue tired, inspired, and already planning next year.");

  return {
    partyName: state.partyName,
    partyYear: state.partyYear,
    totalHours: state.clock.totalHours,
    lines,
    stats: {
      productionsCompleted: state.completedProductions,
      competitionsEntered: entered.length,
      awardsWon: awards,
      bestPlacement: best,
      friendships: state.friendships,
      reputationGained,
      hoursCoded: state.hoursCoded,
      hoursSlept: state.hoursSlept,
      coffees: state.coffees,
      chats: state.chats,
      randomEvents: state.randomEvents.length,
    },
  };
}
