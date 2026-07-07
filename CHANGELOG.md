# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.0] - 2026-07-07

### Added
- **Tracker-music player (`.MOD` / `.XM` / `.IT` / `.S3M`)** — full chiptune3 AudioWorklet integration end-to-end:
  - `electron/main.ts` IPC: `music:import-files` (native file picker + SHA-256 de-dup into `userData/music/<hash>.<ext>`), `music:read-file` (Uint8Array over IPC), `music:delete-file`, `music:init-worklet` (copies bundled worklet scripts into `userData/worklets/` on first use). Every file-serving handler rejects path traversal (`..`, `\\`, leading slashes).
  - Custom privileged `worklet://` scheme registered via `protocol.registerSchemesAsPrivileged` before `app.whenReady()`, served through `protocol.handle()` mapping to `userData/worklets/` so the renderer can call `audioContext.audioWorklet.addModule('worklet:///chiptune3.worklet.js')` same-origin. The `will-navigate` allow-list now permits the new scheme alongside `file://`.
  - `electron/preload.ts` exposes a typed surface (`importMusicFiles`, `readMusicFile`, `deleteMusicFile`, `getWorkletUrl`); `electron/settings.ts` schema bumped v1 → v2 with a new `music.playlist[]` field that persists `{storedName, displayName, format, size}` and auto-migrates pre-0.3.0 settings files.
  - `package.json` `build.extraResources` copies `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into `process.resourcesPath/worklets/` for the packaged build.
  - `src/audio/trackerPlayer.ts` — singleton with `init() / play() / pause() / next() / prev() / setVolume() / setShuffle() / setRepeat() / importFiles() / clearPlaylist() / removeAt()`, strict `RepeatMode = 'off' | 'all' | 'one'`, exported `MusicFile` type. `formatDetection.ts` maps AudioWorklet metadata to a human-readable format label.
  - `src/hooks/useTrackerPlayer.ts` — subscription hook so any component can read live transport state.
  - `src/components/MusicPlayer.tsx` — floating "Now Playing" bar pinned to the bottom of the viewport with full transport (prev / play-pause / next), volume slider + mute, color-coded format badge, progress strip, autoplay-block hint, and an idle compact `♪ MUSIC` button when the library is empty.
  - `src/components/PlaylistManager.tsx` — portal-rendered modal for import / shuffle / repeat-mode cycle / per-track remove / clear-all, with empty-state, error banner, format-color tags, and ESC-to-close.
  - New dependency: `chiptune3 ^0.8.7`.
- **Data migration to JSON + Zod validation** — all sim data moved out of hand-maintained `sim/data/*.ts` modules into typed JSON packs under `data/`:
  - 15 JSON packs: `bbs_threads`, `effects`, `groups`, `hardware`, `jobs`, `manifest`, `parties`, `platforms`, `productions`, `research`, `rival_releases`, `sceners`, `software`, `sponsorships`, plus `data/manifest.json` declaring `version`, schema, and the pack list.
  - `scripts/migrate_data_to_json.ts` + `npm run migrate:data` regenerates the JSON from any source-of-truth TypeScript.
  - `src/content/ContentLoader.ts` + `ContentStore.ts` + `useContentStore.ts` + `schema.ts` — manifest-driven loader, Zod-validated, with a React hook that re-emits on pack reload.
  - `sim/__tests__/data_migration.smoke.ts` — pins the round-trip invariant `migrate(load(sourceTs)) === load(targetJson)` across every pack. New `npm run test:migration` script; `test:all` now runs it.
  - New dependency: `zod ^4.4.3`.
- **DevTools surface (`src/devtools/`)** — opt-in dev-only editor shell:
  - `DevModeContext` (toggled via `?dev=1` URL param or env flag) gates the menu.
  - `DevMenu.tsx` — floating control to open editors.
  - `EditorShell.tsx` — generic scaffold (header, save / cancel, undo / redo).
  - `useUndo.ts` — capped-history undo / redo.
  - `editors/BbsEditor.tsx` + `editors/ScenerEditor.tsx` — first editors for the BBS thread list and scener roster.
- **Multi-category scoring engine + Artistic Directions + Effect Synergies**:
  - `sim/domain/scoring.ts` — pure `scoreProduction(production, crew, effects, profile)` returning a 7-category `ScoreBreakdown` (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) plus 8 `Factor` contributions (skill / effect / synergy / direction / optimization / music-module / platform-fit / dev-time) and a single `overall` value.
  - `sim/data/artisticDirections.ts` — 5 directions (`Technical Showcase`, `Artistic`, `Experimental`, `Oldschool`, `Music-Driven`), each with a multi-category weighting and a small set of preferred synergy tags.
  - `sim/data/effectSynergies.ts` — declarative synergy table (id, name, description, required tags, score bonus). `EffectSynergy` exported from `@packages/types`.
  - `sim/data/judgingProfiles.ts` — per-party judging weights consumed by the competition-prediction code.
  - `packages/types/src/demo.ts` — new exported types: `ArtisticDirection`, `OptimizationFocus`, `DemoDuration`, `EffectSynergy`, `ScoreBreakdown`, `DemoSummary`, `CompetitionPrediction`, plus `ARTISTIC_DIRECTIONS` / `OPTIMIZATION_FOCUSES` / `DEMO_DURATIONS` display-order arrays. Legacy `DemoEffect` fields (`cpuCost`, `ramCostKb`, `difficulty`, `originality`, `audienceAppeal`) are retained for back-compat; the new fields (`complexity`, `visualImpact`, `compatiblePlatforms`, `synergyTags`, `researchRequired`) feed the expanded scoring engine.
  - `sim/data/demoEffects.ts` — every effect enriched with the new metadata so the scoring engine has data to consume from day one.
- **DemoSummary modal (`src/components/DemoSummary.tsx`)** — portal-rendered report shown right after the compiler finishes: production metadata strip, overall-score hero, 7-category score-bar grid, 8-tile factor-contribution grid, triggered-synergy list, effect pill list, music-track row, top-5 competition predictions per upcoming party, awards-earned grid, and a procedural judge-comment list. Fixed tailwind token palette (cyan / rose / amber / violet / emerald / pink / yellow) matching the 4k-aesthetic.
- **Expanded BBS message catalog (`sim/data/bbsMessages.ts`)** — additional era-themed quote lines available to the BBS reply / recruit paths.

### Changed
- **`package.json`** — bumped `0.2.0` → `0.3.0`. New dependencies: `chiptune3 ^0.8.7`, `zod ^4.4.3`. New scripts: `migrate:data`, `test:migration`. `test:all` now also runs `test:migration`.
- **`electron/settings.ts`** — schema version bumped 1 → 2 with a new `music` block (empty playlist on read for v1 files). New `getMusicPlaylist()` / `setMusicPlaylist()` accessors.
- **`src/App.tsx`** — wires the new music player + playlist modal into the root, mounts `<MusicPlayer>` once at the App root so the bar survives tab navigation, opens `<PlaylistManager>` on demand, calls the player's `init()` on mount (idempotent), and propagates the `audioContextSuspended` flag to the resume-hint UI.
- **`index.html`** — `<title>` updated from the AI-Studio default (`"My Google AI Studio App"`) to `"Demoscene Simulator"`.
- **`README.md`** — removed the AI-Studio provenance line. The description of v0.2.0 features is preserved as the historical baseline; v0.3.0 features live in `CHANGELOG.md`.
- **`.env.example`** — rewording for the Electron + Vite split: `GEMINI_API_KEY` documents both first-run Electron prompt and the Vite dev export; `APP_URL` is now described as an optional override.
- **`.gitignore`** — added a comment explaining the electron-builder `release/` ignore block; `dist-electron/` was already excluded.
- **`docs/architecture.md`** — minor wording fix in the `apps/server/` row.

### Fixed
- **TypeScript `import.meta.env` types** — `src/vite-env.d.ts` declares `import.meta.env.VITE_*` so `tsc --noEmit` recognises those references (fixes a CI failure introduced when the capture pipeline began reading `import.meta.env`).
- **`npm run test:all` chain** — now includes the new `test:migration` step so a broken migration halts CI instead of silently passing.
- **Electron `will-navigate` allow-list** — the new `worklet://` scheme is explicitly permitted alongside `file://` in production so the AudioWorklet `addModule` call doesn't trip the sandbox-escape guard.

## [0.2.0] - 2026-07-07

### Added
- **Event-sourced player identity (`PlayerIdentitySet`)** — a new `SimEvent` variant carries `handle` + `groupName`. App.tsx's `handleNewGame` dispatches the event so `state.player.groupName` flows from the event log instead of being baked into `emptyWorldState()`. Reducer case is idempotent on `(handle, groupName)` so a stale-snapshot re-dispatch is a no-op. This closes the v0.1.0 `TODO(dynamic-name)` hardcode planning item.
- **`emit.playerIdentitySet` builder** — `sim/events/appendEvent.ts` now exposes a convenience helper alongside the other `emit.*` builders. App.tsx uses `simulationLoopRef.current?.dispatch(draft)` so the dispatch survives an in-flight StrictMode `null` ref.
- **`sim/__tests__/economicsView.smoke.ts`** — end-to-end exercise of the EconomyView projection: M1 double-store deposit→buy-hardware pattern, ledger invariant (`state.player.money === sum(income) - sum(expense)`), hardware/software purchases, travel subscription round-trip, and the trust-weighted job payout band `[0.7× .. 1.5×]`. Six Scenarios + a catalog sanity gate that fails fast if a future ship strips `HARDWARE_CATALOG` / `JOB_TEMPLATES` / `SOFTWARE_CATALOG` / `SPONSORSHIP_CATALOG` to empty.
- **`sim/__tests__/appendOnlyReplayDeterminism.smoke.ts`** — pins the `docs/event-sourcing.md` "If all events are replayed in order, the world state must be identical" invariant. Replays a fixed `EventDraft` sequence three times through `reduceAll` and asserts structural equality; secondary Scenarios cover `SimulationLoop`-path idempotency, `ts → (year, month)` decoding, and the `MoneySpent` balance floor (`Math.max(0, …)`) under repeated insufficient-budget spends.
- **`.github/workflows/ci.yml`** — GitHub Actions workflow runs `tsc --noEmit`, every smoke test (`test:all`), and `vite build` on every PR + push to `main`. Fails on any non-zero exit. Default Ubuntu runner + Node 20.
- **`CONTRIBUTING.md`** — first-run dev loop, three-layer rules, path-alias cheatsheet, test layout, code-style rules, PR-template checklist. Anchors the merge-blockers from `docs/architecture.md` for new contributors.
- **`scripts/capture-preview.mjs` + `src/preview/CapturePreview.tsx`** — headless capture pipeline that drives Playwright-compatible `puppeteer-core` + system Chrome (mandatory for CI); writes `build/preview.png`, `build/preview.webm`, and (via `ffmpeg-static`) `build/preview.gif`. The capture runs vite dev under a short-lived subprocess and tears it down on exit, so `capture:preview` is self-contained.
- **`window.__CAPTURE__` + `<canvas id="capture-target-canvas">`** — DemoScreen exposes the live canvas + `resize()` / `isPlaying()` helpers to the page window (NOT cleaned up on unmount) so the StrictMode-safe capture script can waitForFunction-poll until the canvas is reachable.
- **Seed-in-state bootstrap (`sim/engine/reducer.ts`)** — the $250 starting allowance now lives inside `emptyWorldState()` itself as a leading `IncomeLedgerEntry` row in `ledger.income`, so the LITERAL invariant `state.player.money === sum(ledger.income) - sum(ledger.expense)` holds by construction across every consumer (production App.tsx bootstrap, smoke tests, replay runs, projections, /apps/ui mirrors). It stays correct under replay because `MoneyEarned`'s reducer case already dedups by `event.id` (so an accidental duplicate `MoneyEarned{id: "seed", ...}` would short-circuit against the baked-in row), AND live production callers route exclusively through M1 ledger-aware reducers `MoneyEarned`/`MoneySpent` — the diagnostic `MoneyChanged` reducer bypasses the ledger by design (it carries its own accounting) and the only legitimate live use is `sim/__tests__/dispatchStampedEvent.smoke.ts`'s M1-bug regression pin (no production dispatcher fires it).

### Changed
- **`sim/engine/reducer.ts`** — `emptyWorldState().player.groupName` retains the `"Tricycle Crews"` seed default only for the brief pre-MainMenu bootstrap window. The comment now documents the contract: the value is *overwritten* by the first `PlayerIdentitySet` event dispatched at NEW GAME, so projection readers should treat `state.player.groupName` as derived from the event log (the same way they treat `money` from `MoneyEarned`).
- **`package.json`** — bumped `0.1.0` → `0.2.0`. New scripts: `test:all` (run every smoke test sequentially, fail fast), `test:economics` (just the EconomyView smoke), `test:replay` (just the determinism smoke). `capture:preview*` scripts preserved.
- **`src/main.tsx`** — branched entry tree: `/` mounts `<App>` wrapped in `<ApiKeyBootstrap>`, `/?capture=1` mounts `<CapturePreview>` directly so the headless capture doesn't need to navigate MainMenu or pass the API-key gate. The same React tree runs in both modes (no `electronAPI`-mocking required for normal launch).

### Removed
- **Bootstrap `MoneyEarned` dispatch in `src/App.tsx`** — the SIM_LOOP_BOOTSTRAP useEffect no longer credits the starting allowance; the seed row in `emptyWorldState()` is now the single source of truth for `player.money = 250` (no `IncomeSource` import needed in App.tsx anymore).
- **Local `dispatchSeed(loop)` helpers** in `sim/__tests__/economicsView.smoke.ts` and `sim/__tests__/dispatchStampedEvent.smoke.ts` — the helpers existed only to dispatch the canonical seed event before each scenario; with the seed baked into `emptyWorldState()`, fresh loops already start with the canonical state.
- **`GEED_SEED` alias + leading seed-allowance `MoneyEarned` event** in `sim/__tests__/appendOnlyReplayDeterminism.smoke.ts::deterministicEventSequence` — the seed lives in `emptyWorldState()` now, so the scene's stamped sequence starts at the first user-action event (`PlayerIdentitySet`).

### Fixed
- **`src/App.tsx` `any`-cast tighten** — `competitors: any[]` replaced with a local `RivalEntry` interface matching the `startPartyVotingProcess` rivalsList shape; `m: any` cast in the BBS message map typed as `BBSMessage`; `choice: any` cast in the BBS choice map typed via `BBSThread["choices"][number]`; `type: "collaboration" as any` replaced with `as SocialEdgeType` (already imported). Zero new `any` types introduced into `src/`.

## [0.1.0] - 2026-06-29

### Added
- **Three-layer architecture** (`/sim`, `/apps`, `/packages`) per `docs/architecture.md`:
  hard rules forbid React/`fetch`/`setState` inside `/sim` and re-declared sim-facing types outside `@packages/types`.
- **Event-sourced simulation kernel**:
  - Discriminated-union `SimEvent` (`sim/events/eventTypes.ts`) with a default-exhaustive reducer guard.
  - Pure `reduce(state, event) → state` in `sim/engine/reducer.ts`.
  - `SimulationLoop` tick scheduler with the StrictMode-safe `ticking`/`firedThisInterval`/`queueMicrotask` reset pattern.
  - `appendEvent` + `EventDraft` (distributive `Omit`) public API + default `emit.*` convenience builders.
  - Append-only `eventStore` with subscribe API (`on(type | "*")`).
- **`@packages/types` and `@packages/utils`** shared packages:
  `Character`, `Production`, `PlatformId`, `BBSThread`, etc. have a single source of truth;
  pure helpers (`generateId`, `simTimestamp`, `advanceMonths`, `MONTH_NAMES`).
- **Typed seed data** under `sim/data/`:
  `HISTORICAL_PLATFORMS`, `DEMO_EFFECTS`, `TECHNOLOGY_TREE`, `INITIAL_NPCS`, `INITIAL_GROUPS`, `PARTY_CALENDAR`, `RIVAL_RELEASES`.
- **Path aliases** in lock-step between `tsconfig.json` and `vite.config.ts`:
  `@packages/types`, `@packages/utils`, `@sim`, `@sim/data`, `@sim/events`, `@sim/engine`, `@tools`, `@apps/*`.
- **Electron + electron-builder** packaging (`dist:win`, `dist:dir`; NSIS + portable).
- **`MainMenu` splash overlay** with New Game / Continue / Load-from-file, and **`ApiKeyBootstrap`** for first-run Gemini key entry.
- **Deterministic, event-sourced economy system** (`@sim/data/hardwareCatalog.ts`, `jobTemplates.ts`, `softwareCatalog.ts`, `sponsorshipCatalog.ts`, plus `packages/types/src/economy.ts`):
  - New event variants in `sim/events/eventTypes.ts`: `MoneyEarned`, `MoneySpent`, `JobAccepted`, `JobCompleted`, `HardwarePurchased`, `HardwareSold`, `TravelExpensePaid`, `SoftwarePurchased`, `PartyPrizeAwarded`, `TravelSubscriptionChanged` (10 new variants, **30-variant SimEvent union**). `MoneyChanged`, a pre-existing variant in the same union (not one of the 10 listed), bypasses the ledger by design and is reserved for diagnostic / test-migration use only — production dispatchers must fire `MoneyEarned`/`MoneySpent` exclusively. See the [0.2.0] "Seed-in-state bootstrap" entry above for the architectural narrowing.
  - `WorldState.economy` slice (income/expense ledger, hardware/software inventories, freelance job board, travel subscription, last-travel marker).
  - Reducer cases for every new event with idempotency guards (`instanceId` dedup), money floor (`>= 0`), no fabricated state on miss, intentional no-op comments where applicable.
  - New `emit.*` builders in `sim/events/appendEvent.ts` for every new variant.
  - `economicsView(state)` pure projection in `sim/projections/economy.ts` — balance, net-worth, hardware inventory joined with wear-level decay, suggested jobs filtered by year/reputation, available sponsorships, and recent ledger entries for the activity panel.
  - Pure domain helpers in `sim/domain/economy.ts` (`hardwareAvailableAtYear`, `aggregatePerformance`, `jobAcceptancePayout`, `monthlySubscriptionFee`, `computeNetWorth`).
  - **Trust-weighted job payouts**: an NPC's `cognitive.trustGraph["__player__"]` modulates `template.basePayment` between 0.85× and 1.35×.
  - **Hardware availability** is a deterministic filter on `releaseYear <= currentYear` plus `resaleValueFraction` for the resale projection.
  - **Wear-level decay** is recomputed deterministically in the projection (1 quarter-year per reliability point), so the reducer never stores stale wear.
- **Typed economy catalog**:
  - 23-item hardware catalog (CPU / GPU / Memory / Storage / Audio / Monitor) from C64-era 8-bit through 2005 GeForce 256/Radeon DDR shader parts.
  - 12 freelance job templates spanning 1985–2005 (loaders, tracker albums, voxel engines, SDF libraries).
  - 12 software offerings (assemblers, trackers, image editors, compressors).
  - 5 late-game sponsor deals, all keyed off reputation milestones.
- **Smoke tests**:
  - `sim/__tests__/dispatchStampedEvent.smoke.ts` — locks the "never `dispatch(emit.*(...))` / `dispatch(appendEvent(...))`" rule (still green; uses `MoneyChanged`).
  - `sim/__tests__/audit-docs.smoke.ts` — parity check between doc references and `sim/` exports.
  - `sim/__tests__/loadDuringImport.smoke.ts` — autosave re-hydration under reload.

### Changed
- **Party-rivals logic in `App.tsx`** replaced the inline 4-rival hard-coded array with a typed `RIVAL_RELEASES` filter (year / disbanded / focus-band predicates).

### Removed
- **`src/data.ts`** and **`src/types.ts`** — merged into `@sim/data` and `@packages/types`.

### Added

- **Dynamic crew-name propagation (`src/App.tsx`)** — all hardcoded `"Tricycle Crews"` strings across user-facing UI (BBS reply/recruit paths, release flow, party memories, alliance messages, cognitive contradiction diagnostic, social-graph stats label) now use the player's typed crew name (`${playerGroupName}`). A mount-time rebind `useEffect` rewrites `bbsThreads.choices[].text/.effectDescription`, `bbsThreads.messages[].text`, and the `graphNodes` `player_group` node `label`/`details` whenever the player sets a custom crew name — fixing the `useState`-initializer bake that would otherwise lock seeds to the default name.
- **Expanded 1985–2005 demoparty calendar (`sim/data/partyCalendar.ts`)** — 13 era-appropriate venues added across the four eras: cracktros/early-C64 (`Copy Party 1989`, `Venlo Meeting`); Amiga-dominant (`Twilight Zone`, `Sun Demoparty`); 16-bit-end + early 3D-card (`Mekka & Symposium`, `Fishtank Party`, `Buenzli`, `Nordlicht`, `Outline`); 3D shader revolution (`Chaos Constructions`, `Wired`, `X`, `Evoke`, `Paradize`). Each carries era-appropriate attendance, prestige, competition brackets, location, and a scene-flavored `headlineNews`.
- **Fullscreen demo view (`src/components/DemoScreen.tsx`)** — new `<FullscreenDemoView/>` portal-rendered component renders the same effects at native fullscreen resolution. New `paintDemoFrame` module-level helper keeps the inline card and the fullscreen view visually identical without sharing animation state across portals. Toolbar gains Maximize/Minimize/Exit controls using `Maximize2`/`Minimize2`/`X` from lucide-react; closes on ESC, on `F`, or by clicking EXIT.
- **`src/components/EconomyPanel.tsx`** — new 705-line UI surface for the deterministic event-sourced economy system. Renders the derived `EconomyView` (balance, net-worth, hardware inventory with wear-level decay, freelance job board filtered by year/reputation, available sponsor deals, recent ledger entries) and exposes player economy actions (buy hardware / software, take job, sign sponsorship). Follows the documented architecture: subscribes to `eventStore.on(\"*\")` for live re-renders, recomputes the snapshot purely through the `economicsView` projection (no `WorldState` mutation, no `dispatch` from inside projections), and uses the M1 double-store money-flow pattern — paired `MoneySpent` + `HardwarePurchased` dispatches instead of a single composed event. Wired into the ECONOMY tab in `App.tsx` via `<EconomyPanel loop={simulationLoopRef.current} />`. Imports 12 lucide-react icons (`Wallet`, `ShoppingCart`, `Briefcase`, `Cpu`, `Sparkles`, `Package2`, `Coins`, `BadgeDollarSign`, `Activity`, `CheckCircle2`, `AlertCircle`, `Clock`).

### Changed

- **`src/components/DemoScreen.tsx`** — inline CRT loop now delegates every effect (raster bars, starfield, plasma, pixel fire, vector cube, tunnel, sine scroller, HUD) to the shared `paintDemoFrame` painter instead of duplicating logic per surface.

### Fixed

- BBS reply/recruit responses, release flow, party memories, alliance messages, cognitive-stats UI — no longer hardcode `"Tricycle Crews"` when the player picks a custom crew name.
- `sim/engine/reducer.ts::emptyWorldState.groupName` hardcode flagged with a `TODO(dynamic-name)` for the eventual event-sourced hydrate path (current UI bypasses this through MainMenu's `setPlayerGroupName`).
- **`src/components/EconomyPanel.tsx`** (post-launch nit cleanup): the force-render setter is renamed `setTick` → `_tick` with a comment flagging it as a non-standard force-render trigger (underscore-prefixed; the destructured state value is intentionally never read); each recent-ledger row now renders a sim-month label (e.g. `Y1985 M11`) via a new module-level `ledgerMonthLabel(ts)` helper — the helper intentionally uses `((ts - 1) % 12) + 1` rather than `ts % 12` so the `December→January` boundary does not inflate the displayed year by one; the SOFTWARE_CATALOG section now distinguishes the "catalog itself empty (data missing)" case from "filtered to empty for the current year" so the player sees an actionable CTA instead of a misleading empty-state.

### Removed

- The stale `"tricycle"` sentinel keyword from `src/App.tsx::handlePostCustomBbsMessage` `recruitKeywords` array (recruit detection is now purely intent-based).
