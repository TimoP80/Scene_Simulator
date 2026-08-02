/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Party Attendance Mode types — a full-weekend demoparty life simulation.
 *
 * The player spends Friday → Sunday at a demoparty venue, balancing production
 * work, competitions, socializing, needs (sleep/hunger/thirst/hygiene/energy/
 * motivation/stress), and venue exploration. Time advances continuously via
 * an AttendanceClock; the pure engine lives in sim/domain/partyAttendance.ts
 * and is driven by usePartyAttendanceMode + PartyAttendancePanel in /src.
 *
 * Pure data structures. NO React, NO LLM, NO side effects.
 */

/** Canonical venue list — the explorable party map. */
export const ATTENDANCE_VENUES = [
  "entrance",
  "main_hall",
  "seating",
  "compo_hall",
  "stage",
  "cafeteria",
  "sleeping",
  "showers",
  "retro",
  "merch",
  "outdoor",
  "quiet_workspace",
  "organizer_desk",
  "infopoint",
] as const;
export type AttendanceVenueId = (typeof ATTENDANCE_VENUES)[number];

/** One explorable venue — every location has unique ambiance + activities. */
export interface AttendanceVenue {
  id: AttendanceVenueId;
  label: string;
  description: string;
  /** Ambient-sound / atmosphere flavor shown while the player is here. */
  ambient: string;
  /** Venue-specific ambient chatter lines (NPCs talking around you). */
  ambientChatter: string[];
}

/** Sim clock: day 1 = Friday, 2 = Saturday, 3 = Sunday. */
export interface AttendanceClock {
  day: number;
  /** 0-23. Party opens Friday 16:00, closes Sunday ~21:00. */
  hour: number;
  /** Total sim hours elapsed since arrival. */
  totalHours: number;
}

/** Player needs — 0-100, higher is better (except stress). */
export interface PlayerNeeds {
  sleep: number;
  hunger: number;
  thirst: number;
  hygiene: number;
  energy: number;
  motivation: number;
  /** 0-100, higher is worse. */
  stress: number;
}

/** An action the player can take at a venue (costs time, adjusts needs). */
export interface AttendanceActivity {
  id: string;
  label: string;
  description: string;
  /** Sim hours this activity consumes. */
  hours: number;
  /** Need deltas applied (energy/motivation/stress always matter). */
  needs: Partial<PlayerNeeds>;
  /** Which venues allow this activity (empty = everywhere). */
  venues?: AttendanceVenueId[];
  /** If set, adds this much production progress when performed. */
  productionProgress?: number;
  /** If set, adds this much production quality when performed. */
  quality?: number;
  /** Trip-report stat bucket this activity feeds (code/sleep/coffee/chat). */
  stat?: "sleep" | "code" | "coffee" | "chat";
}

/** One scheduled block of the weekend (opening, compo, concert, ...). */
export interface ScheduleEvent {
  id: string;
  day: number;
  hour: number;
  type:
    | "registration"
    | "opening"
    | "concert"
    | "seminar"
    | "workshop"
    | "compo"
    | "fast_compo"
    | "awards"
    | "closing";
  title: string;
  location: AttendanceVenueId;
  description: string;
}

/** A competition the player can enter. Deadline = submissions close. */
export interface CompetitionCategory {
  id: string;
  label: string;
  description: string;
  /** Submissions close at this clock moment (late = rejected). */
  deadlineDay: number;
  deadlineHour: number;
  /** Compo starts at this clock moment. */
  compoDay: number;
  compoHour: number;
  /** Production types that qualify (free-form labels). */
  productionTypes: string[];
  /** Partygoer event fired when the compo runs. */
  compoEventType: "compo_started" | "award_ceremony";
}

/** A production the player builds over the weekend. */
export interface WeekendProduction {
  id: string;
  competitionId: string;
  name: string;
  /** 0-100 build progress. */
  progress: number;
  /** Packaged (ready to submit) once progress >= 100. */
  packaged: boolean;
  /** Quality roll (0-100) — affects compo result. */
  quality: number;
  /** Hours spent building this production. */
  hoursSpent: number;
}

/** Random party events — dynamic situations with needs/gameplay effects. */
export interface RandomPartyEventDef {
  id: string;
  label: string;
  description: string;
  /** Need deltas applied when the event hits the player. */
  needs?: Partial<PlayerNeeds>;
  /**
   * If set, triggers a partygoer world event of this type.
   *
   * RESERVED for a future partygoer-world bridge: the pure engine logs the
   * event (⚡ line in the weekend log) but does not yet dispatch into the
   * partygoer dialogue sim — the sim/domain layer must stay free of React
   * and the partygoer world lives in usePartygoerSimulation. When wiring
   * this up, surface fired randomEvents (they carry `id` + `hour`) from
   * usePartyAttendanceMode and forward them to the partygoer hook.
   */
  partygoerEvent?: "compo_started" | "award_ceremony" | "new_demo_released" | "power_outage" | "network_issue" | "announcement" | "concert" | "fire_alarm" | "late_night";
  /** Weight for the random roll. */
  weight: number;
}

/** Full weekend simulation state. */
export interface AttendanceState {
  partyName: string;
  partyYear: number;
  clock: AttendanceClock;
  needs: PlayerNeeds;
  /** Where the player currently is. */
  venue: AttendanceVenueId;
  /** Player's production work-in-progress (null = none yet). */
  production: WeekendProduction | null;
  /** Productions submitted to competitions (competitionId → quality). */
  submissions: Record<string, number>;
  /** Compo results: competitionId → placement (1 = win). */
  results: Record<string, number>;
  /** Competition ids whose compo has already run (prevents double-resolve). */
  resolvedCompetitions: string[];
  /** Schedule events that have fired. */
  firedEvents: string[];
  /** Random events that have hit, with the sim hour they fired. */
  randomEvents: { id: string; hour: number }[];
  /** Session log lines (events, milestones, needs warnings). */
  log: { hour: number; text: string }[];
  /** Coffee consumed count (trip-report stat). */
  coffees: number;
  /** Hours slept / coded (trip-report stats). */
  hoursSlept: number;
  hoursCoded: number;
  /** Social actions (chats) count. */
  chats: number;
  /** Productions packaged over the weekend. */
  completedProductions: number;
  /** Friendships made (grows with socializing at good motivation). */
  friendships: number;
  /** Time of day the party ends. */
  endHour: number;
  endDay: number;
  /** Whether the closing ceremony has run. */
  finished: boolean;
}

/** The end-of-weekend trip report. */
export interface WeekendSummary {
  partyName: string;
  partyYear: number;
  totalHours: number;
  lines: string[];
  stats: {
    productionsCompleted: number;
    competitionsEntered: number;
    awardsWon: number;
    bestPlacement: number | null;
    friendships: number;
    reputationGained: number;
    hoursCoded: number;
    hoursSlept: number;
    coffees: number;
    chats: number;
    randomEvents: number;
  };
}
