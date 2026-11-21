// Copies non-TypeScript assets (CSS) from src/ to dist/ after `tsc`.
import { cpSync, existsSync } from 'node:fs';

if (!existsSync('src/styles')) {
  console.error('copy-assets: pasta src/styles não encontrada.');
  process.exit(1);
}
cpSync('src/styles', 'dist/styles', { recursive: true });
