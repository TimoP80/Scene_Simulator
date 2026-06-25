/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure reducer \u2014 the single source of truth for sim state shape.
 * Takes (state, event) and returns the next state WITHOUT mutating.
 *
 * NO React, NO DOM, NO LLM, NO setTimeout, NO fetch. The setCompilerProgress
 * StrictMode double-fire class of bug is structurally impossible here because
 * reducers are pure and called once per dispatched event.
 *
 * WorldState is the ONLY shape every projection reads. If you mutate an
 * NPC's emotion in /apps/ui directly, the projection layer is stale.
 * Always dispatch a SimEvent.
 */

import {
  PlatformId,
  type BBSThread,
  type Character,
  type PartyEvent,
  type Production,
  type SceneMagazine,
  type SocialEdge,
  type SocialNode,
} from "@packages/types";
import type { SimEvent } from "../events/eventTypes";

// ---------------------------------------------------------------------------
// World state shape
// ---------------------------------------------------------------------------

export interface WorldState {
  meta: {
    startedAt: string;
    scenario: "1985_8bit" | "1991_16bit" | "1998_pc3d" | "custom";
  };
  player: {
    money: number;
    reputation: number;
    researchPoints: number;
    handle: string;
    groupName: string;
    activePlatform: PlatformId;
    ownedRigs: PlatformId[];
    unlockedTechs: string[];
  };
  calendar: {
    year: number;
    month: number;
  };
  crew: {
    hiredIds: string[];
    characters: Record<string, Character>;
  };
  bbs: {
    threads: BBSThread[];
  };
  productions: {
    mine: Record<string, Production>;
  };
  socialGraph: {
    nodes: SocialNode[];
    edges: SocialEdge[];
  };
  press: {
    newsLog: SceneMagazine[];
  };
  party: {
    active: PartyEvent | null;
    selectedProdId: string | null;
    ongoingTally: Record<string, number>;
    lastPlacement: number | null;
    lastCashPrize: number;
    lastRepPrize: number;
  };
}

// ---------------------------------------------------------------------------
// Initial seed
// ---------------------------------------------------------------------------

export function emptyWorldState(): WorldState {
  return {
    meta: { startedAt: new Date().toISOString(), scenario: "custom" },
    player: {
      money: 250,
      reputation: 20,
      researchPoints: 30,
      handle: "AssemblyKid",
      groupName: "Tricycle Crews",
      activePlatform: PlatformId.C64,
      ownedRigs: [PlatformId.C64],
      unlockedTechs: ["raster_sync"],
    },
    calendar: { year: 1985, month: 1 },
    crew: { hiredIds: [], characters: {} },
    bbs: { threads: [] },
    productions: { mine: {} },
    socialGraph: { nodes: [], edges: [] },
    press: { newsLog: [] },
    party: {
      active: null,
      selectedProdId: null,
      ongoingTally: {},
      lastPlacement: null,
      lastCashPrize: 0,
      lastRepPrize: 0,
    },
  };
}

// ---------------------------------------------------------------------------
// The reducer \u2014 SINGLE source of truth.
// ---------------------------------------------------------------------------

