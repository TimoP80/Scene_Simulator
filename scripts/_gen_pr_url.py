"""
One-shot helper that prints a prefilled GitHub PR-creation URL for the
v0.2.0 seed-inversion feature branch.

`gh` is installed in this environment but its OAuth token is invalid, so
`gh pr create` cannot run. As a fallback, we build the equivalent
`/compare/...?expand=1&title=...&body=...` URL that GitHub's web UI
parses into a pre-filled PR form. The user can click the URL, review the
prefilled title + body, and click "Create pull request" to open the PR.

Idempotent: re-running prints the same URL.
"""
from __future__ import annotations

import urllib.parse
from pathlib import Path

REPO_OWNER = "TimoP80"
REPO_NAME = "Scene_Simulator"
BASE_BRANCH = "main"
HEAD_BRANCH = "feature/v0.2.0-seed-inversion"

PR_TITLE = "refactor(economy): v0.2.0 seed-in-state inversion"

PR_BODY = """## Summary

Inverts the v0.2.0 economy bootstrap: the $250 starting allowance now lives
inside `sim/engine/reducer.ts::emptyWorldState()` itself (both as
`player.money = 250` and as a matching `IncomeLedgerEntry` row in
`ledger.income` with `id: "seed"`), so the LITERAL invariant
`state.player.money === sum(ledger.income) - sum(ledger.expense)` holds by
construction across every consumer (production App.tsx, smoke tests, replay
runs, projections) without any UI-layer or seed-dispatch dance.

## What changed

### 4 conventional commits, in order from oldest to newest

| SHA       | Prefix               | What                                                                                       |
| --------- | -------------------- | ------------------------------------------------------------------------------------------ |
| `d188a8f` | `refactor(economy):` | invert seed: `sim/engine/reducer.ts` (seed row + `IncomeSource` import) + `src/App.tsx` (drop dispatch + drop `IncomeSource` import) |
| `480984c` | `test(economy):`     | drop `dispatchSeed` scaffolding from 3 smoke files (`economicsView`, `appendOnlyReplayDeterminism`, `dispatchStampedEvent`); recalibrate assertions for the seed-in-state row |
| `e7f3a2a` | `docs(changelog):`   | amend `[0.2.0]` Added + new `Removed` section + `[0.1.0]` `MoneyChanged` clarifier         |
| `395208b` | `docs(architecture):`| update `docs/event-sourcing.md`, `docs/simulation-rules.md`, `docs/architecture.md` to describe seed-in-state design |

### Architectural narrowing

- **`/sim` owns the bootstrap shape** (via `emptyWorldState()`).
- **`/apps/**` must NOT** dispatch a synthetic seed `MoneyEarned{amount: 250, source: IncomeSource.Other, sourceRefId: "starting_allowance"}`. The corresponding process rule lives in `docs/simulation-rules.md` under the new `### DO NOT dispatch the bootstrap seed` entry.
- The diagnostic `MoneyChanged` reducer remains reserved for `sim/__tests__/dispatchStampedEvent.smoke.ts` and other test-migration paths only.

## Validation

- `npm run lint` (tsc --noEmit): exit 0
- `npm run test:all`: 5/5 smoke tests green
  - `dispatchStampedEvent` (M1 regression pin)
  - `audit-docs` (parity gate)
  - `loadDuringImport` (autosave re-hydration)
  - `economicsView` (6 runnable scenarios)
  - `appendOnlyReplayDeterminism` (5 scenarios)
- `npm run test:audit-docs`: green (parity gate confirms doc/sim exports are aligned)

## Cross-doc coherence

- `architecture.md` `## Bootstrap ownership (post-v0.2.0)` \u2192 `simulation-rules.md` `### DO NOT dispatch the bootstrap seed` (process rule)
- `event-sourcing.md` Categories table diagnostic framing \u2194 `simulation-rules.md` diagnostic framing (builder vs dispatch site)
- `architecture.md` `/sim/engine/` row \u2194 `reducer.ts` doc-comment (canonical seed row id `"seed"`)

## Followups (out of scope for this PR)

- **Optional App.tsx commit split.** The `refactor(economy): invert seed` commit (d188a8f) bundles two logically-distinct changes into `src/App.tsx`: the pre-existing any-cast tighten and the session's seed-dispatch removal. Future `git bisect` would attribute the any-cast tighten to the seed-inversion commit. To split: `git reset HEAD~1 && git add -p src/App.tsx` (stage only the seed-dispatch-related hunks) and recommit. The pre-existing any-cast tighten then sits on the working tree for a separate `refactor(app): tighten any-casts` follow-up.
- **Tag `v0.2.0` after merge.** `git tag -a v0.2.0 -m "v0.2.0 — event-sourced economy + seed-in-state inversion" 395208b` + `git push origin v0.2.0`.

## Checklist

- [x] `npm run lint` clean
- [x] `npm run test:all` green (5/5 smokes)
- [x] `npm run test:audit-docs` green (parity gate)
- [x] `feature/v0.2.0-seed-inversion` pushed to origin
- [x] CHANGELOG `[0.2.0]` entry updated
- [x] Three `/docs` files updated to describe seed-in-state design
- [ ] Optional: split App.tsx commit (see Followups)
- [ ] Optional: tag `v0.2.0` after merge
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
    print(f"title: {len(PR_TITLE)} chars")
    print(f"body:  {len(PR_BODY)} chars")
    print(f"url:   {len(url)} chars (GitHub web UI accepts up to ~8000 chars in body)")
    print()
    print("=== Plain-text PR title (for `gh pr create` once auth is fixed) ===")
    print(PR_TITLE)


if __name__ == "__main__":
    main()
