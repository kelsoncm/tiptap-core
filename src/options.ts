import { TABLE_ALIGNS, TABLE_LAYOUTS, TABLE_STYLES } from './extensions/table.js';
import {
  BULLET_LIST_TYPES,
  ORDERED_LIST_TYPES,
  type BulletListType,
  type OrderedListType,
} from './extensions/list-types.js';

/** A selectable value shown in a dropdown or palette. `labelKey` is an i18n key, `label` literal text. */
export interface OptionItem<Value extends string = string> {
  readonly value: Value;
  readonly labelKey?: string;
  readonly label?: string;
  /** Short preview text, e.g. `1.` or `●`. */
  readonly preview?: string;
}

/** `null` means "remove the value" (default font, no color...). */
export const FONT_FAMILIES: readonly OptionItem<string>[] = [
  { value: '', labelKey: 'editor.fontFamily.default' },
  { value: 'Arial, sans-serif', label: 'Arial' },
  { value: '"Times New Roman", serif', label: 'Times New Roman' },
  { value: '"Courier New", monospace', label: 'Courier New' },
  { value: 'Georgia, serif', label: 'Georgia' },
  { value: 'Verdana, sans-serif', label: 'Verdana' },
  { value: 'Tahoma, sans-serif', label: 'Tahoma' },
  { value: '"Comic Sans MS", cursive', label: 'Comic Sans MS' },
];

export const FONT_SIZES: readonly OptionItem[] = [10, 12, 14, 16, 18, 20, 24, 28, 32, 36].map(
  (size) => ({ value: `${size}px`, label: String(size) }),
);

export const LINE_HEIGHTS: readonly OptionItem[] = [
  { value: '', labelKey: 'editor.lineHeight.normal' },
  { value: '1', labelKey: 'editor.lineHeight.simple' },
  { value: '1.15', labelKey: 'editor.lineHeight.s115' },
  { value: '1.5', labelKey: 'editor.lineHeight.s150' },
  { value: '2', labelKey: 'editor.lineHeight.double' },
];

const color = (value: string, name: string): OptionItem => ({
  value,
  labelKey: `editor.colors.${name}`,
});

export const TEXT_COLORS: readonly OptionItem[] = [
  color('#000000', 'black'),
  color('#FFFFFF', 'white'),
  color('#FF0000', 'red'),
  color('#00FF00', 'green'),
  color('#0000FF', 'blue'),
  color('#FFFF00', 'yellow'),
  color('#FF00FF', 'magenta'),
  color('#00FFFF', 'cyan'),
  color('#FFA500', 'orange'),
  color('#800080', 'purple'),
  color('#808080', 'gray'),
  color('#A52A2A', 'brown'),
];

export const HIGHLIGHT_COLORS: readonly OptionItem[] = [
  color('#FFFF00', 'yellow'),
  color('#00FF00', 'green'),
  color('#00FFFF', 'cyan'),
  color('#FF00FF', 'magenta'),
  color('#FFA500', 'orange'),
  color('#FFB6C1', 'pink'),
  color('#90EE90', 'lightGreen'),
  color('#ADD8E6', 'lightBlue'),
  color('#FFFFE0', 'lightYellow'),
  color('#FFE4B5', 'peach'),
  color('#E6E6FA', 'lavender'),
  color('#F0E68C', 'khaki'),
];

const ORDERED_PREVIEW: Record<OrderedListType, [string, string]> = {
  decimal: ['decimal', '1.'],
  'decimal-leading-zero': ['decimalLeadingZero', '01.'],
  'lower-alpha': ['lowerAlpha', 'a.'],
  'upper-alpha': ['upperAlpha', 'A.'],
  'lower-roman': ['lowerRoman', 'i.'],
  'upper-roman': ['upperRoman', 'I.'],
};

export const ORDERED_LIST_OPTIONS: readonly OptionItem<OrderedListType>[] = ORDERED_LIST_TYPES.map(
  (value) => ({
    value,
    labelKey: `editor.orderedListTypes.${ORDERED_PREVIEW[value][0]}`,
    preview: ORDERED_PREVIEW[value][1],
  }),
);

const BULLET_PREVIEW: Record<BulletListType, string> = {
  disc: '●',
  circle: '○',
  square: '■',
  check: '✔',
  checkmark: '✅',
  checkbox: '☐',
};

export const BULLET_LIST_OPTIONS: readonly OptionItem<BulletListType>[] = BULLET_LIST_TYPES.map(
  (value) => ({
    value,
    labelKey: `editor.bulletListTypes.${value}`,
    preview: BULLET_PREVIEW[value],
  }),
);

/** Languages offered in the code block language select (subset of `common`). */
export const CODE_LANGUAGES: readonly OptionItem[] = [
  { value: '', labelKey: 'editor.codeLanguages.auto' },
  { value: 'plaintext', labelKey: 'editor.codeLanguages.plaintext' },
  { value: 'bash', label: 'Bash' },
  { value: 'css', label: 'CSS' },
  { value: 'java', label: 'Java' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'json', label: 'JSON' },
  { value: 'markdown', label: 'Markdown' },
  { value: 'php', label: 'PHP' },
  { value: 'python', label: 'Python' },
  { value: 'sql', label: 'SQL' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'xml', label: 'HTML/XML' },
  { value: 'yaml', label: 'YAML' },
];

export const TABLE_WIDTH_OPTIONS: readonly OptionItem[] = [
  { value: '', labelKey: 'editor.table.widthAuto' },
  { value: '50%', label: '50%' },
  { value: '75%', label: '75%' },
  { value: '100%', label: '100%' },
];

export const TABLE_ALIGN_OPTIONS: readonly OptionItem[] = TABLE_ALIGNS.map((value) => ({
  value,
  labelKey: `editor.table.align.${value}`,
}));

export const TABLE_LAYOUT_OPTIONS: readonly OptionItem[] = TABLE_LAYOUTS.map((value) => ({
  value,
  labelKey: `editor.table.layouts.${value}`,
}));

export const TABLE_STYLE_OPTIONS: readonly OptionItem[] = [
  { value: '', labelKey: 'editor.table.styles.default' },
  ...TABLE_STYLES.map((value) => ({ value, labelKey: `editor.table.styles.${value}` })),
];

export const VERTICAL_ALIGN_OPTIONS: readonly OptionItem[] = [
  { value: 'top', labelKey: 'editor.table.alignTop' },
  { value: 'middle', labelKey: 'editor.table.alignMiddle' },
  { value: 'bottom', labelKey: 'editor.table.alignBottom' },
];

/** Light colors suited to cell backgrounds and table borders. */
export const TABLE_COLORS: readonly OptionItem[] = [
  { value: '', labelKey: 'editor.table.removeBackground' },
  ...HIGHLIGHT_COLORS,
  color('#808080', 'gray'),
  color('#000000', 'black'),
];
