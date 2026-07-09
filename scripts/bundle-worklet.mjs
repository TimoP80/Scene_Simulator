/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * scripts/bundle-worklet.mjs
 *
 * Concatenates chiptune3's two worklet files into a single AudioWorklet
 * module. We do this because Electron 42's AudioWorklet fails to follow
 * static `import './libopenmpt.worklet.js'` chains when the JS module is
 * loaded through a custom-scheme protocol or any URL whose network stack
 * the worklet scope doesn't tautologically trust; routing through the
 * document's same-origin Vite dev server keeps the worklet single-file.
 *
 * RECIPE (exactly what this script applies):
 *   1. Copy `node_modules/chiptune3/libopenmpt.worklet.js` verbatim
 *      except:
 *      - drop any `export default ...` and `export { ... }` statements
 *        (the worklet scope does not consume ES module exports — it
 *        just runs the body once and reads via globals)
 *      - rename the factory `libopenmpt` → `libopenmptPromise` so it
 *        doesn't collide with the `let libopenmpt` declaration at the
 *        top of chiptune3.worklet.js
 *   2. Copy `node_modules/chiptune3/chiptune3.worklet.js` verbatim
 *      except:
 *      - remove the static `import libopenmptPromise from './libopenmpt.worklet.js'`
 *        line — the renamed factory is now an inlined sibling and the
 *        import would attempt the cross-file fetch we're trying to avoid
 *   3. Concatenate: libopenmpt body first, chiptune3 body second.
 *   4. Write to `public/worklets/openmpt.bundled.worklet.js` so Vite
 *      serves it at `/worklets/openmpt.bundled.worklet.js` in dev AND
 *      copies it as a sibling of `dist/index.html` in prod.
 *
 * Why a runtime build step (not just a Vite plugin) — simplicity.
 * The two upstream files rarely change. We re-run this script whenever
 * chiptune3 is bumped. `package.json`'s `build:all` invokes it first.
 */

import { readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = dirname(__dirname);

const SRC_LIBMOD = join(ROOT, "node_modules", "chiptune3", "libopenmpt.worklet.js");
const SRC_CHIPTUNE = join(ROOT, "node_modules", "chiptune3", "chiptune3.worklet.js");
const OUT_DIR = join(ROOT, "public", "worklets");
const OUT = join(OUT_DIR, "openmpt.bundled.worklet.js");

for (const p of [SRC_LIBMOD, SRC_CHIPTUNE]) {
  if (!statSync(p, { throwIfNoEntry: false })) {
    throw new Error(
      `Required upstream not found: ${p}. ` +
        "Did you forget `npm install`, or did chiptune3 rename a file?",
    );
  }
}

let libo = readFileSync(SRC_LIBMOD, "utf8");
let chiptune = readFileSync(SRC_CHIPTUNE, "utf8");

// ---------------------------------------------------------------------------
// 1a. Strip `export` statements from the Emscripten runtime. The worklet
//     scope runs the module body ad-hoc; ES exports would either be unused
//     (fine) or, in the case of `export default libopenmpt`, would attempt
//     to read a binding that doesn't exist after rename-to-`libopenmptPromise`.
// ---------------------------------------------------------------------------
libo = libo.replace(/\bexport\s+default\s+\w+;?\s*/g, "");
libo = libo.replace(/\bexport\s*\{[^}]*\}\s*;?\s*/g, "");

// ---------------------------------------------------------------------------
// 1b. Rename `libopenmpt` → `libopenmptPromise` in the Emscripten runtime so
//     it doesn't collide with chiptune3's own `let libopenmpt` declaration.
//     We rename declarations of every commonly-used kind:
//       - function, var, const, let, class
//     only in THIS file (we operate on `libo` only, never `chiptune`).
//     Property accesses (`libopenmpt._malloc(...)`) are NOT declarations,
//     so they're left alone — the renamed factory's caller in chiptune3
//     never touches the renamed binding by its old name anyway.
// ---------------------------------------------------------------------------
libo = libo.replace(
  /(\bfunction\s+|\bvar\s+|\bconst\s+|\blet\s+|\bclass\s+)libopenmpt\b/g,
  "$1libopenmptPromise",
);

