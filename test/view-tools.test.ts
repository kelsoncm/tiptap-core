import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  buildFullPage,
  buildSearchPattern,
  createEditor,
  createEditorUI,
  findMatches,
  formatHtml,
  splitFullPage,
  type EditorUI,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

let instance: KelsonEditor | EditorUI | undefined;
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content: string, options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};

const mountUI = (content: string): EditorUI => {
  const host = document.createElement('div');
  document.body.append(host);
  const ui = createEditorUI(host, { content });
  instance = ui;
  return ui;
};

describe('find and replace', () => {
  it('builds patterns and reports invalid regex', () => {
    expect(buildSearchPattern('', { caseSensitive: false, regex: false, wholeWord: false })).toBe(
      'empty',
    );
    expect(
      buildSearchPattern('a.b', { caseSensitive: false, regex: false, wholeWord: false }),
    ).toBeInstanceOf(RegExp);
    expect(
      typeof buildSearchPattern('(', { caseSensitive: false, regex: true, wholeWord: false }),
    ).toBe('string');
  });

  it('finds matches per block, honoring case, whole words and inline nodes', () => {
    const k = make(
      '<p>Edital edital <span data-type="mention" data-id="x">@x</span> editais</p><p>EDITAL</p>',
    );
    const opts = { caseSensitive: false, regex: false, wholeWord: false };
    const doc = k.editor.state.doc;
    expect(findMatches(doc, buildSearchPattern('edital', opts) as RegExp)).toHaveLength(3);
    expect(
      findMatches(doc, buildSearchPattern('edital', { ...opts, caseSensitive: true }) as RegExp),
    ).toHaveLength(1);
    expect(
      findMatches(doc, buildSearchPattern('edital', { ...opts, wholeWord: true }) as RegExp),
    ).toHaveLength(3);
    const [first] = findMatches(doc, buildSearchPattern('editais', opts) as RegExp);
    expect(doc.textBetween(first!.from, first!.to)).toBe('editais');
  });

  it('navigates, highlights, replaces one and all', () => {
    const k = make('<p>gato rato gato</p><p>gato</p>');
    k.editor.commands.setSearchTerm('gato');
    expect(k.editor.storage.searchReplace.results).toHaveLength(3);
    expect(k.editor.view.dom.querySelectorAll('.kt-search-match')).toHaveLength(3);
    k.editor.commands.nextSearchResult();
    const { from, to } = k.editor.state.selection;
    expect(k.editor.state.doc.textBetween(from, to)).toBe('gato');
    k.editor.commands.setReplaceTerm('cão');
    k.editor.commands.replaceCurrent();
    expect(k.editor.storage.searchReplace.results).toHaveLength(2);
    k.editor.commands.replaceAll();
    expect(k.editor.getText()).toBe('cão rato cão\n\ncão');
    k.editor.commands.clearSearch();
    expect(k.editor.view.dom.querySelectorAll('.kt-search-match')).toHaveLength(0);
  });

  it('supports regex with an empty replacement', () => {
    const k = make('<p>a1 b22 c333</p>');
    k.editor.commands.setSearchOptions({ regex: true });
    k.editor.commands.setSearchTerm('\\d+');
    k.editor.commands.replaceAll();
    expect(k.editor.getText()).toBe('a b c');
  });

  it('find bar opens with Mod-f, counts and replaces', () => {
    const ui = mountUI('<p>um dois um</p>');
    ui.editor.commands.focus();
    ui.editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'f', ctrlKey: true, bubbles: true }),
    );
    const bar = ui.root.querySelector<HTMLElement>('.kt-find-bar')!;
    expect(bar.hidden).toBe(false);
    const [find, replace] = bar.querySelectorAll('input');
    find!.value = 'um';
    find!.dispatchEvent(new Event('input'));
    expect(bar.querySelector('.kt-find-count')!.textContent).toBe('1 de 2');
    replace!.value = 'três';
    replace!.dispatchEvent(new Event('input'));
    [...bar.querySelectorAll('button')].find((b) => b.textContent === 'Substituir todos')!.click();
    expect(ui.editor.getText()).toBe('três dois três');
    find!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(bar.hidden).toBe(true);
  });
});

describe('invisible characters and text language', () => {
  it('shows spaces and paragraph marks', () => {
    const k = make('<p>a b</p>');
    k.run('invisibleCharacters');
    expect(k.commands.get('invisibleCharacters')!.isActive!(k.editor)).toBe(true);
    expect(k.editor.view.dom.querySelectorAll('.kt-invisible-space')).toHaveLength(1);
    expect(k.editor.view.dom.querySelector('.kt-invisible-paragraph')?.textContent).toBe('¶');
    k.run('invisibleCharacters');
    expect(k.editor.view.dom.querySelector('.kt-invisible-paragraph')).toBeNull();
  });

  it('marks text language and validates tags', () => {
    const k = make('<p>hello mundo</p>');
    k.editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(k.run('textLanguage', 'en')).toBe(true);
    expect(k.editor.getHTML()).toBe('<p><span lang="en" class="kt-lang">hello</span> mundo</p>');
    expect(k.commands.get('textLanguage')!.getValue!(k.editor)).toBe('en');
    expect(k.run('textLanguage', 'en"><script>')).toBe(false);
    k.run('textLanguage', null);
    expect(k.editor.getHTML()).toBe('<p>hello mundo</p>');
  });
});

