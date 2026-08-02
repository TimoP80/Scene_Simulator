/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * usePartygoerSimulation — React hook that drives the living demoparty
 * social simulation for a single PartyEvent.
 *
 * State:
 *   - crowd            — generated partygoers (deterministic per party)
 *   - relationships    — per-partygoer relationship with the player
 *   - events           — active world events (compo started, fire alarm...)
 *   - ambientChat      — rolling ambient chatter log
 *   - tick             — internal sim tick (advances every second)
 *   - hour/day         — simulated party clock (day advances hourly)
 *
 * Actions:
 *   - talk            — produce a DialogueLine for a partygoer
 *   - reply           — register the player's side + evolve relationship
 *   - triggerEvent    — inject a world event (bias dialogue)
 *   - advanceClock    — tick the sim (ambient chatter, mood decay, drift)
 *   - moveTo          — player-selected location filter
 */

import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import type {
  Partygoer,
  PartygoerEvent,
  PartygoerEventType,
  PartygoerRelationship,
  PartyPhase,
  PartyLocationId,
  DialogueLine,
  AmbientChatter,
} from "@packages/types";
import {
  generateCrowd,
  createRelationship,
  generateDialogue,
  generateOpener,
  pickAmbientChatter,
  updateRelationship,
  applyPartygoerEvent,
  advancePartygoerMood,
  deltaForTopic,
  partyPhaseForStep,
  reputationTierFor,
  activeEventsFor,
} from "@sim/domain/partygoers";

export interface PartygoerSimState {
  partyId: string;
  partyName: string;
  year: number;
  phase: PartyPhase;
  /** Party day (1-based) + hour (0-23). */
  day: number;
  hour: number;
  tick: number;
  crowd: Partygoer[];
  relationships: Record<string, PartygoerRelationship>;
  events: PartygoerEvent[];
  ambientChat: AmbientChatter[];
  /** Which location the player is currently "at" (filter). */
  playerLocation: PartyLocationId;
  /** Last dialogue line returned to the player. */
  lastLine: DialogueLine | null;
  /** Player context mirrored for the UI/AI prompt. */
  playerHandle: string;
  playerReputation: number;
}

export interface PartygoerSimActions {
  talk: (partygoerId: string) => DialogueLine;
  /**
   * Register the player's reply to the line currently DISPLAYED (which may
   * be an AI reply or a veteran-knowledge fact, not the engine's last
   * `talk()` line). The topic drives the relationship delta.
   */
  reply: (partygoerId: string, topic: string) => PartygoerRelationship;
  triggerEvent: (type: PartygoerEventType, label: string) => void;
  advanceClock: () => void;
  moveTo: (location: PartyLocationId) => void;
}

export interface PartygoerSimConfig {
  partyId: string;
  partyName: string;
  year: number;
  playerHandle: string;
  playerGroupName: string;
  playerReputation: number;
  partyStep: number;
  rivalGroupNames: string[];
  /** Number of partygoers to generate (scale with attendance). */
  crowdSize?: number;
  /** Optional hook id so multiple parties get distinct crowds. */
  instanceKey?: string;
  /** Gate the live ticker — disable when the party floor overlay is closed. */
  enabled?: boolean;
}

/** Sim tick cadence: one tick per second (each tick advances one party hour). */
const TICK_MS = 1000;

