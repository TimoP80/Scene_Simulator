/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tick scheduler \u2014 wraps the pure reducer in a real-time loop.
 *
 * Three-layer architecture: this is /sim territory. It must NOT import anything
 * from /apps or call React/LLM APIs. The UI layer reads state via projections.
 *
 * StrictMode defense: `tickOnce` cannot double-fire inside an interval because
 * the `firedThisInterval` reset runs on the queueMicrotask boundary, mirroring
 * the defensive pattern that fixed the original compile-button bug.
 */

import { reduce } from "./reducer";
import type { WorldState } from "./reducer";
import {
  appendEvent,
  emit,
  setCurrentTick,
  getCurrentTick,
  type EventDraft,
} from "../events/appendEvent";

export interface SimulationLoopOptions {
  initial: WorldState;
  /** Wall-clock interval between ticks in ms. */
  intervalMs?: number;
  onTick: (state: WorldState) => void;
}

export class SimulationLoop {
  private state: WorldState;
  private readonly intervalMs: number;
  private readonly onTick: (s: WorldState) => void;
  private intervalId: number | undefined;
  private ticking = false;
  /** StrictMode / double-interval defense. */
  private firedThisInterval = false;

  constructor(opts: SimulationLoopOptions) {
    this.state = opts.initial;
    this.intervalMs = opts.intervalMs ?? 1000;
    this.onTick = opts.onTick;
    setCurrentTick(this.state.calendar.year * 12 + this.state.calendar.month);
  }

  start(): void {
    if (this.intervalId !== undefined) return;
    this.intervalId = setInterval(() => this.tickOnce(), this.intervalMs) as unknown as number;
  }

  stop(): void {
    if (this.intervalId === undefined) return;
    clearInterval(this.intervalId);
    this.intervalId = undefined;
  }

  /**
   * Dispatch a draft event through BOTH appendEvent (eventStore append) AND
   * the reducer, so projections and state stay in sync.
   *
   * Earlier versions had two incompatible signatures:
   *   1. `dispatch<E extends SimEvent>(...)` — incompatible once appendEvent's
   *      own generic was narrowed to `SimEvent["type"]`.
   *   2. `dispatch(draft: Omit<SimEvent, "id" | "reducedAt">)` — naive `Omit`
   *      flattens the discriminated union into an intersection-of-required-
   *      fields that no literal can satisfy (TS2345).
   *
   * We now expose the distributive EventDraft type from appendEvent, so both
   * sides use the SAME distributive shape. Cross-file inference works.
   */
  dispatch(draft: EventDraft): WorldState {
    const evt = appendEvent(draft);
    this.state = reduce(this.state, evt);
    this.onTick(this.state);
    return this.state;
  }

  snapshot(): WorldState {
    return this.state;
  }

  /** Advance the calendar one month, emitting the canonical event. */
  advanceMonth(): WorldState {
    const prevY = this.state.calendar.year;
    const prevM = this.state.calendar.month;
    let nextM = prevM + 1;
    let nextY = prevY;
    if (nextM > 12) {
      nextM = 1;
      nextY += 1;
    }
    const evt = emit.monthAdvanced(prevY, prevM, nextY, nextM);
    setCurrentTick(nextY * 12 + nextM);
    this.state = reduce(this.state, evt);
    this.onTick(this.state);
    return this.state;
  }

  private tickOnce(): void {
    if (this.ticking || this.firedThisInterval) return;
    this.ticking = true;
    this.firedThisInterval = true;
    try {
      // Passive heartbeat \u2014 no event emission. The reducer is the source of
      // truth; emitting a MoneyChanged{delta:0} just to prove the loop is
      // alive pollutes the event log and confuses the replay debugger.
      void getCurrentTick();
      this.onTick(this.state);
    } finally {
      queueMicrotask(() => {
        this.firedThisInterval = false;
        this.ticking = false;
      });
    }
  }
}
