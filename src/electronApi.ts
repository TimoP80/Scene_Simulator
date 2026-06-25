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
 * AI Studio, where `window.electronAPI` is undefined.
 */

export type ElectronApi = {
  hasApiKey: () => Promise<boolean>;
  getApiKey: () => Promise<string | null>;
  setApiKey: (key: string) => Promise<boolean>;
  clearApiKey: () => Promise<boolean>;
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
