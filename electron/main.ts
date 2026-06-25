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
 *      the user-scoped settings file (currently just the Gemini API
 *      key). We never shell out or hit the network from here.
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

import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
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

// `app.getAppPath()` resolves to the project root in dev and the asar root
// in prod. For prod we want `.../resources/app.asar/dist/index.html`.
function rendererIndexPath(): string {
  return join(__dirname, '..', 'dist', 'index.html');
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
    // DevTools is opt-in. We don't auto-open it to keep first-run tidy.
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
    // Returned to the renderer ONLY for in-memory use, never written
    // to disk there. The trust boundary is what follows: the renderer
    // gets the secret, but live-Devtools exposure is a known risk the
    // user accepted by choosing "ask once, persist on disk".
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
