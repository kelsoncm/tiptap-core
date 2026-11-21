import { BulletList, OrderedList } from '@tiptap/extension-list';

export const ORDERED_LIST_TYPES = [
  'decimal',
  'decimal-leading-zero',
  'lower-alpha',
  'upper-alpha',
  'lower-roman',
  'upper-roman',
] as const;
export type OrderedListType = (typeof ORDERED_LIST_TYPES)[number];

/** Bullet style id -> CSS `list-style-type` value. */
export const BULLET_LIST_STYLES = {
  disc: 'disc',
  circle: 'circle',
  square: 'square',
  check: '"\\2714  "',
  checkmark: '"\\2705  "',
  checkbox: '"\\2610  "',
} as const;
export type BulletListType = keyof typeof BULLET_LIST_STYLES;
export const BULLET_LIST_TYPES = Object.keys(BULLET_LIST_STYLES) as BulletListType[];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    orderedListType: {
      /** Sets the numbering style of the current ordered list (creates one if needed). */
      setOrderedListType: (listType: OrderedListType) => ReturnType;
    };
    bulletListType: {
      /** Sets the bullet style of the current bullet list (creates one if needed). */
      setBulletListType: (listType: BulletListType) => ReturnType;
    };
  }
}

const isOrderedType = (value: string | null | undefined): value is OrderedListType =>
  (ORDERED_LIST_TYPES as readonly string[]).includes(value ?? '');

/** Maps current ids and legacy tiptap-ng values (`"\2714"`, `"✔"`) to a bullet type. */
export function parseBulletListType(value: string | null | undefined): BulletListType | null {
  if (!value) return null;
  if (value in BULLET_LIST_STYLES) return value as BulletListType;
  if (/2714|✔/.test(value)) return 'check';
  if (/2705|✅/.test(value)) return 'checkmark';
  if (/2610|☐/.test(value)) return 'checkbox';
  return null;
}

/** OrderedList with a `listType` attribute rendered as `list-style-type`. */
export const TypedOrderedList = OrderedList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listType: {
        default: 'decimal',
        parseHTML: (element: HTMLElement) => {
          const data = element.getAttribute('data-list-type');
          if (isOrderedType(data)) return data;
          const style = element.style.listStyleType;
          return isOrderedType(style) ? style : 'decimal';
        },
        renderHTML: (attributes: Record<string, unknown>) => {
          const listType = isOrderedType(attributes['listType'] as string)
            ? (attributes['listType'] as OrderedListType)
            : 'decimal';
          if (listType === 'decimal') return {};
          return { 'data-list-type': listType, style: `list-style-type: ${listType}` };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setOrderedListType:
        (listType: OrderedListType) =>
        ({ chain, editor }) => {
          if (!isOrderedType(listType)) return false;
          const base = editor.isActive(this.name) ? chain() : chain().toggleOrderedList();
          return base.updateAttributes(this.name, { listType }).run();
        },
    };
  },
});

/** BulletList with a `listType` attribute (disc, circle, square, ✔, ✅, ☐). */
export const TypedBulletList = BulletList.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      listType: {
        default: 'disc',
        parseHTML: (element: HTMLElement) =>
          parseBulletListType(element.getAttribute('data-list-type')) ??
          parseBulletListType(element.style.listStyleType) ??
          'disc',
        renderHTML: (attributes: Record<string, unknown>) => {
          const listType = parseBulletListType(attributes['listType'] as string) ?? 'disc';
          if (listType === 'disc') return {};
          return {
            'data-list-type': listType,
            style: `list-style-type: ${BULLET_LIST_STYLES[listType]}`,
          };
        },
      },
    };
  },

  addCommands() {
    return {
      ...this.parent?.(),
      setBulletListType:
        (listType: BulletListType) =>
        ({ chain, editor }) => {
          if (!(listType in BULLET_LIST_STYLES)) return false;
          const base = editor.isActive(this.name) ? chain() : chain().toggleBulletList();
          return base.updateAttributes(this.name, { listType }).run();
        },
    };
  },
});
