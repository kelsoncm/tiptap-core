import { Extension, type CommandProps } from '@tiptap/core';

export interface IndentOptions {
  /** Block node types that accept indentation. */
  types: string[];
  /** Indentation step in pixels. */
  step: number;
  /** Maximum number of steps. */
  maxLevel: number;
  /** Bind Tab / Shift-Tab. Inside lists they nest items; inside tables they are left alone. */
  keyboardShortcuts: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    indent: {
      /** Nests the list item, or increases the left margin of the selected blocks. */
      indent: () => ReturnType;
      /** Lifts the list item, or decreases the left margin of the selected blocks. */
      outdent: () => ReturnType;
    };
  }
}

const LIST_ITEM_TYPES = ['listItem', 'taskItem'];

/**
 * Left-margin indentation for paragraphs, headings and quotes, stored as a level
 * (`data-indent`) and rendered as `margin-left`.
 */
export const Indent = Extension.create<IndentOptions>({
  name: 'indent',

  addOptions() {
    return {
      types: ['paragraph', 'heading', 'blockquote'],
      step: 30,
      maxLevel: 10,
      keyboardShortcuts: true,
    };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          indent: {
            default: 0,
            parseHTML: (element) => {
              const level = Number(element.getAttribute('data-indent'));
              if (Number.isInteger(level) && level > 0)
                return Math.min(level, this.options.maxLevel);
              // Legacy tiptap-ng HTML stored only the margin in pixels.
              const margin = parseInt(element.style.marginLeft, 10);
              return margin > 0
                ? Math.min(Math.round(margin / this.options.step), this.options.maxLevel)
                : 0;
            },
            renderHTML: (attributes) => {
              const level = Number(attributes['indent']) || 0;
              if (level <= 0) return {};
              return {
                'data-indent': String(level),
                style: `margin-left: ${level * this.options.step}px`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    const shift =
      (delta: 1 | -1) =>
      ({ state, tr, dispatch, editor, commands }: CommandProps): boolean => {
        const listItem = LIST_ITEM_TYPES.find((type) => editor.isActive(type));
        if (listItem) {
          return delta > 0 ? commands.sinkListItem(listItem) : commands.liftListItem(listItem);
        }

        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!this.options.types.includes(node.type.name)) return true;
          const current = Number(node.attrs['indent']) || 0;
          const next = Math.max(0, Math.min(this.options.maxLevel, current + delta));
          if (next !== current) {
            tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent: next });
            changed = true;
          }
          // Do not indent paragraphs nested in an indented blockquote twice.
          return false;
        });
        if (changed && dispatch) dispatch(tr);
        return changed;
      };

    return {
      indent: () => shift(1),
      outdent: () => shift(-1),
    };
  },

  addKeyboardShortcuts(): Record<string, () => boolean> {
    if (!this.options.keyboardShortcuts) return {};
    const inTable = (): boolean => this.editor.isActive('table');
    return {
      Tab: () => !inTable() && this.editor.commands.indent(),
      'Shift-Tab': () => !inTable() && this.editor.commands.outdent(),
    };
  },
});
