# Contributing to Demoscene Simulator

Thanks for hacking on the sim. This document is the load-bearing contributor-facing surface: read it once before opening a PR.

## TL;DR — first-run dev loop

```sh
npm install        # installs devDeps (tsx, puppeteer-core, electron-builder, ffmpeg-static, …)
npm run dev        # vite dev on http://localhost:3000
npm run lint       # tsc --noEmit — must be green before any PR
npm run test:smoke # run all sim/__tests__/* smoke tests (see "Test layout" below)
```

You don't need Electron for most work — `npm run dev` boots the React tree in plain Chromium (the `electronAPI` shim is injected by `src/electronApi.ts` so missing-Electron falls back to a no-op).

For Electron-build runs, see [`docs/architecture.md`](#sim--apps--packages-rule) and `electron/main.ts`.

---

## Architecture rules (do not violate)

The repo is split into three layers. **All state changes flow downward**, never sideways.

| Layer | Path | What lives here | Hard rules |
| --- | --- | --- | --- |
| Simulation (truth) | `/sim/**` | Pure reducers, projection view-models, seed data | No `React`, no `fetch`, no `setState`, no `document`. Mutations flow through `reduce(state, event) → state`. Append events through `eventStore.append(...)`. |
| Apps (UI, IO) | `/src/**`, `/electron/**`, plus reserved `apps/{ui,server,llm}/` | React UI, electron main, LLM proxies, replay debugger tools | Call `appendEvent(...)` / `loop.dispatch(...)` — never mutate world state directly. |
| Packages (shared types) | `/packages/{types,utils}/**` | Single source of truth for sim-facing types (`Character`, `Production`, `PlatformId`, `BBSThread`, …) and pure helpers (`generateId`, `simTimestamp`, `advanceMonths`, `MONTH_NAMES`). | No layer-specific logic. Module-level mutable counters are forbidden. |

If you mutate an NPC's emotion in `/src/**` directly, the projection layer is stale. Always dispatch a `SimEvent`.

The canonical load-bearing documents are:

- [`docs/architecture.md`](docs/architecture.md) — three-layer rule, folder contents, path aliases, invariants, list of merge-blockers.
- [`docs/event-sourcing.md`](docs/event-sourcing.md) — events, `appendEvent`, `EventDraft`, reducer.
- [`docs/simulation-rules.md`](docs/simulation-rules.md) — DO / DO NOT list with code-level examples.

Read those before introducing a new event, a new projection, or a new shared type.

---

## Path aliases

Both `tsconfig.json` (`paths`) and `vite.config.ts` (`resolve.alias`) resolve the same set, in lock-step:

| Alias             | Resolves to               |
| ----------------- | ------------------------- |
| `@packages/types` | `packages/types/src/`     |
| `@packages/utils` | `packages/utils/src/`     |
| `@sim`            | `sim/` (barrel)           |
| `@sim/data`       | `sim/data/` (barrel)      |
| `@sim/events`     | `sim/events/`             |
| `@sim/engine`     | `sim/engine/`             |
| `@sim/projections` | `sim/projections/`       |
| `@sim/domain`     | `sim/domain/`             |
| `@tools`          | `tools/`                  |
| `@apps/ui`        | `apps/ui/`                |
| `@apps/server`    | `apps/server/`            |
| `@apps/llm`       | `apps/llm/`               |

If you ever see `./types` or `./data` imports reaching into `src/`, that's a pre-migration leftover and must be migrated to `@packages/types` / `@sim/data`.

---

## Test layout

Tests live in `sim/__tests__/` and are pure-Node scripts run with `tsx` (no jest, no vitest).

| Test | What it pins |
| --- | --- |
| `dispatchStampedEvent.smoke.ts` | Lock for the M1 bug: `loop.dispatch(stampedEvent)` MUST NOT be used. The test passes today because the bug is real; it will FAIL the day anyone fixes it, which is the regression signal. |
| `audit-docs.smoke.ts` | Parity check between markdown references in `docs/` and `prompts/` and the actual exports from `sim/`. Catches drift between docs and code. |
| `loadDuringImport.smoke.ts` | Mid-flight interval behavior: the compile / party-vote timers must clear on save-import so a leftover event from a pre-import run doesn't leak. |
| `economicsView.smoke.ts` | End-to-end exercise of the EconomyView projection — M1 deposit → buy-hardware pattern, ledger invariants, trust-weighted job payout band. |
| `appendOnlyReplayDeterminism.smoke.ts` | Same `EventDraft` sequence replayed yields structurally identical states; catches non-determinism regressions. |
| `audit-docs.smoke.ts` | Characterisation for `scripts/audit-docs.mjs`. |

Run a single test:

```sh
npx tsx sim/__tests__/economicsView.smoke.ts
```

Run all tests via the aggregator script:

```sh
npm run test:all
```

Each smoke test exits with code 0 on FULL PASS or 1 on FAIL. CI runs them all and treats a non-zero exit as a build breaker.

---

## Coding style

Strict rules from `docs/architecture.md` are non-negotiable:

1. **No React / DOM / fetch / setState anywhere under `/sim`.**
2. **`/apps/**` NEVER mutates `WorldState` directly** — always go through `dispatch(...)`.
3. **Sim-facing types live in `@packages/types`** — never re-declare them locally.
4. **Naïve `Omit<SimEvent, "id" | "reducedAt">` is forbidden** — it flattens the discriminated union into an "intersection of required fields" that no literal satisfies. Always use `EventDraft` (the distributive `Omit` exported from `sim/events/appendEvent.ts`).
5. **Reducer cases:** if you write `return state;` you MUST add a comment explaining why it's safe (otherwise it's a silent no-op that masks data loss).
6. **No `as any`** in production code, including the legitimate window-extension cases (`window as any` for `webkitAudioContext`) — keep those to a minimum and document each occurrence.

