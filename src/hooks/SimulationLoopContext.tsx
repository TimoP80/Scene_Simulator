/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * SimulationLoopContext — provides the global SimulationLoop instance
 * to any component in the tree via React context. Components read
 * WorldState through the useSimulationSelector hook which uses
 * useSyncExternalStore with the loop's subscribe/getState.
 *
 * Usage:
 *
 *   // Root component wraps tree:
 *   <SimulationLoopProvider loop={loop}>
 *     <App />
 *   </SimulationLoopProvider>
 *
 *   // Any descendent reads a slice:
 *   const year = useSimulationSelector(s => s.calendar.year);
 */

import React, { createContext, useContext } from "react";
import type { SimulationLoop } from "@sim/engine/simulationLoop";

const SimulationLoopContext = createContext<SimulationLoop | null>(null);

interface SimulationLoopProviderProps {
  loop: SimulationLoop;
  children: React.ReactNode;
}

export function SimulationLoopProvider({ loop, children }: SimulationLoopProviderProps) {
  return (
    <SimulationLoopContext.Provider value={loop}>
      {children}
    </SimulationLoopContext.Provider>
  );
}

/**
 * Read the SimulationLoop from context.
 * Throws if called outside a SimulationLoopProvider.
 */
export function useSimulationLoop(): SimulationLoop {
  const loop = useContext(SimulationLoopContext);
  if (!loop) {
    throw new Error(
      "useSimulationLoop must be used within a SimulationLoopProvider. " +
      "Ensure the provider wraps your component tree."
    );
  }
  return loop;
}
