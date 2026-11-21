import { Editor, type AnyExtension, type Content, type EditorOptions } from '@tiptap/core';
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit';

import { defaultCommands, HEADING_LEVELS } from '../commands/defaults.js';
import { CommandRegistry } from '../commands/registry.js';
import { createI18n, type I18n, type I18nOptions } from '../i18n/i18n.js';

export interface KelsonEditorOptions {
  /** Element that will host the editor. Omit for headless use (tests, SSR). */
  element?: HTMLElement | null;
  content?: Content;
  /** False for read-only mode. Defaults to true. */
  editable?: boolean;
  /** Ready-made i18n instance, or options to create one. */
  i18n?: I18n | I18nOptions;
  /** StarterKit configuration; merged over the defaults (H1–H6 enabled). */
  starterKit?: Partial<StarterKitOptions>;
  /** Extra extensions appended after StarterKit. */
  extensions?: AnyExtension[];
  /** Any other Tiptap option (onUpdate, editorProps, ...). */
  editorOptions?: Partial<Omit<EditorOptions, 'element' | 'content' | 'editable' | 'extensions'>>;
}

export interface KelsonEditor {
  readonly editor: Editor;
  readonly commands: CommandRegistry;
  readonly i18n: I18n;
  /** Runs a registered command by id. */
  run<Payload = void>(id: string, payload?: Payload): boolean;
  setEditable(editable: boolean): void;
  destroy(): void;
}

const isI18n = (value: I18n | I18nOptions | undefined): value is I18n =>
  typeof value === 'object' && value !== null && 't' in value && 'setLocale' in value;

export function createEditor(options: KelsonEditorOptions = {}): KelsonEditor {
  const i18n = isI18n(options.i18n) ? options.i18n : createI18n(options.i18n);
  const commands = new CommandRegistry(defaultCommands());

  const editor = new Editor({
    ...options.editorOptions,
    element: options.element ?? null,
    content: options.content ?? '',
    editable: options.editable ?? true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        ...options.starterKit,
      }),
      ...(options.extensions ?? []),
    ],
  });

  return {
    editor,
    commands,
    i18n,
    run: (id, payload) => commands.run(editor, id, payload),
    setEditable: (editable) => editor.setEditable(editable),
    destroy: () => editor.destroy(),
  };
}
