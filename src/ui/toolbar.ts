import type { CommandDefinition } from '../commands/registry.js';
import type { KelsonEditor } from '../editor/create-editor.js';
import {
  BULLET_LIST_OPTIONS,
  CODE_LANGUAGES,
  FONT_FAMILIES,
  FONT_SIZES,
  HIGHLIGHT_COLORS,
  LINE_HEIGHTS,
  ORDERED_LIST_OPTIONS,
  TABLE_ALIGN_OPTIONS,
  TABLE_COLORS,
  TABLE_LAYOUT_OPTIONS,
  TABLE_STYLE_OPTIONS,
  TABLE_WIDTH_OPTIONS,
  TEXT_COLORS,
  VERTICAL_ALIGN_OPTIONS,
  type OptionItem,
} from '../options.js';
import { defaultIconRenderer, type IconRenderer } from './icons.js';

/** A dropdown that runs a value command (font, color, list style...). */
export interface ToolbarSelect {
  readonly type: 'select';
  readonly command: string;
  readonly options: readonly OptionItem[];
}

/** A dropdown that switches between commands (block type: paragraph, H1...). */
export interface ToolbarCommandSelect {
  readonly type: 'commands';
  readonly labelKey: string;
  readonly commands: readonly string[];
}

/** Command id, `'|'` separator, or a dropdown. */
export type ToolbarItem = string | ToolbarSelect | ToolbarCommandSelect;

export const SEPARATOR = '|';

const select = (command: string, options: readonly OptionItem[]): ToolbarSelect => ({
  type: 'select',
  command,
  options,
});

export const BLOCK_TYPE_SELECT: ToolbarCommandSelect = {
  type: 'commands',
  labelKey: 'editor.toolbar.blockTypes',
  commands: [
    'paragraph',
    'heading-1',
    'heading-2',
    'heading-3',
    'heading-4',
    'heading-5',
    'heading-6',
    'quote',
    'codeBlock',
  ],
};

export const TOOLBAR_PRESETS: Readonly<
  Record<'minimal' | 'basic' | 'full', readonly ToolbarItem[]>
> = {
  minimal: ['bold', 'italic', 'underline', 'strike'],
  basic: [
    'undo',
    'redo',
    SEPARATOR,
    BLOCK_TYPE_SELECT,
    SEPARATOR,
    'bold',
    'italic',
    'underline',
    'strike',
    SEPARATOR,
    'bulletList',
    'orderedList',
    SEPARATOR,
    'removeFormat',
  ],
  full: [
    'undo',
    'redo',
    SEPARATOR,
    BLOCK_TYPE_SELECT,
    select('codeBlockLanguage', CODE_LANGUAGES),
    select('fontFamily', FONT_FAMILIES),
    select('fontSize', FONT_SIZES),
    SEPARATOR,
    'bold',
    'italic',
    'underline',
    'strike',
    'code',
    'subscript',
    'superscript',
    select('textColor', TEXT_COLORS),
    select('highlight', HIGHLIGHT_COLORS),
    'removeFormat',
    'formatPainter',
    SEPARATOR,
    'align-left',
    'align-center',
    'align-right',
    'align-justify',
    select('lineHeight', LINE_HEIGHTS),
    'outdent',
    'indent',
    SEPARATOR,
    'bulletList',
    select('bulletListType', BULLET_LIST_OPTIONS),
    'orderedList',
    select('orderedListType', ORDERED_LIST_OPTIONS),
    'taskList',
    SEPARATOR,
    'insertTable',
    'horizontalRule',
    'pageBreak',
    'mention',
    'mergeField',
  ],
};

/** Items for the balloon (bubble) menu shown over a text selection. */
export const BALLOON_PRESET: readonly ToolbarItem[] = [
  'bold',
  'italic',
  'underline',
  'strike',
  'code',
  SEPARATOR,
  'subscript',
  'superscript',
  'removeFormat',
];

