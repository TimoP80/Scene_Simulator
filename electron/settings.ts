/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings store. Plain JSON file at `app.getPath('userData')/settings.json`.
 *
 * We keep this intentionally simple: the entire settings surface is
 * currently one key (`geminiApiKey`). The schema is versioned so future
 * fields can land without colliding. Sync reads are fine because the
 * file is tiny; writes go through a temp-file + rename so a crash mid-
 * write cannot produce a half-truncated settings.json that bricks
 * future launches.
 *
 * SECURITY:
 *   The settings file is written with default permissions inside the
 *   user's profile, which on Windows means their User hive - good
 *   enough for a hardcoded-scope API key. If we ever store a refresh
 *   token or anything more sensitive, swap this for `electron.safeStorage`
 *   encryption.
 */

import { app } from 'electron';
import { existsSync, readFileSync, renameSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';

const SCHEMA_VERSION = 1 as const;

type SettingsFile = {
  schemaVersion: typeof SCHEMA_VERSION;
  geminiApiKey: string | null;
};

const DEFAULTS: SettingsFile = {
  schemaVersion: SCHEMA_VERSION,
  geminiApiKey: null,
};

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function readSettings(): SettingsFile {
  const file = settingsPath();
  if (!existsSync(file)) return { ...DEFAULTS };
  try {
    const raw = readFileSync(file, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SettingsFile>;
    if (parsed && typeof parsed === 'object' && parsed.schemaVersion === SCHEMA_VERSION) {
      return {
        schemaVersion: SCHEMA_VERSION,
        geminiApiKey:
          typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : null,
      };
    }
  } catch {
    // Corrupt / unreadable. Fall through to defaults; we'll overwrite
    // on the next write.
  }
  return { ...DEFAULTS };
}

function writeSettings(next: SettingsFile): void {
  const file = settingsPath();
  // Ensure parent dir exists; first-launch on a clean profile misses it.
  mkdirSync(dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  writeFileSync(tmp, JSON.stringify(next, null, 2), 'utf8');
  // Atomic on the same volume, which userData always is. If a previous
  // run died mid-rename, the worst case is a leftover .tmp we will
  // overwrite here.
  renameSync(tmp, file);
}

export const settingsStore = {
  hasGeminiKey(): boolean {
    return readSettings().geminiApiKey !== null;
  },
  getGeminiKey(): string | null {
    return readSettings().geminiApiKey;
  },
  setGeminiKey(key: string): void {
    const current = readSettings();
    writeSettings({ ...current, geminiApiKey: key });
  },
  clearGeminiKey(): void {
    const current = readSettings();
    writeSettings({ ...current, geminiApiKey: null });
  },
};
