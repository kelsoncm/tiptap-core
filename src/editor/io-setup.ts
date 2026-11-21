import type { AnyExtension, Editor } from '@tiptap/core';
import { Markdown } from '@tiptap/markdown';

import type { CommandRegistry } from '../commands/registry.js';
import { renderFootnotes } from '../extensions/insertions.js';
import { SmartPaste } from '../extensions/paste.js';
import type { I18n } from '../i18n/i18n.js';
import { pickFiles } from '../ui/dialog.js';
import { buildFullPage, documentForPrint, PRINT_CSS, printHTML } from '../utils/document.js';
import { downloadFile, inlineStyles, safeFilename, toWordDocument } from '../utils/export.js';

export interface IoOptions {
  /** Keep colors/fonts when pasting from Office or Google Docs. Default: false. */
  keepPastedFormatting?: boolean;
  /** Convert pasted plain text that looks like Markdown. Default: true. */
  pasteMarkdown?: boolean;
  /** Base name for exported files (without extension). Default: "documento". */
  filename?: string | (() => string);
}

export function ioExtensions(options: IoOptions): AnyExtension[] {
  return [
    Markdown,
    SmartPaste.configure({
      keepFormatting: options.keepPastedFormatting ?? false,
      markdown: options.pasteMarkdown ?? true,
    }),
  ];
}

/** Markdown of the document (needs the Markdown extension, loaded by default). */
export function getMarkdown(editor: Editor): string {
  const fn = (editor as unknown as { getMarkdown?: () => string }).getMarkdown;
  if (!fn) throw new Error('Extensão Markdown não carregada.');
  return fn.call(editor);
}

export function registerIoCommands(
  registry: CommandRegistry,
  i18n: I18n,
  options: IoOptions,
): void {
  const name = (): string =>
    typeof options.filename === 'function' ? options.filename() : (options.filename ?? 'documento');

  registry.register({
    id: 'pastePlainText',
    labelKey: 'editor.io.pastePlainText',
    icon: 'paste-text',
    group: 'tools',
    isActive: (e) => e.storage.smartPaste.plainText,
    run: (e) => e.commands.togglePlainTextPaste(),
  });

  registry.register({
    id: 'importMarkdown',
    labelKey: 'editor.io.importMarkdown',
    icon: 'import',
    group: 'io',
    isEnabled: (e) => e.isEditable,
    run: (e) => {
      void pickFiles('.md,.markdown,text/markdown').then(async ([file]) => {
        if (!file) return;
        const text = await file.text();
        e.chain()
          .focus()
          .insertContent(text, { contentType: 'markdown' } as never)
          .run();
      });
      return true;
    },
  });

  registry.register({
    id: 'exportMarkdown',
    labelKey: 'editor.io.exportMarkdown',
    icon: 'export',
    group: 'io',
    run: (e) => {
      downloadFile(safeFilename(name(), 'md'), getMarkdown(e), 'text/markdown;charset=utf-8');
      return true;
    },
  });

  registry.register({
    id: 'exportHtml',
    labelKey: 'editor.io.exportHtml',
    icon: 'export',
    group: 'io',
    run: (e) => {
      const body = inlineStyles(`${e.getHTML()}${renderFootnotes(e.state.doc)}`, PRINT_CSS);
      downloadFile(
        safeFilename(name(), 'html'),
        buildFullPage(body, { lang: i18n.locale, title: name() }),
        'text/html;charset=utf-8',
      );
      return true;
    },
  });

  registry.register({
    id: 'exportWord',
    labelKey: 'editor.io.exportWord',
    icon: 'export',
    group: 'io',
    run: (e) => {
      downloadFile(
        safeFilename(name(), 'doc'),
        toWordDocument(`${e.getHTML()}${renderFootnotes(e.state.doc)}`, name()),
        'application/msword',
      );
      return true;
    },
  });

  registry.register({
    id: 'exportPdf',
    labelKey: 'editor.io.exportPdf',
    icon: 'pdf',
    group: 'io',
    run: (e) => {
      // The browser's print dialog offers "Save as PDF" with the print styles applied.
      void printHTML(
        documentForPrint(e, { title: name(), footnotes: renderFootnotes(e.state.doc) }),
      ).catch((error: unknown) => console.error('[tiptap-core]', error));
      return true;
    },
  });
}
