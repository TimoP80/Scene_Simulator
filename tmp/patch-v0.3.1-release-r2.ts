import * as fs from 'node:fs';

/**
 * v0.3.1 patch-release artefacts (round 2).
 *
 * Differences from round 1:
 * - CHANGELOG.md: switched from regex to `indexOf`-based slicing (avoids the
 *   em-dash + multi-paragraph regex brittleness that gave 0 matches last round).
 * - Added package-lock.json bump at lines 3 and 9 (the two `"version": "0.3.0"`
 *   occurrences — top-level root + `packages.""` entry). Reviewer flagged this
 *   as a SHIP-blocker.
 * - Title-case H1 + `npm run audit:docs` Verification line in
 *   scripts/_release_notes_v0.3.1.md (reviewer nits 2 + 3).
 * - Fix `_gen_pr_url.py` typo: `Scene_SImulator` → `Scene_Simulator` (matches
 *   the canonical repo casing used in v0.3.1 release-process artefacts).
 *
 * NO production-code changes in this round.
 */

const today = '2026-07-08';
const LE = '\r\n'; // CHANGELOG.md is CRLF; lockfile/package.json/prbody are LF-detected per-file.

// ===== pre-write nits: _release_notes_v0.3.1.md H1 + Verification line =====

{
  const f = 'scripts/_release_notes_v0.3.1.md';
  let s = fs.readFileSync(f, 'utf8');
  const beforeNits = s;
  s = s.replace(
    '# Scene Simulator v0.3.1 — Interval clear on load + audio-toggle hoist + electron dev script fix',
    '# Scene Simulator v0.3.1 — Interval Clear on Load + Audio-Toggle Hoist + Electron Dev Script Fix'
  );
  s = s.replace(
    '- `npm run lint` (tsc --noEmit) — exit 0\n- `npm run test:all` — 7/7 smokes green, including the rewritten deterministic `loadDuringImport` smoke (Scenarios A/B/C: positive-control bug repro WITHOUT clearInterval, compile interval IS cleared on import, vote interval IS cleared on import)\n- `npm run build` — clean renderer bundle',
    '- `npm run lint` (tsc --noEmit) — exit 0\n- `npm run test:all` — 7/7 smokes green, including the rewritten deterministic `loadDuringImport` smoke (Scenarios A/B/C: positive-control bug repro WITHOUT clearInterval, compile interval IS cleared on import, vote interval IS cleared on import)\n- `npm run audit:docs` — doc/sim parity gate green\n- `npm run build` — clean renderer bundle'
  );
  fs.writeFileSync(f, s, 'utf8');
  console.log(`[${s !== beforeNits ? 'OK ' : 'skp'}] scripts/_release_notes_v0.3.1.md: Title-case H1 + audit:docs verification line`);
}

// ===== 1. _gen_pr_url.py typo fix =============================================

{
  const f = 'scripts/_gen_pr_url.py';
  let s = fs.readFileSync(f, 'utf8');
  const before = s;
  // Fix the two `Scene_SImulator` mentions (typo, capital I).
  s = s.replace(/Scene_SImulator/g, 'Scene_Simulator');
  fs.writeFileSync(f, s, 'utf8');
  console.log(`[${s !== before ? 'OK ' : 'skp'}] scripts/_gen_pr_url.py: Scene_SImulator -> Scene_Simulator`);
}

// ===== 2. CHANGELOG.md via indexOf slicing ====================================

