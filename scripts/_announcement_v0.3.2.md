# Scene Simulator v0.3.2 — Announcement Posts

Three platform-specific variants for announcing the v0.3.2 patch release. All link to https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.2.

> v0.3.2 is a **code-only patch** — no new binary installer. End-users on the v0.3.0 / v0.3.1 packaged binary are unaffected by the `scripts/dist.mjs` orchestrator change (which only applies to source/contributor builds); the worklet re-bundle, the settings-schema migration, and the `node:crypto` Rollup externals fix ship rolled up into the next feature release `v0.4.0`. Contributors / `git pull` readers benefit immediately.

---

## Discord (casual, emoji-friendly, ~230 words)

🛠️ **Scene Simulator v0.3.2 patch is up**

Quick maintenance release — code-only, no new installer. Three bug-fixes plus a sweep of infra / catalog refinements:

🎵 **Tracker-music worklet loads under Electron 42 again.** v0.3.0's `worklet://` privileged scheme hit "Unable to load a worklets module" in Electron 42's Chromium Worklet-processor fetch. New `scripts/bundle-worklet.mjs` concatenates chiptune3's two worklet scripts into a single `public/worklets/openmpt.bundled.worklet.js` served same-origin through Vite. Drops the `music:init-worklet` IPC handler, the preload `getWorkletUrl()` surface, and the `build.extraResources` chiptune3 entries.

⚙️ **`scripts/dist.mjs` is now the canonical production-build orchestrator.** `npm run dist:win` / `dist:dir` route through this script (clean → `build:all` → `electron-builder` → `release/` artifact copy) instead of invoking `electron-builder` directly. Contributor builds have one canonical log path.

🧪 **`npm run test:all` grows from 7 to 24 smokes.** 17 new per-pack runners (`test:effect-unlocks`, `test:scoring`, `test:hardware-catalog`, …) each pin a catalogue-specific invariant; failures halt the chain fast.

🔐 **Settings schema v1→v2 explicit migration.** Pre-v0.3.2 settings silently dropped a user's persisted Gemini key on every subsequent read once the `music.playlist` block appeared. Now lifts the legacy key cleanly through a dedicated `parsed.schemaVersion === 1` branch + `normaliseMusic` helper.

