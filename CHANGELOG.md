# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Three-layer architecture** (`/sim`, `/apps`, `/packages`) per `docs/architecture.md`:
  hard rules forbid React/`fetch`/`setState` inside `/sim` and re-declared sim-facing types outside `@packages/types`.
- **Event-sourced simulation kernel**:
  - Discriminated-union `SimEvent` (21 variants) in `sim/events/eventTypes.ts`.
  - Pure `reduce(state, event) → state` reducer in `sim/engine/reducer.ts` with exhaustive `_exhaust: never` default guard.
  - `SimulationLoop` tick scheduler with StrictMode-safe `ticking`/`firedThisInterval`/`queueMicrotask` reset pattern.
  - `appendEvent` / `EventDraft` (distributive `Omit`) public API + default `emit.*` convenience helpers.
  - Append-only `eventStore` with subscribe API (`on(type | "*")`) for side-effects at the projection layer.
- **`@packages/types` and `@packages/utils`** shared packages:
  `Character`, `Production`, `PlatformId`, `BBSThread`, etc. now have a single source of truth; pure helpers (`generateId`, `simTimestamp`, `advanceMonths`, `MONTH_NAMES`).
- **Typed seed data** under `sim/data/`:
  `HISTORICAL_PLATFORMS`, `DEMO_EFFECTS`, `TECHNOLOGY_TREE`, `INITIAL_NPCS`, `INITIAL_GROUPS`, `PARTY_CALENDAR`, and the new `RIVAL_RELEASES`.
- **Path aliases** in lock-step between `tsconfig.json` and `vite.config.ts`:
  `@packages/types`, `@packages/utils`, `@sim`, `@sim/data`, `@sim/events`, `@sim/engine`, `@tools`, `@apps/*`.
- **Electron + electron-builder** packaging:
  `dist:win` (NSIS + portable), `dist:dir` scripts; `electron/main.ts`, `electron/preload.ts`, `electron/settings.ts`.
  `electron.vite.config.ts` build pipeline + `scripts/generate-icons.mjs`.
- **`MainMenu` splash overlay** with New Game / Continue / Load-from-file flows.
  Continue/Load auto-dismisses via the autosave-hydration effect.
- **`ApiKeyBootstrap` component** for first-run Gemini API key entry.
- **Smoke tests**:
  - `sim/__tests__/dispatchStampedEvent.smoke.ts` – locks the "never `dispatch(emit.*(...))` / `dispatch(appendEvent(...))`" rule.
  - `sim/__tests__/audit-docs.smoke.ts` – parity check between doc references and `sim/` exports.
  - `sim/__tests__/loadDuringImport.smoke.ts` – autosave re-hydration under reload.
- **Documentation**: `docs/architecture.md`, `docs/event-sourcing.md`, `docs/simulation-rules.md`,
  plus AI-coder prompts under `prompts/` (`system-ai-coder.md`, `add-feature.md`, `debug-simulation.md`, `refactor-event-system.md`).
- **Scripts**:
  `npm run dev:electron`, `build:electron`, `build:all`, `dist:win`, `dist:dir`, `icons`,
  `test:smoke`, `test:audit-docs`, `test:load-during-import`, `audit:docs`.

### Changed
- **Renamed project** from `react-example` to **Demoscene Simulator** (`package.json` `name`,
  `description`, `appId`, `productName`); version remains `0.0.0` pre-release.
- **Restructured `/sim/data`**:
  `INITIAL_NPCS`, `INITIAL_GROUPS`, `PARTY_CALENDAR`, etc. now live under `sim/data/` instead of `src/data.ts`.
- **Party-rivals logic in `App.tsx`**: replaced the inline 4-rival hard-coded array (with the
  `currentYear > 1999` Spaceballs hack) with a typed filter over `RIVAL_RELEASES` —
  rivals are eligible iff they have released at or before the player's current month,
  have not disbanded, and their `platformFocus` matches the active party's focus (or `all`).
- **`SocialGraphTab.tsx`** now imports `SocialEdge` / `SocialEdgeType` / `SocialNodeType` from `@packages/types` instead of the deleted `src/types.ts`.
- **Autosave hydration** now also surfaces a one-line save summary (`group · YYYY/MM · handle`)
  to the `MainMenu`'s Continue button via `mainMenuSaveInfo`.

### Removed
- **`src/data.ts`** – moved to typed seed modules under `sim/data/`.
- **`src/types.ts`** – moved to `@packages/types`.

### Fixed
- **Party rival "Spaceballs > 1999" inline hack** replaced with history-aware
  `disbandedAfter` predicate from the typed seed.
- **`EdIT bonus / StrictMode duplicated-release regression** structurally prevented by
  routing all state mutations through the event-sourced `reduce(state, event)` path.