// ---------------------------------------------------------------------------
// 2. Strip the static import at the top of chiptune3.worklet.js. The
//    renamed factory from step 1b is now an in-file sibling and the import
//    would attempt exactly the cross-file fetch we're trying to avoid.
//    We match ANY `import <binding> from './libopenmpt.worklet.js'`
//    form — default, named (`{foo}`), namespace (`* as foo`) — because
//    upstream chiptune3 versions have varied and the loose catch-all is
//    safer than a brittle default-only match that could regress silently.
// ---------------------------------------------------------------------------
chiptune = chiptune.replace(
  /^\s*import\s+[^;]*from\s+['"][^'"]*libopenmpt\.worklet\.js['"];?\s*$/m,
  "",
);

// ---------------------------------------------------------------------------
// 3. Concatenate with a header explaining the bundle's provenance so future
//    maintainers (or a future us, looking at the diff) understand why this
//    file isn't directly upstream.
// ---------------------------------------------------------------------------
const HEADER = `/* =========================================================================
 * openmpt.bundled.worklet.js — GENERATED. DO NOT EDIT BY HAND.
 *
 * Built by scripts/bundle-worklet.mjs from:
 *   1. node_modules/chiptune3/libopenmpt.worklet.js  (Emscripten runtime)
 *   2. node_modules/chiptune3/chiptune3.worklet.js   (AudioWorkletProcessor)
 *
 *   - The Emscripten factory \`libopenmpt\` was renamed to \`libopenmptPromise\`
 *     to avoid colliding with \`let libopenmpt\` in the chiptune3 half.
 *   - The static \`import libopenmptPromise from './libopenmpt.worklet.js'\`
 *     line was deleted; the renamed factory is now an inlined sibling
 *     definition, so \`addModule()\` only ever fetches THIS single URL.
 *
 * WHY THIS MONOLITH EXISTS:
 *   Electron 42 (Chromium 134-ish) refuses to load chains of static
 *   \`import\` statements inside an AudioWorklet scope when any hop in
 *   the chain is reached through a non-document-origin URL. We tried
 *   routing chiptune3's two files through a custom \`worklet://\`
 *   protocol and through \`net.fetch(file://…)\` — both delivered the
 *   file fine but \`addModule()\` reported
 *   "Unable to load a worklets module". A single same-origin URL
 *   loaded via \`addModule('/worklets/openmpt.bundled.worklet.js')\`
 *   on the Vite dev server avoids the issue entirely.
 *
 * MESSAGE PROTOCOL (parent thread → worklet port):
 *   { cmd: "config",      val: { repeatCount, stereoSeparation, interpolationFilter } }
 *   { cmd: "play",        val: ArrayBuffer (module bytes) }
 *   { cmd: "pause" }
 *   { cmd: "unpause" }
 *   { cmd: "stop" }
 *   { cmd: "setPos",      val: seconds }
 *   { cmd: "repeatCount", val: -1 | 1 }
 *
 * WORKLET → PARENT:
 *   { cmd: "meta", meta: { dur, channels, title?, ... } }
 *   { cmd: "pos",  pos: seconds }
 *   { cmd: "end" }
 *   { cmd: "err",  val: 'ptr' | 'dur' | 'Process' }
 * ========================================================================= */

`;

const merged = `${HEADER}${libo.trimEnd()}\n\n${chiptune.trimStart()}\n`;

mkdirSync(OUT_DIR, { recursive: true });
writeFileSync(OUT, merged);
console.log(
  `bundle: wrote ${OUT} (${merged.length} bytes; ` +
    `libo=${libo.length}, chiptune=${chiptune.length})`,
);
