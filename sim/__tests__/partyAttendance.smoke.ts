/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for Party Attendance Mode
 * (sim/data/partyAttendance.ts + sim/domain/partyAttendance.ts).
 *
 * SCENARIO 0 — Data integrity: every venue has a def with ambient +
 *              chatter; schedule ids unique with valid day/hour/type;
 *              competition ids unique with deadline ≤ compo time;
 *              random events unique with positive weight; activities
 *              unique with valid hours/stats.
 * SCENARIO 1 — Bootstrap: createAttendanceState starts Fri 16:00 with
 *              needs in [0,100] and a non-empty log.
 * SCENARIO 2 — Clock: advanceTime moves the clock hour-by-hour, wraps
 *              days, is fully deterministic, and decays needs.
 * SCENARIO 3 — Schedule: registration fires at the opening hour, events
 *              fire exactly once at their (day, hour).
 * SCENARIO 4 — Competitions: a submitted entry gets a placement when the
 *              compo time arrives, and resolves only once.
 * SCENARIO 5 — Submission: late entries are rejected; packaging gate.
 * SCENARIO 6 — Production lifecycle: start → code → 100% → package →
 *              submit records the entry.
 * SCENARIO 7 — Full weekend: advancing past Sun 21:00 marks finished and
 *              the summary reports sane stats.
 */

import { strict as assert } from "node:assert";
import {
  ATTENDANCE_VENUE_DEFS,
  ATTENDANCE_VENUES_LIST,
  PARTY_WEEKEND_SCHEDULE,
  COMPETITION_CATEGORIES,
  RANDOM_PARTY_EVENTS,
  ATTENDANCE_ACTIVITIES,
} from "@sim/data/partyAttendance";
import {
  createAttendanceState,
  advanceTime,
  moveTo,
  performActivity,
  startProduction,
  submitProduction,
  computeWeekendSummary,
  hoursFromStart,
  clockToHours,
  dayLabel,
  shortDayLabel,
} from "@sim/domain/partyAttendance";
import { ATTENDANCE_VENUES } from "@packages/types";

let failed = 0;

function check(name: string, fn: () => void): void {
  try {
    fn();
    console.log(`PASS  ${name}`);
  } catch (err) {
    failed++;
    console.log(`FAIL  ${name}`);
    console.log(`      ${err instanceof Error ? err.message : String(err)}`);
  }
}

// SCENARIO 0 — Data integrity
console.log("\n=== SCENARIO 0 — Data integrity ===");

check("partyAttendance: every ATTENDANCE_VENUES id has a venue def with ambient + chatter", () => {
  for (const id of ATTENDANCE_VENUES) {
    const def = ATTENDANCE_VENUE_DEFS[id];
    assert.ok(def, `missing venue def for ${id}`);
    assert.ok(def.label.length > 0 && def.description.length > 0, `${id}: empty label/description`);
    assert.ok(def.ambient.length > 0, `${id}: empty ambient`);
    assert.ok(Array.isArray(def.ambientChatter) && def.ambientChatter.length > 0, `${id}: no ambient chatter`);
  }
  assert.equal(ATTENDANCE_VENUES_LIST.length, ATTENDANCE_VENUES.length, "venue list != venue union");
});

check("partyAttendance: schedule events have unique ids and valid day/hour/type/location", () => {
  const ids = new Set<string>();
  const validTypes = new Set(["registration", "opening", "concert", "seminar", "workshop", "compo", "fast_compo", "awards", "closing"]);
  for (const ev of PARTY_WEEKEND_SCHEDULE) {
    assert.ok(!ids.has(ev.id), `duplicate schedule id ${ev.id}`);
    ids.add(ev.id);
    assert.ok(ev.day >= 1 && ev.day <= 3, `${ev.id}: bad day ${ev.day}`);
    assert.ok(ev.hour >= 0 && ev.hour <= 23, `${ev.id}: bad hour ${ev.hour}`);
    assert.ok(validTypes.has(ev.type), `${ev.id}: bad type ${ev.type}`);
    assert.ok(ATTENDANCE_VENUES.includes(ev.location), `${ev.id}: bad location ${ev.location}`);
  }
  // Registration must be the first scheduled moment of the weekend.
  const first = PARTY_WEEKEND_SCHEDULE.reduce((a, b) =>
    hoursFromStart(a.day, a.hour) <= hoursFromStart(b.day, b.hour) ? a : b,
  );
  assert.equal(first.type, "registration", "weekend must open with registration");
});

