#!/usr/bin/env node
/**
 * scripts/audit-docs.mjs — docs/prompts drift guard.
 *
 * Run as `npm run audit:docs`. Exits 0 if clean, 1 on any failure.
 *
 * Three checks (all source-of-truth):
 *   1. Every `emit.<key>(...)` call inside a fenced code block in any
 *      doc/prompt is defined in `sim/events/appendEvent.ts`'s `export const emit`.
 *      Comment lines inside fences are skipped (so teaching prose like
 *      "// loop.dispatch(emit.x(...)) is the M1 pattern" doesn't false-fail).
 *
 *   2. Zero `loop.dispatch(emit.<key>(...))` patterns inside fenced code
 *      blocks anywhere — that's the M1 double-store signature. Prose mentions
 *      in warning callouts/blockquotes remain allowed (deliberate, see
 *      `sim/__tests__/dispatchStampedEvent.smoke.ts` for the regression test).
 *
 *   3. Every `state.<slice>[.<field>]` referenced in any doc/prompt exists in
 *      `sim/engine/reducer.ts`'s `interface WorldState`. Catches typos like
 *      `state.snapshot()` (should be `loop.snapshot()`) and stale slice names
 *      like `state.parties.active` (should be `state.party.active`).
 *
 * Public surface (for tests):
 *   - `auditDocs({ docs, emitSource, reducerSource })` → { failures, passes, emitKeys, statePaths }
 *   - `runCli()` — read source + docs from filesystem, print report, exit.
 *   - `loadDocsFromFs(rootDir?)` — helper for picking up real docs.
 */

import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, relative } from "node:path";
import { pathToFileURL } from "node:url";

const ROOT = process.cwd();
const SOURCE_EMIT = "sim/events/appendEvent.ts";
const SOURCE_REDUCER = "sim/engine/reducer.ts";
const DOC_DIRS = ["docs", "prompts"];

// --- helpers ---------------------------------------------------------------

const read = (p) => readFileSync(join(ROOT, p), "utf8");

function matchingBrace(src, fromIdx) {
  let depth = 0;
  for (let i = fromIdx; i < src.length; i++) {
    if (src[i] === "{") depth++;
    else if (src[i] === "}") {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  return src.length;
}

/** Builder keys declared in `export const emit = { ... }`. */
function extractEmitKeys(src) {
  const start = src.indexOf("export const emit = {");
  if (start === -1) throw new Error(`Could not find 'export const emit = {' in emit source`);
  const openIdx = src.indexOf("{", start);
  const closeIdx = matchingBrace(src, openIdx);
  const block = src.slice(openIdx, closeIdx);
  const keys = new Set();
  const lines = block.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
    const m = line.match(/^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*\(/);
    if (m) keys.add(m[1]);
  }
  return keys;
}

/** Allowed `state.X` and `state.X.Y` paths inside `interface WorldState`. */
function extractWorldStatePaths(src) {
  const start = src.indexOf("interface WorldState");
  if (start === -1) throw new Error(`Could not find 'interface WorldState' in reducer source`);
  const openIdx = src.indexOf("{", start);
  const closeIdx = matchingBrace(src, openIdx);
  const block = src.slice(openIdx, closeIdx);

  const top = new Set();
  const topRe = /^\s*([a-zA-Z][a-zA-Z0-9_]*)\s*:\s*\{/gm;
  let m;
  while ((m = topRe.exec(block)) !== null) top.add(m[1]);

  const paths = new Set([...top]);
  for (const slice of [...top]) {
    const sliceStart = block.indexOf(`${slice}: {`);
    if (sliceStart === -1) continue;
    const sOpen = block.indexOf("{", sliceStart);
    const sClose = matchingBrace(block, sOpen);
    const body = block.slice(sOpen + 1, sClose - 1);
    // Skip comment-prefixed lines (`//`, `*`, `/*`) so commented-out fields
    // aren't retained as valid paths. Symmetric with extractEmitKeys.
    const lines = body.split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*")) continue;
      const m = line.match(/^\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*[:?]/);
      if (m) paths.add(`${slice}.${m[1]}`);
    }
  }
  return paths;
}

/** Slice content into prose/code regions by fence. Unclosed fences are treated as
 *  code (more defensive — helps audit catch drift that was supposed to be code). */
function splitFences(content) {
  const lines = content.split(/\r?\n/);
  const regions = [];
  let inFence = false;
  let buf = [];
  let bufLine = 1;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!inFence && /^\s*```/.test(line)) {
      if (buf.length) regions.push({ kind: "prose", text: buf.join("\n"), lineStart: bufLine });
      buf = [];
      inFence = true;
      bufLine = i + 2;
    } else if (inFence && /^\s*```/.test(line)) {
      regions.push({ kind: "code", text: buf.join("\n"), lineStart: bufLine });
      buf = [];
      inFence = false;
    } else {
      if (buf.length === 0) bufLine = i + 1;
      buf.push(line);
    }
  }
  if (buf.length) regions.push({ kind: inFence ? "code" : "prose", text: buf.join("\n"), lineStart: bufLine });
  return regions;
}

