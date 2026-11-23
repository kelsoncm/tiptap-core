import { fileURLToPath } from 'node:url';

import { defineConfig, type Plugin } from 'vite';

import { siteAliases } from './aliases.js';
// @ts-expect-error -- script Node em JavaScript, sem declarações de tipo.
import { generatePages } from './build-pages.mjs';

const site = fileURLToPath(new URL('.', import.meta.url));
const www = fileURLToPath(new URL('./www', import.meta.url));

/** Regenera as páginas quando o layout, o menu ou o conteúdo mudam (npm run site:dev). */
function pagesPlugin(): Plugin {
  return {
    name: 'kt-site-pages',
    configureServer(server) {
      // As páginas ficam em site/www/ e o código em site/lib/ (fora do root): no build o Rollup
      // resolve "../lib/main.ts" pelo disco; no dev o navegador pede /lib/main.ts.
      const siteFs = `/@fs/${site.replaceAll('\\', '/').replace(/^\//, '')}`;
      server.middlewares.use((req, _res, next) => {
        if (req.url?.startsWith('/lib/')) req.url = `${siteFs}${req.url.slice(1)}`;
        next();
      });
      const watched = [`${site}layout.html`, `${site}nav.json`, `${site}content`];
      server.watcher.add(watched);
      server.watcher.on('change', (file) => {
        const normalized = file.replaceAll('\\', '/');
        if (!/site\/(layout\.html|nav\.json|content\/)/.test(normalized)) return;
        generatePages();
        server.ws.send({ type: 'full-reload' });
      });
    },
  };
}

export default defineConfig(({ command }) => {
  const pages: string[] = generatePages();
  return {
    root: www,
    base: command === 'build' ? '/tiptap-core/' : '/',
    publicDir: fileURLToPath(new URL('./public', import.meta.url)),
    resolve: { alias: siteAliases },
    plugins: [pagesPlugin()],
    server: {
      port: 5180,
      strictPort: true,
      fs: { allow: [fileURLToPath(new URL('..', import.meta.url))] },
    },
    build: {
      outDir: fileURLToPath(new URL('./dist', import.meta.url)),
      emptyOutDir: true,
      // O editor completo (Tiptap + ProseMirror + extensões) passa de 500 kB; é esperado.
      chunkSizeWarningLimit: 1200,
      rollupOptions: { input: pages },
    },
  };
});
