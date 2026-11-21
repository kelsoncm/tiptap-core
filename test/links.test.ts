import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  applyLink,
  checkLinks,
  createEditor,
  findLinks,
  listAnchors,
  normalizeHref,
  slugify,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content = '<p>texto</p>', options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));

describe('links', () => {
  it('links the selection and inserts text when empty', () => {
    const k = make();
    k.editor.commands.selectAll();
    expect(k.run('link', { href: 'https://ifrn.edu.br', newTab: true })).toBe(true);
    expect(k.editor.getHTML()).toBe(
      '<p><a target="_blank" rel="noopener noreferrer nofollow" href="https://ifrn.edu.br">texto</a></p>',
    );
    k.editor.commands.setTextSelection(6);
    k.editor.commands.insertContent(' ');
    k.editor.commands.unsetMark('link');
    applyLink(k.editor, { href: 'https://gov.br', text: 'gov' });
    expect(k.editor.getHTML()).toContain('href="https://gov.br">gov</a>');
  });

  it('rejects unsafe URLs, also on paste/parse', () => {
    const k = make('<p><a href="javascript:alert(1)">x</a></p>');
    expect(k.editor.getHTML()).not.toContain('javascript:');
    k.editor.commands.selectAll();
    expect(k.run('link', { href: 'javascript:alert(1)' })).toBe(false);
  });

  it('edits and removes links', () => {
    const k = make('<p><a href="https://a.org">aaa</a> b</p>');
    k.editor.commands.setTextSelection(2);
    expect(k.commands.get('link')!.isActive!(k.editor)).toBe(true);
    k.run('link', { href: 'https://b.org' });
    expect(k.editor.getHTML()).toContain('href="https://b.org">aaa</a>');
    k.run('unlink');
    expect(k.editor.getHTML()).toBe('<p>aaa b</p>');
    expect(k.commands.get('unlink')!.isEnabled!(k.editor)).toBe(false);
  });

  it('does not navigate on click while editing and keeps autolink', () => {
    const k = make();
    const link = k.editor.extensionManager.extensions.find((e) => e.name === 'link');
    expect(link?.options).toMatchObject({
      openOnClick: false,
      autolink: true,
      defaultProtocol: 'https',
    });
  });

  it('opens the link dialog prefilled when editing and saves', async () => {
    const k = make('<p><a href="https://a.org" target="_blank">aaa</a></p>');
    k.editor.commands.setTextSelection(2);
    k.run('link');
    const dialog = document.querySelector('.kt-dialog')!;
    expect(dialog.querySelector('.kt-dialog-title')?.textContent).toBe('Editar link');
    const href = dialog.querySelector<HTMLInputElement>('input[name="href"]')!;
    expect(href.value).toBe('https://a.org');
    expect(dialog.querySelector<HTMLInputElement>('input[name="newTab"]')!.checked).toBe(true);
    href.value = 'https://c.org';
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(k.editor.getHTML()).toContain('href="https://c.org"');
  });

  it('opens links in a new window safely', () => {
    const k = make('<p><a href="https://a.org">aaa</a></p>');
    const open = vi.spyOn(window, 'open').mockReturnValue(null);
    k.editor.commands.setTextSelection(2);
    expect(k.run('openLink')).toBe(true);
    expect(open).toHaveBeenCalledWith('https://a.org', '_blank', 'noopener,noreferrer');
    open.mockRestore();
  });
});

describe('normalizeHref', () => {
  it.each([
    ['ifrn.edu.br', 'https://ifrn.edu.br'],
    ['www.gov.br/x?y=1', 'https://www.gov.br/x?y=1'],
    ['ana@ifrn.edu.br', 'mailto:ana@ifrn.edu.br'],
    ['localhost:8080', 'localhost:8080'],
    ['/caminho', '/caminho'],
    ['#topo', '#topo'],
    ['http://x.org', 'http://x.org'],
    ['texto solto', 'texto solto'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeHref(input)).toBe(expected);
  });

  it('is applied by the link command', () => {
    const k = make();
    k.editor.commands.selectAll();
    k.run('link', { href: 'ifrn.edu.br' });
    expect(k.editor.getHTML()).toContain('href="https://ifrn.edu.br"');
  });
});

describe('anchors', () => {
  it('slugifies names', () => {
    expect(slugify(' Seção 2.1 – Introdução ')).toBe('secao-2-1-introducao');
    expect(slugify('***')).toBe('');
  });

  it('inserts unique anchors and parses legacy name/id anchors', () => {
    const k = make('<p>a<a name="velha"></a></p>');
    k.editor.commands.setTextSelection(2);
    expect(k.run('anchor', 'Seção 1')).toBe(true);
    expect(k.run('anchor', 'secao 1')).toBe(false); // duplicate id
    expect(listAnchors(k.editor.state.doc)).toEqual(['secao-1', 'velha']);
    expect(k.editor.getHTML()).toContain(
      '<a id="secao-1" data-type="anchor" class="kt-anchor" title="#secao-1"></a>',
    );
  });

  it('suggests anchors in the link dialog', () => {
    const k = make('<p>a<a data-type="anchor" id="topo"></a></p>');
    k.run('link');
    const options = [...document.querySelectorAll('.kt-dialog datalist option')].map(
      (o) => (o as HTMLOptionElement).value,
    );
    expect(options).toEqual(['#topo']);
    document.querySelector<HTMLButtonElement>('.kt-dialog-cancel')!.click();
  });
});

describe('link checker', () => {
  const content =
    '<p><a href="#topo">ok</a> <a href="#nada">x</a> <a href="https://a.org">a</a> <a href="https://down.org">d</a><a data-type="anchor" id="topo"></a></p>';

  it('finds links merging adjacent text nodes', () => {
    const k = make('<p><a href="https://a.org">um <strong>dois</strong></a></p>');
    expect(findLinks(k.editor.state.doc)).toEqual([
      expect.objectContaining({ href: 'https://a.org', text: 'um dois' }),
    ]);
  });

  it('reports missing anchors and unreachable URLs (checked once per URL)', async () => {
    const k = make(content);
    const reach = vi.fn(async (href: string) => !href.includes('down'));
    const results = await checkLinks(k.editor.state.doc, reach);
    expect(results.map((r) => [r.href, r.ok, r.reason])).toEqual([
      ['#topo', true, undefined],
      ['#nada', false, 'editor.links.missingAnchor'],
      ['https://a.org', true, undefined],
      ['https://down.org', false, 'editor.links.unreachable'],
    ]);
    expect(reach).toHaveBeenCalledTimes(2);
  });

  it('highlights broken links and reports through onCheck', async () => {
    const onCheck = vi.fn();
    const k = make(content, { links: { onCheck, isReachable: async () => false } });
    k.run('checkLinks');
    await flush();
    expect(onCheck).toHaveBeenCalledTimes(1);
    expect(k.editor.view.dom.querySelectorAll('.kt-link-broken')).toHaveLength(3);
    k.editor.commands.clearLinkCheckResults();
    expect(k.editor.view.dom.querySelectorAll('.kt-link-broken')).toHaveLength(0);
  });
});
