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

import { reduce, reduceAll, emptyWorldState } from "./reducer";
import type { WorldState } from "./reducer";
import type { SimEvent } from "../events/eventTypes";
import {
  appendEvent,
  emit,
  setCurrentTick,
  getCurrentTick,
  type EventDraft,
} from "../events/appendEvent";
import type { RivalActivityEntry, SceneMagazine } from "@packages/types";
import { eventStore } from "../events/eventStore";
import { getYearUnlockedTechIds } from "../data/yearUnlocks";
import { TECHNOLOGY_TREE } from "../data/technologyTree";
import { simulateRivalGroups, bootstrapRivalGroups } from "../domain/rivalGroups";

export interface SimulationLoopOptions {
  initial: WorldState;
  /** Wall-clock interval between ticks in ms. */
  intervalMs?: number;
  onTick: (state: WorldState) => void;
}

// ─── Scene news dispatch from rival activity ─────────────────────────

/**
 * Thresholds for what counts as "newsworthy" from rival activity.
 * Productions scoring ≥ this value get a magazine article.
 */
const HIGH_SCORE_THRESHOLD = 70;

/**
 * Scan the rival activity log for dramatic events and return
 * SceneMagazine articles to publish as news.
 *
 * Only the most notable events are surfaced: disbands, splits,
 * group returns, and high-scoring releases. Routine project starts
 * and morale changes are filtered out to avoid news-feed spam.
 */
function dispatchRivalSceneNews(
  activityLog: RivalActivityEntry[],
  year: number,
  month: number,
): SceneMagazine[] {
  const articles: SceneMagazine[] = [];
  const seenDisbands = new Set<string>();
  const seenReturns = new Set<string>();
  const seenReleases = new Set<string>();
  const seenSplits = new Set<string>();

  // Process entries in reverse (most recent first) to catch the current
  // month's events. The activity log is sorted newest-first.
  for (const entry of activityLog) {
    if (entry.year !== year || entry.month !== month) continue;

    switch (entry.type) {
      case "disbanded": {
        if (seenDisbands.has(entry.groupId)) continue;
        seenDisbands.add(entry.groupId);
        articles.push({
          id: `scene_news_disband_${entry.groupId}_${year}_${month}`,
          title: "SCENE WIRE",
          year,
          month,
          headline: `${entry.groupName.toUpperCase()} DISBANDS!`,
          body: `After months of inactivity and declining morale, ${entry.groupName} has officially disbanded. Members have scattered to other groups or left the scene entirely. The demoscene loses one of its groups.`,
          type: "scandal",
        });
        break;
      }
      case "returned": {
        if (seenReturns.has(entry.groupId)) continue;
        seenReturns.add(entry.groupId);
        articles.push({
          id: `scene_news_return_${entry.groupId}_${year}_${month}`,
          title: "SCENE WIRE",
          year,
          month,
          headline: `${entry.groupName.toUpperCase()} RETURNS TO ACTIVITY!`,
          body: `After a lengthy hiatus, ${entry.groupName} is back in the scene and working on new material.`,
          type: "editorial",
        });
        break;
      }
      case "released_production": {
        if (seenReleases.has(entry.groupId + "_" + (entry.productionName ?? ""))) continue;
        seenReleases.add(entry.groupId + "_" + (entry.productionName ?? ""));

        // Only surface high-scoring releases as news
        const scoreMatch = entry.description.match(/score (\d+)/);
        const score = scoreMatch ? parseInt(scoreMatch[1]!, 10) : 0;
        if (score < HIGH_SCORE_THRESHOLD) continue;

        const prodName = entry.productionName ?? "NEW PRODUCTION";
        articles.push({
          id: `scene_news_release_${entry.groupId}_${year}_${month}_${Math.abs(score)}`,
          title: "RELEASE ROUNDUP",
          year,
          month,
          headline: `${entry.groupName.toUpperCase()} RELEASES "${prodName.toUpperCase()}" — SCORED ${score}/100!`,
          body: `${entry.groupName} has released "${prodName}", scoring an impressive ${score}/100 from scene judges. This release is generating considerable buzz on the BBS boards.`,
          type: "review",
        });
        break;
      }
      case "member_left": {
        if (seenSplits.has(entry.groupId)) continue;
        seenSplits.add(entry.groupId);

        // Extract new group name from the description
        const splitMatch = entry.description.match(/to form (.+)$/);
        const newGroup = splitMatch ? splitMatch[1]! : "a new group";
        articles.push({
          id: `scene_news_split_${entry.groupId}_${year}_${month}`,
          title: "SCENE WIRE",
          year,
          month,
          headline: `${entry.groupName.toUpperCase()} SPLITS!`,
          body: `Internal conflicts have caused a split in ${entry.groupName}! Members have left to form ${newGroup}. The demoscene grapevine is buzzing with speculation about what caused the division.`,
          type: "scandal",
        });
        break;
      }
      default:
        break;
    }
  }

  return articles;
}


