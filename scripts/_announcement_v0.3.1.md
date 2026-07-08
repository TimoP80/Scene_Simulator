# Scene Simulator v0.3.1 — Announcement Posts

Three platform-specific variants for announcing the v0.3.1 patch release. All link to https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.1.

> v0.3.1 is a **code-only patch** — no new binary installer. End-users on the v0.3.0 packaged binary are unaffected (the dev:electron fix doesn't apply to packaged builds, and the audio-toggle / loadSavedGame fixes ship rolled up into the next feature release `v0.4.0`). Contributors / `git pull` readers benefit immediately.

---

## Discord (casual, emoji-friendly, ~220 words)

🛠️ **Scene Simulator v0.3.1 patch is up**

Quick maintenance release — three bug-fixes since `v0.3.0`, no new features:

🔇 **CRT fullscreen no longer wipes your MUTE.** The audio-toggles were trapped inside `DemoScreen`. Pressing `F` to fullscreen unmounted+remounted the surface and reset your MUTE back to "TAP TO PLAY". Hoisted `crtAudioEnabled` + `crtIsPlaying` into `App.tsx`; your inline preference now persists across inline↔fullscreen.

💾 **No more ghost drops on LOAD.** If you ever opened a saved game while a demo was mid-compile (or a party vote was in flight), the JS interval kept ticking after the import — and the terminal callback could fire `finishCompilation()` / `awardPartyContestPoints()` AGAINST the freshly loaded save, leaking a leftover release or prize credit. Both `compileIntervalRef` + `partyVoteIntervalRef` now route through `useRef`, are properly `clearInterval`'d at the top of `loadSavedGame`, and an explicit React-18 state-reset block defeats the auto-batching race where queued setStates could leak past `clearInterval`. The companion smoke test was rewritten for determinism and is now CI-green.

🖥️ **`npm run dev:electron` no longer fails on a fresh checkout.** The script wasn't watching the `dist-electron/preload.cjs` build, so `electron .` would launch looking for a `window.electronAPI` that didn't exist yet. Added a concurrent `wait-on` host-watcher.

📥 **Source-only:** No new installer. Devs `git pull`; players wait for `v0.4.0` (rolls into the next feature-release installer).

🔗 https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.1

---

## Reddit (r/programming / r/typescript / r/electronjs style, ~280 words, technical)

**Scene Simulator v0.3.1 — code-only patch: interval clear on save-load + audio-toggle state hoist + electron dev-script race**

Following the v0.3.0 AudioWorklet / multi-category scoring drop, three bug-fixes landed via conventional commits on `main` and were rolled up into the v0.3.1 patch tag.

* **Ghost release/prize drops on `loadSavedGame`.** Both `triggerAssembleCompiler` and `startPartyVotingProcess` capture partial state via `setInterval` closure; before this fix, opening a LOAD file mid-flight left the in-flight interval running, and the terminal-tick callbacks (`finishCompilation()`, `awardPartyContestPoints()`) could fire AGAINST the freshly reset snapshot — dropping a leftover release / prize credit into the newly-loaded save. Both `compileIntervalRef` and `partyVoteIntervalRef` are now tracked through `useRef<ReturnType<typeof setInterval> | null>(null)`, are guarded with `clearInterval` at the top of `loadSavedGame`'s snapshot-apply path, AND an explicit 11-setter ephemeral-state reset block (`setIsCompiling(false)`, `setCompilerProgress(0)`, `setCompilerLogs([])`, `setShowCompilingOverlay(false)`, `setActiveParty(null)`, `setIsPartyRunning(false)`, `setPartyStep(0)`, `setPartyRivals([])`, `setPartyVoteTally({})`, `setPartySelectedProdId('')`, `setPartyContestLogger([])`) defeats the React-18 auto-batching race where queued setStates from a dying interval's terminal tick could leak past `clearInterval`. The companion `sim/__tests__/loadDuringImport.smoke.ts` was rewritten for determinism (a `makeInterval()` stub + manual `tick()` / `clear()` model instead of real `setInterval(…, 50)` which was flaking under sequential `npm run test:all` event-loop pressure); the three-scenario contract (positive-control bug repro, compile interval cleared, vote interval cleared) is green.

* **Inline MUTE resetting on fullscreen.** `audioEnabled` / `isPlaying` were trapped in two `useState` declarations inside `DemoScreen` — one for the inline CRT card, one for the portal-rendered `<FullscreenDemoView/>`. Pressing `F` unmounted+remounted and reset the MUTE. Hoisted to `App.tsx` as `crtAudioEnabled` / `crtIsPlaying` (with `useCallback` togglers), five props forwarded through both surfaces, `NOOP` stub on the hero-capture preview mount. Bonus: deduped a stale "Interval ids owned by…" comment-block orphan from earlier work.

* **`npm run dev:electron` fail-on-fresh-checkout.** The script launched `electron .` before `dist-electron/preload.cjs` existed, leaving `window.electronAPI` undefined and tripping the "requires Electron host" guard in `src/audio/trackerPlayer.ts::init()`. Added a concurrent `vite build --watch` host-watcher and `wait-on` to gate the Electron launch.

**Code-only patch — no binaries this round.** v0.4.0 will bundle all three into the next packaged installer.

🔗 https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.1
📜 CHANGELOG: https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md

---

## Hacker News (~200 words, plain text, no markdown)

Title: Scene Simulator v0.3.1 patch

Text:

A small maintenance patch for the Scene Simulator (a 1985-2005 demoscene life-sim) focusing on three edge cases that surfaced in the v0.3.0 multi-category-scoring release.

Fixes:

- Ghost release/prize drops on saved game load. The triggerAssembleCompiler and startPartyVotingProcess setInterval closures captured partial state; if the user opened LOAD mid-flight, the terminal-tick callbacks (finishCompilation, awardPartyContestPoints) could fire AGAINST the freshly reset snapshot, dropping a leftover release or prize credit into the new save. Both compileIntervalRef and partyVoteIntervalRef are now tracked through useRef, guarded with clearInterval at the top of loadSavedGame's snapshot-apply path, and an explicit 11-setter ephemeral-state reset defeats the React-18 auto-batching race where queued setStates from a dying interval's terminal tick could leak past clearInterval. The companion sim/__tests__/loadDuringImport.smoke.ts was rewritten for determinism (a makeInterval stub + manual tick()/clear() model instead of real setInterval).

- Inline MUTE resetting on fullscreen toggle. audioEnabled and isPlaying were trapped as useState inside DemoScreen. Pressing F unmounted + remounted the surface and reset the MUTE preference back to TAP TO PLAY. Hoisted to App.tsx as crtAudioEnabled + crtIsPlaying with useCallback togglers, five props forwarded through both surfaces.

- npm run dev:electron fail-on-fresh-checkout. The script launched electron before preload.cjs existed, leaving window.electronAPI undefined. Added a concurrent vite build --watch host-watcher + wait-on.

Code-only patch. No binary distribution this round; the fixes roll into the next feature-release installer (v0.4.0).

https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.1

---

## Posting tips

- **Discord:** paste as-is. The `**bold**` renders as bold; emoji render natively. Consider pinning the post in #announcements for ~24 hours.
- **Reddit:** post to r/programming, r/typescript, or r/electronjs. The bullet points render as a list. Note this is a **patch release** — frame it as maintenance, not a feature drop. Don't use "Show HN" (that's reserved for project launches).
- **Hacker News:** plain-text only (no markdown). First paragraph is the hook — keep it under 3 sentences. HN generally treats small patch releases as discussion-thread topics, not "Show HN" submissions; consider posting as a top-level "Scene Simulator v0.3.1 patch" thread instead.

## Suggested cross-post order

1. **Hacker News** first (Monday or Tuesday morning US time, 8-10am ET) — gets the most technical feedback
2. **Reddit** 4-6 hours later — catches the HN tail
3. **Discord** when you have time to engage with responses