/** Items of the contextual menu shown while the cursor is in a table. */
export const TABLE_MENU_PRESET: readonly ToolbarItem[] = [
  'addRowBefore',
  'addRowAfter',
  'deleteRow',
  'selectRow',
  SEPARATOR,
  'addColumnBefore',
  'addColumnAfter',
  'deleteColumn',
  'selectColumn',
  SEPARATOR,
  'mergeCells',
  'splitCell',
  'toggleHeaderRow',
  'toggleFooterRow',
  SEPARATOR,
  select('cellVerticalAlign', VERTICAL_ALIGN_OPTIONS),
  select('cellBackground', TABLE_COLORS),
  select('cellBorderColor', TABLE_COLORS),
  SEPARATOR,
  select('tableStyle', TABLE_STYLE_OPTIONS),
  select('tableWidth', TABLE_WIDTH_OPTIONS),
  select('tableAlign', TABLE_ALIGN_OPTIONS),
  select('tableLayout', TABLE_LAYOUT_OPTIONS),
  select('tableBorderColor', TABLE_COLORS),
  SEPARATOR,
  'tableCaption',
  'paragraphBeforeTable',
  'paragraphAfterTable',
  'duplicateTable',
  'selectTable',
  'deleteTable',
];

export interface ToolbarOptions {
  /** Accessible name of the toolbar (i18n key or text). */
  ariaLabel?: string;
  renderIcon?: IconRenderer;
  className?: string;
}

interface Control {
  readonly element: HTMLElement;
  update(): void;
}

/**
 * Framework-agnostic toolbar rendered from the command registry. Items whose command is
 * not registered (feature disabled) are skipped.
 */
export class Toolbar {
  readonly element: HTMLDivElement;
  readonly #kelson: KelsonEditor;
  readonly #items: readonly ToolbarItem[];
  readonly #options: ToolbarOptions;
  #controls: Control[] = [];
  readonly #cleanup: (() => void)[] = [];

