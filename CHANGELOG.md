# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.6.1] - 2026-07-20

### Added
- **Centralized modal management (`useModal` hook)** — Replaces 7 independent
  boolean + setState modal pairs (settings, logoGen, playlist, demoSummary,
  effectGallery, shader, compilingOverlay) with a single `useModal()` hook
  providing `open(id)`, `close()`, `isOpen(id)`, and convenience wrappers.
  `ModalPortal.tsx` provides a shared backdrop/ESC-to-close/createPortal
  wrapper with fadeIn/scaleIn mount animations.
- **Settings modal (`SettingsModal.tsx`)** — Persistent in-game UI for
  viewing, saving, or clearing the Gemini API key at any time. Replaces the
  first-launch-only bootstrap with an on-demand experience. Key visibility
  toggle, validation, clear-with-confirmation, and help text linking to
  Google AI Studio. Accessible from a gear icon in the in-game toolbar or
  the Main Menu.
- **Group logo generator (`LogoGeneratorModal.tsx` + `public/logo-generator/`)**
  — Embeds the SCENEGEN demoscene group logo generator as a full-viewport
  iframe overlay. Lets players design custom group logos using Canvas2D +
  Three.js rendering. Export via PNG download or right-click save.
  Accessible from the Crew tab and toolbar.
- **LLM text generation system (`src/ai/textGenerator.ts`)** — Modular Gemini
  API integration for generating contextual demoscene text. Supports 6 text
  types: BBS replies, judge comments, news articles, NPC dialogue, interview
  answers, and scene events. Each type has a tailored prompt template with
  period-appropriate jargon. The `useTextGenerator` React hook manages
  loading/error/result state for components.
- **Event Inspector time-travel debugger (`EventInspectorPanel.tsx`)** —
  DevTools panel reading the full append-only event log from
  `eventStore.all()`. Filter by event type (with counts), click any row to
  replay state via `reduceAll(emptyWorldState(), events.slice(0, idx+1))`,
  view the full WorldState snapshot (player, calendar, crew, productions,
  economy). "Jump to this state" button rewinds the live simulation to any
  point in history via `loop.resetTo()`. JSON export button downloads the
  event log for offline analysis.
- **`resetTo()` method on SimulationLoop** — Enables time-travel debugging:
  replaces the event store with a prefix of events, re-derives WorldState
  from scratch, updates the simulation tick, and notifies all listeners.
- **`AppBootstrapper.tsx`** — Wraps the React tree in
  `SimulationLoopProvider` so `useSimulationSelector` and
  `useSimulationLoop` work correctly at all call sites including the top of
  App's function body. Fixes a crash where hooks called before the provider
  was mounted.

### Changed
- **`package.json`** — bumped `0.6.0` → `0.6.1`.
- **`src/App.tsx`** — 7 modal boolean useState pairs (14 lines) replaced
  with single `const modal = useModal()`. All `setShowX(true)` →
  `modal.openX()`, all `setShowX(false)` → `modal.close()`, all `showX`
  reads → `modal.isOpen("x")`. SettingsModal, LogoGeneratorModal wired
  into toolbar and pages.
- **`src/ai/imageGenerator.ts`** — Gemini model updated from
  `gemini-2.0-flash-exp` (deprecated/404) to `gemini-2.0-flash` (stable).
  Error handling improved for API version mismatches.
- **`src/main.tsx`** — App wrapped in `<AppBootstrapper />` instead of
  rendering `<App />` directly, fixing SimulationLoopProvider context order.
- **`src/components/DemoSummary.tsx`**, **`PlaylistManager.tsx`** — removed
  `open` prop (handled by useModal conditional rendering).
- **`src/components/SettingsModal.tsx`**, **`LogoGeneratorModal.tsx`** —
  removed `open` prop; simplified ESC effects.
- **`src/index.css`** — added `@keyframes fadeIn` and `@keyframes scaleIn`
  for modal animations. Removed Google Fonts `@import` that was breaking
  PostCSS/Tailwind v4 builds (moved fonts to `index.html` `<link>` tags).
- **`index.html`** — Google Fonts loaded via `<link rel="stylesheet">`
  instead of CSS `@import`, fixing Vite/PostCSS build failure.
- **`src/pages/BbsTab.tsx`** — BBS interaction improvements.
- **`src/pages/CrewTab.tsx`** — Logo generator button integrated.
- **`src/devtools/DevMenu.tsx`** — Event Inspector added as "Event Log" tab
  with `History` icon.
- **`sim/engine/simulationLoop.ts`** — Added `resetTo()` method for
  time-travel state rewinding.
- **`electron/settings.ts`** — settings schema migration improvements.
- Cleaned up stale `tmp/` scripts (`fix_commas.mjs`, `insert_effects.mjs`,
  `patch_era_labels.mjs`, `verify-playback.mjs`).

### Fixed
- **CSS build failure** — Google Fonts `@import url(...)` containing
  semicolons in the query string (`wght@400;500;700`) caused PostCSS to
  error on `@tailwindcss/vite` expanded output ("Missed semicolon"). Fixed
  by moving fonts to `index.html` `<link>` tags.
- **Gemini model not found** — `gemini-2.0-flash-exp` was deprecated.
  Updated to `gemini-2.0-flash` (stable).
- **SimulationLoopProvider context crash** — `useSimulationLoop()` called at
  the top of `App()` failed because the provider was inside App's JSX
  return. Fixed with `AppBootstrapper` provider-first pattern.
- **Compiling overlay open-then-close** — `openCompilingOverlay()` was
  called before `close()` in `triggerAssembleCompiler`, causing the overlay
  to flash and immediately close. Reordered to close-then-open.

### Added (cont.)
- **New files:**
  - `src/hooks/useModal.ts` — centralized modal state hook
  - `src/components/ModalPortal.tsx` — shared centered-modal wrapper
  - `src/components/SettingsModal.tsx` — on-demand Gemini API key settings
  - `src/components/LogoGeneratorModal.tsx` — group logo generator embed
  - `src/components/AppBootstrapper.tsx` — SimulationLoop provider wrapper
  - `src/devtools/EventInspectorPanel.tsx` — time-travel event log debugger
  - `src/ai/textGenerator.ts` — LLM text generation module
  - `src/hooks/useTextGenerator.ts` — LLM text generation React hook
  - `postcss.config.js` — explicit PostCSS configuration
  - `public/logo-generator/` — SCENEGEN group logo generator static assets

## [0.6.0] - 2026-07-20

