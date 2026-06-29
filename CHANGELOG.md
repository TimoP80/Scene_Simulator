# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - New event variants in `sim/events/eventTypes.ts`: `MoneyEarned`, `MoneySpent`, `JobAccepted`, `JobCompleted`, `HardwarePurchased`, `HardwareSold`, `TravelExpensePaid`, `SoftwarePurchased`, `PartyPrizeAwarded`, `TravelSubscriptionChanged` (10 new variants, **30-variant SimEvent union**).
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

### Removed

- The stale `"tricycle"` sentinel keyword from `src/App.tsx::handlePostCustomBbsMessage` `recruitKeywords` array (recruit detection is now purely intent-based).
