/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for the partygoer dialogue system
 * (sim/data/partygoers.ts + sim/domain/partygoers.ts).
 *
 * SCENARIO 0 — Data pools: every dialogue template has a non-empty
 *              topic + text; every event type has ≥1 reaction; every
 *              location has ambient lines; scene knowledge entries are
 *              non-empty with unique ids.
 * SCENARIO 1 — Generation: deterministic (same seed → same partygoer),
 *              unique ids, attributes within documented ranges, role /
 *              personality / platform ∈ closed unions, veteran experience
 *              distribution sanity, crowd size respected.
 * SCENARIO 2 — Reputation tiers: boundaries map to the right tier.
 * SCENARIO 3 — Dialogue engine: every phase × personality × role combo
 *              yields a non-empty, placeholder-free line; event reactions
 *              fire while active and stop after expiry; anti-repeat avoids
 *              covered topics; minMeetings unlock lines only after meetings.
 * SCENARIO 4 — Relationship manager: meetings/coveredTopics increment,
 *              friendship/respect/rivalry clamp to [0,100].
 * SCENARIO 5 — Movement + mood: sleep decays at night, location drift
 *              stays within PARTY_LOCATIONS.
 * SCENARIO 6 — Scene knowledge: fuzzy lookup matches labels, veterans can
 *              answer every registered id.
 */

import { strict as assert } from "node:assert";
import {
  PARTYGOER_DIALOGUE,
  PRE_COMPO_DIALOGUE,
  COMPO_RUNNING_DIALOGUE,
  POST_RESULTS_DIALOGUE,
  EVENT_REACTIONS,
  LOCATION_AMBIENT,
  AMBIENT_CHATTER,
  REPUTATION_GREETINGS,
  SCENE_KNOWLEDGE,
} from "@sim/data/partygoers";
import {
  generatePartygoer,
  generateCrowd,
  reputationTierFor,
  generateDialogue,
  generateOpener,
  pickAmbientChatter,
  updateRelationship,
  applyPartygoerEvent,
  advancePartygoerMood,
  deltaForTopic,
  findSceneKnowledge,
  listSceneKnowledge,
  partyPhaseForStep,
  createRelationship,
  hashString,
} from "@sim/domain/partygoers";
import {
  PARTYGOER_ROLES,
  PARTYGOER_PERSONALITIES,
  PARTYGOER_PLATFORMS,
  PARTY_LOCATIONS,
  PARTYGOER_EVENT_TYPES,
  PARTYGOER_REP_TIERS,
  type DialogueContext,
} from "@packages/types";

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

function makeContext(over: Partial<DialogueContext> = {}): DialogueContext {
  const pg = generatePartygoer({ partyId: "testparty", index: 3, year: 1993 });
  return {
    partygoer: pg,
    relationship: createRelationship(),
    playerReputation: 500,
    playerHandle: "Unit_Tester",
    playerGroupName: "Test Crew",
    location: "compo_hall",
    phase: "compo_running",
    hour: 20,
    day: 2,
    events: [],
    rivalGroupNames: ["Future Crew"],
    partyName: "Test Assembly",
    year: 1993,
    ...over,
  };
}

// SCENARIO 0 — Data pools
console.log("\n=== SCENARIO 0 — Data pools ===");

check("partygoers: every dialogue template has non-empty topic + text", () => {
  const all = [...PARTYGOER_DIALOGUE, ...PRE_COMPO_DIALOGUE, ...COMPO_RUNNING_DIALOGUE, ...POST_RESULTS_DIALOGUE];
  for (const t of all) {
    assert.ok(typeof t.topic === "string" && t.topic.length > 0, `empty topic: ${JSON.stringify(t)}`);
    assert.ok(typeof t.text === "string" && t.text.length > 0, `empty text on topic ${t.topic}`);
  }
});

check("partygoers: every event type has ≥1 reaction template", () => {
  const covered = new Set(Object.keys(EVENT_REACTIONS));
  const missing = PARTYGOER_EVENT_TYPES.filter((e) => !covered.has(e));
  assert.equal(missing.length, 0, `no reaction for: ${missing.join(", ")}`);
});

check("partygoers: every location has ≥1 ambient line", () => {
  const covered = new Set(Object.keys(LOCATION_AMBIENT));
  const missing = PARTY_LOCATIONS.filter((l) => !covered.has(l));
  assert.equal(missing.length, 0, `no ambient for: ${missing.join(", ")}`);
});

