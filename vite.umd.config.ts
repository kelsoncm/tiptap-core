import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vite';

/**
 * Single-file UMD build for pages without a bundler (Moodle's RequireJS loads it as an anonymous
 * AMD module; without a loader it sets `window.KelsonTiptap`). mammoth stays out: pass it in
 * `officePlugin({ mammoth })`.
 */
export default defineConfig({
  publicDir: false,
  // Library mode keeps process.env.NODE_ENV; browsers have no `process`.
  define: { 'process.env.NODE_ENV': JSON.stringify('production') },
  build: {
    outDir: fileURLToPath(new URL('./dist-umd', import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
    // Tiptap + ProseMirror + extensions in one file: large by design.
    chunkSizeWarningLimit: 1500,
    lib: {
      entry: fileURLToPath(new URL('./src/umd.ts', import.meta.url)),
      name: 'KelsonTiptap',
      formats: ['umd'],
      fileName: () => 'kelsoncm-tiptap-core.umd.js',
    },
    rollupOptions: {
      external: ['mammoth'],
      output: { globals: { mammoth: 'mammoth' }, inlineDynamicImports: true },
    },
  },
});