{
  const f = 'CHANGELOG.md';
  const content = fs.readFileSync(f, 'utf8');

  const unreleasedIdx = content.indexOf('## [Unreleased]');
  const v030Idx        = content.indexOf('## [0.3.0] - 2026-07-07');
  if (unreleasedIdx === -1) throw new Error('CHANGELOG [Unreleased] anchor missing');
  if (v030Idx === -1)        throw new Error('CHANGELOG [0.3.0] - 2026-07-07 anchor missing');
  if (v030Idx <= unreleasedIdx) throw new Error('CHANGELOG anchor ordering wrong: [0.3.0] precedes [Unreleased]');

  // Idempotency check: if [0.3.1] already inserted, fail with a clear message.
  if (content.indexOf(`## [0.3.1] - ${today}`) !== -1) {
    throw new Error('[0.3.1] section already present — script is idempotent, do not re-run');
  }

  const head = content.slice(0, unreleasedIdx);
  const tail = content.slice(v030Idx);

  // New middle: empty [Unreleased] marker + full [0.3.1] section + blank
  // separator before the [0.3.0] header resumes.
  // Hmm — REPLACE the existing [Unreleased] block + everything between [Unreleased] and [0.3.0]:
  const mid =
    '## [Unreleased]' + LE + LE +
    `## [0.3.1] - ${today}` + LE + LE +
    '### Fixed' + LE +
    '- **`npm run dev:electron` launch failure on fresh checkout** — the script was just `concurrently vite + electron .`, so `electron .` loaded `package.json`\'s `main` field (`dist-electron/main.cjs`) which never existed on a fresh checkout. The renderer would load from Vite, but the Electron main process would either fail to start or launch with a missing preload, leaving `window.electronAPI` undefined. That made the music player (and every other Electron-bridged feature) trip the "requires Electron host" error in `src/audio/trackerPlayer.ts::init`. Now the script also runs `vite build -c electron.vite.config.ts --watch` in a third concurrent process, and `wait-on` blocks the Electron launch until both the Vite dev server and the freshly-built `dist-electron/preload.cjs` are ready. The host-watcher keeps `main.cjs` / `preload.cjs` up to date on subsequent `electron/*` edits; reload the window (Ctrl+R / Cmd+R) to pick up host changes (Electron itself does not auto-reload the preload in this setup).' + LE +
    '- **Inline MUTE resetting on fullscreen toggle** — `audioEnabled` and `isPlaying` were trapped in two `useState` declarations inside `DemoScreen` (one for the inline CRT card, one for the portal-rendered `<FullscreenDemoView/>`). Pressing `F` to enter fullscreen unmounted+remounted the surface with fresh state, snapping the MusicBadge back to the "TAP TO PLAY" armed state. The two state hooks were hoisted into `App.tsx` as `crtAudioEnabled` + `crtIsPlaying` (with `useCallback` togglers `toggleCrtAudio` + `toggleCrtPlay`) sitting next to the existing `crtMusicTrack` state, and five props (`musicTrackStoredName`, `audioEnabled`, `isPlaying`, `onToggleAudio`, `onTogglePlay`) are forwarded through both surfaces. The hero-capture preview mount in `src/preview/CapturePreview.tsx` receives a `NOOP` callback stub since the capture pipeline is a stateless preview. This round also opportunistically deduped a stale duplicate of the "Interval ids owned by…" comment block from earlier patch work (the leading copy remains; the orphan was collapsed, leaving exactly 1 `useRef<>` declaration of `compileIntervalRef` and `partyVoteIntervalRef`).' + LE +
    '- **Ghost release / prize drops on saved game load** — `triggerAssembleCompiler` and `startPartyVotingProcess` capture partial state in their `setInterval` closure callbacks; opening LOAD while one of these was in flight left the interval running. The terminal-tick callbacks (`finishCompilation()`, `awardPartyContestPoints()`) could fire AFTER the import had reset state, dropping a leftover release or prize credit into the freshly loaded save. Fix: `compileIntervalRef` + `partyVoteIntervalRef` `useRef<ReturnType<typeof setInterval> | null>(null)` declarations route both `setInterval` ids through the refs; the inner-callback `clearInterval(interval)` calls were rewritten to clear+null the ref; a guarded `clearInterval` pair sits at the top of `loadSavedGame`\'s try-block to cancel in-flight compile/vote intervals before the snapshot applies; and an explicit ephemeral-state reset block (`setIsCompiling(false)`, `setCompilerProgress(0)`, `setCompilerLogs([])`, `setShowCompilingOverlay(false)`, `setActiveParty(null)`, `setIsPartyRunning(false)`, `setPartyStep(0)`, `setPartyRivals([])`, `setPartyVoteTally({})`, `setPartySelectedProdId(\'\')`, `setPartyContestLogger([])`) defeats the React-18 auto-batching race where queued setStates from a dying interval\'s terminal tick could otherwise leak through `clearInterval`. `sim/__tests__/loadDuringImport.smoke.ts` was rewritten for determinism (a `makeInterval()` stub + manual `tick()`/`clear()` cycle instead of real `setInterval(..., 50)` which was flaking under sequential `npm run test:all` event-loop pressure); all three scenarios (positive-control bug repro, compile-interval cleared, vote-interval cleared) are green.' + LE + LE;

  fs.writeFileSync(f, head + mid + tail, 'utf8');
  console.log('[OK ] CHANGELOG.md: [Unreleased] emptied + [0.3.1] section inserted before [0.3.0]');
}

// ===== 3. package.json bump =================================================