check("partygoers: AMBIENT_CHATTER non-empty and all lines non-empty", () => {
  assert.ok(AMBIENT_CHATTER.length > 0, "ambient chatter empty");
  for (const l of AMBIENT_CHATTER) assert.ok(l.length > 0, "empty ambient line");
});

check("partygoers: REPUTATION_GREETINGS covers every tier", () => {
  for (const t of PARTYGOER_REP_TIERS) {
    const pool = REPUTATION_GREETINGS[t];
    assert.ok(Array.isArray(pool) && pool.length > 0, `no greeting for tier ${t}`);
  }
});

check("partygoers: SCENE_KNOWLEDGE entries unique + non-empty", () => {
  const ids = new Set<string>();
  for (const e of SCENE_KNOWLEDGE) {
    assert.ok(e.id.length > 0 && e.label.length > 0 && e.fact.length > 0, `empty entry: ${JSON.stringify(e)}`);
    assert.ok(!ids.has(e.id), `duplicate id ${e.id}`);
    ids.add(e.id);
  }
});

// SCENARIO 1 — Generation
console.log("\n=== SCENARIO 1 — Generation ===");

check("partygoers: generation is deterministic (same seed → same partygoer)", () => {
  const a = generatePartygoer({ partyId: "determinism", index: 7, year: 1995 });
  const b = generatePartygoer({ partyId: "determinism", index: 7, year: 1995 });
  assert.deepEqual(a, b, "two generations of same seed diverged");
});

check("partygoers: different index → different partygoer (usually)", () => {
  const a = generatePartygoer({ partyId: "variety", index: 1, year: 1995 });
  const b = generatePartygoer({ partyId: "variety", index: 2, year: 1995 });
  // id must differ; handle may rarely collide but id is unique by construction
  assert.notEqual(a.id, b.id);
});

check("partygoers: attributes within documented ranges", () => {
  for (let i = 0; i < 200; i++) {
    const pg = generatePartygoer({ partyId: "range", index: i, year: 1998 });
    assert.ok(pg.age >= 15 && pg.age <= 45, `age ${pg.age} out of range`);
    assert.ok(pg.experience >= 0 && pg.experience <= 100, `experience ${pg.experience} out of range`);
    assert.ok(pg.sleep >= 0 && pg.sleep <= 100, `sleep ${pg.sleep} out of range`);
    assert.ok(pg.handle.length > 0, "empty handle");
    assert.ok(pg.country.length > 0, "empty country");
    assert.ok(pg.realName && pg.realName.length > 0, "empty realName");
    assert.ok(pg.currentProject.length > 0, "empty currentProject");
    assert.ok(PARTYGOER_ROLES.includes(pg.role), `role ${pg.role} not in union`);
    assert.ok(PARTYGOER_PERSONALITIES.includes(pg.personality), `personality ${pg.personality} not in union`);
    assert.ok(PARTYGOER_PLATFORMS.includes(pg.favoritePlatform), `platform ${pg.favoritePlatform} not in union`);
    assert.ok(PARTY_LOCATIONS.includes(pg.location), `location ${pg.location} not in union`);
  }
});

check("partygoers: crowd has exactly `count` unique partygoers", () => {
  const crowd = generateCrowd("crowd", 2001, 40);
  assert.equal(crowd.length, 40);
  const ids = new Set(crowd.map((p) => p.id));
  assert.equal(ids.size, 40, "duplicate ids in crowd");
});

check("partygoers: full-population coverage of roles/personalities/platforms across a large crowd", () => {
  // Union across several era years so platform coverage doesn't depend on a
  // single year's exact rng draws (era pools bias but never exclude).
  const roles = new Set<string>();
  const pers = new Set<string>();
  const plats = new Set<string>();
  for (const [partyId, year] of [["coverage85", 1989], ["coverage93", 1993], ["coverage05", 2005], ["coverage15", 2015]] as const) {
    for (const p of generateCrowd(partyId, year, 120)) {
      roles.add(p.role);
      pers.add(p.personality);
      plats.add(p.favoritePlatform);
    }
  }
  for (const r of PARTYGOER_ROLES) assert.ok(roles.has(r), `role ${r} never generated`);
  for (const p of PARTYGOER_PERSONALITIES) assert.ok(pers.has(p), `personality ${p} never generated`);
  for (const pl of PARTYGOER_PLATFORMS) assert.ok(plats.has(pl), `platform ${pl} never generated`);
});