  constructor(kelson: KelsonEditor, items: readonly ToolbarItem[], options: ToolbarOptions = {}) {
    this.#kelson = kelson;
    this.#items = items;
    this.#options = options;
    this.element = document.createElement('div');
    this.element.className = ['kt-toolbar', options.className].filter(Boolean).join(' ');
    this.element.setAttribute('role', 'toolbar');
    this.element.addEventListener('keydown', this.#onKeydown);
    // Keep the editor selection when clicking buttons.
    this.element.addEventListener('mousedown', (event) => {
      if ((event.target as HTMLElement).closest('button')) event.preventDefault();
    });

    const update = (): void => this.update();
    kelson.editor.on('transaction', update);
    kelson.editor.on('focus', update);
    this.#cleanup.push(() => {
      kelson.editor.off('transaction', update);
      kelson.editor.off('focus', update);
    });
    this.#cleanup.push(kelson.i18n.onChange(() => this.render()));
    this.render();
  }

  /** Rebuilds the controls (e.g. after a locale change). */
  render(): void {
    const { i18n } = this.#kelson;
    this.element.replaceChildren();
    this.element.setAttribute(
      'aria-label',
      i18n.t(this.#options.ariaLabel ?? 'editor.toolbar.textFormatting'),
    );
    this.#controls = [];
    let pendingSeparator = false;
    for (const item of this.#items) {
      if (item === SEPARATOR) {
        pendingSeparator = this.#controls.length > 0;
        continue;
      }
      const control = this.#createControl(item);
      if (!control) continue;
      if (pendingSeparator) {
        const separator = document.createElement('span');
        separator.className = 'kt-toolbar-separator';
        separator.setAttribute('role', 'separator');
        this.element.append(separator);
        pendingSeparator = false;
      }
      this.element.append(control.element);
      this.#controls.push(control);
    }
    this.#controls.forEach((c, index) => (c.element.tabIndex = index === 0 ? 0 : -1));
    this.update();
  }

  /** Refreshes active/disabled state and selected values. */
  update(): void {
    for (const control of this.#controls) control.update();
  }

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }

  #label(command: CommandDefinition<never>): string {
    const label = this.#kelson.i18n.t(command.labelKey, command.labelParams);
    return command.shortcut ? `${label} (${formatShortcut(command.shortcut)})` : label;
  }

  #createControl(item: ToolbarItem): Control | undefined {
    if (typeof item === 'string') return this.#createButton(item);
    if (item.type === 'select') return this.#createSelect(item);
    return this.#createCommandSelect(item);
  }

  #createButton(id: string): Control | undefined {
    const { commands, editor } = this.#kelson;
    const command = commands.get<never>(id);
    if (!command) return undefined;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'kt-button';
    button.dataset['command'] = id;
    const label = this.#label(command);
    button.title = label;
    button.setAttribute('aria-label', label);
    const icon = (this.#options.renderIcon ?? defaultIconRenderer)(command.icon ?? id, id);
    button.append(icon);
    button.addEventListener('click', () => {
      this.#kelson.run(id);
      this.update();
    });
    return {
      element: button,
      update: () => {
        button.disabled = command.isEnabled ? !command.isEnabled(editor) : false;
        if (command.isActive) {
          const active = command.isActive(editor);
          button.setAttribute('aria-pressed', String(active));
          button.classList.toggle('is-active', active);
        }
      },
    };
  }

  #createSelect(item: ToolbarSelect): Control | undefined {
    const { commands, editor, i18n } = this.#kelson;
    const command = commands.get<string | null>(item.command);
    if (!command) return undefined;
    const element = document.createElement('select');
    element.className = 'kt-select';
    element.dataset['command'] = item.command;
    const label = this.#label(command as CommandDefinition<never>);
    element.title = label;
    element.setAttribute('aria-label', label);

    const placeholder = new Option(label, '__placeholder__');
    placeholder.disabled = true;
    placeholder.hidden = true;
    element.add(placeholder);
    for (const option of item.options) {
      const text = option.labelKey ? i18n.t(option.labelKey) : (option.label ?? option.value);
      element.add(new Option(option.preview ? `${option.preview}  ${text}` : text, option.value));
    }
    element.addEventListener('change', () => {
      this.#kelson.run(item.command, element.value || null);
      this.update();
    });
    return {
      element,
      update: () => {
        element.disabled = command.isEnabled ? !command.isEnabled(editor) : false;
        // null = no value: show the command name; '' selects an explicit "default" option.
        const value = command.getValue?.(editor) ?? null;
        element.value =
          value !== null && item.options.some((o) => o.value === value) ? value : '__placeholder__';
      },
    };
  }

  #createCommandSelect(item: ToolbarCommandSelect): Control | undefined {
    const { commands, editor, i18n } = this.#kelson;
    const available = item.commands
      .map((id) => commands.get<never>(id))
      .filter((c): c is CommandDefinition<never> => c !== undefined);
    if (available.length === 0) return undefined;
    const element = document.createElement('select');
    element.className = 'kt-select';
    const label = i18n.t(item.labelKey);
    element.title = label;
    element.setAttribute('aria-label', label);
    const placeholder = new Option(label, '');
    placeholder.disabled = true;
    placeholder.hidden = true;
    element.add(placeholder);
    for (const command of available) {
      element.add(new Option(i18n.t(command.labelKey, command.labelParams), command.id));
    }
    element.addEventListener('change', () => {
      if (element.value) this.#kelson.run(element.value);
      this.update();
    });
    return {
      element,
      update: () => {
        element.disabled = !editor.isEditable;
        // The most specific active command wins (a heading inside a quote shows the heading).
        const active = [...available].reverse().find((c) => c.isActive?.(editor));
        element.value = active?.id ?? '';
      },
    };
  }

  /** Roving tabindex: arrows, Home and End move focus between controls. */
  #onKeydown = (event: KeyboardEvent): void => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    if (event.target instanceof HTMLSelectElement && event.key.startsWith('Arrow') && event.altKey)
      return;
    const focusable = this.#controls.map((c) => c.element);
    const index = focusable.indexOf(event.target as HTMLElement);
    if (index < 0) return;
    const last = focusable.length - 1;
    const next =
      event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? last
          : event.key === 'ArrowRight'
            ? (index + 1) % focusable.length
            : (index - 1 + focusable.length) % focusable.length;
    const current = focusable[index];
    const target = focusable[next];
    if (!current || !target) return;
    event.preventDefault();
    current.tabIndex = -1;
    target.tabIndex = 0;
    target.focus();
  };
}

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

/** `Mod-Shift-z` -> `Ctrl+Shift+Z` (or `⌘⇧Z` on macOS). */
export function formatShortcut(shortcut: string, mac = IS_MAC): string {
  const parts = shortcut.split('-').map((part) => {
    if (part === 'Mod') return mac ? '⌘' : 'Ctrl';
    if (part === 'Shift') return mac ? '⇧' : 'Shift';
    if (part === 'Alt') return mac ? '⌥' : 'Alt';
    return part.length === 1 ? part.toUpperCase() : part;
  });
  return parts.join(mac ? '' : '+');
}
