import { type DOMOutputSpec, type Node as PMNode } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';
import { Table, TableCell, TableHeader, TableView } from '@tiptap/extension-table';

export type CaptionSide = 'top' | 'bottom';
export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tableCaption: {
      /** Sets the caption of the table around the selection. */
      setTableCaption: (caption: string, side?: CaptionSide) => ReturnType;
      /** Moves the caption above or below the table. */
      setTableCaptionSide: (side: CaptionSide) => ReturnType;
      /** Removes the caption of the table around the selection. */
      unsetTableCaption: () => ReturnType;
    };
  }
}

const captionStyle = (side: CaptionSide): string => `caption-side: ${side}`;

const readCaption = (table: HTMLElement): HTMLTableCaptionElement | null =>
  table instanceof HTMLTableElement ? table.caption : table.querySelector('caption');

/** Resizable-table node view that also shows the caption. */
class CaptionTableView extends TableView {
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
  }
}

/**
 * Table with an optional caption stored as attributes (`caption`, `captionSide`).
 *
 * The caption is not a child node: prosemirror-tables assumes every child of a table is
 * a row, so a caption node breaks cell maps and commands.
 */
export const CaptionTable = Table.extend({
  addOptions() {
    const parent = this.parent?.();
    if (!parent) throw new Error('CaptionTable: opções do Table indisponíveis.');
    return { ...parent, View: CaptionTableView };
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
    };
  },

  renderHTML(props) {
    const parentSpec = this.parent?.(props);
    if (!parentSpec) throw new Error('CaptionTable: renderHTML do Table indisponível.');
    const spec = parentSpec as unknown as unknown[];
    const caption = props.node.attrs['caption'] as string | null;
    if (!caption) return spec as unknown as DOMOutputSpec;
    const captionSpec = [
      'caption',
      { style: captionStyle(props.node.attrs['captionSide'] as CaptionSide) },
      caption,
    ];
    // spec is ['table', attrs, colgroup, tbody] or ['div', attrs, table] with renderWrapper.
    const table = spec[0] === 'table' ? spec : (spec[2] as unknown[]);
    table.splice(2, 0, captionSpec);
    return spec as unknown as DOMOutputSpec;
  },

  addCommands() {
    const updateCaption =
      (attrs: Record<string, unknown>) =>
      ({ commands }: { commands: { updateAttributes: (t: string, a: object) => boolean } }) =>
        commands.updateAttributes(this.name, attrs);

    return {
      ...this.parent?.(),
      setTableCaption: (caption, side) =>
        updateCaption({ caption: caption.trim() || null, ...(side ? { captionSide: side } : {}) }),
      setTableCaptionSide: (side) => updateCaption({ captionSide: side }),
      unsetTableCaption: () => updateCaption({ caption: null }),
    };
  },
});

const isVerticalAlign = (value: string): value is VerticalAlign =>
  (VERTICAL_ALIGNS as readonly string[]).includes(value);

const cellAttributes = {
  verticalAlign: {
    default: null,
    parseHTML: (element: HTMLElement): VerticalAlign | null => {
      const value = element.style.verticalAlign;
      return isVerticalAlign(value) ? value : null;
    },
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes['verticalAlign'] as string | null;
      return value && isVerticalAlign(value) ? { style: `vertical-align: ${value}` } : {};
    },
  },
  backgroundColor: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.style.backgroundColor || element.getAttribute('data-background-color') || null,
    renderHTML: (attributes: Record<string, unknown>) => {
      const value = attributes['backgroundColor'] as string | null;
      if (!value || !CSS_COLOR.test(value)) return {};
      return { 'data-background-color': value, style: `background-color: ${value}` };
    },
  },
};

/** Accepts hex, rgb()/rgba()/hsl()/hsla() and named colors; rejects anything that could inject CSS. */
const CSS_COLOR = /^(#[0-9a-f]{3,8}|(rgb|hsl)a?\([\d\s.,%/]+\)|[a-z]+)$/i;

/** Table cell with vertical alignment and background color. */
export const StyledTableCell = TableCell.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});

/** Table header cell with vertical alignment and background color. */
export const StyledTableHeader = TableHeader.extend({
  addAttributes() {
    return { ...this.parent?.(), ...cellAttributes };
  },
});
