/**
 * src/main.tsx — two entry trees:
 *
 *   1. Normal launch (`/`):            App wrapped in ApiKeyBootstrap so
 *                                       Electron users see the API-key
 *                                       gate when needed.
 *   2. Headless capture (`/?capture=1`):
 *                                       CapturePreview (a bare
 *                                       <DemoScreen /> with the hero
 *                                       preset) — used by
 *                                       scripts/capture-preview.mjs so
 *                                       the headless capture never has
 *                                       to navigate MainMenu or pass
 *                                       the API-key gate. No
 *                                       ApiKeyBootstrap (it would block
 *                                       on missing electronAPI).
 */

import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import AppBootstrapper from './components/AppBootstrapper.tsx';
import ApiKeyBootstrap from './components/ApiKeyBootstrap.tsx';
import CapturePreview from './preview/CapturePreview.tsx';
import { DevModeProvider } from './devtools/DevModeContext';
import './index.css';

const isCaptureRun =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('capture');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

// DevModeProvider is mounted at the React root (not inside <App/>) so
// the App component's own useDevMode() at the top of its body can see
// the real provider. Previously the provider only lived inside App's
// JSX return, which made App's `useDevMode()` resolve to the default
// context value (`setDevMode: () => {}`) and silently no-op the DEV
// TOOLS toggle in the MainMenu.
//
// SimulationLoopProvider is also mounted outside <App /> (via
// AppBootstrapper) so useSimulationLoop() calls at the top of App's
// function body resolve correctly.
createRoot(rootElement).render(
  <StrictMode>
    <DevModeProvider>
      {isCaptureRun ? <CapturePreview /> : (
        <ApiKeyBootstrap>
          <AppBootstrapper />
        </ApiKeyBootstrap>
      )}
    </DevModeProvider>
  </StrictMode>,
);
