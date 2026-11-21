import { afterEach, describe, expect, it } from 'vitest';

import {
  BULLET_LIST_OPTIONS,
  createEditor,
  createI18n,
  FONT_FAMILIES,
  getDocumentStats,
  HIGHLIGHT_COLORS,
  LINE_HEIGHTS,
  ORDERED_LIST_OPTIONS,
  parseBulletListType,
  TEXT_COLORS,
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

/** HTML with jsdom's style normalization undone (`a: b;` -> `a: b`). */
const html = (k: KelsonEditor): string => k.editor.getHTML().replace(/;"/g, '"');

describe('typed lists', () => {
  it.each(['lower-roman', 'upper-alpha', 'decimal-leading-zero'] as const)(
    'sets ordered list type %s',
    (type) => {
      const k = make('<ol><li><p>a</p></li></ol>');
      k.editor.commands.setTextSelection(3);
      expect(k.run('orderedListType', type)).toBe(true);
      expect(html(k)).toContain(`data-list-type="${type}"`);
      expect(html(k)).toContain(`list-style-type: ${type}`);
    },
  );

  it('creates the list when the selection is not in one', () => {
    const k = make('<p>a</p>');
    k.run('bulletListType', 'checkbox');
    expect(html(k)).toMatch(/^<ul data-list-type="checkbox" style="list-style-type: [^"]+">/);
    expect(k.editor.state.doc.firstChild?.attrs['listType']).toBe('checkbox');
  });

  it('omits attributes for the default types', () => {
    const k = make('<ul><li><p>a</p></li></ul><ol><li><p>b</p></li></ol>');
    expect(html(k)).toBe('<ul><li><p>a</p></li></ul><ol><li><p>b</p></li></ol>');
  });

  it('reads legacy tiptap-ng bullet values', () => {
    expect(parseBulletListType('"\\2714"')).toBe('check');
    expect(parseBulletListType('"✅"')).toBe('checkmark');
    expect(parseBulletListType('square')).toBe('square');
    expect(parseBulletListType('bogus')).toBeNull();
    const k = make('<ul data-list-type="&quot;\\2610&quot;"><li><p>a</p></li></ul>');
    expect(k.editor.getJSON().content?.[0]?.attrs?.['listType']).toBe('checkbox');
  });

  it('ignores unknown ordered types', () => {
    const k = make('<ol style="list-style-type: hebrew"><li><p>a</p></li></ol>');
    expect(k.editor.getJSON().content?.[0]?.attrs?.['listType']).toBe('decimal');
  });
});

describe('indent', () => {
  it('indents and outdents paragraphs within limits', () => {
    const k = make('<p>a</p>');
    k.run('indent');
    k.run('indent');
    expect(html(k)).toBe('<p data-indent="2" style="margin-left: 60px">a</p>');
    k.run('outdent');
    k.run('outdent');
    expect(k.run('outdent')).toBe(false);
    expect(html(k)).toBe('<p>a</p>');
  });

  it('parses legacy margin-left in pixels', () => {
    const k = make('<p style="margin-left: 90px">a</p>');
    expect(html(k)).toContain('data-indent="3"');
  });

  it('nests list items instead of adding margin', () => {
    const k = make('<ul><li><p>a</p></li><li><p>b</p></li></ul>');
    k.editor.commands.setTextSelection(8);
    expect(k.run('indent')).toBe(true);
    expect(html(k)).toMatch(/^<ul><li><p>a<\/p><ul><li><p>b<\/p><\/li><\/ul><\/li><\/ul>/);
  });
});

describe('text formatting', () => {
  it('applies block line height and removes it', () => {
    const k = make('<p>a</p><h2>b</h2>');
    k.editor.commands.selectAll();
    k.run('lineHeight', '1.5');
    expect(html(k)).toMatch(
      /^<p style="line-height: 1.5">a<\/p><h2 style="line-height: 1.5">b<\/h2>/,
    );
    k.editor.commands.selectAll();
    k.run('lineHeight', null);
    expect(html(k)).not.toContain('line-height');
  });

  it('applies font family, size, color and highlight', () => {
    const k = make('<p>a</p>');
    k.editor.commands.selectAll();
    k.run('fontFamily', 'Georgia, serif');
    k.run('fontSize', '18px');
    k.run('textColor', '#FF0000');
    k.run('highlight', '#FFFF00');
    const out = html(k);
    expect(out).toContain('font-family: Georgia, serif');
    expect(out).toContain('font-size: 18px');
    expect(out).toMatch(/color: (#FF0000|rgb\(255, 0, 0\))/);
    expect(out).toContain('<mark data-color="#FFFF00"');
    k.run('fontSize', null);
    expect(html(k)).not.toContain('font-size');
  });

  it('aligns text and toggles sub/superscript', () => {
    const k = make('<p>a</p>');
    k.editor.commands.selectAll();
    k.run('align-justify');
    expect(k.commands.get('align-justify')!.isActive!(k.editor)).toBe(true);
    k.run('superscript');
    expect(html(k)).toBe('<p style="text-align: justify"><sup>a</sup></p>');
    // Subscript and superscript are mutually exclusive.
    k.run('subscript');
    expect(html(k)).toBe('<p style="text-align: justify"><sub>a</sub></p>');
    k.run('superscript');
    expect(html(k)).toBe('<p style="text-align: justify"><sup>a</sup></p>');
  });
});

describe('page break', () => {
  it('inserts a page break block', () => {
    const k = make('<p>a</p>');
    k.editor.commands.setTextSelection(2);
    k.run('pageBreak');
    expect(html(k)).toContain('<div data-type="page-break" class="page-break"');
    expect(html(k)).toContain('break-after: page');
  });

  it('round-trips through HTML', () => {
    const k = make('<p>a</p><div data-type="page-break"></div><p>b</p>');
    expect(k.editor.getJSON().content?.map((n) => n.type)).toEqual([
      'paragraph',
      'pageBreak',
      'paragraph',
    ]);
  });
});

describe('tables', () => {
  const tableHtml =
    '<table><tbody><tr><th><p>h</p></th><th><p>i</p></th></tr><tr><td><p>a</p></td><td><p>b</p></td></tr></tbody></table>';

  it('inserts a table and runs row/column commands', () => {
    const k = make('<p></p>');
    expect(k.run('insertTable', { rows: 2, cols: 2 })).toBe(true);
    expect(k.commands.get('insertTable')!.isEnabled!(k.editor)).toBe(false);
    k.run('addColumnAfter');
    k.run('addRowAfter');
    expect(k.editor.getHTML().match(/<tr>/g)).toHaveLength(3);
    expect(k.editor.getHTML().match(/<th/g)).toHaveLength(3);
    k.run('deleteTable');
    expect(html(k)).not.toContain('<table');
  });

  it('disables table commands outside a table', () => {
    const k = make('<p>a</p>');
    expect(k.run('addRowAfter')).toBe(false);
  });

  it('stores cell vertical alignment and background color', () => {
    const k = make(tableHtml);
    k.editor.commands.setTextSelection(4);
    k.run('cellVerticalAlign', 'middle');
    k.run('cellBackground', '#FFE4B5');
    const cell = k.editor.state.doc.firstChild?.firstChild?.firstChild;
    expect(cell?.attrs).toMatchObject({ verticalAlign: 'middle', backgroundColor: '#FFE4B5' });
    expect(html(k)).toMatch(
      /<th style="vertical-align: middle; background-color: [^"]+" data-background-color="#FFE4B5">/,
    );
  });

  it('rejects unsafe cell colors', () => {
    const k = make(
      '<table><tbody><tr><td style="background-color: red"><p>a</p></td></tr></tbody></table>',
    );
    k.editor.commands.setTextSelection(4);
    k.run('cellBackground', 'red; position: fixed');
    expect(html(k)).not.toContain('position');
  });

  it('sets, moves and removes the caption without breaking the table', () => {
    const k = make(tableHtml);
    k.editor.commands.setTextSelection(4);
    k.run('tableCaption', { text: 'Tabela 1', side: 'bottom' });
    expect(html(k)).toContain('<caption style="caption-side: bottom">Tabela 1</caption>');
    k.editor.commands.setTableCaptionSide('top');
    expect(html(k)).toContain('<caption style="caption-side: top">Tabela 1</caption>');
    // Table commands still work with a caption.
    expect(k.run('addRowAfter')).toBe(true);
    k.run('tableCaption', null);
    expect(html(k)).not.toContain('<caption');
  });

  it('parses a caption from HTML without creating extra cells', () => {
    const k = make(
      '<table><caption style="caption-side: bottom">Legenda</caption><tbody><tr><td><p>a</p></td></tr></tbody></table>',
    );
    const table = k.editor.getJSON().content?.[0];
    expect(table?.attrs?.['caption']).toBe('Legenda');
    expect(table?.attrs?.['captionSide']).toBe('bottom');
    expect(table?.content).toHaveLength(1);
    expect(k.editor.getText()).not.toContain('Legenda');
  });
});

describe('features', () => {
  it('omits commands and extensions of disabled features', () => {
    const k = make('<p>a</p>', { features: { table: false, fontSize: false } });
    expect(k.commands.has('insertTable')).toBe(false);
    expect(k.commands.has('fontSize')).toBe(false);
    expect(k.commands.has('fontFamily')).toBe(true);
    expect(k.editor.extensionManager.extensions.some((e) => e.name === 'table')).toBe(false);
  });

  it('keeps StarterKit lists when typed lists are disabled', () => {
    const k = make('<ul><li><p>a</p></li></ul>', { features: { listTypes: false } });
    expect(k.commands.has('bulletListType')).toBe(false);
    expect(html(k)).toBe('<ul><li><p>a</p></li></ul>');
  });

  it('enables the table of contents on demand', () => {
    const k = make('<h1>a</h1>', { features: { tableOfContents: true } });
    expect(k.editor.extensionManager.extensions.some((e) => e.name === 'tableOfContents')).toBe(
      true,
    );
  });
});

describe('document stats', () => {
  it('counts characters, words and non-empty paragraphs', () => {
    const k = make('<h1>Olá mundo</h1><p>um  dois</p><p></p><ul><li><p>três</p></li></ul>');
    expect(getDocumentStats(k.editor.state.doc)).toEqual({
      characters: 18,
      charactersWithSpaces: 23,
      words: 5,
      paragraphs: 3,
    });
  });

  it('returns zeros for an empty document', () => {
    const k = make('');
    expect(getDocumentStats(k.editor.state.doc)).toEqual({
      characters: 0,
      charactersWithSpaces: 0,
      words: 0,
      paragraphs: 0,
    });
  });
});

describe('options and i18n', () => {
  const i18n = createI18n();

  it.each([
    ['FONT_FAMILIES', FONT_FAMILIES],
    ['LINE_HEIGHTS', LINE_HEIGHTS],
    ['TEXT_COLORS', TEXT_COLORS],
    ['HIGHLIGHT_COLORS', HIGHLIGHT_COLORS],
    ['ORDERED_LIST_OPTIONS', ORDERED_LIST_OPTIONS],
    ['BULLET_LIST_OPTIONS', BULLET_LIST_OPTIONS],
  ])('%s labels resolve', (_name, items) => {
    for (const item of items) {
      if (item.labelKey) expect(i18n.t(item.labelKey)).not.toBe(item.labelKey);
      else expect(item.label).toBeTruthy();
    }
  });

  it('every command label resolves in every locale', () => {
    const k = make('<p></p>', { features: { tableOfContents: true } });
    for (const locale of i18n.locales) {
      i18n.setLocale(locale);
      for (const command of k.commands.list()) {
        expect(i18n.t(command.labelKey, command.labelParams), `${locale}:${command.id}`).not.toBe(
          command.labelKey,
        );
      }
    }
  });
});
