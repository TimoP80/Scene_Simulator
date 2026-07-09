/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Electron MAIN process. Runs under Node, NOT in a renderer.
 *
 * Responsibilities:
 *   1. Window lifecycle (create / activate / quit-on-all-closed).
 *   2. Load the renderer from Vite dev server (DEV) or from disk (PROD).
 *   3. Expose IPC handlers used by `electron/preload.ts` to read/write
 *      the user-scoped settings file (Gemini key + music library) and
 *      to import / read tracker-module files.
 *
 * Removed in this revision: the `worklet://` custom-scheme plumbing.
 * The renderer used to call `await window.electronAPI.getWorkletUrl()`
 * → main copied chiptune3's two worklet files into `userData/worklets/`
 * and served them via `protocol.handle('worklet', ...)`. That fell
 * apart in Electron 42 with `addModule()` rejecting the multi-hop
 * static `import './libopenmpt.worklet.js'` chain — "Unable to load a
 * worklets module" even after we patched `Content-Type`. The fix
 * (scripts/bundle-worklet.mjs) concatenates both files into a single
 * Vite-served asset at `public/worklets/openmpt.bundled.worklet.js`,
 * served at the document's same-origin URL.
 *
 * SECURITY:
 *   - sandbox: true              - the renderer cannot touch Node directly
 *   - contextIsolation: true     - preload runs in its own JS context
 *   - nodeIntegration: false     - belt-and-suspenders to sandbox
 *   - webSecurity: true          - default, explicit for clarity
 *
 * ESM NOTE: package.json has "type": "module", so __dirname does NOT
 * exist here. We shim it with import.meta.url so electron-builder's
 * dist paths resolve correctly.
 */

import { app, BrowserWindow, dialog, ipcMain, shell, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';
import { createHash } from 'node:crypto';
import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  unlinkSync,
} from 'node:fs';
// extensionless so Vite's default resolver (which doesn't include `.cjs`
// in `resolve.extensions`) finds `./settings.ts`. Rollup then inlines
// settings into `main.cjs` rather than emitting a sibling chunk.
import { settingsStore } from './settings';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ---- single-instance lock ----------------------------------------------------
// Without this, double-clicking the installer-launched exe would spawn a
// second Electron process loading the same renderer twice on the same DB.
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  // Lost the race - quit immediately and let the existing process
  // surface its window via `second-instance`. We deliberately do NOT
  // register `second-instance` listeners here since this process is
  // about to die anyway.
  app.quit();
}

// ---- dev/prod URL resolution -------------------------------------------------
// In dev we point at the Vite server (npm run dev). In prod we point at the
// static `dist/index.html` produced by `vite build`.
const DEV_URL = process.env.VITE_DEV_SERVER_URL ?? 'http://localhost:3000';
const IS_DEV = !app.isPackaged;

// ---- paths -------------------------------------------------------------------

/** `userData` for the running app. */
function userDataPath(): string {
  return app.getPath('userData');
}

/** Folder for the music library (one file per imported track). */
function musicDir(): string {
  return join(userDataPath(), 'music');
}

/** `app.getAppPath()` resolves to the project root in dev and the asar root in prod. */
function rendererIndexPath(): string {
  return join(__dirname, '..', 'dist', 'index.html');
}

// ---- music-library helpers ---------------------------------------------------

const SUPPORTED_EXTS = new Set(['.mod', '.xm', '.it', '.s3m']);

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex').slice(0, 32);
}

function formatFromExtension(filename: string): 'MOD' | 'XM' | 'IT' | 'S3M' | 'OTHER' {
  const ext = extname(filename).toLowerCase();
  switch (ext) {
    case '.mod':
      return 'MOD';
    case '.xm':
      return 'XM';
    case '.it':
      return 'IT';
    case '.s3m':
      return 'S3M';
    default:
      return 'OTHER';
  }
}

function stripExtension(filename: string): string {
  const dot = filename.lastIndexOf('.');
  if (dot <= 0) return filename;
  return filename.slice(0, dot);
}

