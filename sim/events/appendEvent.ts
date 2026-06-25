/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * `appendEvent` \u2014 the only sanctioned way for sim code (and reducer code
 * specifically) to mutate world state. Returns the constructed event so callers
 * never need a separate `id`+`timestamp` computation, and ensures every event
 * goes through the EventStore singleton (no direct DOM/React touchpoints).
 */

import { eventStore } from "./eventStore";
import type { SimEvent } from "./eventTypes";
import type { EventTimestamp } from "./eventTypes";
import { generateId } from "@packages/utils";

/**
 * Distributive Omit. The naive `Omit<SimEvent, "id" | "reducedAt">` flattens
 * the discriminated union and produces an "intersection of required fields"
 * that no literal can satisfy (this is what was generating the 8 TS2353
 * errors on every emit builder). Distributing over `T extends any` keeps each
 * variant's structure intact.
 */
type DistributeOmit<T, K extends keyof any> = T extends any ? Omit<T, K> : never;

/**
 * Public alias for the distributive draft shape. Use this everywhere a draft
 * event is accepted (SimulationLoop.dispatch, custom UI bridges, etc.) so a
 * single source of truth governs type narrowing.
 */
export type EventDraft = DistributeOmit<SimEvent, "id" | "reducedAt">;

/** Simulation tick (calendar year-month). */
let currentTick: EventTimestamp = 0;

/** Engine sets this on each MonthAdvancedEvent. UI code never calls this directly. */
export function setCurrentTick(ts: EventTimestamp): void {
  currentTick = ts;
}

export function getCurrentTick(): EventTimestamp {
  return currentTick;
}

/**
 * Append a stamped event to the global EventStore.
 *
 *   draft  : DistributeOmit<SimEvent, "id" | "reducedAt">
 *   return : SimEvent (with id + reducedAt stamped)
 *
 * The DistributeOmit is required \u2014 see the comment on the type alias above.
 * Without it, every emit.* builder below fails type-checking because the
 * naive Omit produces a flattened intersection that excludes per-variant
 * properties like `delta`, `previousYear`, `production`, etc.
 */
export function appendEvent(draft: EventDraft): SimEvent {
  const stamped: SimEvent = {
    ...draft,
    id: generateId(draft.type.toLowerCase()),
    reducedAt: Date.now(),
  } as SimEvent;
  eventStore.append(stamped);
  return stamped;
}

// --- Convenience builders ---------------------------------------------------

import type { Production, SceneMagazine } from "@packages/types";

export const emit = {
  moneyChanged: (delta: number, reason: string) =>
    appendEvent({ type: "MoneyChanged", ts: currentTick, delta, reason }),
  reputationChanged: (delta: number, reason: string) =>
    appendEvent({ type: "ReputationChanged", ts: currentTick, delta, reason }),
  researchChanged: (delta: number, reason: string) =>
    appendEvent({ type: "ResearchPointsChanged", ts: currentTick, delta, reason }),
  monthAdvanced: (prevY: number, prevM: number, nextY: number, nextM: number) =>
    appendEvent({
      type: "MonthAdvanced",
      ts: nextY * 12 + nextM,
      previousYear: prevY,
      previousMonth: prevM,
      nextYear: nextY,
      nextMonth: nextM,
    }),
  scenarioLoaded: (scenario: "1985_8bit" | "1991_16bit" | "1998_pc3d") =>
    appendEvent({ type: "ScenarioLoaded", ts: currentTick, scenario }),
  demoCompiled: (production: Production) =>
    appendEvent({ type: "DemoCompiled", ts: currentTick, production }),
  newsArticle: (article: SceneMagazine) =>
    appendEvent({ type: "NewsArticlePublished", ts: currentTick, article }),
  edgeWeightChanged: (
    edgeId: string,
    previousWeight: number,
    newWeight: number,
    reason: string,
  ) =>
    appendEvent({
      type: "EdgeWeightChanged",
      ts: currentTick,
      edgeId,
      previousWeight,
      newWeight,
      reason,
    }),
  /**
   * Stamps party results onto a specific player release. The reducer looks
   * up `state.productions.mine[productionId]` and applies placement + partyName.
   */
  partyResultsAwarded: (
    productionId: string,
    placement: number,
    partyName: string,
    cashPrize: number,
    repPrize: number,
  ) =>
    appendEvent({
      type: "PartyResultsAwarded",
      ts: currentTick,
      productionId,
      placement,
      partyName,
      cashPrize,
      repPrize,
    }),
  // NOTE: emit.edgeAdded intentionally NOT exposed today (no current caller).
  // EdgeAddedEvent already carries both `edgeId` and a full `edge: SocialEdge`
  // payload (see sim/events/eventTypes.ts) and the reducer case spreads
  // `event.edge` into `state.socialGraph.edges`, so a future
  // `emit.edgeAdded(edge: SocialEdge)` helper would be safe to add — the event
  // payload preserves the full data and the reducer case mirrors it. Add the
  // helper on demand when a caller appears.
};
