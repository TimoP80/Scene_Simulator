# Release Process

This document captures the canonical "cut a release" workflow for the Demoscene Simulator. It's anchored in the `v0.3.0` → `v0.3.1` cycle and intended to be a self-contained runbook for maintainers cutting future releases (`v0.4.0`, `v0.4.1`, …).

> **Codex for first-time maintainers:** Read [`CONTRIBUTING.md`](../CONTRIBUTING.md) for the day-to-day dev loop, [`docs/architecture.md`](./architecture.md) for the three-layer rule, then come back here for the release workflow.

---

## Why two PRs per release (and why `vN..vN+1` compare link shows only docs + version)

Every `v0.3.x` release so far has followed the same two-commit shape:

1. **`chore(release): cut vN+1` commit on main** — bumps `package.json` + `package-lock.json`, adds the `[vN+1] - YYYY-MM-DD` section to `CHANGELOG.md`, and updates the release-process artefacts (this file, `scripts/_release_notes_vN+1.md`, `scripts/_announcement_vN+1.md`, `scripts/_pr_body.md`). Thin, atomic, tageable.
2. **Annotated tag + push + `gh release create`** — the GitHub Release page is materialised via `scripts/_release_notes_vN+1.md`. The tag annotation message mirrors the commit message: `vN+1 — <one-line tagline>`.
3. **Follow-up PR (the `fix:` / `feat:` work that the CHANGELOG entry claims shipped)** — the *production-code* changes (src/, sim/, electron/) that the `[vN+1] - YYYY-MM-DD` entry describes as already-shipped are usually sitting in the working tree at chore(release) time. They land in a separate branch + PR after the tag, branched off the chore(release)'s `main` HEAD.

If you `git log v0.3.0..v0.3.1`, you see one commit:

```sh
$ git log --oneline v0.3.0..v0.3.1
d7dca17 chore(release): cut v0.3.1 — interval clear on load + audio-toggle ...
```

