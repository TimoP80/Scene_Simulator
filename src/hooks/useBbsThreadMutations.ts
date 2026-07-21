/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useBbsThreadMutations — consolidates the 6 setter callbacks that
 * BBSThreadView needs into a single object. This reduces the prop
 * surface from 6 individual `onSet*` props to 1 `mutations` prop
 * and provides ergonomic methods (adjustReputation, showNotification,
 * updateCharacter, etc.) that contain common clamping and auto-clear
 * logic that was previously duplicated inline.
 */

import { useMemo } from "react";
import type { BBSThread, Character } from "@packages/types";

// ─── Mutation interface ────────────────────────────────────────────

export interface BbsThreadMutations {
  /** Apply a mutator function to a single thread by ID. */
  mutateThread: (
    threadId: string,
    mutator: (t: BBSThread) => BBSThread,
  ) => void;
  /** Replace the entire threads array (functional update). */
  setThreads: (updater: (prev: BBSThread[]) => BBSThread[]) => void;
  /** Set the custom message text (direct or functional). */
  setCustomMessage: (value: string | ((prev: string) => string)) => void;
  /** Show a notification banner with auto-clear after 3 s. */
  showNotification: (msg: string) => void;
  /** Clear the notification banner immediately. */
  clearNotification: () => void;
  /** Clamp-adjusted reputation delta. Clamped to [0, 1000]. */
  adjustReputation: (delta: number) => void;
  /** Set reputation via functional updater. */
  setReputation: (updater: (prev: number) => number) => void;
  /** Add research points (non-negative). */
  addResearchPoints: (points: number) => void;
  /** Set research points via functional updater. */
  setResearchPoints: (updater: (prev: number) => number) => void;
  /** Apply a mutator function to a single character by ID. */
  mutateCharacter: (
    charId: string,
    mutator: (c: Character) => Character,
  ) => void;
}

// ─── Hook input interface ──────────────────────────────────────────

interface UseBbsThreadMutationsInput {
  setBbsThreads: (
    v: BBSThread[] | ((prev: any[]) => BBSThread[]),
  ) => void;
  setBbsCustomMessage: (
    v: string | ((prev: string) => string),
  ) => void;
  setBbsEffectNotification: (v: string | null) => void;
  setPlayerReputation: (
    v: number | ((prev: number) => number),
  ) => void;
  setResearchPoints: (
    v: number | ((prev: number) => number),
  ) => void;
  setCharacters: (
    v:
      | Record<string, Character>
      | ((prev: Record<string, Character>) => Record<string, Character>),
  ) => void;
}

// ─── Hook ──────────────────────────────────────────────────────────

export function useBbsThreadMutations(
  input: UseBbsThreadMutationsInput,
): BbsThreadMutations {
  const {
    setBbsThreads,
    setBbsCustomMessage,
    setBbsEffectNotification,
    setPlayerReputation,
    setResearchPoints,
    setCharacters,
  } = input;

  return useMemo<BbsThreadMutations>(
    () => ({
      // ── Thread mutations ──
      mutateThread(threadId, mutator) {
        setBbsThreads((prev) =>
          prev.map((t) => (t.id === threadId ? mutator(t) : t)),
        );
      },
      setThreads: setBbsThreads as BbsThreadMutations["setThreads"],

      // ── UI state ──
      setCustomMessage: setBbsCustomMessage,

      showNotification(msg) {
        setBbsEffectNotification(msg);
        setTimeout(() => setBbsEffectNotification(null), 3000);
      },
      clearNotification() {
        setBbsEffectNotification(null);
      },

      // ── Player resources ──
      adjustReputation(delta) {
        setPlayerReputation((prev) =>
          Math.min(Math.max(prev + delta, 0), 1000),
        );
      },
      setReputation: setPlayerReputation as BbsThreadMutations["setReputation"],

      addResearchPoints(points) {
        setResearchPoints((prev) => prev + points);
      },
      setResearchPoints:
        setResearchPoints as BbsThreadMutations["setResearchPoints"],

      // ── Character mutations ──
      mutateCharacter(charId, mutator) {
        setCharacters((prev) => ({
          ...prev,
          [charId]: mutator(prev[charId]),
        }));
      },
    }),
    [
      setBbsThreads,
      setBbsCustomMessage,
      setBbsEffectNotification,
      setPlayerReputation,
      setResearchPoints,
      setCharacters,
    ],
  );
}
