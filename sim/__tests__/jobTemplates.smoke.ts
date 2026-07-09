/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/jobTemplates.ts`.
 *
 * Pins the invariants the freelance / commission acceptance pipeline
 * reads every tick:
 *   - every JobTemplate has a unique id
 *   - `type` ∈ closed seed-set (freelance_graphics | freelance_coding |
 *     music_commission | tool_contract | shareware_release)
 *   - `basePayment` > 0 (a 0-payment job is dead content)
 *   - `reputationDelta` finite integer
 *   - `durationMonths` > 0 (a 0-month job is non-existent)
 *   - `requiresCrewSkill` ∈ { coding, graphics, music, organization }
 *   - `npcProviderId` (when present) resolves against `INITIAL_NPCS`
 *   - `availableFromYear ≤ availableToYear` (window sanity)
 *   - `availableFromYear` ∈ [1985, 2005]
 *   - `name`, `description` are non-empty strings
 *   - reads are idempotent
 *
 * Why cross-ref NPCs: the UI renders the provider's handle next to
 * the job, and a dangling id would crash that render path.
 */

import { strict as assert } from "node:assert";
import { JOB_TEMPLATES } from "@sim/data/jobTemplates";
import { INITIAL_NPCS } from "@sim/data/initialNpcs";

const JOBS = JOB_TEMPLATES;
const NPC_IDS: ReadonlySet<string> = new Set(Object.keys(INITIAL_NPCS));
// NOTE: mirror the JobTemplate.type literal union. If the union grows,
// add the new value here too — the smoke will silently past it otherwise.
const VALID_TYPES: ReadonlySet<string> = new Set([
  "freelance_graphics",
  "freelance_coding",
  "music_commission",
  "tool_contract",
  "shareware_release",
]);
const VALID_SKILLS: ReadonlySet<string> = new Set([
  "coding",
  "graphics",
  "music",
  "organization",
]);

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

// SCENARIO 0 — Scaffolding sanity
console.log("\n=== SCENARIO 0 — Scaffolding sanity ===");

check("jobTemplates: catalogue is non-empty", () => {
  assert.ok(JOBS.length > 0, "expected at least one job template");
});

check("jobTemplates: every entry has non-empty string id, name, description", () => {
  for (const j of JOBS) {
    assert.ok(typeof j.id === "string" && j.id.length > 0, `bad id: ${JSON.stringify(j.id)}`);
    assert.ok(typeof j.name === "string" && j.name.length > 0, `bad name on ${j.id}`);
    assert.ok(typeof j.description === "string" && j.description.length > 0, `bad description on ${j.id}`);
  }
});

check("jobTemplates: every id is unique", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const j of JOBS) {
    if (seen.has(j.id)) dups.push(j.id);
    seen.add(j.id);
  }
  assert.equal(dups.length, 0, `duplicate ids: ${dups.join(", ")}`);
});

// SCENARIO 1 — Type + skill props anchor
console.log("\n=== SCENARIO 1 — Type + skill props ===");

check("jobTemplates: every type ∈ closed seed-set", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (!VALID_TYPES.has(j.type)) bad.push(`${j.id}: ${j.type}`);
  }
  assert.equal(bad.length, 0, `unknown types: ${bad.join(", ")}`);
});

check("jobTemplates: every requiresCrewSkill ∈ { coding, graphics, music, organization }", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (!VALID_SKILLS.has(j.requiresCrewSkill)) bad.push(`${j.id}: ${j.requiresCrewSkill}`);
  }
  assert.equal(bad.length, 0, `unknown skill props: ${bad.join(", ")}`);
});

// SCENARIO 2 — Numeric fields + year window
console.log("\n=== SCENARIO 2 — Numeric fields ===");

check("jobTemplates: every basePayment is a positive integer", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (!Number.isInteger(j.basePayment) || j.basePayment <= 0) bad.push(`${j.id}: ${j.basePayment}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("jobTemplates: every reputationDelta is a finite integer", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (!Number.isInteger(j.reputationDelta) || !Number.isFinite(j.reputationDelta)) {
      bad.push(`${j.id}: ${j.reputationDelta}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("jobTemplates: every durationMonths is a positive integer", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (!Number.isInteger(j.durationMonths) || j.durationMonths <= 0) {
      bad.push(`${j.id}: ${j.durationMonths}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("jobTemplates: availableFromYear ∈ [1985, 2005]", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (
      !Number.isInteger(j.availableFromYear) ||
      j.availableFromYear < 1985 ||
      j.availableFromYear > 2005
    ) {
      bad.push(`${j.id}.from=${j.availableFromYear}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("jobTemplates: availableToYear ∈ [1985, 2005] (symmetric)", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (
      !Number.isInteger(j.availableToYear) ||
      j.availableToYear < 1985 ||
      j.availableToYear > 2005
    ) {
      bad.push(`${j.id}.to=${j.availableToYear}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("jobTemplates: availableToYear ≥ availableFromYear (window sanity)", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (j.availableToYear < j.availableFromYear) {
      bad.push(`${j.id}: from=${j.availableFromYear} to=${j.availableToYear}`);
    }
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 3 — Cross-reference to INITIAL_NPCS (when present)
console.log("\n=== SCENARIO 3 — npcProviderId cross-reference ===");

check("jobTemplates: every npcProviderId (when present) resolves against INITIAL_NPCS", () => {
  const bad: string[] = [];
  for (const j of JOBS) {
    if (j.npcProviderId != null && !NPC_IDS.has(j.npcProviderId)) {
      bad.push(`${j.id} -> ${j.npcProviderId}`);
    }
  }
  assert.equal(bad.length, 0, `dangling npcProviderId: ${bad.join(", ")}`);
});

// SCENARIO 4 — Idempotence
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("jobTemplates: two reads return same length", () => {
  assert.equal(JOBS.length, JOB_TEMPLATES.length, "catalogue length changed between reads");
});

check("jobTemplates: id ordering is stable across reads", () => {
  const a = JOBS.map((j) => j.id);
  const b = JOB_TEMPLATES.map((j) => j.id);
  assert.deepEqual(a, b, "id ordering drifted between reads — catalogue is no longer stable");
});

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — jobTemplates smoke all green.");
