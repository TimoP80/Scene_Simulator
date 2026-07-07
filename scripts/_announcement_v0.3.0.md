# Scene Simulator v0.3.0 — Announcement Posts

Three platform-specific variants for announcing the v0.3.0 release. All link to https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.0. Pick the one that matches the platform you're posting to, or remix.

---

## Discord (casual, emoji-friendly, ~280 words)

🎵 **Scene Simulator v0.3.0 — tracker-music player + JSON-driven content + multi-category scoring is live!**

A demoscene life-sim spanning 1985-2005 — recruit sceners, research effects, compile demos, and compete at parties. v0.3.0 brings the in-app soundtrack and a redesigned scoring system:

🎵 **Tracker-music player** — drop in `.MOD` / `.XM` / `.IT` / `.S3M` files and they play in the background via `chiptune3` AudioWorklet. Native file picker, SHA-256 de-dupe, floating "Now Playing" bar with full transport, and a portal-rendered Playlist Manager modal with shuffle / repeat / clear.
📦 **JSON-driven content + Zod validation** — all sim data (BBS threads, hardware catalog, freelance jobs, parties, sceners, …) moved out of TypeScript modules into 15 Zod-validated JSON packs under `data/`. `npm run migrate:data` regenerates from any source-of-truth TS.
🛠 **Opt-in DevTools surface** — `?dev=1` opens a `DevMenu` with `BbsEditor` + `ScenerEditor` and an undo/redo `EditorShell`.
🎨 **Multi-category scoring engine** — 7 categories (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) + 8 factor contributions. 5 `ArtisticDirection`s and a declarative `EffectSynergies` table that fires on tag matches.
🏆 **DemoSummary modal** — post-compile report with score breakdown, triggered synergies, top-5 competition predictions per party, awards, and judge comments.

📦 **Windows installers attached** — NSIS installer (per-user install, changeable install dir) + portable single-file exe. Both x64.

📥 **Download:** https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.0
📖 **Full release notes:** https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md
💬 **Join the discussion:** https://github.com/TimoP80/Scene_Simulator/discussions

---

## Reddit (r/programming / r/typescript / r/electronjs style, ~420 words, slightly more technical)

**Scene Simulator v0.3.0 — tracker-music player + JSON-driven content + multi-category scoring**

A demoscene life-sim (1985-2005) where you recruit sceners, research effects, compile demos, and compete at parties. v0.3.0 is the "play your own soundtrack" release:

* **Tracker-music player.** Native file picker for `.MOD` / `.XM` / `.IT` / `.S3M`. Files are SHA-256 hashed and copied into `userData/music/<hash>.<ext>`, so the playlist is stable across launches. Playback runs in a `chiptune3` AudioWorklet. The worklet JS is bundled via `electron-builder`'s `extraResources` and served same-origin through a new `worklet://` privileged protocol registered with `protocol.registerSchemesAsPrivileged` and handled via `protocol.handle()`. The renderer's `audioContext.audioWorklet.addModule('worklet:///chiptune3.worklet.js')` round-trips through the main process with no `nodeIntegration`, so the sandbox stays intact. The floating `<MusicPlayer>` bar is mounted once at the App root so it survives tab navigation; the `<PlaylistManager>` modal is a `createPortal` overlay with shuffle / repeat (off / all / one) / per-track remove / clear-all.

* **JSON-driven content + Zod validation.** 15 packs under `data/` (bbs_threads, effects, groups, hardware, jobs, manifest, parties, platforms, productions, research, rival_releases, sceners, software, sponsorships) loaded by a manifest-driven `ContentLoader` and validated by Zod schemas at load time. `npm run migrate:data` regenerates the JSON from any source-of-truth TypeScript. `sim/__tests__/data_migration.smoke.ts` pins the round-trip invariant `migrate(load(sourceTs)) === load(targetJson)` across every pack.

* **Multi-category scoring engine + Artistic Directions + Effect Synergies.** The single-number `score` is replaced by a 7-category `ScoreBreakdown` (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) plus 8 factor contributions (skill / effect / synergy / direction / optimization / music-module / platform-fit / dev-time). 5 `ArtisticDirection` weightings let the player bias the formula. A declarative `EffectSynergies` table fires when matching effect tags are present.

* **Opt-in DevTools surface.** `?dev=1` toggles a `DevMenu` with `BbsEditor` + `ScenerEditor` and a generic `EditorShell` with `useUndo` (capped-history undo/redo).

