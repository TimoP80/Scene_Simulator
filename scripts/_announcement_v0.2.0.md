# Scene Simulator v0.2.0 — Announcement Posts

Three platform-specific variants for announcing the v0.2.0 release. All link to https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.2.0. Pick the one that matches the platform you're posting to, or remix.

---

## Discord (casual, emoji-friendly, ~250 words)

🚀 **Scene Simulator v0.2.0 — "Seed-in-state inversion" is live!**

A demoscene life-sim spanning 1985-2005 — recruit sceners, research effects, compile demos, and compete at parties. Now with:

🧾 **Seed-in-state bootstrap** — the $250 starting allowance now lives inside `emptyWorldState()` as a leading ledger row, so the `money === Σ(income) − Σ(expense)` invariant holds by construction. No more "dispatch the seed at app boot" dance.
🪪 **Event-sourced player identity** — `PlayerIdentitySet` event hydrates your crew name from the event log. Closes the v0.1.0 `TODO(dynamic-name)`.
📸 **Headless capture pipeline** — `npm run capture:preview` writes `build/preview.{png,webm,gif}` from a self-contained vite-dev subprocess. Two-pass ffmpeg palette quantisation for the GIF.
🤖 **GitHub Actions CI** — `tsc --noEmit` + every smoke + `audit:docs` + `vite build` on every PR + push. Manual capture job via `workflow_dispatch`.
🧪 **Economy + replay smokes** — `economicsView` + `appendOnlyReplayDeterminism` lock the ledger model + replay determinism.

📦 **Windows installers attached** — NSIS installer (108 MB, per-user install, changeable install dir) + portable single-file exe (107 MB). Both x64.

📥 **Download:** https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.2.0
📖 **Full release notes:** https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md
💬 **Join the discussion:** https://github.com/TimoP80/Scene_Simulator/discussions

---

## Reddit (r/programming / r/typescript / r/electronjs style, ~400 words, slightly more technical)

**Scene Simulator v0.2.0 — seed-in-state bootstrap + headless capture pipeline**

A demoscene life-sim (1985-2005) where you recruit sceners, research effects, compile demos, and compete at parties. v0.2.0 is the architectural inversion release:

* **Seed-in-state bootstrap.** The $250 starting allowance now lives inside `emptyWorldState()` as a leading `IncomeLedgerEntry` row. The LITERAL invariant `state.player.money === sum(ledger.income) − sum(ledger.expense)` holds by construction across every consumer — production app, smoke tests, replay runs, projections. No more UI-layer seed-dispatch dance. `MoneyEarned`'s reducer case dedups by `event.id`, so an accidental duplicate seed event short-circuits against the baked-in row.

* **Event-sourced player identity.** `PlayerIdentitySet` is a new `SimEvent` variant carrying `handle + groupName`. Reducer case is idempotent on `(handle, groupName)`. Closes the v0.1.0 `TODO(dynamic-name)` hardcode.

* **Headless capture pipeline.** `scripts/capture-preview.mjs` drives `puppeteer-core` + system Chrome against a `?capture=1` short-circuited entry that bypasses the API-key gate. Outputs `build/preview.{png,webm,gif}` from a self-contained vite-dev subprocess; two-pass ffmpeg palette quantisation for the GIF.

* **GitHub Actions CI.** `tsc --noEmit` + every smoke + `audit:docs` + `vite build` on every PR + push to main. Manual `capture-preview` job (requires system Chrome) via `workflow_dispatch`.

* **Economy + replay smokes.** `economicsView.smoke` pins the M1 double-store deposit→buy-hardware pattern and the ledger invariant. `appendOnlyReplayDeterminism.smoke` pins the replay-determinism contract (replaying a fixed `EventDraft` sequence three times through `reduceAll` yields structurally identical states).

**Stack:** React 19, Vite 6, TypeScript strict, electron-builder, puppeteer-core, ffmpeg-static. Three-layer architecture (`/sim`, `/apps`, `/packages`) with hard rules forbidding React/fetch/setState under `/sim` (see `docs/architecture.md`).

**Windows installers** (NSIS 108 MB + portable 107 MB, x64) attached to the release page. The NSIS installer offers per-user install with a changeable install directory; the portable is a single-file executable that runs without installation.

🔗 **Release page:** https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.2.0
📜 **CHANGELOG:** https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md

---

## Hacker News (terse, Show HN style, ~300 words, no markdown)

Title: **Show HN: Scene Simulator v0.2.0 – Demoscene life-sim with event-sourced economy**

Text:

Scene Simulator is a React + Electron demoscene life-sim spanning 1985-2005. Recruit sceners, research effects, compile demos, and compete at parties. v0.2.0 is the architectural inversion release.

What changed:

- Seed-in-state bootstrap. The $250 starting allowance now lives inside emptyWorldState() as a leading IncomeLedgerEntry row. The invariant state.player.money === sum(ledger.income) - sum(ledger.expense) holds by construction across every consumer (production app, smoke tests, replay runs, projections). MoneyEarned's reducer case dedups by event.id, so an accidental duplicate seed event short-circuits against the baked-in row. This unifies prod+test source-of-truth and closes the v0.1.0 "dispatch the seed at app boot" hack.

- Event-sourced player identity. PlayerIdentitySet is a new SimEvent variant carrying handle + groupName. Reducer case is idempotent on (handle, groupName). Closes the v0.1.0 TODO(dynamic-name) hardcode.

- Headless capture pipeline. puppeteer-core + system Chrome against a ?capture=1 short-circuited entry that bypasses the API-key gate. Outputs build/preview.{png,webm,gif} from a self-contained vite-dev subprocess; two-pass ffmpeg palette quantisation for the GIF. CI opt-in via workflow_dispatch.

- GitHub Actions CI. tsc --noEmit + every smoke + audit:docs + vite build on every PR + push to main. Concurrency group cancels in-flight runs on new commits.

- Economy + replay smokes. economicsView.smoke pins the M1 double-store deposit->buy-hardware pattern and the ledger invariant. appendOnlyReplayDeterminism.smoke pins the replay-determinism contract.

Stack: React 19, Vite 6, TypeScript strict, electron-builder, puppeteer-core, ffmpeg-static. Three-layer architecture (sim/apps/packages) with hard rules forbidding React/fetch/setState under /sim (see docs/architecture.md).

Windows installers (NSIS + portable, x64) attached to the release page.

https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.2.0

---

## Posting tips

- **Discord:** paste as-is. The `**bold**` renders as bold; emoji render natively. Consider pinning the post in #announcements for 24-48 hours.
- **Reddit:** post to r/programming, r/typescript, or r/electronjs (pick the most relevant). The bullet points render as a list. The 🔗 emoji at the end is optional — some subs prefer no emoji.
- **Hacker News:** the title must be "Show HN: ..." to qualify for Show HN. The text uses no markdown (HN doesn't render it). The first paragraph is the hook — keep it under 3 sentences. Reply to comments with code links (`https://github.com/TimoP80/Scene_Simulator/blob/main/...`) rather than pasting code blocks.

## Suggested cross-post order

1. **Hacker News** first (Monday or Tuesday morning US time, 8-10am ET) — gets the most technical feedback
2. **Reddit** 4-6 hours later — catches the HN tail
3. **Discord** when you have time to engage with responses
