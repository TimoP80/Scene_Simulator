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
  SceneMagazine,
  SocialEdge,
  SocialNode,
  TechNode,
} from "@packages/types";

export type EventTimestamp = number; // simulated calendar tick (year * 12 + month)

export interface BaseEvent {
  id: string;
  ts: EventTimestamp;
  /** Reduced wall-clock stamp for traceability. */
  reducedAt: number;
}

// --- Player economy ---------------------------------------------------------

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

// --- Discriminated union ----------------------------------------------------

export type SimEvent =
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
  | NpcOpinionDriftedEvent;

/** Narrow event types for a given `type` discriminator. */
export type SimEventOf<T extends SimEvent["type"]> = Extract<SimEvent, { type: T }>;

/** Helper used by the reducer to filter events for a UI view layer. */
export function isEventOf<T extends SimEvent["type"]>(
  type: T,
): (e: SimEvent) => e is SimEventOf<T> {
  return (e): e is SimEventOf<T> => e.type === type;
}