check("partyAttendance: competitions have unique ids, deadline ≤ compo time, valid compoEventType", () => {
  const ids = new Set<string>();
  const validEvents = new Set(["compo_started", "award_ceremony"]);
  for (const comp of COMPETITION_CATEGORIES) {
    assert.ok(!ids.has(comp.id), `duplicate competition id ${comp.id}`);
    ids.add(comp.id);
    const deadline = hoursFromStart(comp.deadlineDay, comp.deadlineHour);
    const compo = hoursFromStart(comp.compoDay, comp.compoHour);
    assert.ok(deadline <= compo, `${comp.id}: deadline after compo`);
    assert.ok(comp.productionTypes.length > 0, `${comp.id}: no production types`);
    assert.ok(validEvents.has(comp.compoEventType), `${comp.id}: bad compoEventType`);
  }
});

check("partyAttendance: random events unique ids with positive weight", () => {
  const ids = new Set<string>();
  for (const ev of RANDOM_PARTY_EVENTS) {
    assert.ok(!ids.has(ev.id), `duplicate random event id ${ev.id}`);
    ids.add(ev.id);
    assert.ok(ev.weight > 0, `${ev.id}: weight must be positive`);
    assert.ok(ev.label.length > 0 && ev.description.length > 0, `${ev.id}: empty label/description`);
  }
});

check("partyAttendance: activities unique ids with valid hours and stat buckets", () => {
  const ids = new Set<string>();
  const validStats = new Set(["sleep", "code", "coffee", "chat"]);
  for (const act of ATTENDANCE_ACTIVITIES) {
    assert.ok(!ids.has(act.id), `duplicate activity id ${act.id}`);
    ids.add(act.id);
    assert.ok(act.hours > 0, `${act.id}: hours must be positive`);
    if (act.stat) assert.ok(validStats.has(act.stat), `${act.id}: bad stat ${act.stat}`);
  }
  // Every venue should have at least one activity available.
  for (const venue of ATTENDANCE_VENUES) {
    const available = ATTENDANCE_ACTIVITIES.filter((a) => !a.venues || a.venues.includes(venue));
    assert.ok(available.length > 0, `venue ${venue} has no activities`);
  }
});

// SCENARIO 1 — Bootstrap
console.log("\n=== SCENARIO 1 — Bootstrap ===");

check("partyAttendance: createAttendanceState starts Fri 16:00 with sane needs", () => {
  const s = createAttendanceState("Test Assembly", 1995);
  assert.equal(s.clock.day, 1);
  assert.equal(s.clock.hour, 16);
  assert.equal(s.clock.totalHours, 0);
  assert.equal(clockToHours(s.clock), 0);
  assert.equal(s.finished, false);
  assert.equal(s.venue, "entrance");
  for (const k of ["sleep", "hunger", "thirst", "hygiene", "energy", "motivation"] as const) {
    assert.ok(s.needs[k] >= 0 && s.needs[k] <= 100, `${k} out of range: ${s.needs[k]}`);
  }
  assert.ok(s.needs.stress >= 0 && s.needs.stress <= 100, "stress out of range");
  assert.ok(s.log.length > 0, "empty log");
  assert.equal(dayLabel(1), "Friday");
  assert.equal(shortDayLabel(2), "Sat");
});

// SCENARIO 2 — Clock
console.log("\n=== SCENARIO 2 — Clock ===");

