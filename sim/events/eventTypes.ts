/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Discriminated union of every gameplay event in the simulation.
 * Adding a new event MUST extend this union; the reducer in /sim/engine/reducer.ts
 * is the only place that ACTUALLY produces them, and projects/io code in
 * /app/ui must NEVER mutate state directly \u2014 dispatch events instead.
 *
 * Pure types. No React, no DOM, no LLM. Safe to import anywhere.
 */

import type {
  Character,
  PartyEvent,
  PlatformId,
  Production,
  ReputationVector,
  SceneMagazine,
  SocialEdge,
  SocialNode,
  TechNode,
  ExpenseCategory,
  HardwareCategory,
  IncomeSource,
  TravelSubscriptionTier,
} from "@packages/types";

export type EventTimestamp = number; // simulated calendar tick (year * 12 + month)

export interface BaseEvent {
  id: string;
  ts: EventTimestamp;
  /** Reduced wall-clock stamp for traceability. */
  reducedAt: number;
}

// --- Player economy ---------------------------------------------------------

/**
 * Emitted exactly ONCE per run, at NEW GAME (MainMenu's `onNewGame` -> App.tsx
 * `handleNewGame` -> `loop.dispatch`). After this event lands, every
 * projection / UI surface that needs the player's handle or crew name should
 * read it from WorldState derived from the event log — NOT from a useState
 * primitive mirrored in App.tsx.
 *
 * Invariant: the reducer MUST be idempotent on this event id (a stale-snapshot
 * re-dispatch should be a no-op), and SHOULD short-circuit when handle +
 * groupName already match — App.tsx's local useState mirror can fire the same
 * identity-set on every New Game and we want neither the ledger nor any
 * downstream re-projection noise.
 */
export interface PlayerIdentitySetEvent extends BaseEvent {
  type: "PlayerIdentitySet";
  handle: string;
  groupName: string;
}

export interface MoneyChangedEvent extends BaseEvent {
  type: "MoneyChanged";
  delta: number;
  reason: string;
}

export interface ReputationChangedEvent extends BaseEvent {
  type: "ReputationChanged";
  delta: number;
  reason: string;
}

export interface ResearchPointsChangedEvent extends BaseEvent {
  type: "ResearchPointsChanged";
  delta: number;
  reason: string;
}

// --- Calendar / scenario ticks ---------------------------------------------

export interface MonthAdvancedEvent extends BaseEvent {
  type: "MonthAdvanced";
  previousYear: number;
  previousMonth: number;
  nextYear: number;
  nextMonth: number;
}

export interface ScenarioLoadedEvent extends BaseEvent {
  type: "ScenarioLoaded";
  scenario: "1985_8bit" | "1991_16bit" | "1998_pc3d";
}

// --- Tech / rigs / rigs ----------------------------------------------------

export interface TechResearchedEvent extends BaseEvent {
  type: "TechResearched";
  techId: string;
}

export interface RigPurchasedEvent extends BaseEvent {
  type: "RigPurchased";
  platformId: PlatformId;
}

// --- Crew ------------------------------------------------------------------

export interface CrewHiredEvent extends BaseEvent {
  type: "CrewHired";
  charId: string;
  cost: number;
}

export interface CrewFiredEvent extends BaseEvent {
  type: "CrewFired";
  charId: string;
}

export interface BurnoutReducedEvent extends BaseEvent {
  type: "BurnoutReduced";
  charId: string;
  cost: number;
}

// --- Productions ------------------------------------------------------------

export interface DemoCompiledEvent extends BaseEvent {
  type: "DemoCompiled";
  production: Production;
}

// --- Parties ----------------------------------------------------------------

export interface PartyStartedEvent extends BaseEvent {
  type: "PartyStarted";
  party: PartyEvent;
  selectedProdId: string;
}

export interface PartyVoteTickedEvent extends BaseEvent {
  type: "PartyVoteTicked";
  tally: Record<string, number>;
}

export interface PartyResultsAwardedEvent extends BaseEvent {
  type: "PartyResultsAwarded";
  /** Production ID the placement is being stamped onto (reducer looks it up in productions.mine). */
  productionId: string;
  placement: number;
  partyName: string;
  cashPrize: number;
  repPrize: number;
}

// --- Social graph -----------------------------------------------------------

export interface NodeAddedEvent extends BaseEvent {
  type: "NodeAdded";
  nodeId: string;
  nodeType: "npc" | "group" | "tool" | "demo" | "event";
  /** Full node payload so the reducer can mirror it into state.socialGraph.nodes. */
  node: SocialNode;
}

export interface EdgeAddedEvent extends BaseEvent {
  type: "EdgeAdded";
  edgeId: string;
  /** Full edge payload so the reducer can mirror it into state.socialGraph.edges. */
  edge: SocialEdge;
}

export interface EdgeWeightChangedEvent extends BaseEvent {
  type: "EdgeWeightChanged";
  edgeId: string;
  previousWeight: number;
  newWeight: number;
  reason: string;
}

// --- BBS / scene press ------------------------------------------------------

export interface NewsArticlePublishedEvent extends BaseEvent {
  type: "NewsArticlePublished";
  article: SceneMagazine;
}

export interface BbsThreadMutatedEvent extends BaseEvent {
  type: "BbsThreadMutated";
  threadId: string;
  viralRank: number;
}

// --- Multi-dimensional reputation (v0.6.0) ---------------------------------

