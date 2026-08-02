/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * useKeyboardShortcuts — register an entire keyboard-shortcut map with a
 * single window keydown listener.
 *
 * Before this hook, every global shortcut in App.tsx needed its own
 * useEffect + addEventListener/removeEventListener pair (~12 lines each).
 * Adding a shortcut is now a one-line entry in a map:
 *
 *   useKeyboardShortcuts({
 *     "l": () => modal.openLogoGen(),                 // plain key
 *     "mod+s": () => modal.openSettings(),            // Ctrl or Cmd + S
 *     "mod+shift+d": (e) => { e.preventDefault(); ... }, // chord
 *     "escape": () => modal.close(),                  // named key
 *     " ": () => togglePlay(),                        // space bar
 *   }, { enabled: !showMainMenu });
 *
 * Shortcut syntax (case-insensitive, modifiers joined with "+"):
 *   "mod"     → Ctrl OR Meta (platform-agnostic)
 *   "ctrl"    → alias for mod
 *   "meta"    → alias for mod
 *   "shift"   → Shift
 *   "alt"     → Alt / Option
 *   "escape"  → Escape key (e.key === "Escape")
 *   "enter"   → Enter / Return
 *   " "       → space bar
 *
 * Semantics:
 *   - Bare letter keys ("l") match BOTH "l" and "L" (Shift/CapsLock),
 *     mirroring the game's original per-key handlers that checked both
 *     cases, while an explicit "shift+l" shortcut still requires Shift.
 *   - Chords are exact: pressing an undeclared modifier prevents a
 *     match, so "mod+shift+d" never fires a plain "d" handler.
 *   - Chords are evaluated before bare keys, so a chord always wins
 *     over a colliding plain-letter shortcut.
 *   - By default nothing fires while the player types in an INPUT /
 *     TEXTAREA / SELECT / contentEditable (matching the old handlers'
 *     typing guards). Override globally via options.ignoreWhenTyping
 *     or per-entry via { handler, ignoreWhenTyping }.
 *   - The window listener is registered once and reads the latest
 *     shortcut map through a ref, so handlers can close over fresh
 *     state without re-registering on every render.
 */

import { useEffect, useRef } from "react";

export type ShortcutHandler = (event: KeyboardEvent) => void;

export interface ShortcutDef {
  handler: ShortcutHandler;
  /** Skip when the target is an input field. Defaults to the global option. */
  ignoreWhenTyping?: boolean;
}

export type ShortcutMap = Record<string, ShortcutHandler | ShortcutDef>;

export interface KeyboardShortcutsOptions {
  /** When false, no shortcuts fire (listener not attached). Default true. */
  enabled?: boolean;
  /** Default typing guard for all entries. Default true. */
  ignoreWhenTyping?: boolean;
}

export interface ParsedShortcut {
  key: string;
  mod: boolean;
  shift: boolean;
  alt: boolean;
}

const MOD_ALIASES = new Set([
  "mod",
  "ctrl",
  "control",
  "meta",
  "cmd",
  "command",
  "win",
]);

const NAMED_KEYS: Record<string, string> = {
  space: " ",
  spacebar: " ",
  esc: "escape",
  escape: "escape",
  return: "enter",
  enter: "enter",
};

/** Normalize a KeyboardEvent.key value / shortcut token to a canonical form. */
export function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  return NAMED_KEYS[lower] ?? lower;
}

/**
 * Module-level parse cache. Specs are few and stable ("l", "mod+shift+d",
 * ...), so parsing a spec is effectively O(1) after first use — keeps the
 * per-keydown path free of string splitting.
 */
const parseCache = new Map<string, ParsedShortcut>();

/** Parse a shortcut spec like "mod+shift+d" into a matcher description. */
export function parseShortcut(spec: string): ParsedShortcut {
  const cached = parseCache.get(spec);
  if (cached) return cached;
  if (spec === "") {
    // An empty spec can never match a real keydown. Note this must be
    // the RAW string, not `spec.trim()` — the " " spec (space bar)
    // trims to "" but is a legitimate shortcut key.
    const never: ParsedShortcut = { key: "unknown", mod: false, shift: false, alt: false };
    parseCache.set(spec, never);
    return never;
  }
  const parts = spec.split("+").map((p) => p.trim().toLowerCase());
  let mod = false;
  let shift = false;
  let alt = false;
  const keys: string[] = [];
  for (const part of parts) {
    if (part === "") {
      // The " " spec trims to "" — preserve it as the space-bar key.
      keys.push(" ");
    } else if (MOD_ALIASES.has(part)) {
      mod = true;
    } else if (part === "shift") {
      shift = true;
    } else if (part === "alt" || part === "option") {
      alt = true;
    } else {
      keys.push(part);
    }
  }
  const parsed: ParsedShortcut = {
    key: normalizeKey(keys.join("+") || "unknown"),
    mod,
    shift,
    alt,
  };
  parseCache.set(spec, parsed);
  return parsed;
}

/** Whether a keydown event satisfies a parsed shortcut spec. */
export function matchesShortcut(
  e: Pick<KeyboardEvent, "key" | "ctrlKey" | "metaKey" | "shiftKey" | "altKey">,
  parsed: ParsedShortcut,
): boolean {
  if (normalizeKey(e.key) !== parsed.key) return false;
  const modPressed = e.ctrlKey || e.metaKey;

  // Bare letter keys ("l") accept the uppercase form ("L" — Shift or
  // CapsLock held). This preserves the original per-key handlers that
  // checked both cases while keeping "shift+l" as a stricter option.
  const isBareLetter =
    /^[a-z]$/.test(parsed.key) && !parsed.mod && !parsed.shift && !parsed.alt;
  if (isBareLetter) {
    return !modPressed && !e.altKey;
  }
  if (parsed.mod !== modPressed) return false;
  if (parsed.shift !== e.shiftKey) return false;
  if (parsed.alt !== e.altKey) return false;
  return true;
}

export function useKeyboardShortcuts(
  shortcuts: ShortcutMap,
  options: KeyboardShortcutsOptions = {},
): void {
  const { enabled = true, ignoreWhenTyping = true } = options;

  // Always-fresh map via ref so the window listener is registered once
  // and never goes stale, even when handlers close over current state.
  const shortcutsRef = useRef<ShortcutMap>(shortcuts);
  shortcutsRef.current = shortcuts;

  useEffect(() => {
    if (!enabled) return;

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isTyping =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        target?.isContentEditable === true;

      const entries = Object.entries(shortcutsRef.current ?? {}) as Array<
        [string, ShortcutHandler | ShortcutDef]
      >;
      // Two passes: modifier chords first, then bare keys, so a chord
      // (e.g. "mod+shift+d") always wins over a colliding plain key
      // (e.g. "d") and the two never double-fire.
      for (const pass of [0, 1] as const) {
        for (const [spec, def] of entries) {
          const parsed = parseShortcut(spec);
          const isChord = parsed.mod || parsed.shift || parsed.alt;
          if (isChord !== (pass === 0)) continue;
          if (!matchesShortcut(e, parsed)) continue;

          const handler = typeof def === "function" ? def : def.handler;
          const entryIgnoreTyping =
            typeof def === "function"
              ? ignoreWhenTyping
              : (def.ignoreWhenTyping ?? ignoreWhenTyping);
          if (isTyping && entryIgnoreTyping) continue;

          handler(e);
          return; // first match wins — no double-firing
        }
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, ignoreWhenTyping]);
}

export default useKeyboardShortcuts;
