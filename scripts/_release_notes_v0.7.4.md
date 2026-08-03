# Scene Simulator v0.7.4 — Party Attendance Mode, Partygoer Dialogue System, Living Rivalry Heatmap, BBS Modern Era

**Release date:** 2026-08-02
**Compare:** [v0.7.3...v0.7.4](https://github.com/TimoP80/Scene_Simulator/compare/v0.7.3...v0.7.4)
**Commits on this tag:** the v0.7.4 feature work (party systems, WorldState migration, BBS era split) **plus the new Windows + macOS desktop packaging pipeline** — CI now builds and publishes installers for both platforms on release tags.

v0.7.4 is the biggest player-experience drop since the competition system landed. For the first time you can *live inside* a demoparty: walk the floor of a venue packed with hundreds of procedurally generated sceners who remember you, then spend a full Friday→Sunday weekend balancing demo deadlines, compos, sleep, and coffee against seven survival needs. Under the hood, the WorldState migration finishes making the event log the single source of truth, the rival sim finally writes real rivalry-heatmap relationships that feed the scene press, and the BBS rumor pool becomes era- and relationship-gated — including a brand-new `modern` era for the 2006–2026 world. Plus a save/load regression that silently reset progress on Continue is fixed.

> _Release notes mirror the `[0.7.4]` section of `CHANGELOG.md`. See `CHANGELOG.md` for the canonical source._

---

## Highlights

### 🏟️ Party Attendance Mode — spend the weekend, don't just watch it
A brand-new game mode that simulates an entire demoparty weekend (Friday 16:00 → Sunday 21:00). Explore **14 venues** — entrance, main hall, seating, compo hall, stage, cafeteria, sleeping hall, showers, retro exhibition, merch shop, outdoor area, quiet workspace, organizer desk, info point — each with its own ambiance and ambient chatter. The weekend runs on a 16-block schedule (registration, opening ceremony, concerts, seminars, workshops, compos, prize ceremony, farewell) that fires live as time advances.

- Manage **7 player needs** (sleep, hunger, thirst, hygiene, energy, motivation, stress) that decay hourly and throttle your productivity.
- Build a production in a workspace (**code → optimize → test → package**) and enter any of **10 competition categories** (PC Demo, 64k, 4k, Shader Showdown, Graphics, Music, Executable Music, Fast Compo, Game Dev, Wild) before hard deadlines — **late entries are rejected**.
- Survive 13 deterministic random events: coffee spills, computer crashes, network outages, famous sceners, fire alarms, pizza deliveries.
- When the party ends, read a **personalized trip report**: productions completed, competitions entered, awards won, friendships, reputation gained, hours coded and slept, coffees consumed.

### 💬 Partygoer Dialogue System — "Walk the Floor"
The party floor is now alive. Hundreds of procedurally generated sceners populate the active party, each with a personality, role (coder / musician / graphician / organizer / visitor / newcomer), country, age, group affiliation, and a current project. A pure DialogueEngine turns context (role × personality × party phase × player reputation × friendship) into context-aware lines: reputation-based greetings, event reactions, location ambient, scene knowledge, and pre/post-compo chatter. A RelationshipManager tracks friendship / respect / rivalry with the player across repeated conversations — **the same scener remembers you**.

### 🔥 The rival sim finally writes the rivalry heatmap
`simulateRivalGroups` now populates `RivalGroupState.rivalries` instead of leaving it `{}` forever. Five writers drive real relationships over 40 years of simulated history: bootstrap historical seeds (Future Crew ↔ Razor 1911, Fairlight ↔ Razor 1911, …), same-month release races (winner gains disdain, loser resentment), member-poaching shocks, splits (parent resents the breakaway), and rare per-pair collaborations that build friendly ties. The **GroupDossierPanel rivalry heatmap** and the spyline scandal gate now light up from real simulated relationships instead of dead code.

### 🗺️ WorldState migration completion
12+ redundant `useState` mirrors removed from `src/App.tsx`. Game state now reads **exclusively from the event-sourced WorldState** via `useSimulationSelector` — the append-only event log is the single source of truth for money, reputation, rigs, techs, crew, releases, news, and the calendar. New Game and scenario loads reset through chained `dispatch()` calls per item.

### 📡 BBS era model split: 3 → 4 buckets, with a new `modern` era
The `late` bucket (which had folded the whole 1996–2026 span) is split: `early` (<1990), `mid` (1990–1995), `late` (1996–2005), and the new **`modern`** (2006–2026). All four era-indexed pools gained hand-written `modern` content — HD/streaming/AI-era topics for categories, boards, voice profiles, and personalities — so a 2020 thread gets GPU/raymarching/AI talk instead of Voodoo 3 nostalgia. The rumor-spyline pool is now **era-gated AND relationship-gated**: a scandal headline only fires when the rumor's endpoints have a real hostile relationship in WorldState, and a 1985-era dialup leak headline is never served alongside a 2023-era thread.

### 🖥️ Windows + macOS desktop builds — installers ship with this release
`npm run dist:win` (NSIS installer + portable EXE, x64) and `npm run dist:mac` (DMG + zip for x64 and arm64) now flow through one shared orchestrator, and the CI (`build-macos` on macos-latest, `build-windows` on windows-latest) packages both platforms on release tags and **uploads the artifacts straight to the GitHub Release**. The icon generator also emits a proper macOS `icon.icns`. macOS DMGs are built unsigned/ad-hoc in CI (no Apple signing cert in this repo yet).

### 💾 Save/load key-mismatch regression fixed (Continue reset progress)
A v0.7.4-era regression where saving and reloading could silently reset money / reputation / rigs / techs / crew / releases to defaults is fixed with a canonical `AutosaveData` contract (`SAVE_VERSION = 2`), a `migrateSave()` normalizer that handles both legacy and buggy-window keys, and both readers routed through it. Your saved active platform is restored too.

---

## Screenshots-Worthy Callouts

- **The Party tab → "ATTEND A WEEKEND"** — the full-screen weekend overlay: a venue map of 14 explorable halls, a live needs grid that decays every simulated hour, the compo board with real deadlines counting down, and the rolling weekend log.
- **"Walk the Floor"** — the partygoer overlay: hundreds of unique sceners with role badges, country flags, and contextual dialogue that changes with the party phase and your reputation.
- **GroupDossierPanel rivalry heatmap** — the 40-year rival relationship web now populated by the sim itself: hostile ties in rose, friendly collaborations in cyan, built up from release races, poaching, and splits.
- **The weekend trip report end-screen** — a personalized retrospective: hours coded vs. slept, coffees consumed, friendships made, awards won, reputation gained.
- **ScenarioEditor devtools tab** — jump to 1985 / 1991 / 1998 presets and live-edit money, rigs, techs, crew, and seed releases mid-game.

---

## What's New

- **Party Attendance Mode** — full weekend life-sim at a living demoparty (14 venues, 16-block schedule, 7 needs, 10 compo categories, 13 random events, personalized trip report). Pure deterministic engine (`sim/domain/partyAttendance.ts`), content in `sim/data/partyAttendance.ts`, driven by the `usePartyAttendanceMode` hook + `PartyAttendancePanel` overlay. 18-check smoke suite.
- **Partygoer Dialogue System** — hundreds of generated sceners with personalities, roles, and a relationship manager that remembers you across conversations. Pure DialogueEngine (`sim/domain/partygoers.ts`) over curated pools (`sim/data/partygoers.ts`), surfaced as the "Walk the Floor" overlay. 25-check smoke suite.
- **Rival sim writes the rivalry heatmap** — five deterministic writers (bootstrap seeds, release races, poaching, splits, collaborations) populate `RivalGroupState.rivalries` with the GroupDossierPanel sign convention (intensity > 0 = hostile, < 0 = friendly, −100…+100). 16-check smoke suite with PREDICTED rolls — no assertion waits on chance.
- **WorldState migration completion** — 12+ redundant state mirrors removed; all game state reads from the event-sourced WorldState.
- **`useKeyboardShortcuts` hook** — single-listener global shortcut system with spec → handler map, `ignoreWhenTyping` guard, and pure tested parsers. New `M` (Music) and `S` (Settings) shortcuts join `L` (logo generator) and Ctrl/Cmd+Shift+D (dev mode). 30-check smoke suite.
- **`ScenarioPreset` type + shared constants + ScenarioEditor devtools tab** — typed presets for 1985 / 1991 / 1998, `applyScenarioPreset()` helper, shared seed article constants, `NewsLogReset` event, and a runtime playtest editor wired into DevMenu.
- **BBS thread library expansion** — seed library grows from 48 to **383 threads**: music gear debates, demo style analysis, scene economy, pixel-art tutorials, tracker flame wars, cracktro ethics, sizecoding challenges, real-hardware compatibility reports, and more.

## What Changed

- **SPYLINE_TEMPLATES era-gated + relationship-gated** — the rumor-spyline pool is now indexed by era (`early`/`mid`/`late`/`modern`, 11 templates total) and scandal articles only publish when the rumor's endpoints have a real hostile relationship in WorldState (heatmap entry, social-graph rivalry edge, or fresh split/disband drama within 6 months). A positive "glorifying" rumor between rivals is praise, never a leak story.
- **`package.json`** — bumped `0.7.3` → `0.7.4`; five new smoke scripts (`test:keyboard-shortcuts`, `test:save-load`, `test:rivalry-heatmap`, `test:party-attendance`, `test:partygoers`) wired into `test:all` (**32 smoke suites** now).
- **`src/App.tsx`** — keyboard handling migrated to `useKeyboardShortcuts`; scenario loading refactored onto `applyScenarioPreset()`; New Game resets rewritten as chained dispatches.
- **`sim/engine/reducer.ts`** — ~200 lines of scenario preset + seed article constants; `NewsLogReset` reducer case.
- **`sim/events/eventTypes.ts`** — `NewsLogResetEvent` added to the `SimEvent` union.
- **`src/devtools/DevMenu.tsx`** — SCENARIO EDITOR tab added.

## Bug Fixes

- **Save/load key-mismatch regression** — legacy and `ws*` keys normalized via `migrateSave()`; active platform restored; 24-check `saveLoadRoundtrip.smoke.ts` pins the contract.
- **Scoring smoke fixtures stale since v0.7.3** — 23 checks regenerated against the current engine; Neon Retro mood multipliers now flow through all scenarios (S1 overall 44→46, S6 originality 100→90).
- **BBS era model split** — `getEra()` now maps the full 1985–2026 window with no gaps; all era-indexed pools gained `modern` content; BbsTab's inline era mapping replaced with the real function.
- **BBS thread expansion duplicate IDs + stale infoType union** — 6 duplicate template IDs renamed; `BBSInfoType` now DERIVED from a canonical `BBS_INFO_TYPES` const array so the union and runtime sets can never diverge.
- **Stale sim-window pins swept to 2026** — platforms, party-calendar, jobTemplates, rivalReleases, and softwareCatalog smokes now import shared `SIM_WINDOW_MIN`/`SIM_WINDOW_MAX` constants derived from `ERA_BOUNDARIES`.
- **Space-bar keyboard shortcut spec** — `parseShortcut(" ")` now preserves a lone space as the space-bar key.
- **Rig shop ignored hardware release years** — the Amiga 1200 (real release 1992) was buyable in 1986 because the shop never gated on `config.year`. Fixed with a pure `platformsAvailableAtYear()` helper; unreleased rigs now render dimmed with a `RELEASES {year}` badge and can't be bought until their actual release year.

---

## Installation

### Play it now
The game is published at **https://timbor80.itch.io/demoscene-simulator**. This tag ships as a **source release** — see below for the dev/build paths; the itch.io build is refreshed when a packaged build is cut.

### Run from source (dev)
```sh
git clone https://github.com/TimoP80/Scene_Simulator.git
cd Scene_Simulator
npm install
npm run dev:electron    # Vite renderer + Electron host
# or: npm run dev        # browser-only via http://localhost:3000
```

### Build a Windows installer / portable
```sh
npm install
npm run build:all        # bundle worklet + renderer + host
npm run dist:win         # NSIS installer + portable EXE under release/
```

### Build the macOS app (DMG + zip, x64 + arm64)
```sh
npm install
npm run build:all        # bundle worklet + renderer + host
npm run dist:mac         # DMG + zip for x64 and arm64 under release/
```
> DMG creation needs `hdiutil`, so `npm run dist:mac` must run on macOS — the `build-macos` CI job does exactly this on release tags and uploads the DMGs/zips to this release.

### Verify the build
```sh
npm run lint             # tsc --noEmit
npm run test:all         # all 32 smoke suites
npm run audit:docs       # doc/sim parity gate
```

---

## Upgrade Notes

- **Save files auto-migrate.** The new `AutosaveData` contract (`SAVE_VERSION = 2`) normalizes both pre-migration legacy keys and the buggy `ws*` window keys into a canonical shape on first load — if you hit the Continue-reset bug on an earlier v0.7.x build, your progress restores correctly after this update.
- **New shortcuts:** `M` opens the Music library, `S` opens Settings. Gameplay keys back off while the fullscreen demo overlay is open (it owns `M` = tracker mute and `S` = scanlines).

---

## Verification

- `npx tsc --noEmit`: exit 0
- `npm run test:all`: all **32** smoke suites green (incl. the 5 new ones)
- `npm run audit:docs`: pass
- `npm run build`: clean

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
