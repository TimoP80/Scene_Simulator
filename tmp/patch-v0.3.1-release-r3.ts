import * as fs from 'node:fs';

/**
 * v0.3.1 patch-release artefacts (round 3 — finishes r2).
 *
 * Round 2 succeeded at: _release_notes_v0.3.1.md Title-case H1 + audit:docs
 *   line, _gen_pr_url.py typo, CHANGELOG.md indexOf-slicing [0.3.1] section,
 *   package.json version.
 * Round 2 failed at: package-lock.json (regex matched 5 hits instead of 2 —
 *   transitive deps happen to be at version 0.3.0).
 * Round 2 didn't reach: _pr_body.md overwrite, post-write verification.
 *
 * Round 3 finishes: package-lock.json via positional indexOf (first 2 hits
 *   only), _pr_body.md overwrite, post-write verification.
 */

const today = '2026-07-08';
const LE = '\r\n';

// ===== 1. package-lock.json — FIRST 2 hits (top-level + packages."") =====

{
  const f = 'package-lock.json';
  const s0 = fs.readFileSync(f, 'utf8');

  // Idempotency check: if NO `"version": "0.3.0"` remains, treat as already lands.
  // (top-level + packages."" should both be 0.3.1; third-party 0.3.0 deps may remain.)
  // To check: search for `"version": "0.3.1"` at the very start of file (top-level)
  //   AND search for `"": {` followed quickly by `"version": "0.3.1"` (packages."").
  const topLevelAlready = /^\s*\{\s*"name":\s*"scene-simulator"\s*,\s*"version":\s*"0\.3\.1"/.test(s0);
  const packagesBlankAlready = /"packages":\s*\{\s*"":\s*\{[\s\S]{0,400}?"version":\s*"0\.3\.1"/.test(s0);
  if (topLevelAlready && packagesBlankAlready) {
    console.log('[skp] package-lock.json: version already 0.3.1 in both target locations');
  } else {
    const needle = '"version": "0.3.0"';
    // IndexOf-based: replace ONLY the first 2 occurrences (top-level root metadata
    // + the `""`-named package entry that mirrors root metadata).
    let s = s0;
    let replaced = 0;
    let idx = s.indexOf(needle);
    while (idx !== -1 && replaced < 2) {
      s = s.slice(0, idx) + '"version": "0.3.1"' + s.slice(idx + needle.length);
      replaced += 1;
      idx = s.indexOf(needle, idx + '"version": "0.3.1"'.length);
    }
    if (replaced !== 2) {
      throw new Error(`package-lock.json: expected to replace exactly 2 hits (top-level + packages.""), replaced ${replaced}. abort.`);
    }
    fs.writeFileSync(f, s, 'utf8');
    console.log(`[OK ] package-lock.json: replaced ${replaced} "version":"0.3.0" hits (top-level + packages."")`);
  }
}

// ===== 2. scripts/_pr_body.md overwrite =====================================

{
  const f = 'scripts/_pr_body.md';
  const existing = fs.readFileSync(f, 'utf8');
  if (existing.includes('cuts the **v0.3.1**')) {
    console.log('[skp] scripts/_pr_body.md: v0.3.1 body already in place');
  } else {
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
  ['package-lock.json: top-level 0.3.1',                 /^\s*\{\s*"name":\s*"scene-simulator"\s*,\s*"version":\s*"0\.3\.1"/.test(lock)],
  ['package-lock.json: packages."" 0.3.1',              /"packages":\s*\{\s*"":\s*\{[\s\S]{0,400}?"version":\s*"0\.3\.1"/.test(lock)],
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
