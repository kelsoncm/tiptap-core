import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  CHARACTER_GROUPS,
  collectHeadings,
  createEditor,
  createI18n,
  EMOJI_GROUPS,
  openSymbolDialog,
  parseChartLines,
  renderChartSvg,
  renderFootnotes,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';
import { mathPlugin } from '../src/math.js';

let instance: KelsonEditor | undefined;
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content = '<p></p>', options: KelsonEditorOptions = {}): KelsonEditor => {
  const element = document.createElement('div');
  document.body.append(element);
  instance = createEditor({ element, content, ...options });
  return instance;
};
const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));
const submit = (): void => {
  document
    .querySelector('.kt-dialog form')!
    .dispatchEvent(new Event('submit', { cancelable: true }));
};

describe('emoji and character map', () => {
  it('has unique, non-empty symbols with keywords', () => {
    for (const groups of [EMOJI_GROUPS, CHARACTER_GROUPS]) {
      const chars = groups.flatMap((g) => g.items.map((i) => i.char));
      expect(new Set(chars).size).toBe(chars.length);
      for (const g of groups) for (const i of g.items) expect(i.char && i.keywords).toBeTruthy();
    }
  });

  it('picks a symbol by searching (accent-insensitive) and Enter', async () => {
    const promise = openSymbolDialog({
      i18n: createI18n(),
      titleKey: 'editor.symbols.characterMap',
      groups: CHARACTER_GROUPS,
    });
    const search = document.querySelector<HTMLInputElement>('.kt-symbol-search')!;
    search.value = 'travessão';
    search.dispatchEvent(new Event('input'));
    expect([...document.querySelectorAll('.kt-symbol')].map((b) => b.textContent)).toEqual(['—']);
    search.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    expect(await promise).toBe('—');
  });

  it('inserts emoji from the dialog and from ":" suggestions', async () => {
    const k = make();
    k.editor.commands.focus();
    k.run('emoji');
    document.querySelector<HTMLButtonElement>('.kt-symbol')!.click();
    await flush();
    expect(k.editor.getText()).toBe('😀');
    for (const c of ' :fog') k.editor.commands.insertContent(c);
    await flush();
    expect(document.querySelector('.kt-emoji-menu')).not.toBeNull();
    k.editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    expect(k.editor.getText()).toBe('😀 🔥');
  });

  it('inserts characters directly with a payload', () => {
    const k = make();
    k.run('characterMap', '§');
    expect(k.editor.getText()).toBe('§');
  });
});

describe('button', () => {
  it('inserts a safe button and rejects unsafe URLs', () => {
    const k = make();
    expect(
      k.run('button', { label: 'Inscreva-se', href: 'https://ifrn.edu.br', variant: 'outline' }),
    ).toBe(true);
    expect(k.editor.getHTML()).toContain(
      '<a href="https://ifrn.edu.br" data-variant="outline" data-type="button" class="kt-btn kt-btn-outline" rel="noopener noreferrer">Inscreva-se</a>',
    );
    expect(k.run('button', { label: 'x', href: 'javascript:alert(1)' })).toBe(false);
    k.editor.commands.setContent('<p><a data-type="button" href="javascript:x">Mal</a></p>');
    expect(k.editor.getHTML()).not.toContain('javascript');
  });
});

describe('accordion', () => {
  it('wraps the selection in a collapsible section and unwraps it', () => {
    const k = make('<p>conteúdo</p>');
    k.editor.commands.setTextSelection(3);
    k.run('details');
    expect(k.editor.getHTML()).toMatch(
      /^<details class="kt-details"><summary><\/summary><div data-type="detailsContent"><p>conteúdo<\/p><\/div><\/details>/,
    );
    expect(k.commands.get('details')!.isActive!(k.editor)).toBe(true);
  });
});

describe('footnotes', () => {
  it('inserts footnotes and renders the numbered list escaped', async () => {
    const k = make('<p>a</p>');
    k.editor.commands.setTextSelection(2);
    k.run('footnote', 'Fonte: IBGE <2024>');
    k.run('footnote');
    document.querySelector<HTMLTextAreaElement>('.kt-dialog textarea')!.value = 'Segunda';
    submit();
    await flush();
    expect(k.editor.getHTML()).toContain(
      '<sup data-type="footnote" data-note="Fonte: IBGE &lt;2024&gt;" class="kt-footnote"',
    );
    expect(renderFootnotes(k.editor.state.doc)).toBe(
      '<ol class="kt-footnotes"><li id="fn-1">Fonte: IBGE &lt;2024&gt;</li><li id="fn-2">Segunda</li></ol>',
    );
  });
});

describe('table of contents block', () => {
  it('lists headings and follows edits', () => {
    const k = make('<h1>Introdução</h1><h2>Objetivos</h2><p></p>');
    k.editor.commands.setTextSelection(k.editor.state.doc.content.size - 1);
    k.run('tocBlock');
    expect(k.editor.getHTML()).toContain(
      '<nav data-type="toc" class="kt-toc"><ol><li class="kt-toc-level-1">Introdução</li><li class="kt-toc-level-2">Objetivos</li></ol></nav>',
    );
    k.editor.commands.insertContentAt(1, 'Nova ');
    expect(k.editor.getHTML()).toContain('<li class="kt-toc-level-1">Nova Introdução</li>');
    expect(collectHeadings(k.editor.state.doc)).toHaveLength(2);
  });

  it('links headings that have ids (TableOfContents feature)', () => {
    const k = make('<h2>Seção</h2><p></p>', { features: { tableOfContents: true } });
    k.editor.commands.setTextSelection(k.editor.state.doc.content.size - 1);
    k.run('tocBlock');
    expect(k.editor.getHTML()).toMatch(
      /<li class="kt-toc-level-2"><a href="#[\w-]+">Seção<\/a><\/li>/,
    );
  });
});

