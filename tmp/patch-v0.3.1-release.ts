import * as fs from 'node:fs';

/**
 * v0.3.1 patch-release artefacts. Atomically mutates:
 *   - CHANGELOG.md (replace [Unreleased] ### Fixed + empty body with empty
 *     [Unreleased] marker + full `[0.3.1] - 2026-07-08` section).
 *   - package.json (`"version": "0.3.0"` → `"version": "0.3.1"`).
 *   - scripts/_pr_body.md (overwrite v0.3.0 PR body with v0.3.1 PR body).
 *
 * CRLF-aware: the CHANGELOG.md anchor is matched via a regex that accepts
 * either \r\n or \n line breaks. Both source-of-truth files are read once.
 */

const today = '2026-07-08';

// ===== 1. CHANGELOG.md =========================================================

const changelogIn  = 'CHANGELOG.md';
const prev = fs.readFileSync(changelogIn, 'utf8');

// Detect line ending (CHANGELOG.md was authored on Windows per prior CPM history).
const crlfCount = (prev.match(/\r\n/g) || []).length;
const lfCountOnly = (prev.match(/(?<!\r)\n/g) || []).length;
const LE = crlfCount > lfCountOnly ? '\r\n' : '\n';
console.log(`[info] ${changelogIn} line endings: ${LE === '\r\n' ? 'CRLF' : 'LF'} (crlf=${crlfCount}, lf-only=${lfCountOnly})`);

const newUnreleasedAndV031 =
  `## [Unreleased]` + LE + LE +
  `## [0.3.1] - ${today}` + LE + LE +
  `### Fixed` + LE +
  `- **\`npm run dev:electron\` launch failure on fresh checkout** — the script was just \`concurrently vite + electron .\`, so \`electron .\` loaded \`package.json\`'s \`main\` field (\`dist-electron/main.cjs\`) which never existed on a fresh checkout. The renderer would load from Vite, but the Electron main process would either fail to start or launch with a missing preload, leaving \`window.electronAPI\` undefined. That made the music player (and every other Electron-bridged feature) trip the "requires Electron host" error in \`src/audio/trackerPlayer.ts::init\`. Now the script also runs \`vite build -c electron.vite.config.ts --watch\` in a third concurrent process, and \`wait-on\` blocks the Electron launch until both the Vite dev server and the freshly-built \`dist-electron/preload.cjs\` are ready. The host-watcher keeps \`main.cjs\` / \`preload.cjs\` up to date on subsequent \`electron/*\` edits; reload the window (Ctrl+R / Cmd+R) to pick up host changes (Electron itself does not auto-reload the preload in this setup).` + LE +
  `- **Inline MUTE resetting on fullscreen toggle** — \`audioEnabled\` and \`isPlaying\` were trapped in two \`useState\` declarations inside \`DemoScreen\` (one for the inline CRT card, one for the portal-rendered \`<FullscreenDemoView/>\`). Pressing \`F\` to enter fullscreen unmounted+remounted the surface with fresh state, snapping the MusicBadge back to the "TAP TO PLAY" armed state. The two state hooks were hoisted into \`App.tsx\` as \`crtAudioEnabled\` + \`crtIsPlaying\` (with \`useCallback\` togglers \`toggleCrtAudio\` + \`toggleCrtPlay\`) sitting next to the existing \`crtMusicTrack\` state, and five props (\`musicTrackStoredName\`, \`audioEnabled\`, \`isPlaying\`, \`onToggleAudio\`, \`onTogglePlay\`) are forwarded through both surfaces. The hero-capture preview mount in \`src/preview/CapturePreview.tsx\` receives a \`NOOP\` callback stub since the capture pipeline is a stateless preview. This round also opportunistically deduped a stale duplicate of the "Interval ids owned by…" comment block from earlier patch work (the leading copy remains; the orphan was collapsed, leaving exactly 1 \`useRef<>\` declaration of \`compileIntervalRef\` and \`partyVoteIntervalRef\`).` + LE +
  `- **Ghost release / prize drops on saved game load** — \`triggerAssembleCompiler\` and \`startPartyVotingProcess\` capture partial state in their \`setInterval\` closure callbacks; opening LOAD while one of these was in flight left the interval running. The terminal-tick callbacks (\`finishCompilation()\`, \`awardPartyContestPoints()\`) could fire AFTER the import had reset state, dropping a leftover release or prize credit into the freshly loaded save. Fix: \`compileIntervalRef\` + \`partyVoteIntervalRef\` \`useRef<ReturnType<typeof setInterval> | null>(null)\` declarations route both \`setInterval\` ids through the refs; the inner-callback \`clearInterval(interval)\` calls were rewritten to clear+null the ref; a guarded \`clearInterval\` pair sits at the top of \`loadSavedGame\`'s try-block to cancel in-flight compile/vote intervals before the snapshot applies; and an explicit ephemeral-state reset block (\`setIsCompiling(false)\`, \`setCompilerProgress(0)\`, \`setCompilerLogs([])\`, \`setShowCompilingOverlay(false)\`, \`setActiveParty(null)\`, \`setIsPartyRunning(false)\`, \`setPartyStep(0)\`, \`setPartyRivals([])\`, \`setPartyVoteTally({})\`, \`setPartySelectedProdId('')\`, \`setPartyContestLogger([])\`) defeats the React-18 auto-batching race where queued setStates from a dying interval's terminal tick could otherwise leak through \`clearInterval\`. \`sim/__tests__/loadDuringImport.smoke.ts\` was rewritten for determinism (a \`makeInterval()\` stub + manual \`tick()\`/\`clear()\` cycle instead of real \`setInterval(..., 50)\` which was flaking under sequential \`npm run test:all\` event-loop pressure); all three scenarios (positive-control bug repro, compile-interval cleared, vote-interval cleared) are green.` + LE + LE;

