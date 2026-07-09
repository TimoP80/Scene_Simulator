/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Electron PRELOAD script. Runs in a separate JS context with access to
 * both the renderer's `window` and a subset of Node APIs - we deliberately
 * use the latter only to call `ipcRenderer.invoke`. The renderer never
 * receives any Node primitives directly.
 *
 * WHAT THIS FILE DOES:
 *   Bridges a tiny, typed object `window.electronAPI` into the renderer.
 *   Every method here is an async round-trip to the main process; the
 *   renderer never sees Node. If `contextBridge.exposeInMainWorld` were
 *   missing, the renderer would have no IPC path and the settings UX
 *   would fail silently.
 *
 * OUTPUT FORMAT:
 *   Bundled to CJS (`preload.cjs`) on purpose. Electron's `contextBridge`
 *   is measurably more reliable when the preload is CJS even when the
 *   host process is ESM.
 */

import { contextBridge, ipcRenderer } from 'electron';

type MusicFile = {
  storedName: string;
  displayName: string;
  format: 'MOD' | 'XM' | 'IT' | 'S3M' | 'OTHER';
  size: number;
};

// Note: the canonical MusicFile declaration lives in `src/electronApi.ts`.
// This local mirror only exists because the preload bundle is loaded
// outside the renderer's TS scope and needs an own type to typecheck.

// Narrowly-typed surface. Any method added here MUST also be declared
// in `src/electronApi.ts` so the renderer's TypeScript sees it.
const api = {
  hasApiKey: (): Promise<boolean> =>
    ipcRenderer.invoke('settings:has-api-key'),
  getApiKey: (): Promise<string | null> =>
    ipcRenderer.invoke('settings:get-api-key'),
  setApiKey: (key: string): Promise<boolean> =>
    ipcRenderer.invoke('settings:set-api-key', key),
  clearApiKey: (): Promise<boolean> =>
    ipcRenderer.invoke('settings:clear-api-key'),
  // Music library --------------------------------------------------------
  /** Open the OS file picker, copy files to userData/music/, return metadata. */
  importMusicFiles: (): Promise<MusicFile[]> =>
    ipcRenderer.invoke('music:import-files'),
  /** Read a stored music file's bytes (Uint8Array over IPC). */
  readMusicFile: (storedName: string): Promise<Uint8Array> =>
    ipcRenderer.invoke('music:read-file', storedName),
  /** Remove a file from disk and the persisted playlist. */
  deleteMusicFile: (storedName: string): Promise<boolean> =>
    ipcRenderer.invoke('music:delete-file', storedName),
};

contextBridge.exposeInMainWorld('electronAPI', api);
