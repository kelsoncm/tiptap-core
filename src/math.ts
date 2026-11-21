/**
 * Mathematical notation (LaTeX rendered with KaTeX). Separate entry point because KaTeX is
 * large: `import { mathPlugin } from '@kelsoncm/tiptap-core/math'` and
 * `import 'katex/dist/katex.min.css'`.
 */
import { Extension, type Editor } from '@tiptap/core';
import { Mathematics } from '@tiptap/extension-mathematics';
import type { Node as PMNode } from '@tiptap/pm/model';
import type { KatexOptions } from 'katex';

import type { EditorPlugin } from './editor/plugins.js';
import type { I18n } from './i18n/i18n.js';
import { openFormDialog } from './ui/dialog.js';

export interface MathPluginOptions {
  katexOptions?: KatexOptions;
}

const MESSAGES = {
  'pt-BR': {
    'editor.math.inline': 'Fórmula na linha',
    'editor.math.block': 'Fórmula em bloco',
    'editor.math.latex': 'Fórmula (LaTeX)',
    'editor.math.edit': 'Editar fórmula',
  },
  en: {
    'editor.math.inline': 'Inline formula',
    'editor.math.block': 'Block formula',
    'editor.math.latex': 'Formula (LaTeX)',
    'editor.math.edit': 'Edit formula',
  },
  es: {
    'editor.math.inline': 'Fórmula en línea',
    'editor.math.block': 'Fórmula en bloque',
    'editor.math.latex': 'Fórmula (LaTeX)',
    'editor.math.edit': 'Editar fórmula',
  },
};

const askLatex = (i18n: I18n, titleKey: string, value = ''): Promise<string | null> =>
  openFormDialog({
    i18n,
    titleKey,
    submitKey: 'common.save',
    fields: [
      { name: 'latex', labelKey: 'editor.math.latex', type: 'textarea', value, required: true },
    ],
  }).then((values) => (values ? String(values['latex'] ?? '').trim() || null : null));

export function mathPlugin(options: MathPluginOptions = {}): EditorPlugin {
  let editorRef: Editor | null = null;
  let i18nRef: I18n | null = null;

  // Clicking a formula opens the editor dialog.
  const edit = (kind: 'Inline' | 'Block') => (node: PMNode, pos: number) => {
    const editor = editorRef;
    const i18n = i18nRef;
    if (!editor || !i18n || !editor.isEditable) return;
    void askLatex(i18n, 'editor.math.edit', String(node.attrs['latex'] ?? '')).then((latex) => {
      if (!latex) return;
      const chain = editor.chain().setNodeSelection(pos);
      (kind === 'Inline'
        ? chain.updateInlineMath({ latex })
        : chain.updateBlockMath({ latex })
      ).run();
    });
  };

  return {
    name: 'math',
    messages: MESSAGES,
    extensions: (i18n) => {
      i18nRef = i18n;
      return [
        Extension.create({
          name: 'mathEditorRef',
          onCreate() {
            editorRef = this.editor;
          },
        }),
        Mathematics.configure({
          katexOptions: { throwOnError: false, ...options.katexOptions },
          inlineOptions: { onClick: edit('Inline') },
          blockOptions: { onClick: edit('Block') },
        }),
      ];
    },
    register: (registry, i18n) => {
      const command = (id: 'inlineMath' | 'blockMath', titleKey: string) =>
        registry.register<string | undefined>({
          id,
          labelKey: titleKey,
          icon: id === 'inlineMath' ? 'math' : 'math-block',
          group: 'insert',
          isEnabled: (e) => e.isEditable,
          run: (e, latex) => {
            const insert = (value: string, from?: number): boolean => {
              const chain = e.chain().focus();
              if (from !== undefined) chain.setTextSelection(from);
              return (
                id === 'inlineMath'
                  ? chain.insertInlineMath({ latex: value })
                  : chain.insertBlockMath({ latex: value })
              ).run();
            };
            if (latex) return insert(latex);
            const { from } = e.state.selection;
            void askLatex(i18n, titleKey).then((value) => {
              if (value) insert(value, from);
            });
            return true;
          },
        });
      command('inlineMath', 'editor.math.inline');
      command('blockMath', 'editor.math.block');
    },
  };
}
