/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Era configuration — pure data defining the mapping between calendar
 * years and world eras. Shared by the domain layer (for era detection)
 * and the data layer (for effect year gating).
 *
 * Pure data. NO React, NO LLM, NO side effects.
 */

import { EraId } from "@packages/types";

export interface EraBoundary {
  era: EraId;
  label: string;
  fromYear: number;
  toYear: number;
}

export const ERA_BOUNDARIES: EraBoundary[] = [
  { era: EraId.ERA_8_BIT,      label: "8-Bit Era",       fromYear: 1982, toYear: 1989 },
  { era: EraId.ERA_16_BIT,     label: "16-Bit Era",      fromYear: 1990, toYear: 1995 },
  { era: EraId.ERA_PC_DAWN,    label: "PC Dawn Era",     fromYear: 1996, toYear: 2000 },
  { era: EraId.ERA_3D_SHADER,  label: "3D Shader Era",   fromYear: 2001, toYear: 2005 },
  { era: EraId.ERA_HD_SHADER,  label: "HD Shader Era",   fromYear: 2006, toYear: 2026 },
];

/**
 * Map a calendar year to its corresponding EraId.
 */
export function eraForYear(year: number): EraId {
  for (const b of ERA_BOUNDARIES) {
    if (year >= b.fromYear && year <= b.toYear) return b.era;
  }
  return EraId.ERA_HD_SHADER; // fallback for future years
}