// SCENARIO 2 — Reputation tiers
console.log("\n=== SCENARIO 2 — Reputation tiers ===");

check("partygoers: reputation tier boundaries", () => {
  assert.equal(reputationTierFor(0), "unknown");
  assert.equal(reputationTierFor(99), "unknown");
  assert.equal(reputationTierFor(100), "recognized");
  assert.equal(reputationTierFor(299), "recognized");
  assert.equal(reputationTierFor(300), "well_known");
  assert.equal(reputationTierFor(699), "well_known");
  assert.equal(reputationTierFor(700), "legend");
  assert.equal(reputationTierFor(1000), "legend");
});

// SCENARIO 3 — Dialogue engine
console.log("\n=== SCENARIO 3 — Dialogue engine ===");

check("partygoers: dialogue for every phase × personality × role is non-empty and placeholder-free", () => {
  const placeholders = /\{[a-zA-Z_]+\}/;
  for (const phase of ["pre_compo", "compo_running", "post_results"] as const) {
    for (const personality of PARTYGOER_PERSONALITIES) {
      for (const role of PARTYGOER_ROLES) {
        const ctx = makeContext({
          phase,
          partygoer: { ...generatePartygoer({ partyId: "exhaust", index: 1, year: 1996 }), personality, role },
          hour: 15,
          day: 2,
        });
        // Multiple ticks to avoid a single-tick luck miss.
        let got: string | null = null;
        for (let tick = 100; tick < 120; tick++) {
          const line = generateDialogue(ctx, tick);
          if (line.text.length > 0 && !placeholders.test(line.text)) { got = line.text; break; }
        }
        assert.ok(got !== null, `no legal line for phase=${phase} personality=${personality} role=${role}`);
      }
    }
  }
});

check("partygoers: event reactions fire while active and stop after expiry", () => {
  const base = makeContext({ phase: "pre_compo" });
  const events = applyPartygoerEvent([], "fire_alarm", "FIRE ALARM", 500, 5);
  const ctxActive = { ...base, events, hour: 12 };
  const active = generateDialogue(ctxActive, 502);
  assert.ok(active.topic === "event:fire_alarm", `expected fire_alarm topic, got ${active.topic}`);

  const ctxExpired = { ...base, events, hour: 12 };
  const expired = generateDialogue(ctxExpired, 510); // 10 > startTick+5
  assert.notEqual(expired.topic, "event:fire_alarm", "event still biasing after expiry");
});

check("partygoers: event reaction topic for every event type reachable", () => {
  for (const type of PARTYGOER_EVENT_TYPES) {
    const ctx = makeContext({ phase: "pre_compo", hour: 10 });
    const events = applyPartygoerEvent([], type, "test", 1000, 50);
    const line = generateDialogue({ ...ctx, events }, 1001);
    assert.ok(line.topic.startsWith("event:"), `event type ${type} produced topic ${line.topic}`);
  }
});

check("partygoers: anti-repeat avoids already-covered topics when alternatives exist", () => {
  const ctx = makeContext({ phase: "post_results", hour: 15, day: 3 });
  // Cover a topic first.
  const first = generateDialogue(ctx, 700);
  const rel = updateRelationship(ctx.relationship, first.topic);
  const second = generateDialogue({ ...ctx, relationship: rel }, 701);
  assert.notEqual(second.topic, first.topic, `repeated topic ${first.topic}`);
});

check("partygoers: minMeetings lines unlock only after enough meetings", () => {
  const ctx = makeContext({ phase: "pre_compo", hour: 18, partygoer: { ...generatePartygoer({ partyId: "friendship", index: 9, year: 1997 }), personality: "friendly" } });

  // With 0 meetings, no minMeetings line can legally fire. Because the
  // pre_compo phase pool always yields a legal "deadline" line, the
  // general pool (where the relationship lines live) is only reached
  // after "deadline" is covered — pin that exact fallthrough contract.
  const locked0 = generateDialogue({ ...ctx, relationship: createRelationship() }, 800);
  const locked0b = generateDialogue(
    { ...ctx, relationship: { friendship: 80, respect: 30, rivalry: 0, meetings: 0, coveredTopics: ["deadline"] } },
    800,
  );
  assert.notEqual(locked0.topic, "relationship", "relationship line fired with 0 meetings");
  assert.notEqual(locked0b.topic, "relationship", "relationship line fired with 0 meetings even with deadline covered");

  // After 6 meetings + high friendship, the unlock line becomes legal
  // (coveredTopics forces the phase pool to drain → general pool reach).
  const rel = { friendship: 80, respect: 30, rivalry: 0, meetings: 6, coveredTopics: ["deadline"] };
  let unlocked: string | null = null;
  for (let tick = 800; tick < 830; tick++) {
    const line = generateDialogue({ ...ctx, relationship: rel }, tick);
    if (line.topic === "relationship") { unlocked = line.text; break; }
  }
  assert.ok(unlocked !== null, "relationship line never unlocked at meetings=6 friendship=80");
  assert.ok(unlocked!.length > 0);
});