* **DemoSummary modal.** Post-compile report with the 7-category score-bar grid, 8-tile factor grid, triggered synergies, top-5 competition predictions per upcoming party, awards-earned grid, and procedural judge comments.

**Stack:** React 19, Vite 6, TypeScript strict, electron-builder, chiptune3, zod, Motion, Lucide. Three-layer architecture (`/sim`, `/apps`, `/packages`) with hard rules forbidding React/fetch/setState under `/sim` (see `docs/architecture.md`).

**Windows installers** (NSIS + portable, x64) attached to the release page. The NSIS installer offers per-user install with a changeable install directory; the portable is a single-file executable that runs without installation.

🔗 **Release page:** https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.0
📜 **CHANGELOG:** https://github.com/TimoP80/Scene_Simulator/blob/main/CHANGELOG.md

---

## Hacker News (terse, Show HN style, ~330 words, no markdown)

Title: **Show HN: Scene Simulator v0.3.0 – Demoscene life-sim with built-in tracker-music player**

Text:

Scene Simulator is a React + Electron demoscene life-sim spanning 1985-2005. Recruit sceners, research effects, compile demos, and compete at parties. v0.3.0 is the "play your own soundtrack" release.

What changed:

- Tracker-music player. Native file picker for .MOD / .XM / .IT / .S3M. Files are SHA-256 hashed and copied into userData/music/<hash>.<ext>, so the playlist is stable across launches. Playback runs in a chiptune3 AudioWorklet. The worklet JS is bundled via electron-builder's extraResources and served same-origin through a new worklet:// privileged protocol (protocol.registerSchemesAsPrivileged + protocol.handle) so the renderer can call audioContext.audioWorklet.addModule('worklet:///chiptune3.worklet.js') without breaking the sandbox. The floating <MusicPlayer> bar is mounted once at the App root; the <PlaylistManager> modal is a createPortal overlay with shuffle / repeat (off / all / one) / per-track remove / clear-all.

- JSON-driven content + Zod validation. 15 packs under data/ (bbs_threads, effects, groups, hardware, jobs, manifest, parties, platforms, productions, research, rival_releases, sceners, software, sponsorships) loaded by a manifest-driven ContentLoader and validated by Zod schemas at load time. npm run migrate:data regenerates the JSON from any source-of-truth TypeScript. sim/__tests__/data_migration.smoke.ts pins the round-trip invariant.

- Multi-category scoring engine + Artistic Directions + Effect Synergies. The single-number score is replaced by a 7-category ScoreBreakdown (programming, graphics, music, originality, optimization, audience appeal, technical difficulty) plus 8 factor contributions (skill / effect / synergy / direction / optimization / music-module / platform-fit / dev-time). 5 ArtisticDirection weightings let the player bias the formula. A declarative EffectSynergies table fires when matching effect tags are present.

- Opt-in DevTools surface. ?dev=1 toggles a DevMenu with BbsEditor + ScenerEditor and a generic EditorShell with useUndo (capped-history undo/redo).

- DemoSummary modal. Post-compile report with the 7-category score-bar grid, 8-tile factor grid, triggered synergies, top-5 competition predictions per upcoming party, awards-earned grid, and procedural judge comments.

Stack: React 19, Vite 6, TypeScript strict, electron-builder, chiptune3, zod, Motion, Lucide. Three-layer architecture (sim/apps/packages) with hard rules forbidding React/fetch/setState under /sim.

https://github.com/TimoP80/Scene_Simulator/releases/tag/v0.3.0

---

## Posting tips

- **Discord:** paste as-is. The `**bold**` renders as bold; emoji render natively. Consider pinning the post in #announcements for 24-48 hours.
- **Reddit:** post to r/programming, r/typescript, or r/electronjs (pick the most relevant). The bullet points render as a list. The 🔗 emoji at the end is optional — some subs prefer no emoji.
- **Hacker News:** the title must be "Show HN: ..." to qualify for Show HN. The text uses no markdown (HN doesn't render it). The first paragraph is the hook — keep it under 3 sentences. Reply to comments with code links (`https://github.com/TimoP80/Scene_Simulator/blob/main/...`) rather than pasting code blocks.

## Suggested cross-post order

1. **Hacker News** first (Monday or Tuesday morning US time, 8-10am ET) — gets the most technical feedback
2. **Reddit** 4-6 hours later — catches the HN tail
3. **Discord** when you have time to engage with responses