describe('mermaid', () => {
  it('stores source code and shows it without a renderer', () => {
    const k = make();
    k.run('mermaid', 'flowchart TD\n  A --> B');
    expect(k.editor.getHTML()).toContain(
      '<pre data-type="mermaid" class="kt-mermaid"><code>flowchart TD\n  A --&gt; B</code></pre>',
    );
    expect(k.editor.view.dom.querySelector('.kt-mermaid-view pre')?.textContent).toContain(
      'A --> B',
    );
  });

  it('renders SVG with a renderer and strips scripts', async () => {
    const render = vi.fn(
      async () => '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><rect/></svg>',
    );
    const k = make('<p></p>', { insertions: { mermaid: render } });
    k.run('mermaid', 'graph LR; A-->B');
    await flush();
    const view = k.editor.view.dom.querySelector('.kt-mermaid-view')!;
    expect(view.querySelector('svg rect')).not.toBeNull();
    expect(view.querySelector('script')).toBeNull();
    expect(render).toHaveBeenCalledWith('graph LR; A-->B');
  });
});

describe('charts', () => {
  it('parses "label: value" lines (pt-BR numbers)', () => {
    expect(parseChartLines('Jan: 10\nFev; 1.234,5\nlixo\nMar\t-2')).toEqual({
      labels: ['Jan', 'Fev', 'Mar'],
      values: [10, 1234.5, -2],
    });
  });

  it.each(['bar', 'line', 'pie'] as const)('renders %s charts as escaped SVG', (type) => {
    const svg = renderChartSvg({ type, title: '<b>T</b>', labels: ['A', 'B'], values: [3, 1] });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('&lt;b&gt;T&lt;/b&gt;');
    expect(svg).not.toContain('<b>');
  });

  it('inserts a chart from the dialog as data + SVG image', async () => {
    const k = make();
    k.run('chart');
    submit();
    await flush();
    const html = k.editor.getHTML();
    expect(html).toContain('data-type="chart"');
    expect(html).toContain('<img src="data:image/svg+xml;charset=utf-8,');
    const data = JSON.parse(
      new DOMParser()
        .parseFromString(html, 'text/html')
        .querySelector('figure')!
        .getAttribute('data-chart')!,
    );
    expect(data).toEqual({
      type: 'bar',
      labels: ['Janeiro', 'Fevereiro', 'Março'],
      values: [10, 14, 8],
    });
  });

  it('rejects empty or invalid charts', () => {
    const k = make();
    expect(k.run('chart', { type: 'bar', labels: [], values: [] })).toBe(false);
    expect(k.run('chart', { type: 'radar' as never, labels: ['a'], values: [1] })).toBe(false);
  });
});

describe('custom widgets', () => {
  it('registers and renders widgets; rejects invalid names', () => {
    const k = make('<p></p>', {
      insertions: {
        widgets: [
          {
            name: 'alertBox',
            label: 'Alerta',
            defaults: { text: 'Atenção' },
            render: (attrs) => {
              const el = document.createElement('div');
              el.className = 'alerta';
              el.textContent = String(attrs['text']);
              return el;
            },
          },
        ],
      },
    });
    k.run('widget:alertBox', { text: 'Prazo encerrado' });
    expect(k.editor.getHTML()).toContain(
      '<div data-attrs="{&quot;text&quot;:&quot;Prazo encerrado&quot;}" data-widget="alertBox" class="kt-widget"><div class="alerta">Prazo encerrado</div></div>',
    );
    expect(() =>
      make('<p></p>', {
        insertions: { widgets: [{ name: 'x-y', label: 'x', render: () => 'x' }] },
      }),
    ).toThrow(/widget inválido/);
  });
});

describe('templates', () => {
  it('inserts a template picked from the gallery', async () => {
    const k = make('<p></p>', {
      insertions: {
        templates: [
          { id: 'oficio', label: 'Ofício', content: '<h2>Ofício nº</h2><p>Prezados,</p>' },
        ],
      },
    });
    k.run('templates');
    await flush();
    const item = document.querySelector<HTMLButtonElement>('.kt-picker-item')!;
    expect(item.querySelector('img')!.src).toMatch(/^data:image\/svg\+xml/);
    item.click();
    await flush();
    expect(k.editor.getHTML()).toContain('<h2>Ofício nº</h2><p>Prezados,</p>');
  });

  it('accepts async sources and ids', async () => {
    const k = make('<p></p>', {
      insertions: { templates: async () => [{ id: 'a', label: 'A', content: '<p>modelo A</p>' }] },
    });
    k.run('templates', 'a');
    await flush();
    expect(k.editor.getText()).toContain('modelo A');
  });
});

describe('math plugin', () => {
  it('adds inline and block formulas with translated commands', async () => {
    const k = make('<p></p>', { plugins: [mathPlugin()] });
    expect(k.i18n.t('editor.math.inline')).toBe('Fórmula na linha');
    k.run('inlineMath', 'E=mc^2');
    k.run('blockMath');
    document.querySelector<HTMLTextAreaElement>('.kt-dialog textarea')!.value = '\\frac{a}{b}';
    submit();
    await flush();
    const html = k.editor.getHTML();
    expect(html).toContain('<span data-latex="E=mc^2" data-type="inline-math">');
    expect(html).toContain('<div data-latex="\\frac{a}{b}" data-type="block-math">');
    expect(k.editor.view.dom.querySelector('.katex')).not.toBeNull();
  });
});
