# Scene Simulator v0.3.0 — Tracker-music player + JSON-driven content + multi-category scoring

**Release date:** 2026-07-07
**Compare:** [v0.2.0...v0.3.0](https://github.com/TimoP80/Scene_SImulator/compare/v0.2.0...v0.3.0)
**Commits on this tag:** 1 (the `chore(release): cut v0.3.0` version-bump commit, on top of the prior v0.2.x → main rebase that brought in the remote CI workflow commit).

This release lands the in-app tracker-music player (`.MOD` / `.XM` / `.IT` / `.S3M` via `chiptune3` AudioWorklet), moves all sim data out of hand-maintained `sim/data/*.ts` into Zod-validated JSON packs under `data/`, ships an opt-in DevTools surface for content editing, and replaces the single-number production score with a 7-category multi-factor breakdown driven by player-chosen Artistic Directions and trigger-based Effect Synergies.

> _Release notes mirror the `[0.3.0]` section of `CHANGELOG.md`. See `CHANGELOG.md` for the canonical source._

---

## Highlights

- 🎵 **Tracker-music player** — floating "Now Playing" bar with full transport, native file picker, SHA-256 de-dup into `userData/music/`, and a portal-rendered Playlist Manager modal. Plays `.MOD` / `.XM` / `.IT` / `.S3M` via `chiptune3` AudioWorklet (bundled as Electron `extraResources`, served same-origin through a new `worklet://` privileged protocol).
- 📦 **JSON-driven content + Zod validation** — 15 typed JSON packs under `data/` (bbs_threads, effects, groups, hardware, jobs, manifest, parties, platforms, productions, research, rival_releases, sceners, software, sponsorships) loaded by a manifest-driven `ContentLoader` and validated by Zod schemas. Migration script `npm run migrate:data` regenerates JSON from any source-of-truth TypeScript.
- 🛠 **Opt-in DevTools surface** — `?dev=1` URL param or env flag toggles a `DevMenu` with `BbsEditor` + `ScenerEditor` and a generic `EditorShell` with undo/redo (`useUndo`).
- 🎨 **Multi-category scoring engine + Artistic Directions + Effect Synergies** — 7-category `ScoreBreakdown` (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) with 8 factor contributions (skill / effect / synergy / direction / optimization / music-module / platform-fit / dev-time). 5 `ArtisticDirection` weightings (Technical Showcase, Artistic, Experimental, Oldschool, Music-Driven) and a declarative `EffectSynergies` table that fires when matching effect tags are present.
- 🏆 **DemoSummary modal** — post-compile report with overall score, 7-category bars, 8-tile factor grid, triggered synergies, top-5 competition predictions per upcoming party, awards-earned grid, and procedural judge comments.

---

## What's New

### Tracker-music player (`.MOD` / `.XM` / `.IT` / `.S3M`)

- **`chiptune3 ^0.8.7` AudioWorklet integration** — `electron/main.ts` registers a custom privileged `worklet://` scheme via `protocol.registerSchemesAsPrivileged` before `app.whenReady()`, then handles it via `protocol.handle()` mapping to `userData/worklets/`. The renderer can call `audioContext.audioWorklet.addModule('worklet:///chiptune3.worklet.js')` same-origin. The `will-navigate` allow-list now permits the new scheme alongside `file://`.
- **IPC surface in `electron/main.ts`** — `music:import-files` (native file picker + SHA-256 de-dup into `userData/music/<hash>.<ext>`), `music:read-file` (Uint8Array over IPC), `music:delete-file`, `music:init-worklet` (copies bundled worklet scripts into `userData/worklets/` on first use). Every file-serving handler rejects path traversal (`..`, `\\`, leading slashes).
- **`electron/preload.ts` typed surface** — `importMusicFiles`, `readMusicFile`, `deleteMusicFile`, `getWorkletUrl` with matching TypeScript types in `src/electronApi.ts`.
- **`electron/settings.ts` schema v1 → v2** — new `music.playlist[]` field persists `{storedName, displayName, format, size}`. Pre-0.3.0 settings files auto-migrate to an empty playlist.
- **`package.json` `build.extraResources`** — copies `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into `process.resourcesPath/worklets/` for the packaged build.
- **`src/audio/trackerPlayer.ts`** — singleton with `init() / play() / pause() / next() / prev() / setVolume() / setShuffle() / setRepeat() / importFiles() / clearPlaylist() / removeAt()`. Strict `RepeatMode = 'off' | 'all' | 'one'`, exported `MusicFile` type.
- **`src/audio/formatDetection.ts`** — maps AudioWorklet metadata to a human-readable format label.
- **`src/hooks/useTrackerPlayer.ts`** — `useSyncExternalStore`-style subscription hook for any component to read live transport state.
- **`src/components/MusicPlayer.tsx`** — floating "Now Playing" bar pinned to the bottom of the viewport with full transport (prev / play-pause / next), volume slider + mute, color-coded format badge, progress strip, autoplay-block hint, and an idle compact `♪ MUSIC` button when the library is empty.
- **`src/components/PlaylistManager.tsx`** — portal-rendered modal for import / shuffle / repeat-mode cycle / per-track remove / clear-all, with empty-state, error banner, format-color tags, and ESC-to-close.

### Data migration to JSON + Zod validation

- **15 typed JSON packs under `data/`** — `bbs_threads`, `effects`, `groups`, `hardware`, `jobs`, `manifest`, `parties`, `platforms`, `productions`, `research`, `rival_releases`, `sceners`, `software`, `sponsorships`, plus `data/manifest.json` declaring `version`, schema, and the pack list.
- **`scripts/migrate_data_to_json.ts` + `npm run migrate:data`** — regenerates the JSON from any source-of-truth TypeScript.
- **`src/content/ContentLoader.ts` + `ContentStore.ts` + `useContentStore.ts` + `schema.ts`** — manifest-driven loader, Zod-validated, with a React hook that re-emits on pack reload.
- **`sim/__tests__/data_migration.smoke.ts`** — pins the round-trip invariant `migrate(load(sourceTs)) === load(targetJson)` across every pack. New `npm run test:migration` script; `test:all` now runs it.
- **`zod ^4.4.3`** — new dependency for the schema validation.

### DevTools surface (`src/devtools/`)

- **`DevModeContext`** — toggled via `?dev=1` URL param or env flag, gates the menu.
- **`DevMenu.tsx`** — floating control to open editors.
- **`EditorShell.tsx`** — generic scaffold (header, save / cancel, undo / redo).
- **`useUndo.ts`** — capped-history undo / redo.
- **`editors/BbsEditor.tsx` + `editors/ScenerEditor.tsx`** — first editors for the BBS thread list and scener roster.

### Multi-category scoring engine

- **`sim/domain/scoring.ts`** — pure `scoreProduction(production, crew, effects, profile)` returning a 7-category `ScoreBreakdown` (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) plus 8 `Factor` contributions (skill / effect / synergy / direction / optimization / music-module / platform-fit / dev-time) and a single `overall` value.
- **`sim/data/artisticDirections.ts`** — 5 directions (`Technical Showcase`, `Artistic`, `Experimental`, `Oldschool`, `Music-Driven`), each with a multi-category weighting and a small set of preferred synergy tags.
- **`sim/data/effectSynergies.ts`** — declarative synergy table (id, name, description, required tags, score bonus). `EffectSynergy` exported from `@packages/types`.
- **`sim/data/judgingProfiles.ts`** — per-party judging weights consumed by the competition-prediction code.
- **`packages/types/src/demo.ts`** — new exported types: `ArtisticDirection`, `OptimizationFocus`, `DemoDuration`, `EffectSynergy`, `ScoreBreakdown`, `DemoSummary`, `CompetitionPrediction`, plus `ARTISTIC_DIRECTIONS` / `OPTIMIZATION_FOCUSES` / `DEMO_DURATIONS` display-order arrays. Legacy `DemoEffect` fields (`cpuCost`, `ramCostKb`, `difficulty`, `originality`, `audienceAppeal`) are retained for back-compat; the new fields (`complexity`, `visualImpact`, `compatiblePlatforms`, `synergyTags`, `researchRequired`) feed the expanded scoring engine.
- **`sim/data/demoEffects.ts`** — every effect enriched with the new metadata so the scoring engine has data to consume from day one.
- **`sim/data/bbsMessages.ts`** — expanded catalog of era-themed quote lines available to the BBS reply / recruit paths.

### DemoSummary modal

- **`src/components/DemoSummary.tsx`** — portal-rendered report shown right after the compiler finishes: production metadata strip, overall-score hero, 7-category score-bar grid, 8-tile factor-contribution grid, triggered-synergy list, effect pill list, music-track row, top-5 competition predictions per upcoming party, awards-earned grid, and a procedural judge-comment list. Fixed tailwind token palette (cyan / rose / amber / violet / emerald / pink / yellow) matching the 4k-aesthetic.

---

## What Changed

- **`package.json`** — bumped `0.2.0` → `0.3.0`. New dependencies: `chiptune3 ^0.8.7`, `zod ^4.4.3`. New scripts: `migrate:data`, `test:migration`. `test:all` now also runs `test:migration`.
- **`electron/settings.ts`** — schema version bumped 1 → 2 with a new `music` block (empty playlist on read for v1 files). New `getMusicPlaylist()` / `setMusicPlaylist()` accessors.
- **`src/App.tsx`** — wires the new music player + playlist modal into the root, mounts `<MusicPlayer>` once at the App root so the bar survives tab navigation, opens `<PlaylistManager>` on demand, calls the player's `init()` on mount (idempotent), and propagates the `audioContextSuspended` flag to the resume-hint UI.
- **`index.html`** — `<title>` updated from the AI-Studio default (`"My Google AI Studio App"`) to `"Demoscene Simulator"`.
- **`README.md`** — removed the AI-Studio provenance line.
- **`.env.example`** — rewording for the Electron + Vite split.
- **`.gitignore`** — added a comment explaining the electron-builder `release/` ignore block; `dist-electron/` was already excluded.
- **`docs/architecture.md`** — minor wording fix in the `apps/server/` row.

---

## What Was Removed

_No user-facing removals. The v0.2.0 → v0.3.0 transition is additive._

---

## Bug Fixes

- **TypeScript `import.meta.env` types** — `src/vite-env.d.ts` declares `import.meta.env.VITE_*` so `tsc --noEmit` recognises those references (fixes a CI failure introduced when the capture pipeline began reading `import.meta.env`).
- **`npm run test:all` chain** — now includes the new `test:migration` step so a broken migration halts CI instead of silently passing.
- **Electron `will-navigate` allow-list** — the new `worklet://` scheme is explicitly permitted alongside `file://` in production so the AudioWorklet `addModule` call doesn't trip the sandbox-escape guard.

---

## Upgrade Notes

For end users: no breaking changes. The v0.2.0 → v0.3.0 transition is transparent — the v0.2.0 settings file auto-migrates to the v0.3.0 schema (empty music playlist) on first launch. The new `chiptune3` worklet JS is bundled inside the installer; no separate download.

For contributors: the sim data layer is now content-driven. To add or modify a BBS thread, hardware spec, freelance job, etc., edit the corresponding `data/*.json` file (validated against `src/content/schema.ts` at load time). To regenerate JSON from any source-of-truth TypeScript, run `npm run migrate:data`. The `sim/__tests__/data_migration.smoke.ts` test pins the round-trip invariant.

---

## Verification

- `npm run lint` (tsc --noEmit) — exit 0
- `npm run test:all` — 6/6 smokes green (added `test:migration`)
- `npm run audit:docs` — doc/sim parity gate green
- `npm run build` — clean renderer bundle

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