export function reduce(state: WorldState, event: SimEvent): WorldState {
  switch (event.type) {
    case "MoneyChanged":
      return {
        ...state,
        player: { ...state.player, money: Math.max(0, state.player.money + event.delta) },
      };
    case "ReputationChanged":
      return {
        ...state,
        player: {
          ...state.player,
          reputation: Math.max(0, Math.min(1000, state.player.reputation + event.delta)),
        },
      };
    case "ResearchPointsChanged":
      return {
        ...state,
        player: {
          ...state.player,
          researchPoints: Math.max(0, state.player.researchPoints + event.delta),
        },
      };
    case "MonthAdvanced":
      return {
        ...state,
        calendar: { year: event.nextYear, month: event.nextMonth },
      };
    case "ScenarioLoaded":
      return {
        ...state,
        meta: { ...state.meta, scenario: event.scenario },
      };
    case "RigPurchased":
      return {
        ...state,
        player: {
          ...state.player,
          ownedRigs: state.player.ownedRigs.includes(event.platformId)
            ? state.player.ownedRigs
            : [...state.player.ownedRigs, event.platformId],
          activePlatform: event.platformId,
        },
      };
    case "TechResearched":
      return {
        ...state,
        player: {
          ...state.player,
          unlockedTechs: state.player.unlockedTechs.includes(event.techId)
            ? state.player.unlockedTechs
            : [...state.player.unlockedTechs, event.techId],
        },
      };
    case "CrewHired": {
      // Mark the character as belonging to the player's group and active.
      // If the character isn't in the Record (e.g. the seed hasn't loaded
      // yet for this id), no-op rather than fabricate — fabrication would
      // mask ordering bugs in the seed loader.
      const target = state.crew.characters[event.charId];
      const updatedCharacters = target
        ? {
            ...state.crew.characters,
            [event.charId]: {
              ...target,
              groupId: state.player.groupName,
              status: "coding" as const,
            },
          }
        : state.crew.characters;
      return {
        ...state,
        crew: {
          hiredIds: state.crew.hiredIds.includes(event.charId)
            ? state.crew.hiredIds
            : [...state.crew.hiredIds, event.charId],
          characters: updatedCharacters,
        },
      };
    }
    case "CrewFired": {
      const target = state.crew.characters[event.charId];
      const updatedCharacters = target
        ? {
            ...state.crew.characters,
            [event.charId]: {
              ...target,
              groupId: null,
              status: "idle" as const,
            },
          }
        : state.crew.characters;
      return {
        ...state,
        crew: {
          hiredIds: state.crew.hiredIds.filter((id) => id !== event.charId),
          characters: updatedCharacters,
        },
      };
    }
    case "BurnoutReduced":
      // Burnout cost is debited through MoneyChanged separately; the reducer
      // here just records the intent so projections can re-emit friendly state.
      return state;
    case "DemoCompiled":
      return {
        ...state,
        productions: {
          mine: { ...state.productions.mine, [event.production.id]: event.production },
        },
      };
    case "PartyStarted":
      return {
        ...state,
        party: {
          ...state.party,
          active: event.party,
          selectedProdId: event.selectedProdId,
          ongoingTally: {},
        },
      };
    case "PartyVoteTicked":
      return { ...state, party: { ...state.party, ongoingTally: event.tally } };
    case "PartyResultsAwarded": {
      const target = state.productions.mine[event.productionId];
      const updatedMine = target
        ? {
            ...state.productions.mine,
            [event.productionId]: {
              ...target,
              placement: event.placement,
              partyName: event.partyName,
            },
          }
        : state.productions.mine;
      return {
        ...state,
        productions: { mine: updatedMine },
        party: {
          ...state.party,
          active: null,
          lastPlacement: event.placement,
          lastCashPrize: event.cashPrize,
          lastRepPrize: event.repPrize,
        },
      };
    }
    case "NodeAdded": {
      // Mirror the full node payload into the social graph; dedupe by id so
      // repeated GraphInit events don't multiply the node list.
      if (state.socialGraph.nodes.some((n) => n.id === event.node.id)) {
        return state;
      }
      return {
        ...state,
        socialGraph: {
          ...state.socialGraph,
          nodes: [...state.socialGraph.nodes, event.node],
        },
      };
    }
    case "EdgeAdded": {
      if (state.socialGraph.edges.some((e) => e.id === event.edge.id)) {
        return state;
      }
      return {
        ...state,
        socialGraph: {
          ...state.socialGraph,
          edges: [...state.socialGraph.edges, event.edge],
        },
      };
    }
    case "EdgeWeightChanged":
      return {
        ...state,
        socialGraph: {
          ...state.socialGraph,
          edges: state.socialGraph.edges.map((e) =>
            e.id === event.edgeId ? { ...e, weight: event.newWeight } : e,
          ),
        },
      };
    case "NewsArticlePublished":
      return { ...state, press: { newsLog: [event.article, ...state.press.newsLog] } };
    case "BbsThreadMutated": {
      // Threads are mutable; viralRank travels with the thread object.
      const idx = state.bbs.threads.findIndex((t) => t.id === event.threadId);
      if (idx === -1) return state;
      const updatedThreads = state.bbs.threads.slice();
      const existing = updatedThreads[idx]!;
      updatedThreads[idx] = { ...existing, viralSpreadRank: event.viralRank };
      return { ...state, bbs: { threads: updatedThreads } };
    }
    case "NpcMemoryTransformed": {
      // Rotate one memory item from shortTermMemory to longTermMemory, with
      // a strength boost on transition. No-op if the character/cognitive is
      // missing or the memory id isn't in short-term storage.
      const char = state.crew.characters[event.charId];
      if (!char || !char.cognitive) return state;
      const fromIdx = char.cognitive.shortTermMemory.findIndex((m) => m.id === event.memoryId);
      if (fromIdx === -1) return state;
      const moved = char.cognitive.shortTermMemory[fromIdx]!;
      const nextShort = [
        ...char.cognitive.shortTermMemory.slice(0, fromIdx),
        ...char.cognitive.shortTermMemory.slice(fromIdx + 1),
      ];
      const nextLong = [
        ...char.cognitive.longTermMemory,
        { ...moved, strength: Math.min(100, moved.strength + 20) },
      ];
      return {
        ...state,
        crew: {
          ...state.crew,
          characters: {
            ...state.crew.characters,
            [event.charId]: {
              ...char,
              cognitive: {
                ...char.cognitive,
                shortTermMemory: nextShort,
                longTermMemory: nextLong,
              },
            },
          },
        },
      };
    }
    case "NpcOpinionDrifted": {
      // Accumulate per-entity opinion delta inside the NPC's cognitive
      // opinionVectors. No-op if the character/cognitive is missing;
      // clamp to [-100, 100].
      const char = state.crew.characters[event.charId];
      if (!char || !char.cognitive) return state;
      const prev = char.cognitive.opinionVectors[event.entity] ?? 0;
      const next = Math.max(-100, Math.min(100, prev + event.delta));
      const updatedOpinionVectors: Record<string, number> = {
        ...char.cognitive.opinionVectors,
        [event.entity]: next,
      };
      return {
        ...state,
        crew: {
          ...state.crew,
          characters: {
            ...state.crew.characters,
            [event.charId]: {
              ...char,
              cognitive: { ...char.cognitive, opinionVectors: updatedOpinionVectors },
            },
          },
        },
      };
    }
    default: {
      // exhaustiveness check
      const _exhaust: never = event;
      void _exhaust;
      return state;
    }
  }
}

/** Helper: reduce over a sequence of events, returning the final state. */
export function reduceAll(initial: WorldState, events: readonly SimEvent[]): WorldState {
  return events.reduce(reduce, initial);
}
