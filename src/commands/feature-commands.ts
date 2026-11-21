import type { Editor } from '@tiptap/core';

import type { BulletListType, OrderedListType } from '../extensions/list-types.js';
import type { CaptionSide, VerticalAlign } from '../extensions/table.js';
import type { EditorFeatures } from '../editor/features.js';
import type { CommandDefinition } from './registry.js';

const editable = (editor: Editor): boolean => editor.isEditable;
const inTable = (editor: Editor): boolean => editor.isEditable && editor.isActive('table');

/** Value payload: a string sets the value, `null` or `''` removes it. */
export type ValuePayload = string | null | undefined;

export interface InsertTablePayload {
  rows?: number;
  cols?: number;
  withHeaderRow?: boolean;
}

export interface TableCaptionPayload {
  text: string;
  side?: CaptionSide;
}

const valueCommand = (
  id: string,
  labelKey: string,
  group: string,
  set: (editor: Editor, value: string) => boolean,
  unset: (editor: Editor) => boolean,
  isActive?: (editor: Editor) => boolean,
): CommandDefinition<ValuePayload> => ({
  id,
  labelKey,
  group,
  icon: id,
  isEnabled: editable,
  ...(isActive ? { isActive } : {}),
  run: (editor, value) => (value ? set(editor, value) : unset(editor)),
});

const tableCommand = (
  id: string,
  labelKey: string,
  run: (editor: Editor) => boolean,
): CommandDefinition => ({
  id,
  labelKey: `editor.table.${labelKey}`,
  icon: id,
  group: 'table',
  isEnabled: inTable,
  run,
});

const attr = (editor: Editor, type: string, name: string): string | null => {
  const value: unknown = editor.getAttributes(type)[name];
  return typeof value === 'string' && value ? value : null;
};

const listValue =
  (type: string, fallback: string) =>
  (editor: Editor): string | null =>
    editor.isActive(type) ? (attr(editor, type, 'listType') ?? fallback) : null;

/** Current-value readers for the value commands, used by selects in toolbars. */
const VALUE_GETTERS: Record<string, (editor: Editor) => string | null> = {
  fontFamily: (e) => attr(e, 'textStyle', 'fontFamily'),
  fontSize: (e) => attr(e, 'textStyle', 'fontSize'),
  textColor: (e) => attr(e, 'textStyle', 'color'),
  highlight: (e) => attr(e, 'highlight', 'color'),
  lineHeight: (e) => attr(e, 'paragraph', 'lineHeight') ?? attr(e, 'heading', 'lineHeight'),
  orderedListType: listValue('orderedList', 'decimal'),
  bulletListType: listValue('bulletList', 'disc'),
  cellVerticalAlign: (e) =>
    attr(e, 'tableCell', 'verticalAlign') ?? attr(e, 'tableHeader', 'verticalAlign'),
  cellBorderColor: (e) =>
    attr(e, 'tableCell', 'borderColor') ?? attr(e, 'tableHeader', 'borderColor'),
  cellBackground: (e) =>
    attr(e, 'tableCell', 'backgroundColor') ?? attr(e, 'tableHeader', 'backgroundColor'),
};

