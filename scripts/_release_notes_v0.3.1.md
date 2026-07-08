# Scene Simulator v0.3.1 — Interval Clear on Load + Audio-Toggle Hoist + Electron Dev Script Fix

**Release date:** 2026-07-08
**Compare:** [v0.3.0...v0.3.1](https://github.com/TimoP80/Scene_Simulator/compare/v0.3.0...v0.3.1)
**Commits on this tag:** 1 (the `chore(release): cut v0.3.1` version-bump commit containing 3 grouped bug fixes).

This is a maintenance branch resolving three edge-case bugs spanning the Electron development environment, the React component-tree boundary, and the event-sourcing `loadSavedGame` snapshot restorer.

> _Release notes mirror the `[0.3.1]` section of `CHANGELOG.md`. See `CHANGELOG.md` for the canonical source._

---

## Highlights

- **Stable dev-environment bootstrapping** — `npm run dev:electron` no longer fails on a fresh checkout looking for `window.electronAPI`; a concurrent `wait-on` watcher holds the Electron launch until the `dist-electron/preload.cjs` build is ready.
- **Mute/play state persists across fullscreen transitions** — hoisting `audioEnabled` / `isPlaying` into `App.tsx` means the inline MUTE preference no longer snaps back to "TAP TO PLAY" when the CRT monitor enters or exits fullscreen view.
- **Watertight interval clearing on snapshot import** — `compileIntervalRef` + `partyVoteIntervalRef` route the compile and party-vote setInterval ids through `useRef`, are guarded with `clearInterval` at the top of `loadSavedGame`'s snapshot-apply path, and the ephemeral compile/party state is explicitly reset to defeat the React-18 auto-batching race where queued setStates from a dying interval's terminal tick could otherwise leak past `clearInterval`.

---

## What's New

_No new features. The v0.3.0 → v0.3.1 transition is a patch release._

---

## What Changed

_No architectural changes or dependency updates._

---

## Bug Fixes

- **`npm run dev:electron` launch failure on fresh checkout** — the script was just `concurrently vite + electron .`, so `electron .` loaded `package.json`'s `main` field (`dist-electron/main.cjs`) which never existed on a fresh checkout. The renderer would load from Vite, but the Electron main process would either fail to start or launch with a missing preload, leaving `window.electronAPI` undefined (`src/audio/trackerPlayer.ts::init()` would then trip the "requires Electron host" error and disable the music player). Now the script also runs `vite build -c electron.vite.config.ts --watch` in a third concurrent process, and `wait-on` blocks the Electron launch until both the Vite dev server and the freshly-built `dist-electron/preload.cjs` are ready. The host-watcher keeps `main.cjs` / `preload.cjs` up to date on subsequent `electron/*` edits; reload the window (Ctrl+R / Cmd+R) to pick up host changes.

- **Inline MUTE resetting on fullscreen toggle** — `audioEnabled` and `isPlaying` were trapped in two `useState` declarations inside `DemoScreen` (one for the inline CRT card, one for the portal-rendered `<FullscreenDemoView/>`). Pressing `F` to enter fullscreen unmounted+remounted the surface with fresh state, snapping the MusicBadge back to the "TAP TO PLAY" armed state. The two state hooks were hoisted into `App.tsx` as `crtAudioEnabled` + `crtIsPlaying` (with `useCallback` togglers `toggleCrtAudio` + `toggleCrtPlay`) sitting next to the existing `crtMusicTrack` state, and five props (`musicTrackStoredName`, `audioEnabled`, `isPlaying`, `onToggleAudio`, `onTogglePlay`) are forwarded through both surfaces. The hero-capture preview mount in `src/preview/CapturePreview.tsx` receives a `NOOP` callback stub since the capture pipeline is a stateless preview. As a bonus, this round deduped a stale duplicate of the "Interval ids owned by…" comment block from earlier patch work (the leading copy remains; the orphan was collapsed, leaving exactly 1 `useRef<>` declaration of `compileIntervalRef` and `partyVoteIntervalRef`).

- **Ghost release / prize drops on saved game load** — `triggerAssembleCompiler` and `startPartyVotingProcess` capture partial state in their `setInterval` closure callbacks; opening LOAD while one of these was in flight left the interval running. The terminal-tick callbacks (`finishCompilation()`, `awardPartyContestPoints()`) could fire AFTER the import had reset state, dropping a leftover release or prize credit into the freshly loaded save. Fix: `compileIntervalRef` + `partyVoteIntervalRef` `useRef<ReturnType<typeof setInterval> | null>(null)` declarations route both `setInterval` ids through the refs; the inner-callback `clearInterval(interval)` calls were rewritten to clear+null the ref; a guarded `clearInterval` pair sits at the top of `loadSavedGame`'s try-block to cancel in-flight compile/vote intervals before the snapshot applies; and an explicit ephemeral-state reset block (`setIsCompiling(false)`, `setCompilerProgress(0)`, `setCompilerLogs([])`, `setShowCompilingOverlay(false)`, `setActiveParty(null)`, `setIsPartyRunning(false)`, `setPartyStep(0)`, `setPartyRivals([])`, `setPartyVoteTally({})`, `setPartySelectedProdId('')`, `setPartyContestLogger([])`) defeats the React-18 auto-batching race where queued setStates from a dying interval's terminal tick would otherwise leak through `clearInterval`. `sim/__tests__/loadDuringImport.smoke.ts` was rewritten for determinism (a `makeInterval()` stub + manual `tick()`/`clear()` cycle instead of real `setInterval(..., 50)` which was flaking under sequential `npm run test:all` event-loop pressure); all three scenarios (positive-control bug repro, compile-interval cleared, vote-interval cleared) are green.

---

## Upgrade Notes

There is **no installer / binary distribution** for v0.3.1 — this is a code-only patch.

**For end-users:** if you are currently running the v0.3.0 installed binary (NSIS installer or portable exe), you are unaffected by the `npm run dev:electron` build-script fix and unaffected by the music-player state quirk (which only manifests on the inline CRT monitor when toggling between inline and fullscreen modes in `vite dev`). The `loadSavedGame` interval-clear fix would be observable if you ever clicked LOAD while a demo was mid-compile or while a party vote was mid-flight in v0.3.0, but v0.3.1 ships this fix and the bug never reached production binaries. Wait for the next feature-drop release (`v0.4.0`) for a packaged installer with all three fixes bundled.

**For contributors:** simply `git pull` / `git checkout v0.3.1` / `npm install`. `npm run dev:electron` now reliably rebuilds the Main-process preload rather than crashing on a missing `window.electronAPI`. The new mid-flight interval clear pattern (`compileIntervalRef` + `partyVoteIntervalRef`) is the precedent for any future interval-typed setState chain.

---

## Verification

- `npm run lint` (tsc --noEmit) — exit 0
- `npm run test:all` — 7/7 smokes green, including the rewritten deterministic `loadDuringImport` smoke (Scenarios A/B/C: positive-control bug repro WITHOUT clearInterval, compile interval IS cleared on import, vote interval IS cleared on import)
- `npm run audit:docs` — doc/sim parity gate green
- `npm run build` — clean renderer bundle
- Electron `worklet://` + `npm run dev:electron` rounds-trip — `window.electronAPI` populated on first launch; `reload window` picks up subsequent `electron/*` edits

---

**License:** Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