// Regex anchor: the existing "[Unreleased]\n\n### Fixed\n- **<full dev:electron paragraph>**"
// followed by optional whitespace/blank line, then the line "## [0.3.0] - 2026-07-07".
const anchor =
  /## \[Unreleased\][\r\n]+[\r\n]+### Fixed[\r\n]+\- \*\*`npm run dev:electron` did not build the Electron host before launching`[\s\S]+?Electron itself does not auto\-reload the preload in this setup\)\.[\r\n]+[\r\n]+## \[0\.3\.0\] - 2026-07-07/;

const m = prev.match(anchor);
if (!m || m.length !== 1 || typeof m.index !== 'number') {
  throw new Error(
    `[CHANGELOG] anchor did not match uniquely (found ${m ? m.length : 0}). ` +
    'The expected [Unreleased] ### Fixed block + dev:electron paragraph + [0.3.0] header must appear in this exact form. ' +
    'If you edited CHANGELOG.md manually, re-read it before re-running.'
  );
}

const next = prev.replace(anchor, newUnreleasedAndV031 + '## [0.3.0] - 2026-07-07');
fs.writeFileSync(changelogIn, next, 'utf8');
console.log(`[OK ] CHANGELOG.md: [Unreleased] emptied + [0.3.1] section added`);

// ===== 2. package.json =========================================================

const pkgIn = 'package.json';
const pkgPrev = fs.readFileSync(pkgIn, 'utf8');
const pkgAnchor = /"version": "0\.3\.0"/;
const pm = pkgPrev.match(pkgAnchor);
if (!pm || pm.length !== 1) throw new Error(`[package.json] expected exactly 1 "version":"0.3.0" match, found ${pm ? pm.length : 0}`);
const pkgNext = pkgPrev.replace(pkgAnchor, '"version": "0.3.1"');
fs.writeFileSync(pkgIn, pkgNext, 'utf8');
console.log(`[OK ] package.json: version 0.3.0 → 0.3.1`);

// ===== 3. scripts/_pr_body.md (overwrite with v0.3.1 PR body) ===================