And the GitHub compare link `https://github.com/TimoP80/Scene_Simulator/compare/v0.3.0...v0.3.1` shows 7 files changed: `CHANGELOG.md` + `package.json` + `package-lock.json` + `scripts/_pr_body.md` + `scripts/_release_notes_v0.3.1.md` + `scripts/_announcement_v0.3.1.md` + `scripts/_gen_pr_url.py` (the typo fix). No `src/` diff. That is INTENTIONAL — see [§3 Follow-up PR](#3-follow-up-pr-the-fixes) below.

### Why this pattern

The chore(release) commit isolates release-artifact changes from production-code changes:

- **Tag immutability.** Once `git tag -a vN+1` lands, the tag points at a SHA whose only contents are docs/version/artefacts. Anyone running `npm install` against that tag gets the release exactly as advertised.
- **Clean diff for consumers.** `vN..vN+1` compare link is conservative: "here's what's new in your installed package." Adding src/ diffs at chore(release) time would muddy this signal.
- **Cheap rollbacks.** If a release needs to be reverted semantically, revert the chore(release) commit without touching `src/`, then cherry-pick fixes into the next cycle.
- **Forced separation of concerns.** The maintainer consciously decides which changes go into the tag (artefacts) vs the fix() follow-up (production code). No accidental `git add -A` slipping src/ into a release commit.

The trade-off: the `CHANGELOG [vN+1]` entry is forward-looking until the follow-up PR merges — it describes what the install WILL look like after the follow-up ships, not what the tag install looks like today. Maintainers writing CHANGELOG entries should phrase the body in present tense ("the production compile…" / "…drops a leftover release…") because the entry sticks around past the merge.

### Worked example: `v0.3.0` (full-feature release)

| Stage | Commit | Contents |
| --- | --- | --- |
| chore(release) | `1676dfc chore(release): cut v0.3.0` | docs + version + 6 release-process artefacts |
| Tag | `v0.3.0` ↔ `1676dfc` | annotated, message `v0.3.0 — tracker-music player + JSON-driven content + multi-category scoring` |
| gh release | https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.0 | materialised from `scripts/_release_notes_v0.3.0.md` |
| Follow-up | (deferred — the v0.3.0 doc explicitly listed "Commit the staged v0.3.0 feature work" as a follow-up; the v0.3.1 frame was used to ship the cumulative bundle) | `feat(audio)` + `feat(content)` + `feat(devtools)` + `feat(scoring)` + `feat(ui)` |

### Worked example: `v0.3.1` (patch release)

| Stage | Commit | Contents |
| --- | --- | --- |
| chore(release) | `d7dca17 chore(release): cut v0.3.1 — interval clear on load + audio-toggle hoist + electron dev script fix` | docs + version + 6 release-process artefacts (+ the `_gen_pr_url.py` `Scene_SImulator` → `Scene_Simulator` typo fix) |
| Tag | `v0.3.1` ↔ tag-object SHA `4bd61034...` | annotated, message mirrors the commit |
| gh release | https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.1 | materialised from `scripts/_release_notes_v0.3.1.md` |
| Follow-up | (deferred — fix() PR after this release to land the audio-toggle hoist, `loadSavedGame` interval-clear, dev:electron watcher) | `feat(ui): lift crtAudioEnabled/crtIsPlaying to App.tsx` + `fix(load): clear mid-flight intervals on loadSavedGame` + `test(load): deterministic loadDuringImport smoke` |

---

## 1. Cutting the `chore(release): cut vN+1` commit

### Files to author at cut time

| File | Purpose |
| --- | --- |
| `CHANGELOG.md` | New `## [vN+1] - YYYY-MM-DD` section, empty `[Unreleased]` marker preserved per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/). Insert just below `[Unreleased]`, above the previous release. |
| `package.json` | Bump `"version"` from `vN.0` → `vN+1.0` (or `vN.0.x` → `vN.0.x+1` for patches). Use today's date for `## [vN+1]`. |
| `package-lock.json` | Bump the project `"version"` field for the top-level root metadata AND the `packages.""` entry. See [§5 Edge cases](#5-edge-cases). |
| `scripts/_release_notes_vN+1.md` | Full release notes (Highlights / What's New / What Changed / Bug Fixes / Upgrade Notes / Verification). Mirror `scripts/_release_notes_v0.3.0.md` as the canonical template. |
| `scripts/_announcement_vN+1.md` | Three platform-specific variants (Discord / Reddit / Hacker News) + posting tips + cross-post order. Mirror `scripts/_announcement_v0.3.0.md` as the canonical template. |
| `scripts/_pr_body.md` | The PR-body markdown for the chore(release) commit. Mirrors the same shape. Section order: **Summary** / **What changed** / **Release artifacts** / **Tag** / **Companion release-process artifacts** / **Validation** / **Cross-doc coherence** / **Followups** / **Checklist**. |

> Incidental quality fixes to the actual release-process tooling ITSELF can ride along in `chore(release). The v0.3.1 cycle did exactly this: the `scripts/_gen_pr_url.py` `Scene_SImulator` → `Scene_Simulator` repo-casing typo fix was a 7th file in the `d7dca17` commit because touching release-process tooling upstreams the next release's PR-quality. If the typo fix would otherwise race the next PR's release-process edits, prefer the chore(release) ride-along.

### Bash sequence

```sh
# 0. Verify working tree
git checkout main
git pull --rebase
git status --short                # the only modifications expected are the release-process
                                   # artefacts above. If you see src/ changes here, those
                                   # belong in a fix() follow-up PR AFTER the tag,
                                   # NOT in this chore(release) commit.

# 1. Stage exactly the release-process artefacts (do NOT `git add -A`)
git add \
  CHANGELOG.md \
  package.json \
  package-lock.json \
  scripts/_pr_body.md \
  scripts/_release_notes_vN+1.md \
  scripts/_announcement_vN+1.md

# 2. Commit
git commit \
  -m "chore(release): cut vN+1 — <one-line tagline matching tag message>"

# 3. Verify (the compare-link should now look right)
git log --oneline -1
grep '^\## \[' CHANGELOG.md       # confirm [vN+1] - YYYY-MM-DD header is present
grep '"version":' package.json     # confirm top-level + packages."" both bumped
ls scripts/_release_notes_vN+1.md scripts/_announcement_vN+1.md  # both present
git diff --stat HEAD~1             # confirm only the 6 expected files are in the diff
```

> **Commit / tag message convention:** `vN+1 — <one-line tagline of fixes or features>`. Mirrors across commit message, tag annotation message, and the `### Tag` block in `scripts/_pr_body.md`. Lowercase after the em-dash to match `v0.3.0` / `v0.3.1`. If your shell or editor substitutes U+2014 em-dashes for hyphens, that's cosmetic — `git commit --amend` and `git tag -f` can fix it pre-push (DON'T amend post-push once the tag is on origin).

### Pre-flight: smoke the gate from a clean clone

Avoid letting a broken chore(release) ship:

```sh
npm ci                  # clean install against the version bump
npm run lint            # tsc --noEmit green
npm run test:all        # all smoke suites green
npm run audit:docs      # doc/sim parity green
npm run build           # renderer bundle clean
```

If `git diff --stat HEAD~1` lists more than the 6 release-process artefacts, abort — the chore(release) should not contain src/ work.

---

## 2. Tagging, pushing, materialising the GitHub Release

```sh
# 1. Tag (annotated, mirrored message)
git tag -a vN+1 \
  -m "vN+1 — <same one-line tagline as commit message>"

# 2. Push
git push origin main             # uploads the chore(release) commit
git push origin vN+1             # uploads the annotated tag

# 3. Materialise the GitHub Release page
gh release create vN+1 \
  --title "vN+1" \
  --notes-file scripts/_release_notes_vN+1.md

# 4. Sanity-check
git ls-remote --tags origin vN+1     # tag present on remote
gh release view vN+1 --json name,tagName,url,publishedAt
```

If `gh` OAuth is invalid (per the long-standing comment in `scripts/_gen_pr_url.py`), the `gh release create` step will fail with `gh: not authenticated`. Either refresh OAuth via `gh auth login --web`, OR fall back to the [GitHub web fallback](https://github.com/TimoP80/Scene_Simulator/releases/new?tag=vN+1) and paste `scripts/_release_notes_vN+1.md` content into the release body manually.

---

## 3. Follow-up PR (the fixes)

The production-code work that the `CHANGELOG [vN+1]` entry mentions is *NOT* in the tagged commit. Branch off the post-chore(release) `main` HEAD, group the fixes into thematic conventional commits, and open a PR against `main`.

```sh
# 1. Branch off latest main (currently == tag HEAD)
git checkout -b fix/vN+1-fixes main

# 2. Add the actual production-code files
git add src/ sim/ electron/ packages/types/ packages/utils/ ...

# 3. Group into thematic commits (example shape for the v0.3.1 follow-up)
git commit -m "feat(ui): lift crtAudioEnabled/crtIsPlaying to App.tsx"
git commit -m "feat(ui): forward 5 lifted props through DemoScreen + CapturePreview"
git commit -m "fix(load): clear mid-flight intervals on loadSavedGame"
git commit -m "fix(load): explicit ephemeral-state reset to defeat React-18 batching race"
git commit -m "test(load): deterministic loadDuringImport smoke rewrite"

# 4. Push the branch
git push origin fix/vN+1-fixes

# 5. Open the PR
gh pr create \
  --base main \
  --head fix/vN+1-fixes \
  --title "fix: bundle vN+1 deferred production-code changes" \
  --body "Follows up on the chore(release): cut vN+1 commit. ..."
```

Once the PR merges, the `CHANGELOG [vN+1]` entry becomes fully truthful end-to-end: `vN..vN+1` still shows thin diffs (just artefacts) but `vN..main` shows both artefacts AND the fixes.

### What goes into the chore(release) vs the fix() follow-up

| Always chore(release) | Always fix() follow-up | Rare-in-chore(release)-if-gating-required |
| --- | --- | --- |
| `CHANGELOG.md` | `src/App.tsx`, `src/components/**`, `src/preview/**` | `docs/release-process.md` itself (shipped via doc-write in the v0.3.1 cycle) |
| `package.json` | `sim/**` reducer / event / domain / projection changes | `electron/settings.ts` schema-version bumps IF the bump is the headline of the release (the v0.3.0 `v1 → v2` schema bump shipped in the chore(release) tag — the bump was the release's headline) |
| `package-lock.json` | `electron/main.ts`, `electron/preload.ts` (production code only) | `sim/__tests__/*.ts` NEW smoke files IF the smoke gates `npm run test:all` from blocking release (the v0.3.0 `data_migration.smoke.ts` shipped in the chore(release) tag alongside the migration it pins) |
| `scripts/_release_notes_vN+1.md` | `packages/types/src/*.ts` sim-shape additions | Incidental quality fixes to release-process tooling (e.g. `scripts/_gen_pr_url.py` repo-casing typo) — see §1 note above |
| `scripts/_announcement_vN+1.md` | `sim/__tests__/*.ts` rewrites of EXISTING smokes (deterministic test fix → fix()) | |
| `scripts/_pr_body.md` | | |

> The third column is a "use your judgment" carve-out. Default to fix() follow-up; ship in chore(release) ONLY when (a) the release's headline IS the carve-out content, or (b) the carve-out gates `npm run test:all` from going green on the release tag. If you're not sure, pick fix().

#### Pre-push boundary check

Before pushing the fix() PR, verify the diff is sane:

```sh
# Branched off main AFTER the chore(release) commit — your branch's
# main-base shows NOTHING for the release-process artefacts.
git fetch origin
git diff --stat origin/main...HEAD
# Expected: only src/ + sim/ + electron/ + packages/ files appear.
# If CHANGELOG.md / package.json / package-lock.json / scripts/_release_notes_vN+1.md /
#    scripts/_announcement_vN+1.md / scripts/_pr_body.md appear, you branched off
#    PRE-chore(release) main. Fix: `git rebase --onto <chore-release-commit-sha> origin/main`
#    and re-check.
```

If you find yourself about to add a `src/` file to a `chore(release)` diff, that's a smell. Make the chore(release), proceed to [§2](#2-tagging-pushing-materialising-the-github-release), then land the src/ work in fix() afterwards.

---

## 4. Optional but recommended polish

After [§2](#2-tagging-pushing-materialising-the-github-release) successfully pushes to origin, but BEFORE the [§3](#3-follow-up-pr-the-fixes) follow-up PR lands, polish two artefacts that may still hold `<pending-sha>` placeholders or stale branch pointers.

### `scripts/_pr_body.md` SHA placeholders

If you wrote `scripts/_pr_body.md` BEFORE the chore(release) commit landed, the four `<pending-sha>` placeholders will still be in the on-disk file. They map to:

- Commit SHA appears at the **Summary**'s commit-SHA reference, the **What changed** table row, and the **`git log --oneline -1 origin/main`** validation line — 3 occurrences.
- Tag-object SHA appears at the **### Tag** list line `"\`vN+1\` annotated tag → <sha>"` — 1 occurrence.

Substitute AFTER push using `sed`, an `npx tsx` patcher, or the `RELEASE_COMMIT_SHA` env-var of any local helper. **Do NOT `git commit --amend` to fold the substitution back into the chore(release) commit** — once the tag is cut, amending invalidates the tag's tag-object SHA. Substitute as a working-tree change and commit on a docs-fix branch (e.g. `docs/vN+1-pr-body-polish`).

### `scripts/_gen_pr_url.py` branch pointer refresh

After the v0.3.1 cycle, repoint `HEAD_BRANCH` + `PR_TITLE` to the next upcoming prep branch (`feature/v0.4.0-prep` or whatever `v0.4.0` prep work lands on). The `REPO_NAME` constant carries the canonical `Scene_Simulator` casing — keep it that way (the v0.2.0-era `Scene_SImulator` typo was corrected in v0.3.1).

---

## 5. Edge cases

### `package-lock.json` has multiple `"version": "<x.y.z>"` occurrences

The npm-v3 lockfile opens with:

```json
{
  "name": "<project>",
  "version": "<x.y.z>",
  "lockfileVersion": 3,
  "requires": true,
  "packages": {
    "": { "name": "<project>", "version": "<x.y.z>", ... },
    "node_modules/<dep>": { ... }
  }
}
```

The first **two** `"version": "x.y.z"` strings are always the top-level root + the `packages.""` entry that mirrors it. Third-party transitive deps happen to be at version `x.y.z` occasionally (e.g. some library at exactly `0.3.0`), but they appear later under the corresponding `packages["node_modules/<dep>"]` block.

Bump ONLY the first two. A simple `s.match(/"version": "0.3.0"/g).length === 2` check works, but bump with a regex that takes the **first two** matches — the positional `String.indexOf` + slice approach is the most robust. The third-party `0.3.0` deps stay untouched.

### `<pending-sha>` placeholders in `scripts/_pr_body.md`

Substitution rule:

- The v0.3.1 working file (`scripts/_pr_body.md` after the chore(release) commit) had 6 total `<pending-sha>` occurrences: 4 actual placeholder slots (Summary / conventional-commit table row / Tag list line / `git log --oneline -1 origin/main` validation line) + 2 docs-text mentions in `### Followups` + `## Checklist` describing `<pending-sha>` to the reader. Both kinds match a naïve indexOf loop.
- Substitution mapping: 3 commit-context lines → chore(release) commit SHA, 1 tag-context line → tag-object SHA, 2 docs-text mentions → whichever SHA the loop lands on (the result is mildly nonsensical, see [§4](#4-optional-but-recommended-polish) on post-push polish).
- Run the substitution post-push. Your patcher should assert the literal SHA strings it's substituting in (avoid regex / substring tricks that could double-substitute the 2 docs-text mentions). The v0.3.1 substituter (in the stopped `tmp/patch-pr-body-sha.ts`, deleted post-use) handled 5 commit SHA + 1 tag SHA for the v0.3.1 working file's 6 `<pending-sha>` occurrences via `find / replace / assert` loops.

### `git push` requires auth

If `git ls-remote --tags origin vN+1` shows nothing after your push, you don't have push access. Either:

1. Configure SSH (`~/.ssh/config`) with a deploy key for the repo (recommended).
2. Push via HTTPS with [a personal access token](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens).
3. Tag the release locally (`git tag -a vN+1`) and have a maintainer with push access push the tag + chore(release) commit.

### `gh release create` requires OAuth

If `gh` reports `not authenticated`, see [§2 step 3](#2-tagging-pushing-materialising-the-github-release) — either refresh OAuth via `gh auth login --web`, OR fall back to the GitHub releases UI.

### Cross-platform em-dash substitution in commit / tag messages

Windows bash (or certain shell interpolation paths) substitutes Unicode em-dashes (`—`, U+2014) with regular hyphens (`-`) in commit + tag messages. If your chosen tagline uses an em-dash, you may find the repo's commits rendered with `-` instead. Cosmetic only. Pre-push fix: `git commit --amend -m "..."` and `git tag -f vN+1 -m "..."`. Post-push fix is a force-push — don't.

### Tag-object SHA force-push audits

`git tag -f vN+1` post-push DOES NOT propagate to downstream consumers silently. Receivers of the new tag-object SHA vary: `npm view`'s git-tag resolver may show the new SHA, but `git fetch` defaults may keep the older tag-object if the receiver already has it. To do a SAFE in-place retag post-push:

```sh
# 1. Delete the local tag (it still points at the old tag-object)
git tag -d vN+1

# 2. Re-create against the desired commit
git tag -a vN+1 <commit-sha> -m "vN+1 — <tagline>"

# 3. Tell origin to delete-the-old AND push-the-new
git push origin :refs/tags/vN+1      # delete the old tag-object on origin
git push origin vN+1                  # push the new tag-object

# 4. Verify
git ls-remote --tags origin vN+1
```

Then `git fetch --tags --force` on any downstream checkouts that already have the old tag-object. Cosmetic but observable — every commit hash in `gh release view` will now reflect the fix.

### Wrong content in `_release_notes_vN+1.md`

If you spot a typo after push, edit via PR: open a `docs/vN+1-release-notes-typo` branch against `main`, apply the fix, push to origin, and merge. The chore(release) commit is NOT amended. The `gh release` body can be updated retroactively with `gh release edit vN+1 --notes-file scripts/_release_notes_vN+1.md`.

---

## 6. Cross-references

- [`CHANGELOG.md`](../CHANGELOG.md) — canonical record of shipped changes. New releases add new `## [vN+1] - YYYY-MM-DD` sections; `[Unreleased]` marker is kept empty per [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) convention.
- [`CONTRIBUTING.md`](../CONTRIBUTING.md) — first-run dev loop + architecture rules + test layout + PR-template checklist. The dev loop runs all the smoke tests that gate the chore(release) commit.
- [`docs/architecture.md`](./architecture.md) — three-layer rule (`/sim`, `/apps`, `/packages`). The fix() follow-up PR must respect this rule.
- [`scripts/_gen_pr_url.py`](../scripts/_gen_pr_url.py) — one-shot helper that prints a prefilled `/compare/...?expand=1&title=...&body=...` URL for opening a PR. Refresh `HEAD_BRANCH` + `PR_TITLE` to match the next prep branch.
- [`scripts/_release_notes_v0.3.0.md`](../scripts/_release_notes_v0.3.0.md) — canonical release-notes template to mirror (feature-release proportions; the same shape, scaled down, works for patch releases).
- [`scripts/_announcement_v0.3.0.md`](../scripts/_announcement_v0.3.0.md) — canonical announcement template (Discord / Reddit / Hacker News variants) to mirror.
- [`scripts/_pr_body.md`](../scripts/_pr_body.md) — current PR-body markdown for the runtime commit; mirrors the same shape for the next release.

---

## 7. TL;DR checklist (for the maintainer in a hurry)

```sh
# === CUT TIME ===
git checkout main && git pull --rebase
# edit the 6 release-process artefacts + scripts/_gen_pr_url.py + this docs/
git add CHANGELOG.md package.json package-lock.json scripts/_pr_body.md scripts/_release_notes_vN+1.md scripts/_announcement_vN+1.md scripts/_gen_pr_url.py
git commit -m "chore(release): cut vN+1 — <tagline>"

# === TAG + PUSH + RELEASE ===
git tag -a vN+1 -m "vN+1 — <tagline>"
git push origin main && git push origin vN+1
gh release create vN+1 --title "vN+1" --notes-file scripts/_release_notes_vN+1.md

# === POLISH (optional, post-push) ===
git checkout -b docs/vN+1-pr-body-polish main
# substitute <pending-sha> in scripts/_pr_body.md with the 3 commit-SHA + 1 tag-object-SHA
git add scripts/_pr_body.md && git commit -m "docs(release): substitute vN+1 SHA placeholders"
git push origin docs/vN+1-pr-body-polish
gh pr create --base main --head docs/vN+1-pr-body-polish --title "docs(release): substitute vN+1 SHA placeholders"

# === FOLLOW-UP fix() PR (later, separate from doc-polish PR above) ===
git checkout -b fix/vN+1-fixes main
git add <src/ sim/ electron/ files>
git commit -m "fix(...): ..."   # thematic conventional commits
git push origin fix/vN+1-fixes
gh pr create --base main --head fix/vN+1-fixes --title "fix: bundle vN+1 deferred changes" --body "..."

# === CROSS-POST (after tag is on origin) ===
# 1. Hacker News first (Mon/Tue morning US time)
# 2. Reddit 4-6 hours later
# 3. Discord when you have time to engage with responses
```

If you hit any of the edge cases in [§5](#5-edge-cases), back-reference the relevant sub-section before guessing.

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
