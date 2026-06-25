import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    // Renderer must use RELATIVE asset paths so the production build can
    // be served via file:// in Electron (otherwise assets resolve against
    // the filesystem root instead of next to index.html).
    base: './',
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
        '@packages/types': path.resolve(__dirname, './packages/types/src'),
        '@packages/utils': path.resolve(__dirname, './packages/utils/src'),
        '@sim': path.resolve(__dirname, './sim'),
        '@apps/ui': path.resolve(__dirname, './apps/ui'),
        '@apps/server': path.resolve(__dirname, './apps/server'),
        '@apps/llm': path.resolve(__dirname, './apps/llm'),
        '@tools': path.resolve(__dirname, './tools'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify\u2014file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