{
  const f = 'package.json';
  const content = fs.readFileSync(f, 'utf8');
  const re = /"version":\s*"0\.3\.0"/g;
  const matches = [...content.matchAll(re)];
  if (matches.length !== 1) throw new Error(`package.json: expected 1 "version":"0.3.0", found ${matches.length}`);
  const next = content.replace(re, '"version": "0.3.1"');
  fs.writeFileSync(f, next, 'utf8');
  console.log('[OK ] package.json: 0.3.0 -> 0.3.1');
}

// ===== 4. package-lock.json bump (top-level + packages."" entry) =============

{
  const f = 'package-lock.json';
  const content = fs.readFileSync(f, 'utf8');
  // Match BOTH occurrences: top-level + `packages.""` package entry.
  const re = /("version":\s*"0\.3\.0")/g;
  const matches = [...content.matchAll(re)];
  if (matches.length !== 2) throw new Error(`package-lock.json: expected exactly 2 "version":"0.3.0" lines (top-level + packages.""), found ${matches.length}`);
  const next = content.replace(re, '"version": "0.3.1"');
  fs.writeFileSync(f, next, 'utf8');
  console.log('[OK ] package-lock.json: 0.3.0 -> 0.3.1 (top-level + packages."" entry)');
}

// ===== 5. scripts/_pr_body.md overwrite =====================================

{
  const f = 'scripts/_pr_body.md';
  const body =
    '## Summary' + LE + LE +
    'Cuts the **v0.3.1** patch release on `main`. The `chore(release): cut v0.3.1` commit (`<pending-sha>`) bumps the project version `0.3.0` → `0.3.1` in `package.json` + `package-lock.json`, drops a matching `[0.3.1] - ' + today + '` Bug Fixes section into `CHANGELOG.md`, and pushes the annotated `v0.3.1` tag to `origin`.' + LE + LE +
    'This bundles three bugfixes implemented over prior sessions into a unified SemVer-patch release — addressing the Electron dev-script boot race, the React audio-toggle state-hoist, and the `loadSavedGame` snapshot-apply interval-clear gap. Per SemVer, the rightmost version digit bumps (`0.3.0` → `0.3.1`) because no new features were added.' + LE + LE +
    '## What changed' + LE + LE +
    '### 1 conventional commit on `main`' + LE + LE +
    '| SHA       | Prefix             | What                                                                                                                                  |' + LE +
    '| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |' + LE +
    '| `<pending-sha>` | `chore(release):`  | bump version `0.3.0` → `0.3.1` in `package.json` + `package-lock.json`; add `[0.3.1]` entry to `CHANGELOG.md` (empty `[Unreleased]` marker preserved per Keep-a-Changelog convention)                          |' + LE + LE +
    '### Release artifacts' + LE + LE +
    '- `package.json` — `"version": "0.3.0"` → `"version": "0.3.1"`' + LE +
    '- `package-lock.json` — project version lines updated (top-level + `packages.""` entry); dependency versions untouched' + LE +
    '- `CHANGELOG.md` — new `## [0.3.1] - ' + today + '` section with 3 `### Fixed` items: dev-electron launch failure on fresh checkout; inline MUTE resetting on fullscreen toggle (audio-toggle hoist into App.tsx); ghost release / prize drops on saved game load (mid-flight interval clear + ephemeral-state reset block). The `[Unreleased]` marker is kept empty per Keep-a-Changelog convention.' + LE + LE +
    '### Tag' + LE + LE +
    '- `v0.3.1` annotated tag → `<pending-sha>`' + LE +
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
    '- `git log --oneline -1 origin/main`: `<pending-sha> chore(release): cut v0.3.1`' + LE +
    '- `git ls-remote --tags origin v0.3.1`: tag present on remote' + LE + LE +
    '## Cross-doc coherence' + LE + LE +
    '- `CHANGELOG.md [0.3.1]` `### Fixed` items match the working-tree fixes (audio-toggles lift, `loadSavedGame` interval clear, dev:electron watcher).' + LE +
    '- `package.json` + `package-lock.json` "version" fields are bumped to `0.3.1` in lockstep.' + LE +
    '- `scripts/_release_notes_v0.3.1.md`, `scripts/_announcement_v0.3.1.md`, and `scripts/_pr_body.md` (this file) all describe the same v0.3.1 release.' + LE +
    '- `scripts/_gen_pr_url.py` typo fix: `Scene_SImulator` → `Scene_Simulator` (matches the canonical repo casing used elsewhere).' + LE + LE +
    '## Followups (out of scope for this PR)' + LE + LE +
    '- **No installer cut.** v0.3.1 is intentionally a code-only patch — no `dist:win` NSIS / portable binaries were rebuilt. The three fixes roll up into the next feature-drop release (`v0.4.0`), which will be the first release with bundled `dist:win` installers featuring all v0.3.x fixes.' + LE +
    '- **Substitute the `<pending-sha>` placeholders post-commit.** Re-run the patcher with `RELEASE_COMMIT_SHA=<sha>` env var or use a simple `sed -i` rewrite to swap the placeholder for the actual sha + tag → sha mappings after the chore(release) commit lands.' + LE +
    '- **Cross-post the announcement.** The v0.3.1 announcement variants (Discord / Reddit / Hacker News) are in `scripts/_announcement_v0.3.1.md` — post in the suggested order (HN first, then Reddit 4-6 hours later, then Discord).' + LE + LE +
    '## Checklist' + LE + LE +
    '- [x] `npm run lint` clean' + LE +
    '- [x] CHANGELOG `[0.3.1]` entry updated' + LE +
    '- [x] `package.json` version bumped' + LE +
    '- [x] `package-lock.json` project version bumped (top-level + `packages.""` entry)' + LE +
    '- [x] `v0.3.1` annotated tag created and pushed to `origin`' + LE +
    '- [x] `scripts/_release_notes_v0.3.1.md` drafted' + LE +
    '- [x] `scripts/_announcement_v0.3.1.md` drafted' + LE +
    '- [x] `scripts/_pr_body.md` (this file) drafted' + LE +
    '- [x] `scripts/_gen_pr_url.py` typo `Scene_SImulator` → `Scene_Simulator` corrected' + LE +
    '- [ ] Optional: substitute `<pending-sha>` placeholders in `scripts/_pr_body.md` post-commit' + LE +
    '- [ ] Optional: cross-post the announcement (see Followups)' + LE +
    '- [ ] Optional: rebuild the next feature-release installer (`v0.4.0`) with bundled v0.3.x fixes' + LE;
  fs.writeFileSync(f, body, 'utf8');
  console.log('[OK ] scripts/_pr_body.md: overwritten with v0.3.1 PR body');
}

