import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import ApiKeyBootstrap from './components/ApiKeyBootstrap.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApiKeyBootstrap>
      <App />
    </ApiKeyBootstrap>
  </StrictMode>,
);
