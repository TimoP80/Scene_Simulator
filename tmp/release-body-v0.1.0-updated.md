# Demoscene Simulator v0.1.0 — initial release

![Demoscene Simulator v0.1.0 in-game CRT demo screen preview](https://github.com/TimoP80/Scene_SImulator/releases/download/v0.1.0/preview.svg)

*Above: SVG mockup of the in-game CRT demo screen (raster bars, vector cube, sine-scroller, HUD) — a stand-in for v0.1.0. v0.2.0 will replace this with a real PNG screenshot + a 30-second animated GIF of the demo screen playing.*

---

## What's shipped in v0.1.0

The initial public release of the **Demoscene Simulator** — a 1985–2005 life-sim of the demoscene built on a deterministic event-sourced kernel. You pick a crew name, hustle hardware and freelance gigs, ship demos at era-appropriate parties, and watch the scene evolve from C64 cracktros in disk-swapping gymnasiums all the way through the early-2000s 3D-shader revolution.

### Highlights

- **Three-layer architecture** (`/sim`, `/apps`, `/packages`) — strict rules forbid React/`fetch`/`setState` inside `/sim` and forbid re-declared sim-facing types outside `@packages/types`.
- **Event-sourced kernel** — discriminated `SimEvent` union (now 30 variants), pure `reduce(state, event) → state`, deterministic `SimulationLoop` with a StrictMode-safe reset pattern, append-only `eventStore` with `on(type | "*")` subscribe.
- **Deterministic event-sourced economy system** — money / hardware / software / freelance jobs / sponsors, with **trust-weighted NPC payouts** (an NPC `cognitive.trustGraph["__player__"]` modulates `template.basePayment` between 0.85× and 1.35×) and **wear-level decay** recomputed deterministically in the projection (1 quarter-year per reliability point). Driven by the **M1 double-store money-flow pattern** — paired `MoneySpent` + `HardwarePurchased` dispatches instead of a single composed event.
- **`MainMenu` + `ApiKeyBootstrap`** — splash overlay (New Game / Continue / Load-from-file) plus first-run Gemini API key entry.
- **Electron + electron-builder** — packaged as NSIS installer + portable Windows x64 with auto-update `latest.yml`.

### New

- `@packages/types` + `@packages/utils` shared packages — single source of truth for `Character`, `Production`, `PlatformId`, `BBSThread`, etc.; pure helpers (`generateId`, `simTimestamp`, `advanceMonths`, `MONTH_NAMES`).
- Typed seed data under `sim/data/` — `HISTORICAL_PLATFORMS`, `DEMO_EFFECTS`, `TECHNOLOGY_TREE`, `INITIAL_NPCS`, `INITIAL_GROUPS`, `PARTY_CALENDAR`, `RIVAL_RELEASES`.
- Path aliases in lock-step between `tsconfig.json` and `vite.config.ts` — `@packages/types`, `@packages/utils`, `@sim`, `@sim/data`, `@sim/events`, `@sim/engine`, `@tools`, `@apps/*`.
- **Economy catalogs**: 23 hardware SKUs (C64-era 8-bit through 2005 GeForce 256 / Radeon DDR shader parts), 12 freelance job templates (1985–2005), 12 software offerings (assemblers, trackers, image editors, compressors), 5 late-game sponsor deals keyed off reputation milestones.
- **Smoke tests** — `dispatchStampedEvent` (locks the "never `dispatch(emit.*)` / `dispatch(appendEvent)`" rule), `audit-docs` (doc-vs-exports parity), `loadDuringImport` (autosave re-hydration under reload).
- **Dynamic crew-name propagation** in `src/App.tsx` — mount-time `useEffect` rewrites BBS reply / recruit / release-flow / party-memory / alliance-message / cognitive-stats UI to use the player's typed crew name. No more `"Tricycle Crews"` bake when you pick a custom name.
- **Expanded 1985–2005 demoparty calendar** — 13 era-appropriate venues across four eras (crack/C64, Amiga-dominant, 16-bit-peak + early-3D-card, 3D-shader revolution).
- **`<FullscreenDemoView/>`** (`src/components/DemoScreen.tsx`) — portal-rendered native-res effects playback. ESC / `F` / Exit-button close. New `paintDemoFrame` module-level helper keeps the inline card and the fullscreen view visually identical without sharing animation state across portals.
- **`<EconomyPanel/>`** (`src/components/EconomyPanel.tsx`, 705 lines) — live economy UI subscribed to `eventStore.on("*")` and re-derived each tick purely through the `economicsView` projection (no `WorldState` mutation, no `dispatch` from inside projections). Renders balance / net-worth / hardware inventory with wear-level decay / freelance job board filtered by year + reputation / available sponsorships / recent ledger entries, and exposes player actions: buy hardware, buy software, take job, sign sponsorship.

### Changed

- **Party-rivals logic** in `App.tsx` — typed `RIVAL_RELEASES` filter (year / disbanded / focus-band predicates) replaces the inline 4-rival hardcoded array.
- **`<DemoScreen/>`** — inline CRT now delegates every effect (raster bars, starfield, plasma, pixel fire, vector cube / pyramid, tunnel, sine scroller, HUD) to the shared `paintDemoFrame` painter so the inline + fullscreen surfaces stay visually identical without sharing animation state.

### Fixed

- BBS reply / recruit, release flow, party memories, alliance messages, cognitive stats UI no longer hardcode `"Tricycle Crews"` when a custom crew name is picked.
- `sim/engine/reducer.ts::emptyWorldState.groupName` hardcode flagged with a `TODO(dynamic-name)` for the eventual event-sourced hydrate path (current UI bypasses this through MainMenu's `setPlayerGroupName`).
- **EconomyPanel** post-launch nit cleanup:
  - Force-render setter renamed `setTick` → `_tick` (underscore-prefixed, comment block explains the non-standard role).
  - Recent-ledger rows now render sim-month labels (`Y1985 M11`-style) via a module-level `ledgerMonthLabel(ts)` helper. Helper math uses `((ts - 1) % 12) + 1` so the `December → January` boundary does not inflate the displayed year.
  - SOFTWARE_CATALOG empty-state now distinguishes "catalog itself empty (data missing)" from "filtered to empty for the current year" — the player sees an actionable CTA.

### Removed

- Stale `"tricycle"` sentinel keyword from `src/App.tsx::handlePostCustomBbsMessage` `recruitKeywords` — recruit detection is now purely intent-based.
- `src/data.ts` and `src/types.ts` — merged into `@sim/data` and `@packages/types`.

### Download options

| File | What it is |
| --- | --- |
| `Demoscene Simulator Setup 0.1.0.exe` | NSIS installer (recommended — writes Start Menu + Programs & Features entry). |
| `Demoscene Simulator-Portable-0.1.0.exe` | Portable — no install, run from any folder. |
| `Demoscene Simulator Setup 0.1.0.exe.blockmap` | Auto-update blockmap (delta-update metadata for `electron-updater`). |
| `latest.yml` | Auto-update channel manifest (consumed by `electron-updater`). |
| `preview.svg` | This SVG mockup of the in-game CRT demo screen. Removed in v0.2.0 in favor of a real PNG + GIF. |

Both Windows binaries are signed by electron-builder's default signing identity (no code-signing cert configured). Auto-update will work for users running from the NSIS install path.

---

*README / GDD / triage: <https://github.com/TimoP80/Scene_SImulator> · *Issues / v0.2.0 planning: <https://github.com/TimoP80/Scene_SImulator/issues>*
