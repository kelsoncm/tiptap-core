import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import {
  cleanPastedHtml,
  isGoogleDocsHtml,
  isOfficeHtml,
  looksLikeMarkdown,
} from '../utils/paste-cleanup.js';

export interface SmartPasteOptions {
  /** Keep colors and font sizes from Office/Google Docs ("enhanced"). Default: false. */
  keepFormatting: boolean;
  /** Convert pasted plain text that looks like Markdown. Default: true. */
  markdown: boolean;
}

export interface SmartPasteStorage {
  /** When true, every paste is inserted as plain text. */
  plainText: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    smartPaste: {
      /** Toggles "paste as plain text" for all following pastes. */
      togglePlainTextPaste: (enabled?: boolean) => ReturnType;
    };
  }
  interface Storage {
    smartPaste: SmartPasteStorage;
  }
}

export const smartPasteKey = new PluginKey('ktSmartPaste');

/**
 * Paste handling: cleans Office/Google Docs HTML, converts Markdown text and supports a
 * persistent plain-text mode (Ctrl+Shift+V already pastes plain text natively).
 */
export const SmartPaste = Extension.create<SmartPasteOptions, SmartPasteStorage>({
  name: 'smartPaste',

  addOptions() {
    return { keepFormatting: false, markdown: true };
  },

  addStorage() {
    return { plainText: false };
  },

  addCommands() {
    return {
      togglePlainTextPaste:
        (enabled) =>
        ({ tr, dispatch }) => {
          this.storage.plainText = enabled ?? !this.storage.plainText;
          if (dispatch) dispatch(tr.setMeta(smartPasteKey, this.storage.plainText));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const { options, storage, editor } = this;
    return [
      new Plugin({
        key: smartPasteKey,
        props: {
          transformPastedHTML: (html) =>
            isOfficeHtml(html) || isGoogleDocsHtml(html)
              ? cleanPastedHtml(html, { keepFormatting: options.keepFormatting })
              : html,
          handlePaste: (view, event) => {
            const data = event.clipboardData;
            if (!data) return false;
            const text = data.getData('text/plain');
            const html = data.getData('text/html');
            if (storage.plainText) {
              if (!text) return false;
              view.dispatch(view.state.tr.insertText(text).scrollIntoView());
              return true;
            }
            if (
              options.markdown &&
              !html &&
              looksLikeMarkdown(text) &&
              'getMarkdown' in editor &&
              !editor.isActive('codeBlock')
            ) {
              return editor.commands.insertContent(text, { contentType: 'markdown' } as never);
            }
            return false;
          },
        },
      }),
    ];
  },
});
