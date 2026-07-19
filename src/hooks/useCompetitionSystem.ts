/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useCompetitionSystem hook — manages v0.5.0 competition expansion state:
 *   - Competition ceremony (judges, rankings, awards)
 *   - Hall of Fame entries
 *   - Production history records
 *   - Player statistics
 *   - Ceremony UI visibility
 *
 * Integrates with the existing App.tsx party flow by providing functions
 * that can be called when a party's voting/competition phase completes.
 */

import { useState, useCallback, useMemo } from "react";
import type {
  CompetitionCeremony,
  HallOfFameEntry,
  PlayerStatistics,
  ProductionHistoryRecord,
  Production,
  ProductionType,
  ScoreBreakdown,
  CompetitionPrediction,
  Judge,
  PartyRankingEntry,
} from "@packages/types";

import {
  generateJudgingPanel,
  generateRivalEntries,
  runCompetition,
  qualifiesForHallOfFame,
  toHallOfFameEntry,
  computePlayerStatistics,
} from "../../sim/domain/competition";

// Re-export the function for use in App.tsx
export { computePlayerStatistics, toHallOfFameEntry, qualifiesForHallOfFame };

export interface CompetitionSystemState {
  /** The active ceremony (null if none running). */
  ceremony: CompetitionCeremony | null;
  /** Whether the ceremony overlay is visible. */
  showCeremony: boolean;
  /** Hall of Fame entries. */
  hallOfFame: HallOfFameEntry[];
  /** Production history records. */
  productionHistory: ProductionHistoryRecord[];
  /** Latest computed statistics. */
  stats: PlayerStatistics;
}

export interface CompetitionSystemActions {
  /** Start a competition ceremony with the player's production vs rivals. */
  startCompetition: (params: {
    partyId: string;
    partyName: string;
    year: number;
    month: number;
    prizePool: number;
    playerProduction: Production;
    playerBreakdown: ScoreBreakdown;
    playerScore: number;
    rivalCount: number;
  }) => void;
  /** Close the ceremony overlay. */
  closeCeremony: () => void;
  /** Add a production history record. */
  addHistoryRecord: (record: ProductionHistoryRecord) => void;
  /** Clear all competition data (for new game). */
  reset: () => void;
  /** Update statistics manually (e.g. after loading a save). */
  updateStats: (reputation: number) => void;
}

const EMPTY_STATS: PlayerStatistics = {
  productionsReleased: 0,
  competitionsEntered: 0,
  wins: 0,
  podiums: 0,
  averagePlacing: 0,
  highestScore: 0,
  averageOriginality: 0,
  averageTechnicalScore: 0,
  audiencePopularity: 0,
  mostUsedEffects: [],
  favoriteProductionType: "Mega-Demo" as ProductionType,
  totalDownloads: 0,
  totalPrizeMoney: 0,
  totalReputation: 0,
  currentReputation: 0,
  typeBreakdown: {},
};

/**
 * Hook that provides competition ceremony state management for App.tsx.
 */
export function useCompetitionSystem() {
  const [ceremony, setCeremony] = useState<CompetitionCeremony | null>(null);
  const [showCeremony, setShowCeremony] = useState(false);
  const [hallOfFame, setHallOfFame] = useState<HallOfFameEntry[]>([]);
  const [productionHistory, setProductionHistory] = useState<ProductionHistoryRecord[]>([]);
  const [stats, setStats] = useState<PlayerStatistics>(EMPTY_STATS);

  /**
   * Start a new competition ceremony.
   * Generates judges, creates rival entries, runs the competition,
   * and updates Hall of Fame + production history + statistics.
   */
  const startCompetition = useCallback(
    (params: {
      partyId: string;
      partyName: string;
      year: number;
      month: number;
      prizePool: number;
      playerProduction: Production;
      playerBreakdown: ScoreBreakdown;
      playerScore: number;
      rivalCount: number;
    }) => {
      const {
        partyId, partyName, year, month, prizePool,
        playerProduction, playerBreakdown, playerScore, rivalCount,
      } = params;

      // 1. Generate judging panel
      const judges = generateJudgingPanel(partyId, year);

      // 2. Generate rival entries using the competition engine
      const rivalEntries = generateRivalEntries(year, rivalCount, playerScore);

      // 3. Build player entry
      const playerEntry = {
        productionId: playerProduction.id,
        productionName: playerProduction.name,
        groupName: params.partyName, // Will be overridden by App.tsx
        productionType: playerProduction.type,
        isPlayer: true,
        breakdown: playerBreakdown,
        rawScore: playerScore,
      };

      // 4. Combine entries
      const allEntries = [playerEntry, ...rivalEntries];

      // 5. Get actual group name from App.tsx context (passed via production)
      allEntries[0].groupName = playerProduction.groupName || "Your Crew";

      // 6. Run competition
      const result = runCompetition(
        { partyId, partyName, year, month, prizePool, entries: allEntries, judges },
        Math.random
      );

      // 7. Update ceremony state
      setCeremony(result);
      setShowCeremony(true);

      // 8. Update Hall of Fame
      setHallOfFame((prev) => {
        const newEntries = result.rankings
          .filter(qualifiesForHallOfFame)
          .map((r) => toHallOfFameEntry(r, partyName, year, month));

        // Deduplicate by production ID
        const existingIds = new Set(prev.map((e) => e.id));
        const uniqueNew = newEntries.filter((e) => !existingIds.has(e.id));
        return [...uniqueNew, ...prev].slice(0, 100); // Cap at 100
      });

      // 9. Update production history
      const playerRanking = result.rankings.find((r) => r.isPlayer);
      if (playerRanking) {
        setProductionHistory((prev) => [
          {
            production: { ...playerProduction, placement: playerRanking.placement, partyName },
            partyName,
            placement: playerRanking.placement,
            finalScore: playerRanking.finalScore,
            audienceReaction: playerRanking.audienceReaction,
            sceneAwards: playerRanking.sceneAwards.length > 0 ? playerRanking.sceneAwards : undefined,
            submittedYear: year,
            submittedMonth: month,
          },
          ...prev,
        ]);
      } else {
        // Fallback: record the production without competition data
        setProductionHistory((prev) => [
          {
            production: playerProduction,
            submittedYear: year,
            submittedMonth: month,
          },
          ...prev,
        ]);
      }

      // 10. Update statistics (async, depends on state)
      // Will be recalculated on next render via useMemo
    },
    []
  );

  /** Close the ceremony overlay. */
  const closeCeremony = useCallback(() => {
    setShowCeremony(false);
  }, []);

  /** Add a production history record (e.g. after compiling a demo). */
  const addHistoryRecord = useCallback(
    (record: ProductionHistoryRecord) => {
      setProductionHistory((prev) => [record, ...prev]);
    },
    []
  );

  /** Reset all competition data (new game). */
  const reset = useCallback(() => {
    setCeremony(null);
    setShowCeremony(false);
    setHallOfFame([]);
    setProductionHistory([]);
    setStats(EMPTY_STATS);
  }, []);

  /** Recompute statistics dynamically from production history + current reputation. */
  const recomputeStats = useCallback(
    (reputation: number) => {
      const computed = computePlayerStatistics(productionHistory, reputation);
      setStats(computed);
    },
    [productionHistory]
  );

  return {
    // State
    ceremony,
    showCeremony,
    hallOfFame,
    productionHistory,
    stats,
    // Actions
    startCompetition,
    closeCeremony,
    addHistoryRecord,
    reset,
    recomputeStats,
  } as CompetitionSystemState & CompetitionSystemActions & { recomputeStats: (rep: number) => void };
}
