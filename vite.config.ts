import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';
import {readFileSync, existsSync, writeFileSync} from 'fs';

// Tracks the generated chunk filename for the lazy-loaded SocialGraphTab
// so we can inject a <link rel="modulepreload"> into index.html after build.
// Set during generateBundle, consumed in closeBundle.
let socialGraphChunkName = '';

export default defineConfig(() => {
  return {
    // Renderer must use RELATIVE asset paths so the production build can
    // be served via file:// in Electron (otherwise assets resolve against
    // the filesystem root instead of next to index.html).
    base: './',
    plugins: [
      tailwindcss(),
      react(),
      {
        name: 'inject-modulepreload',
        generateBundle(_, bundle) {
          const chunk = Object.keys(bundle).find(
            name =>
              name.includes('social-graph-tab-') && name.endsWith('.js')
          );
          if (chunk) socialGraphChunkName = chunk;
        },
        closeBundle() {
          if (!socialGraphChunkName) {
            console.warn(
              '[inject-modulepreload] social-graph-tab chunk not found — skipping'
            );
            return;
          }
          const htmlPath = path.resolve(__dirname, 'dist', 'index.html');
          if (!existsSync(htmlPath)) {
            console.warn(
              '[inject-modulepreload] dist/index.html not found — skipping'
            );
            return;
          }
          let html = readFileSync(htmlPath, 'utf-8');
          const preloadLink = `<link rel="modulepreload" href="./${socialGraphChunkName}">`;
          if (html.includes(preloadLink)) {
            console.log(
              `[inject-modulepreload] Already present: ${socialGraphChunkName}`
            );
            return;
          }
          html = html.replace('</head>', `  ${preloadLink}\n</head>`);
          writeFileSync(htmlPath, html, 'utf-8');
          console.log(
            `[inject-modulepreload] Injected preload for ${socialGraphChunkName}`
          );
        },
      },
    ],
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
    build: {
      rollupOptions: {
        output: {
          manualChunks(id: string) {
            if (
              id.includes('node_modules/react/') ||
              id.includes('node_modules/react-dom/') ||
              id.includes('node_modules/motion/')
            ) {
              return 'vendor';
            }
            if (id.includes('node_modules/lucide-react/')) {
              return 'vendor-icons';
            }
            if (id.includes('node_modules/chiptune3/')) {
              return 'chiptune3';
            }
            if (id.includes('node_modules/zod/')) {
              return 'zod';
            }
            if (id.includes('/devtools/')) {
              return 'devtools';
            }
            if (id.includes('/sim/')) {
              return 'sim';
            }
            if (id.includes('SocialGraphTab')) {
              return 'social-graph-tab';
            }
            if (id.includes('node_modules/@google/genai/')) {
              return 'genai';
            }
          },
        },
      },
    },
    server: {
      // HMR can be disabled via the DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
  };
});
