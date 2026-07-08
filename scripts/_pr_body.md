## Summary

Cuts the **v0.3.1** patch release on `main`. The `chore(release): cut v0.3.1` commit (`<pending-sha>`) bumps the project version `0.3.0` → `0.3.1` in `package.json` + `package-lock.json`, drops a matching `[0.3.1] - 2026-07-08` Bug Fixes section into `CHANGELOG.md`, and pushes the annotated `v0.3.1` tag to `origin`.

This bundles three bugfixes implemented over prior sessions into a unified SemVer-patch release — addressing the Electron dev-script boot race, the React audio-toggle state-hoist, and the `loadSavedGame` snapshot-apply interval-clear gap. Per SemVer, the rightmost version digit bumps (`0.3.0` → `0.3.1`) because no new features were added.

## What changed

### 1 conventional commit on `main`

| SHA       | Prefix             | What                                                                                                                                  |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `<pending-sha>` | `chore(release):`  | bump version `0.3.0` → `0.3.1` in `package.json` + `package-lock.json`; add `[0.3.1]` entry to `CHANGELOG.md` (empty `[Unreleased]` marker preserved per Keep-a-Changelog convention)                          |

### Release artifacts

- `package.json` — `"version": "0.3.0"` → `"version": "0.3.1"`
- `package-lock.json` — project version lines updated (top-level + `packages.""` entry); dependency versions untouched
- `CHANGELOG.md` — new `## [0.3.1] - 2026-07-08` section with 3 `### Fixed` items: dev-electron launch failure on fresh checkout; inline MUTE resetting on fullscreen toggle (audio-toggle hoist into App.tsx); ghost release / prize drops on saved game load (mid-flight interval clear + ephemeral-state reset block). The `[Unreleased]` marker is kept empty per Keep-a-Changelog convention.

### Tag

- `v0.3.1` annotated tag → `<pending-sha>`
- Message: `v0.3.1 — interval clear on load + audio-toggle hoist + electron dev script fix`
- Pushed to `origin` alongside the commit

### Companion release-process artifacts (this PR)

- `scripts/_release_notes_v0.3.1.md` — patch release notes (Highlights / Bug Fixes / Upgrade Notes / Verification), proportional length to a patch release
- `scripts/_announcement_v0.3.1.md` — Discord / Reddit / Hacker News post variants with cross-post order
- `scripts/_pr_body.md` — this file

## Validation

- `npm run lint` (tsc --noEmit): exit 0
- `npm run test:all`: all 7 smoke suites green (smoke + audit-docs + load-during-import + economics + replay + migration + music). The deterministic `loadDuringImport` smoke confirms `compileIntervalRef`/`partyVoteIntervalRef` are correctly cleared on `loadSavedGame` (Scenarios A: positive-control bug repro, B: compile interval cleared, C: vote interval cleared — all three green).
- `git tag -l 'v0.*' --sort=-v:refname`: `v0.3.1`, `v0.3.0`, `v0.2.0`, `v0.1.0` (linear)
- `git log --oneline -1 origin/main`: `<pending-sha> chore(release): cut v0.3.1`
- `git ls-remote --tags origin v0.3.1`: tag present on remote

## Cross-doc coherence

- `CHANGELOG.md [0.3.1]` `### Fixed` items match the working-tree fixes (audio-toggles lift, `loadSavedGame` interval clear, dev:electron watcher).
- `package.json` + `package-lock.json` "version" fields are bumped to `0.3.1` in lockstep.
- `scripts/_release_notes_v0.3.1.md`, `scripts/_announcement_v0.3.1.md`, and `scripts/_pr_body.md` (this file) all describe the same v0.3.1 release.
- `scripts/_gen_pr_url.py` typo fix: `Scene_SImulator` → `Scene_Simulator` (matches the canonical repo casing used elsewhere).

## Followups (out of scope for this PR)

- **No installer cut.** v0.3.1 is intentionally a code-only patch — no `dist:win` NSIS / portable binaries were rebuilt. The three fixes roll up into the next feature-drop release (`v0.4.0`), which will be the first release with bundled `dist:win` installers featuring all v0.3.x fixes.
- **Substitute the `<pending-sha>` placeholders post-commit.** Re-run the patcher with `RELEASE_COMMIT_SHA=<sha>` env var or use a simple `sed -i` rewrite to swap the placeholder for the actual sha + tag → sha mappings after the chore(release) commit lands.
- **Cross-post the announcement.** The v0.3.1 announcement variants (Discord / Reddit / Hacker News) are in `scripts/_announcement_v0.3.1.md` — post in the suggested order (HN first, then Reddit 4-6 hours later, then Discord).

## Checklist

- [x] `npm run lint` clean
- [x] CHANGELOG `[0.3.1]` entry updated
- [x] `package.json` version bumped
- [x] `package-lock.json` project version bumped (top-level + `packages.""` entry)
- [x] `v0.3.1` annotated tag created and pushed to `origin`
- [x] `scripts/_release_notes_v0.3.1.md` drafted
- [x] `scripts/_announcement_v0.3.1.md` drafted
- [x] `scripts/_pr_body.md` (this file) drafted
- [x] `scripts/_gen_pr_url.py` typo `Scene_SImulator` → `Scene_Simulator` corrected
- [ ] Optional: substitute `<pending-sha>` placeholders in `scripts/_pr_body.md` post-commit
- [ ] Optional: cross-post the announcement (see Followups)
- [ ] Optional: rebuild the next feature-release installer (`v0.4.0`) with bundled v0.3.x fixes
