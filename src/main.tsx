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
import ApiKeyBootstrap from './components/ApiKeyBootstrap.tsx';
import CapturePreview from './preview/CapturePreview.tsx';
import './index.css';

const isCaptureRun =
  typeof window !== 'undefined' &&
  new URLSearchParams(window.location.search).has('capture');

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Missing #root element');

createRoot(rootElement).render(
  <StrictMode>
    {isCaptureRun ? <CapturePreview /> : (
      <ApiKeyBootstrap>
        <App />
      </ApiKeyBootstrap>
    )}
  </StrictMode>,
);