// ---- window creation ---------------------------------------------------------
let mainWindow: BrowserWindow | null = null;

function createMainWindow(): BrowserWindow {
  const preloadPath = join(__dirname, 'preload.cjs');

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    backgroundColor: '#09090b',
    title: 'Demoscene Simulator',
    show: false,
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      // Disable spellcheck on the demo name / scener handle inputs -
      // these are pass-through free-text fields and red squiggles look
      // out of place in the demoscene aesthetic.
      spellcheck: false,
    },
  });

  // Once the renderer is ready to paint, show the window. Doing this on
  // `ready-to-show` instead of immediately avoids the white flash you
  // get when BrowserWindow is created with `show:false`.
  win.once('ready-to-show', () => {
    win.show();
  });

  // External links should open in the user's browser, never in-app.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('http://') || url.startsWith('https://')) {
      void shell.openExternal(url);
    }
    return { action: 'deny' };
  });

  // In-app navigation requests must stay within our origin. The dev
  // URL is http://localhost:3000; the prod URL is file://. Anything
  // else is either an external link or an attempt to escape the
  // sandbox - block it and route through the OS browser instead.
  win.webContents.on('will-navigate', (event, navUrl) => {
    const allowed = IS_DEV
      ? navUrl.startsWith(DEV_URL)
      : navUrl.startsWith('file://');
    if (!allowed) {
      event.preventDefault();
      if (navUrl.startsWith('http://') || navUrl.startsWith('https://')) {
        void shell.openExternal(navUrl);
      }
    }
  });

  if (IS_DEV) {
    void win.loadURL(DEV_URL);
  } else {
    void win.loadFile(rendererIndexPath());
  }

  return win;
}

// ---- IPC: settings ------------------------------------------------------------
// Single small JSON file at app.getPath('userData')/settings.json. All
// access goes through the preload's contextBridge.

