/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * TechnologyForecast — a timeline panel that shows the player which techs
 * auto-unlock at each calendar year milestone, what they've already
 * unlocked, and what's coming next.
 *
 * Closes the feedback loop on the auto-unlock system from Phase 1b:
 * instead of techs silently unlocking when the calendar ticks, the player
 * can see the full roadmap of historical milestones.
 */

import React from "react";
import { useSimulationSelector } from "../hooks/useSimulationSelector";
import { YEAR_UNLOCK_MAP } from "@sim/data/yearUnlocks";
import { TECHNOLOGY_TREE } from "@sim/data/technologyTree";
import { ERA_BOUNDARIES, eraForYear } from "@sim/data/eraConfig";
import {
  Calendar,
  ChevronRight,
  Check,
  Lock,
  Sparkles,
  Zap,
  TrendingUp,
} from "lucide-react";

/** Sorted list of year milestones with their tech IDs. */
const SORTED_MILESTONES: { year: number; techIds: string[] }[] = Object.entries(
  YEAR_UNLOCK_MAP,
)
  .map(([yr, techIds]) => ({ year: parseInt(yr, 10), techIds }))
  .sort((a, b) => a.year - b.year);

/**
 * Pre-computed module-level maps for O(1) tech lookups in the hot render
 * path (every tag in the timeline calls techName / techDescription).
 * Built once at import time from the static TECHNOLOGY_TREE array.
 */
const TECH_BY_ID: ReadonlyMap<string, string> = new Map(
  TECHNOLOGY_TREE.map((t) => [t.id, t.name]),
);
const TECH_DESC_BY_ID: ReadonlyMap<string, string> = new Map(
  TECHNOLOGY_TREE.map((t) => [t.id, t.description]),
);
const TECH_NODE_BY_ID: ReadonlyMap<string, (typeof TECHNOLOGY_TREE)[number]> =
  new Map(TECHNOLOGY_TREE.map((t) => [t.id, t]));

/**
 * Pre-computed set of all tech IDs that ever appear in any auto-unlock
 * milestone — used for the auto-unlockable vs research-only breakdown.
 */
const AUTO_UNLOCKABLE_SET: ReadonlySet<string> = new Set(
  Object.values(YEAR_UNLOCK_MAP).flat(),
);

/** Lookup a tech node name by ID (O(1)). */
function techName(id: string): string {
  return TECH_BY_ID.get(id) ?? id;
}

/** Lookup a tech node description by ID (O(1)). */
function techDescription(id: string): string {
  return TECH_DESC_BY_ID.get(id) ?? "";
}

