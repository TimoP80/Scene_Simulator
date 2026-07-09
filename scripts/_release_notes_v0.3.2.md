# Scene Simulator v0.3.2 — Worklet Re-bundle for Electron 42 + Dist Orchestrator + Per-pack Smoke Matrix

**Release date:** 2026-07-09
**Compare:** [v0.3.1...v0.3.2](https://github.com/TimoP80/Scene_Simulator/compare/v0.3.1...v0.3.2)
**Commits on this tag:** 1 (the `chore(release): cut v0.3.2` version-bump commit containing 14 grouped infra + catalog changes against the v0.3.1 baseline, ~+24k/-1k lines across 98 files).

This is a maintenance release resolving the v0.3.0 → v0.3.1 AudioWorklet chain breakage under Electron 42, replacing the v0.3.0 custom-privileged `worklet://` scheme with a Vite-served bundled asset, introducing a single canonical `scripts/dist.mjs` production-build orchestrator, expanding `npm run test:all` from a 7-step chain to a 24-step chain (17 new per-pack smoke runners), and tightening the type / catalog / settings-schema plumbing.

> _Release notes mirror the `[0.3.2]` section of `CHANGELOG.md`. See `CHANGELOG.md` for the canonical source._

---

## Highlights

- **Tracker-music worklet loads under Electron 42 again** — the v0.3.0 shipping path registered a custom privileged `worklet://` scheme and served `node_modules/chiptune3/chiptune3.worklet.js` + `libopenmpt.worklet.js` through `protocol.handle`. Electron 42's Chromium rejects the static `import './libopenmpt.worklet.js'` chain with "Unable to load a worklets module" even after the v0.3.1 `Content-Type` patch. v0.3.2 abandons that plumbing entirely; `scripts/bundle-worklet.mjs` concatenates both files into a single `public/worklets/openmpt.bundled.worklet.js` asset shipped through Vite's regular asset pipeline, served at the document's same-origin URL.
- **Single canonical production-build pipeline** — `scripts/dist.mjs` orchestrates `npm run build:all` followed by `electron-builder --win --x64` (or `--dir`) and copies the resulting NSIS + portable artifacts plus `latest.yml` / `win-unpacked/` blockmap outputs into the project's local `release/` folder. `npm run dist:win` and `npm run dist:dir` route through this script instead of invoking `electron-builder` directly, so contributor builds have one canonical log path and a single place to thread future revisions (codesigning, S3 upload).
- **`npm run test:all` is now a 24-step chain** — 17 granular per-pack smoke runners (`test:effect-unlocks`, `test:scoring`, `test:judging-profiles`, `test:artistic-directions`, `test:effect-synergies`, `test:hardware-catalog`, `test:sponsorship-catalog`, `test:technology-tree`, `test:software-catalog`, `test:demo-effects`, `test:initial-npcs`, `test:initial-groups`, `test:party-calendar`, `test:job-templates`, `test:bbs-messages`, `test:rival-releases`, `test:platforms`) join the existing 7 (`smoke` + `audit-docs` + `load-during-import` + `economics` + `replay` + `migration` + `music`), each pinning an invariant specific to its catalogue and independently runnable.

---

## What's New

_No new user-visible features. The v0.3.1 → v0.3.2 transition is a patch release rolled up from a long stretch of infra / type / catalogue work that shipped without a dedicated tag._

---

## What Changed

- **`npm run clean` rewritten for Windows-safe recursive delete** — the old `rm -rf dist server.js dist-electron` failed on Windows; v0.3.2 swaps to `node -e "['dist', 'server.js', 'dist-electron', 'public/worklets', 'release'].forEach(p => require('fs').rmSync(p, {recursive:true,force:true}))"`, so the warm-rebuild path now also picks up `public/worklets/` and `release/` artefacts without POSIX `rm -rf` assumptions.
- **`PartyEvent.year` typed anchor** — `packages/types/src/party.ts::PartyEvent` gained a `year: number` field alongside the existing `month`; `sim/data/partyCalendar.ts` writes the actual year every party ran (`Copy Party 1989`, `Venlo Meeting 1987`, `The Gathering 1992`, `Twilight Zone 1992`, `Assembly Summer 1992`, `Sun Demoparty 1992`, `Mekka & Symposium 1992`, …) on every entry. Projections can filter "upcoming parties in year Y" without a fragile month-only heuristic.
- **Explicit settings-schema v1→v2 migration branch** — `electron/settings.ts::readSettings` now contains a dedicated `parsed.schemaVersion === 1` branch that lifts the legacy `geminiApiKey` and seeds an empty `music.playlist`. Pre-v0.3.2 settings on first launch fell through to `{ ...DEFAULTS }` and would have silently dropped a user's persisted Gemini key on every subsequent read until the user re-entered it. Companion `normaliseMusic(raw)` helper now sanitises every playlist entry field-by-field (`storedName` / `displayName` / `format` enum / `size` number).
- **Extended DEMO_EFFECTS catalogue to JSON-parity** — `sim/data/demoEffects.ts` gained a "JSON-only catalogue" section with 23 additional entries (`color_cycling`, `interlace_flicker`, `dither_gradient_sky`, `roto_zoomer`, `copper_sprite_multiplex`, `dual_playfield_parallax`, `blitter_zoomsprite`, `wireframe_flythrough`, `rotating_logo`, `particle_system`, `l_system_plants`, `perlin_noise_clouds`, `chromatic_aberration`, `bump_mapped_torus`, `environment_mapping`, `boids_flocking`, `morphing_mesh`, `domain_warp_field`, `reaction_diffusion`, `raytraced_spheres`, `volumetric_fog`, `voxel_city`, `realtime_vocoder`) that were always present in `data/effects.json` but missing from the original hand-maintained TypeScript catalogue. Each carries the v0.3.0 metadata (`complexity` / `visualImpact` / `compatiblePlatforms` / `synergyTags` / `researchRequired`).
- **`JOB_TEMPLATES` explicit `requiresCrewSkill` tags** — every template in `sim/data/jobTemplates.ts` now declares `requiresCrewSkill: "coding" | "graphics" | "music"` so the projection's job-board filter is skill-based instead of description-string matching. Split across the 12 entries: `2× music` (`job_8bit_chiptuneset`, `job_16bit_trackerpack`), `4× graphics` (`job_8bit_loadscreen`, `job_16bit_introart`, `job_pc_shareware_pack`, `job_modern_introfilm`), `6× coding` (the rest — note `job_modern_synthsize` is `type: "tool_contract"` not `music_commission`, so correctly tagging it `coding` matches its "build a byte-sized synth library" description).
- **`sim/data/index.ts` barrel gains BBS + effect-unlocks exports** — the existing catalogue barrel now exports `BBS_BOARDS` / `BBS_SCRIBES` / `SYSOP_REPLIES` / `SYSOP_MODERATION_MESSAGES` / `ERA_TOPICS` / `SPYLINE_TEMPLATES` / `BBS_RANDOM_EVENTS` / `BBS_MUTATIONS` / `VOICE_PROFILES` / `CATEGORY_MESSAGES` / `BBS_PERSONALITIES` / `getSeedThreads` / `getEra` / `generateFollowedReply` / `generatePersonalityMessage` / `colorForHandle` from `bbsMessages`, the `BBSBoard` / `Era` / `SpylineTemplate` / `BBSRandomEvent` / `BBSCategory` / `BBSPersonality` types, and the `effectSynergies` / `artisticDirections` / `effectUnlocks` / `judgingProfiles` exports that the data-migration smoke test relies on. Importers can now read any catalog through `@sim/data` without reaching into a subpath.
- **`sim/domain/index.ts` scoring-barrel export** — added `export * from "./scoring"` so `sim/domain/scoring.ts`'s `scoreProduction` / `scoreBreakdownFor` / `competeAgainstJudgingProfile` / `ScoreBreakdown` helpers surface through the documented `sim/domain` barrel that other layers import.
- **`sim/data/softwareCatalog.ts` Photoshop 5 LE `effectUnlocks` corrected** — the legacy `procedural_textures` id has been renamed to `domain_warp_field` so the purchased-tool unlock matches the matching entry in the new DEMO_EFFECTS JSON-only catalogue. The previous id referenced a `procedural_textures` effect that was never added, so a player who bought Photoshop 5 LE on `PC_PENTIUM_II` in 1998 would have surfaced zero unlocks in the studio.
- **Docs / repo metadata de-provenanced** — `README.md` removed the `Initial project started with Google AI studio, further development made locally with other AI tools.` attribution line (the project now self-describes its hybrid simulation + narrative stack without referencing the bootstrap environment); `docs/architecture.md` `apps/server/` row wording now reads `*(reserved — Express server for hosted/headless deployment parity)*` (the legacy `AI Studio parity` phrasing is gone — the project does not run on Cloud Run); `.env.example` documents both halves of the Electron+Vite split (`GEMINI_API_KEY` explains the first-run Electron prompt vs. the Vite dev export; `APP_URL` is now described as an optional self-referential / OAuth / API endpoint override rather than an AI-Studio-injected Cloud Run URL); `index.html` `<title>` is now `Demoscene Simulator` (was the AI-Studio default `"My Google AI Studio App"`); `.gitignore` adds an inline `# electron-builder output (NSIS installers, portable EXEs, blockmaps, latest.yml, win-unpacked/)` comment above the `release/` ignore line.

---

## What Was Removed

- **`worklet://` custom-privileged scheme plumbing in `electron/main.ts`** — the `protocol.registerSchemesAsPrivileged([{ scheme: 'worklet', privileges: {...} }])` call that ran before `app.whenReady()`, the `protocol.handle('worklet', …)` handler that mapped `worklet://` → `userData/worklets/`, and the per-launch `music:init-worklet` IPC handler are all gone.
- **`getWorkletUrl` preload surface** — `electron/preload.ts`'s `electronAPI` no longer exposes a `getWorkletUrl()` method. The renderer's `src/audio/trackerPlayer.ts::init()` now references the statically-known `/worklets/openmpt.bundled.worklet.js` URL against the document origin; any stale caller would trip `TypeError: ... is not a function`.
- **`build.extraResources` chiptune3 entries in `package.json`** — the two array entries that copied `node_modules/chiptune3/chiptune3.worklet.js` and `libopenmpt.worklet.js` into `process.resourcesPath/worklets/` for the packaged build are removed. The renderer no longer reads from `resourcesPath/worklets/`; it reads `dist/worklets/openmpt.bundled.worklet.js` as a normal Vite-served asset. Reduces the installer footprint by ~50KB and removes the devDep-on-prod-runtime coupling.

---

## Bug Fixes

- **Tracker-music worklet fails to load in Electron 42 (`addModule()` "Unable to load a worklets module")** — see Highlights. Root cause: Electron 42's Chromium Worklet processor fetch happens under a stricter CORS/Worker-subresource policy than `protocol.handle` implements, so the v0.3.0 `worklet://chptune3.worklet.js` static-import chain was rejected even after the v0.3.1 `Content-Type: text/javascript` patch. Fix: ship the worklet through Vite as a same-origin Vite-served asset.
- **`node:crypto` Rollup resolve failure on `npm run build:electron`** — root cause: `electron/main.ts`'s SHA-256 helper was being routed through Vite's `__vite-browser-external` stub when bundling the host. Fix: explicit `node:crypto` Rollup external.

---

## Upgrade Notes

**There is no installer / binary distribution for v0.3.2** — this is a code-only patch.

For end-users: if you are currently running the v0.3.0 or v0.3.1 packaged binary, the v0.3.2 music-player fix (the bundled worklet) and the v0.3.2 settings-schema fix are observable:
1. **Music player** — the v0.3.0/v0.3.1 packaged binary shipped with the broken `worklet://` scheme on Electron 42; imported `.mod` / `.xm` / `.it` / `.s3m` files would either fail to load or work intermittently. The v0.3.2 installer (next feature-drop release) bundles the same-origin worklet asset and resolves this.
2. **Settings persistence** — the v0.3.0 settings file auto-migrated to the v0.3.1 read with a silent `geminiApiKey` drop on every subsequent read once the `music.playlist` block appeared but `schemaVersion` was still `1`. The v0.3.2 installer lifts the legacy key cleanly. If your previously-entered Gemini key vanished after the v0.3.0 → v0.3.1 upgrade, you'll need to re-enter it once via the API-key gate.

Wait for the next feature-drop release (`v0.4.0`) for a packaged installer with all v0.3.x fixes bundled.

For contributors: simply `git pull` (or `git checkout v0.3.2`) / `npm install`. The new mid-flight `compileIntervalRef` + `partyVoteIntervalRef` pattern from v0.3.1 is unchanged; the v0.3.2 changes are infra / type / catalogue work that does not touch the renderer or the simulation loop. Use the new `npm run dist:win` (which now routes through `scripts/dist.mjs`) and the new `npm run test:all` 24-step chain to verify before pushing.

---

## Verification

- `npm run lint` (tsc --noEmit): exit 0 on the staged v0.3.2 tree
- `npm run test:all`: smoke + audit-docs + load-during-import + economics + replay + migration + music (existing 7) + the 17 new per-pack runners (effect-unlocks / scoring / judging-profiles / artistic-directions / effect-synergies / hardware-catalog / sponsorship-catalog / technology-tree / software-catalog / demo-effects / initial-npcs / initial-groups / party-calendar / job-templates / bbs-messages / rival-releases / platforms) — 24-step chain expected green
- `npm run audit:docs`: doc/sim parity gate green
- `npm run build` (renderer + host via the wrapped `npm run build:all`): clean
- `npm run bundle:worklet`: builds `public/worklets/openmpt.bundled.worklet.js` from `node_modules/chiptune3/*` (renaming `libopenmpt` → `libopenmptPromise` and stripping static imports)
- `npm run dev:electron`: Vite-served `/worklets/openmpt.bundled.worklet.js` loads under the same-origin policy, `window.electronAPI` populated, `trackerPlayer.init()` succeeds
- `npm run dist:win`: produces NSIS + portable artifacts under `release/` via `scripts/dist.mjs`

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
