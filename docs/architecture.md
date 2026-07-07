# Architecture

This repo is a Demoscene Simulator (1985–2005 timeline, hire coders/artists/musicians, research copper tricks, compete at parties). It is organized into the **three-layer rule** below; everything else in this repo is implementation detail.

## The THREE-LAYERS RULE (do not violate)

```
┌──────────────────────┐   /sim (pure data, NO React/DOM/LLM)
│  SIMULATION (truth)  │   events • engine • data • domain • projections
└──────────┬───────────┘
           │  read-only
┌──────────▼───────────┐   /apps/ui (React, motion, lucide, etc.)
│  UI (presentation)   │   src/* + apps/ui/*
└──────────▲───────────┘
           │  dispatch SimEvent via loop.dispatch / appendEvent
┌──────────┴───────────┐   /apps/llm, /apps/server, /tools
│  I/O (boundary)      │   LLM proxies, replay debugger, event inspector
└──────────────────────┘
```

**All state changes flow downward**, never sideways:

- `/apps/**` (UI/server/llm/tools) call `appendEvent(...)` or `loop.dispatch(...)` — never mutate world state directly.
- `/sim/**` produces state projections and react-sources — never imports React, DOM, fetch, or `setState`.
- `/packages/**` is type-only / utility-only — never ships logic specific to one layer.

If a contributor violates this, the fix is to move the file into the layer it belongs to, not to ship the violation.

## Folder contents

### `/sim` — core simulation (the truth)

| Folder       | Purpose                                                                                            |
| ------------ | -------------------------------------------------------------------------------------------------- |
| `events/`    | Discriminated union of every gameplay event. `appendEvent()` is the single sanctioned entry point. |
| `engine/`    | `reduce(state, event)` pure reducer + `SimulationLoop` tick scheduler. Owns `emptyWorldState()` — the canonical bootstrap shape including the `$250` starting-allowance ledger row (id `"seed"`) so the literal ledger invariant holds by construction without any UI-layer dispatch. |
| `data/`      | Static / seed data (`HISTORICAL_PLATFORMS`, `INITIAL_NPCS`, `PARTY_CALENDAR`, …).                  |
| `projections/`| Read-only view-models derived from `WorldState` that the UI layer consumes. *(currently stubbed)* |
| `domain/`    | Per-domain helpers (npc, bbs, demo, party, reputation rule logic). *(currently stubbed)*           |

**Hard rules:**

- ❌ No `import React / react-dom / electron / @google/genai / document / fetch / setState`. A Vite SSR or Node test target must be able to load this folder.
- ❌ No direct mutation of `WorldState`. Mutation goes through `reduce(state, event) → state`.
- ❌ No **debug-style or I/O** side effects outside `eventStore.append(...)`. The engine boundary (`sim/engine/simulationLoop.ts`) may legitimately schedule timers (`setInterval`/`clearInterval`/`queueMicrotask`) and update module-level ticks via `setCurrentTick(...)` — those are engine plumbing, not reducible-mutation. But ad-hoc `console.log`-style debug calls that touch I/O are forbidden.

### `/packages` — shared types + utils (anti-drift layer)

| Folder       | Purpose                                                                                                |
| ------------ | ------------------------------------------------------------------------------------------------------ |
| `types/src/` | Single source of truth for all sim-facing types (`Character`, `Production`, `PlatformId`, `BBSThread`, …). Any code that needs a sim type imports them from `@packages/types` — NEVER redeclare them locally. |
| `utils/src/` | Pure helpers (`generateId(prefix)`, `simTimestamp(year, month)`, `advanceMonths(...)`, `MONTH_NAMES`). |

**Hard rules:**

- ❌ No layer-specific logic. `@packages/*` is shared between `/sim` and `/apps/*`; importing React here would couple a shared package to UI.
- ❌ No module-level mutable counters. `id.ts`'s `nonce()` is fully per-call — see the function comment.

### `/apps` — UI/server/llm (presentation + boundaries)

