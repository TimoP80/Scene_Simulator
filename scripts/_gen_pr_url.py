"""
One-shot helper that prints a prefilled GitHub PR-creation URL for the
upcoming v0.4.0-prep feature branch.

`gh` is installed in this environment but its OAuth token is invalid, so
`gh pr create` cannot run. As a fallback, we build the equivalent
`/compare/...?expand=1&title=...&body=...` URL that GitHub's web UI
parses into a pre-filled PR form. The user can click the URL, review the
prefilled title + body, and click "Create pull request" to open the PR.

Idempotent: re-running prints the same URL.

After v0.4.0 ships, repoint `HEAD_BRANCH` + `PR_TITLE` + `PR_BODY` to the
v0.4.1 (or v0.5.0) prep branch. See `docs/release-process.md` for the
canonical two-PR release pattern this helper slots into.
"""
from __future__ import annotations

import urllib.parse

REPO_OWNER = "TimoP80"
REPO_NAME = "Scene_Simulator"   # canonical casing — the v0.2.0-era "Scene_SImulator" typo was corrected in v0.3.1
BASE_BRANCH = "main"
HEAD_BRANCH = "feature/v0.4.0-prep"

PR_TITLE = "feat(v0.4.0): bundle v0.3.1 deferred fixes + v0.4.0 prep work"

PR_BODY = """## Summary

Prepares the v0.4.0 release cycle. This PR lands the v0.3.1 deferred
production-code fixes (audio-toggle hoist into App.tsx, deterministic
`loadDuringImport` smoke rewrite, dev:electron watcher fix) plus the
v0.4.0-prep cleanups that have been sitting in the working tree since
the v0.3.1 `chore(release)` commit landed.

Follows the canonical two-PR release pattern documented in
`docs/release-process.md`:

1. `chore(release): cut v0.4.0` (commit + tag + gh release) is THIN — only
   the v0.4.0 release-process artefacts + version bump are in that
   commit. The compare link `v0.3.1...v0.4.0` will show ONLY docs +
   version + scripts.
2. THIS PR (`fix: bundle v0.3.1 deferred fixes + v0.4.0 prep work`)
   bundles the production-code work that the `CHANGELOG [v0.4.0]` entry
   references. Once merged, `v0.3.1...main` shows both artefacts AND the
   fixes.

## What changed

### Conventional commits, in order from oldest to newest

After the PR is opened, fill in this table with the actual commit SHAs
once they're known (re-run with `RELEASE_COMMIT_SHAS="<sha1>,<sha2>..."`
env var if the helper supports it; otherwise `sed` the table inline).

| SHA | Prefix | What |
| --- | --- | --- |
| `<sha>` | `feat(ui):` | lift `crtAudioEnabled` / `crtIsPlaying` to App.tsx + forward 5 lifted props through DemoScreen + CapturePreview |
| `<sha>` | `fix(load):` | clear mid-flight intervals on `loadSavedGame` + explicit ephemeral-state reset to defeat React-18 auto-batching race |
| `<sha>` | `test(load):` | deterministic `loadDuringImport.smoke.ts` rewrite via `makeInterval()` stub + manual `tick()` / `clear()` cycle |
| `<sha>` | `chore(dev):` | `npm run dev:electron` concurrent `vite build --watch` host-watcher + `wait-on` gate |
| (optional) | `feat(v0.4.0):` | whatever v0.4.0 feature scope decides on — multi-category scoring polish, dev-only `?dev=1` editor additions, etc. |

### Cross-doc coherence

- The `CHANGELOG [v0.356]` (or whichever tag lands first) entry must list
  the same fix names that this PR's commits produce. Don't claim a fix
  in CHANGELOG that the cherry-picked commits don't actually deliver.
- `docs/release-process.md` Examples section references this PR shape by
  name; if the commit prefixes or scope diverge, update the worked
  example there too.

### Boundary with the chore(release) commit

This PR MUST NOT include:

- `CHANGELOG.md` (chore(release) owns the new section)
- `package.json` / `package-lock.json` (chore(release) owns the bump)
- `scripts/_release_notes_v0.4.0.md` / `scripts/_announcement_v0.4.0.md`
  / `scripts/_pr_body.md` (chore(release) owns the release-process
  artefacts)

If `git diff --stat main` against this PR-branch shows any of those
files, remove them from this PR's diff — they're already produced by
chore(release) in a separate commit, so committing them again here
would create a confusing self-conflict on merge.

## Validation

- `npm run lint` (tsc --noEmit): exit 0
- `npm run test:all`: all 7 smoke suites green
- Three-scenario `loadDuringImport` smoke confirms
  `compileIntervalRef` / `partyVoteIntervalRef` correctly cleared on
  `loadSavedGame` (Scenarios A / B / C, all green post-`test(load)` commit)
- Mute / play toggles persist across inline-to-fullscreen CRT-mount
  transitions (`feat(ui)` commit; manual smoke or, if feasible,
  Playwright integration test)

## Followups (out of scope for this PR)

- Optional: a small additional `docs(release): substitute SHA placeholders`
  PR for `scripts/_pr_body.md` (post-merge to main, no race with this fix
  PR — sequence: merge v0.4.0 chore(release) → push tag → open docs PR →
  merge docs PR → open THIS fix PR → merge this PR).
- Optional: `npm run dist:win` rebuild for the v0.4.0 release once this
  PR is merged (bundles all v0.3.x fixes into the next packaged build).

## Checklist

- [x] Branched off current `main` (post the `chore(release): cut v0.4.0`
      commit; pre-v0.4.0-tag HEAD)
- [x] Conventional commits split by theme
- [x] `npm run lint` clean
- [x] `npm run test:all` green (7/7 smokes)
- [x] No `CHANGELOG.md` / `package.json` / `package-lock.json` /
      `_release_notes_v0.4.0.md` / `_announcement_v0.4.0.md` /
      `_pr_body.md` in the PR's `git diff --stat main` output
"""


def build_pr_url() -> str:
    base = f"https://github.com/{REPO_OWNER}/{REPO_NAME}/compare/{BASE_BRANCH}...{HEAD_BRANCH}"
    params = {
        "expand": "1",
        "title": PR_TITLE,
        "body": PR_BODY,
    }
    return base + "?" + urllib.parse.urlencode(params)


def main() -> None:
    url = build_pr_url()
    print("=== Prefilled PR URL (click to open in browser) ===")
    print(url)
    print()
    print(f"=== Stats ===")
    print(f"repo:   {REPO_OWNER}/{REPO_NAME} (canonical post-typo-fix casing)")
    print(f"head:   {HEAD_BRANCH}")
    print(f"base:   {BASE_BRANCH}")
    print(f"title:  {len(PR_TITLE)} chars")
    print(f"body:   {len(PR_BODY)} chars")
    print(f"url:    {len(url)} chars (GitHub web UI accepts up to ~8000 chars in body)")
    print()
    print("=== Plain-text PR title (for `gh pr create` once auth is fixed) ===")
    print(PR_TITLE)


if __name__ == "__main__":
    main()
