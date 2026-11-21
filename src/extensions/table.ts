import { findParentNode, type CommandProps } from '@tiptap/core';
import { Table, TableCell, TableHeader, TableRow, TableView } from '@tiptap/extension-table';
import { type DOMOutputSpec, type Node as PMNode } from '@tiptap/pm/model';
import { NodeSelection, TextSelection } from '@tiptap/pm/state';
import { CellSelection, cellAround } from '@tiptap/pm/tables';
import type { EditorView } from '@tiptap/pm/view';

export type CaptionSide = 'top' | 'bottom';
export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];
export const TABLE_ALIGNS = ['left', 'center', 'right'] as const;
export type TableAlign = (typeof TABLE_ALIGNS)[number];
export const TABLE_LAYOUTS = ['auto', 'fixed'] as const;
export type TableLayout = (typeof TABLE_LAYOUTS)[number];
/** Predefined table looks, rendered as `kt-table-<id>` classes (see the stylesheet). */
export const TABLE_STYLES = ['grid', 'striped', 'borderless', 'compact'] as const;
export type TableStyle = (typeof TABLE_STYLES)[number];

export interface TableProperties {
  /** CSS length: `100%`, `600px`, `40em`... */
  width: string | null;
  align: TableAlign | null;
  layout: TableLayout | null;
  borderColor: string | null;
  tableStyle: TableStyle | null;
}

export interface CellProperties {
  backgroundColor: string | null;
  verticalAlign: VerticalAlign | null;
  borderColor: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableExtras: {
      /** Sets the caption of the table around the selection. */
      setTableCaption: (caption: string, side?: CaptionSide) => ReturnType;
      /** Moves the caption above or below the table. */
      setTableCaptionSide: (side: CaptionSide) => ReturnType;
      /** Removes the caption of the table around the selection. */
      unsetTableCaption: () => ReturnType;
      /** Updates width, alignment, layout, border color and style. Invalid values are ignored. */
      setTableProperties: (properties: Partial<TableProperties>) => ReturnType;
      /** Inserts a copy of the table right after it. */
      duplicateTable: () => ReturnType;
      /** Selects the whole table (all cells), ready to copy or cut. */
      selectTable: () => ReturnType;
      /** Inserts an empty paragraph before or after the table. */
      insertParagraphNearTable: (side: 'before' | 'after') => ReturnType;
      /** Selects the row of the current cell. */
      selectTableRow: () => ReturnType;
      /** Selects the column of the current cell. */
      selectTableColumn: () => ReturnType;
      /** Marks/unmarks the last row as a footer (totals) row. */
      toggleFooterRow: () => ReturnType;
      /** Sets background, vertical alignment and border color of the selected cells. */
      setCellProperties: (properties: Partial<CellProperties>) => ReturnType;
    };
  }
}

/** Accepts hex, rgb()/rgba()/hsl()/hsla() and named colors; rejects anything that could inject CSS. */
export const CSS_COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/]+\)|[a-z]+)$/i;
const CSS_LENGTH = /^\d+(\.\d+)?(px|%|em|rem|cm|mm|pt)$/;

const oneOf =
  <T extends string>(values: readonly T[]) =>
  (value: unknown): value is T =>
    typeof value === 'string' && (values as readonly string[]).includes(value);
const isVerticalAlign = oneOf(VERTICAL_ALIGNS);
const isTableAlign = oneOf(TABLE_ALIGNS);
const isTableLayout = oneOf(TABLE_LAYOUTS);
const isTableStyle = oneOf(TABLE_STYLES);
const isColor = (value: unknown): value is string =>
  typeof value === 'string' && CSS_COLOR.test(value);
const isLength = (value: unknown): value is string =>
  typeof value === 'string' && CSS_LENGTH.test(value);

/** Keeps only valid values; `null` clears a property. */
export function sanitizeTableProperties(input: Partial<TableProperties>): Partial<TableProperties> {
  const out: Partial<TableProperties> = {};
  const check = <K extends keyof TableProperties>(key: K, valid: (v: unknown) => boolean): void => {
    if (!(key in input)) return;
    const value = input[key];
    if (value === null || value === '' || value === undefined) out[key] = null;
    else if (valid(value)) out[key] = value;
  };
  check('width', isLength);
  check('align', isTableAlign);
  check('layout', isTableLayout);
  check('borderColor', isColor);
  check('tableStyle', isTableStyle);
  return out;
}

const captionStyle = (side: CaptionSide): string => `caption-side: ${side}`;

const readCaption = (table: HTMLElement): HTMLTableCaptionElement | null =>
  table instanceof HTMLTableElement ? table.caption : table.querySelector('caption');