/** Is `line` a comment? `//`, `*`, or `/*` first non-whitespace. */
const isCommentLine = (line) => {
  const trimmed = line.trim();
  return trimmed.startsWith("//") || trimmed.startsWith("*") || trimmed.startsWith("/*");
};

/** Iterate regex matches skipping comment-prefixed lines (line numbers preserved). */
function* iterateLinesSkippingComments(text, startLine, re) {
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    if (isCommentLine(lines[i])) continue;
    const lineRe = new RegExp(re.source, "g");
    let m;
    while ((m = lineRe.exec(lines[i])) !== null) {
      yield { line: startLine + i, match: m[0], groups: m.slice(1) };
      if (m.index === lineRe.lastIndex) lineRe.lastIndex++;
    }
  }
}

/** Iterate regex matches across whole-region text (no skip). */
function* iterateMatches(text, startLine, re) {
  re.lastIndex = 0;
  let m;
  while ((m = re.exec(text)) !== null) {
    const before = text.slice(0, m.index);
    const offset = (before.match(/\n/g) || []).length;
    yield { line: startLine + offset, match: m[0], groups: m.slice(1) };
    if (m.index === re.lastIndex) re.lastIndex++;
  }
}

// --- public surface --------------------------------------------------------

/**
 * Run the audit against an in-memory snapshot of source + docs. The whole
 * library-callable API is here so tests don't need temp files / sub-process
 * spawning.
 *
 * @param opts.docs         Array<{ name: string, content: string }>
 * @param opts.emitSource   Full source string for `sim/events/appendEvent.ts`.
 * @param opts.reducerSource Full source string for `sim/engine/reducer.ts`.
 * @returns { failures, passes, emitKeys, statePaths }
 */