export function usePartygoerSimulation(config: PartygoerSimConfig) {
  const {
    partyId,
    partyName,
    year,
    playerHandle,
    playerGroupName,
    playerReputation,
    partyStep,
    rivalGroupNames,
    crowdSize = 36,
    instanceKey = "default",
    enabled = true,
  } = config;

  // Deterministic base crowd — regenerated only when party/year/key change.
  const baseCrowd = useMemo(
    () => generateCrowd(`${partyId}-${instanceKey}`, year, crowdSize),
    [partyId, instanceKey, year, crowdSize],
  );

  // Living-mood overrides — sleep decays at night and people drift between
  // locations. Keyed by partygoer id so the deterministic base crowd stays
  // immutable while the live crowd gains a mood layer each tick.
  const [moods, setMoods] = useState<Record<string, { sleep: number; location: PartyLocationId }>>(() => {
    const map: Record<string, { sleep: number; location: PartyLocationId }> = {};
    for (const pg of baseCrowd) map[pg.id] = { sleep: pg.sleep, location: pg.location };
    return map;
  });

  // Live crowd = base attributes + current mood (sleep/location).
  const crowd = useMemo(
    () => baseCrowd.map((pg) => ({ ...pg, ...moods[pg.id] })),
    [baseCrowd, moods],
  );

  const [relationships, setRelationships] = useState<Record<string, PartygoerRelationship>>(() => {
    const map: Record<string, PartygoerRelationship> = {};
    for (const pg of baseCrowd) map[pg.id] = createRelationship();
    return map;
  });

  // Reset moods + relationships + party clock when the party changes (new
  // party / year) so stale entries keyed to the old party's ids don't linger
  // and the new party starts at a fresh evening on day 1.
  useEffect(() => {
    const map: Record<string, PartygoerRelationship> = {};
    const moodMap: Record<string, { sleep: number; location: PartyLocationId }> = {};
    for (const pg of baseCrowd) {
      map[pg.id] = createRelationship();
      moodMap[pg.id] = { sleep: pg.sleep, location: pg.location };
    }
    setRelationships(map);
    setMoods(moodMap);
    setEvents([]);
    setAmbientChat([]);
    setLastLine(null);
    setTick(0);
    setHour(18);
    setDay(1);
  }, [baseCrowd]);

  const [events, setEvents] = useState<PartygoerEvent[]>([]);
  const [ambientChat, setAmbientChat] = useState<AmbientChatter[]>([]);
  const [tick, setTick] = useState(0);
  const [day, setDay] = useState(1);
  const [hour, setHour] = useState(18);
  const [playerLocation, setPlayerLocation] = useState<PartyLocationId>("compo_hall");
  const [lastLine, setLastLine] = useState<DialogueLine | null>(null);

  const stateRef = useRef({ tick, hour, day, relationships, events, moods });
  stateRef.current = { tick, hour, day, relationships, events, moods };

  const phase = partyPhaseForStep(partyStep);

  const baseContext = useCallback(() => {
    const s = stateRef.current;
    return {
      playerHandle,
      playerGroupName,
      playerReputation,
      rivalGroupNames,
      partyName,
      year,
      phase,
      hour: s.hour,
      day: s.day,
      events: activeEventsFor(s.events, s.tick),
      location: playerLocation,
    };
  }, [playerHandle, playerGroupName, playerReputation, rivalGroupNames, partyName, year, phase, playerLocation]);

  /** Produce a dialogue line for a partygoer (opener on first meeting). */
  const talk = useCallback(
    (partygoerId: string): DialogueLine => {
      const s = stateRef.current;
      const pg = baseCrowd.find((p) => p.id === partygoerId);
      if (!pg) throw new Error(`Unknown partygoer ${partygoerId}`);
      const rel = s.relationships[partygoerId] ?? createRelationship();
      const mood = s.moods[partygoerId];
      const livePg = mood ? { ...pg, ...mood } : pg;
      const ctx = {
        ...baseContext(),
        partygoer: livePg,
        // The partygoer's OWN location drives their dialogue + rng seed,
        // not the player's browsing location.
        location: livePg.location,
        relationship: rel,
      };
      const line = rel.meetings === 0 ? generateOpener(ctx) : generateDialogue(ctx, s.tick);
      setLastLine(line);
      return line;
    },
    [baseContext, baseCrowd],
  );

  /** Player replies; evolves the relationship (friendship/respect/rivalry). */
  const reply = useCallback(
    (partygoerId: string, topic: string): PartygoerRelationship => {
      const s = stateRef.current;
      const pg = baseCrowd.find((p) => p.id === partygoerId);
      const current = s.relationships[partygoerId] ?? createRelationship();
      const personality = pg?.personality ?? "friendly";
      const next = updateRelationship(current, topic, deltaForTopic(topic, personality));
      setRelationships((prev) => ({ ...prev, [partygoerId]: next }));
      return next;
    },
    [baseCrowd],
  );

  /** Inject a world event — biases all dialogue until it expires. */
  const triggerEvent = useCallback((type: PartygoerEventType, label: string) => {
    const s = stateRef.current;
    setEvents((prev) => applyPartygoerEvent(prev, type, label, s.tick));
  }, []);

  /** Advance one sim tick: ambient chatter, mood decay, location drift. */
  const advanceClock = useCallback(() => {
    const s = stateRef.current;
    const nextTick = s.tick + 1;
    const nextHour = (s.hour + 1) % 24;
    const nextDay = nextHour === 0 ? s.day + 1 : s.day;
    setTick(nextTick);
    setHour(nextHour);
    setDay(nextDay);

    // Living mood: sleep decays at night, partygoers drift locations.
    setMoods((prev) => {
      const next: Record<string, { sleep: number; location: PartyLocationId }> = {};
      for (const pg of baseCrowd) {
        const mood = advancePartygoerMood({ ...pg, ...prev[pg.id] }, nextHour, nextTick);
        next[pg.id] = mood;
      }
      return next;
    });

    // 60% chance per tick of ambient chatter from the player's area.
    if (Math.random() < 0.6) {
      const live = baseCrowd.map((pg) => ({ ...pg, ...s.moods[pg.id] }));
      const pg = live.length > 0 ? live[Math.floor(Math.random() * live.length)] : undefined;
      const chatter = pg
        ? pickAmbientChatter(live, pg.location, nextTick)
        : { partygoerId: "hall", handle: "A scener", text: "...", location: "compo_hall", tick: nextTick };
      setAmbientChat((prev) => [...prev.slice(-60), chatter]);
    }
  }, [baseCrowd]);

  const moveTo = useCallback((location: PartyLocationId) => {
    setPlayerLocation(location);
  }, []);

  // Auto-tick while the hook is alive AND the party floor is open.
  // Gated on `enabled` so a closed overlay doesn't spin a background
  // timer forever (the crowd itself is cheap to keep in memory).
  useEffect(() => {
    if (!enabled) return;
    const iv = setInterval(advanceClock, TICK_MS);
    return () => clearInterval(iv);
  }, [enabled, advanceClock]);

  const state: PartygoerSimState = {
    partyId,
    partyName,
    year,
    phase,
    day,
    hour,
    tick,
    crowd,
    relationships,
    events: activeEventsFor(events, tick),
    ambientChat,
    playerLocation,
    lastLine,
    playerHandle,
    playerReputation,
  };

  const actions: PartygoerSimActions = {
    talk,
    reply,
    triggerEvent,
    advanceClock,
    moveTo,
  };

  return { state, actions, playerTier: reputationTierFor(playerReputation) };
}
