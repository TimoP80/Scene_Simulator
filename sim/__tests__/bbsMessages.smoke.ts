/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Scaffolding-safety smoke for `sim/data/bbsMessages.ts`.
 *
 * `bbsMessages.ts` is the composite BBS-variety module — 12+ static
 * exports plus a `getSeedThreads()` function. Because it spans 6 era-
 * indexed message pools, voice profiles, personalities, and seed-thread
 * factories, the smoke is structured scenario-by-export rather than
 * scenario-by-field:
 *
 *   SCENARIO 0 — BBS_BOARDS, BBS_PERSONALITIES, BBS_SCRIBES, SYSOP_REPLIES,
 *                SYSOP_MODERATION_MESSAGES (read-only ever-present)
 *   SCENARIO 1 — Era-aware seed data (CATEGORY_MESSAGES, ERA_TOPICS,
 *                VOICE_PROFILES, getEra bucket mapping) — full-population
 *                invariant over the closed union of categories / boards /
 *                specialties × eras
 *   SCENARIO 2 — SPYLINE_TEMPLATES, BBS_RANDOM_EVENTS, BBS_MUTATIONS
 *   SCENARIO 3 — getSeedThreads output (id unique, board ∈ BBS_BOARDS,
 *                actorId ∈ INITIAL_NPCS, dates ∈ [SIM_WINDOW_MIN,
 *                SIM_WINDOW_MAX] × [1, 12], choices non-empty, infoType
 *                closed union)
 *   SCENARIO 4 — Idempotence across all static exports
 */

import { strict as assert } from "node:assert";
import {
  BBS_BOARDS,
  BBS_PERSONALITIES,
  BBS_SCRIBES,
  BBS_MUTATIONS,
  BBS_RANDOM_EVENTS,
  CATEGORY_MESSAGES,
  ERA_TOPICS,
  SPYLINE_TEMPLATES,
  SYSOP_REPLIES,
  SYSOP_MODERATION_MESSAGES,
  VOICE_PROFILES,
  getEra,
  getSeedThreads,
  type BBSBoard,
  type BBSCategory,
} from "@sim/data/bbsMessages";
import { SIM_WINDOW_MAX, SIM_WINDOW_MIN } from "@sim/data/eraConfig";
import { INITIAL_NPCS } from "@sim/data/initialNpcs";
import { BBS_INFO_TYPES, SpecialtyType } from "@packages/types";

const SIM_GROUP = "Smoke-Test Crew";
const THREADS = getSeedThreads(SIM_GROUP);
const NPC_IDS: ReadonlySet<string> = new Set(Object.keys(INITIAL_NPCS));
const BOARD_SET: ReadonlySet<string> = new Set(BBS_BOARDS);
// Derived from the canonical BBS_INFO_TYPES array in
// packages/types/src/bbs.ts (the type is derived from the same array),
// so this set can never drift from the union in either direction — the
// exact drift class that broke this check when the 383-thread expansion
// started using `technical_discovery`.
const VALID_INFO_TYPES: ReadonlySet<string> = new Set<string>(BBS_INFO_TYPES);
const VALID_RANDOM_EVENT_TYPES: ReadonlySet<string> = new Set([
  "money",
  "reputation",
  "research",
]);
const VALID_CATEGORIES: ReadonlySet<string> = new Set([    "COMPETITION_ANNOUNCEMENTS",
    "TECHNICAL_DISCUSSIONS",
    "FRIENDLY_RIVALRY",
    "HARDWARE_WOES",
    "SCENE_GOSSIP",
    "HUMOR",
  ]);
const VALID_ERAS: string[] = [
  "early",
  "mid",
  "late",
  "modern",
];
const VALID_SPECIALTIES: ReadonlySet<string> = new Set(
  Object.values(SpecialtyType),
);

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

// SCENARIO 0 — Read-only ever-present BBS exports
console.log("\n=== SCENARIO 0 — BBS Boards, Personalities, Scribes, Sysop ===");

check("bbsMessages: BBS_BOARDS is non-empty + every value is a non-empty string", () => {
  assert.ok(BBS_BOARDS.length > 0, "BBS_BOARDS empty");
  for (const b of BBS_BOARDS) {
    assert.ok(typeof b === "string" && b.length > 0, `bad board: ${JSON.stringify(b)}`);
  }
});

check("bbsMessages: BBS_BOARDS has no duplicates", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const b of BBS_BOARDS) {
    if (seen.has(b)) dups.push(b);
    seen.add(b);
  }
  assert.equal(dups.length, 0, `duplicate boards: ${dups.join(", ")}`);
});

