/**
 * Characterization test for `scripts/audit-docs.mjs`.
 *
 * Pins the audit's behavior so silent regex regressions fail loudly here
 * instead of as mysterious doc drift a month later.
 *
 * Scenarios:
 *   1. Known-clean baseline (synthetic data: emit.foo/bar + WorldState).
 *   2. Unknown emit helper → Check 1.
 *   3. M1 double-store pattern → Check 2.
 *   4. Unknown state slice → Check 3.
 *   5. Valid slice but invalid sub-field → Check 3.
 *   6. Comment line inside fence → all checks skip.
 *   7. Prose blockquote warning about M1 → not flagged.
 *   8. Real-files baseline (current passing state of docs/prompts/appendEvent.ts/reducer.ts).
 */

import { strict as assert } from "node:assert";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import * as audit from "../../scripts/audit-docs.mjs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, "..", "..");

// The audit script is plain `.mjs` (no TypeScript types). Pull its methods
// out with a typed local binding so the smoke test stays type-clean.
type Failure = {
  check: 1 | 2 | 3;
  file: string;
  line: number;
  match: string;
  note: string;
};
type AuditResult = {
  failures: Failure[];
  passes: boolean;
  emitKeys: string[];
  statePaths: string[];
};
type Doc = { name: string; content: string };

const auditDocs = (audit.auditDocs as unknown as (opts: {
  docs: Doc[];
  emitSource: string;
  reducerSource: string;
}) => AuditResult);

// --- synthetic fixtures ---------------------------------------------------

const SYNTHETIC_EMIT_SOURCE = `
export const emit = {
  foo: (x: number) =>
    appendEvent({ type: "Foo", ts: 0, x }),
  bar: (s: string) =>
    appendEvent({ type: "Bar", ts: 0, s }),
};
`;

const SYNTHETIC_REDUCER_SOURCE = `
export interface WorldState {
  meta: { scenario: string };
  player: { money: number };
  crew: { characters: { id: string }[] };
}
`;

const syntheticDoc = (name: string, content: string): Doc => ({ name, content });

// --- assert harness -------------------------------------------------------

let failures = 0;
function check(label: string, run: () => void): void {
  try {
    run();
    console.log(`  PASS  ${label}`);
  } catch (err) {
    failures += 1;
    console.error(`  FAIL  ${label}\n        ${(err as Error).message}`);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 1 — known-clean baseline.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 1: known-clean baseline (synthetic)");

check("clean doc → 0 failures, passes=true", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [
      syntheticDoc(
        "clean.md",
        [
          "# Clean doc",
          "",
          "```ts",
          "emit.foo(42);",
          "emit.bar(\"hi\");",
          "state.player.money;",
          "state.crew.characters[0];",
          "// WARNING: do not write loop.dispatch(emit.foo(...)) (comment, skipped)",
          "```",
          "",
          "> ⚠️ Prose mention of `loop.dispatch(emit.foo(...))` is allowed.",
        ].join("\n"),
      ),
    ],
  });
  assert.equal(result.passes, true, "expected passes=true, got: " + JSON.stringify(result.failures));
  assert.equal(result.failures.length, 0);
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 2 — unknown emit helper in a fenced code block → Check 1 fires.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 2: unknown emit helper → Check 1");

check("emit.bogus in fence → 1 failure, check=1, match='emit.bogus('", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [syntheticDoc("bogus.md", ["```ts", "emit.bogus(arg);", "```"].join("\n"))],
  });
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].check, 1);
  assert.equal(result.failures[0].match, "emit.bogus(");
  assert.equal(result.failures[0].file, "bogus.md");
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 3 — M1 double-store pattern → Check 2 fires.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 3: M1 pattern → Check 2");

check("loop.dispatch(emit.foo(...)) → 1 failure, check=2", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [syntheticDoc("m1.md", ["```ts", "loop.dispatch(emit.foo(42));", "```"].join("\n"))],
  });
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].check, 2);
  assert.equal(result.failures[0].match, "loop.dispatch(emit.foo(");
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 4 — unknown state slice → Check 3 fires.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 4: unknown state slice → Check 3");