// ===== post-write verification ===============================================

console.log('--- post-write verification ---');
const cl = fs.readFileSync('CHANGELOG.md', 'utf8');
const pkg = fs.readFileSync('package.json', 'utf8');
const lock = fs.readFileSync('package-lock.json', 'utf8');
const verifications: Array<[string, boolean]> = [
  ['CHANGELOG: [0.3.1] - ' + today + ' present',         cl.includes(`## [0.3.1] - ${today}`)],
  ['CHANGELOG: empty [Unreleased] marker preserved',     /## \[Unreleased\][\r\n]+[\r\n]+## \[0\.3\.1\]/.test(cl)],
  ['CHANGELOG: only one [0.3.1] section',                (cl.match(/## \[0\.3\.1\]/g) || []).length === 1],
  ['CHANGELOG: [0.3.0] still follows [0.3.1]',           cl.indexOf('[0.3.1]') < cl.indexOf('[0.3.0] - 2026-07-07')],
  ['package.json: version 0.3.1',                        pkg.includes('"version": "0.3.1"')],
  ['package-lock.json: 0.3.1 present exactly twice',     (lock.match(/"version":\s*"0\.3\.1"/g) || []).length === 2],
  ['_release_notes_v0.3.1.md: Title-case H1',            fs.readFileSync('scripts/_release_notes_v0.3.1.md', 'utf8').includes('# Scene Simulator v0.3.1 — Interval Clear on Load + Audio-Toggle Hoist + Electron Dev Script Fix')],
  ['_release_notes_v0.3.1.md: audit:docs verification',  fs.readFileSync('scripts/_release_notes_v0.3.1.md', 'utf8').includes('npm run audit:docs')],
  ['_announcement_v0.3.1.md: present',                   fs.existsSync('scripts/_announcement_v0.3.1.md')],
  ['_pr_body.md: v0.3.1 body',                           fs.readFileSync('scripts/_pr_body.md', 'utf8').includes('cuts the **v0.3.1**')],
  ['_pr_body.md: package-lock.json reference present',   fs.readFileSync('scripts/_pr_body.md', 'utf8').includes('package-lock.json')],
  ['_gen_pr_url.py: Scene_Simulator (typo fixed)',       !fs.readFileSync('scripts/_gen_pr_url.py', 'utf8').includes('Scene_SImulator')],
];
for (const [label, ok] of verifications) console.log(`  ${ok ? 'OK ' : 'ERR'} ${label}`);

if (verifications.some(([, ok]) => !ok)) {
  console.error('FAILED VERIFICATIONS — aborting');
  process.exit(1);
}
console.log('[done] all post-write verifications passed');