export default function TechnologyForecast() {
  const currentYear = useSimulationSelector((s) => s.calendar.year);
  const currentMonth = useSimulationSelector((s) => s.calendar.month);
  const unlockedTechs = useSimulationSelector((s) => s.player.unlockedTechs);

  const era = eraForYear(currentYear);
  const eraLabel = ERA_BOUNDARIES.find((b) => b.era === era)?.label ?? "Unknown";
  const eraConfig = ERA_BOUNDARIES.find((b) => b.era === era);
  const eraProgress = eraConfig
    ? Math.min(
        100,
        ((currentYear - eraConfig.fromYear) /
          Math.max(1, eraConfig.toYear - eraConfig.fromYear)) *
          100,
      )
    : 0;

  // Count how many auto-unlock techs the player has actually unlocked
  const autoUnlockableCount = AUTO_UNLOCKABLE_SET.size;
  const autoUnlockedCount = [...AUTO_UNLOCKABLE_SET].filter((id) =>
    unlockedTechs.includes(id),
  ).length;

  // Research-only techs (not in any auto-unlock milestone)
  const researchOnlyTechs = TECHNOLOGY_TREE.filter(
    (t) => !AUTO_UNLOCKABLE_SET.has(t.id),
  );
  const researchOnlyUnlocked = researchOnlyTechs.filter((t) =>
    unlockedTechs.includes(t.id),
  ).length;

  // Milestone breakdown: past, current, future
  const pastMilestones = SORTED_MILESTONES.filter((m) => m.year < currentYear);
  const currentMilestone = SORTED_MILESTONES.find((m) => m.year === currentYear);
  const futureMilestones = SORTED_MILESTONES.filter((m) => m.year > currentYear);

  // Next milestone (first future one)
  const nextMilestone = futureMilestones[0] ?? null;

  return (
    <div className="bg-[#18181b] p-4 rounded border border-[#27272a] shadow-lg font-mono mb-6">
      {/* ── Header ── */}
      <div className="flex items-center gap-2 border-b border-[#27272a] pb-2 mb-4">
        <Calendar className="text-[#22d3ee] w-4 h-4" />
        <h3 className="font-bold text-[#22d3ee] text-xs uppercase tracking-widest">
          Technology Forecast &amp; Milestones
        </h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* ── Status Card ── */}
        <div className="bg-[#09090b] rounded border border-[#27272a] p-3 space-y-2">
          <div className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider mb-2">
            Current Status
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#71717a]">Year</span>
            <span className="text-[#d4d4d8] font-bold">
              {currentYear}
              <span className="text-[#52525b] text-[10px] ml-1">
                /{String(currentMonth).padStart(2, "0")}
              </span>
            </span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-[#71717a]">Era</span>
            <span className="text-[#818cf8] font-bold text-[10px]">
              {eraLabel}
            </span>
          </div>

          {/* Era progress bar */}
          <div className="pt-1">
            <div className="flex justify-between text-[9px] text-[#52525b] mb-1">
              <span>Era progress</span>
              <span>{Math.round(eraProgress)}%</span>
            </div>
            <div className="w-full h-1.5 bg-[#27272a] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#818cf8] to-[#22d3ee] rounded-full transition-all duration-500"
                style={{ width: `${eraProgress}%` }}
              />
            </div>
          </div>

          {/* Unlock stats */}
          <div className="border-t border-[#27272a] pt-2 mt-2 space-y-1.5">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#71717a] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#22d3ee]" /> Auto-unlocks
              </span>
              <span className="text-[#d4d4d8]">
                {autoUnlockedCount}
                <span className="text-[#52525b]">/{autoUnlockableCount}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#71717a] flex items-center gap-1">
                <Zap className="w-3 h-3 text-[#facc15]" /> Researched
              </span>
              <span className="text-[#d4d4d8]">
                {researchOnlyUnlocked}
                <span className="text-[#52525b]">/{researchOnlyTechs.length}</span>
              </span>
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[#71717a] flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-[#4ade80]" /> Total
              </span>
              <span className="text-[#d4d4d8]">
                {unlockedTechs.length}
                <span className="text-[#52525b]">/{TECHNOLOGY_TREE.length}</span>
              </span>
            </div>
          </div>
        </div>

        {/* ── Timeline ── */}
        <div className="lg:col-span-2 bg-[#09090b] rounded border border-[#27272a] p-3">
          <div className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider mb-3">
            Milestone Roadmap
          </div>

          <div className="space-y-1 max-h-[400px] overflow-y-auto pr-1 scrollbar-thin">
            {/* Past milestones (last 5) */}
            {pastMilestones.slice(-5).map((m) => {
              const allUnlocked = m.techIds.every((id) =>
                unlockedTechs.includes(id),
              );
              return (
                <div
                  key={m.year}
                  className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-[#18181b]/60 transition-colors"
                >
                  <div className="flex-shrink-0 w-14 text-[10px] text-[#52525b] font-bold pt-0.5">
                    {m.year}
                  </div>
                  <div className="flex-shrink-0 pt-0.5">
                    {allUnlocked ? (
                      <Check className="w-3 h-3 text-[#4ade80]" />
                    ) : (
                      <Sparkles className="w-3 h-3 text-[#facc15]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap gap-1">
                      {m.techIds.map((tid) => {
                        const isUnlocked = unlockedTechs.includes(tid);
                        return (
                          <span
                            key={tid}
                            title={techDescription(tid)}
                            className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                              isUnlocked
                                ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]"
                                : "bg-[#27272a]/50 border-[#27272a] text-[#71717a]"
                            }`}
                          >
                            {isUnlocked ? "✓ " : ""}
                            {techName(tid)}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* Current year milestone (highlighted) */}
            {currentMilestone && (
              <div className="flex items-start gap-2 py-2 px-2 rounded bg-[#818cf8]/10 border border-[#818cf8]/30">
                <div className="flex-shrink-0 w-14 text-[10px] text-[#818cf8] font-bold pt-0.5">
                  {currentMilestone.year}
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <ChevronRight className="w-3 h-3 text-[#818cf8]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[9px] text-[#818cf8] font-bold mb-1 uppercase tracking-wider">
                    ← CURRENT ERA
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {currentMilestone.techIds.map((tid) => {
                      const isUnlocked = unlockedTechs.includes(tid);
                      return (
                        <span
                          key={tid}
                          title={techDescription(tid)}
                          className={`text-[9px] px-1.5 py-0.5 rounded border transition-colors ${
                            isUnlocked
                              ? "bg-[#4ade80]/10 border-[#4ade80]/30 text-[#4ade80]"
                              : "bg-[#818cf8]/10 border-[#818cf8]/40 text-[#818cf8]"
                          }`}
                        >
                          {isUnlocked ? "✓ " : ""}
                          {techName(tid)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Future milestones (next 4) */}
            {futureMilestones.slice(0, 4).map((m) => (
              <div
                key={m.year}
                className="flex items-start gap-2 py-1.5 px-2 rounded hover:bg-[#18181b]/60 transition-colors opacity-60 hover:opacity-90"
              >
                <div className="flex-shrink-0 w-14 text-[10px] text-[#52525b] font-bold pt-0.5">
                  {m.year}
                </div>
                <div className="flex-shrink-0 pt-0.5">
                  <Lock className="w-3 h-3 text-[#52525b]" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap gap-1">
                    {m.techIds.map((tid) => (
                      <span
                        key={tid}
                        title={
                          TECH_DESC_BY_ID.get(tid) ??
                          "Unlocks when calendar reaches " + m.year
                        }
                        className="text-[9px] px-1.5 py-0.5 rounded border border-[#27272a] text-[#52525b] bg-[#18181b]/30"
                      >
                        {techName(tid)}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Overflow count */}
            {futureMilestones.length > 4 && (
              <div className="text-[9px] text-[#52525b] text-center pt-1 italic">
                +{futureMilestones.length - 4} more milestones ahead...
              </div>
            )}

            {/* No future milestones */}
            {futureMilestones.length === 0 && (
              <div className="text-[9px] text-[#facc15]/60 text-center pt-2 italic border-t border-[#27272a]">
                All milestones reached! You are at the cutting edge.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Next Milestone Spotlight ── */}
      {nextMilestone && (
        <div className="mt-3 bg-[#09090b] rounded border border-[#27272a] p-3">
          <div className="flex items-center gap-1.5 mb-2">
            <TrendingUp className="w-3 h-3 text-[#22d3ee]" />
            <span className="text-[10px] text-[#a1a1aa] font-bold uppercase tracking-wider">
              Next Milestone: {nextMilestone.year}
            </span>
            <span className="text-[8px] text-[#52525b]">
              ({nextMilestone.year - currentYear} year
              {nextMilestone.year - currentYear !== 1 ? "s" : ""} away)
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {nextMilestone.techIds.map((tid) => {
              const node = TECH_NODE_BY_ID.get(tid);
              const prereqsUnlocked =
                node?.preRequisiteIds?.every((pid) =>
                  unlockedTechs.includes(pid),
                ) ?? true;
              return (
                <div
                  key={tid}
                  className="bg-[#18181b] border border-[#27272a] rounded p-2 flex-1 min-w-[140px]"
                >
                  <div className="text-[10px] text-[#d4d4d8] font-bold">
                    {techName(tid)}
                  </div>
                  {node?.description && (
                    <div className="text-[8px] text-[#71717a] mt-0.5 leading-relaxed line-clamp-2">
                      {node.description}
                    </div>
                  )}
                  {node?.preRequisiteIds && node.preRequisiteIds.length > 0 && (
                    <div className="text-[8px] text-[#52525b] mt-1">
                      Requires:{" "}
                      {node.preRequisiteIds.reduce<
                        React.ReactNode[]
                      >((acc, pid, i) => {
                        const prereqUnlocked = unlockedTechs.includes(pid);
                        acc.push(
                          <span
                            key={pid}
                            className={
                              prereqUnlocked
                                ? "text-[#4ade80]"
                                : "text-[#a855f7]"
                            }
                          >
                            {techName(pid)}
                            {prereqUnlocked ? " ✓" : ""}
                            {i < (node.preRequisiteIds?.length ?? 0) - 1
                              ? ", "
                              : ""}
                          </span>,
                        );
                        return acc;
                      }, [])}
                    </div>
                  )}
                  <div
                    className={`text-[8px] mt-1 font-bold ${
                      prereqsUnlocked
                        ? "text-[#4ade80]"
                        : "text-[#a855f7]"
                    }`}
                  >
                    {prereqsUnlocked
                      ? "✓ prereqs met"
                      : "⏳ prereqs not met"}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
