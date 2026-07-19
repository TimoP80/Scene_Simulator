// One-shot patch: insert ERA_LABELS map and replace regex-based eraLabel
// construction with a typed lookup. Preserves CRLF line endings if present.
import fs from "node:fs";

const p = String.raw`C:\CodeProjects\demoprodz\scenesim\Scene_Simulator\src\App.tsx`;
const buf = fs.readFileSync(p);
const crlf = Buffer.from("\r\n");
const isCrlf = buf.includes(crlf);
console.log("crlf=", isCrlf);

// 1) Insert ERA_LABELS constant block right above the
//    "--------- RESEARCHING TECHNOLOGY GRAPH ---------" comment.
const anchor = Buffer.from("// --------- RESEARCHING TECHNOLOGY GRAPH ---------");
const anchorIdx = buf.indexOf(anchor);
if (anchorIdx < 0) { console.error("ANCHOR NOT FOUND"); process.exit(1); }

const ERA_LABELS_BODY = [
  "// Display labels for each EraId, used by researchNode's era gate to",
  "// compose a readable TIME-ANOMALY alert. Adding a new EraId without",
  "// updating this map falls back to the raw enum value, so a tsc error",
  "// forces the maintainer to add the entry.",
  "const ERA_LABELS: Record<string, string> = {",
  '  [EraId.ERA_8_BIT]: "8-bit",',
  '  [EraId.ERA_16_BIT]: "16-bit",',
  '  [EraId.ERA_PC_DAWN]: "PC Dawn",',
  '  [EraId.ERA_3D_SHADER]: "3D Shader",',
  "};",
  "",
];
const eraLabelsBuf = Buffer.from(
  ERA_LABELS_BODY.join(isCrlf ? "\r\n" : "\n"),
  "utf8"
);

// 2) Replace the regex-based eraLabel with a typed lookup.
const old = Buffer.from(
  '      const eraLabel = node.era.replace(/^ERA_/, "").replace(/^(\\d+)_BIT$/, "$1-bit");'
);
const idx2 = buf.indexOf(old);
if (idx2 < 0) { console.error("REGEX LINE NOT FOUND"); process.exit(2); }
const rep = Buffer.from("      const eraLabel = ERA_LABELS[node.era] ?? node.era;");

let out = Buffer.concat([buf.slice(0, anchorIdx), eraLabelsBuf, buf.slice(anchorIdx)]);
// anchorIdx shifted by eraLabelsBuf.length — recompute by using the same
// concatenation on the post-insert buffer.
const idx2After = out.indexOf(old);
if (idx2After < 0) { console.error("REGEX LINE NOT FOUND (post-insert)"); process.exit(3); }
out = Buffer.concat([out.slice(0, idx2After), rep, out.slice(idx2After + old.length)]);

fs.writeFileSync(p, out);
console.log("OK: ERA_LABELS inserted + regex line replaced");
