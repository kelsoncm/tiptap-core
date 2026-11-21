import { Extension } from '@tiptap/core';

export interface BlockLineHeightOptions {
  /** Block node types that accept a line height. */
  types: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    blockLineHeight: {
      /** Sets the line height of the selected blocks, e.g. `1.5`. */
      setBlockLineHeight: (lineHeight: string) => ReturnType;
      /** Removes the line height of the selected blocks. */
      unsetBlockLineHeight: () => ReturnType;
    };
  }
}

/**
 * Block-level line height (paragraphs, headings). Tiptap's own `LineHeight` works on the
 * `textStyle` mark, i.e. per text run; documents usually need it per paragraph.
 */
export const BlockLineHeight = Extension.create<BlockLineHeightOptions>({
  name: 'blockLineHeight',

  addOptions() {
    return { types: ['paragraph', 'heading'] };
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          lineHeight: {
            default: null,
            parseHTML: (element) => element.style.lineHeight || null,
            renderHTML: (attributes) =>
              attributes['lineHeight'] ? { style: `line-height: ${attributes['lineHeight']}` } : {},
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setBlockLineHeight:
        (lineHeight) =>
        ({ commands }) =>
          this.options.types
            .map((type) => commands.updateAttributes(type, { lineHeight }))
            .some(Boolean),
      unsetBlockLineHeight:
        () =>
        ({ commands }) =>
          this.options.types
            .map((type) => commands.resetAttributes(type, 'lineHeight'))
            .some(Boolean),
    };
  },
});