check("state.bogus.active in fence → 1 failure, check=3", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [syntheticDoc("bad-slice.md", ["```ts", "state.bogus.active;", "```"].join("\n"))],
  });
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].check, 3);
  assert.match(result.failures[0].note, /state\.bogus/);
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 5 — valid slice but invalid sub-field → Check 3 (sub-field).
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 5: valid slice + invalid sub-field → Check 3");

check("state.player.bogusField → 1 failure, check=3, sub-field miss", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [syntheticDoc("bad-field.md", ["```ts", "state.player.bogusField;", "```"].join("\n"))],
  });
  assert.equal(result.failures.length, 1);
  assert.equal(result.failures[0].check, 3);
  assert.match(result.failures[0].note, /state\.player\.bogusField/);
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 6 — comment lines inside fences skip all three checks.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 6: comment lines skip all checks");

check("commented-out M1 + bogus emit → 0 failures", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [
      syntheticDoc(
        "comment.md",
        [
          "```ts",
          "// NEVER write `loop.dispatch(emit.bogus(...))` — that's the M1 bug.",
          "// Also avoid `emit.bogus(...)` syntax entirely.",
          "const ok = emit.foo(42);",
          "```",
        ].join("\n"),
      ),
    ],
  });
  assert.equal(result.failures.length, 0, "comment lines should be skipped; got: " + JSON.stringify(result.failures));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 7 — prose blockquote warning the M1 pattern is NOT a Check 2 failure.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 7: prose blockquote with M1 mention → not flagged");

check("> ⚠️ ... in prose → 0 failures", () => {
  const result = auditDocs({
    emitSource: SYNTHETIC_EMIT_SOURCE,
    reducerSource: SYNTHETIC_REDUCER_SOURCE,
    docs: [
      syntheticDoc(
        "warning.md",
        [
          "# Do not do this",
          "",
          "> ⚠️ Never write `loop.dispatch(emit.foo(...))` — that's M1.",
          "",
          "```ts",
          "// safe pattern (DRAFT form)",
          "loop.dispatch({ type: \"Foo\", ts: 0, x: 42 });",
          "```",
        ].join("\n"),
      ),
    ],
  });
  assert.equal(result.failures.length, 0, "prose warning should pass; got: " + JSON.stringify(result.failures));
});

// ──────────────────────────────────────────────────────────────────────────
// SCENARIO 8 — characterization against the REAL project source + docs.
// Catches silent regex regressions against the actual codebase.
// ──────────────────────────────────────────────────────────────────────────
console.log("\nScenario 8: real-files baseline (characterization)");

check("real source + docs/prompts → 0 failures (current passing baseline)", () => {
  const emitSource = readFileSync(join(REPO_ROOT, "sim/events/appendEvent.ts"), "utf8");
  const reducerSource = readFileSync(join(REPO_ROOT, "sim/engine/reducer.ts"), "utf8");
  const docs: Doc[] = [];
  for (const dir of ["docs", "prompts"]) {
    const dirPath = join(REPO_ROOT, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      docs.push({
        name: `${dir}/${f}`,
        content: readFileSync(join(dirPath, f), "utf8"),
      });
    }
  }
  const result = auditDocs({ emitSource, reducerSource, docs });
  if (result.failures.length > 0) {
    throw new Error(
      "audit must pass on real files; got failures: " +
        JSON.stringify(
          result.failures.map((f) => ({ check: f.check, file: f.file, line: f.line, note: f.note })),
          null,
          2,
        ),
    );
  }
  assert.equal(result.failures.length, 0);
});

// ──────────────────────────────────────────────────────────────────────────
// Final tally
// ──────────────────────────────────────────────────────────────────────────
console.log(
  `\n${failures === 0 ? "OK" : "FAILED"} — ${failures === 0 ? "audit-docs smoke all green." : `${failures} check(s) failed.`}`,
);
if (failures > 0) process.exit(1);