/** Inline styles and classes derived from the table properties. */
function tablePresentation(attrs: Record<string, unknown>): { style: string; classes: string[] } {
  const styles: string[] = [];
  const classes: string[] = [];
  if (isLength(attrs['width'])) styles.push(`width: ${attrs['width']}`);
  if (isTableLayout(attrs['layout'])) styles.push(`table-layout: ${attrs['layout']}`);
  if (attrs['align'] === 'center') styles.push('margin-left: auto', 'margin-right: auto');
  if (attrs['align'] === 'right') styles.push('margin-left: auto', 'margin-right: 0');
  if (isColor(attrs['borderColor'])) styles.push(`--kt-table-border: ${attrs['borderColor']}`);
  if (isTableStyle(attrs['tableStyle'])) classes.push(`kt-table-${attrs['tableStyle']}`);
  return { style: styles.join('; '), classes };
}

/** Resizable-table node view that also shows the caption and table properties. */
class KtTableView extends TableView {
  constructor(
    node: PMNode,
    cellMinWidth: number,
    view: EditorView,
    attrs?: Record<string, unknown>,
  ) {
    super(node, cellMinWidth, view, attrs);
    const text = node.attrs['caption'] as string | null;
    if (text) {
      const caption = document.createElement('caption');
      caption.textContent = text;
      caption.contentEditable = 'false';
      caption.setAttribute('style', captionStyle(node.attrs['captionSide'] as CaptionSide));
      this.table.insertBefore(caption, this.table.firstChild);
    }
    this.applyPresentation();
  }

  override update(node: PMNode): boolean {
    const ok = super.update(node);
    if (ok) this.applyPresentation();
    return ok;
  }

  private applyPresentation(): void {
    const { style, classes } = tablePresentation(this.node.attrs);
    for (const declaration of style.split('; ').filter(Boolean)) {
      const [property, value] = declaration.split(': ');
      if (property && value) this.table.style.setProperty(property, value);
    }
    this.table.classList.add(...classes);
  }
}

const dataAttribute = <T>(name: string, valid: (v: unknown) => v is T) => ({
  default: null,
  parseHTML: (element: HTMLElement): T | null => {
    const value = element.getAttribute(`data-${name}`);
    return valid(value) ? value : null;
  },
  renderHTML: (attributes: Record<string, unknown>) => {
    const key = name.replace(/-(\w)/g, (_m, c: string) => c.toUpperCase());
    const value = attributes[key];
    return valid(value) ? { [`data-${name}`]: value } : {};
  },
});

/**
 * Table with caption and properties stored as attributes.
 *
 * The caption is not a child node: prosemirror-tables assumes every child of a table is
 * a row, so a caption node breaks cell maps and commands.
 */
