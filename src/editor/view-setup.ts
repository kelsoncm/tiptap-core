import type { AnyExtension, Editor } from '@tiptap/core';

import type { CommandRegistry } from '../commands/registry.js';
import { renderFootnotes } from '../extensions/insertions.js';
import { InvisibleCharacters, SearchReplace, TextLanguage } from '../extensions/view-tools.js';
import type { I18n } from '../i18n/i18n.js';
import { openFormDialog } from '../ui/dialog.js';
import { documentForPrint, printHTML } from '../utils/document.js';
import { createDictation, isDictationSupported, type DictationController } from './dictation.js';

/** Language tags offered by the text-language dialog. */
export const TEXT_LANGUAGES: readonly string[] = ['pt-BR', 'en', 'es', 'fr', 'de', 'it', 'la'];

export function viewExtensions(): AnyExtension[] {
  return [InvisibleCharacters, SearchReplace, TextLanguage];
}

export function registerViewCommands(
  registry: CommandRegistry,
  i18n: I18n,
  getDictation: (editor: Editor) => DictationController,
): void {
  registry.register({
    id: 'invisibleCharacters',
    labelKey: 'editor.view.invisibles',
    icon: 'invisibles',
    group: 'view',
    isActive: (e) => e.storage.invisibleCharacters.visible,
    run: (e) => e.commands.toggleInvisibleCharacters(),
  });

  registry.register<string | null | undefined>({
    id: 'textLanguage',
    labelKey: 'editor.view.textLanguage',
    icon: 'language',
    group: 'tools',
    isActive: (e) => e.isActive('textLanguage'),
    isEnabled: (e) => e.isEditable,
    getValue: (e) => (e.getAttributes('textLanguage')['lang'] as string | undefined) ?? null,
    run: (e, lang) => {
      if (lang === null || lang === '') return e.chain().focus().unsetTextLanguage().run();
      if (lang) return e.chain().focus().setTextLanguage(lang).run();
      const { from, to } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.view.textLanguage',
        submitKey: 'common.save',
        fields: [
          {
            name: 'lang',
            labelKey: 'editor.view.languageCode',
            value: (e.getAttributes('textLanguage')['lang'] as string | undefined) ?? 'en',
          },
        ],
        datalist: { lang: TEXT_LANGUAGES },
      }).then((values) => {
        if (!values) return;
        const value = String(values['lang'] ?? '');
        const chain = e.chain().focus().setTextSelection({ from, to });
        (value ? chain.setTextLanguage(value) : chain.unsetTextLanguage()).run();
      });
      return true;
    },
  });

  registry.register({
    id: 'dictation',
    labelKey: 'editor.view.dictation',
    icon: 'mic',
    group: 'tools',
    isActive: (e) => getDictation(e).listening,
    isEnabled: (e) => e.isEditable && isDictationSupported(),
    run: (e) => {
      const dictation = getDictation(e);
      if (dictation.listening) {
        dictation.stop();
        return true;
      }
      return dictation.start(i18n.locale);
    },
  });

  registry.register({
    id: 'print',
    labelKey: 'editor.view.print',
    icon: 'print',
    shortcut: 'Mod-p',
    group: 'view',
    run: (e) => {
      void printHTML(documentForPrint(e, { footnotes: renderFootnotes(e.state.doc) })).catch(
        (error: unknown) => console.error('[tiptap-core]', error),
      );
      return true;
    },
  });
}

export { createDictation };
