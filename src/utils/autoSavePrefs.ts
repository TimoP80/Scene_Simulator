/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Auto-save blueprint preferences — persisted in localStorage so the
 * setting survives browser reloads and Electron restarts. Separate from
 * Electron's settings.json (which holds the API key + music playlist)
 * because this is a renderer-only preference that doesn't need IPC.
 *
 * Storage layout:
 *   localStorage["demoscene_autosave_prefs"] = JSON.stringify({
 *     enabled: true,
 *     name: "⬡ Last Compiled",
 *   })
 */

const STORAGE_KEY = "demoscene_autosave_prefs";

interface AutoSavePrefs {
  /** Whether auto-saving a blueprint after compile is enabled. */
  enabled: boolean;
  /** The blueprint name to use when auto-saving. */
  name: string;
}

const DEFAULTS: AutoSavePrefs = {
  enabled: true,
  name: "⬡ Last Compiled",
};

function loadRaw(): AutoSavePrefs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      enabled:
        typeof parsed.enabled === "boolean" ? parsed.enabled : DEFAULTS.enabled,
      name:
        typeof parsed.name === "string" && parsed.name.trim()
          ? parsed.name.trim()
          : DEFAULTS.name,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

function persist(prefs: AutoSavePrefs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn("[autoSavePrefs] failed to persist:", e);
  }
}

/** Return the current auto-save preferences. */
export function getAutoSavePrefs(): AutoSavePrefs {
  return loadRaw();
}

/** Update one or both fields. Missing fields keep their current value. */
export function setAutoSavePrefs(partial: Partial<AutoSavePrefs>): AutoSavePrefs {
  const current = loadRaw();
  const next = { ...current, ...partial };
  // Never allow a blank name — fall back to the default.
  if (!next.name.trim()) next.name = DEFAULTS.name;
  persist(next);
  return next;
}

/** Convenience: true when auto-save is enabled. */
export function isAutoSaveEnabled(): boolean {
  return loadRaw().enabled;
}

/** Convenience: the current auto-save blueprint name. */
export function getAutoSaveName(): string {
  return loadRaw().name;
}
