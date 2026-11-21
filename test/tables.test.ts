import { CellSelection } from '@tiptap/pm/tables';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createEditor,
  createEditorUI,
  createI18n,
  sanitizeTableProperties,
  TABLE_ALIGN_OPTIONS,
  TABLE_COLORS,
  TABLE_LAYOUT_OPTIONS,
  TABLE_STYLE_OPTIONS,
  TABLE_WIDTH_OPTIONS,
  VERTICAL_ALIGN_OPTIONS,
  type KelsonEditor,
} from '../src/index.js';

const TABLE =
  '<table><tbody><tr><th><p>h1</p></th><th><p>h2</p></th></tr><tr><td><p>a</p></td><td><p>b</p></td></tr><tr><td><p>t1</p></td><td><p>t2</p></td></tr></tbody></table>';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content = TABLE): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content });
  instance.editor.commands.setTextSelection(4); // inside "h1"
  return instance;
};

const tableAttrs = (k: KelsonEditor): Record<string, unknown> =>
  k.editor.state.doc.firstChild?.attrs ?? {};

describe('table properties', () => {
  it('sanitizes values', () => {
    expect(
      sanitizeTableProperties({
        width: '100%',
        align: 'center',
        layout: 'fixed',
        borderColor: '#333',
        tableStyle: 'striped',
      }),
    ).toEqual({
      width: '100%',
      align: 'center',
      layout: 'fixed',
      borderColor: '#333',
      tableStyle: 'striped',
    });
    expect(
      sanitizeTableProperties({
        width: '100%; position: fixed',
        align: 'middle' as never,
        borderColor: 'red}',
        tableStyle: '',
      } as never),
    ).toEqual({ tableStyle: null });
  });

  it('applies width, alignment, layout, border color and style', () => {
    const k = make();
    k.run('tableWidth', '100%');
    k.run('tableAlign', 'center');
    k.run('tableLayout', 'fixed');
    k.run('tableBorderColor', '#336699');
    k.run('tableStyle', 'striped');
    expect(tableAttrs(k)).toMatchObject({
      width: '100%',
      align: 'center',
      layout: 'fixed',
      borderColor: '#336699',
      tableStyle: 'striped',
    });
    const html = k.editor.getHTML();
    expect(html).toContain('data-table-style="striped"');
    expect(html).toMatch(/class="tiptap-table kt-table-striped"/);
    expect(html).toMatch(
      /width: 100%; table-layout: fixed; margin-left: auto; margin-right: auto; --kt-table-border: #336699/,
    );
    expect(k.commands.get('tableStyle')!.getValue!(k.editor)).toBe('striped');
    // The editable view (TableView) receives the same presentation.
    const dom = k.editor.view.dom.querySelector('table')!;
    expect(dom.classList.contains('kt-table-striped')).toBe(true);
    expect(dom.style.tableLayout).toBe('fixed');
  });

  it('clears properties with null/empty values and round-trips through HTML', () => {
    const k = make();
    k.run('tableWidth', '75%');
    const html = k.editor.getHTML();
    k.run('tableWidth', '');
    expect(tableAttrs(k)['width']).toBeNull();
    k.editor.commands.setContent(html);
    expect(tableAttrs(k)['width']).toBe('75%');
  });
});