export class SimulationLoop {
  private state: WorldState;
  private readonly intervalMs: number;
  private readonly onTick: (s: WorldState) => void;
  private intervalId: number | undefined;
  private ticking = false;
  /** StrictMode / double-interval defense. */
  private firedThisInterval = false;
  /** External listeners notified on every state change. */
  private listeners = new Set<() => void>();

  constructor(opts: SimulationLoopOptions) {
    this.state = opts.initial;
    this.intervalMs = opts.intervalMs ?? 1000;
    this.onTick = opts.onTick;
    setCurrentTick(this.state.calendar.year * 12 + this.state.calendar.month);

    // Seed rival group states from the INITIAL_GROUPS data
    if (Object.keys(this.state.rivals.groups).length === 0) {
      this.state = {
        ...this.state,
        rivals: {
          ...this.state.rivals,
          groups: bootstrapRivalGroups(),
        },
      };
    }
  }

  /**
   * Subscribe to state changes. Returns an unsubscribe function.
   * Called on every dispatch and advanceMonth — NOT on passive tickOnce.
   * Used by useSyncExternalStore in the UI layer.
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Notify all external listeners that state changed. */
  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
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
    this.notify();
    return this.state;
  }

  snapshot(): WorldState {
    return this.state;
  }

  /**
   * Return the current snapshot (same object ref until state changes).
   * Safe to pass to useSyncExternalStore's getSnapshot.
   */
  getState(): WorldState {
    return this.state;
  }

  /**
   * Dev-only: replace the entire event log and re-derive state from scratch.
   * Used by the EventInspectorPanel's "Jump to this state" feature.
   *
   * After calling this, the simulation loop and all projections see the
   * state as it was at the instant of the last event in the provided array.
   * All subsequent events are discarded.
   */
  resetTo(events: readonly SimEvent[]): void {
    const prefix = events as SimEvent[];
    eventStore.__resetWith(prefix);
    this.state = reduceAll(emptyWorldState(), prefix);
    setCurrentTick(this.state.calendar.year * 12 + this.state.calendar.month);
    this.onTick(this.state);
    this.notify();
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

    // ---- Auto-unlock techs when a year boundary is crossed (Dec → Jan) ----
    if (prevY !== nextY) {
      const unlockedSet = new Set(this.state.player.unlockedTechs);
      const yearAutoUnlocks = getYearUnlockedTechIds(nextY);

      for (const techId of yearAutoUnlocks) {
        if (unlockedSet.has(techId)) continue;
        // Only auto-unlock techs that actually exist in the tree
        const tech = TECHNOLOGY_TREE.find((t) => t.id === techId);
        if (!tech) continue;
        // Dispatch TechResearched for each eligible tech
        const techEvt = appendEvent({
          type: "TechResearched",
          ts: getCurrentTick(),
          techId,
        });
        this.state = reduce(this.state, techEvt);
        unlockedSet.add(techId);
      }
    }

    // ---- Living rival group simulation (v0.6.1) ----
    // Runs every month regardless of year boundary.
    const rivalResult = simulateRivalGroups(
      this.state.rivals.groups,
      nextY,
      nextM,
    );

    // Dispatch rival events through the event pipeline
    for (const rivalEvt of rivalResult.events) {
      const stamped = appendEvent(rivalEvt as import("../events/appendEvent").EventDraft);
      this.state = reduce(this.state, stamped);
    }

    // Merge updated group states directly into WorldState.
    // CRITICAL: spread existing groups FIRST (including any new groups
    // the reducer added, e.g. from RivalGroupFormed events), then
    // overwrite with the domain's updates. Using `rivalResult.updatedGroups`
    // alone would discard groups created by events dispatched above.
    this.state = {
      ...this.state,
      rivals: {
        ...this.state.rivals,
        groups: { ...this.state.rivals.groups, ...rivalResult.updatedGroups },
      },
    };

    // ---- Dispatch scene news from dramatic rival events ----
    // After the rival tick, scan the activity log for the most dramatic
    // entries (disbands, splits, returns, high-scoring releases) and
    // publish them as magazine articles so the player sees them in the
    // News tab without having to open the History view.
    // Merge domain activity log (splits, returns) with reducer entries
    // (disbands, formations) so both sources are covered. Filter the
    // state log to current month to avoid stale duplicates — the domain
    // log already only contains this month's entries by construction.
    const combinedLog = [
      ...rivalResult.activityLog,
      ...this.state.rivals.activityLog.filter(
        (e) => e.year === nextY && e.month === nextM,
      ),
    ];
    const newsArticles = dispatchRivalSceneNews(combinedLog, nextY, nextM);
    for (const article of newsArticles) {
      const stamped = appendEvent({
        type: "NewsArticlePublished",
        ts: getCurrentTick(),
        article,
      });
      this.state = reduce(this.state, stamped);
    }

    this.onTick(this.state);
    this.notify();
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