🔧 **`node:crypto` declared external in the Electron host bundle** — so `npm run build:electron` no longer fails on a fresh checkout (was hitting Vite's `__vite-browser-external` stub on the SHA-256 de-dup helper).

📦 **Source-only.** No installer this round — wait for v0.4.0 to roll up all v0.3.x fixes into a packaged build.

🔗 https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.2

---

## Reddit (r/programming / r/typescript / r/electronjs style, ~330 words, technical)

**Scene Simulator v0.3.2 — code-only patch: Electron 42 worklet re-bundle + dist orchestrator + per-pack smoke matrix**

Following the v0.3.0 AudioWorklet / multi-category-scoring drop, three bug-fixes and a sweep of infra / catalog refinements landed via the `chore(release): cut v0.3.2` commit on `main`.

* **Tracker-music worklet now loads under Electron 42.** The v0.3.0 shipping path registered a custom privileged `worklet://` scheme via `protocol.registerSchemesAsPrivileged` + `protocol.handle` and served `node_modules/chiptune3/chiptune3.worklet.js` + `libopenmpt.worklet.js` through `userData/worklets/`. Electron 42's Chromium rejects the static `import './libopenmpt.worklet.js'` chain with "Unable to load a worklets module" even after the v0.3.1 `Content-Type: text/javascript` patch. `scripts/bundle-worklet.mjs` concatenates both files into a single `public/worklets/openmpt.bundled.worklet.js` asset shipped through Vite's regular asset pipeline (same-origin). The renderer now calls `addModule('/worklets/openmpt.bundled.worklet.js')`. Drops `music:init-worklet` IPC handler, preload `getWorkletUrl()` surface, and the `build.extraResources` chiptune3 entries (the renderer reads `dist/worklets/openmpt.bundled.worklet.js` as a normal Vite-served asset).

* **`scripts/dist.mjs` production-build orchestrator.** `npm run dist:win` / `dist:dir` route through this script (clean via `node -e` + `fs.rmSync`, then `npm run build:all`, then `electron-builder --win --x64`, then copy NSIS + portable + `latest.yml` + `win-unpacked/` to `release/`) instead of invoking `electron-builder` directly. Contributor builds now have a single canonical log path and one place to thread future revisions (codesigning, S3 upload).

* **`npm run test:all` grows from 7 to 24 steps.** 17 new per-pack runners (`test:effect-unlocks`, `test:scoring`, `test:judging-profiles`, `test:artistic-directions`, `test:effect-synergies`, `test:hardware-catalog`, `test:sponsorship-catalog`, `test:technology-tree`, `test:software-catalog`, `test:demo-effects`, `test:initial-npcs`, `test:initial-groups`, `test:party-calendar`, `test:job-templates`, `test:bbs-messages`, `test:rival-releases`, `test:platforms`) join the existing 7 (`smoke`, `audit-docs`, `load-during-import`, `economics`, `replay`, `migration`, `music`). Each pins an invariant specific to its catalogue and runs independently.

* **Settings schema v1→v2 explicit migration branch** in `electron/settings.ts::readSettings` lifts the legacy `geminiApiKey` cleanly through the schema 1 → schema 2 boundary. Companion `normaliseMusic(raw)` helper sanitises every playlist entry field-by-field (`storedName` / `displayName` / `format` enum / `size` number); previously such reads dropped any persisted key on every subsequent call until the user re-entered it.

* **`node:crypto` declared external** in `electron.vite.config.ts::rollupOptions.external` — fixes the `npm run build:electron` Rollup resolve failure that hit the SHA-256 de-dup helper on a fresh checkout.

* **Catalog / type cleanup** — 23-entry `DEMO_EFFECTS` catalogue extension (syncing TypeScript to `data/effects.json`: `color_cycling`, `interlace_flicker`, `rotozoomer`, SDF raymarching, voxel city, …), `PartyEvent.year` typed anchor, `JOB_TEMPLATES` explicit `requiresCrewSkill` tags (split: `2× music` / `4× graphics` / `6× coding`), `sim/domain/index.ts` scoring-barrel export (`export * from "./scoring"`), `sim/data/softwareCatalog.ts` Photoshop 5 LE `effectUnlocks` rename `procedural_textures` → `domain_warp_field` (the prior id referenced an effect that was never added).

**Code-only patch — no new binaries this round.** The Electron 42 worklet fix + the settings v1→v2 silent-key-drop fix roll up into the next feature-release installer (`v0.4.0`).

🔗 **Release page:** https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.2
📜 **CHANGELOG:** https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md

---

## Hacker News (~210 words, plain text, no markdown)

Title: Scene Simulator v0.3.2 patch

Text:

A small maintenance patch for the Scene Simulator (a 1985-2005 demoscene life-sim).

Fixes:

- Tracker-music worklet fails to load in Electron 42 (addModule "Unable to load a worklets module"). The v0.3.0 shipping path registered a custom privileged worklet:// scheme (protocol.registerSchemesAsPrivileged + protocol.handle) serving chiptune3's two worklet scripts from userData/worklets/. Electron 42's Chromium rejects the static import './libopenmpt.worklet.js' chain with "Unable to load a worklets module" even after the v0.3.1 Content-Type: text/javascript patch. scripts/bundle-worklet.mjs concatenates both files into a single public/worklets/openmpt.bundled.worklet.js asset shipped through Vite's regular asset pipeline (same-origin). The renderer now calls addModule('/worklets/openmpt.bundled.worklet.js'). Drops music:init-worklet IPC handler, preload getWorkletUrl() surface, and build.extraResources chiptune3 entries.

- npm run build:electron fails on a fresh checkout. Rollup routes electron/main.ts's createHash('sha256').update(buffer).digest('hex') SHA-256 de-dup helper through Vite's __vite-browser-external stub, producing "Cannot resolve 'node:crypto'". Declared 'node:crypto' in electron.vite.config.ts::rollupOptions.external.

- Settings schema v1->v2 read silently drops a user's persisted geminiApiKey. readSettings returned { ...DEFAULTS } whenever schemaVersion !== 2, dropping the legacy key on every subsequent read until the user re-entered it. Fix: explicit parsed.schemaVersion === 1 branch in electron/settings.ts::readSettings + normaliseMusic(raw) helper that sanitises every playlist entry field-by-field.

Infra + catalog refinements (no user-visible behavior change): scripts/dist.mjs production-build orchestrator (npm run dist:win + dist:dir route through it instead of electron-builder directly); npm run test:all grows from 7 to 24 steps (17 new per-pack smoke runners); PartyEvent.year typed anchor; JOB_TEMPLATES explicit requiresCrewSkill tags; sim/domain/index.ts scoring-barrel export; sim/data/softwareCatalog.ts Photoshop 5 LE effectUnlocks rename procedural_textures -> domain_warp_field; 23-entry DEMO_EFFECTS catalogue extension; node:crypto Rollup externals.

Code-only patch. No binary distribution this round; the fixes roll into the next feature-release installer (v0.4.0).

https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.2

---

## Posting tips

- **Discord:** paste as-is. The `**bold**` renders as bold; emoji render natively. Consider pinning the post in `#announcements` for ~24 hours.
- **Reddit:** post to `r/programming`, `r/typescript`, or `r/electronjs`. The bullet points render as a list. Note this is a **patch release** — frame it as maintenance, not a feature drop. Don't use "Show HN" (that's reserved for project launches / Show-HN-eligible feature drops).
- **Hacker News:** plain-text only (HN doesn't render markdown). First paragraph is the hook — keep it under 3 sentences. HN generally treats small patch releases as discussion-thread topics, not "Show HN" submissions; consider posting as a top-level "Scene Simulator v0.3.2 patch" thread instead. The submission URL should be the GitHub release page (above).

## Suggested cross-post order

1. **Hacker News** first (Monday or Tuesday morning US time, 8-10am ET) — gets the most technical feedback
2. **Reddit** 4-6 hours later — catches the HN tail
3. **Discord** when you have time to engage with responses
