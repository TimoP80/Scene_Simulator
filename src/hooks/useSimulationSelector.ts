/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useSimulationSelector — a React hook that reads a slice of WorldState
 * with automatic re-rendering only when the selected value changes.
 *
 * Uses useSyncExternalStore internally, subscribing to the SimulationLoop's
 * listener set. Every dispatch/advanceMonth triggers a notification; the
 * selector is re-evaluated, and React only re-renders if the returned value
 * changed (by Object.is comparison).
 *
 * WorldState is immutable — slices are reference-stable until their specific
 * data changes. Selecting `s.player.reputationVector` returns the SAME object
 * reference across dispatches that don't touch the reputation vector, so
 * Object.is comparison works correctly for both primitives and nested objects.
 *
 * Usage:
 *
 *   const year = useSimulationSelector(s => s.calendar.year);
 *   const money = useSimulationSelector(s => s.player.money);
 *   const reputationVector = useSimulationSelector(s => s.player.reputationVector);
 *
 * Must be called within a SimulationLoopProvider.
 */

import { useSyncExternalStore } from "react";
import { useSimulationLoop } from "./SimulationLoopContext";
import type { WorldState } from "@sim/engine/reducer";

/**
 * Read a slice of WorldState with automatic reactivity.
 * Re-renders only when the selected value changes (Object.is comparison).
 *
 * @param selector - Function that extracts the desired value from WorldState.
 * @returns The selected value (stable reference if unchanged).
 */
export function useSimulationSelector<T>(
  selector: (state: WorldState) => T,
): T {
  const loop = useSimulationLoop();

  return useSyncExternalStore(
    (listener) => loop.subscribe(listener),
    () => selector(loop.getState()),
  );
}

/**
 * Read the full WorldState snapshot. Re-renders on every state change.
 * Prefer useSimulationSelector with a narrow selector instead.
 */
export function useWorldState(): WorldState {
  const loop = useSimulationLoop();
  return useSyncExternalStore(
    (listener) => loop.subscribe(listener),
    () => loop.getState(),
  );
}
