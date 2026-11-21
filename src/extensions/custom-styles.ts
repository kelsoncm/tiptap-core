import { Extension, Mark, mergeAttributes } from '@tiptap/core';

/** A named style applied as a CSS class, to whole blocks or to a text run. */
export interface CustomStyle {
  id: string;
  /** i18n key or literal text. */
  label: string;
  /** `block` sets the class on paragraphs/headings; `inline` wraps text in a span. */
  kind: 'block' | 'inline';
  /** CSS class(es) to apply. Only letters, digits, `-` and `_` are accepted. */
  className: string;
}

const VALID_CLASS = /^-?[_a-zA-Z][\w-]*(\s+-?[_a-zA-Z][\w-]*)*$/;

/** Throws on duplicated ids or unsafe class names. */
export function validateCustomStyles(styles: readonly CustomStyle[]): void {
  const ids = new Set<string>();
  for (const style of styles) {
    if (ids.has(style.id)) throw new Error(`Estilo "${style.id}" duplicado.`);
    ids.add(style.id);
    if (!VALID_CLASS.test(style.className.trim())) {
      throw new Error(`Classe CSS inválida no estilo "${style.id}": "${style.className}".`);
    }
  }
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    customStyles: {
      /** Toggles a custom style by id (block or inline). */
      toggleCustomStyle: (id: string) => ReturnType;
      /** Removes custom block styles and inline style marks from the selection. */
      clearCustomStyles: () => ReturnType;
    };
  }
}

export interface CustomStylesOptions {
  styles: readonly CustomStyle[];
  /** Block node types that accept block styles. */
  types: string[];
}

/** Inline style mark: `<span data-style="id" class="...">`. */
export const InlineStyle = Mark.create<{ styles: readonly CustomStyle[] }>({
  name: 'inlineStyle',
  addOptions() {
    return { styles: [] };
  },
  addAttributes() {
    return {
      styleId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-style'),
        renderHTML: (attributes) => {
          const style = this.options.styles.find((s) => s.id === attributes['styleId']);
          return style ? { 'data-style': style.id, class: style.className } : {};
        },
      },
    };
  },
  parseHTML() {
    return [{ tag: 'span[data-style]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes), 0];
  },
});

/**
 * Custom styles. Block styles are stored as `data-block-style` on paragraphs/headings;
 * inline styles use the `inlineStyle` mark. Unknown ids are dropped when rendering.
 */
export const CustomStyles = Extension.create<CustomStylesOptions>({
  name: 'customStyles',

  addOptions() {
    return { styles: [], types: ['paragraph', 'heading'] };
  },

  onBeforeCreate() {
    validateCustomStyles(this.options.styles);
  },

  addExtensions() {
    return [InlineStyle.configure({ styles: this.options.styles })];
  },

  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          blockStyle: {
            default: null,
            parseHTML: (element) => element.getAttribute('data-block-style'),
            renderHTML: (attributes) => {
              const style = this.options.styles.find(
                (s) => s.kind === 'block' && s.id === attributes['blockStyle'],
              );
              return style ? { 'data-block-style': style.id, class: style.className } : {};
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      toggleCustomStyle:
        (id) =>
        ({ editor, commands }) => {
          const style = this.options.styles.find((s) => s.id === id);
          if (!style) return false;
          if (style.kind === 'inline') {
            return editor.isActive('inlineStyle', { styleId: id })
              ? commands.unsetMark('inlineStyle')
              : commands.setMark('inlineStyle', { styleId: id });
          }
          // Active only when every styled-capable block in the selection has the style.
          const { from, to } = editor.state.selection;
          let active = true;
          let found = false;
          editor.state.doc.nodesBetween(from, to, (node) => {
            if (!this.options.types.includes(node.type.name)) return true;
            found = true;
            if (node.attrs['blockStyle'] !== id) active = false;
            return false;
          });
          active = active && found;
          return this.options.types
            .map((type) => commands.updateAttributes(type, { blockStyle: active ? null : id }))
            .some(Boolean);
        },
      clearCustomStyles:
        () =>
        ({ commands }) => {
          const blocks = this.options.types.map((t) => commands.resetAttributes(t, 'blockStyle'));
          return commands.unsetMark('inlineStyle') || blocks.some(Boolean);
        },
    };
  },
});
