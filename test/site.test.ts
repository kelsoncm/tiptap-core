import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterEach, describe, expect, it } from 'vitest';

import type { EditorUI } from '../src/index.js';
// @ts-expect-error -- script Node em JavaScript, sem declarações de tipo.
import { generatePages, loadNav } from '../site/build-pages.mjs';

type ExampleModule = { mount: (host: HTMLElement) => EditorUI | Promise<EditorUI> };
interface NavItem {
  path: string;
  title: string;
  example?: string;
}

const examples = import.meta.glob<ExampleModule>('../site/examples/*/core.ts');
const nav = loadNav() as { sections: { items: NavItem[] }[] };
const items = nav.sections.flatMap((section) => section.items);

describe('site: exemplos', () => {
  const mounted: EditorUI[] = [];
  afterEach(() => {
    mounted.splice(0).forEach((ui) => ui.destroy());
    document.body.replaceChildren();
  });

  it.each(Object.keys(examples))('%s monta o editor', async (path) => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = await (await examples[path]!()).mount(host);
    mounted.push(ui);
    expect(host.querySelector('.kt-editor')).not.toBeNull();
    expect(ui.editor.getHTML().length).toBeGreaterThan(0);
  });

  it('cada exemplo do menu tem a pasta com core.ts, wc.html e angular.ts', () => {
    for (const item of items.filter((i) => i.example)) {
      const dir = join('site', 'examples', item.example!);
      for (const file of ['core.ts', 'wc.html', 'angular.ts']) {
        expect(existsSync(join(dir, file)), `${dir}/${file}`).toBe(true);
      }
    }
  });
});

describe('site: páginas', () => {
  it('gera uma página por item do menu, com título, menu e script', () => {
    const outDir = mkdtempSync(join(tmpdir(), 'kt-site-'));
    try {
      const files = generatePages({ outDir }) as string[];
      expect(files).toHaveLength(items.length);
      for (const item of items) {
        const html = readFileSync(join(outDir, ...item.path.split('/')), 'utf8');
        expect(html).toContain(`<title>${item.title}`);
        expect(html).toContain('aria-current="page"');
        expect(html).toContain('lib/main.ts');
        expect(html).not.toMatch(/\{\{(root|version)\}\}/);
        // O script de modo é embutido sem fechar a tag antes da hora.
        expect(html.match(/<\/script>/g)?.length).toBe(2);
      }
    } finally {
      rmSync(outDir, { recursive: true, force: true });
    }
  });
});