Naming / formatting:

- TypeScript strict is ON. Don't ship JSX / TS without addressing every `tsc --noEmit` warning.
- Path-alias imports (`@sim/engine/reducer`, `@packages/types`, …) over deep relative paths.
- Module-level `let` is allowed for engine-plumbing counters (`currentTick` in `sim/events/appendEvent.ts`); NEVER for cross-cutting shared state.

If a button is broken and the loop tick plays a role, **don't fix it by mutating state directly** — fix it in the reducer. The reducer is the source of truth.

---

## Build / ship pipeline

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on :3000 |
| `npm run build` | `vite build` for the renderer (dist/) |
| `npm run build:electron` | `vite build -c electron.vite.config.ts` for the Electron bundle (dist-electron/) |
| `npm run dist:win` | Build both, then `electron-builder --win --x64` (NSIS + portable) |
| `npm run dist:dir` | Build both, then `electron-builder --dir` (unpacked) |
| `npm run lint` | `tsc --noEmit` — blocks PRs |
| `npm run test:smoke` | All sim/__tests__/* smoke tests |
| `npm run audit:docs` | Doc-vs-export parity check |
| `npm run capture:preview` | Headless screenshot + WebM + GIF of the in-game CRT demo screen |
| `npm run icons` | Regenerate app icons under `build/` |

Never commit `dist/`, `dist-electron/`, `release/` — they are gitignored.

For a fresh Windows VM verification, follow `docs/release-process.md` once that exists.

---

## Issue triage and PR template checklist

Before tagging reviewers, walk through this list. The PR template (when it's added) will reference it directly.

- [ ] `npm run lint` passes (`tsc --noEmit` green).
- [ ] `npm run test:smoke` passes for existing tests + any new smoke test you added.
- [ ] `npm run build` produces a clean renderer bundle.
- [ ] If you added a new event variant, ALL three of: `sim/events/eventTypes.ts`, `sim/events/appendEvent.ts` (emit builder), `sim/engine/reducer.ts` (reducer case) — and the dispatch site lives in `/src/**` or `/apps/**`, never in `/sim/**`.
- [ ] If you added a new sim-facing type, it lives in `packages/types/src/` and is imported via `@packages/types`. No local re-declaration anywhere.
- [ ] If you added a new projection, it lives under `sim/projections/` and exports a pure function `fooView(state, …)` with no React / DOM imports.
- [ ] `npm run audit:docs` is green — if you renamed a file, updated the audit docs accordingly.

---

## License

Apache-2.0 (per the SPDX headers and `package.json`). By submitting a PR, you agree to license your contribution accordingly.
