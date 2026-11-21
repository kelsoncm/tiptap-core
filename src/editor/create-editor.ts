import { Editor, type AnyExtension, type Content, type EditorOptions } from '@tiptap/core';
import StarterKit, { type StarterKitOptions } from '@tiptap/starter-kit';

import { defaultCommands, HEADING_LEVELS } from '../commands/defaults.js';
import { featureCommands } from '../commands/feature-commands.js';
import { CommandRegistry } from '../commands/registry.js';
import { createI18n, type I18n, type I18nOptions } from '../i18n/i18n.js';
import {
  createMentionExtension,
  type MentionItem,
  type MentionOptions,
} from '../extensions/mention.js';
import { MergeField, type MergeFieldDefinition } from '../extensions/merge-field.js';
import { DEFAULT_SLASH_COMMANDS, SlashCommands } from '../extensions/slash-commands.js';
import type { CustomStyle } from '../extensions/custom-styles.js';
import { featureExtensions, resolveFeatures, type EditorFeatures } from './features.js';
import {
  linkExtensions,
  registerLinkCommands,
  SAFE_LINK_CONFIG,
  type LinkOptions,
} from './links-setup.js';
import {
  MediaUploader,
  mediaExtensions,
  registerMediaCommands,
  type MediaOptions,
} from './media-setup.js';
import {
  codeHighlightExtension,
  customStylesExtension,
  formatPainterExtension,
  registerCodeHighlightCommands,
  registerCustomStyleCommands,
  registerFormatPainterCommand,
  type CodeHighlightOptions,
} from './styling.js';

export interface KelsonEditorOptions {
  /** Element that will host the editor. Omit for headless use (tests, SSR). */
  element?: HTMLElement | null;
  content?: Content;
  /** False for read-only mode. Defaults to true. */
  editable?: boolean;
  /** Ready-made i18n instance, or options to create one. */
  i18n?: I18n | I18nOptions;
  /** Optional features; see `DEFAULT_FEATURES`. */
  features?: Partial<EditorFeatures>;
  /** Mentions (`@`): items or async source. Enables the `mention` command. */
  mentions?: MentionOptions;
  /** Merge fields (`{{`). Enables the `mergeField` command. */
  mergeFields?: readonly MergeFieldDefinition[];
  /** Slash menu (`/`): `true` for the default commands, or a list of command ids. */
  slashCommands?: boolean | readonly string[];
  /** Syntax highlighting in code blocks (highlight.js grammars via lowlight). */
  codeHighlight?: boolean | CodeHighlightOptions;
  /** Link dialog and link checker settings. */
  links?: LinkOptions;
  /** Upload, gallery and embed settings for images, video, audio and files. */
  media?: MediaOptions;
  /** Named styles applied as CSS classes (blocks or text runs). */
  customStyles?: readonly CustomStyle[];
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
  readonly features: Readonly<EditorFeatures>;
  /** Runs a registered command by id. */
  run<Payload = void>(id: string, payload?: Payload): boolean;
  setEditable(editable: boolean): void;
  destroy(): void;
}

const isI18n = (value: I18n | I18nOptions | undefined): value is I18n =>
  typeof value === 'object' && value !== null && 't' in value && 'setLocale' in value;

export function createEditor(options: KelsonEditorOptions = {}): KelsonEditor {
  const i18n = isI18n(options.i18n) ? options.i18n : createI18n(options.i18n);
  const features = resolveFeatures(options.features);
  const commands = new CommandRegistry([...defaultCommands(), ...featureCommands(features)]);
  const extra: AnyExtension[] = [];

  if (options.mentions) {
    const char = options.mentions.char ?? '@';
    extra.push(createMentionExtension(options.mentions, i18n));
    commands.register<MentionItem | undefined>({
      id: 'mention',
      labelKey: 'editor.toolbar.mention',
      icon: 'mention',
      group: 'insert',
      isEnabled: (e) => e.isEditable,
      // Without an item, types the trigger so the autocomplete opens.
      run: (e, item) =>
        item
          ? e
              .chain()
              .focus()
              .insertContent([
                { type: 'mention', attrs: { id: item.id, label: item.label } },
                { type: 'text', text: ' ' },
              ])
              .run()
          : e.chain().focus().insertContent(char).run(),
    });
  }

  if (options.mergeFields) {
    extra.push(MergeField.configure({ fields: options.mergeFields, i18n }));
    commands.register<string | undefined>({
      id: 'mergeField',
      labelKey: 'editor.toolbar.mergeField',
      icon: 'merge-field',
      group: 'insert',
      isEnabled: (e) => e.isEditable,
      run: (e, key) =>
        key
          ? e.chain().focus().insertMergeField(key).run()
          : e.chain().focus().insertContent('{{').run(),
    });
  }

  const codeHighlight = options.codeHighlight === true ? {} : options.codeHighlight || null;
  if (codeHighlight) {
    extra.push(codeHighlightExtension(codeHighlight));
    registerCodeHighlightCommands(commands);
  }

  if (options.customStyles?.length) {
    extra.push(customStylesExtension(options.customStyles));
    registerCustomStyleCommands(commands, options.customStyles);
  }

  extra.push(...linkExtensions(commands));
  registerLinkCommands(commands, i18n, options.links);

  if (features.media) {
    const mediaOptions = options.media ?? {};
    const uploader = new MediaUploader(mediaOptions);
    extra.push(...mediaExtensions(mediaOptions, uploader));
    registerMediaCommands(commands, mediaOptions, uploader, i18n);
  }

  if (features.formatPainter) {
    extra.push(formatPainterExtension());
    registerFormatPainterCommand(commands);
  }

  if (options.slashCommands) {
    extra.push(
      SlashCommands.configure({
        registry: commands,
        i18n,
        commands: options.slashCommands === true ? DEFAULT_SLASH_COMMANDS : options.slashCommands,
      }),
    );
  }

  const editor = new Editor({
    ...options.editorOptions,
    element: options.element ?? null,
    content: options.content ?? '',
    editable: options.editable ?? true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [...HEADING_LEVELS] },
        link: SAFE_LINK_CONFIG,
        // Replaced by the typed lists of the `listTypes` feature.
        ...(features.listTypes ? { bulletList: false, orderedList: false } : {}),
        // Replaced by CodeBlockLowlight.
        ...(codeHighlight ? { codeBlock: false } : {}),
        ...options.starterKit,
      }),
      ...featureExtensions(features),
      ...extra,
      ...(options.extensions ?? []),
    ],
  });

  return {
    editor,
    commands,
    i18n,
    features,
    run: (id, payload) => commands.run(editor, id, payload),
    setEditable: (editable) => editor.setEditable(editable),
    destroy: () => editor.destroy(),
  };
}
