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

import type {
  ExpenseCategory,
  HardwareCategory,
  IncomeSource,
  Production,
  ReputationVector,
  SceneMagazine,
  TravelSubscriptionTier,
} from "@packages/types";

export const emit = {
  /**
   * Sets the player's handle + crew group name. The reducer in
   * sim/engine/reducer.ts writes both fields into WorldState.player; the
   * emission point is App.tsx's `handleNewGame` (after MainMenu dispatches
   * `onNewGame(handle, groupName)`). App.tsx is mid-migration: the local
   * `setPlayerHandle` / `setPlayerGroupName` useState mirror is still the
   * path the rest of the UI tree reads, but the truth lives in the event log
   * and the SimulationLoop snapshot. See the TODO(dynamic-name) comment that
   * has now been replaced in sim/engine/reducer.ts.
   */
  playerIdentitySet: (handle: string, groupName: string) =>
    appendEvent({ type: "PlayerIdentitySet", ts: currentTick, handle, groupName }),
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
  /**
   * Richer cousin of `partyResultsAwarded`: same payload, but callers that
   * prefer one rich event for the prize leg of a contest use this. The
   * reducer mirrors placement onto `state.productions.mine[productionId]`
   * AND updates the party slot the same way PartyResultsAwarded does.
   */
  partyPrizeAwarded: (
    productionId: string,
    placement: number,
    partyName: string,
    cashPrize: number,
    repPrize: number,
  ) =>
    appendEvent({
      type: "PartyPrizeAwarded",
      ts: currentTick,
      productionId,
      placement,
      partyName,
      cashPrize,
      repPrize,
    }),
  // --- Economy / hardware / freelance -------------------------------------
  // The convention for paired cash + domain events: the dispatcher calls
  // BOTH `moneyEarned`/`moneySpent` AND the domain event in sequence. The
  // reducer updates state.player.money AND the ledger AND the domain
  // slice in lock-step, so the projection balance is sum-replayable.
  moneyEarned: (
    amount: number,
    source: IncomeSource,
    sourceRefId?: string,
  ) =>
    appendEvent({ type: "MoneyEarned", ts: currentTick, amount, source, sourceRefId }),
  moneySpent: (
    amount: number,
    category: ExpenseCategory,
    purchasedItem?: { kind: "hardware" | "software"; itemId: string },
    sourceRefId?: string,
  ) =>
    appendEvent({
      type: "MoneySpent",
      ts: currentTick,
      amount,
      category,
      purchasedItem,
      sourceRefId,
    }),
  jobAccepted: (
    instanceId: string,
    templateId: string,
    payment: number,
    reputationDelta: number,
    deadlineYear: number,
    deadlineMonth: number,
    npcProviderId?: string,
  ) =>
    appendEvent({
      type: "JobAccepted",
      ts: currentTick,
      instanceId,
      templateId,
      npcProviderId,
      payment,
      reputationDelta,
      deadlineYear,
      deadlineMonth,
    }),
  jobCompleted: (instanceId: string, success = true) =>
    appendEvent({ type: "JobCompleted", ts: currentTick, instanceId, success }),
  hardwarePurchased: (
    itemId: string,
    instanceId: string,
    condition: "new" | "refurbished" | "used",
    cost: number,
  ) =>
    appendEvent({
      type: "HardwarePurchased",
      ts: currentTick,
      itemId,
      instanceId,
      condition,
      cost,
    }),
  hardwareSold: (instanceId: string, itemId: string, resalePrice: number) =>
    appendEvent({
      type: "HardwareSold",
      ts: currentTick,
      instanceId,
      itemId,
      resalePrice,
    }),
  softwarePurchased: (softwareId: string, cost: number) =>
    appendEvent({ type: "SoftwarePurchased", ts: currentTick, softwareId, cost }),
  travelExpensePaid: (
    partyId: string,
    amount: number,
    distanceKind: "local" | "regional" | "international",
  ) =>
    appendEvent({
      type: "TravelExpensePaid",
      ts: currentTick,
      partyId,
      amount,
      distanceKind,
    }),
  reputationVectorChanged: (delta: Partial<ReputationVector>, reason: string) =>
    appendEvent({ type: "ReputationVectorChanged", ts: currentTick, delta, reason }),
  travelSubscriptionChanged: (tier: TravelSubscriptionTier, monthlyFee: number) =>
    appendEvent({
      type: "TravelSubscriptionChanged",
      ts: currentTick,
      tier,
      monthlyFee,
    }),
  // NOTE: HardwareCategory / IncomeSource / ExpenseCategory / TravelSubscriptionTier
  // are imported above so the emit.* builders are typed strongly.
  // NOTE: emit.edgeAdded intentionally NOT exposed today (no current caller).
  // EdgeAddedEvent already carries both `edgeId` and a full `edge: SocialEdge`
  // payload (see sim/events/eventTypes.ts) and the reducer case spreads
  // `event.edge` into `state.socialGraph.edges`, so a future
  // `emit.edgeAdded(edge: SocialEdge)` helper would be safe to add — the event
  // payload preserves the full data and the reducer case mirrors it. Add the
  // helper on demand when a caller appears.
};