/** Commands for the optional features, registered by `createEditor` when enabled. */
export function featureCommands(features: Readonly<EditorFeatures>): CommandDefinition<never>[] {
  const out: CommandDefinition<never>[] = [];
  const add = <P>(command: CommandDefinition<P>): void => {
    const getValue = VALUE_GETTERS[command.id];
    const withValue = getValue && !command.getValue ? { ...command, getValue } : command;
    out.push(withValue as unknown as CommandDefinition<never>);
  };

  if (features.subscript) {
    add({
      id: 'subscript',
      labelKey: 'editor.toolbar.subscript',
      icon: 'subscript',
      shortcut: 'Mod-,',
      group: 'marks',
      isActive: (e) => e.isActive('subscript'),
      isEnabled: editable,
      run: (e) => e.chain().focus().unsetSuperscript().toggleSubscript().run(),
    });
  }
  if (features.superscript) {
    add({
      id: 'superscript',
      labelKey: 'editor.toolbar.superscript',
      icon: 'superscript',
      shortcut: 'Mod-.',
      group: 'marks',
      isActive: (e) => e.isActive('superscript'),
      isEnabled: editable,
      run: (e) => e.chain().focus().unsetSubscript().toggleSuperscript().run(),
    });
  }
  if (features.fontFamily) {
    add(
      valueCommand(
        'fontFamily',
        'editor.toolbar.fontFamily',
        'font',
        (e, v) => e.chain().focus().setFontFamily(v).run(),
        (e) => e.chain().focus().unsetFontFamily().run(),
      ),
    );
  }
  if (features.fontSize) {
    add(
      valueCommand(
        'fontSize',
        'editor.toolbar.fontSize',
        'font',
        (e, v) => e.chain().focus().setFontSize(v).run(),
        (e) => e.chain().focus().unsetFontSize().run(),
      ),
    );
  }
  if (features.textColor) {
    add(
      valueCommand(
        'textColor',
        'editor.toolbar.textColor',
        'font',
        (e, v) => e.chain().focus().setColor(v).run(),
        (e) => e.chain().focus().unsetColor().run(),
      ),
    );
  }
  if (features.highlight) {
    add(
      valueCommand(
        'highlight',
        'editor.toolbar.highlightColor',
        'font',
        (e, v) => e.chain().focus().setHighlight({ color: v }).run(),
        (e) => e.chain().focus().unsetHighlight().run(),
        (e) => e.isActive('highlight'),
      ),
    );
  }
  if (features.lineHeight) {
    add(
      valueCommand(
        'lineHeight',
        'editor.toolbar.lineHeight',
        'text',
        (e, v) => e.chain().focus().setBlockLineHeight(v).run(),
        (e) => e.chain().focus().unsetBlockLineHeight().run(),
      ),
    );
  }
  if (features.textAlign) {
    for (const [align, key] of [
      ['left', 'alignLeft'],
      ['center', 'alignCenter'],
      ['right', 'alignRight'],
      ['justify', 'alignJustify'],
    ] as const) {
      add({
        id: `align-${align}`,
        labelKey: `editor.toolbar.${key}`,
        icon: `align-${align}`,
        group: 'align',
        isActive: (e) => e.isActive({ textAlign: align }),
        isEnabled: editable,
        run: (e) => e.chain().focus().setTextAlign(align).run(),
      });
    }
  }
  if (features.indent) {
    add({
      id: 'indent',
      labelKey: 'editor.toolbar.indent',
      icon: 'indent',
      group: 'text',
      isEnabled: editable,
      run: (e) => e.chain().focus().indent().run(),
    });
    add({
      id: 'outdent',
      labelKey: 'editor.toolbar.outdent',
      icon: 'outdent',
      group: 'text',
      isEnabled: editable,
      run: (e) => e.chain().focus().outdent().run(),
    });
  }
  if (features.listTypes) {
    add<OrderedListType>({
      id: 'orderedListType',
      labelKey: 'editor.toolbar.orderedListType',
      icon: 'list-ol',
      group: 'lists',
      isEnabled: editable,
      run: (e, type) => e.chain().focus().setOrderedListType(type).run(),
    });
    add<BulletListType>({
      id: 'bulletListType',
      labelKey: 'editor.toolbar.bulletListType',
      icon: 'list-ul',
      group: 'lists',
      isEnabled: editable,
      run: (e, type) => e.chain().focus().setBulletListType(type).run(),
    });
  }
  if (features.taskList) {
    add({
      id: 'taskList',
      labelKey: 'editor.toolbar.taskList',
      icon: 'task-list',
      shortcut: 'Mod-Shift-9',
      group: 'lists',
      isActive: (e) => e.isActive('taskList'),
      isEnabled: editable,
      run: (e) => e.chain().focus().toggleTaskList().run(),
    });
  }
  if (features.pageBreak) {
    add({
      id: 'pageBreak',
      labelKey: 'editor.toolbar.pageBreak',
      icon: 'page-break',
      shortcut: 'Mod-Enter',
      group: 'insert',
      isEnabled: editable,
      run: (e) => e.chain().focus().setPageBreak().run(),
    });
  }
  if (features.table) {
    add<InsertTablePayload | undefined>({
      id: 'insertTable',
      labelKey: 'editor.table.insert',
      icon: 'table',
      group: 'insert',
      isEnabled: (e) => editable(e) && !e.isActive('table'),
      run: (e, p) =>
        e
          .chain()
          .focus()
          .insertTable({
            rows: p?.rows ?? 3,
            cols: p?.cols ?? 3,
            withHeaderRow: p?.withHeaderRow ?? true,
          })
          .run(),
    });
    add(tableCommand('deleteTable', 'delete', (e) => e.chain().focus().deleteTable().run()));
    add(
      tableCommand('addRowBefore', 'addRowBefore', (e) => e.chain().focus().addRowBefore().run()),
    );
    add(tableCommand('addRowAfter', 'addRowAfter', (e) => e.chain().focus().addRowAfter().run()));
    add(tableCommand('deleteRow', 'deleteRow', (e) => e.chain().focus().deleteRow().run()));
    add(
      tableCommand('addColumnBefore', 'addColumnBefore', (e) =>
        e.chain().focus().addColumnBefore().run(),
      ),
    );
    add(
      tableCommand('addColumnAfter', 'addColumnAfter', (e) =>
        e.chain().focus().addColumnAfter().run(),
      ),
    );
    add(
      tableCommand('deleteColumn', 'deleteColumn', (e) => e.chain().focus().deleteColumn().run()),
    );
    add(tableCommand('mergeCells', 'mergeCells', (e) => e.chain().focus().mergeCells().run()));
    add(tableCommand('splitCell', 'splitCell', (e) => e.chain().focus().splitCell().run()));
    add(
      tableCommand('toggleHeaderRow', 'toggleHeader', (e) =>
        e.chain().focus().toggleHeaderRow().run(),
      ),
    );
    add<VerticalAlign | null>({
      ...tableCommand('cellVerticalAlign', 'cellAlign', () => false),
      run: (e, align) =>
        e
          .chain()
          .focus()
          .setCellAttribute('verticalAlign', align ?? null)
          .run(),
    });
    add<ValuePayload>({
      ...tableCommand('cellBackground', 'cellBackground', () => false),
      run: (e, color) =>
        e
          .chain()
          .focus()
          .setCellAttribute('backgroundColor', color || null)
          .run(),
    });
    const tableAttr =
      (name: string) =>
      (e: Editor): string | null =>
        e.isActive('table')
          ? ((e.getAttributes('table')[name] as string | null) ??
            (name === 'borderColor' ? null : ''))
          : null;
    for (const [id, attr, labelKey] of [
      ['tableWidth', 'width', 'width'],
      ['tableAlign', 'align', 'align'],
      ['tableLayout', 'layout', 'layout'],
      ['tableStyle', 'tableStyle', 'style'],
      ['tableBorderColor', 'borderColor', 'borderColor'],
    ] as const) {
      add<ValuePayload>({
        ...tableCommand(id, labelKey, () => false),
        getValue: tableAttr(attr),
        run: (e, value) =>
          e
            .chain()
            .focus()
            .setTableProperties({ [attr]: value || null })
            .run(),
      });
    }
    add<ValuePayload>({
      ...tableCommand('cellBorderColor', 'cellBorderColor', () => false),
      run: (e, color) =>
        e
          .chain()
          .focus()
          .setCellProperties({ borderColor: color || null })
          .run(),
    });
    add(
      tableCommand('duplicateTable', 'duplicate', (e) => e.chain().focus().duplicateTable().run()),
    );
    add(tableCommand('selectTable', 'selectTable', (e) => e.chain().focus().selectTable().run()));
    add(
      tableCommand('paragraphBeforeTable', 'paragraphBefore', (e) =>
        e.chain().focus().insertParagraphNearTable('before').run(),
      ),
    );
    add(
      tableCommand('paragraphAfterTable', 'paragraphAfter', (e) =>
        e.chain().focus().insertParagraphNearTable('after').run(),
      ),
    );
    add(tableCommand('selectRow', 'selectRow', (e) => e.chain().focus().selectTableRow().run()));
    add(
      tableCommand('selectColumn', 'selectColumn', (e) =>
        e.chain().focus().selectTableColumn().run(),
      ),
    );
    add({
      ...tableCommand('toggleFooterRow', 'toggleFooter', (e) =>
        e.chain().focus().toggleFooterRow().run(),
      ),
      isActive: (e) => {
        const { $from } = e.state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          const node = $from.node(depth);
          if (node.type.name === 'table') return node.lastChild?.attrs['footer'] === true;
        }
        return false;
      },
    });
    add<TableCaptionPayload | null | undefined>({
      ...tableCommand('tableCaption', 'addCaption', () => false),
      isActive: (e) => Boolean(e.isActive('table') && e.getAttributes('table')['caption']),
      run: (e, p) => {
        if (p === undefined) {
          // Toolbar button: remove an existing caption, or ask for the text.
          if (e.getAttributes('table')['caption'])
            return e.chain().focus().unsetTableCaption().run();
          const text = typeof window !== 'undefined' ? window.prompt?.('') : null;
          return text ? e.chain().focus().setTableCaption(text).run() : false;
        }
        return p?.text
          ? e.chain().focus().setTableCaption(p.text, p.side).run()
          : e.chain().focus().unsetTableCaption().run();
      },
    });
  }
  return out;
}
