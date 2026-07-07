## Summary

Cuts the **v0.3.0** release on `main`. The `chore(release): cut v0.3.0` commit (`1676dfc`) bumps the project version `0.2.0` → `0.3.0` in `package.json` and `package-lock.json`, adds a matching `[0.3.0] - 2026-07-07` entry to `CHANGELOG.md`, and pushes the annotated `v0.3.0` tag to `origin`.

The feature work that v0.3.0 represents (tracker-music player, JSON-driven content, DevTools surface, multi-category scoring engine) is staged in the working tree and tracked in the v0.3.0 changelog entry. The next step is to commit those changes as a separate feature PR (see "Followups" below).

## What changed

### 1 conventional commit on `main`

| SHA       | Prefix             | What                                                                                                                                  |
| --------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| `1676dfc` | `chore(release):`  | bump version `0.2.0` → `0.3.0` in `package.json` + `package-lock.json`; add `[0.3.0]` entry to `CHANGELOG.md`                          |

Plus 1 remote-only commit that was rebased in during the push (`4cacacc` — "Add GitHub Actions workflow for Node.js with Webpack", which had been pushed to `origin/main` ahead of local).

### Release artifacts

- `package.json` — `"version": "0.2.0"` → `"version": "0.3.0"`
- `package-lock.json` — project version lines updated (root + `packages.""` entry); dependency versions untouched
- `CHANGELOG.md` — new `## [0.3.0] - 2026-07-07` section with Added / Changed / Fixed subsections covering: tracker-music player (chiptune3 AudioWorklet + custom worklet:// protocol), data migration to JSON + Zod validation, DevTools surface, multi-category scoring engine + Artistic Directions + Effect Synergies, DemoSummary modal

### Tag

- `v0.3.0` annotated tag → `1676dfc`
- Message: `v0.3.0 — tracker-music player + JSON-driven content + multi-category scoring`
- Pushed to `origin` alongside the commit

### Companion release-process artifacts (this PR)

- `scripts/_release_notes_v0.3.0.md` — full release notes (Highlights / What's New / What Changed / What Was Removed / Bug Fixes / Upgrade Notes / Verification)
- `scripts/_announcement_v0.3.0.md` — Discord / Reddit / Hacker News post variants
- `scripts/_pr_body.md` — this file

## Validation

- `npm run lint` (tsc --noEmit): exit 0
- `git tag -l 'v0.*' --sort=-v:refname`: `v0.3.0`, `v0.2.0`, `v0.1.0` (linear)
- `git log --oneline -1 origin/main`: `1676dfc chore(release): cut v0.3.0`
- `git ls-remote --tags origin v0.3.0`: tag present on remote

## Cross-doc coherence

- `CHANGELOG.md [0.3.0]` Added / Changed / Fixed sections match the working-tree diff (audio / content / devtools / scoring).
- `package.json` "version" field is the single source of truth; `package-lock.json` mirrors it on the root + `packages.""` lines.
- `scripts/_release_notes_v0.3.0.md`, `scripts/_announcement_v0.3.0.md`, and `scripts/_pr_body.md` (this file) all describe the same v0.3.0 release.

## Followups (out of scope for this PR)

- **Commit the staged v0.3.0 feature work.** The audio player, content management, DevTools, and scoring-engine changes are currently sitting in the working tree (untracked + modified). They should be reviewed, possibly split into thematic commits, and committed as the next PR. Suggested conventional commit prefixes:
  - `feat(audio):` for the chiptune3 worklet + IPC + `MusicPlayer` + `PlaylistManager`
  - `feat(content):` for the JSON loader + Zod validation + `ContentStore` / `useContentStore`
  - `feat(devtools):` for the `?dev=1` editor shell + `DevMenu` + `BbsEditor` + `ScenerEditor`
  - `feat(scoring):` for the multi-category engine + artistic directions + synergies + judging profiles
  - `feat(ui):` for the `DemoSummary` modal
  - `test(migration):` for the `data_migration.smoke.ts` round-trip pin
- **Tag the next release as v0.3.1 or v0.4.0** depending on how big the staged work turns out to be. v0.3.1 if it lands incrementally; v0.4.0 if it's a major feature drop.
- **Build installers.** Once the staged work is committed, run `npm run dist:win` to produce the NSIS + portable installers for the next release tag.
- **Cross-post the announcement.** The v0.3.0 announcement variants (Discord / Reddit / Hacker News) are in `scripts/_announcement_v0.3.0.md` — post in the suggested order (HN first, then Reddit 4-6 hours later, then Discord).
- **Refresh `scripts/_gen_pr_url.py`.** It still points at the v0.2.0 seed-inversion feature branch (`feature/v0.2.0-seed-inversion`). Either delete it (the v0.3.0 release is a `main`-only commit, no feature-branch PR) or repoint it to a future v0.3.0-feature PR branch.

## Checklist

- [x] `npm run lint` clean
- [x] CHANGELOG `[0.3.0]` entry updated
- [x] `package.json` version bumped
- [x] `package-lock.json` project version bumped
- [x] `v0.3.0` annotated tag created and pushed to `origin`
- [x] `scripts/_release_notes_v0.3.0.md` drafted
- [x] `scripts/_announcement_v0.3.0.md` drafted
- [x] `scripts/_pr_body.md` (this file) drafted
- [ ] Optional: commit the staged v0.3.0 feature work
- [ ] Optional: tag v0.3.1 (or v0.4.0) once the staged work lands
- [ ] Optional: build NSIS + portable installers
- [ ] Optional: cross-post the announcement
- [ ] Optional: refresh / delete `scripts/_gen_pr_url.py`