| Folder       | Purpose                                                                                 |
| ------------ | --------------------------------------------------------------------------------------- |
| `apps/ui/`   | *(reserved — currently React lives in `src/` during the transition)*                    |
| `apps/server/`| *(reserved — Express server for AI Studio parity)*                                     |
| `apps/llm/`  | *(reserved — LLM proxies; `@google/genai` is already in `package.json`)*                |

Until migration finishes, the legacy `src/App.tsx` monolith dispatches **only** the events it must through `loop.dispatch(...)`; everything else remains a direct setState for the transition.

### `/tools` — replay & inspection

Standalone debuggers that read `eventStore.all()` and the snapshot from `SimulationLoop.snapshot()`. They MUST NOT mutate world state. *(currently stubbed — see `docs/simulation-rules.md` "Tools discipline".)*

### `/docs` and `/prompts` — context injection

These docs and prompts are the **load-bearing AI-discipline surface**. They exist so every AI session starts with the same rules. They MUST stay in sync with the actual exports.

- `docs/architecture.md` — this file.
- `docs/event-sourcing.md` — events, `appendEvent`, `EventDraft`, reducer.
- `docs/simulation-rules.md` — DO / DO NOT list with code-level examples.
- `prompts/system-ai-coder.md` — system prompt for AI sessions.
- `prompts/add-feature.md` — recipe for adding gameplay actions.
- `prompts/debug-simulation.md` — diagnose with `eventStore.all()` + tools.
- `prompts/refactor-event-system.md` — safely prune the event union.

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
| `@tools`          | `tools/`                  |
| `@apps/ui`        | `apps/ui/`                |
| `@apps/server`    | `apps/server/`            |
| `@apps/llm`       | `apps/llm/`               |

If you ever see `./types` or `./data` imports reaching into `src/`, that's a pre-migration leftover and must be migrated to `@packages/types` / `@sim/data`.

## Invariants (system-level)

A change is **NOT mergeable** if it:

1. Adds React / `fetch` / `setState` anywhere under `/sim`.
2. Lets `/apps/**` mutate `WorldState` directly (bypassing `dispatch` / `appendEvent`).
3. Defines a sim-facing type outside `@packages/types`.
4. Adds an `emit.*` builder whose payload is silently lossy (e.g. an `emit.edgeAdded` that takes a full `SocialEdge` but only stores an `edgeId` — we already deleted one).
5. Adds a reducer case that is `return state;` without an in-code comment explaining why; silent no-op reducers are how data loss sneaks in.
6. Uses the naive `Omit<SimEvent, "id" | "reducedAt">` anywhere — that flattens the discriminated union and TS gets angry. Always use `EventDraft` (`DistributeOmit`).

If you break an invariant, the regression that surfaces will be subtle (StaleState / StrictMode double-fire / data-loss on resume). Run `docs/simulation-rules.md` before submitting a change.

## Bootstrap ownership (post-v0.2.0)

`/sim` owns the bootstrap seed. Concretely:

- `sim/engine/reducer.ts::emptyWorldState()` ships `player.money = 250` AND a matching `IncomeLedgerEntry` row in `ledger.income` (id `"seed"`, year 1985, month 1, `source: IncomeSource.Other`, `sourceRefId: "starting_allowance"`). The literal invariant `state.player.money === sum(ledger.income) - sum(ledger.expense)` holds by construction — every consumer (production App.tsx, smoke tests, replay runs, projections) reads the same canonical state.
- `/apps/**` MUST NOT credit the seed via a synthetic dispatch. If a UI handler, autosave rehydrate path, or LLM-driven tool tries to dispatch `MoneyEarned{amount: 250, source: IncomeSource.Other, sourceRefId: "starting_allowance"}` to "top up" the allowance, it will double-credit the seed row and break the invariant. `MoneyEarned`'s reducer case already dedups by `event.id` (so an accidental `MoneyEarned{id: "seed", ...}` would short-circuit harmlessly) but other shapes (different `id`, same amount/source) are NOT protected.
- Seed-policy enforcement is **architectural** (single source in `/sim`), not enforced by the type system. The concrete process rule — what to grep for, what to flag in a PR review — lives in `simulation-rules.md`'s DO NOT list (see the "DO NOT dispatch the bootstrap seed (`$250`) from a UI layer / autosave path" entry).
