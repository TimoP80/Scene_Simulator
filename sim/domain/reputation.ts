/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Reputation domain helpers — pure functions for the multi-dimensional
 * reputation system (v0.6.0 Phase 1a).
 *
 * NO React. NO LLM. NO DOM. Side-effect free.
 *
 * Responsibilities:
 *   - applyReputationDelta — already in packages/types/src/reputation.ts
 *     (used by the reducer directly). This file adds higher-level helpers:
 *   - thresholdForReputation — get the tier name for a given axis value
 *   - reputationLabel — human-readable prestige label
 *   - reputationColor — CSS color for badge display
 *   - formatReputationChange — "+12 Technical" as display string
 */

import type { ReputationVector } from "@packages/types";
import {
  REPUTATION_DIMENSIONS,
  REPUTATION_LABELS,
  REPUTATION_SHORT_LABELS,
  REPUTATION_MIN,
  REPUTATION_MAX,
} from "@packages/types";

// ---------------------------------------------------------------------------
// Reputation tiers (applied per-axis)
// ---------------------------------------------------------------------------

export interface ReputationTierDef {
  minValue: number;
  label: string;
  cssColor: string;
}

export const REPUTATION_TIERS: ReputationTierDef[] = [
  { minValue: 0,   label: "Unknown",        cssColor: "text-zinc-500" },
  { minValue: 50,  label: "Newcomer",       cssColor: "text-zinc-400" },
  { minValue: 150, label: "Apprentice",     cssColor: "text-slate-300" },
  { minValue: 300, label: "Recognized",     cssColor: "text-cyan-400" },
  { minValue: 450, label: "Established",    cssColor: "text-blue-400" },
  { minValue: 600, label: "Renowned",       cssColor: "text-violet-400" },
  { minValue: 750, label: "Elite",          cssColor: "text-amber-400" },
  { minValue: 900, label: "Legendary",      cssColor: "text-yellow-300" },
];

/**
 * Get the highest tier achieved for a given reputation value.
 */
export function tierForReputation(value: number): ReputationTierDef {
  let tier = REPUTATION_TIERS[0]!;
  for (const t of REPUTATION_TIERS) {
    if (value >= t.minValue) tier = t;
  }
  return tier;
}

/**
 * Format a single axis change as a display string.
 * e.g. "+12 Technical" or "-5 Party Popularity"
 */
export function formatReputationChange(
  axis: keyof ReputationVector,
  delta: number,
  useShort = false,
): string {
  const label = useShort ? REPUTATION_SHORT_LABELS[axis] : REPUTATION_LABELS[axis];
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta} ${label}`;
}

/**
 * Format a full partial delta into an array of display strings.
 * Skips zero or undefined deltas.
 */
export function formatReputationDelta(
  delta: Partial<ReputationVector>,
  useShort = false,
): string[] {
  const out: string[] = [];
  for (const key of REPUTATION_DIMENSIONS) {
    const d = delta[key];
    if (d !== undefined && d !== 0) {
      out.push(formatReputationChange(key, d, useShort));
    }
  }
  return out;
}

/**
 * Build a human-readable summary of which dimensions changed.
 * e.g. "+12 Technical, +8 Scene Respect, -3 Oldschool Cred"
 */
export function summarizeReputationDelta(
  delta: Partial<ReputationVector>,
): string {
  const parts = formatReputationDelta(delta, false);
  if (parts.length === 0) return "No change";
  if (parts.length <= 3) return parts.join(", ");
  return `${parts.slice(0, 2).join(", ")} +${parts.length - 2} more`;
}

/**
 * Get the overall prestige tier for a full reputation vector
 * (uses the arithmetic mean, matching the legacy scalar).
 */
export function overallPrestigeTier(vector: ReputationVector): ReputationTierDef {
  const avg =
    REPUTATION_DIMENSIONS.reduce((s, k) => s + vector[k], 0) /
    REPUTATION_DIMENSIONS.length;
  return tierForReputation(avg);
}

/**
 * Compute what percentage of total reputation a single axis represents.
 */
export function axisShare(
  vector: ReputationVector,
  axis: keyof ReputationVector,
): number {
  const total = REPUTATION_DIMENSIONS.reduce((s, k) => s + vector[k], 0);
  if (total <= 0) return 0;
  return Math.round((vector[axis] / total) * 100);
}
