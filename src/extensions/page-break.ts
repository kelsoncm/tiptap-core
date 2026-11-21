import { mergeAttributes, Node } from '@tiptap/core';

export interface PageBreakOptions {
  HTMLAttributes: Record<string, unknown>;
  /** Text shown inside the marker on screen; hidden when printing. */
  label: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    pageBreak: {
      /** Inserts a page break (`page-break-after: always` when printed). */
      setPageBreak: () => ReturnType;
    };
  }
}

export const PageBreak = Node.create<PageBreakOptions>({
  name: 'pageBreak',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { HTMLAttributes: {}, label: '✂' };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="page-break"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'page-break',
        class: 'page-break',
        style: 'page-break-after: always; break-after: page',
      }),
      ['span', { class: 'page-break-label', contenteditable: 'false' }, this.options.label],
    ];
  },

  addCommands() {
    return {
      setPageBreak:
        () =>
        ({ chain }) =>
          chain().insertContent({ type: this.name }).run(),
    };
  },

  addKeyboardShortcuts() {
    return { 'Mod-Enter': () => this.editor.commands.setPageBreak() };
  },
});
