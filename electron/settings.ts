/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Settings store. Plain JSON file at `app.getPath('userData')/settings.json`.
 *
 * We keep this intentionally simple: the settings surface is currently
 * the Gemini API key plus the tracker-music library. The schema is
 * versioned so future fields can land without colliding. Sync reads
 * are fine because the file is tiny; writes go through a temp-file +
 * rename so a crash mid-write cannot produce a half-truncated
 * settings.json that bricks future launches.
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

const SCHEMA_VERSION = 2 as const;

type MusicPlaylistEntry = {
  /** Stable name on disk (`userData/music/<sha256>.<ext>`). */
  storedName: string;
  /** User-friendly title (filename minus extension). */
  displayName: string;
  /** Short uppercase format label: MOD / XM / IT / S3M. */
  format: 'MOD' | 'XM' | 'IT' | 'S3M' | 'OTHER';
  /** File size in bytes (post-import). */
  size: number;
};

type MusicSettings = {
  /** Lightweight metadata for every imported tracker module. */
  playlist: MusicPlaylistEntry[];
};

type SettingsFile = {
  schemaVersion: typeof SCHEMA_VERSION;
  geminiApiKey: string | null;
  music: MusicSettings;
};

const DEFAULTS: SettingsFile = {
  schemaVersion: SCHEMA_VERSION,
  geminiApiKey: null,
  music: {
    playlist: [],
  },
};

function settingsPath(): string {
  return join(app.getPath('userData'), 'settings.json');
}

function readSettings(): SettingsFile {
  const file = settingsPath();
  if (!existsSync(file)) return { ...DEFAULTS, music: { playlist: [] } };
  try {
    const raw = readFileSync(file, 'utf8');
    // Cast to a loose shape so TypeScript doesn't narrow schemaVersion
    // to the literal `2` (the current SCHEMA_VERSION) and then flag
    // the v1-migration check below as TS2367 ("types '2' and '1' have
    // no overlap"). We re-validate every field after the cast.
    const parsed = JSON.parse(raw) as {
      schemaVersion?: unknown;
      geminiApiKey?: unknown;
      music?: unknown;
    };
    if (parsed && typeof parsed === 'object' && parsed.schemaVersion === SCHEMA_VERSION) {
      return {
        schemaVersion: SCHEMA_VERSION,
        geminiApiKey:
          typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey : null,
        music: normaliseMusic(parsed.music),
      };
    }
    // v1 (no music block) — migrate by initialising an empty playlist.
    if (parsed && typeof parsed === 'object' && parsed.schemaVersion === 1) {
      return {
        schemaVersion: SCHEMA_VERSION,
        geminiApiKey:
          typeof (parsed as { geminiApiKey?: unknown }).geminiApiKey === 'string'
            ? ((parsed as { geminiApiKey: string }).geminiApiKey)
            : null,
        music: { playlist: [] },
      };
    }
  } catch {
    // Corrupt / unreadable. Fall through to defaults; we'll overwrite
    // on the next write.
  }
  return { ...DEFAULTS, music: { playlist: [] } };
}

function normaliseMusic(raw: unknown): MusicSettings {
  if (!raw || typeof raw !== 'object') return { playlist: [] };
  const obj = raw as { playlist?: unknown };
  if (!Array.isArray(obj.playlist)) return { playlist: [] };
  const out: MusicPlaylistEntry[] = [];
  for (const item of obj.playlist) {
    if (!item || typeof item !== 'object') continue;
    const e = item as Partial<MusicPlaylistEntry>;
    if (typeof e.storedName !== 'string' || !e.storedName) continue;
    if (typeof e.displayName !== 'string' || !e.displayName) continue;
    if (
      e.format !== 'MOD' &&
      e.format !== 'XM' &&
      e.format !== 'IT' &&
      e.format !== 'S3M' &&
      e.format !== 'OTHER'
    ) {
      continue;
    }
    out.push({
      storedName: e.storedName,
      displayName: e.displayName,
      format: e.format,
      size: typeof e.size === 'number' ? e.size : 0,
    });
  }
  return { playlist: out };
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
  getMusicPlaylist(): MusicPlaylistEntry[] {
    return readSettings().music.playlist;
  },
  setMusicPlaylist(playlist: MusicPlaylistEntry[]): void {
    const current = readSettings();
    writeSettings({ ...current, music: { playlist } });
  },
};
