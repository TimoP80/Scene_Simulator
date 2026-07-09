/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Typed surface for the Electron IPC bridge. Mirrors what
 * `electron/preload.ts` exposes via `contextBridge.exposeInMainWorld`.
 *
 * The renderer's `window` is augmented with `electronAPI?: ElectronApi`
 * so any import can use `window.electronAPI?.getApiKey()` without
 * sprinkling `as any`. The `?.` is important: this same React tree
 * runs under plain Vite (no preload) during development and inside
 * any other host that does not expose the Electron IPC bridge, where
 * `window.electronAPI` is undefined.
 */

export type MusicFile = {
  /** Stable name on disk (`userData/music/<sha256>.<ext>`). */
  storedName: string;
  /** User-friendly title (filename minus extension). */
  displayName: string;
  /** Short uppercase format label: MOD / XM / IT / S3M. */
  format: 'MOD' | 'XM' | 'IT' | 'S3M' | 'OTHER';
  /** File size in bytes (post-import). */
  size: number;
};

export type ElectronApi = {
  hasApiKey: () => Promise<boolean>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (key: string) => Promise<boolean>;
  clearApiKey: () => Promise<boolean>;
  /** Music library ---------------------------------------------------- */
  importMusicFiles: () => Promise<MusicFile[]>;
  readMusicFile: (storedName: string) => Promise<Uint8Array>;
  deleteMusicFile: (storedName: string) => Promise<boolean>;
};

declare global {
  interface Window {
    electronAPI?: ElectronApi;
  }
}

/**
 * `true` when the page is running inside Electron (preload bridge
 * present). Use this to decide whether to render the API-key gate.
 */
export function isElectronHost(): boolean {
  return typeof window !== 'undefined' && Boolean(window.electronAPI);
}
