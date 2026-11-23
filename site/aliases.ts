import { fileURLToPath } from 'node:url';

const src = (path: string): string => fileURLToPath(new URL(`../src/${path}`, import.meta.url));

/**
 * Os exemplos importam o pacote pelo nome publicado (código copiável); no site e nos testes o
 * nome aponta para o código-fonte deste commit.
 */
export const siteAliases = [
  { find: /^@kelsoncm\/tiptap-core$/, replacement: src('index.ts') },
  { find: /^@kelsoncm\/tiptap-core\/math$/, replacement: src('math.ts') },
  { find: /^@kelsoncm\/tiptap-core\/office$/, replacement: src('office.ts') },
  { find: /^@kelsoncm\/tiptap-core\/styles\.css$/, replacement: src('styles/kelson-editor.css') },
];
