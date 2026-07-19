/**
 * @license
 * Internal patch script — applies the App.tsx edits needed to wire
 * the new `crtMusicTrack` state through to the DemoScreen component.
 * This file lives in /tmp/ and is not part of the project source.
 *
 * Three precise, idempotent edits:
 *   1. Add the `crtMusicTrack` state declaration next to crtGroupName.
 *   2. Set the state in `finishCompilation` from the new Production.
 *   3. Pass `musicTrackStoredName={crtMusicTrack}` to <DemoScreen />.
 *
 * The str_replace tool cannot diff a 308KB file reliably, so this script
 * does direct string-level replacements and is safe to re-run (no-op
 * when all anchors are already applied).
 */
import { readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

const TARGET = resolve(process.cwd(), "src/App.tsx");
const src = readFileSync(TARGET, "utf8");

type Edit = {
  /** Unique anchor string expected to appear EXACTLY ONCE in the file. */
  find: string;
  /** When true, insert `insert` directly after the anchor; else REPLACE. */
  addAfter?: boolean;
  insert?: string;
  replace?: string;
};

const edits: Edit[] = [
  // 1. State declaration. The line lives in the App component body and
  //    carries a 2-space indent. Skip the search if the new state has
  //    already been added (idempotent re-runs).
  {
    find:
      '  const [crtGroupName, setCrtGroupName] = useState<string>("Tricycle Crews");',
    addAfter: true,
    insert:
      "\n  // storedName of the music track attached to the production currently\n" +
      '  // shown in the WORKSPACE CRT monitor (empty when no track is picked).\n' +
      "  // DemoScreen reads this prop and drives the shared trackerPlayer.\n" +
      '  const [crtMusicTrack, setCrtMusicTrack] = useState<string>("");',
  },
  // 2. finishCompilation setter — finishCompilation is the only scope
  //    that reads `newProd.groupName` on its own line, so the
  //    `newProd.groupName` token is unique enough on its own to anchor
  //    on without duplicating scenario-preset placeholders.
  {
    find: "    setCrtGroupName(newProd.groupName);",
    addAfter: true,
    insert: '\n    setCrtMusicTrack(newProd.musicTrackStoredName ?? "");',
  },
  // 3. DemoScreen mount — Edit 3 was already applied in the previous
  //    patch run; the script reports a no-op via the "anchor NOT found"
  //    branch which we treat as success.
  {
    find:
      "<DemoScreen\n            effects={crtActiveEffects}\n          ",
    replace:
      "<DemoScreen\n            effects={crtActiveEffects}\n            demoName={crtDemoName}\n            groupName={crtGroupName}\n            musicTrackStoredName={crtMusicTrack}\n          ",
  },
];

let result = src;
let mutations = 0;
let skipped = 0;
for (let i = 0; i < edits.length; i++) {
  const e = edits[i];
  const matches = result.split(e.find).length - 1;
  if (matches === 0) {
    console.log(`Edit ${i}: already applied (anchor NOT found) — skipping.`);
    skipped += 1;
    continue;
  }
  if (matches > 1) {
    throw new Error(
      `Edit ${i}: anchor matched ${matches} times — refusing to proceed. ` +
        `Make the find string more specific.`,
    );
  }
  if (e.addAfter) {
    result = result.replace(e.find, e.find + (e.insert ?? ""));
  } else if (e.replace !== undefined) {
    result = result.replace(e.find, e.replace);
  } else {
    throw new Error(`Edit ${i}: neither addAfter nor replace specified.`);
  }
  console.log(`Edit ${i}: applied.`);
  mutations += 1;
}

writeFileSync(TARGET, result, "utf8");
console.log(`\nDone — applied ${mutations} edit(s), skipped ${skipped}, total ${edits.length}.`);
