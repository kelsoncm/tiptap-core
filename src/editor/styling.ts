import type { AnyExtension } from '@tiptap/core';
import { CodeBlockLowlight } from '@tiptap/extension-code-block-lowlight';
import { common, createLowlight, type LanguageFn } from 'lowlight';

import type { CommandRegistry } from '../commands/registry.js';
import { CustomStyles, type CustomStyle } from '../extensions/custom-styles.js';
import { FormatPainter } from '../extensions/format-painter.js';

export interface CodeHighlightOptions {
  /** highlight.js grammars by name. Default: lowlight `common` (~37 languages). */
  languages?: Readonly<Record<string, LanguageFn>>;
  /** Language used when a block has none. Default: auto-detect. */
  defaultLanguage?: string | null;
}

export function codeHighlightExtension(options: CodeHighlightOptions): AnyExtension {
  return CodeBlockLowlight.configure({
    lowlight: createLowlight(options.languages ?? common),
    defaultLanguage: options.defaultLanguage ?? null,
    HTMLAttributes: { class: 'hljs' },
  });
}

export function registerCodeHighlightCommands(registry: CommandRegistry): void {
  registry.register<string | null | undefined>({
    id: 'codeBlockLanguage',
    labelKey: 'editor.toolbar.codeLanguage',
    icon: 'code-block',
    group: 'blocks',
    isEnabled: (e) => e.isEditable,
    getValue: (e) =>
      e.isActive('codeBlock')
        ? ((e.getAttributes('codeBlock')['language'] as string | null) ?? '')
        : null,
    run: (e, language) =>
      e.isActive('codeBlock')
        ? e
            .chain()
            .focus()
            .updateAttributes('codeBlock', { language: language || null })
            .run()
        : e
            .chain()
            .focus()
            .setCodeBlock({ language: language || '' })
            .run(),
  });
}

export function customStylesExtension(styles: readonly CustomStyle[]): AnyExtension {
  return CustomStyles.configure({ styles });
}

export function registerCustomStyleCommands(
  registry: CommandRegistry,
  styles: readonly CustomStyle[],
): void {
  registry.register<string | null | undefined>({
    id: 'customStyle',
    labelKey: 'editor.toolbar.customStyle',
    icon: 'style',
    group: 'blocks',
    isEnabled: (e) => e.isEditable,
    getValue: (e) => {
      const inline = e.getAttributes('inlineStyle')['styleId'] as string | undefined;
      if (inline) return inline;
      const block =
        (e.getAttributes('paragraph')['blockStyle'] as string | null) ??
        (e.getAttributes('heading')['blockStyle'] as string | null);
      return block ?? '';
    },
    run: (e, id) =>
      id && styles.some((s) => s.id === id)
        ? e.chain().focus().toggleCustomStyle(id).run()
        : e.chain().focus().clearCustomStyles().run(),
  });
}

export function formatPainterExtension(): AnyExtension {
  return FormatPainter;
}

export function registerFormatPainterCommand(registry: CommandRegistry): void {
  registry.register({
    id: 'formatPainter',
    labelKey: 'editor.toolbar.formatPainter',
    icon: 'format-painter',
    group: 'marks',
    isEnabled: (e) => e.isEditable,
    isActive: (e) => e.storage.formatPainter.marks !== null,
    run: (e) =>
      e.storage.formatPainter.marks !== null
        ? e.commands.cancelFormatPainter()
        : e.commands.copyFormat(),
  });
}
