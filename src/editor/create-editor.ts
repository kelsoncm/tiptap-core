import { Editor, type AnyExtension, type Content, type EditorOptions } from '@tiptap/core';
import { Typography } from '@tiptap/extension-typography';
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
import {
  Autocorrect,
  DocumentLimitsExtension,
  type AutocorrectOptions,
  type DocumentLimits,
} from '../extensions/limits.js';
import { createAutosave, type AutosaveController, type AutosaveOptions } from './autosave.js';
import { buildFullPage, splitFullPage, type FullPageParts } from '../utils/document.js';
import { createDictation, registerViewCommands, viewExtensions } from './view-setup.js';
import { getMarkdown, ioExtensions, registerIoCommands, type IoOptions } from './io-setup.js';
import {
  attachAutoCheck,
  checkerExtensions,
  registerCheckerCommands,
  type CheckerOptions,
} from './checkers-setup.js';
import {
  createRevisionController,
  registerRevisionCommands,
  revisionExtensions,
  type RevisionController,
  type RevisionOptions,
} from './revision-setup.js';
import type { DictationController } from './dictation.js';
import { featureExtensions, resolveFeatures, type EditorFeatures } from './features.js';
import {
  insertionExtensions,
  registerInsertionCommands,
  type InsertionOptions,
} from './insertions-setup.js';
import type { EditorPlugin } from './plugins.js';
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
  /**
   * Language of the text (BCP 47, e.g. `pt-BR`): `lang` of the editable area, dictation,
   * LanguageTool and full-page export. Default: the interface locale.
   */
  contentLanguage?: string;
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
  /** Maximum (enforced) and minimum (reported) characters, words and paragraphs. */
  limits?: DocumentLimits;
  /** Typographic replacements and word corrections; `false` disables. Default: typography on. */
  autocorrect?: boolean | Partial<AutocorrectOptions>;
  /** Debounced saving (callback and/or localStorage draft). */
  autosave?: AutosaveOptions;
  /** Spelling (native or LanguageTool) and accessibility checkers. */
  checkers?: CheckerOptions;
  /** Comments, suggestions (track changes), versions and user role. */
  revision?: RevisionOptions;
  /** Paste cleanup, Markdown and export settings. */
  io?: IoOptions;
  /** Accept a full HTML document as content and keep its head for `getFullPageHTML()`. */
  fullPage?: boolean;
  /** Start from the local draft when one exists (needs `autosave.storageKey`). */
  restoreDraft?: boolean;
  /** Mermaid renderer, custom widgets and templates. */
  insertions?: InsertionOptions;
  /** Optional bundles such as `mathPlugin()` from `@kelsoncm/tiptap-core/math`. */
  plugins?: readonly EditorPlugin[];
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
  readonly limits: Readonly<DocumentLimits>;
  /** Present when `autosave` was configured. */
  readonly autosave: AutosaveController | null;
  /** The content as a complete HTML document (head kept from a full-page input). */
  getFullPageHTML(): string;
  /** The content as Markdown. */
  getMarkdown(): string;
  /** Present when `revision` was configured. */
  readonly revision: RevisionController | null;
  /** Runs a registered command by id. */
  run<Payload = void>(id: string, payload?: Payload): boolean;
  setEditable(editable: boolean): void;
  destroy(): void;
}

const isI18n = (value: I18n | I18nOptions | undefined): value is I18n =>
  typeof value === 'object' && value !== null && 't' in value && 'setLocale' in value;

function fullPageParts(options: KelsonEditorOptions): FullPageParts {
  const content = initialContent(options);
  if (options.fullPage && typeof content === 'string') return splitFullPage(content);
  return { head: '', body: content as string, lang: null, title: null };
}

function initialContent(options: KelsonEditorOptions): Content {
  const key = options.autosave?.storageKey;
  if (options.restoreDraft && key) {
    try {
      const draft = typeof localStorage === 'undefined' ? null : localStorage.getItem(key);
      if (draft) return draft;
    } catch {
      // Storage unavailable: fall back to the given content.
    }
  }
  return options.content ?? '';
}

export function createEditor(options: KelsonEditorOptions = {}): KelsonEditor {
  const i18n = isI18n(options.i18n) ? options.i18n : createI18n(options.i18n);
  const contentLanguage = (): string => options.contentLanguage ?? i18n.locale;
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

  const page: FullPageParts = fullPageParts(options);
  const limits = options.limits ?? {};
  if (Object.keys(limits).length) extra.push(DocumentLimitsExtension.configure(limits));

  if (options.autocorrect !== false) {
    const config =
      options.autocorrect === true || options.autocorrect === undefined ? {} : options.autocorrect;
    if (config.typography ?? true) {
      // Brazilian quotes and dashes; the angle-quote rules (<< >>) would clash with HTML habits.
      extra.push(Typography.configure({ laquo: false, raquo: false }));
    }
    if (config.replacements || config.capitalizeSentences) {
      extra.push(
        Autocorrect.configure({
          replacements: config.replacements ?? {},
          capitalizeSentences: config.capitalizeSentences ?? false,
        }),
      );
    }
  }

  extra.push(...checkerExtensions(options.checkers ?? {}, i18n, contentLanguage));
  registerCheckerCommands(commands, i18n, options.checkers ?? {}, contentLanguage);

  let revision: RevisionController | null = null;
  if (options.revision) {
    extra.push(...revisionExtensions(options.revision));
    registerRevisionCommands(commands, i18n, () => revision, options.revision);
  }

  extra.push(...ioExtensions(options.io ?? {}));
  registerIoCommands(commands, i18n, options.io ?? {}, contentLanguage);

  let dictation: DictationController | null = null;
  extra.push(...viewExtensions());
  registerViewCommands(commands, i18n, (e) => (dictation ??= createDictation(e)), contentLanguage);

  if (features.insertions) {
    extra.push(...insertionExtensions(options.insertions ?? {}, i18n));
    registerInsertionCommands(commands, options.insertions ?? {}, i18n);
  }

  for (const plugin of options.plugins ?? []) {
    for (const [locale, messages] of Object.entries(plugin.messages ?? {})) {
      i18n.addMessages(locale, messages);
    }
    extra.push(...(plugin.extensions?.(i18n) ?? []));
    plugin.register?.(commands, i18n);
  }

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
    content: page.body,
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

  const autosave = options.autosave ? createAutosave(editor, options.autosave) : null;
  if (options.revision) revision = createRevisionController(editor, options.revision);
  const detachAutoCheck = attachAutoCheck(editor, commands);

  return {
    editor,
    commands,
    i18n,
    features,
    limits,
    autosave,
    revision,
    getMarkdown: () => getMarkdown(editor),
    getFullPageHTML: () =>
      buildFullPage(editor.getHTML(), {
        head: page.head,
        lang: page.lang ?? contentLanguage(),
        title: page.title,
      }),
    run: (id, payload) => commands.run(editor, id, payload),
    setEditable: (editable) => editor.setEditable(editable),
    destroy: () => {
      detachAutoCheck();
      autosave?.destroy();
      editor.destroy();
    },
  };
}