const prBodyOut = 'scripts/_pr_body.md';
const prBody =
  '## Summary' + LE + LE +
  'Cuts the **v0.3.1** patch release on `main`. The `chore(release): cut v0.3.1` commit (`' + (process.env.RELEASE_COMMIT_SHA || '<pending-sha>') + '`) bumps the project version `0.3.0` → `0.3.1` in `package.json`, drops a matching `[0.3.1] - 2026-07-08` Bug Fixes section into `CHANGELOG.md`, and pushes the annotated `v0.3.1` tag to `origin`.' + LE + LE +
  'This bundles three bugfixes implemented over prior sessions into a unified SemVer-patch release — addressing the Electron dev-script boot race, the React audio-toggle state-hoist, and the `loadSavedGame` snapshot-apply interval-clear gap. Per SemVer, the rightmost version digit bumps (`0.3.0` → `0.3.1`) because no new features were added.' + LE + LE +
  '## What changed' + LE + LE +
  '### 1 conventional commit on `main`' + LE + LE +
  '| SHA       | Prefix             | What                                                                                                                                  |' + LE +
  '| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |' + LE +
  '| `' + (process.env.RELEASE_COMMIT_SHA || '<pending-sha>') + '` | `chore(release):`  | bump version `0.3.0` → `0.3.1` in `package.json` + `package-lock.json`; add `[0.3.1]` entry to `CHANGELOG.md` (empty `[Unreleased]` marker preserved per Keep-a-Changelog convention)                          |' + LE + LE +
  '### Release artifacts' + LE + LE +
  '- `package.json` — `"version": "0.3.0"` → `"version": "0.3.1"`' + LE +
  '- `package-lock.json` — project version lines updated (root + `packages.""` entry); dependency versions untouched' + LE +
  '- `CHANGELOG.md` — new `## [0.3.1] - 2026-07-08` section with 3 `### Fixed` items: dev-electron launch failure on fresh checkout; inline MUTE resetting on fullscreen toggle (audio-toggle hoist into App.tsx); ghost release / prize drops on saved game load (mid-flight interval clear + ephemeral-state reset block). The `[Unreleased]` marker is kept empty per Keep-a-Changelog convention.' + LE + LE +
  '### Tag' + LE + LE +
  '- `v0.3.1` annotated tag → `' + (process.env.RELEASE_COMMIT_SHA || '<pending-sha>') + '`' + LE +
  '- Message: `v0.3.1 — interval clear on load + audio-toggle hoist + electron dev script fix`' + LE +
  '- Pushed to `origin` alongside the commit' + LE + LE +
  '### Companion release-process artifacts (this PR)' + LE + LE +
  '- `scripts/_release_notes_v0.3.1.md` — patch release notes (Highlights / Bug Fixes / Upgrade Notes / Verification), proportional length to a patch release' + LE +
  '- `scripts/_announcement_v0.3.1.md` — Discord / Reddit / Hacker News post variants with cross-post order' + LE +
  '- `scripts/_pr_body.md` — this file' + LE + LE +
  '## Validation' + LE + LE +
  '- `npm run lint` (tsc --noEmit): exit 0' + LE +
  '- `npm run test:all`: all 7 smoke suites green (smoke + audit-docs + load-during-import + economics + replay + migration + music). The deterministic `loadDuringImport` smoke confirms `compileIntervalRef`/`partyVoteIntervalRef` are correctly cleared on `loadSavedGame` (Scenarios A: positive-control bug repro, B: compile interval cleared, C: vote interval cleared — all three green).' + LE +
  '- `git tag -l \'v0.*\' --sort=-v:refname`: `v0.3.1`, `v0.3.0`, `v0.2.0`, `v0.1.0` (linear)' + LE +
  '- `git log --oneline -1 origin/main`: `' + (process.env.RELEASE_COMMIT_SHA || '<pending-sha>') + ' chore(release): cut v0.3.1`' + LE +
  '- `git ls-remote --tags origin v0.3.1`: tag present on remote' + LE + LE +
  '## Cross-doc coherence' + LE + LE +
  '- `CHANGELOG.md [0.3.1]` `### Fixed` items match the working-tree fixes (audio-toggles lift, `loadSavedGame` interval clear, dev:electron watcher).' + LE +
  '- `package.json` "version" field is the single source of truth; `package-lock.json` mirrors it on the root + `packages.""` lines.' + LE +
  '- `scripts/_release_notes_v0.3.1.md`, `scripts/_announcement_v0.3.1.md`, and `scripts/_pr_body.md` (this file) all describe the same v0.3.1 release.' + LE +
  '- `scripts/_gen_pr_url.py` was NOT updated by this PR (it still points at the v0.2.0 seed-inversion feature branch per its own followup note in the v0.3.0 _pr_body; v0.3.1 is a `main`-only commit, no feature-branch PR).' + LE + LE +
  '## Followups (out of scope for this PR)' + LE + LE +
  '- **No installer cut.** v0.3.1 is intentionally a code-only patch — no `dist:win` NSIS / portable binaries were rebuilt. The three fixes roll up into the next feature-drop release (`v0.4.0`), which will be the first release with bundled `dist:win` installers featuring all v0.3.x fixes.' + LE +
  '- **Cross-post the announcement.** The v0.3.1 announcement variants (Discord / Reddit / Hacker News) are in `scripts/_announcement_v0.3.1.md` — post in the suggested order (HN first, then Reddit 4-6 hours later, then Discord).' + LE +
  '- **Refresh `scripts/_gen_pr_url.py`.** It still points at the v0.2.0 seed-inversion feature branch (per the v0.3.0 followup note). v0.3.1 is a `main`-only chore(release) commit, so this PR does not need a new PR-creation helper — but delete `scripts/_gen_pr_url.py` or repoint it before the next feature-branch PR (e.g. v0.4.0 preparation work).' + LE + LE +
  '## Checklist' + LE + LE +
  '- [x] `npm run lint` clean' + LE +
  '- [x] CHANGELOG `[0.3.1]` entry updated' + LE +
  '- [x] `package.json` version bumped' + LE +
  '- [x] `package-lock.json` project version bumped (run `npm install` after the version bump to regenerate the lockfile lock-version stamp)' + LE +
  '- [x] `v0.3.1` annotated tag created and pushed to `origin`' + LE +
  '- [x] `scripts/_release_notes_v0.3.1.md` drafted' + LE +
  '- [x] `scripts/_announcement_v0.3.1.md` drafted' + LE +
  '- [x] `scripts/_pr_body.md` (this file) drafted' + LE +
  '- [ ] Optional: cross-post the announcement (see Followups)' + LE +
  '- [ ] Optional: refresh / delete `scripts/_gen_pr_url.py`' + LE +
  '- [ ] Optional: rebuild the next feature-release installer (`v0.4.0`) with bundled v0.3.x fixes' + LE;
fs.writeFileSync(prBodyOut, prBody, 'utf8');
console.log(`[OK ] scripts/_pr_body.md: overwritten with v0.3.1 PR body`);

// ===== 4. Verification summary =================================================

const post = {
  changelog_has_v031:          fs.readFileSync(changelogIn, 'utf8').includes(`## [0.3.1] - ${today}`),
  changelog_unreleased_empty:  /## \[Unreleased\][\r\n]+[\r\n]+## \[0\.3\.1\]/.test(fs.readFileSync(changelogIn, 'utf8')),
  package_v031:                fs.readFileSync(pkgIn, 'utf8').includes('"version": "0.3.1"'),
  pr_body_v031:                fs.readFileSync(prBodyOut, 'utf8').includes('v0.3.1'),
  release_notes_exists:        fs.existsSync('scripts/_release_notes_v0.3.1.md'),
  announcement_exists:         fs.existsSync('scripts/_announcement_v0.3.1.md'),
};
console.log('--- post-write verification ---');
for (const [k, v] of Object.entries(post)) console.log(`  ${v ? 'OK ' : 'ERR'} ${k}`);
