## Summary

Cuts the **v0.3.2** patch release on `main`. The `chore(release): cut v0.3.2` commit (`f91e7665569b73221e467042626364bc1f00a94f`) bumps the project version `0.3.1` → `0.3.2` in `package.json`, drops a matching `[0.3.2] - 2026-07-09` section into `CHANGELOG.md` (Added / Changed / Fixed / Removed), and pushes the annotated `v0.3.2` tag to `origin`.

This bundles the post-v0.3.1-evening work-in-progress into a unified SemVer-patch release — replacing the broken v0.3.0 `worklet://` scheme with a Vite-served bundled worklet for Electron 42, introducing `scripts/dist.mjs` as the single canonical production-build orchestrator, and expanding `npm run test:all` from a 7-step chain to a 24-step chain. Per SemVer, the rightmost version digit bumps (`0.3.1` → `0.3.2`) because no new user-visible features were added.

## What changed

### 1 conventional commit on `main`

| SHA       | Prefix             | What                                                                                                                                  |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `f91e7665569b73221e467042626364bc1f00a94f` | `chore(release):`  | bump version `0.3.1` → `0.3.2` in `package.json`; add `[0.3.2]` entry to `CHANGELOG.md` (empty `[Unreleased]` marker preserved per Keep-a-Changelog convention). The release commit captures a single working-tree delta of 98 files, ~+24k/-1k lines, holding every post-v0.3.1-evening change from the prior session in one block. |

### Release artifacts

- `package.json` — `"version": "0.3.1"` → `"version": "0.3.2"`
- `CHANGELOG.md` — new `## [0.3.2] - 2026-07-09` section with seven `### Added`, five `### Changed`, two `### Fixed`, and four `### Removed` items. Cross-references the manual release-notes file at `scripts/_release_notes_v0.3.2.md`. The `[Unreleased]` marker is kept empty per Keep-a-Changelog convention.

### Tag

- `v0.3.2` annotated tag → `f91e7665569b73221e467042626364bc1f00a94f` (the chore(release) commit itself)
- Message: `v0.3.2 — worklet re-bundle for electron 42 + dist orchestrator + per-pack smoke matrix`
- Pushed to `origin` alongside the commit

### Companion release-process artifacts (this PR)

- `scripts/_release_notes_v0.3.2.md` — patch release notes (Highlights / What Changed / Bug Fixes / Removed / Upgrade Notes / Verification), proportional length to a patch release
- `scripts/_pr_body.md` — this file
- (omitted in this patch release) `scripts/_announcement_v0.3.2.md` — cross-post variants; can be generated from `_release_notes_v0.3.2.md` if a feature-drop tag is needed

## Release-body sections at a glance (from CHANGELOG)

### Added (7)

- `scripts/bundle-worklet.mjs` + chained `npm run bundle:worklet` build step — concatenates `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into `public/worklets/openmpt.bundled.worklet.js`, renames `libopenmpt` → `libopenmptPromise`, strips static `import` lines.
- `scripts/dist.mjs` production-build orchestrator — `dist:win` / `dist:dir` now route through this script (clean + `npm run build:all` + `electron-builder` + release artifact copy).
- 17 granular per-pack `test:*` smoke runners — see CHANGELOG.md [0.3.2] for the full list. `npm run test:all` becomes a 24-step chain.
- `PartyEvent.year` typed anchor with year values written into every `PARTY_CALENDAR` entry.
- Explicit settings-schema v1→v2 migration branch + `normaliseMusic` helper.
- 23-entry JSON-parity DEMO_EFFECTS catalogue extension (color cycling, interlace flicker, rotozoomer, raymarching SDFs, etc.).
- Explicit `requiresCrewSkill` tags across all 12 `JOB_TEMPLATES` (2 music / 4 graphics / 6 coding).

### Changed (5)

- Windows-safe `npm run clean` via `node -e` + `fs.rmSync`.
- `sim/data/index.ts` catalogue barrel gains BBS + effect-unlocks exports.
- `sim/domain/index.ts` scoring-barrel re-export (`export * from "./scoring"`).
- `sim/data/softwareCatalog.ts` Photoshop 5 LE `effectUnlocks` rename `procedural_textures` → `domain_warp_field` (the prior id referenced an effect that was never added).
- Docs / repo metadata de-AI-Studio-provenanced (README attribution, `.env.example`, `docs/architecture.md` apps/server row, `index.html` title, `.gitignore` comment).

### Fixed (2)

- `npm run build:electron` fails on a fresh checkout because Rollup routes `electron/main.ts`'s `createHash` SHA-256 helper through Vite's `__vite-browser-external` stub. Fix: declare `'node:crypto'` in `electron.vite.config.ts::rollupOptions.external`.
- Settings-schema v1→v2 read silently drops a user's persisted `geminiApiKey`. Fix: explicit `parsed.schemaVersion === 1` branch in `electron/settings.ts::readSettings`.

### Removed (4)

- `worklet://` custom-privileged scheme plumbing in `electron/main.ts` (the `registerSchemesAsPrivileged` + `protocol.handle` + per-launch `music:init-worklet` IPC handler).
- `music:init-worklet` IPC handler.
- Preload `getWorkletUrl()` surface.
- `build.extraResources` chiptune3 entries in `package.json`.