export function auditDocs({ docs, emitSource, reducerSource }) {
  if (!Array.isArray(docs)) throw new Error("auditDocs: `docs` must be an array");
  if (typeof emitSource !== "string") throw new Error("auditDocs: `emitSource` must be a string");
  if (typeof reducerSource !== "string") throw new Error("auditDocs: `reducerSource` must be a string");

  const emitKeys = extractEmitKeys(emitSource);
  const statePaths = extractWorldStatePaths(reducerSource);
  const failures = [];

  const emitKeyRe = /\bemit\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const m1Re = /loop\.dispatch\s*\(\s*emit\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g;
  const statePathRe = /\bstate\.([a-zA-Z_][a-zA-Z0-9_]*)(?:\.([a-zA-Z_][a-zA-Z0-9_]*))?\b/g;

  for (const doc of docs) {
    const regions = splitFences(doc.content);

    for (const r of regions) {
      if (r.kind === "code") {
        // CHECK 1
        for (const m of iterateLinesSkippingComments(r.text, r.lineStart, emitKeyRe)) {
          const key = m.groups[0];
          if (!emitKeys.has(key)) {
            failures.push({
              check: 1, file: doc.name, line: m.line, match: m.match,
              note: `emit.${key} is not defined in ${SOURCE_EMIT}`,
            });
          }
        }
        // CHECK 2
        for (const m of iterateLinesSkippingComments(r.text, r.lineStart, m1Re)) {
          failures.push({
            check: 2, file: doc.name, line: m.line, match: m.match,
            note: "loop.dispatch(emit.X(...)) is the M1 double-store pattern",
          });
        }
        // CHECK 3 (code region, comment skip)
        for (const m of iterateLinesSkippingComments(r.text, r.lineStart, statePathRe)) {
          const slice = m.groups[0];
          const sub = m.groups[1];
          if (!statePaths.has(slice)) {
            failures.push({
              check: 3, file: doc.name, line: m.line, match: m.match,
              note: `state.${slice} is not a WorldState slice`,
            });
            continue;
          }
          if (sub && !statePaths.has(`${slice}.${sub}`)) {
            failures.push({
              check: 3, file: doc.name, line: m.line, match: m.match,
              note: `state.${slice}.${sub} is not in the WorldState interface`,
            });
          }
        }
      } else {
        // Prose region: state.X[.Y] scan only.
        for (const m of iterateMatches(r.text, r.lineStart, statePathRe)) {
          const slice = m.groups[0];
          const sub = m.groups[1];
          if (!statePaths.has(slice)) {
            failures.push({
              check: 3, file: doc.name, line: m.line, match: m.match,
              note: `state.${slice} is not a WorldState slice`,
            });
            continue;
          }
          if (sub && !statePaths.has(`${slice}.${sub}`)) {
            failures.push({
              check: 3, file: doc.name, line: m.line, match: m.match,
              note: `state.${slice}.${sub} is not in the WorldState interface`,
            });
          }
        }
      }
    }
  }

  return {
    failures,
    passes: failures.length === 0,
    emitKeys: [...emitKeys],
    statePaths: [...statePaths],
  };
}

/** Read all `.md` files under `docs/` and `prompts/` from a given root. */
export function loadDocsFromFs(rootDir = ROOT) {
  const docs = [];
  for (const dir of DOC_DIRS) {
    const dirPath = join(rootDir, dir);
    if (!existsSync(dirPath)) continue;
    const files = readdirSync(dirPath).filter((f) => f.endsWith(".md"));
    for (const f of files) {
      const fullPath = join(dirPath, f);
      docs.push({
        name: relative(rootDir, fullPath),
        content: readFileSync(fullPath, "utf8"),
      });
    }
  }
  return docs;
}

/** Run audit on real source + docs and exit with the verdict. */
export function runCli() {
  const emitSource = read(SOURCE_EMIT);
  const reducerSource = read(SOURCE_REDUCER);
  const docs = loadDocsFromFs(ROOT);

  const result = auditDocs({ docs, emitSource, reducerSource });

  console.log("\n=== docs/prompts audit ===\n");
  console.log(`Source emit.* keys (${result.emitKeys.length}): ${result.emitKeys.sort().join(", ")}`);
  console.log(`Source WorldState top-level slices: meta, player, calendar, crew, bbs, productions, socialGraph, press, party`);
  console.log(`Audited (${docs.length} files):`);
  for (const t of docs) console.log(`  - ${t.name}`);

  if (result.passes) {
    console.log("\n✅ All checks passed.\n");
    process.exit(0);
  }

  console.log(`\n❌ ${result.failures.length} failure(s):\n`);
  for (const f of result.failures) {
    console.log(`[Check ${f.check}] ${f.file}:${f.line}  ${f.note}`);
    console.log(`   evidence: ${f.match}`);
  }
  console.log("");
  process.exit(1);
}

// CLI detection — only invoke runCli when this file is the entry point.
// Imports (e.g. from the smoke test) will not match and stay silent.
if (
  typeof process.argv[1] === "string" &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  runCli();
}
