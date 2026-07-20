/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * AppBootstrapper — creates a SimulationLoop instance exactly once
 * and provides it to the App tree via SimulationLoopProvider.
 *
 * This component MUST mount above <App /> in the React tree so that
 * useSimulationSelector / useSimulationLoop work correctly at all call
 * sites (including the top of App's function body).
 *
 * Previously the loop was created inside App via a useRef + useEffect,
 * and the SimulationLoopProvider was placed inside App's JSX return.
 * That meant any hook call at the top of App that called
 * useSimulationLoop() crashed because the provider wasn't in the tree yet.
 *
 * The bootstrapper pattern:
 *   1. main.tsx renders <AppBootstrapper /> in place of <App />
 *   2. AppBootstrapper creates a SimulationLoop via useEffect + useState
 *   3. AppBootstrapper wraps <App /> in <SimulationLoopProvider>
 *   4. App reads the loop from context via useSimulationLoop() — works
 *      because the provider is above App in the tree
 *
 * Note: We use useState (not useRef) for the loop so that setLoop()
 * triggers a re-render after the effect creates, seeds, and starts the
 * loop. useRef mutations are silent — they don't schedule a re-render,
 * which would leave the loading placeholder on screen forever.
 */

import React, { useEffect, useState } from "react";
import { SimulationLoop } from "@sim/engine/simulationLoop";
import { emptyWorldState } from "@sim/engine/reducer";
import { getCurrentTick } from "@sim/events/appendEvent";
import { SimulationLoopProvider } from "../hooks/SimulationLoopContext";
import App from "../App";

export default function AppBootstrapper() {
  const [loop, setLoop] = useState<SimulationLoop | null>(null);

  // Initialise exactly once. The useState setter triggers a re-render
  // after the loop is created, seeded, and started, so App mounts with
  // a valid SimulationLoop in context.
  useEffect(() => {
    const l = new SimulationLoop({
      initial: emptyWorldState(),
      intervalMs: 1000,
      onTick: () => {
        /* heartbeat only */
      },
    });

    // Seed the event log with a ScenarioLoaded marker.
    l.dispatch({
      type: "ScenarioLoaded",
      ts: getCurrentTick(),
      scenario: "1985_8bit",
    });

    l.start();
    setLoop(l);
    return () => {
      l.stop();
    };
  }, []);

  if (!loop) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#09090b] text-[#a1a1aa] font-mono text-xs animate-pulse">
        INITIALISING SIMULATION LOOP...
      </div>
    );
  }

  return (
    <SimulationLoopProvider loop={loop}>
      <App />
    </SimulationLoopProvider>
  );
}
