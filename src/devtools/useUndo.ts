/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useUndo — a minimal undo/redo hook for the EditorShell.
 *
 * Strategy: snapshot-based history scoped to the currently editing item.
 * Every successful change pushes a deep-cloned snapshot onto the past
 * stack and clears the future stack. Undo pops from past, pushes the
 * current onto future, and returns the popped snapshot. Redo is the
 * mirror.
 *
 * Why snapshot (not command):
 *   JSON trees with deeply nested arrays (BBSThread.messages, etc.) are
 *   hard to invert with a command pattern. A snapshot is a full deep
 *   clone — simple, correct, and the cost is acceptable for the few-KB
 *   objects we edit here.
 */

import { useCallback, useRef, useState } from "react";

export interface UndoState<T> {
  present: T;
  past: T[];
  future: T[];
  canUndo: boolean;
  canRedo: boolean;
  set: (next: T) => void;
  undo: () => void;
  redo: () => void;
  reset: (initial: T) => void;
}

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

export function useUndo<T>(initial: T): UndoState<T> {
  const [present, setPresent] = useState<T>(initial);
  const pastRef = useRef<T[]>([]);
  const futureRef = useRef<T[]>([]);
  // Version counter so the hook re-renders when past/future change
  // without us having to put them in useState.
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion((v) => v + 1), []);

  const set = useCallback(
    (next: T) => {
      pastRef.current.push(deepClone(present));
      // Cap history at 50 entries to avoid unbounded memory.
      if (pastRef.current.length > 50) {
        pastRef.current.shift();
      }
      futureRef.current = [];
      setPresent(next);
      bump();
    },
    [present, bump]
  );

  const undo = useCallback(() => {
    if (pastRef.current.length === 0) return;
    const previous = pastRef.current.pop()!;
    futureRef.current.push(deepClone(present));
    setPresent(previous);
    bump();
  }, [present, bump]);

  const redo = useCallback(() => {
    if (futureRef.current.length === 0) return;
    const next = futureRef.current.pop()!;
    pastRef.current.push(deepClone(present));
    setPresent(next);
    bump();
  }, [present, bump]);

  const reset = useCallback(
    (initial: T) => {
      pastRef.current = [];
      futureRef.current = [];
      setPresent(initial);
      bump();
    },
    [bump]
  );

  return {
    present,
    past: pastRef.current,
    future: futureRef.current,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    set,
    undo,
    redo,
    reset,
  };
}
