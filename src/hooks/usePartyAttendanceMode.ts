/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * usePartyAttendanceMode — React hook that drives Party Attendance Mode:
 * the full-weekend demoparty life simulation (Fri 16:00 → Sun 21:00).
 *
 * The pure engine lives in sim/domain/partyAttendance.ts; this hook owns the
 * React wiring:
 *   - holds the AttendanceState
 *   - auto-advances the sim clock (one sim hour per TICK_MS) while the
 *     attendance overlay is open and the weekend hasn't ended
 *   - exposes actions: moveTo / performActivity / startProduction /
 *     submitProduction / advanceHour (manual fast-forward)
 *   - computes the WeekendSummary trip report once the party ends
 *
 * The hook re-initializes state when the party name/year changes, so
 * attending a different party starts a fresh weekend.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AttendanceState, AttendanceVenueId, WeekendSummary } from "@packages/types";
import {
  createAttendanceState,
  advanceTime,
  moveTo,
  performActivity,
  startProduction,
  submitProduction,
  computeWeekendSummary,
} from "@sim/domain/partyAttendance";

export interface PartyAttendanceConfig {
  partyName: string;
  partyYear: number;
  playerHandle: string;
  playerGroupName: string;
  playerReputation: number;
  /** Gate the live ticker — disable when the attendance overlay is closed. */
  enabled: boolean;
}

export interface PartyAttendanceSim {
  state: AttendanceState;
  /** Trip report — non-null once the weekend is finished. */
  summary: WeekendSummary | null;
  actions: {
    moveTo: (venue: AttendanceVenueId) => void;
    performActivity: (activityId: string) => void;
    startProduction: (competitionId: string, name: string) => void;
    submitProduction: () => void;
    /** Skip one sim hour (fast-forward). */
    advanceHour: () => void;
  };
}

/** One sim hour per real second — a full weekend ≈ 1.5 real minutes. */
const TICK_MS = 1000;

export function usePartyAttendanceMode(config: PartyAttendanceConfig): PartyAttendanceSim {
  const { partyName, partyYear, enabled } = config;

  const [state, setState] = useState<AttendanceState>(() =>
    createAttendanceState(partyName, partyYear),
  );

  // Reset to a fresh weekend whenever the party changes.
  useEffect(() => {
    setState(createAttendanceState(partyName, partyYear));
  }, [partyName, partyYear]);

  const actions = useMemo(
    () => ({
      moveTo: (venue: AttendanceVenueId) => setState((prev) => moveTo(prev, venue)),
      performActivity: (activityId: string) =>
        setState((prev) => performActivity(prev, activityId).state),
      startProduction: (competitionId: string, name: string) =>
        setState((prev) => startProduction(prev, competitionId, name)),
      submitProduction: () => setState((prev) => submitProduction(prev)),
      advanceHour: () => setState((prev) => advanceTime(prev, 1).state),
    }),
    [],
  );

  // Auto-tick while the overlay is open and the weekend hasn't ended. The
  // engine's determinism makes the double-invoked StrictMode updater safe.
  useEffect(() => {
    if (!enabled || state.finished) return;
    const iv = setInterval(() => {
      setState((prev) => (prev.finished ? prev : advanceTime(prev, 1).state));
    }, TICK_MS);
    return () => clearInterval(iv);
  }, [enabled, state.finished]);

  // Trip report — memoized per state so its identity is stable across
  // renders that don't touch the underlying weekend state.
  const summary = useMemo(
    () => (state.finished ? computeWeekendSummary(state) : null),
    [state],
  );

  return useMemo(() => ({ state, summary, actions }), [state, summary, actions]);
}
