/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * DemoBudgetMeter — v2.4 live budget meter + combo-synergy preview block.
 * Extracted from `src/App.tsx` so the budget UI can grow independently of
 * the App.tsx monolith (the App.tsx file size has breached the 100K
 * single-edit threshold, so further growth of the inline form region must
 * happen via extract-component).
 *
 * The component renders:
 *
 *   1. Two compact progress bars (CPU + RAM) showing cost/limit with
 *      traffic-light colour shift (base colour → amber at 80% → red on
 *      overflow). An amber pulse pip appears at the warning threshold
 *      and a glowing red box-shadow pulses when over-budget.
 *   2. A "COMBO SYNERGIES" sub-block that lists every EFFECT_SYNERGIES
 *      currently firing (each triggered pair as a violet badge) AND
 *      every synergy exactly-one-effect away from firing as a "+ 1
 *      more effect → Name (add EffectName)" teaser.
 *
 * Pure presentation: reads `selectedEffects` + the four cost/limit
 * numbers, derives everything else internally, stays a controlled leaf
 * (no useState, no side effects, no LLM, no fetch).
 */

import React from "react";
import {
  DEMO_EFFECTS,
  EFFECT_SYNERGIES,
  type EffectSynergy,
} from "@sim/data";
import type { DemoEffect } from "@packages/types";

interface DemoBudgetMeterProps {
  /** IDs of the currently selected effects — the SAME array the parent
   *  passes to the compiler at <DemoSummary/> / `generateDemoSummary()`. */
  selectedEffects: string[];
  /** Sum of selected effects' `cpuCost`. Recomputed by the parent. */
  combinedCpuDemand: number;
  /** Sum of selected effects' `ramCostKb`. Recomputed by the parent. */
  combinedRamDemand: number;
  /** Active rig's CPU budget cap. */
  cpuLimit: number;
  /** Active rig's RAM budget cap. */
  ramLimitKb: number;
}

/**
 * Compact horizontal progress bar for one rig dimension. Switches
 * colour from base → amber at 80% → red on overflow, with a glow that
 * pulses when over-budget. The `used / limit unit` tag right-aligns a
 * tabular-num read so the player can scan changes as they toggle.
 */
