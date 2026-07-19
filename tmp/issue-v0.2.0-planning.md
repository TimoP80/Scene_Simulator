# v0.2.0 planning

## Goal

Polish the v0.1.0 release line: replace the SVG placeholder in the v0.1.0 release body with a real screenshot + animated GIF, sign the binaries, and close out the most prominent UX gaps that surfaced during the v0.1.0 stabilization cycle.

## Scope (proposed)

### Visual + asset polish (priority 1)

- [ ] **Replace `preview.svg` in the v0.1.0 release body with a real screenshot.** Capture the running app and a still that shows the WORKSPACE tab + a populated `<DemoScreen>` (with at least 3 effects enabled).
- [ ] **Capture a 30-second animated GIF** of the `<DemoScreen>` cycling through 3–5 effects (raster bars, vector cube, sine scroller, pixel fire, plasma).
- [ ] Verify the binary installers run cleanly on a fresh Windows VM (no leftover `%LOCALAPPDATA%/demoscene-simulator` state, no SmartScreen nag on the signed binary).
- [ ] Update `README.md` with a "Screenshots" sub-section anchored to the v0.1.0 release body.

### Code-signing (priority 1)

- [ ] Acquire an Authenticode code-signing certificate — candidate providers: **SignPath.io** (free for OSS, requires approval), **Certum** (paid, ~$30/yr), or a personal **DigiCert** EV cert (~$$).
- [ ] Wire signtool + the cert into `electron-builder` config (`build.win.certificateFile`, `build.win.certificatePassword`, `build.win.signingHashAlgorithms`, `build.win.publisherName`).
- [ ] Re-build and verify `signtool verify /pa` passes; GitHub's UI should show "Verified" publisher on the installer download.
- [ ] Document the code-signing flow in `docs/architecture.md` (or a new `docs/release-process.md`).

### Close out implementation debt (priority 2)

- [ ] `sim/engine/reducer.ts::emptyWorldState.groupName` hardcode flagged `TODO(dynamic-name)` — finish the event-sourced hydrate so the value flows from the player's event log (currently bypassed via MainMenu's `setPlayerGroupName`).
- [ ] Audit smoke tests — add a new `sim/__tests__/economicsView.smoke.ts` that exercises the `economicsView` projection end-to-end with the M1 double-store money-flow pattern (deposit → buy hardware → wear tick → re-project).
- [ ] Add a `sim/__tests__/appendOnlyReplayDeterminism.smoke.ts` — verify that replaying the same `EventDraft` sequence through `reduce()` yields identical state across runs (catches accidental non-determinism in the projections).
- [ ] Replace any `any`-typed parameter or `as any` cast in `src/` / `sim/` flagged by the audit.

### Developer-facing ergonomics (priority 2)

- [ ] Add a `CONTRIBUTING.md` (build instructions, test instructions, code-style rules per `docs/architecture.md`).
- [ ] Add a CI workflow (`.github/workflows/ci.yml`) that runs `tsc --noEmit`, the smoke tests, and `vite build` on every PR.
- [ ] Add a `Makefile`-style runner script (or consolidated `npm run`) for "first-run dev: `npm install && npm run dev`".

### Optional (defer if scope grows)

- [ ] **macOS + Linux binaries** (`dist:mac`, `dist:linux`) via GitHub Actions matrix builds.
- [ ] In-game tutorial mod that surfaces Economy / BBS / Party tabs on first launch.
- [ ] Save-game indicator UI (replace the autosave file-timestamp-mtime display in the MainMenu with a friendly last-saved `Y1985 M11`-style label).

## Open questions

- [ ] **Authenticode cert source** — SignPath.io (free OSS, manual approval), Certum (~$30/yr), DigiCert EV ($$), or self-signed (no SmartScreen reputation)? Each has very different tradeoffs in user experience of running the installer.
- [ ] **Screenshot tooling** — pure-PowerShell (no install), `nircmd` + `ffmpeg`, Playwright (heavy + ~250 MB Chromium download), or a Node script under `scripts/` that triggers the canvas via headless chromium?
- [ ] **Anonymous + named milestone installs** — should v0.2.0 still be a "fresh install" assuming no prior version, or include an upgrade-in-place flow for v0.1.0 users?
- [ ] **CI provider** — GitHub Actions (assumes `.github/`), AppVeyor, or local-only?
- [ ] **Cross-platform scope** — defer macOS+Linux to v0.3.0, or bundle into v0.2.0?

## Definition of done (v0.2.0)

- [ ] Release `https://github.com/TimoP80/Scene_SImulator/releases/tag/v0.2.0` is published with NSIS + portable + (optional) macOS + Linux binaries.
- [ ] Each binary is Authenticode-signed; `electron-builder` produces consistent `winCodeSign` artifacts; `signtool verify /pa` exits 0 on the installer + portable.
- [ ] Release body contains a real PNG screenshot + a 30-second GIF (the SVG stopgap is removed).
- [ ] The `TODO(dynamic-name)` hardcode is removed; crew-name hydrates from the event log.
- [ ] All `src/components/**` and `sim/**` files have zero TypeScript errors (`tsc --noEmit` exits 0).
- [ ] CI workflow is green on `main`; PR template references the new checklist.

## Out of scope for v0.2.0 (defer to v0.3.0+)

- Multiplayer / shared BBS world
- Mod support / plugin loader
- In-game analytics dashboard
- Steam release / itch.io page
- Mobile wrappers (Cordova, Capacitor)