export const CaptionTable = Table.extend({
  addOptions() {
    const parent = this.parent?.();
    if (!parent) throw new Error('CaptionTable: opções do Table indisponíveis.');
    return { ...parent, View: KtTableView };
  },

  parseHTML() {
    // The caption text becomes an attribute; ignore the element so its text is not
    // parsed into a cell.
    return [{ tag: 'table' }, { tag: 'caption', ignore: true }];
  },

  addAttributes() {
    return {
      ...this.parent?.(),
      caption: {
        default: null,
        parseHTML: (element: HTMLElement) => readCaption(element)?.textContent?.trim() || null,
        renderHTML: () => ({}),
      },
      captionSide: {
        default: 'top',
        parseHTML: (element: HTMLElement): CaptionSide => {
          const caption = readCaption(element);
          return caption?.style.captionSide === 'bottom' ? 'bottom' : 'top';
        },
        renderHTML: () => ({}),
      },
      width: dataAttribute('width', isLength),
      align: dataAttribute('align', isTableAlign),
      layout: dataAttribute('layout', isTableLayout),
      borderColor: dataAttribute('border-color', isColor),
      tableStyle: dataAttribute('table-style', isTableStyle),
    };
  },

  renderHTML(props) {
    const parentSpec = this.parent?.(props);
    if (!parentSpec) throw new Error('CaptionTable: renderHTML do Table indisponível.');
    const spec = parentSpec as unknown as unknown[];
    // spec is ['table', attrs, colgroup, tbody] or ['div', attrs, table] with renderWrapper.
    const table = spec[0] === 'table' ? spec : (spec[2] as unknown[]);
    const attrs = table[1] as Record<string, string>;
    const { style, classes } = tablePresentation(props.node.attrs);
    if (style) attrs['style'] = [attrs['style'], style].filter(Boolean).join('; ');
    if (classes.length) attrs['class'] = [attrs['class'], ...classes].filter(Boolean).join(' ');
    const caption = props.node.attrs['caption'] as string | null;
    if (caption) {
      table.splice(2, 0, [
        'caption',
        { style: captionStyle(props.node.attrs['captionSide'] as CaptionSide) },
        caption,
      ]);
    }
    return spec as unknown as DOMOutputSpec;
  },

  addCommands() {
    const update =
      (attrs: Record<string, unknown>) =>
      ({ commands }: CommandProps) =>
        commands.updateAttributes(this.name, attrs);
    const findTable = (props: CommandProps) =>
      findParentNode((node) => node.type.name === this.name)(props.state.selection);

    return {
      ...this.parent?.(),
      setTableCaption: (caption, side) =>
        update({ caption: caption.trim() || null, ...(side ? { captionSide: side } : {}) }),
      setTableCaptionSide: (side) => update({ captionSide: side }),
      unsetTableCaption: () => update({ caption: null }),
      setTableProperties: (properties) => (props) => {
        const clean = sanitizeTableProperties(properties);
        return Object.keys(clean).length > 0 && update(clean)(props);
      },
      duplicateTable: () => (props) => {
        const table = findTable(props);
        if (!table) return false;
        const end = table.pos + table.node.nodeSize;
        if (props.dispatch) props.tr.insert(end, table.node.copy(table.node.content));
        return true;
      },
      selectTable: () => (props) => {
        const table = findTable(props);
        if (!table) return false;
        if (props.dispatch) props.tr.setSelection(NodeSelection.create(props.tr.doc, table.pos));
        return true;
      },
      insertParagraphNearTable: (side) => (props) => {
        const table = findTable(props);
        const paragraph = props.state.schema.nodes['paragraph'];
        if (!table || !paragraph) return false;
        const pos = side === 'before' ? table.pos : table.pos + table.node.nodeSize;
        if (props.dispatch) {
          props.tr.insert(pos, paragraph.create());
          props.tr.setSelection(TextSelection.create(props.tr.doc, pos + 1));
        }
        return true;
      },
      selectTableRow: () => (props) => {
        const $cell = cellAround(props.state.selection.$from);
        if (!$cell) return false;
        if (props.dispatch) props.tr.setSelection(CellSelection.rowSelection($cell));
        return true;
      },
      selectTableColumn: () => (props) => {
        const $cell = cellAround(props.state.selection.$from);
        if (!$cell) return false;
        if (props.dispatch) props.tr.setSelection(CellSelection.colSelection($cell));
        return true;
      },
      toggleFooterRow: () => (props) => {
        const table = findTable(props);
        const last = table?.node.lastChild;
        if (!table || !last || table.node.childCount < 2) return false;
        const pos = table.pos + table.node.nodeSize - 1 - last.nodeSize;
        if (props.dispatch) {
          props.tr.setNodeMarkup(pos, undefined, { ...last.attrs, footer: !last.attrs['footer'] });
        }
        return true;
      },
      setCellProperties: (properties) => (props) => {
        const clean: Partial<CellProperties> = {};
        if ('backgroundColor' in properties) {
          clean.backgroundColor = isColor(properties.backgroundColor)
            ? properties.backgroundColor
            : null;
        }
        if ('verticalAlign' in properties) {
          clean.verticalAlign = isVerticalAlign(properties.verticalAlign)
            ? properties.verticalAlign
            : null;
        }
        if ('borderColor' in properties) {
          clean.borderColor = isColor(properties.borderColor) ? properties.borderColor : null;
        }
        const chain = props.chain();
        for (const [key, value] of Object.entries(clean)) chain.setCellAttribute(key, value);
        return Object.keys(clean).length > 0 && chain.run();
      },
    };
  },
});

/** Row with a `footer` flag (`data-footer`), styled as a totals row. */
export const FooterTableRow = TableRow.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      footer: {
        default: false,
        parseHTML: (element: HTMLElement) =>
          element.getAttribute('data-footer') === 'true' ||
          element.parentElement?.tagName === 'TFOOT',
        renderHTML: (attributes: Record<string, unknown>) =>
          attributes['footer'] ? { 'data-footer': 'true', class: 'kt-table-footer' } : {},
      },
    };
  },
});

const cellAttributes = {
  verticalAlign: {
    default: null,
    parseHTML: (element: HTMLElement): VerticalAlign | null => {
      const value = element.style.verticalAlign;
      return isVerticalAlign(value) ? value : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes['verticalAlign'];
      return isVerticalAlign(value) ? { style: `vertical-align: ${value}` } : {};
    },
  },
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-background-color') || element.style.backgroundColor || null,
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes['backgroundColor'];
      return isColor(value)
        ? { 'data-background-color': value, style: `background-color: ${value}` }
        : {};
    },
  },
  borderColor: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('data-border-color'),
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes['borderColor'];
      return isColor(value) ? { 'data-border-color': value, style: `border-color: ${value}` } : {};
    },
  },
};

/** Table cell with vertical alignment, background and border color. */
export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});

/** Table header cell with vertical alignment, background and border color. */
export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});
