// One-shot helper: append setCrtMusicTrack("") to each scenario preset
// setCrtDemoName(...) line so the upper-left music badge always reflects
// the *currently* compiled production (or none, when picking a preset).
import * as fs from "node:fs";

const p = "src/App.tsx";
let s = fs.readFileSync(p, "utf8");

// Anchor pairs: the second line of each preset where setCrtDemoName fires.
// We deliberately do NOT use a generic regex (Node JS regex literals work
// fine, but the previous bash heredoc escaping was the failure mode, so
// this script is the durable form).
const anchors: ReadonlyArray<{ before: string; after: string }> = [
  { before: '      setCrtDemoName("SINUS WAVES");', after: '      setCrtDemoName("SINUS WAVES");\n      setCrtMusicTrack("");' },
  { before: '      setCrtDemoName("AMIGA MAGIC");', after: '      setCrtDemoName("AMIGA MAGIC");\n      setCrtMusicTrack("");' },
  { before: '      setCrtDemoName("VOXELLOID");', after: '      setCrtDemoName("VOXELLOID");\n      setCrtMusicTrack("");' },
];

let applied = 0;
for (const a of anchors) {
  const count = s.split(a.before).length - 1;
  if (count === 0) {
    console.warn(`anchor not found: ${a.before}`);
    continue;
  }
  if (count > 1) {
    throw new Error(`anchor matched ${count} times: ${a.before}`);
  }
  s = s.replace(a.before, a.after);
  applied++;
}

fs.writeFileSync(p, s, "utf8");
console.log(`applied ${applied} / ${anchors.length} preset resets.`);

const total = (s.match(/setCrtMusicTrack\(\s*""\s*\);/g) || []).length;
console.log(`total setCrtMusicTrack("") occurrences in file: ${total}`);

// sanity: 1 decl + 1 finishCompilation setter + 3 preset resets = 5
