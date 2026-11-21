import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  cleanPastedHtml,
  createEditor,
  inlineStyles,
  isGoogleDocsHtml,
  isOfficeHtml,
  looksLikeMarkdown,
  safeFilename,
  toWordDocument,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';
import { docxToHtml, officePlugin } from '../src/office.js';

let instance: KelsonEditor | undefined;
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

const make = (content = '<p></p>', options: KelsonEditorOptions = {}): KelsonEditor => {
  const element = document.createElement('div');
  document.body.append(element);
  instance = createEditor({ element, content, ...options });
  return instance;
};

/** Simulates a paste through ProseMirror's paste handler. */
const paste = (k: KelsonEditor, data: Record<string, string>): void => {
  const clipboardData = {
    getData: (type: string) => data[type] ?? '',
    types: Object.keys(data),
    files: [] as unknown as FileList,
    items: [] as unknown as DataTransferItemList,
  };
  const event = new Event('paste', { bubbles: true, cancelable: true }) as ClipboardEvent;
  Object.defineProperty(event, 'clipboardData', { value: clipboardData });
  k.editor.view.dom.dispatchEvent(event);
};

const WORD_HTML = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><style>p.MsoNormal{margin:0}</style></head><body>
<p class="MsoNormal" style="margin-bottom:0cm;line-height:normal"><b><span style="font-size:14pt;color:#1F3864">Título</span></b><o:p></o:p></p>
<p class="MsoListParagraphCxSpFirst" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">1.<span>&nbsp;</span></span>Primeiro</p>
<p class="MsoListParagraphCxSpMiddle" style="mso-list:l0 level2 lfo1"><span style="mso-list:Ignore">a.<span>&nbsp;</span></span>Sub</p>
<p class="MsoListParagraphCxSpLast" style="mso-list:l0 level1 lfo1"><span style="mso-list:Ignore">2.<span>&nbsp;</span></span>Segundo</p>
<p class="MsoNormal"><o:p>&nbsp;</o:p></p>
<p class="MsoNormal"><span style="font-style:italic">itálico</span> e <span style="text-decoration:underline">sublinhado</span></p>
</body></html>`;

const GDOCS_HTML =
  '<meta charset="utf-8"><b style="font-weight:normal;" id="docs-internal-guid-abc"><p dir="ltr" style="line-height:1.38"><span style="font-size:11pt;font-weight:700;color:#ff0000">Negrito</span><span style="font-size:11pt"> normal</span></p></b>';

describe('paste cleanup', () => {
  it('detects Office and Google Docs HTML', () => {
    expect(isOfficeHtml(WORD_HTML)).toBe(true);
    expect(isGoogleDocsHtml(GDOCS_HTML)).toBe(true);
    expect(isOfficeHtml('<p>simples</p>')).toBe(false);
  });

  it('converts Word fake lists into nested lists and keeps basic marks', () => {
    const html = cleanPastedHtml(WORD_HTML);
    expect(html).toContain('<ol><li>Primeiro<ol><li>Sub</li></ol></li><li>Segundo</li></ol>');
    expect(html).toContain('<b>Título</b>');
    expect(html).toContain('<em>itálico</em>');
    expect(html).toContain('<u>sublinhado</u>');
    expect(html).not.toMatch(/class=|mso-|o:p|<style/);
    expect(html).not.toMatch(/<p>\s*<\/p>/);
  });

  it('keeps colors and sizes in enhanced mode', () => {
    expect(cleanPastedHtml(WORD_HTML, { keepFormatting: true })).toContain(
      'color: rgb(31, 56, 100)',
    );
    expect(cleanPastedHtml(WORD_HTML)).not.toContain('color');
  });

  it('cleans Google Docs wrappers and style-based bold', () => {
    const html = cleanPastedHtml(GDOCS_HTML);
    expect(html).toBe('<p dir="ltr"><strong>Negrito</strong> normal</p>');
  });

  it('cleans Office HTML on paste', () => {
    const k = make();
    k.editor.commands.focus();
    paste(k, { 'text/html': WORD_HTML, 'text/plain': 'x' });
    expect(k.editor.getHTML()).toContain(
      '<ol><li><p>Primeiro</p><ol><li><p>Sub</p></li></ol></li>',
    );
    expect(k.editor.getHTML()).not.toContain('mso');
  });
});

describe('plain text and markdown paste', () => {
  it('detects markdown text', () => {
    expect(looksLikeMarkdown('# Título\n\ntexto')).toBe(true);
    expect(looksLikeMarkdown('- item\n- **forte**')).toBe(true);
    expect(looksLikeMarkdown('texto normal, sem marcação')).toBe(false);
    expect(looksLikeMarkdown('<p># não</p>')).toBe(false);
  });

  it('pastes markdown as rich content', () => {
    const k = make();
    k.editor.commands.focus();
    paste(k, { 'text/plain': '## Seção\n\n- um\n- **dois**' });
    expect(k.editor.getHTML()).toContain('<h2>Seção</h2>');
    expect(k.editor.getHTML()).toContain('<strong>dois</strong>');
  });

  it('pastes everything as plain text when the mode is on', () => {
    const k = make();
    k.editor.commands.focus();
    k.run('pastePlainText');
    expect(k.commands.get('pastePlainText')!.isActive!(k.editor)).toBe(true);
    paste(k, { 'text/html': '<h1><b>Rico</b></h1>', 'text/plain': '# Rico' });
    expect(k.editor.getHTML()).toBe('<p># Rico</p>');
  });
});

describe('markdown and exports', () => {
  it('serializes to markdown', () => {
    const k = make(
      '<h2>Título</h2><p>Texto <strong>forte</strong> e <em>itálico</em>.</p><ul><li><p>item</p></li></ul>',
    );
    expect(k.getMarkdown()).toBe('## Título\n\nTexto **forte** e *itálico*.\n\n- item');
  });

  it('builds a Word document', () => {
    const doc = toWordDocument('<p>Olá</p>', 'Ofício <1>');
    expect(doc).toContain('xmlns:w="urn:schemas-microsoft-com:office:word"');
    expect(doc).toContain('<title>Ofício &lt;1&gt;</title>');
    expect(doc).toContain('@page');
    expect(doc).toContain('<body><p>Olá</p></body>');
  });

  it('inlines computed styles', () => {
    const html = inlineStyles(
      '<p class="x">a</p>',
      '.x { color: rgb(255, 0, 0); text-align: center; }',
    );
    expect(html).toContain('color: rgb(255, 0, 0)');
    expect(html).toContain('text-align: center');
    expect(html).not.toContain('class=');
  });

  it('makes safe file names', () => {
    expect(safeFilename('Edital nº 12/2026 – Seleção', 'doc')).toBe('Edital-n-12-2026-Selecao.doc');
    expect(safeFilename('***', 'md')).toBe('documento.md');
  });

  it('downloads exports with the configured name', () => {
    const k = make('<p>a</p>', { io: { filename: 'Meu edital' } });
    const clicks: string[] = [];
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
      this: HTMLAnchorElement,
    ) {
      clicks.push(this.download);
    });
    URL.createObjectURL = vi.fn(() => 'blob:x');
    URL.revokeObjectURL = vi.fn();
    k.run('exportMarkdown');
    k.run('exportWord');
    k.run('exportHtml');
    expect(clicks).toEqual(['Meu-edital.md', 'Meu-edital.doc', 'Meu-edital.html']);
  });
});

describe('office plugin', () => {
  it('converts .docx through mammoth and cleans the result', async () => {
    const mammoth = {
      convertToHtml: vi.fn(async () => ({
        value: '<p class="x">Do Word</p><p></p>',
        messages: [],
      })),
    };
    expect(await docxToHtml(new Blob(['x']), mammoth)).toBe('<p>Do Word</p>');
    const k = make('<p></p>', { plugins: [officePlugin({ mammoth })] });
    expect(k.i18n.t('editor.io.importWord')).toBe('Importar do Word (.docx)');
    k.run('importWord', new Blob(['x']));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(k.editor.getText()).toContain('Do Word');
  });

  it('reports conversion errors', async () => {
    const onError = vi.fn();
    const mammoth = {
      convertToHtml: vi.fn(async () => Promise.reject(new Error('arquivo corrompido'))),
    };
    const k = make('<p></p>', { plugins: [officePlugin({ mammoth, onError })] });
    k.run('importWord', new Blob(['x']));
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(onError).toHaveBeenCalledWith(new Error('arquivo corrompido'));
  });
});