function registerIpcHandlers(): void {
  ipcMain.handle('settings:has-api-key', async () => {
    return settingsStore.hasGeminiKey();
  });

  ipcMain.handle('settings:get-api-key', async () => {
    return settingsStore.getGeminiKey();
  });

  ipcMain.handle('settings:set-api-key', async (_event, key: unknown) => {
    if (typeof key !== 'string') {
      throw new Error('settings:set-api-key expects a string payload');
    }
    const trimmed = key.trim();
    if (trimmed.length < 8) {
      throw new Error('Gemini API key looks too short - paste the full key.');
    }
    settingsStore.setGeminiKey(trimmed);
    return true;
  });

  ipcMain.handle('settings:clear-api-key', async () => {
    settingsStore.clearGeminiKey();
    return true;
  });

  // ----- music library -------------------------------------------------------

  /**
   * Open the native file picker (filtered to .mod/.xm/.it/.s3m) and
   * copy each chosen file into `userData/music/<sha256>.<ext>`.
   * Returns the lightweight MusicFile[] entries. Files whose bytes
   * already exist under that hash are de-duped automatically.
   */
  ipcMain.handle('music:import-files', async () => {
    if (!mainWindow) throw new Error('No window available for file picker');
    const picks = await dialog.showOpenDialog(mainWindow, {
      title: 'Add tracker music to your library',
      buttonLabel: 'Add to library',
      properties: ['openFile', 'multiSelections'],
      filters: [
        { name: 'Tracker modules', extensions: ['mod', 'xm', 'it', 's3m'] },
        { name: 'All files', extensions: ['*'] },
      ],
    });
    if (picks.canceled || picks.filePaths.length === 0) return [];

    mkdirSync(musicDir(), { recursive: true });
    const imported: Array<{
      storedName: string;
      displayName: string;
      format: 'MOD' | 'XM' | 'IT' | 'S3M' | 'OTHER';
      size: number;
    }> = [];
    const existingPlaylist = settingsStore.getMusicPlaylist();
    const existingHashes = new Set(
      existingPlaylist.map((p) => p.storedName.split('.')[0])
    );

    for (const srcPath of picks.filePaths) {
      const ext = extname(srcPath).toLowerCase();
      if (!SUPPORTED_EXTS.has(ext)) continue;
      const buf = readFileSync(srcPath);
      const hash = sha256(buf);
      const storedName = `${hash}${ext}`;
      const destPath = join(musicDir(), storedName);
      if (!existsSync(destPath)) {
        copyFileSync(srcPath, destPath);
      } else {
        existingHashes.add(hash);
      }
      // Skip if already in the playlist (by storedName).
      if (existingPlaylist.some((p) => p.storedName === storedName)) continue;
      const filename = srcPath.split(/[\\/]/).pop() ?? `track${ext}`;
      imported.push({
        storedName,
        displayName: stripExtension(filename),
        format: formatFromExtension(filename),
        size: buf.length,
      });
    }
    if (imported.length > 0) {
      settingsStore.setMusicPlaylist([...existingPlaylist, ...imported]);
    }
    return imported;
  });

  /**
   * Read a stored music file's bytes. Returns a Uint8Array for the
   * renderer to feed into the AudioWorklet. Throws if the file is
   * missing (the user may have wiped userData/ externally).
   */
  ipcMain.handle('music:read-file', async (_event, storedName: unknown) => {
    if (typeof storedName !== 'string' || !storedName) {
      throw new Error('music:read-file expects a non-empty string');
    }
    // Reject path traversal — `storedName` must be a flat filename.
    if (storedName.includes('/') || storedName.includes('\\') || storedName.includes('..')) {
      throw new Error('music:read-file: invalid stored name');
    }
    const full = join(musicDir(), storedName);
    if (!existsSync(full)) {
      throw new Error(`Music file no longer on disk: ${storedName}`);
    }
    const buf = readFileSync(full);
    // Return as Uint8Array — Electron serialises the underlying buffer
    // efficiently across the IPC bridge.
    return new Uint8Array(buf);
  });

  /**
   * Remove a stored music file from both disk and the playlist.
   * Returns true on success. If the file is the currently-playing
   * track, the renderer is responsible for stopping playback first
   * (this handler is destructive and synchronous).
   */
  ipcMain.handle('music:delete-file', async (_event, storedName: unknown) => {
    if (typeof storedName !== 'string' || !storedName) return false;
    if (storedName.includes('/') || storedName.includes('\\') || storedName.includes('..')) {
      return false;
    }
    const full = join(musicDir(), storedName);
    if (existsSync(full)) {
      try {
        unlinkSync(full);
      } catch {
        // Best-effort; continue even if the FS delete fails.
      }
    }
    const playlist = settingsStore
      .getMusicPlaylist()
      .filter((p) => p.storedName !== storedName);
    settingsStore.setMusicPlaylist(playlist);
    return true;
  });
}

// ---- app lifecycle ------------------------------------------------------------
void app.whenReady().then(() => {
  // Re-check the lock here in case `app.quit()` was already called at
  // module init on a non-primary instance. `quit()` is graceful and the
  // ready event can still fire before process exit, so without this
  // guard a secondary launch would briefly create a window that the
  // shutdown path then immediately closes.
  if (!gotLock) return;

  // Single-instance `second-instance` listener is registered AFTER
  // winning the lock so it only fires on the primary process. The
  // non-primary process has already called `app.quit()` above.
  app.on('second-instance', () => {
    const win = BrowserWindow.getAllWindows()[0];
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  // Lock down the menubar in prod to keep the demoscene aesthetic. In
  // dev we leave the default menu so DevTools / reload still works.
  if (!IS_DEV) {
    Menu.setApplicationMenu(null);
  }
  registerIpcHandlers();
  mainWindow = createMainWindow();

  void app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      mainWindow = createMainWindow();
    }
  });
});

// Standard desktop-app quit semantics: on non-darwin platforms, closing
// every window quits the app. mac users tend to expect the dock icon to
// resurrect the window, so we keep the process alive there.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