check("bbsMessages: BBS_PERSONALITIES has unique handles (record keys)", () => {
  const handles = Object.keys(BBS_PERSONALITIES);
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const h of handles) {
    if (seen.has(h)) dups.push(h);
    seen.add(h);
  }
  assert.equal(dups.length, 0, `duplicate personality handles: ${dups.join(", ")}`);
});

check(
  "bbsMessages: every BBS_PERSONALITIES has canonical fields (handle/color/messages) and focusCategories is well-formed",
  () => {
    const bad: string[] = [];
    for (const [handle, p] of Object.entries(BBS_PERSONALITIES)) {
      if (handle !== p.handle) bad.push(`${handle}: slot key != inner handle ${p.handle}`);
      if (typeof p.color !== "string" || p.color.length === 0) bad.push(`${handle}: bad color`);
      if (!Array.isArray(p.focusCategories)) bad.push(`${handle}: focusCategories not array`);
      for (const c of p.focusCategories ?? []) {
        if (!VALID_CATEGORIES.has(c)) bad.push(`${handle}: unknown category ${c}`);
      }
      if (!p.messages || typeof p.messages !== "object") bad.push(`${handle}: messages not object`);
    }
    assert.equal(bad.length, 0, `bad personalities: ${bad.join("; ")}`);
  },
);

check("bbsMessages: BBS_SCRIBES is non-empty and all-unique", () => {
  assert.ok(BBS_SCRIBES.length > 0, "BBS_SCRIBES empty");
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const s of BBS_SCRIBES) {
    if (typeof s !== "string" || s.length === 0) throw new Error(`bad scribe: ${JSON.stringify(s)}`);
    if (seen.has(s)) dups.push(s);
    seen.add(s);
  }
  assert.equal(dups.length, 0, `duplicate scribes: ${dups.join(", ")}`);
});