describe('dictation', () => {
  it('is disabled without the Web Speech API', () => {
    const k = make('<p></p>');
    expect(k.commands.get('dictation')!.isEnabled!(k.editor)).toBe(false);
  });

  it('inserts final results with spacing', () => {
    let instanceRef: {
      onresult: ((e: unknown) => void) | null;
      onend: (() => void) | null;
    } | null = null;
    class FakeRecognition {
      lang = '';
      continuous = false;
      interimResults = false;
      onresult: ((e: unknown) => void) | null = null;
      onerror = null;
      onend: (() => void) | null = null;
      start(): void {
        // Exposed so the test can push recognition results.
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        instanceRef = this;
      }
      stop(): void {
        this.onend?.();
      }
    }
    vi.stubGlobal('webkitSpeechRecognition', FakeRecognition);
    const k = make('<p>Olá</p>');
    k.editor.commands.focus('end');
    expect(k.run('dictation')).toBe(true);
    expect(k.commands.get('dictation')!.isActive!(k.editor)).toBe(true);
    instanceRef!.onresult!({
      resultIndex: 0,
      results: [{ isFinal: true, 0: { transcript: 'mundo ' } }],
    });
    expect(k.editor.getText()).toBe('Olá mundo');
    k.run('dictation');
    expect(k.commands.get('dictation')!.isActive!(k.editor)).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe('full page HTML and print', () => {
  it('splits a document, drops scripts and rebuilds it', () => {
    const parts = splitFullPage(
      '<html lang="en"><head><title>T</title><meta name="a" content="b"><script>x()</script><link rel="stylesheet" href="s.css" onload="y()"></head><body><p>oi</p></body></html>',
    );
    expect(parts.lang).toBe('en');
    expect(parts.title).toBe('T');
    expect(parts.head).not.toContain('script');
    expect(parts.head).not.toContain('onload');
    expect(parts.body).toBe('<p>oi</p>');
    const full = buildFullPage(parts.body, { head: parts.head, lang: parts.lang });
    expect(full).toMatch(
      /^<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>T<\/title>/,
    );
    expect(splitFullPage('<p>fragmento</p>').body).toBe('<p>fragmento</p>');
  });

  it('keeps the head of a full-page input', () => {
    const k = make('<html><head><title>Ofício</title></head><body><p>texto</p></body></html>', {
      fullPage: true,
    });
    expect(k.editor.getHTML()).toBe('<p>texto</p>');
    expect(k.getFullPageHTML()).toContain('<title>Ofício</title>');
    expect(k.getFullPageHTML()).toContain('<body><p>texto</p></body>');
  });

  it('prints through an iframe with footnotes', async () => {
    const k = make('<p>a<sup data-type="footnote" data-note="nota"></sup></p>');
    const print = vi.fn();
    const original = HTMLIFrameElement.prototype;
    const spy = vi.spyOn(document.body, 'append').mockImplementation(function (
      this: HTMLElement,
      ...nodes
    ) {
      for (const node of nodes) {
        if (node instanceof HTMLIFrameElement) {
          HTMLElement.prototype.append.call(this, node);
          Object.defineProperty(node.contentWindow!, 'print', { value: print });
        } else {
          HTMLElement.prototype.append.call(this, node as Node);
        }
      }
    });
    k.run('print');
    await new Promise((resolve) => setTimeout(resolve, 20));
    spy.mockRestore();
    expect(print).toHaveBeenCalled();
    void original;
  });
});

describe('UI panels', () => {
  it('toggles source code view and applies edits', () => {
    const ui = mountUI('<p>a</p>');
    ui.run('sourceCode');
    const textarea = ui.root.querySelector<HTMLTextAreaElement>('.kt-source')!;
    expect(textarea.hidden).toBe(false);
    expect(textarea.value).toBe('<p>a</p>');
    textarea.value = '<h2>b</h2>';
    ui.run('sourceCode');
    expect(ui.editor.getHTML()).toMatch(/^<h2>b<\/h2>/);
    expect(textarea.hidden).toBe(true);
  });

  it('formats HTML one block per line', () => {
    expect(formatHtml('<p>a</p><ul><li><p>b</p></li></ul>')).toBe(
      '<p>a</p>\n<ul>\n<li><p>b</p>\n</li>\n</ul>',
    );
  });

  it('toggles outline, minimap, blocks and fullscreen', () => {
    const ui = mountUI('<h1>Um</h1><h2>Dois</h2><p>x</p>');
    ui.run('outline');
    const outline = ui.root.querySelector<HTMLElement>('.kt-outline')!;
    expect([...outline.querySelectorAll('a')].map((a) => a.textContent)).toEqual(['Um', 'Dois']);
    outline.querySelectorAll('a')[1]!.click();
    expect(ui.editor.state.selection.$from.parent.textContent).toBe('Dois');
    ui.run('minimap');
    expect(ui.root.querySelector('.kt-minimap-content h1')?.textContent).toBe('Um');
    ui.run('showBlocks');
    expect(ui.root.classList.contains('kt-show-blocks')).toBe(true);
    ui.run('fullscreen');
    expect(ui.root.classList.contains('is-fullscreen')).toBe(true);
    expect(ui.commands.get('fullscreen')!.isActive!(ui.editor)).toBe(true);
    ui.editor.view.dom.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }),
    );
    expect(ui.root.classList.contains('is-fullscreen')).toBe(false);
  });

  it('renders a drag handle that selects the block on click', () => {
    const ui = mountUI('<p>a</p><p>b</p>');
    const handle = ui.root.querySelector<HTMLElement>('.kt-drag-handle')!;
    expect(handle.draggable).toBe(true);
    vi.spyOn(ui.editor.view, 'posAtCoords').mockReturnValue({ pos: 4, inside: 3 });
    ui.editor.view.dom.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
    expect(handle.hidden).toBe(false);
    handle.click();
    expect(ui.editor.state.selection.constructor.name).toBe('NodeSelection');
    expect(ui.editor.state.selection.from).toBe(3);
  });
});
