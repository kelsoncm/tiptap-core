import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  checkAccessibility,
  contrastRatio,
  createEditor,
  createEditorUI,
  matchesToIssues,
  textWithPositions,
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
  vi.unstubAllGlobals();
});

const make = (content: string, options: KelsonEditorOptions = {}): KelsonEditor => {
  const k = createEditor({ element: document.createElement('div'), content, ...options });
  instance = k;
  return k;
};

describe('contrast', () => {
  it('computes WCAG ratios', () => {
    expect(contrastRatio('#000', '#fff')).toBeCloseTo(21, 0);
    expect(contrastRatio('#777777', '#ffffff')).toBeCloseTo(4.48, 1);
    expect(contrastRatio('rgb(19, 81, 180)', '#fff')).toBeGreaterThan(4.5);
    expect(contrastRatio('red', '#fff')).toBeNull();
  });
});

describe('accessibility checker', () => {
  const html =
    '<h1>Edital</h1><h3>Pulou nível</h3><h2></h2><p><img src="https://x.org/a.png"> <a href="https://x.org">clique aqui</a> <span style="color: #cccccc">claro</span> <span style="color: #1351b4">ok</span></p><table><tbody><tr><td><p>a</p></td></tr></tbody></table>';

  it('reports the common problems', () => {
    const k = make(html);
    const rules = checkAccessibility(k.editor.state.doc).map((i) => i.rule);
    expect(rules).toEqual([
      'heading-order',
      'heading-empty',
      'image-alt',
      'link-text',
      'color-contrast',
      'table-header',
    ]);
  });

  it('passes a clean document', () => {
    const k = make(
      '<h1>Título</h1><h2>Seção</h2><p><img src="https://x.org/a.png" alt="Logo"> <a href="https://x.org">Portal do IFRN</a></p><table><tbody><tr><th><p>h</p></th></tr></tbody></table>',
    );
    expect(checkAccessibility(k.editor.state.doc)).toEqual([]);
  });

  it('highlights translated issues through the command', () => {
    const onIssues = vi.fn();
    const k = make(html, { checkers: { onIssues } });
    k.run('checkAccessibility');
    const [source, issues] = onIssues.mock.calls[0]!;
    expect(source).toBe('accessibility');
    expect(issues[0].message).toBe('Salto de nível de título (de 1 para 3)');
    expect(k.editor.view.dom.querySelectorAll('.kt-issue-accessibility').length).toBeGreaterThan(0);
    k.run('clearIssues');
    expect(k.editor.view.dom.querySelectorAll('.kt-issue').length).toBe(0);
  });
});

describe('spelling', () => {
  it('maps text offsets to document positions across blocks and inline nodes', () => {
    const k = make('<p>Olá mundo</p><p>segunda</p>');
    const map = textWithPositions(k.editor.state.doc);
    expect(map.text).toBe('Olá mundo\n\nsegunda');
    const [issue] = matchesToIssues(map, [
      {
        offset: 11,
        length: 7,
        message: 'Erro',
        rule: { id: 'X', issueType: 'misspelling' },
        replacements: [{ value: 'Segunda' }],
      },
    ]);
    expect(k.editor.state.doc.textBetween(issue!.from, issue!.to)).toBe('segunda');
    expect(issue).toMatchObject({ severity: 'error', replacements: ['Segunda'] });
  });

  it('checks through a LanguageTool endpoint and applies suggestions', async () => {
    const fetchMock = vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            matches: [
              {
                offset: 0,
                length: 5,
                message: 'Possível erro ortográfico',
                rule: { id: 'MORFOLOGIK', issueType: 'misspelling' },
                replacements: [{ value: 'Prazo' }],
              },
            ],
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } },
        ),
    );
    vi.stubGlobal('fetch', fetchMock);
    const k = make('<p>Praso final</p>', {
      checkers: { spellcheck: { languageTool: { endpoint: 'https://lt.example/v2/check' } } },
    });
    k.run('checkSpelling');
    await new Promise((resolve) => setTimeout(resolve, 20));
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://lt.example/v2/check');
    expect(String(init.body)).toContain('language=pt-BR');
    const issues = k.editor.storage.checkers.issues.get('spelling')!;
    expect(k.editor.view.dom.querySelector('.kt-issue-spelling.is-error')?.textContent).toBe(
      'Praso',
    );
    k.editor.commands.applySuggestion(issues[0]!, 'Prazo');
    expect(k.editor.getText()).toBe('Prazo final');
    expect(k.editor.storage.checkers.issues.get('spelling')).toEqual([]);
  });

  it('reports server errors without throwing', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('', { status: 503 })),
    );
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const k = make('<p>texto</p>', {
      checkers: { spellcheck: { languageTool: { endpoint: 'https://lt.example' } } },
    });
    k.run('checkSpelling');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(spy).toHaveBeenCalledWith(
      '[tiptap-core] Verificação ortográfica:',
      expect.objectContaining({ message: expect.stringMatching(/503/) }),
    );
    spy.mockRestore();
  });

  it('is not registered without a server', () => {
    expect(make('<p></p>').commands.has('checkSpelling')).toBe(false);
  });
});

describe('editor accessibility attributes', () => {
  it('sets role, label, lang and spellcheck, following the locale', () => {
    const k = make('<p></p>');
    const dom = k.editor.view.dom;
    expect(dom.getAttribute('role')).toBe('textbox');
    expect(dom.getAttribute('aria-multiline')).toBe('true');
    expect(dom.getAttribute('aria-label')).toBe('Área de edição de texto');
    expect(dom.getAttribute('lang')).toBe('pt-BR');
    expect(dom.getAttribute('spellcheck')).toBe('true');
    k.i18n.setLocale('en');
    expect(dom.getAttribute('lang')).toBe('en');
    expect(dom.getAttribute('aria-label')).toBe('Text editing area');
  });

  it('can disable native spellcheck', () => {
    const k = make('<p></p>', { checkers: { spellcheck: { native: false } } });
    expect(k.editor.view.dom.getAttribute('spellcheck')).toBe('false');
  });
});

describe('checker panel', () => {
  it('runs checks when opened and lists issues', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, { content: '<p><img src="https://x.org/a.png"></p>' });
    instance = ui;
    ui.run('checkerPanel');
    const panel = ui.root.querySelector<HTMLElement>('.kt-checker-panel')!;
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector('.kt-checker-item')?.textContent).toContain(
      'Imagem sem texto alternativo',
    );
    ui.editor.commands.setContent('<p>ok</p>');
    panel.querySelector<HTMLButtonElement>('.kt-button')!.click();
    expect(panel.querySelector('.kt-checker-ok')?.textContent).toBe('Nenhum problema encontrado');
  });
});

describe('locale formatting', () => {
  it('formats numbers in messages with the locale', () => {
    const onIssues = vi.fn();
    const k = make('<p><span style="color: #dddddd">x</span></p>', { checkers: { onIssues } });
    k.run('checkAccessibility');
    expect(onIssues.mock.calls[0]![1][0].message).toBe(
      'Contraste insuficiente (1,4:1; mínimo 4,5:1)',
    );
  });
});
