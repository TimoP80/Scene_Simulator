# System prompt: AI Coder

Paste this into every AI coding session before you let the model touch a file.

> You are working inside an **event-sourced Demoscene Simulator**. Three layers, each with strict import rules. All state changes reach the reducer through `loop.dispatch(draft)`; that call is a thin wrapper that (a) stamps and stores the draft via `appendEvent` and (b) runs the pure reducer in `sim/engine/reducer.ts`. There is no short-circuit that lets the reducer see a change without `loop.dispatch`, and no path that lets a UI handler skip the reducer. You will not introduce UI / LLM / DOM dependencies in `/sim`. You will not define sim-facing types outside `@packages/types`. You will not duplicate the event union. You will not mutate `WorldState` from `/apps/**`. If a "quick fix" seems to call for any of the above, the right answer is to restructure, not to relax the rule.
>
> Always specify scope ("only modify `/sim/events`"), specify the rule ("no React imports, no naive Omit on SimEvent"), and ask the model to enumerate the events it expects to emit before any code is generated — the response is the contract for correctness.
>
> Read first: `docs/architecture.md`, `docs/event-sourcing.md`, `docs/simulation-rules.md`. They are the ground truth your response must be consistent with.

## Authoritative rules

1. **Type imports** — `@packages/types` is the ONLY source of sim-facing types.
2. **Event imports** — `@sim/events` is the ONLY source of event types and `appendEvent`.
3. **Engine imports** — `@sim/engine` is the ONLY source of `reduce`, `SimulationLoop`, `WorldState`.
4. **Data imports** — `@sim/data` is the ONLY source of seed constants.
5. **Utility imports** — `@packages/utils` is the ONLY source of `generateId`, `simTimestamp`, `advanceMonths`, `MONTH_NAMES`.
6. **Draft typing** — every `appendEvent(draft)` and `loop.dispatch(draft)` parameter is typed `EventDraft`. The naive `Omit<SimEvent, "id"|"reducedAt">` is wrong.
7. **Reducer hygiene** — never `return state;` silently. Either return a new world slice OR leave an explanatory comment.
8. **UI ↔ sim boundary** — UI mutates only by calling `loop.dispatch(emit.*)`. UI never reaches into `WorldState` directly.
9. **Tools are read-only** — `/tools/*` MUST NOT call `appendEvent` or `loop.dispatch`.

## When in doubt, surface the choice

Before you generate code, output:

1. The list of files you intend to modify.
2. The list of events you intend to emit.
3. The exhaustive list of new `SimEvent` variants (if any).
4. Any non-trivial decision you have not explained.

If any answer is "no list" or "we'll see", stop and produce the lists first. The lists are how the user audits correctness in the absence of running tests.

## Anti-patterns we will reject

- `npc.friendship += 10;` — direct mutation; must become a `loop.dispatch({ type: "...", ts: getCurrentTick(), ...payload })` call (DRAFT form, not `loop.dispatch(emit.x(...))` which double-stores) plus the right event variant.
- `useState` inside `/sim/**`.
- A new `interface Character` in a non-`@packages/types` file.
- An `emit.*` helper that takes data the event payload doesn't preserve.
- A reducer case that is `return state;` without an in-code comment.
- `loop.dispatch(emit.x(...))` — the broken-pattern signature is locked as a **characterization test** in `sim/__tests__/dispatchStampedEvent.smoke.ts` (it asserts the M1 IS happening — any source change that fixes M1 will flip the test red and demand a corresponding test update). See `docs/event-sourcing.md` § "Anything not in this list is dispatched directly" for the full rationale.

## Self-check before submitting a change

- `npm run lint` is clean.
- Every event I emit appears in `SimEvent` (`sim/events/eventTypes.ts`).
- Every reducer case spreads fresh slices (no shared references returned).
- Every UI handler that touches money / rep / research / productions goes through `loop.dispatch`.
- Every new `emit.*` helper round-trips a payload the reducer case actually consumes.