### Added
- **Custom shader system** — A full expression-based shader DSL with tokenizer, recursive-descent parser, and Canvas2D runtime. Users write procedural effects in a code editor (`ShaderEditor.tsx`) with live canvas preview, compile error display, and save/delete/toggle management. Built-in example gallery (plasma wave, tunnel effect). DSL supports variables, math functions (sin/cos/sqrt/pow/atan2), color helpers (rgba/hsla/#hex), drawing commands (fillRect/fillCircle/setPixel/fillGradient/clear), loops, if/else, RNG with seedable mulberry32 PRNG, and runtime safety limits. Custom shaders render in both the inline CRT and fullscreen portal overlay (`DemoScreen.tsx`), and appear as toggleable cards in the DemoStudio effect grid alongside built-in effects.
- **Full tab decomposition — all 13 tabs extracted from App.tsx into `src/pages/`** — The monolithic App.tsx (~5,930 lines) was decomposed into 13 standalone page components: `WorkspaceTab`, `CrewTab`, `ResearchTab`, `PartyTab`, `ScenariosTab`, `NewsTab`, `BbsTab`, plus lazy-loaded `SocialGraphTab`, `GddViewer`, `EconomyPanel`, `HallOfFamePanel`, `StatsDashboard`, `ProductionTimeline`. An `ActiveTabRouter` switch function handles all routing. Each page component has an explicit props interface documenting its dependencies. App.tsx reduced to ~4,880 lines (-18%). Barrel file `src/pages/index.ts` provides a single import surface.
- **Multi-dimensional reputation system (Phase 1a)** — `packages/types/src/reputation.ts` defines a `ReputationVector` type with 7 axes (technical, artistic, music, graphics, party popularity, scene respect, oldschool credibility). New `ReputationChanged` event variant and reducer case. Domain helpers for reputation diffusion and decay (pure functions, no React/DOM).
- **Reactive technology tree (Phase 1b)** — Effects unlock automatically as the calendar advances. `sim/data/yearUnlocks.ts` pre-computes a year-to-unlocked-techs map. `sim/data/eraConfig.ts` defines era boundaries (8-bit 1985→1990, 16-bit 1990→1996, PC Dawn 1996→2001, 3D Shader 2001→2006, HD Shader 2006→2026). `sim/domain/technology.ts` provides `getEffectIdsAvailableAtYear`. The `effectUnlocks.ts` cache was optimized to O(1) via a pre-computed year→effects module-level map. `TechnologyForecast.tsx` renders year milestones, unlocked/upcoming techs, and era boundaries as a panel.
- **Simulation loop hooks** — `SimulationLoopContext.tsx` and `useSimulationSelector.ts` provide slice-level reactive reads from `loop.snapshot()`, enabling incremental migration from `useState` to event-sourced world state.
- **Disk virus subsystem** — `sim/domain/virus.ts` adds Amiga disk virus mechanics with random infection on compilation, visual manifestations (glitch, scrolltext, boot message, crash, corruption), and BBS discussion threads about outbreaks. 
- **AI image generation (`src/ai/imageGenerator.ts`)** — Integration with Gemini 2.0 Flash API to generate slide images for ArtSlide productions. Toggle in DemoStudio triggers per-slide generation with progress tracking.
- **BBS virus debate threads** — `sim/data/bbsMessages.ts` extended with `generateVirusDebateThread` and interactive reply options that let players gain reputation or research points by responding to NPC arguments about antivirus software being "scene" or not.

### Changed
- **`package.json`** — bumped `0.5.1` → `0.6.0`.
- **`src/App.tsx`** — ~1,045 lines of inline JSX removed as 13 tabs were extracted to page components. `renderTabContent` switch function handles all routing. State management for custom shaders (save/delete/toggle) and AI image generation added. DemoScreen receives `customShaders` and `mergedActiveEffects` props.
- **`src/components/DemoScreen.tsx`** — `paintDemoFrame` now accepts a `compiledShaders` map and renders custom shaders per frame. Both inline and fullscreen CRT views compile and render custom shaders. HUD displays custom shader count.
- **`src/components/DemoStudio.tsx`** — Custom shader section added to the effect grid with toggleable shader cards, complexity/visual impact readouts, and "EDIT IN SHADER EDITOR" links. New `onOpenShaderEditor` prop.
- **`sim/data/effectUnlocks.ts`** — `getEffectIdsAvailableAtYear` optimized from O(n) to O(1) via a pre-computed year→effects module-level map cache.
- **`sim/domain/index.ts`** — barrel exports updated for reputation, technology, and virus modules.
- **`sim/data/index.ts`** — barrel exports updated for eraConfig, yearUnlocks, and effectUnlocks helpers.
- **`vite.config.ts`** — resolved `@sim` alias path, removed stale `tmp/` file references.

### Added (cont.)
- **New files:**
  - `packages/types/src/shader.ts` — CustomShader type definition
  - `sim/utils/shaderEngine.ts` — Full DSL interpreter (tokenizer, parser, compiler, Canvas2D runtime)
  - `sim/utils/index.ts` — Barrel export for shader engine
  - `src/components/ShaderEditor.tsx` — Code editor with live preview, save/delete/toggle, example gallery
  - `src/components/TechnologyForecast.tsx` — Year milestone forecast panel
  - `src/hooks/SimulationLoopContext.tsx` — React context for simulation loop
  - `src/hooks/useSimulationSelector.ts` — Slice-level reactive selector hook
  - `src/pages/index.ts` — Barrel file exporting all 13 page components
  - `src/pages/WorkspaceTab.tsx`, `CrewTab.tsx`, `ResearchTab.tsx`, `PartyTab.tsx`, `ScenariosTab.tsx`, `NewsTab.tsx`, `BbsTab.tsx` — Extracted page components
  - `sim/data/eraConfig.ts` — Era boundary configuration
  - `sim/data/yearUnlocks.ts` — Year-to-tech-unlock map
  - `sim/domain/reputation.ts` — Multi-dimensional reputation helpers
  - `sim/domain/technology.ts` — Reactive technology helpers
  - `sim/domain/virus.ts` — Disk virus subsystem
  - `sim/__tests__/reputation.smoke.ts` — Reputation smoke tests
  - `src/ai/imageGenerator.ts` — Gemini AI image generation

## [0.5.1] - 2026-07-19

### Added
- **Slide show image generation (`SlideShowRenderer.tsx`)** — 10 procedural canvas-based slide painters (pixel_sunset, synthwave_retro, geometric_mandala, vector_portrait, algorithmic_noise, pixel_skull, glitch_tunnel, hex_grid_pattern, voxel_mountains, retro_space_scene). Deterministic seeded PRNG (mulberry32) ensures the same production name + slide index always produces the same gallery. Crossfade transitions use pre-allocated offscreen canvases (no GC pressure). Slides render on both the inline CRT and the fullscreen portal overlay.
- **Random ArtSlide generator** — One-click RANDOM ART SLIDE button in the DemoStudio (visible when Slide Show is selected) generates a complete slideshow: random title from 25 demoscene-style names (PIXEL PARADISE, NEON DREAMS, GLITCH CATHEDRAL, etc.), 2–6 random scenes with themed names (SUNSET OVERDRIVE, CRYSTAL CAVERN, etc.), slideshow-appropriate transitions (crossfade, dissolve, slide_left, etc.), weighted random artistic direction (biased: Artistic=5, Oldschool=4, Experimental=3, Technical=2, Music-Driven=1), and random duration. Effort sliders auto-set to ArtSlide defaults (15C/60A/10M/15O).
- **Splash screen with boot sequence** — Full-screen loading overlay shown on app startup with phased boot messages (14 phases: kernel init, data manifest, scene characters, demogroups, demo effects, technology tree, party calendar, BBS threads, production catalog, scene events, music metadata, social graph, simulation loop, system ready). Staggered timing (120–500ms per phase) makes the boot feel alive even with fast local JSON loading. Progress bar fills with a cyan→indigo→green gradient. Auto-transitions to MainMenu when loading completes. Customizable background image (`public/splash.png`).
- **Year range expansion: 1985–2005 → 1985–2026** — Added `ERA_HD_SHADER` (2006–2026) to `EraId` with start year 2006 in `ERA_START_YEAR`. Added `PC_PENTIUM_4` (2004, cpuLimit 2000) and `PC_CORE_DUO` (2006, cpuLimit 4000) platform configs. Added 15 modern parties (Revision, Solskogen 2002, Function 2007, Syntax Party 2008, Datastorm, Evoke 2015, Demobit, Love Byte, Inércia 2025, Flashback 2026) with full JSON mirrors. Added 27 hardware items (5 CPUs, 6 GPUs, 4 RAM kits, 3 storage, 2 audio, 3 monitors) spanning Pentium 4 HT through Core i9-13900K and GeForce FX 5950 through RX 7900 XTX. Era label display now shows 5 eras: "8-bit → 16-bit → PC Dawn → 3D Shader → HD Shader". Year boundary check updated from `nextY > 2005` to `nextY > 2026`.

### Changed
- **`package.json`** — bumped `0.5.0` → `0.5.1`.
- **`src/components/DemoScreen.tsx`** — new `productionType` and `slideCount` props. When `productionType === ArtSlide`, the CRT displays slideshow mode with auto-cycling slides (3s display + 0.5s crossfade) instead of hardware demo effects. HUD overlay shows slide number, title, and style. Slide metadata cached via `useMemo`. Both inline and fullscreen views support slideshow mode.
- **`src/components/DemoStudio.tsx`** — new `onRandomSlideShow` prop with a styled purple-pink gradient button (Shuffle icon, visible only when ArtSlide type is selected). Icon rotates 180° on hover.
- **`src/components/DemoSummary.tsx`** — added Image icon import and SLIDES row in MetaRow showing the scene/slide count.
- **`src/App.tsx`** — splash screen boot sequence with phased loading messages and `loadBaseContent()` call. New `handleRandomSlideShow` callback wiring. DemoScreen receives `productionType` and `slideCount` props. ERA_LABELS includes ERA_HD_SHADER. Year boundary alert text updated.
- **`sim/data/platforms.ts`** — exhaustive `Record<PlatformId, PlatformConfig>` now includes PC_PENTIUM_4 and PC_CORE_DUO.
- **`sim/domain/party.ts`** — RIVAL_PLATFORM_FOCUS exhaustive for both new platforms.
- **`sim/domain/scoring.ts`** — ERA_START_YEAR now includes ERA_HD_SHADER: 2006.
- **`sim/data/partyCalendar.ts`** — header comment updated to 1985–2026. Solskogen 2002 correctly placed under the 2000–2005 section.
- **`sim/data/hardwareCatalog.ts`** — 27 modern hardware entries spanning 2003–2020.
- **`data/hardware.json`** and **`data/parties.json`** — full JSON mirrors of all new hardware and parties.

### Added
- **Advanced party competition engine** — multi-judge scoring system with 6 personality types (Oldschool, Technical, Artistic, Experimental, Music-focused, Graphics-focused) that weight scores across 7 categories (Code, Graphics, Music, Design, Originality, Technical Difficulty, Overall Impression). Each judge has experience-based variance and personality multipliers. `sim/domain/competition.ts::generateJudgingPanel` creates 3–5 judges per competition; `judgeScore` applies personality-weighted scoring with variance; `runCompetition` orchestrates the full pipeline.
- **Audience reaction system** — 9 tiers of live audience reactions (Legendary Moment, Standing Ovation, Loud Applause, Huge Cheers, Polite Applause, Mixed Reactions, Confused Audience, Silence, Booing) with score thresholds and influence on party reputation, group reputation, fan following, and final excitement bonus. Resolved in `resolveAudienceReaction` based on average judge scores.
- **Party ranking ceremony UI (`PartyRankingScreen.tsx`)** — full-screen animated competition presentation with phased reveal: intro animation → dynamic event banners (projector failure, power outage, live coding, etc.) → one-by-one ranking card reveals with placement emoji, judge score breakdown panels, audience reaction display, scene award badges, and confetti for podium finishes. Each ranking card expands to show per-judge score cards with personality avatars.
- **Hall of Fame (`HallOfFamePanel.tsx`)** — permanent database of legendary productions with search, production type filter, year filter, and multiple sort modes (score, placement, year). Stats summary cards (total entries, wins, podiums, legendary moments). Expandable entries with award badges and full score breakdowns. Automatically qualifies entries with score ≥ 75 (+5 legendary for score ≥ 90). Capped at 100 entries with auto-dedup.
- **Player statistics dashboard (`StatsDashboard.tsx`)** — 12-tracked stats with reputation tier progress bar: wins, podiums, average placement, highest score, productions released, average originality, average technical difficulty, prize money earned, total downloads, audience popularity rating, most used effect, favorite production type. Production type breakdown with progress bars. 6 reputation tiers (Nobody → Rising Star → Scene Veteran → Legend → Icon → Myth). Stat cards animate on mount.
- **Production history timeline (`ProductionTimeline.tsx`)** — animated lifecycle visualization showing every release with phases: started, coding, graphics, music, optimization, result, released. Filterable by production type. Per-entry expandable timeline bars with date, party, result, placement, download count, and rating. Horizontal bar-style timeline with labels.
- **Scene awards system** — 8 award categories (Best Graphics, Best Music, Best Code, Best Design, Best Intro, Audience Favorite, Technical Excellence, Best Demo) with configurable score thresholds. Top-scoring entries in each category receive awards during ceremony. Award winners receive reputation bonuses.
- **Dynamic party events** — 14 random events (5 positive: Amazing Live Coding, Audience Hype, Last Minute Optimization, Unexpected Synergy, Hardware Upgrade; 5 negative: Projector Failure, Power Outage, Music Sync Failure, Unexpected Bug, CPU Incompatibility; 4 neutral: Sponsor Announcement, Guest Appearance, Surprise Guest Judge, Time Extension) with score modifiers (-15 to +20), flavor text, and probability weights. Events are drawn during competition and displayed as animated banners in the ceremony.
- **Rival group entry generation** — `generateRivalEntries` creates AI competitor productions with distributed scores based on rival count and random variance. Entries receive full judge scoring alongside the player's production, producing realistic placement outcomes.
- **Competition state management hook (`useCompetitionSystem.ts`)** — manages ceremony lifecycle, Hall of Fame auto-qualification, production history tracking, player statistics accumulation, and ceremony open/close. All state is reactive and persists across tab switches.
- **BBS message variety expansion** — voice profile messages expanded for EffectCoder, DemoDirector, and CrackerSwapper specialties (4 → 7 per era each, matching AssemblyWizard/TrackerLegend density). 2 new seed threads (`thread_tracker_1` — TRACKER_TUNES: Skaven/Drifter/Purple Motion debate 1986 chiptune; `thread_humor_1` — CODERS_CORNER: FlameAlchemist multicolor loader roast). 3 new BBS random events (DemosceneHistorian archive drop, CopperGhost copper list secrets, FlameAlchemist viral argument). Type fixes for CopperGhost and PulseWave focusCategories.
- **Competition data pack (`competitionEvents.ts`)** — 14 hand-authored dynamic party events with title, description, score modifier, and probability weight for each event type.
- **19 new legendary demogroups + 57 new NPCs** — massive world expansion adding The Black Lotus (Sweden), Fairlight (Sweden), Spaceballs (Norway), CNCD (Finland), Orange (Finland), Byterapers (Finland), Extend (Finland), Haujobb (Germany), Conspiracy (Hungary), ASD/Andromeda (Germany), Cocoon (Germany), Rebels (Worldwide), Scoopex (Europe), Kefrens (Denmark), Sanity (Norway), Melon Dezign (Finland), Bomb (Finland), Silents (Finland), TRSI (Europe), Dreamdealers (Sweden), and Alcatraz (Sweden). Each group has 2–5 members with fictionalized bios, unique avatar seeds, and proper specialties. Existing groups expanded: Future Crew (added Wildfire/Pixel, now 5 members), Complex (added Jugi/Rez/Ziphoid/Tempest, now 5), Triton (added Sir/Flame/Dune/Groo, now 5). All group↔member cross-references pass the initialGroups/initialNpcs smoke tests, all 57 avatar seeds unique. BBS color map updated with all new handles.
- **Rival group AI personality entries** — each new group receives a typed rivalry specialization (The Black Lotus: cinematic polished; Fairlight: clean design; Spaceballs: polished Amiga old-school; Conspiracy: size-coding; Haujobb: advanced rendering; Byterapers: humorous unconventional; etc.) for use by the competition engine's AI rival system.

### Changed
- **`package.json`** — bumped `0.4.0` → `0.5.0`.
- **`src/App.tsx`** — 3 new navigation tabs (Hall of Fame, Stats, Timeline) added to the side toolbar with Trophy, Activity, and Calendar icons. Competition ceremony overlay renders when ceremony is active — triggered by the "SHOW AWARD CEREMONY" button in the party flow. Competition system state (ceremony, Hall of Fame, production history, player statistics) managed via `useCompetitionSystem` hook. Stats auto-recompute on ceremony close. New components wired: `HallOfFamePanel`, `StatsDashboard`, `ProductionTimeline`, `PartyRankingScreen`.
- **`packages/types/src/index.ts`** — added `export * from "./competition"` barrel export for all competition types.
- **`sim/data/initialGroups.ts`** — 23 demogroups total (was 4: Fairlight, Spaceballs, Crest, Razor 1911). New entries span 8 countries with era-appropriate founding years and 2–5 memberIds each.
- **`sim/data/initialNpcs.ts`** — 57 NPCs total (was ~12). New sceners include legendary coders (Spot, Chaos, Gargaj, BoyC, Tomcat, Marq, Jugi, Sir, Dr.Yes, Psi, Trixter), musicians (Purple Motion, Skaven, Basehead, Lizardking, Necros, Jogeir Liljedahl, Heatbeat, Moby, Romeo Knight, Jester, Falcon, Travolta, Awesome, Elwood, Dr. Awesome), and graphicians (Facet, Cyclone, Made, Mirage, Electric, Prowler, Uno, Pixie, Exocet, H7). All with era-appropriate bios and unique avatar seeds.
- **`data/groups.json`** and **`data/sceners.json`** — mirrored to match TypeScript source.
- **`sim/data/bbsMessages.ts`** — BBS color map expanded with ~57 new handle-to-color entries for all new NPC handles.

## [0.4.0] - 2026-07-19

### Added
- **4 new rival groups (Crest, Spaceballs, Triton, Complex) + 7 new sceners** — `data/groups.json` / `sim/data/initialGroups.ts` gained Crest (France, C64), Spaceballs (Sweden, Amiga), Triton (Germany, PC), and Complex (Finland, PC) — 4 rival groups with 5 affiliated NPCs (Gibson, Zardax, Prowizard, Crypton, Membrane) plus 2 freelance sceners (Sync, Pixie). All avatarSeeds unique, all group↔member cross-references pass the `initialNpcs` / `initialGroups` smoke tests.
- **ProductionTypeConfig system (`PRODUCTION_TYPE_CONFIGS`)** — every production type (Mega-Demo, 64KB Intro, 4KB Intro, MusicDisk, Cracktro/Trainer, Slide Show) now has a typed config in `packages/types/src/demo.ts` defining max effects (6/4/2/3/3/1), size limits (0/65536/4096/0/0/0 bytes), default scene counts (3/1/1/1/1/4), multi-scene support flags, per-category score bonuses, and suggested effort splits. The config drives type-specific UI hints in DemoStudio and scoring modifiers in `sim/domain/scoring.ts`.
- **Multi-scene sequencing** — `packages/types/src/demo.ts` adds `SceneTransition` (7 types: cut, fade_to_black, crossfade, slide_left/right, zoom_in, dissolve), `DemoScene` (per-scene effects/transitions/name), and `sceneCount` / `scenes` fields on both `DemoCreationInput` and `Production`. The UI in `src/components/DemoStudio.tsx` shows a scene count selector (1–6) for types that support multi-scene (Mega-Demo, Slide Show) and a per-scene editor card (`SceneEditorCard`) with effect chips and transition dropdowns. `src/components/DemoSummary.tsx` renders a `SceneTimeline` component showing numbered scene badges with transition arrows and per-scene effect lists.
- **Scene variety scoring** — `sim/domain/scoring.ts::applySceneVarietyBonus` rewards productions with multiple scenes: scene count bonus (diminishing after 4), transition variety (unique transitions across scenes), and effect distribution bonus (effects spread across scenes rather than crammed into one). The bonus applies to audienceAppeal, graphics, and originality categories.
- **Production type scoring modifiers** — `sim/domain/scoring.ts::applyProductionTypeModifiers` applies the per-type score bonuses from `PRODUCTION_TYPE_CONFIGS` to each breakdown category. 4KB intros boost originality and technicalDifficulty; MusicDisks boost music; Cracktros boost audienceAppeal; Mega-Demos boost graphics and technicalDifficulty. Two new factor fields (`productionTypeModifier`, `sceneVarietyBonus`) appear in `ScoreBreakdown.factors` and are displayed as FactorTile entries in the summary modal.
- **Enhanced DemoStudio type info banner** — `src/components/DemoStudio.tsx` now renders a gradient info banner showing the production type label, description, max effects badge, size budget indicator (with color-coded warnings at 50%/80% thresholds, visible for 4KB/64KB), multi-scene support indicator, and suggested effort split.

### Changed
- **`package.json`** — bumped `0.3.2` → `0.4.0`.
- **`src/components/DemoStudio.tsx`** — layout grid for expanded controls expanded from 4 columns to 6 to accommodate the new scene count selector; type config banner and SceneEditorCard components added; `DemoStudioProps` interface extended with 5 new scene-related props (sceneCount, onSceneCountChange, demoScenes, onSceneChange, totalUniqueEffects); `Forward` icon replaced with `SkipForward` (lucide-react).
- **`src/components/DemoSummary.tsx`** — added `SceneTimeline` component, production type config section, and two new factor tiles (`Scene Variety`, `Type Modifier`) to the factor contributions grid. `Forward` icon replaced with `SkipForward`.
- **`src/App.tsx`** — added `studioSceneCount`/`studioScenes` state, `generateDefaultScenes` helper for initializing multi-scene productions (first scene gets all selected effects, subsequent scenes start empty with cycling transitions), `handleSceneCountChange`/`handleSceneChange` callbacks, and `toggleSelectEffect` now also syncs effect toggles into the first scene. The `generateDemoSummary` call now passes `sceneCount` and `scenes` from the studio state. The production object is stamped with `scenes` and `sceneCount`.
- **`sim/__tests__/scoring.smoke.ts`** — all 11 scenarios updated to reflect the new production type modifier scoring shifts (baseline values increased by roughly +2–6 across categories due to Mega-Demo config bonuses). Added `sceneCount: 1` to all `runPipeline` creation inputs and the two new factor fields (`productionTypeModifier`, `sceneVarietyBonus`) to the fixed-breakdown fixture. The `S3 graphics vs S1 lift` cross-check updated for the shifted baselines (51 → 85, lift 34). All 46 checks pass.

### Added
- **6 new dev-tools editor tabs (`EffectEditor`, `GroupEditor`, `EventEditor`, `MusicEditor`, `PartyEditor`, `ResearchEditor`) completing the 8-tab DevMenu** — every editor is a thin layer on top of the shared `EditorShell<T>` (search / sort / filter, create / edit / delete / duplicate, undo / redo via `useUndo`, Zod-schema validation on save, JSON import / export, reload-from-`/data/`, reset). Each tab provides only its own empty-factory and form component — id + name + scalar fields, plus nested list controls (compat-platforms / synergy tags, members + releases, competitions + entrants, messages + choices, etc.) where the schema calls for them. The 2 pre-existing tabs (`ScenerEditor`, `BbsEditor`) keep their original shape but were also migrated to `useContentMap` as part of the reactivity fix below. `DevMenu` now imports + renders all 8 editors and the editor surface grows from the v0.3.0 two-tab rollout (`ScenerEditor` + `BbsEditor`) to all 8 tabs fully wired. New icon set: Newspaper (event), Group (group), Music (music), FlaskConical (research), Sparkles (effect), Calendar (party), plus the existing Users (scener) and MessageSquare (BBS).
- **2 new content-authoring data types + curated JSON packs** — `packages/types/src/event.ts::SceneEvent` (closed `SceneEventType` union: `rival_release` / `party` / `bbs_drama` / `tool_launch` / `magazine_issue` / `other`; `year` + `month`; `actor`; `headline` + `description`; optional `platform: PlatformId` link + optional `prestige: number` 0–100) and `packages/types/src/music.ts::MusicTrackMetadata` (closed `MusicFormat` union: `MOD` / `XM` / `IT` / `S3M` / `OTHER`; `storedName`; `displayName`; `size`; `tags: string[]`; optional `bpm` / `comment` / `authoredYear`, with `id` separate from `storedName` so renaming the on-disk file does not orphan the store entry). Both are barrel-exported from `packages/types/src/index.ts`; matching Zod schemas (`SceneEventSchema`, `MusicTrackMetadataSchema`) live in `src/content/schema.ts` and validate the editor's draft on save. `data/events.json` ships 13 hand-authored scene events spanning 1988 BBS-raster-wars through 2000 Breakpoint / Farbrausch era; `data/music.json` ships 6 tracker modules (Starshine, Unreal, Second Reality Theme, Flat Panic Groove, Vectors Greeting, Werkzeug Suite) with format / size / BPM / tags / comment / authoredYear metadata. The `ContentStore` + `ContentLoader` paths gained `events` and `musicTracks` slots to round out the 9 content types (`sceners`, `bbsThreads`, `groups`, `parties`, `effects`, `research`, `productions` pre-existed; new total: 9). The social-graph `event`-node bucket is now reachable from three editor types (`SceneEvent` via `projectSceneEvents`, `PartyEvent` via `projectParties`, `BBSThread` via `projectBbsThreads`) — pre-v0.3.3 it only surfaced through the hand-coded event seeds in `App.tsx`'s `graphNodes: SocialNode[]`.
- **`src/content/graphProjections.ts` + App.tsx social-graph bridge** — 9 pure projection functions (`projectSceneEvents`, `projectGroups`, `projectParties`, `projectEffects`, `projectResearch`, `projectSceners`, `projectBbsThreads`, `projectProductions`, `projectMusicTracks`), each takes the content map (plus a `graphNodes` lookup and the effects map where relevant for cross-projection id matching) and returns `{ nodes: SocialNode[]; edges: SocialEdge[] }`; no React / DOM / LLM coupling, so they are trivially testable in isolation. The `useGraphProjections` hook runs all 9 inside their own `useMemo` (an edit to one content map does not invalidate the other 8 projections) and merges the results with the hardcoded `graphNodes` / `graphEdges` props via a `Set`-based id de-dup where "hardcoded wins on id collision" (keeps the 5 seed event nodes pinned; the intentional masking of edits to seeded sceners / groups is documented in a TODO + warning block at the merge step). `App.tsx`'s `SocialGraphTab` consumer now feeds `combinedGraphNodes` / `combinedGraphEdges` so edits in any of the 9 editors appear in the graph in real time — pre-v0.3.3 the bridge silently failed to re-render after an edit because of the same `useSyncExternalStore` map-identity bailout as the editors; the immutable-upsert + `useContentMap` fix above closes that race as a side effect.
- **`sim/__tests__/contentStoreReactivity.smoke.ts`** — 9-scenario regression smoke for the editor-list-staleness bug below. Pins the immutability + subscription contract the editors' `useContentMap` hook depends on: read APIs (`get` / `getOne` / `list` / `ids`) agree after upsert; `upsert` produces a fresh map reference (the load-bearing assertion); `upsert` notifies subscribers; the `getSnapshot` round-trip used by `useContentMap` sees the new entity; re-upserting the same id replaces (no duplicates); `delete` is also immutable + notifies; `duplicate` appends `-copy` / `-copy-N` until unique; `reset` wipes all 9 content types and notifies; end-to-end editor flow — two saves → both entities appear in the list (the literal user-reported failing scenario). Wired into `npm run test:content-store` and `npm run test:all`.
- **`sim/__tests__/graphProjections.smoke.ts`** — 19-scenario regression smoke for the projection + merge contract in `src/content/graphProjections.ts`. Pins all 9 pure projections by calling them directly (no React mount, no happy-dom) — round-trip node/edge shape, id-based cross-projection linking (label vs id match, case-insensitivity, lookup-miss behavior), the BBS actor type restriction (`projectBbsThreads` deliberately rejects event-type actors so a user-typed `actorId = "Breakpoint"` cannot silently cross-link to the hardcoded event node), and the typo'd-effect guard in `projectProductions` (`if (effId in effects)`); pins `mergeProjectedGraph` directly (imported from the production module rather than reproducing the body inline) — basic case, hardcoded wins on id collision, cross-projection dedup, cross-source edge dedup with hardcoded winning, and empty-inputs sanity gate. Wired into `npm run test:graph-projections` (inserted into `test:all` between `test:content-store` and `test:audit-docs`).

### Changed
- **`src/content/graphProjections.ts::mergeProjectedGraph` extracted** — the hook's final `useMemo` body (which Set-basically concatenates hardcoded nodes/edges with the nine fanned-out projections and de-dups by id, pinning the v0.3.0-era `hardcoded wins on id collision` contract) used to live inline inside `useGraphProjections`. Now it's a top-level `export function mergeProjectedGraph(hardcodedNodes, hardcodedEdges, derivedNodes, derivedEdges): GraphProjectionResult` and the hook delegates to it inside its final `useMemo`. Rationale: the prior round's code review flagged that an inline-only merge body couldn't be tested for drift (a smoke pinning a replica would always pass even if the production changed). The smoke at `sim/__tests__/graphProjections.smoke.ts` now imports the helper directly. **Signature drift** in the helper (arg rename / return-type change) trips `tsc --noEmit` at the call-site before the smoke even runs; **behavioural drift** (e.g., reversing the `if (!nodeIds.has(dn.id))` guard to flip hardcoded-wins into derived-wins) typechecks-clean but produces duplicate ids in `combinedGraphNodes` where uniqueness was contractually pinned (a `!nodeIds.has(dn.id)` → `nodeIds.has(dn.id)` flip pushes a derived entry on top of an already-spread hardcoded entry, yielding two entries with the same id) — that's the contract the smoke's pinned scenarios catch, documented in the smoke's file header. The hook's deps array is unchanged; delegation adds no new memory cost.

### Fixed
- **Editor list does not update after adding a new entity** — the 8 dev-tools content editors (`ScenerEditor`, `BbsEditor`, `PartyEditor`, `EffectEditor`, `ResearchEditor`, `GroupEditor`, `EventEditor`, `MusicEditor`) read their items with `const items = useMemo(() => store.get(...), [store])`. Since `ContentStore` is a module-level singleton, the `[store]` dependency never changed and the memo never recomputed — the editor never re-rendered after a save, so the new entity was invisible in the list (the form data was correct, the form was editable, just the list view was stale). A secondary compounding issue: even with proper subscription, `ContentStore.upsert` mutated the map in place, so `useSyncExternalStore` would have bailed out on `Object.is` reference equality and the editor would still not have re-rendered. Fix: `ContentStore.upsert` now produces a fresh map object via spread (`(this.data as Record<string, unknown>)[type] = { ...this.data[type], [id]: data }`) so the map reference changes on every save; the 8 editors now use `useContentMap(...)` (the existing `useSyncExternalStore`-based hook in `src/content/useContentStore.ts`) instead of the dead `useMemo`. Also fixed `useContentMap` / `useContentList` return type: the previous `ReturnType<typeof getContentStore>["get"] extends (t: K) => infer R ? R : never` conditional resolved to a union of all `Record<string, T>` types (TS2322 across all 8 editors after the swap); replaced with a direct `ContentMap[K]` for a correctly-narrowed return type. The same `useContentMap` hook is also used by `src/App.tsx`'s social-graph bridge — which was already wired up but previously also failed to re-render for the same reason. It now updates in real time as a side effect of the immutable-upsert fix. Covered by `sim/__tests__/contentStoreReactivity.smoke.ts` (9 scenarios — see Added above).
- **`sw_photoshop_5.effectUnlocks` deliberate-fixture restoration** — the v0.3.2 commit (`chore(release): cut v0.3.2`, `f91e766`) renamed the first array entry from `"procedural_textures"` (the TechNode id, *not* an effect id) to `"domain_warp_field"`, which silently broke `sim/__tests__/effectUnlocks.smoke.ts` Scenario 5. The fixture is load-bearing: the giant ⚠️ NOTE block at the top of that smoke test pins the stale `"procedural_textures"` ref as the sanitize-step negative assertion (`!result.has(...)`) anchor and as the input to the auto-derived SHA256-12 stale-ref fingerprint (`EXPECTED_STALE_FINGERPRINT = "6a9bf1824d58"`). Restored the array to `["procedural_textures", "domain_warp_field", "cloth_physics"]` and added an in-source comment pointing at the smoke test so the next contributor reading the catalogue without opening the test still sees the load-bearing warning. The `domain_warp_field` addition (a real `DemoEffect` from the v0.3.0 JSON-only catalogue extension) is preserved — Photoshop 5 LE in 1998 still unlocks both shader effects for PC_PENTIUM_II+ crews. The restored array also required a targeted carve-out in `sim/__tests__/softwareCatalog.smoke.ts` Scenario 2: that smoke asserts zero dangling effectUnlocks references (typo-catcher for new contributors) and was tripping on the deliberate stale ref. The carve-out skips exactly one `(source, ref)` pair (`sw_photoshop_5 -> procedural_textures`) and is documented in a 16-line ⚠️ LOAD-BEARING CARVE-OUT block so a future contributor "tidying up" the test doesn't accidentally drop the bypass; every other effectUnlocks entry in every other software offering still goes through the strict no-dangling assertion. At runtime, `sim/data/effectUnlocks.ts::getUnlockedEffectIds` drops the `"procedural_textures"` string before the unlocked set escapes, so the carve-out is test-only — the studio never surfaces it as an effect. See the test's ⚠️ NOTE block for the full contract.

## [0.3.2] - 2026-07-09

### Added
- **`scripts/bundle-worklet.mjs` + chained `bundle:worklet` build step** — concatenates `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into a single `public/worklets/openmpt.bundled.worklet.js` asset, renaming the inner `libopenmpt` factory to `libopenmptPromise` and stripping any leftover static `import` statements so the bundle loads cleanly under Chromium's AudioWorklet static-import restrictions. `npm run bundle:worklet` is now the first step of `npm run build:all`, so the bundled worklet ships through Vite's normal asset pipeline at the document's same-origin URL and needs no custom-scheme plumbing in `electron/main.ts`.
- **`scripts/dist.mjs` build orchestrator** — single entry point for production packaging: cleans `dist`, `dist-electron`, `public/worklets`, and `release/`; runs `npm run build:all`; invokes `electron-builder --win --x64` (or `--dir`); copies the resulting NSIS + portable artifacts plus `latest.yml` / `win-unpacked/` blockmap outputs into the project's local `release/` folder. `npm run dist:win` and `npm run dist:dir` now route through this script instead of invoking `electron-builder` directly, so contributor builds have one canonical pipeline with consistent log output and a single place to thread future revisions (e.g., codesigning, S3 upload).
- **17 granular `test:*` per-pack smoke runners** — `test:effect-unlocks`, `test:scoring`, `test:judging-profiles`, `test:artistic-directions`, `test:effect-synergies`, `test:hardware-catalog`, `test:sponsorship-catalog`, `test:technology-tree`, `test:software-catalog`, `test:demo-effects`, `test:initial-npcs`, `test:initial-groups`, `test:party-calendar`, `test:job-templates`, `test:bbs-messages`, `test:rival-releases`, `test:platforms`. `npm run test:all` is now a 24-step chain (`smoke` + `audit-docs` + `load-during-import` + `economics` + `replay` + `migration` + `music` + the 17 new per-pack smokes) that fails fast on the first regression. Each runner pins an invariant specific to its catalogue — effect-unlocks↔DEMO_EFFECTS diff, scoring 7-category breakdown, judging-profiles PARTY_CALENDAR coverage, etc. — and is independently runnable without `test:all`.
- **`PartyEvent.year` typed anchor** — `packages/types/src/party.ts::PartyEvent` gained a `year: number` field alongside the existing `month`; `sim/data/partyCalendar.ts` writes the actual year every party ran (`Copy Party 1989`, `Venlo Meeting 1987`, `The Gathering 1992`, `Twilight Zone 1992`, `Assembly Summer 1992`, `Sun Demoparty 1992`, `Mekka & Symposium 1992`, etc.) on every entry, so projections can filter "upcoming parties in year Y" without a fragile month-only heuristic. Several previously-implicit bucketings (e.g., `Mekka & Symposium` now `1992` rather than the implicit "1990–1994 Amiga-dominant" comment bucket) are now type-checked against the calendar year the party actually existed.
- **Explicit settings-schema v1→v2 migration branch** — `electron/settings.ts::readSettings` now contains a dedicated `parsed && parsed.schemaVersion === 1` branch that lifts the legacy `geminiApiKey` and seeds an empty `music.playlist`, returning the v2 shape. Before this round, the legacy `geminiApiKey` would have been silently dropped on every subsequent read until the user re-entered it. The companion `normaliseMusic(raw)` helper now sanitises every playlist entry field-by-field (`storedName` / `displayName` / `format` enum / `size` number) so a partially-corrupt entry is dropped rather than crashing the whole settings load.
- **Extended DEMO_EFFECTS catalogue to JSON-parity** — `sim/data/demoEffects.ts` gained a "JSON-only catalogue" section with 23 additional entries (`color_cycling`, `interlace_flicker`, `dither_gradient_sky`, `roto_zoomer`, `copper_sprite_multiplex`, `dual_playfield_parallax`, `blitter_zoomsprite`, `wireframe_flythrough`, `rotating_logo`, `particle_system`, `l_system_plants`, `perlin_noise_clouds`, `chromatic_aberration`, `bump_mapped_torus`, `environment_mapping`, `boids_flocking`, `morphing_mesh`, `domain_warp_field`, `reaction_diffusion`, `raytraced_spheres`, `volumetric_fog`, `voxel_city`, `realtime_vocoder`) that were always present in `data/effects.json` but missing from the original hand-maintained TypeScript catalogue. Each new entry carries the v0.3.0 metadata (`complexity` / `visualImpact` / `compatiblePlatforms` / `synergyTags` / `researchRequired`) so the v0.3.0 scoring engine sees effects that previously only existed in the JSON pack.
- **`JOB_TEMPLATES` explicit `requiresCrewSkill` tags** — every template in `sim/data/jobTemplates.ts` now declares `requiresCrewSkill: "coding" | "graphics" | "music"` so the projection's job-board filter is skill-based instead of searching the description string (split across the 12 entries: 2× music-commission templates explicitly tag `music` — `job_8bit_chiptuneset` and `job_16bit_trackerpack`; 4× graphics templates tag `graphics` — `job_8bit_loadscreen`, `job_16bit_introart`, `job_pc_shareware_pack`, `job_modern_introfilm`; the remaining 6 tag `coding` — note that `job_modern_synthsize` is `type: "tool_contract"` not `music_commission`, so correctly tagging it `coding` matches its "build a byte-sized synth library" description). The new tags flow through `packages/types` `JobTemplate.requiresCrewSkill` so the `economicsView` projection can filter against `crew.skills` without an ad-hoc name match.

### Changed
- **`npm run clean` rewritten for Windows-safe recursive delete** — replaced `rm -rf dist server.js dist-electron` with `node -e "['dist', 'server.js', 'dist-electron', 'public/worklets', 'release'].forEach(p => require('fs').rmSync(p, {recursive:true,force:true}))"`, so the warm-rebuild path picks up the new `public/worklets/` and `release/` artefacts without POSIX `rm -rf` assumptions. Node's `fs.rmSync({recursive: true, force: true})` is the documented cross-platform equivalent and was already a transitive devDep.
- **`sim/data/index.ts` barrel gains BBS + effect-unlocks exports** — the existing catalogue barrel now exports `BBS_BOARDS` / `BBS_SCRIBES` / `SYSOP_REPLIES` / `SYSOP_MODERATION_MESSAGES` / `ERA_TOPICS` / `SPYLINE_TEMPLATES` / `BBS_RANDOM_EVENTS` / `BBS_MUTATIONS` / `VOICE_PROFILES` / `CATEGORY_MESSAGES` / `BBS_PERSONALITIES` / `getSeedThreads` / `getEra` / `generateFollowedReply` / `generatePersonalityMessage` / `colorForHandle` from `bbsMessages`, plus the `BBSBoard` / `Era` / `SpylineTemplate` / `BBSRandomEvent` / `BBSCategory` / `BBSPersonality` types and the `effectSynergies` / `artisticDirections` / `effectUnlocks` / `judgingProfiles` exports that the data-migration smoke test relies on. Importers can now read any catalog through `@sim/data` without reaching into a subpath.
- **`sim/domain/index.ts` scoring-barrel export** — added `export * from "./scoring"` so `sim/domain/scoring.ts`'s `scoreProduction` / `scoreBreakdownFor` / `competeAgainstJudgingProfile` / `ScoreBreakdown` helpers surface through the documented `sim/domain` barrel that other layers import; the previous direct-import path was a layering violation that the explicit barrel closes. `docs/architecture.md` documents `sim/domain/` as a pure-helper surface with no React/DOM/LLM, so centralising the re-export enforces the rule visibly.
- **`sim/data/softwareCatalog.ts` Photoshop 5 LE effectUnlocks corrected** — the legacy `procedural_textures` id has been renamed to `domain_warp_field` so the purchased-tool unlock matches the matching entry in the new `DEMO_EFFECTS` JSON-only catalogue. The previous id referenced a `procedural_textures` effect that was never added, so a player who bought Photoshop 5 LE on PC_PENTIUM_II in 1998 would have surfaced zero unlocks in the studio. The fix is a one-line id rename plus the `domain_warp_field` entry that supplies the unlock target.
- **Docs / repo metadata de-provenanced** — `README.md` removed the `Initial project started with Google AI studio, further development made locally with other AI tools.` attribution line (the project now self-describes its hybrid simulation + narrative stack without referencing the bootstrap environment); `docs/architecture.md` `apps/server/` row wording now reads `*(reserved — Express server for hosted/headless deployment parity)*` (the legacy `AI Studio parity` phrasing is gone — the project does not run on Cloud Run); `.env.example` documents both halves of the Electron+Vite split: `GEMINI_API_KEY` explains the first-run Electron prompt vs. the Vite dev export, and `APP_URL` is now described as an optional `self-referential / OAuth / API endpoint` override rather than an AI-Studio-injected Cloud Run URL; `index.html` `<title>` is now `Demoscene Simulator` (was the AI-Studio default `"My Google AI Studio App"`); `.gitignore` adds an inline `# electron-builder output (NSIS installers, portable EXEs, blockmaps, latest.yml, win-unpacked/)` comment above the `release/` ignore line so contributors reading the ignore list know exactly which artefacts `dist:win` produces.

### Fixed
- **Tracker-music worklet fails to load in Electron 42 (`addModule()` "Unable to load a worklets module")** — the v0.3.0 shipping path registered a custom privileged `worklet://` scheme via `protocol.registerSchemesAsPrivileged({ scheme: 'worklet', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true } })` BEFORE `app.whenReady()`, then copied `node_modules/chiptune3/chiptune3.worklet.js` + `libopenmpt.worklet.js` into `userData/worklets/` on first launch and served them through `protocol.handle('worklet', …)`. The renderer called `audioContext.audioWorklet.addModule('worklet:///chiptune3.worklet.js')`, but Electron 42's Chromium rejects the static `import './libopenmpt.worklet.js'` chain with "Unable to load a worklets module" even after the `Content-Type: text/javascript` patch shipped in v0.3.1 — the Worklet processor fetch happens under a stricter CORS/Worker-subresource policy than `protocol.handle` implements. Fix: `electron/main.ts` no longer registers any custom scheme or copies worklets into userData; `scripts/bundle-worklet.mjs` concatenates both files into a single `public/worklets/openmpt.bundled.worklet.js` asset Vite ships through the regular asset pipeline; the renderer calls `addModule('/worklets/openmpt.bundled.worklet.js')` same-origin. The `will-navigate` allow-list in main.ts collapses back to `IS_DEV ? DEV_URL : 'file://'` (the old worklet:// allow-list entry is gone).
- **`node:crypto` Rollup resolve failure on `npm run build:electron`** — `electron.vite.config.ts::rollupOptions.external` now lists `'node:crypto'` alongside the prior `node:url` / `node:path` / `node:fs` / `node:fs/promises` / `node:os` entries. `electron/main.ts`'s `createHash('sha256').update(buffer).digest('hex')` (used by `music:import-files` for SHA-256 de-dup) was hitting Vite's `__vite-browser-external` stub on a fresh checkout, producing "Cannot resolve 'node:crypto'" and breaking the host bundle step.

### Removed
- **`worklet://` custom-privileged scheme plumbing in `electron/main.ts`** — the `protocol.registerSchemesAsPrivileged([{ scheme: 'worklet', privileges: {...} }])` call that ran before `app.whenReady()`, the `protocol.handle('worklet', ...)` handler that mapped `worklet://` → `userData/worklets/`, and the per-launch `music:init-worklet` IPC handler that copied the two source files into `userData/worklets/` are all gone. The renderer-side `await window.electronAPI.getWorkletUrl()` path is also gone (see preload removal below). Net effect: small surface area, no `WORKLETS_CUSTOM_SCHEME` audit row, no first-launch race where the renderer attempted `addModule` before main had finished copying.
- **`music:init-worklet` IPC handler** — `electron/main.ts` no longer exposes a handler that the renderer calls on first launch to trigger worklet copy. The bundled worklet ships through Vite at build time, so there is nothing for Main to copy into userData on first use.
- **Preload `getWorkletUrl` surface** — `electron/preload.ts`'s `electronAPI` no longer exposes a `getWorkletUrl()` method; the renderer's `src/audio/trackerPlayer.ts::init()` now uses the statically-known `/worklets/openmpt.bundled.worklet.js` URL against the document origin, so `window.electronAPI.getWorkletUrl` is undeclared and any stale caller would trip `TypeError: ... is not a function`.
- **`build.extraResources` chiptune3 entries in `package.json`** — the two array entries that copied `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into `process.resourcesPath/worklets/` for the packaged build are removed. The renderer no longer reads from `resourcesPath/worklets/`; it reads `dist/worklets/openmpt.bundled.worklet.js` as a normal Vite-served asset. Reduces the installer footprint by ~50KB and removes the devDep-on-prod-runtime coupling.

## [0.3.1] - 2026-07-08

### Fixed
- **`npm run dev:electron` launch failure on fresh checkout** — the script was just `concurrently vite + electron .`, so `electron .` loaded `package.json`'s `main` field (`dist-electron/main.cjs`) which never existed on a fresh checkout. The renderer would load from Vite, but the Electron main process would either fail to start or launch with a missing preload, leaving `window.electronAPI` undefined. That made the music player (and every other Electron-bridged feature) trip the "requires Electron host" error in `src/audio/trackerPlayer.ts::init`. Now the script also runs `vite build -c electron.vite.config.ts --watch` in a third concurrent process, and `wait-on` blocks the Electron launch until both the Vite dev server and the freshly-built `dist-electron/preload.cjs` are ready. The host-watcher keeps `main.cjs` / `preload.cjs` up to date on subsequent `electron/*` edits; reload the window (Ctrl+R / Cmd+R) to pick up host changes (Electron itself does not auto-reload the preload in this setup).
- **Inline MUTE resetting on fullscreen toggle** — `audioEnabled` and `isPlaying` were trapped in two `useState` declarations inside `DemoScreen` (one for the inline CRT card, one for the portal-rendered `<FullscreenDemoView/>`). Pressing `F` to enter fullscreen unmounted+remounted the surface with fresh state, snapping the MusicBadge back to the "TAP TO PLAY" armed state. The two state hooks were hoisted into `App.tsx` as `crtAudioEnabled` + `crtIsPlaying` (with `useCallback` togglers `toggleCrtAudio` + `toggleCrtPlay`) sitting next to the existing `crtMusicTrack` state, and five props (`musicTrackStoredName`, `audioEnabled`, `isPlaying`, `onToggleAudio`, `onTogglePlay`) are forwarded through both surfaces. The hero-capture preview mount in `src/preview/CapturePreview.tsx` receives a `NOOP` callback stub since the capture pipeline is a stateless preview. This round also opportunistically deduped a stale duplicate of the "Interval ids owned by…" comment block from earlier patch work (the leading copy remains; the orphan was collapsed, leaving exactly 1 `useRef<>` declaration of `compileIntervalRef` and `partyVoteIntervalRef`).
- **Ghost release / prize drops on saved game load** — `triggerAssembleCompiler` and `startPartyVotingProcess` capture partial state in their `setInterval` closure callbacks; opening LOAD while one of these was in flight left the interval running. The terminal-tick callbacks (`finishCompilation()`, `awardPartyContestPoints()`) could fire AFTER the import had reset state, dropping a leftover release or prize credit into the freshly loaded save. Fix: `compileIntervalRef` + `partyVoteIntervalRef` `useRef<ReturnType<typeof setInterval> | null>(null)` declarations route both `setInterval` ids through the refs; the inner-callback `clearInterval(interval)` calls were rewritten to clear+null the ref; a guarded `clearInterval` pair sits at the top of `loadSavedGame`'s try-block to cancel in-flight compile/vote intervals before the snapshot applies; and an explicit ephemeral-state reset block (`setIsCompiling(false)`, `setCompilerProgress(0)`, `setCompilerLogs([])`, `setShowCompilingOverlay(false)`, `setActiveParty(null)`, `setIsPartyRunning(false)`, `setPartyStep(0)`, `setPartyRivals([])`, `setPartyVoteTally({})`, `setPartySelectedProdId('')`, `setPartyContestLogger([])`) defeats the React-18 auto-batching race where queued setStates from a dying interval's terminal tick could otherwise leak through `clearInterval`. `sim/__tests__/loadDuringImport.smoke.ts` was rewritten for determinism (a `makeInterval()` stub + manual `tick()`/`clear()` cycle instead of real `setInterval(..., 50)` which was flaking under sequential `npm run test:all` event-loop pressure); all three scenarios (positive-control bug repro, compile-interval cleared, vote-interval cleared) are green.

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