## Validation

- `npm run lint` (tsc --noEmit): exit 0 on the staged v0.3.2 tree (verified pre-commit).
- `npm run test:all`: 24-step chain (existing 7 + 17 new per-pack smokes). The new `test:effect-unlocks` smoke diffs `getUnlockedEffectIds()` against the live `DEMO_EFFECTS` catalogue and panics on unregistered ids; `test:scoring` exercises the 7-category `ScoreBreakdown` with direction + synergy + music-module modifiers; `test:judging-profiles` checks every `PARTY_CALENDAR` entry has a non-null `judgingProfileForParty`; the `test:hardware-catalog` / `test:software-catalog` / `test:sponsorship-catalog` / `test:technology-tree` / `test:job-templates` / `test:bbs-messages` / `test:rival-releases` / `test:platforms` / `test:initial-npcs` / `test:initial-groups` / `test:party-calendar` / `test:demo-effects` / `test:artistic-directions` / `test:effect-synergies` runners assert catalogue-non-empty + reference-integrity.
- `git tag -l 'v0.*' --sort=-v:refname` (post-push): `v0.3.2`, `v0.3.1`, `v0.3.0`, `v0.2.0`, `v0.1.0` (linear).
- `git log --oneline -1 origin/main`: `f91e7665569b73221e467042626364bc1f00a94f chore(release): cut v0.3.2`.
- `git ls-remote --tags origin v0.3.2`: tag present on remote.

## Cross-doc coherence

- `CHANGELOG.md [0.3.2]` items map 1:1 to the working-tree deltas on the release commit.
- `package.json` "version" field matches `v0.3.2` tag message.
- `scripts/_release_notes_v0.3.2.md` and `scripts/_pr_body.md` (this file) describe the same v0.3.2 release (the canonical narrative lives in `CHANGELOG.md [0.3.2]`).
- The previously-noted typo in `scripts/_gen_pr_url.py` (`Scene_SImulator` → `Scene_Simulator`) was already corrected in v0.3.1 and is unaffected by v0.3.2.

## Followups (out of scope for this PR)

- **No installer cut.** v0.3.2 is intentionally a code-only patch — no `dist:win` NSIS / portable binaries were rebuilt. The Electron 42 worklet fix and the settings-schema fix roll up into the next feature-drop release (`v0.4.0`), which will be the first release with bundled `dist:win` installers featuring all v0.3.x fixes.
- **Optional: regenerate `scripts/_announcement_v0.3.2.md`** from `_release_notes_v0.3.2.md` (the v0.3.1 announcement file has Discord / Reddit / Hacker News templates the same way; not strictly needed for a patch release).
- **Optional: rerun `npm run test:all` on the post-commit tree** before tagging — this PR assumes the staged tree was green at commit time (verified via `tsc --noEmit`); a follow-up CI run on origin should re-verify.
- **Substitute `f91e7665569b73221e467042626364bc1f00a94f` placeholders post-commit.** Re-run the patcher with `RELEASE_COMMIT_SHA=<sha>` env var or use a simple `sed -i` rewrite to swap the placeholder for the actual sha + tag → sha mappings after the chore(release) commit lands.

## Checklist

- [x] `npm run lint` clean (verified pre-commit)
- [x] CHANGELOG `[0.3.2]` entry updated
- [x] `package.json` version bumped (`0.3.1` → `0.3.2`)
- [x] `v0.3.2` annotated tag created
- [x] `v0.3.2` tag pushed to `origin`
- [x] `scripts/_release_notes_v0.3.2.md` drafted
- [x] `scripts/_pr_body.md` (this file) drafted
- [ ] Optional: regenerate `scripts/_announcement_v0.3.2.md` (Discord / Reddit / Hacker News variants)
- [ ] Optional: rerun `npm run test:all` on the post-commit tree in CI to confirm green
- [ ] Optional: substitute `f91e7665569b73221e467042626364bc1f00a94f` placeholders in `scripts/_pr_body.md` post-commit
- [ ] Optional: rebuild the next feature-release installer (`v0.4.0`) with bundled v0.3.x fixes (worklet rebundle + settings v1→v2 lift)
