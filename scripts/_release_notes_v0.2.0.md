# Scene Simulator v0.2.0 — Seed-in-state inversion + dynamic player identity + headless capture pipeline

**Release date:** 2026-07-07
**Compare:** [v0.1.0...v0.2.0](https://github.com/TimoP80/Scene_SImulator/compare/v0.1.0...v0.2.0)
**Commits on this tag:** 3 (polish + review-nits + vite-env types, on top of the squash-merge that brought the v0.2.0 core from `feature/v0.2.0-seed-inversion`).

This release inverts the economy bootstrap (the `$250` starting allowance now lives inside `sim/engine/reducer.ts::emptyWorldState()` as a leading `IncomeLedgerEntry` row, so `state.player.money === sum(ledger.income) − sum(ledger.expense)` holds by construction), event-sources the player identity (`PlayerIdentitySet` event), ships a self-contained headless capture pipeline (`puppeteer-core` + `ffmpeg-static`), and lands GitHub Actions CI plus a first-cut contributor guide.

> _Release notes mirror the `[0.2.0]` section of `CHANGELOG.md` and add the post-merge polish + fix scope. See `CHANGELOG.md` for the canonical source._

---

## Highlights

- 🧾 **Seed-in-state inversion** — bootstrap invariant `money === Σ(income) − Σ(expense)` now holds by construction across every consumer (production `App.tsx`, smoke tests, replay runs, projections).
- 🪪 **Event-sourced player identity** — `PlayerIdentitySet` event hydrates `handle` + `groupName`; closes the v0.1.0 `TODO(dynamic-name)`.
- 📸 **Headless capture pipeline** — `npm run capture:preview` writes `build/preview.{png,webm,gif}` from a self-contained vite-dev subprocess; the capture runs against a `?capture=1` short-circuited entry that bypasses the API-key gate.
- 🤖 **GitHub Actions CI** — `tsc --noEmit` + every smoke + `audit:docs` + `vite build` on every PR + push to `main`; manual `capture-preview` job (requires system Chrome) on push to main or via `workflow_dispatch`.
- 🧪 **Economy + replay smokes** — `economicsView` + `appendOnlyReplayDeterminism` lock the ledger model + replay determinism; both files include catalog sanity gates that fail fast if a future ship strips a seed catalog.
- 📚 **Contributor guide** — `CONTRIBUTING.md` documents the first-run dev loop, three-layer rules, path-alias cheatsheet, test layout, coding style, build pipeline, and PR template checklist.

---

## What's New

### Economy (event-sourced player bootstrap)

- **Seed-in-state bootstrap (`sim/engine/reducer.ts`)** — the $250 starting allowance now lives inside `emptyWorldState()` itself as a leading `IncomeLedgerEntry` row in `ledger.income` (id `"seed"`, year 1985, month 1, source `IncomeSource.Other`, sourceRefId `"starting_allowance"`). The LITERAL invariant `state.player.money === sum(ledger.income) − sum(ledger.expense)` holds by construction across every consumer. Stays correct under replay because `MoneyEarned`'s reducer case already dedups by `event.id` (so an accidental duplicate `MoneyEarned{id: "seed", ...}` would short-circuit against the baked-in row), AND live production callers route exclusively through M1 ledger-aware reducers `MoneyEarned`/`MoneySpent`. The diagnostic `MoneyChanged` reducer bypasses the ledger by design and is reserved for the `dispatchStampedEvent.smoke.ts` M1-bug regression pin (no production dispatcher fires it).
- **Event-sourced player identity (`PlayerIdentitySet`)** — new `SimEvent` variant carries `handle` + `groupName`. `App.tsx::handleNewGame` dispatches the event so `state.player.groupName` flows from the event log instead of being baked into `emptyWorldState()`. Reducer case is idempotent on `(handle, groupName)` so a stale-snapshot re-dispatch is a no-op. Closes the v0.1.0 `TODO(dynamic-name)` hardcode planning item.
- **`emit.playerIdentitySet` builder** — `sim/events/appendEvent.ts` exposes a convenience helper alongside the other `emit.*` builders. `App.tsx` uses `simulationLoopRef.current?.dispatch(draft)` so the dispatch survives an in-flight StrictMode `null` ref.

### Tests

- **`sim/__tests__/economicsView.smoke.ts`** — end-to-end exercise of the `EconomyView` projection: M1 double-store deposit→buy-hardware pattern, ledger invariant, hardware/software purchases, travel subscription round-trip, and the trust-weighted job payout band `[0.7× .. 1.5×]`. Six scenarios + a catalog sanity gate.
- **`sim/__tests__/appendOnlyReplayDeterminism.smoke.ts`** — pins the `docs/event-sourcing.md` "If all events are replayed in order, the world state must be identical" invariant. Replays a fixed `EventDraft` sequence three times through `reduceAll` and asserts structural equality; secondary scenarios cover `SimulationLoop`-path idempotency, `ts → (year, month)` decoding, and the `MoneySpent` balance floor (`Math.max(0, …)`) under repeated insufficient-budget spends.

### Headless capture pipeline

- **`scripts/capture-preview.mjs`** — self-contained headless capture script (340 lines). Drives system Chrome via `puppeteer-core`, records a 6-second 30fps WebM via `MediaRecorder` and a single-frame PNG via `canvas.toDataURL`; two-pass `ffmpeg-static` palette quantisation produces a deterministic GIF for markdown previews. Spawns `vite dev` on `:3000`, polls for the port, tears down on exit. Flags: `--no-gif` (CI determinism), `--width` / `--height` (resolution override), `--chrome-path` (override auto-detect), `--keep-server` (debug), `--no-headless` (debug). Hard wall-clock deadline prevents hung runs.
- **`src/preview/CapturePreview.tsx`** — bare `<DemoScreen/>` mount with a deterministic hero effect preset (raster_bars + starfield_2d + animated_plasma + pixel_fire + vector_cube + tunnel_effect + sine_scroller). The full WORKSPACE capture is a v0.2.x follow-up.
- **`src/main.tsx` branched entry tree** — `/` mounts `<App>` wrapped in `<ApiKeyBootstrap>`; `/?capture=1` short-circuits to `<CapturePreview>` directly so the capture script never has to navigate MainMenu or pass the API-key gate. The same React tree runs in both modes.
- **`src/components/DemoScreen.tsx` `window.__CAPTURE__` hook + `<canvas id="capture-target-canvas">`** — exposes `{ canvas, isPlaying, resize(w, h) }` to the page window (gated on dev mode via `import.meta.env.PROD`) so the StrictMode-safe capture script can `waitForFunction`-poll until the canvas is reachable. The DOM id is the primary lookup because it always lands on the currently-mounted element after StrictMode settles; the ref is the fallback.

### CI

- **`.github/workflows/ci.yml`** — GitHub Actions workflow runs the full gate on every PR + push to `main`: `npm ci` → `tsc --noEmit` → `audit:docs` → `test:all` → `vite build`. Concurrency group cancels in-flight runs on new commits. Default Ubuntu runner + Node 20. Manual `capture-preview` job (requires system Chrome, opt-in via `workflow_dispatch` or push to main) runs the headless capture and uploads `build/preview.{png,webm}` as a 14-day retention artifact.

### Docs

- **`CONTRIBUTING.md`** — first-run dev loop, three-layer rules, path-alias cheatsheet, test layout with one-liner summaries per smoke, coding-style rules, build/ship pipeline table, PR template checklist. Anchors the merge-blockers from `docs/architecture.md` for new contributors.
- **`README.md` "Screenshots & Captures" section** — documents the `capture:preview` scripts + the system-Chrome requirement + the `?capture=1` query short-circuit.

---

## What Changed

- **`sim/engine/reducer.ts`** — `emptyWorldState().player.groupName` retains the `"Tricycle Crews"` seed default only for the brief pre-MainMenu bootstrap window. The comment documents the contract: the value is *overwritten* by the first `PlayerIdentitySet` event dispatched at NEW GAME, so projection readers should treat `state.player.groupName` as derived from the event log (the same way they treat `money` from `MoneyEarned`).
- **`package.json`** — bumped `0.1.0` → `0.2.0`. New scripts: `test:all` (run every smoke test sequentially, fail fast), `test:economics` (just the EconomyView smoke), `test:replay` (just the determinism smoke), `capture:preview` (PNG + WebM + GIF), `capture:preview:no-gif` (CI determinism), `capture:preview:hi-res` (1920×1080 override). New devDeps: `puppeteer-core ^25.2.1`, `ffmpeg-static ^5.3.0`.

---

## What Was Removed

- **Bootstrap `MoneyEarned` dispatch in `src/App.tsx`** — the `SIM_LOOP_BOOTSTRAP` useEffect no longer credits the starting allowance; the seed row in `emptyWorldState()` is now the single source of truth for `player.money = 250` (no `IncomeSource` import needed in `App.tsx` anymore).
- **Local `dispatchSeed(loop)` helpers** in `sim/__tests__/economicsView.smoke.ts` and `sim/__tests__/dispatchStampedEvent.smoke.ts` — the helpers existed only to dispatch the canonical seed event before each scenario; with the seed baked into `emptyWorldState()`, fresh loops already start with the canonical state.
- **`GEED_SEED` alias + leading seed-allowance `MoneyEarned` event** in `sim/__tests__/appendOnlyReplayDeterminism.smoke.ts::deterministicEventSequence` — the seed lives in `emptyWorldState()` now, so the scene's stamped sequence starts at the first user-action event (`PlayerIdentitySet`).

---

## Bug Fixes

- **`src/App.tsx` `any`-cast tighten** — `competitors: any[]` replaced with a local `RivalEntry` interface matching the `startPartyVotingProcess` rivalsList shape; `m: any` cast in the BBS message map typed as `BBSMessage`; `choice: any` cast in the BBS choice map typed via `BBSThread["choices"][number]`; `type: "collaboration" as any` replaced with `as SocialEdgeType` (already imported). Zero new `any` types introduced into `src/`.

---

## Internal Hardening (pre-tag review nits)

- **CI: chromium package name for `ubuntu-24.04`** — `.github/workflows/ci.yml` installs `chromium` (not `chromium-browser`) on the current `ubuntu-latest`. The capture script's `findSystemChrome()` already checks `/usr/bin/chromium`.
- **CI: `workflow_dispatch` trigger** — added a manual trigger so release engineers can refresh `build/preview.{png,webm}` without pushing a no-op commit to main. The `capture-preview` job's `if`-guard widened to `(push && main) || workflow_dispatch`; `needs: gate` is preserved, so a broken main still blocks the capture upload.
- **Security: gate `window.__CAPTURE__` on dev mode** — `src/components/DemoScreen.tsx` now returns early from the headless-capture `useEffect` when `import.meta.env.PROD === true`, so production Electron builds do not leak the canvas ref + isPlaying state to DevTools. The capture pipeline runs against `vite dev`, so the gate is safe.
- **Docs: `@apps/*` path aliases marked as reserved/future** — `CONTRIBUTING.md` now marks `@apps/ui`, `@apps/server`, `@apps/llm` as `(reserved — folder not yet present)` with a `> Note` blockquote explaining the forward-compat intent (v0.3.0+ may introduce a third app layer). Contributors in v0.2.x are explicitly told not to create the folders.
- **TypeScript: `src/vite-env.d.ts` reference file** — adds the standard Vite + TypeScript client-types reference (`/// <reference types="vite/client" />`) so `import.meta.env.PROD` type-checks. Without this, `tsc --noEmit` would fail with `TS2339: Property 'env' does not exist on type 'ImportMeta'`.

---

## Upgrade Notes

No breaking changes for end users. The v0.1.0 → v0.2.0 transition is transparent because the seed is now baked into `emptyWorldState()` rather than dispatched at App.tsx bootstrap. Existing saves should replay identically through the new reducer — the `MoneyEarned` dedup-on-`id` guard absorbs any in-flight seed-event dispatches from older client builds.

For contributors: the `@apps/*` aliases are pre-declared in `tsconfig.json` and `vite.config.ts` but the `apps/` folder does not yet exist. Do not create files in `apps/{ui,server,llm}/` in v0.2.x; the three-layer rule in `docs/architecture.md` is the active rule.

---

## Verification

- `npm run lint` (tsc --noEmit) — exit 0
- `npm run test:all` — 5/5 smokes green
- `npm run audit:docs` — doc/sim parity gate green across all 8 scenarios
- `npm run build` — clean renderer bundle

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
