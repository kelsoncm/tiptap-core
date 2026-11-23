import { defineConfig } from 'vitest/config';

import { siteAliases } from './site/aliases.js';

export default defineConfig({
  // Os exemplos do site importam o pacote pelo nome publicado.
  resolve: { alias: siteAliases },
  test: {
    environment: 'jsdom',
    include: ['test/**/*.test.ts'],
    setupFiles: ['test/setup.ts'],
  },
});
