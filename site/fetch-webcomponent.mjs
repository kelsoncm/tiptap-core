// Copia o arquivo único do web component (release do kelsoncm/tiptap-webcomponent) para
// site/public/vendor/, usado pela página "Web component" do site.
// Uso: node site/fetch-webcomponent.mjs [versão]
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const VERSION = process.argv[2] ?? '0.1.2';
const URL_BUNDLE = `https://github.com/kelsoncm/tiptap-webcomponent/releases/download/v${VERSION}/kelsoncm-tiptap.bundle.js`;
const target = join(
  dirname(fileURLToPath(import.meta.url)),
  'public',
  'vendor',
  'kelsoncm-tiptap.bundle.js',
);

const response = await fetch(URL_BUNDLE);
if (!response.ok) {
  console.error(`Falha ao baixar ${URL_BUNDLE}: HTTP ${response.status}`);
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, Buffer.from(await response.arrayBuffer()));
console.log(`web component ${VERSION} copiado para ${target}`);
