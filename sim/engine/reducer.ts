/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Pure reducer — the single source of truth for sim state shape.
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
  IncomeSource,
  PlatformId,
  TravelSubscriptionTier,
  type ActiveJob,
  type BBSThread,
  type Character,
  type ExpenseLedgerEntry,
  type IncomeLedgerEntry,
  type OwnedHardware,
  type OwnedSoftware,
  type PartyEvent,
  type Production,
  type SceneMagazine,
  type SocialEdge,
  type SocialNode,
  type ReputationVector,
  DEFAULT_REPUTATION_VECTOR,
  applyReputationDelta,
  reputationVectorToLegacy,
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
    /**
     * Legacy scalar reputation (0-1000). Kept as the arithmetic mean of
     * `reputationVector` for backward compatibility. New code should read
     * the vector and write to it via `ReputationVectorChanged` events.
     */
    reputation: number;
    /**
     * Multi-dimensional reputation vector (v0.6.0). Each axis 0-1000.
     * The legacy `reputation` field is automatically derived as the mean
     * of all eight axes when a `ReputationVectorChanged` event is reduced.
     */
    reputationVector: ReputationVector;
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
  /**
   * Economy slice — hardware inventory, software inventory, freelance job
   * board, income/expense ledger, and travel subscription details.
   *
   * Bootstrap seeds `player.money = 250` AND a matching synthetic
   * `IncomeLedgerEntry` row in `ledger.income` so the LITERAL invariant
   *
   *      state.player.money === sum(ledger.income) - sum(ledger.expense)
   *
   * holds by construction across every consumer (production App.tsx
   * bootstrap, smoke tests, replay runs, projections, /apps/ui mirrors).
   * The seed lives inside `emptyWorldState()` itself — the bootstrap path
   * across /sim and /apps/ui is therefore single-source-of-truth.
   *
   * Post-bootstrap, every change to `state.player.money` either:
   *   1. lands in the ledger via the M1 double-store pattern (MoneyEarned
   *      / MoneySpent), OR
   *   2. is a `MoneyChanged` delta which carries its own accounting
   *      (debited without a ledger row).
   *
   * `MoneyEarned`'s reducer case dedups by `event.id`, so a duplicate
   * `MoneyEarned{amount: 250, source: IncomeSource.Other, ...}` with id
   * `"seed"` would short-circuit against the baked-in seed row — the
   * invariant is preserved end-to-end through replay too.
   */
  economy: {
    ledger: {
      income: IncomeLedgerEntry[];
      expense: ExpenseLedgerEntry[];
    };
    hardware: OwnedHardware[];
    software: OwnedSoftware[];
    jobs: {
      /** Live jobs (status: in_progress / completed / failed). */
      active: ActiveJob[];
      /** Cached ids from JOB_TEMPLATES that are currently in-window. */
      templatesAvailable: string[];
    };
    travel: {
      activeSubscription: TravelSubscriptionTier;
      lastTravelToPartyId: string | null;
    };
  };
}

// ---------------------------------------------------------------------------
// Initial seed
// ---------------------------------------------------------------------------