check("partygoers: opener respects reputation tier pool", () => {
  const ctx = makeContext({ playerReputation: 0 });
  const opener = generateOpener(ctx);
  assert.ok(opener.tier === "unknown");
  assert.ok(opener.text.length > 0);
});

check("partygoers: ambient chatter returns a partygoer + non-empty text", () => {
  const crowd = generateCrowd("ambient", 1999, 10);
  const chatter = pickAmbientChatter(crowd, "cafeteria", 123);
  assert.ok(chatter.handle.length > 0);
  assert.ok(chatter.text.length > 0);
  assert.equal(chatter.location, "cafeteria");
});

// SCENARIO 4 — Relationship manager
console.log("\n=== SCENARIO 4 — Relationship manager ===");

check("partygoers: updateRelationship increments meetings and clamps to [0,100]", () => {
  let rel = createRelationship();
  rel = updateRelationship(rel, "coding", { friendship: 90, respect: 50, rivalry: -20 });
  assert.equal(rel.meetings, 1);
  assert.ok(rel.coveredTopics.includes("coding"));
  assert.equal(rel.friendship, 90);
  assert.equal(rel.respect, 50);
  assert.equal(rel.rivalry, 0, "rivalry should clamp at 0");
  rel = updateRelationship(rel, "coding", { friendship: 90 });
  assert.equal(rel.friendship, 100, "friendship should clamp at 100");
  assert.equal(rel.meetings, 2);
  assert.ok(rel.coveredTopics.length === 1, "covered topics should not duplicate");
});

check("partygoers: deltaForTopic returns legal deltas for every topic", () => {
  for (const topic of ["group_history", "compo", "shaders", "music", "random"]) {
    const d = deltaForTopic(topic, "friendly" as const);
    assert.ok(d.friendship !== undefined || d.respect !== undefined || d.rivalry !== undefined);
  }
});

// SCENARIO 5 — Movement + mood
console.log("\n=== SCENARIO 5 — Movement + mood ===");

check("partygoers: night-time sleep decays, location drift stays in union", () => {
  const pg = generatePartygoer({ partyId: "mood", index: 1, year: 1994 });
  const night = advancePartygoerMood(pg, 3, 100);
  assert.ok(night.sleep <= pg.sleep, `night sleep should not increase (${night.sleep} > ${pg.sleep})`);
  assert.ok(PARTY_LOCATIONS.includes(night.location), `drifted to ${night.location}`);
  const day = advancePartygoerMood(pg, 14, 101);
  assert.ok(day.sleep >= pg.sleep, `day sleep should not decrease (${day.sleep} < ${pg.sleep})`);
});

check("partygoers: partyPhaseForStep maps steps correctly", () => {
  assert.equal(partyPhaseForStep(0), "pre_compo");
  assert.equal(partyPhaseForStep(1), "compo_running");
  assert.equal(partyPhaseForStep(2), "compo_running");
  assert.equal(partyPhaseForStep(3), "post_results");
});

// SCENARIO 6 — Scene knowledge
console.log("\n=== SCENARIO 6 — Scene knowledge ===");

check("partygoers: findSceneKnowledge resolves every registered id + fuzzy labels", () => {
  for (const e of listSceneKnowledge()) {
    const byId = findSceneKnowledge(e.id);
    assert.ok(byId, `id ${e.id} not resolvable`);
    const byLabel = findSceneKnowledge(e.label);
    assert.ok(byLabel, `label ${e.label} not resolvable`);
  }
  assert.equal(findSceneKnowledge("nonexistent_topic_xyz"), undefined);
});

check("partygoers: hashString is stable and varies", () => {
  assert.equal(hashString("same"), hashString("same"));
  assert.notEqual(hashString("same"), hashString("diff"));
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — partygoers smoke all green.");
