/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Append-only event log. The reducer in /sim/engine/reducer.ts produces events;
 * this store simply records them in order, plus a hook for projections to
 * subscribe to specific event types.
 *
 * Pure module \u2014 no React, no DOM, no side effects on import.
 */

import type { SimEvent } from "./eventTypes";

type Listener = (e: SimEvent) => void;

export class EventStore {
  private events: SimEvent[] = [];
  private listeners: Map<SimEvent["type"] | "*", Set<Listener>> = new Map();

  append(event: SimEvent): void {
    this.events.push(event);
    const typed = this.listeners.get(event.type);
    if (typed) {
      typed.forEach((l) => l(event));
    }
    const wild = this.listeners.get("*");
    if (wild) {
      wild.forEach((l) => l(event));
    }
  }

  all(): readonly SimEvent[] {
    return this.events;
  }

  since(tick: number): readonly SimEvent[] {
    return this.events.filter((e) => e.ts >= tick);
  }

  on(type: SimEvent["type"] | "*", listener: Listener): () => void {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set());
    this.listeners.get(type)!.add(listener);
    return () => {
      this.listeners.get(type)?.delete(listener);
    };
  }

  /** Test/replay only. Normal code paths MUST use append(). */
  __resetWith(events: SimEvent[]): void {
    this.events = [...events];
  }
}

/** Singleton used by the simulation loop. Projections read this same instance. */
export const eventStore = new EventStore();