export function emptyWorldState(): WorldState {
  return {
    meta: { startedAt: new Date().toISOString(), scenario: "custom" },
    player: {
      // Seed $250 lives INSIDE `emptyWorldState()` along with the matching
      // `IncomeLedgerEntry` row in `economy.ledger.income` below. The
      // LITERAL invariant
      //   `state.player.money === sum(ledger.income) - sum(ledger.expense)`
      // holds by construction; no bootstrap dispatch is needed anywhere
      // in /apps/ui or in /sim smoke tests. See the `economy` slice
      // doc-comment for the cross-cutting rationale.
      money: 250,
      reputation: 20,
      reputationVector: { ...DEFAULT_REPUTATION_VECTOR },
      researchPoints: 30,
      handle: "AssemblyKid",
      // Bootstrap default applied ONLY for the brief seed window BEFORE
      // MainMenu dispatches a `PlayerIdentitySet` event. Once a fresh game
      // begins, the dispatch in App.tsx's `handleNewGame` lands BOTH
      // handle + groupName into the event log AND into WorldState.player
      // through the reducer case below. Post-`PlayerIdentitySet`, the
      // event log is the source of truth — `state.player.groupName` is
      // derived from it like every other projection, and the legacy UI
      // `setPlayerGroupName` useState mirror in App.tsx is best-effort for
      // pre-migration consumers only.
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
    economy: {
      // Synthetic $250 starting-allowance row, baked into `emptyWorldState()`
      // so the literal ledger invariant
      //   `state.player.money === sum(ledger.income) - sum(ledger.expense)`
      // holds by construction. `id: "seed"` is a stable literal so a
      //   `MoneyEarned` event carrying the same id would dedup against
      //   this row (the reducer case short-circuits via id-keyed match).
      // `year` / `month` align with the smoke-test canonical NOW_TS
      // (`1985 * 12 + 1`) so the ledger's first row decodes to the same
      // (1985, 1) grid cell as a MoneyEarned dispatched at NOW_TS.
      ledger: {
        income: [
          {
            id: "seed",
            year: 1985,
            month: 1,
            amount: 250,
            source: IncomeSource.Other,
            sourceRefId: "starting_allowance",
          },
        ],
        expense: [],
      },
      hardware: [],
      software: [],
      jobs: { active: [], templatesAvailable: [] },
      travel: {
        activeSubscription: "none",
        lastTravelToPartyId: null,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// The reducer — SINGLE source of truth.
// ---------------------------------------------------------------------------

export function reduce(state: WorldState, event: SimEvent): WorldState {
  switch (event.type) {
    case "PlayerIdentitySet": {
      // Idempotency-on-event-id isn't enough here (MainMenu could legitimately
      // re-fire the same name on Continue -> New Game cycles); idempotency on
      // the (handle, groupName) pair is also important because the App.tsx
      // local useState mirror calls setPlayerHandle/setPlayerGroupName in
      // lock-step with the dispatch. Short-circuit on either axis so a
      // double-fire doesn't churn downstream projections.
      if (
        state.player.handle === event.handle &&
        state.player.groupName === event.groupName
      ) {
        return state;
      }
      return {
        ...state,
        player: {
          ...state.player,
          handle: event.handle,
          groupName: event.groupName,
        },
      };
    }
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
    case "ReputationVectorChanged": {
      const nextVector = applyReputationDelta(state.player.reputationVector, event.delta);
      const nextLegacy = reputationVectorToLegacy(nextVector);
      return {
        ...state,
        player: {
          ...state.player,
          reputationVector: nextVector,
          reputation: nextLegacy,
        },
      };
    }
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
      const idx = state.bbs.threads.findIndex((t) => t.id === event.threadId);
      if (idx === -1) return state;
      const updatedThreads = state.bbs.threads.slice();
      const existing = updatedThreads[idx]!;
      updatedThreads[idx] = { ...existing, viralSpreadRank: event.viralRank };
      return { ...state, bbs: { threads: updatedThreads } };
    }
    case "NpcMemoryTransformed": {
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
    case "MoneyEarned": {
      // Symmetric with MoneySpent: drop the duplicate stamped id before
      // mutating. Holds the invariant
      //   state.player.money === sum(income) - sum(expense)
      // across replay / stale-snapshot re-dispatch.
      if (state.economy.ledger.income.some((e) => e.id === event.id)) {
        return state;
      }
      const year = Math.floor(event.ts / 12);
      const month = event.ts % 12;
      const incomeEntry: IncomeLedgerEntry = {
        id: event.id,
        year,
        month,
        amount: event.amount,
        source: event.source,
        sourceRefId: event.sourceRefId,
      };
      return {
        ...state,
        player: { ...state.player, money: state.player.money + event.amount },
        economy: {
          ...state.economy,
          ledger: {
            ...state.economy.ledger,
            income: [...state.economy.ledger.income, incomeEntry],
          },
        },
      };
    }
    case "MoneySpent": {
      // Symmetric with MoneyEarned: dedup-by-event-id before mutating.
      // Balance clamps at 0 (demoscene budget can't go further into debt);
      // the ledger records the *intended* amount so the UI can show
      // "refused purchase" affordances from the refund / Sponsorship flow.
      if (state.economy.ledger.expense.some((e) => e.id === event.id)) {
        return state;
      }
      const year = Math.floor(event.ts / 12);
      const month = event.ts % 12;
      const expenseEntry: ExpenseLedgerEntry = {
        id: event.id,
        year,
        month,
        amount: event.amount,
        category: event.category,
        purchasedItem: event.purchasedItem,
        sourceRefId: event.sourceRefId,
      };
      return {
        ...state,
        player: {
          ...state.player,
          money: Math.max(0, state.player.money - event.amount),
        },
        economy: {
          ...state.economy,
          ledger: {
            ...state.economy.ledger,
            expense: [...state.economy.ledger.expense, expenseEntry],
          },
        },
      };
    }
    case "JobAccepted": {
      // Don't double-accept the same instanceId.
      if (state.economy.jobs.active.some((j) => j.instanceId === event.instanceId)) {
        return state;
      }
      const acceptedYear = Math.floor(event.ts / 12);
      const acceptedMonth = event.ts % 12;
      const newJob: ActiveJob = {
        instanceId: event.instanceId,
        templateId: event.templateId,
        npcProviderId: event.npcProviderId,
        acceptedYear,
        acceptedMonth,
        progressPct: 0,
        deadlineYear: event.deadlineYear,
        deadlineMonth: event.deadlineMonth,
        status: "in_progress",
      };
      return {
        ...state,
        economy: {
          ...state.economy,
          jobs: {
            ...state.economy.jobs,
            active: [...state.economy.jobs.active, newJob],
          },
        },
      };
    }
    case "JobCompleted": {
      const idx = state.economy.jobs.active.findIndex(
        (j) => j.instanceId === event.instanceId,
      );
      if (idx === -1) return state;
      const updatedJobs = state.economy.jobs.active.slice();
      updatedJobs[idx] = {
        ...updatedJobs[idx]!,
        status: event.success ? "completed" : "failed",
        progressPct: 100,
      };
      return {
        ...state,
        economy: {
          ...state.economy,
          jobs: { ...state.economy.jobs, active: updatedJobs },
        },
      };
    }
    case "HardwarePurchased": {
      // The MoneySpent that pays for this is dispatched separately by the
      // caller; we only update the inventory here.
      if (state.economy.hardware.some((h) => h.instanceId === event.instanceId)) {
        return state;
      }
      const purchaseYear = Math.floor(event.ts / 12);
      const purchaseMonth = event.ts % 12;
      const initialWear =
        event.condition === "new"
          ? 0
          : event.condition === "refurbished"
            ? 30
            : 60;
      const owned: OwnedHardware = {
        instanceId: event.instanceId,
        itemId: event.itemId,
        purchaseYear,
        purchaseMonth,
        condition: event.condition,
        wearLevel: initialWear,
      };
      return {
        ...state,
        economy: {
          ...state.economy,
          hardware: [...state.economy.hardware, owned],
        },
      };
    }
    case "HardwareSold": {
      const idx = state.economy.hardware.findIndex(
        (h) => h.instanceId === event.instanceId,
      );
      if (idx === -1) return state;
      // Validate: the caller-supplied itemId MUST match the owned row's
      // itemId. A mismatch is a caller bug — drop the event (no-op with
      // in-code comment per docs/event-sourcing.md) rather than destroy
      // an unrelated row.
      const ownedRow = state.economy.hardware[idx]!;
      if (ownedRow.itemId !== event.itemId) {
        return state;
      }
      const updatedHardware = state.economy.hardware.slice();
      updatedHardware.splice(idx, 1);
      return {
        ...state,
        economy: {
          ...state.economy,
          hardware: updatedHardware,
        },
      };
    }
    case "SoftwarePurchased": {
      if (state.economy.software.some((s) => s.softwareId === event.softwareId)) {
        return state;
      }
      const purchasedYear = Math.floor(event.ts / 12);
      const purchasedMonth = event.ts % 12;
      const owned: OwnedSoftware = {
        softwareId: event.softwareId,
        purchasedYear,
        purchasedMonth,
        currentlyUsable: true,
      };
      return {
        ...state,
        economy: {
          ...state.economy,
          software: [...state.economy.software, owned],
        },
      };
    }
    case "TravelExpensePaid": {
      return {
        ...state,
        economy: {
          ...state.economy,
          travel: {
            ...state.economy.travel,
            lastTravelToPartyId: event.partyId,
          },
        },
      };
    }
    case "PartyPrizeAwarded": {
      // Mirrors the older PartyResultsAwarded reducer behavior (placement
      // + partyName stamped onto the matching production). Currency lives
      // entirely in MoneyEarned / MoneySpent — the caller dispatches a
      // paired MoneyEarned{cashPrize, PartyPrize} for the cash side.
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
          lastPlacement: event.placement,
          lastCashPrize: event.cashPrize,
          lastRepPrize: event.repPrize,
        },
      };
    }
    case "TravelSubscriptionChanged": {
      return {
        ...state,
        economy: {
          ...state.economy,
          travel: {
            ...state.economy.travel,
            activeSubscription: event.tier,
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