check("partyAttendance: advanceTime is deterministic for the same inputs", () => {
  const a = advanceTime(createAttendanceState("Determinism", 1996), 10).state;
  const b = advanceTime(createAttendanceState("Determinism", 1996), 10).state;
  assert.deepEqual(a, b, "two advances diverged");
});

check("partyAttendance: advanceTime moves the clock hour-by-hour and wraps days", () => {
  let s = createAttendanceState("Clock", 1996);
  s = advanceTime(s, 1).state;
  assert.equal(s.clock.hour, 17);
  assert.equal(s.clock.totalHours, 1);
  // 16:00 Fri + 9h = 01:00 Sat.
  s = advanceTime(s, 8).state;
  assert.equal(s.clock.day, 2);
  assert.equal(s.clock.hour, 1);
  assert.equal(s.clock.totalHours, 9);
});

check("partyAttendance: advancing 24h decays sleep and thirst", () => {
  const start = createAttendanceState("Decay", 1996);
  const after = advanceTime(start, 24).state;
  assert.ok(after.needs.sleep < start.needs.sleep, "sleep did not decay");
  assert.ok(after.needs.thirst < start.needs.thirst, "thirst did not decay");
});

// SCENARIO 3 — Schedule
console.log("\n=== SCENARIO 3 — Schedule ===");

check("partyAttendance: registration fires at the opening hour, opening fires at 20:00", () => {
  const s0 = createAttendanceState("Sched", 1996);
  assert.ok(s0.firedEvents.includes("fri_registration"), "registration not fired at start");
  // 16:00 + 4h = 20:00 Fri.
  const s1 = advanceTime(s0, 4).state;
  assert.ok(s1.firedEvents.includes("fri_opening"), "opening ceremony not fired at Fri 20:00");
  // Advancing further must not re-fire.
  const s2 = advanceTime(s1, 2).state;
  const count = s2.firedEvents.filter((id) => id === "fri_opening").length;
  assert.equal(count, 1, "event fired more than once");
});

// SCENARIO 4 — Competitions
console.log("\n=== SCENARIO 4 — Competitions ===");

check("partyAttendance: submitted entry resolves a placement at compo time, exactly once", () => {
  const base = createAttendanceState("Compo", 1995);
  // Graphics compo runs Sat 14:00 = hour 22 from Fri 16:00.
  const prepped = { ...base, submissions: { graphics: 78 } };
  const res = advanceTime(prepped, 22).state;
  assert.ok(res.results.graphics !== undefined, `graphics result missing: ${JSON.stringify(res.results)}`);
  assert.ok(res.results.graphics >= 1 && res.results.graphics <= 12, `placement out of range: ${res.results.graphics}`);
  assert.ok(res.resolvedCompetitions.includes("graphics"), "graphics not marked resolved");
  // Advancing further must not re-resolve.
  const res2 = advanceTime(res, 3).state;
  assert.equal(res2.results.graphics, res.results.graphics, "placement changed on re-resolve");
  const count = res2.resolvedCompetitions.filter((id) => id === "graphics").length;
  assert.equal(count, 1, "competition resolved more than once");
});

check("partyAttendance: an unentered competition logs a miss but still resolves", () => {
  const base = createAttendanceState("Compo", 1995);
  const res = advanceTime(base, 22).state;
  assert.ok(res.resolvedCompetitions.includes("graphics"), "graphics not resolved");
  assert.ok(res.results.graphics === undefined, "unentered compo should have no placement");
});

// SCENARIO 5 — Submission
console.log("\n=== SCENARIO 5 — Submission ===");

check("partyAttendance: late submissions are rejected", () => {
  const base = createAttendanceState("Deadline", 1995);
  // Graphics deadline Sat 13:00 = hour 21. Advance to Sat 15:00 (hour 23).
  const late = advanceTime(base, 23).state;
  const withProd = {
    ...late,
    production: { id: "p1", competitionId: "graphics", name: "Too Late", progress: 100, packaged: true, quality: 50, hoursSpent: 0 },
  };
  const res = submitProduction(withProd);
  assert.ok(res.submissions.graphics === undefined, "late entry was accepted");
  assert.ok(res.log.some((l) => l.text.includes("TOO LATE")), "no rejection log line");
});

