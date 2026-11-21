/**
 * Default text icons, so the core has no icon-font dependency. Adapters can pass
 * `renderIcon` to use Font Awesome, Material Symbols, SVG sprites, etc.
 */
export const DEFAULT_ICONS: Readonly<Record<string, string>> = {
  undo: '↶',
  redo: '↷',
  bold: 'B',
  italic: 'I',
  underline: 'U',
  strikethrough: 'S',
  code: '</>',
  subscript: 'x₂',
  superscript: 'x²',
  'remove-format': 'Tₓ',
  paragraph: '¶',
  quote: '❝',
  'code-block': '{ }',
  'list-ul': '•≡',
  'list-ol': '1≡',
  'horizontal-rule': '―',
  'select-all': '⬚',
  indent: '⇥',
  outdent: '⇤',
  'align-left': '⯇≡',
  'align-center': '≡',
  'align-right': '≡⯈',
  'align-justify': '☰',
  'page-break': '✂',
  table: '▦',
  image: '🖼',
  upload: '⤒',
  gallery: '▤',
  attach: '📎',
  media: '▶',
  addRowBefore: '⬆+',
  addRowAfter: '⬇+',
  deleteRow: '−≡',
  selectRow: '▭',
  addColumnBefore: '⬅+',
  addColumnAfter: '➡+',
  deleteColumn: '−‖',
  selectColumn: '▯',
  mergeCells: '⊞',
  splitCell: '⊟',
  toggleHeaderRow: 'H≡',
  toggleFooterRow: '≡F',
  tableCaption: '🏷',
  paragraphBeforeTable: '¶↑',
  paragraphAfterTable: '¶↓',
  duplicateTable: '⧉',
  selectTable: '⬚▦',
  deleteTable: '🗑',
  mention: '@',
  'task-list': '☑',
  'format-painter': '🖌',
  style: 'Aa',
  'merge-field': '{ }',
};

export type IconRenderer = (icon: string, commandId: string) => string | Node;

export const defaultIconRenderer: IconRenderer = (icon, commandId) => {
  if (DEFAULT_ICONS[icon]) return DEFAULT_ICONS[icon];
  const heading = /^heading-(\d)$/.exec(icon);
  if (heading) return `H${heading[1]}`;
  return commandId;
};
