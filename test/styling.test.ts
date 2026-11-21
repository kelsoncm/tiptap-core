import { afterEach, describe, expect, it } from 'vitest';

import {
  CODE_LANGUAGES,
  createEditor,
  createI18n,
  validateCustomStyles,
  type CustomStyle,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

const make = (content: string, options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};

const styles: CustomStyle[] = [
  { id: 'lead', label: 'Destaque', kind: 'block', className: 'kt-lead' },
  { id: 'note', label: 'Nota', kind: 'block', className: 'kt-note box' },
  { id: 'marker', label: 'Marcador', kind: 'inline', className: 'kt-marker' },
];

describe('code highlight', () => {
  it('highlights code blocks and stores the language', () => {
    const k = make('<pre><code class="language-javascript">const a = 1;</code></pre>', {
      codeHighlight: true,
    });
    const html = k.editor.view.dom.innerHTML;
    expect(html).toContain('hljs-keyword');
    expect(k.editor.getHTML()).toContain('<code class="language-javascript">');
  });

  it('changes and creates code blocks through the language command', () => {
    const k = make('<p>print(1)</p>', { codeHighlight: true });
    k.run('codeBlockLanguage', 'python');
    expect(k.editor.getHTML()).toMatch(
      /^<pre class="hljs"><code class="language-python">print\(1\)/,
    );
    expect(k.commands.get('codeBlockLanguage')!.getValue!(k.editor)).toBe('python');
    k.run('codeBlockLanguage', 'sql');
    expect(k.editor.getHTML()).toContain('language-sql');
  });

  it('accepts a custom grammar set', () => {
    const k = make('<pre><code>x</code></pre>', { codeHighlight: { languages: {} } });
    expect(k.editor.extensionManager.extensions.some((e) => e.name === 'codeBlock')).toBe(true);
  });

  it('is off by default', () => {
    const k = make('<p></p>');
    expect(k.commands.has('codeBlockLanguage')).toBe(false);
  });

  it('language labels resolve', () => {
    const i18n = createI18n({ locale: 'en' });
    expect(CODE_LANGUAGES.map((l) => (l.labelKey ? i18n.t(l.labelKey) : l.label))).toContain(
      'Plain text',
    );
  });
});

describe('custom styles', () => {
  it('toggles block styles on paragraphs and headings', () => {
    const k = make('<p>a</p><h2>b</h2>', { customStyles: styles });
    k.editor.commands.selectAll();
    k.run('customStyle', 'note');
    expect(k.editor.getHTML()).toMatch(
      /^<p data-block-style="note" class="kt-note box">a<\/p><h2 data-block-style="note" class="kt-note box">b<\/h2>/,
    );
    expect(k.commands.get('customStyle')!.getValue!(k.editor)).toBe('note');
    k.run('customStyle', 'note');
    expect(k.editor.getHTML()).not.toContain('data-block-style');
  });

  it('toggles inline styles and clears everything', () => {
    const k = make('<p>abc</p>', { customStyles: styles });
    k.editor.commands.setTextSelection({ from: 1, to: 3 });
    k.run('customStyle', 'marker');
    expect(k.editor.getHTML()).toBe(
      '<p><span data-style="marker" class="kt-marker">ab</span>c</p>',
    );
    k.run('customStyle', 'lead');
    k.run('customStyle', null);
    expect(k.editor.getHTML()).toBe('<p>abc</p>');
  });

  it('drops unknown style ids when parsing', () => {
    const k = make('<p data-block-style="ghost">a <span data-style="ghost">b</span></p>', {
      customStyles: styles,
    });
    expect(k.editor.getHTML()).toBe('<p>a <span>b</span></p>');
  });

  it('rejects unsafe class names and duplicated ids', () => {
    expect(() =>
      validateCustomStyles([{ id: 'x', label: 'x', kind: 'block', className: 'a" onclick="b' }]),
    ).toThrow(/Classe CSS inválida/);
    expect(() => validateCustomStyles([styles[0]!, styles[0]!])).toThrow(/duplicado/);
    expect(() =>
      make('<p></p>', {
        customStyles: [{ id: 'x', label: 'x', kind: 'inline', className: '1bad' }],
      }),
    ).toThrow(/Classe CSS inválida/);
  });
});

describe('format painter', () => {
  it('copies marks from one selection and applies them to the next', () => {
    const k = make('<p><strong><em>fonte</em></strong> destino</p>');
    k.editor.commands.setTextSelection({ from: 2, to: 4 });
    k.run('formatPainter');
    expect(k.commands.get('formatPainter')!.isActive!(k.editor)).toBe(true);
    k.editor.commands.setTextSelection({ from: 6, to: 14 });
    expect(k.editor.commands.pasteFormat()).toBe(true);
    expect(k.editor.getHTML()).toBe('<p><strong><em>fonte destino</em></strong></p>');
    // One-shot: the painter turns off after applying.
    expect(k.commands.get('formatPainter')!.isActive!(k.editor)).toBe(false);
  });

  it('replaces existing marks of the target and keeps links', () => {
    const k = make('<p><u>u</u> <s><a href="https://x.org">link</a></s></p>');
    k.editor.commands.setTextSelection({ from: 1, to: 2 });
    k.editor.commands.copyFormat();
    k.editor.commands.setTextSelection({ from: 3, to: 7 });
    k.editor.commands.pasteFormat();
    const html = k.editor.getHTML();
    expect(html).not.toContain('<s>');
    expect(html).toContain('href="https://x.org"');
    expect(html).toMatch(/<u>.*link.*<\/u>|<a[^>]*><u>link<\/u><\/a>/);
  });

  it('sticky mode keeps painting; Escape/cancel turns it off', () => {
    const k = make('<p><strong>a</strong> b c</p>');
    k.editor.commands.setTextSelection({ from: 1, to: 2 });
    k.editor.commands.copyFormat(true);
    k.editor.commands.setTextSelection({ from: 3, to: 4 });
    k.editor.commands.pasteFormat();
    k.editor.commands.setTextSelection({ from: 5, to: 6 });
    k.editor.commands.pasteFormat();
    expect(k.editor.getHTML()).toBe(
      '<p><strong>a</strong> <strong>b</strong> <strong>c</strong></p>',
    );
    k.run('formatPainter');
    expect(k.editor.storage.formatPainter.marks).toBeNull();
    expect(k.editor.commands.pasteFormat()).toBe(false);
  });

  it('can be disabled', () => {
    const k = make('<p></p>', { features: { formatPainter: false } });
    expect(k.commands.has('formatPainter')).toBe(false);
  });
});