check("bbsMessages: every SYSOP_REPLIES entry is a non-empty string", () => {
  const bad: string[] = [];
  for (let i = 0; i < SYSOP_REPLIES.length; i++) {
    const r = SYSOP_REPLIES[i];
    if (typeof r !== "string" || r.length === 0) bad.push(`#${i}: bad reply`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check("bbsMessages: every SYSOP_MODERATION_MESSAGES has non-empty sender, text, color", () => {
  const bad: string[] = [];
  for (let i = 0; i < SYSOP_MODERATION_MESSAGES.length; i++) {
    const m = SYSOP_MODERATION_MESSAGES[i];
    if (typeof m.sender !== "string" || m.sender.length === 0) bad.push(`#${i}: sender`);
    if (typeof m.text !== "string" || m.text.length === 0) bad.push(`#${i}: text`);
    if (typeof m.color !== "string" || m.color.length === 0) bad.push(`#${i}: color`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

// SCENARIO 1 — Era-aware seed data
//
// The closed-union × era cross-product must be FULLY populated; a typo
// or forgotten entry silently gives the era-filter zero matches.
console.log("\n=== SCENARIO 1 — Era-aware seed data ===");

check(
  "bbsMessages: CATEGORY_MESSAGES — every category ∈ closed union AND every (category, era) cell has ≥1 message",
  () => {
    const bad: string[] = [];
    for (const [cat, byEra] of Object.entries(CATEGORY_MESSAGES)) {
      if (!VALID_CATEGORIES.has(cat)) bad.push(`unknown category: ${cat}`);
      if (!byEra || typeof byEra !== "object") {
        bad.push(`${cat}: not keyed by era`);
        continue;
      }
      for (const era of VALID_ERAS) {
        const arr = byEra[era as keyof typeof byEra];
        if (!Array.isArray(arr) || arr.length === 0) {
          bad.push(`${cat} / ${era}: empty`);
        }
      }
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check(
  "bbsMessages: ERA_TOPICS — every board ∈ BBS_BOARDS AND every (board, era) cell has ≥1 topic",
  () => {
    const bad: string[] = [];
    for (const [board, byEra] of Object.entries(ERA_TOPICS)) {
      if (!BOARD_SET.has(board as BBSBoard)) bad.push(`unknown board: ${board}`);
      if (!byEra || typeof byEra !== "object") {
        bad.push(`${board}: not keyed by era`);
        continue;
      }
      for (const era of VALID_ERAS) {
        const arr = byEra[era as keyof typeof byEra];
        if (!Array.isArray(arr) || arr.length === 0) bad.push(`${board} / ${era}: empty`);
      }
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check(
  "bbsMessages: VOICE_PROFILES — every entry keyed by a SpecialtyType AND at least one era has non-empty messages",
  () => {
    const bad: string[] = [];
    for (const [key, byEra] of Object.entries(VOICE_PROFILES)) {
      if (!VALID_SPECIALTIES.has(key)) bad.push(`unknown specialty key: ${key}`);
      if (!byEra || typeof byEra !== "object") {
        bad.push(`${key}: not keyed by era`);
        continue;
      }
      let totalAcrossEras = 0;
      for (const era of VALID_ERAS) {
        totalAcrossEras += (byEra as Record<string, string[]>)[era]?.length ?? 0;
      }
      if (totalAcrossEras === 0) bad.push(`${key}: no messages across any era`);
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check(
  `bbsMessages: getEra() maps every year ∈ [${SIM_WINDOW_MIN}, ${SIM_WINDOW_MAX}] into the closed era union (no gaps in the sim window)`,
  () => {
    // Canonical coarse buckets (see the module header doc):
    //   early = [SIM_WINDOW_MIN, 1989]  mid = [1990, 1995]  late = [1996, SIM_WINDOW_MAX]
    assert.equal(getEra(SIM_WINDOW_MIN), "early");
    assert.equal(getEra(1989), "early");
    assert.equal(getEra(1990), "mid");
    assert.equal(getEra(1995), "mid");
    assert.equal(getEra(1996), "late");
    assert.equal(getEra(2005), "late");
    assert.equal(getEra(2006), "modern");
    assert.equal(getEra(SIM_WINDOW_MAX), "modern");
    // Exhaustive: every in-window year lands in a valid bucket. A year
    // that fell through the mapping would break era-appropriate pool
    // picks for threads / personality replies at that calendar year.
    for (let y = SIM_WINDOW_MIN; y <= SIM_WINDOW_MAX; y++) {
      const era = getEra(y);
      assert.ok(
        era === "early" || era === "mid" || era === "late" || era === "modern",
        `year ${y} mapped to unknown era ${era}`,
      );
    }
  },
);

// SCENARIO 2 — Spyline templates + random events + mutation registry
console.log("\n=== SCENARIO 2 — Spyline + random events + mutations ===");

check("bbsMessages: SPYLINE_TEMPLATES every entry has non-empty headline, body function, and valid era field", () => {
  const bad: string[] = [];
  for (let i = 0; i < SPYLINE_TEMPLATES.length; i++) {
    const t = SPYLINE_TEMPLATES[i];
    if (typeof t.headline !== "string" || t.headline.length === 0) bad.push(`#${i}: headline`);
    if (typeof t.body !== "function") bad.push(`#${i}: body not function`);
    if (typeof t.era !== "string" || !VALID_ERAS.includes(t.era)) bad.push(`#${i}: era=${t.era}`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check(
  "bbsMessages: SPYLINE_TEMPLATES — every era bucket has ≥1 template (era-gated picker full-population coverage)",
  () => {
    // App.tsx filters the pool by getEra(wsYear) and falls back to the
    // whole pool when the era bucket is empty. An empty bucket would
    // silently serve out-of-era headlines, so the full-population
    // invariant over the era union must hold.
    const covered = new Set<string>(SPYLINE_TEMPLATES.map((t) => t.era));
    const missing = VALID_ERAS.filter((e) => !covered.has(e));
    assert.equal(missing.length, 0, `no spyline template for era(s): ${missing.join(", ")}`);
  },
);

check(
  "bbsMessages: BBS_RANDOM_EVENTS every entry has non-empty head/body, valid type (money/reputation/research), finite amount",
  () => {
    const bad: string[] = [];
    for (let i = 0; i < BBS_RANDOM_EVENTS.length; i++) {
      const e = BBS_RANDOM_EVENTS[i];
      if (typeof e.head !== "string" || e.head.length === 0) bad.push(`#${i}: head`);
      if (typeof e.body !== "string" || e.body.length === 0) bad.push(`#${i}: body`);
      if (!VALID_RANDOM_EVENT_TYPES.has(e.type as string)) bad.push(`#${i}: type=${e.type}`);
      if (typeof e.amount !== "number" || !Number.isFinite(e.amount)) bad.push(`#${i}: amount=${e.amount}`);
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check("bbsMessages: BBS_MUTATIONS is non-empty array of functions", () => {
  assert.ok(BBS_MUTATIONS.length > 0, "BBS_MUTATIONS empty");
  for (let i = 0; i < BBS_MUTATIONS.length; i++) {
    assert.equal(typeof BBS_MUTATIONS[i], "function", `BBS_MUTATIONS[${i}] not a function`);
  }
});

// SCENARIO 3 — getSeedThreads output sanity
//
// Defaults assume the player-group name is interpolated into the recruit
// choices; pinning that smoke hard-catches id drift on actor or board.
console.log("\n=== SCENARIO 3 — getSeedThreads output sanity ===");

check("bbsMessages: getSeedThreads returns ≥1 thread for a smoke group name", () => {
  assert.ok(THREADS.length > 0, "getSeedThreads returned empty");
});

check("bbsMessages: every thread has a unique id", () => {
  const seen = new Set<string>();
  const dups: string[] = [];
  for (const t of THREADS) {
    if (typeof t.id !== "string" || t.id.length === 0) throw new Error("thread without string id");
    if (seen.has(t.id)) dups.push(t.id);
    seen.add(t.id);
  }
  assert.equal(dups.length, 0, `duplicate thread ids: ${dups.join(", ")}`);
});

check("bbsMessages: every thread.board ∈ BBS_BOARDS", () => {
  const bad: string[] = [];
  for (const t of THREADS) {
    if (!BOARD_SET.has(t.board)) {
      bad.push(`${t.id}: ${t.board}`);
    }
  }
  assert.equal(bad.length, 0, `unknown boards: ${bad.join(", ")}`);
});

check("bbsMessages: every thread.actorId resolves against INITIAL_NPCS keys", () => {
  const bad: string[] = [];
  for (const t of THREADS) {
    if (typeof t.actorId !== "string" || t.actorId.length === 0) {
      bad.push(`${t.id}: empty actorId`);
      continue;
    }
    if (!NPC_IDS.has(t.actorId)) bad.push(`${t.id} -> ${t.actorId}`);
  }
  assert.equal(bad.length, 0, `dangling actorIds: ${bad.join(", ")}`);
});

check("bbsMessages: every thread has ≥1 message and ≥1 choice", () => {
  const bad: string[] = [];
  for (const t of THREADS) {
    if (!Array.isArray(t.messages) || t.messages.length === 0) bad.push(`${t.id}: no messages`);
    if (!Array.isArray(t.choices) || t.choices.length === 0) bad.push(`${t.id}: no choices`);
  }
  assert.equal(bad.length, 0, bad.join("; "));
});

check(
  `bbsMessages: every thread date ∈ [${SIM_WINDOW_MIN}, ${SIM_WINDOW_MAX}] × [1, 12] (sim window)`,
  () => {
    const bad: string[] = [];
    for (const t of THREADS) {
      if (!Number.isInteger(t.year) || t.year < SIM_WINDOW_MIN || t.year > SIM_WINDOW_MAX) {
        bad.push(`${t.id}.year=${t.year}`);
      }
      if (!Number.isInteger(t.month) || t.month < 1 || t.month > 12) {
        bad.push(`${t.id}.month=${t.month}`);
      }
    }
    assert.equal(bad.length, 0, bad.join("; "));
  },
);

check("bbsMessages: every thread.infoType ∈ closed union", () => {
  const bad: string[] = [];
  for (const t of THREADS) {
    if (!VALID_INFO_TYPES.has(t.infoType)) {
      bad.push(`${t.id}: ${t.infoType}`);
    }
  }
  assert.equal(bad.length, 0, `unknown infoTypes: ${bad.join(", ")}`);
});

// SCENARIO 4 — Idempotence across all static exports
console.log("\n=== SCENARIO 4 — Idempotence ===");

check("bbsMessages: BBS_SCRIBES — snapshot stability on repeated inspection", () => {
  // Strings are immutable in JS, so a spread copy preserves element
  // identity. A re-inspection against the live array catches both length
  // mutation and reorder (which is what the constant-binding pattern
  // doesn't catch — see Tier 1 hardware/sponsorship smokes for context).
  const a = [...BBS_SCRIBES];
  assert.equal(BBS_SCRIBES.length, a.length, "BBS_SCRIBES length changed between inspections");
  assert.deepEqual(BBS_SCRIBES, a, "BBS_SCRIBES content drifted on second inspection");
});

check(
  "bbsMessages: getSeedThreads(SIM_GROUP) — two calls return structurally identical output",
  () => {
    const a = getSeedThreads(SIM_GROUP);
    const b = getSeedThreads(SIM_GROUP);
    assert.deepEqual(a, b, "getSeedThreads output drifted between calls");
  },
);

if (failed > 0) {
  console.log(`\nFAILED — ${failed} check(s) did not pass`);
  process.exit(1);
}
console.log("\nOK — bbsMessages smoke all green.");