check("partyAttendance: submissions require a packaged production", () => {
  const s = createAttendanceState("Pack", 1995);
  const withUnpacked = {
    ...s,
    production: { id: "p2", competitionId: "graphics", name: "Unpacked", progress: 100, packaged: false, quality: 50, hoursSpent: 0 },
  };
  const res = submitProduction(withUnpacked);
  assert.ok(res.submissions.graphics === undefined, "unpacked entry accepted");
  assert.ok(res.log.some((l) => l.text.includes("isn't packaged")), "no packaging warning");
});

// SCENARIO 6 — Production lifecycle
console.log("\n=== SCENARIO 6 — Production lifecycle ===");

check("partyAttendance: start → code → package → submit records the entry", () => {
  let s = createAttendanceState("Lifecycle", 1995);
  s = startProduction(s, "graphics", "Neon Trees");
  assert.ok(s.production, "production not created");
  assert.equal(s.production?.competitionId, "graphics");
  s = moveTo(s, "seating");
  let guard = 0;
  while ((s.production?.progress ?? 0) < 100 && guard < 40) {
    s = performActivity(s, "code").state;
    guard++;
  }
  assert.ok((s.production?.progress ?? 0) >= 100, "production never reached 100%");
  // Before packaging, submission is blocked.
  assert.ok(s.production && !s.production.packaged, "should not auto-package");
  const packaged = performActivity(s, "package").state;
  assert.ok(packaged.production?.packaged, "package activity did not package");
  assert.ok(packaged.completedProductions === 1, "completedProductions not counted");
  const submitted = submitProduction(packaged);
  assert.ok(submitted.submissions.graphics !== undefined, "entry not recorded after submit");
  assert.ok(submitted.log.some((l) => l.text.includes("Submitted")), "no submit log line");
});

check("partyAttendance: code at low energy gains less progress", () => {
  let s = createAttendanceState("Slow", 1995);
  s = startProduction(s, "graphics", "Slow Burn");
  s = moveTo(s, "seating");
  const fresh = performActivity(s, "code").state;
  const exhausted = performActivity({ ...s, needs: { ...s.needs, energy: 5, motivation: 5, sleep: 5 } }, "code").state;
  assert.ok(
    (fresh.production?.progress ?? 0) > (exhausted.production?.progress ?? 0),
    "exhausted coding should gain less progress",
  );
});

// SCENARIO 7 — Full weekend
console.log("\n=== SCENARIO 7 — Full weekend ===");

check("partyAttendance: the weekend finishes after Sun 21:00 with a farewell", () => {
  const start = createAttendanceState("Full", 1995);
  const full = advanceTime(start, 60).state; // 53h is the full window
  assert.ok(full.finished, "party never finished");
  assert.ok(full.log.some((l) => l.text.includes("party is over")), "no farewell line");
  assert.ok(full.firedEvents.includes("sun_farewell"), "closing ceremony never fired");
});

check("partyAttendance: summary stats are coherent", () => {
  let s = createAttendanceState("Trip", 1995);
  s = startProduction(s, "graphics", "Summer Colors");
  s = moveTo(s, "seating");
  let guard = 0;
  while ((s.production?.progress ?? 0) < 100 && guard < 40) {
    s = performActivity(s, "code").state;
    guard++;
  }
  s = performActivity(s, "package").state;
  s = submitProduction(s);
  const summary = computeWeekendSummary(s);
  assert.ok(summary.lines.length >= 8, "summary too short");
  assert.equal(summary.stats.productionsCompleted, 1);
  assert.equal(summary.stats.competitionsEntered, 1);
  assert.ok(summary.stats.reputationGained > 0, "no reputation gained");
  assert.ok(summary.stats.hoursCoded > 0, "no coding hours recorded");
  assert.ok(summary.partyName === "Trip", "wrong party name");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — partyAttendance smoke all green.");