describe('table structure commands', () => {
  it('duplicates the table', () => {
    const k = make();
    k.run('duplicateTable');
    expect(k.editor.getHTML().match(/<table/g)).toHaveLength(2);
  });

  it('selects the whole table', () => {
    const k = make();
    k.run('selectTable');
    // prosemirror-tables normalizes a table node selection to a CellSelection of all cells.
    const sel = k.editor.state.selection as CellSelection;
    expect(sel.isRowSelection() && sel.isColSelection()).toBe(true);
  });

  it('inserts paragraphs before and after the table', () => {
    const k = make();
    k.run('paragraphBeforeTable');
    expect(k.editor.state.doc.firstChild?.type.name).toBe('paragraph');
    k.editor.commands.setTextSelection(6);
    k.run('paragraphAfterTable');
    const types: string[] = [];
    k.editor.state.doc.forEach((n) => types.push(n.type.name));
    expect(types.slice(0, 3)).toEqual(['paragraph', 'table', 'paragraph']);
  });

  it('selects rows and columns', () => {
    const k = make();
    k.run('selectRow');
    let sel = k.editor.state.selection as CellSelection;
    expect(sel).toBeInstanceOf(CellSelection);
    expect(sel.isRowSelection()).toBe(true);
    k.editor.commands.setTextSelection(4);
    k.run('selectColumn');
    sel = k.editor.state.selection as CellSelection;
    expect(sel.isColSelection()).toBe(true);
  });

  it('toggles the footer row', () => {
    const k = make();
    k.run('toggleFooterRow');
    expect(k.editor.getHTML()).toContain('<tr data-footer="true" class="kt-table-footer">');
    expect(k.commands.get('toggleFooterRow')!.isActive!(k.editor)).toBe(true);
    k.run('toggleFooterRow');
    expect(k.editor.getHTML()).not.toContain('data-footer');
  });

  it('parses <tfoot> rows as footer rows', () => {
    const k = make(
      '<table><tbody><tr><td><p>a</p></td></tr></tbody><tfoot><tr><td><p>total</p></td></tr></tfoot></table>',
    );
    expect(k.editor.state.doc.firstChild?.lastChild?.attrs['footer']).toBe(true);
  });
});

describe('cell properties', () => {
  it('sets background, vertical alignment and border color; rejects unsafe values', () => {
    const k = make();
    k.editor.commands.setCellProperties({
      backgroundColor: '#ffeeaa',
      verticalAlign: 'bottom',
      borderColor: 'navy',
    });
    k.run('cellBorderColor', 'red; x: y');
    const cell = k.editor.state.doc.firstChild?.firstChild?.firstChild;
    expect(cell?.attrs).toMatchObject({
      backgroundColor: '#ffeeaa',
      verticalAlign: 'bottom',
      borderColor: null,
    });
    k.run('cellBorderColor', 'navy');
    expect(k.commands.get('cellBorderColor')!.getValue!(k.editor)).toBe('navy');
  });
});

describe('caption command', () => {
  it('prompts for the text when run from a button and removes an existing caption', () => {
    const k = make();
    const prompt = vi.spyOn(window, 'prompt').mockReturnValue('Tabela 1');
    k.run('tableCaption');
    expect(tableAttrs(k)['caption']).toBe('Tabela 1');
    expect(k.commands.get('tableCaption')!.isActive!(k.editor)).toBe(true);
    k.run('tableCaption');
    expect(tableAttrs(k)['caption']).toBeNull();
    prompt.mockReturnValue(null);
    expect(k.run('tableCaption')).toBe(false);
    prompt.mockRestore();
  });
});

describe('table menu', () => {
  it('builds the contextual table toolbar and option labels resolve', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, { content: TABLE });
    const i18n = createI18n();
    for (const list of [
      TABLE_ALIGN_OPTIONS,
      TABLE_COLORS,
      TABLE_LAYOUT_OPTIONS,
      TABLE_STYLE_OPTIONS,
      TABLE_WIDTH_OPTIONS,
      VERTICAL_ALIGN_OPTIONS,
    ]) {
      for (const item of list) {
        if (item.labelKey) expect(i18n.t(item.labelKey)).not.toBe(item.labelKey);
      }
    }
    for (const command of ui.commands.list('table')) {
      expect(i18n.t(command.labelKey), command.id).not.toBe(command.labelKey);
    }
    ui.destroy();
  });

  it('can be disabled', () => {
    const host = document.createElement('div');
    const ui = createEditorUI(host, { content: TABLE, tableMenu: false });
    expect(
      ui.editor.extensionManager.extensions.filter((e) => e.name === 'bubbleMenu'),
    ).toHaveLength(2);
    ui.destroy();
  });
});