function BudgetBar(props: {
  label: string;
  used: number;
  limit: number;
  unit: string;
  baseColor: string;
}): React.ReactNode {
  const { label, used, limit, unit, baseColor } = props;
  // Guard against divide-by-zero (a half-typed / corrupted rig config
  // should still render something legible instead of NaN%).
  const safeLimit = Math.max(1, limit);
  const pct = Math.min(100, Math.round((used / safeLimit) * 100));
  const overflow = used > limit && limit > 0;
  const warning = !overflow && pct >= 80;
  const fillColor = overflow
    ? "#ef4444"
    : warning
    ? "#facc15"
    : baseColor;
  return (      <div
        className="flex items-center gap-3"
        role="progressbar"
        aria-label={`${label}: ${used} of ${limit} ${unit}`}
        aria-valuemin={0}
        aria-valuemax={Math.max(0, limit)}
        aria-valuenow={used}
      >
        <span className="text-[#a1a1aa] font-bold w-12 text-[10px] uppercase tracking-widest">
          {label}
        </span>
        <div className="flex-1 h-3 bg-[#1a1a24] rounded-full overflow-hidden border border-[#27272a] relative">
          <div
            className="h-full transition-all duration-200 ease-out"
          style={{
            width: `${pct}%`,
            backgroundColor: fillColor,
            boxShadow: overflow
              ? "0 0 8px rgba(239, 68, 68, 0.7)"
              : `0 0 6px ${baseColor}55`,
          }}
        />
        {warning && (
          <div
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-[#facc15] animate-pulse"
            aria-hidden
          />
        )}
      </div>
      <span
        className={`font-bold tabular-nums w-32 text-right text-[11px] ${
          overflow
            ? "text-[#ef4444] animate-pulse"
            : warning
            ? "text-[#facc15]"
            : "text-[#4ade80]"
        }`}
      >
        {used} / {limit} {unit}
      </span>
    </div>
  );
}

export default function DemoBudgetMeter({
  selectedEffects,
  combinedCpuDemand,
  combinedRamDemand,
  cpuLimit,
  ramLimitKb,
}: DemoBudgetMeterProps): React.ReactNode {
  // Lookup map powers the "+1 more effect → NAME (add missingEffect)"
  // teaser copy without an O(N*M) per render.
  const effectsById = new Map<string, DemoEffect>(
    DEMO_EFFECTS.map((e) => [e.id, e])
  );

  // Synergies whose required effect ids are ALL in the current
  // selection — these are certain to fire at compile time.
  const triggeredSynergies: EffectSynergy[] = EFFECT_SYNERGIES.filter(
    (syn) => syn.effectIds.every((id) => selectedEffects.includes(id))
  );

  // Synergies with exactly one missing effect — surfaced as "+ 1 more"
  // teasers that nudge the player toward completing the combo. We cap
  // the displayed count at 3 to keep the meter compact.
  const oneAwaySynergies: EffectSynergy[] = EFFECT_SYNERGIES.filter((syn) => {
    const missing = syn.effectIds.filter(
      (id) => !selectedEffects.includes(id)
    );
    return missing.length === 1;
  });

  const overBudget =
    combinedCpuDemand > cpuLimit || combinedRamDemand > ramLimitKb;

  return (
    <div
      id="studio-budget-meter"
      className="border border-[#27272a] bg-[#09090b] p-3 rounded text-xs space-y-3"
    >
      <div className="flex items-center justify-between">
        <span className="text-[#a1a1aa] font-bold text-[10.5px] uppercase tracking-widest">
          ⚡ Combined Power Metric Stats
        </span>
        {overBudget && (
          <span
            id="studio-budget-overflow-tag"
            role="alert"
            aria-live="assertive"
            className="text-[10px] bg-[#ef4444]/15 text-[#ef4444] font-bold px-2 py-1 border border-[#ef4444]/30 rounded select-none animate-pulse"
          >
            ⚠ OUT OF SYSTEM SPACE / OVERLOAD
          </span>
        )}
      </div>

      <div className="space-y-2">
        <BudgetBar
          label="CPU"
          used={combinedCpuDemand}
          limit={cpuLimit}
          unit="cycles"
          baseColor="#22d3ee"
        />
        <BudgetBar
          label="RAM"
          used={combinedRamDemand}
          limit={ramLimitKb}
          unit="KB"
          baseColor="#fb923c"
        />
      </div>

      {(triggeredSynergies.length > 0 || oneAwaySynergies.length > 0) && (
        <div
          id="studio-combo-synergies"
          className="border-t border-[#27272a] pt-2 space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-[#c084fc] font-bold text-[10px] uppercase tracking-widest">
              ✦ Combo Synergies
            </span>
            <span className="text-[10px] text-[#a1a1aa] tracking-wide">
              {triggeredSynergies.length} firing · {oneAwaySynergies.length}{" "}
              1 away
            </span>
          </div>

          {triggeredSynergies.length > 0 && (
            <div
              id="studio-combo-synergies-fired"
              className="flex flex-wrap gap-1.5"
            >
              {triggeredSynergies.map((s) => (
                <span
                  key={s.id}
                  className="px-2 py-1 rounded text-[10px] text-[#c084fc] border border-[#a855f7]/40 bg-[#a855f7]/15 font-bold uppercase tracking-wider"
                  title={s.description}
                >
                  ✦ {s.name}
                </span>
              ))}
            </div>
          )}

          {oneAwaySynergies.length > 0 && (
            <p
              id="studio-combo-synergies-teasers"
              className="text-[10px] text-[#a1a1aa] leading-relaxed"
            >
              <span className="text-[#fb923c] font-bold uppercase">
                + 1 more effect →
              </span>{" "}
              {oneAwaySynergies.slice(0, 3).map((s, i) => {
                const missingId = s.effectIds.find(
                  (id) => !selectedEffects.includes(id)
                );
                const missingEff = missingId
                  ? effectsById.get(missingId)
                  : undefined;
                const display = missingEff ? missingEff.name : "an effect";
                return (
                  <span key={s.id}>
                    {i > 0 && " · "}
                    {s.name}{" "}
                    <span className="text-[#fb923c]">(add {display})</span>
                  </span>
                );
              })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
