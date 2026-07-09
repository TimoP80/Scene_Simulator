/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Vite library-mode config for the Electron host (main + preload).
 *
 * WHY THIS EXISTS:
 *   - vite.config.ts is the renderer's bundler. Mixing the Electron host
 *     into it drags Chromium-targeted React/Tailwind plugins into a
 *     Node target. Keeping them separate avoids that.
 *   - Both entries ship as CJS (.cjs). Electron 28+ supports ESM main,
 *     but CJS is unambiguous on disk (the .cjs extension), plays nicely
 *     with electron-builder's asar packaging, and matches the loader
 *     select behavior in newer Electron versions without surprises.
 *   - The alias map stays in lock-step with `vite.config.ts` so a
 *     `@sim/*` import works in any layer.
 */

import { defineConfig } from 'vite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  // No React / Tailwind plugins on purpose. This bundle is Node-only.
  plugins: [],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
      '@packages/types': path.resolve(__dirname, './packages/types/src'),
      '@packages/utils': path.resolve(__dirname, './packages/utils/src'),
      '@sim': path.resolve(__dirname, './sim'),
      '@sim/data': path.resolve(__dirname, './sim/data'),
      '@sim/domain': path.resolve(__dirname, './sim/domain'),
      '@sim/engine': path.resolve(__dirname, './sim/engine'),
      '@sim/events': path.resolve(__dirname, './sim/events'),
      '@sim/projections': path.resolve(__dirname, './sim/projections'),
      '@apps/ui': path.resolve(__dirname, './apps/ui'),
      '@apps/server': path.resolve(__dirname, './apps/server'),
      '@apps/llm': path.resolve(__dirname, './apps/llm'),
      '@tools': path.resolve(__dirname, './tools'),
    },
  },
  build: {
    outDir: 'dist-electron',
    emptyOutDir: true,
    target: 'node20',
    minify: false,
    sourcemap: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'electron/main.ts'),
        preload: path.resolve(__dirname, 'electron/preload.ts'),
      },
      output: {
        // One CJS bundle per input. .cjs extension keeps the file
        // parsing unambiguous under the project's "type": "module" root.
        format: 'cjs',
        entryFileNames: '[name].cjs',
        inlineDynamicImports: false,
      },
      external: [
        // Node built-ins + electron are resolved at runtime by Electron.
        'electron',
        'node:url',
        'node:path',
        'node:fs',
        'node:fs/promises',
        'node:os',
        // crypto is used by the music-library helpers in main.ts for
        // sha256-based file de-duplication. Without this Rollup tries
        // to bundle it via vite's __vite-browser-external stub and fails.
        'node:crypto',
      ],
      onwarn(warning, defaultHandler) {
        // Silence the known "CJS / eval" warnings from @google/genai when
        // bundled; it's external anyway and we don't ship it in the host.
        if (warning.code === 'CIRCULAR_DEPENDENCY') return;
        defaultHandler(warning);
      },
    },
  },
});