/**
 * Partial delta applied to the player's multi-dimensional reputation vector.
 * Only the axes in `delta` are modified; unspecified axes keep their current
 * value. The legacy scalar `state.player.reputation` is kept in sync as the
 * arithmetic mean of all eight axes (see reducer case).
 */
export interface ReputationVectorChangedEvent extends BaseEvent {
  type: "ReputationVectorChanged";
  delta: Partial<ReputationVector>;
  reason: string;
}

// --- NPC cognitive drift ----------------------------------------------------

export interface NpcMemoryTransformedEvent extends BaseEvent {
  type: "NpcMemoryTransformed";
  charId: string;
  memoryId: string;
}

export interface NpcOpinionDriftedEvent extends BaseEvent {
  type: "NpcOpinionDrifted";
  charId: string;
  entity: string;
  delta: number;
}

// --- Economy / hardware / freelance -----------------------------------------
//
// Schema note: these events complement the existing `MoneyChanged` flow with
// category-attributed ledger entries. New economy code dispatches *both*:
//   - a `MoneyEarned` or `MoneySpent` so the ledger captures the cash flow,
//   - a domain event (`HardwarePurchased`, `SoftwarePurchased`,
//     `JobCompleted`, `PartyPrizeAwarded`, \u2026) so projection readers
//     see the *reason* for that cash flow.
//
// CLIs and projections that need to answer "what's the current balance?"
// read `state.player.money`, which the reducer keeps in lock-step with the
// ledger on each earn/spent. The `MoneyChanged` event remains for callers
// that want a money update without committing to a category attribution.

export interface MoneyEarnedEvent extends BaseEvent {
  type: "MoneyEarned";
  amount: number;
  source: IncomeSource;
  /** Optional id pointing at the originating offer / prize / sponsorship. */
  sourceRefId?: string;
}

export interface MoneySpentEvent extends BaseEvent {
  type: "MoneySpent";
  amount: number;
  category: ExpenseCategory;
  /** Optional: capture which hardware or software item this paid for. */
  purchasedItem?: { kind: "hardware" | "software"; itemId: string };
  sourceRefId?: string;
}

export interface JobAcceptedEvent extends BaseEvent {
  type: "JobAccepted";
  instanceId: string;
  templateId: string;
  npcProviderId?: string;
  payment: number;
  reputationDelta: number;
  deadlineYear: number;
  deadlineMonth: number;
}

export interface JobCompletedEvent extends BaseEvent {
  type: "JobCompleted";
  instanceId: string;
  success: boolean;
}

export interface HardwarePurchasedEvent extends BaseEvent {
  type: "HardwarePurchased";
  itemId: string;
  instanceId: string;
  condition: "new" | "refurbished" | "used";
  /** Cost is ATTRIBUTED, not debited here. Caller dispatches MoneySpent alongside. */
  cost: number;
}

export interface HardwareSoldEvent extends BaseEvent {
  type: "HardwareSold";
  instanceId: string;
  itemId: string;
  resalePrice: number;
}

export interface TravelExpensePaidEvent extends BaseEvent {
  type: "TravelExpensePaid";
  partyId: string;
  amount: number;
  distanceKind: "local" | "regional" | "international";
}

export interface SoftwarePurchasedEvent extends BaseEvent {
  type: "SoftwarePurchased";
  softwareId: string;
  cost: number;
}

export interface PartyPrizeAwardedEvent extends BaseEvent {
  type: "PartyPrizeAwarded";
  productionId: string;
  placement: number;
  partyName: string;
  cashPrize: number;
  repPrize: number;
}

/**
 * Subscription change. Keeps `state.economy.travel.activeSubscription` in
 * sync with how much of "internet" the player carries \u2014 needed for BBS
 * reliability, demo upload speed, and freelancer inbound velocity.
 */
export interface TravelSubscriptionChangedEvent extends BaseEvent {
  type: "TravelSubscriptionChanged";
  tier: TravelSubscriptionTier;
  monthlyFee: number;
}

// --- Discriminated union ----------------------------------------------------

export type SimEvent =
  | PlayerIdentitySetEvent
  | MoneyChangedEvent
  | ReputationChangedEvent
  | ResearchPointsChangedEvent
  | MonthAdvancedEvent
  | ScenarioLoadedEvent
  | TechResearchedEvent
  | RigPurchasedEvent
  | CrewHiredEvent
  | CrewFiredEvent
  | BurnoutReducedEvent
  | DemoCompiledEvent
  | PartyStartedEvent
  | PartyVoteTickedEvent
  | PartyResultsAwardedEvent
  | NodeAddedEvent
  | EdgeAddedEvent
  | EdgeWeightChangedEvent
  | NewsArticlePublishedEvent
  | BbsThreadMutatedEvent
  | NpcMemoryTransformedEvent
  | NpcOpinionDriftedEvent
  | MoneyEarnedEvent
  | MoneySpentEvent
  | JobAcceptedEvent
  | JobCompletedEvent
  | HardwarePurchasedEvent
  | HardwareSoldEvent
  | TravelExpensePaidEvent
  | SoftwarePurchasedEvent
  | PartyPrizeAwardedEvent
  | ReputationVectorChangedEvent
  | TravelSubscriptionChangedEvent;

/** Narrow event types for a given `type` discriminator. */
export type SimEventOf<T extends SimEvent["type"]> = Extract<SimEvent, { type: T }>;

/** Helper used by the reducer to filter events for a UI view layer. */
export function isEventOf<T extends SimEvent["type"]>(
  type: T,
): (e: SimEvent) => e is SimEventOf<T> {
  return (e): e is SimEventOf<T> => e.type === type;
}
