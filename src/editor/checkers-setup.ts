import { Extension, type AnyExtension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import type { CommandRegistry } from '../commands/registry.js';
import {
  checkAccessibility,
  Checkers,
  checkSpelling,
  type AccessibilityOptions,
  type DocumentIssue,
  type LanguageToolOptions,
} from '../extensions/checkers.js';
import type { I18n } from '../i18n/i18n.js';

export interface SpellcheckOptions {
  /** Browser spell checking (`spellcheck` attribute). Default: true. */
  native?: boolean;
  /** Grammar and spelling through a LanguageTool-compatible server. */
  languageTool?: LanguageToolOptions;
  /** Re-check automatically after typing stops (ms). Default: off. */
  autoCheckDelay?: number;
}

export interface CheckerOptions {
  spellcheck?: SpellcheckOptions;
  accessibility?: AccessibilityOptions;
  /** Receives the issues after each check. */
  onIssues?: (source: DocumentIssue['source'], issues: DocumentIssue[]) => void;
}

/** ARIA, language and spellcheck attributes on the editable element. */
export const EditorAccessibility = (i18n: I18n, nativeSpellcheck: boolean) =>
  Extension.create({
    name: 'editorAccessibility',
    addProseMirrorPlugins() {
      return [
        new Plugin({
          key: new PluginKey('ktEditorA11y'),
          // Re-render the attributes when the locale changes.
          view: (view) => ({
            destroy: i18n.onChange(() =>
              view.dispatch(view.state.tr.setMeta('ktLocale', i18n.locale)),
            ),
          }),
          props: {
            attributes: () => ({
              role: 'textbox',
              'aria-multiline': 'true',
              'aria-label': i18n.t('editor.a11y.label'),
              lang: i18n.locale,
              spellcheck: nativeSpellcheck ? 'true' : 'false',
            }),
          },
        }),
      ];
    },
  });

export function checkerExtensions(options: CheckerOptions, i18n: I18n): AnyExtension[] {
  return [Checkers, EditorAccessibility(i18n, options.spellcheck?.native ?? true)];
}

const translate = (i18n: I18n, issues: DocumentIssue[]): DocumentIssue[] =>
  issues.map((issue) => {
    if (issue.source !== 'accessibility') return issue;
    // Numbers follow the locale (1,4 in pt-BR).
    const params = Object.fromEntries(
      Object.entries(issue.params ?? {}).map(([k, v]) => [
        k,
        typeof v === 'number' ? v.toLocaleString(i18n.locale) : v,
      ]),
    );
    return { ...issue, message: i18n.t(issue.message, params) };
  });

export function registerCheckerCommands(
  registry: CommandRegistry,
  i18n: I18n,
  options: CheckerOptions,
): void {
  registry.register({
    id: 'checkAccessibility',
    labelKey: 'editor.a11y.check',
    icon: 'a11y',
    group: 'tools',
    run: (e) => {
      const issues = translate(i18n, checkAccessibility(e.state.doc, options.accessibility));
      e.commands.setIssues('accessibility', issues);
      options.onIssues?.('accessibility', issues);
      return true;
    },
  });

  const languageTool = options.spellcheck?.languageTool;
  if (languageTool) {
    const run = (e: Editor): Promise<void> =>
      checkSpelling(e.state.doc, languageTool, i18n.locale)
        .then((issues) => {
          if (e.isDestroyed) return;
          e.commands.setIssues('spelling', issues);
          options.onIssues?.('spelling', issues);
        })
        .catch((error: unknown) => console.error('[tiptap-core] Verificação ortográfica:', error));

    registry.register({
      id: 'checkSpelling',
      labelKey: 'editor.spelling.check',
      icon: 'spelling',
      group: 'tools',
      run: (e) => {
        void run(e);
        return true;
      },
    });

    const delay = options.spellcheck?.autoCheckDelay;
    if (delay) {
      let timer: ReturnType<typeof setTimeout> | null = null;
      registry.register({
        id: 'spellingAutoCheck',
        labelKey: 'editor.spelling.check',
        icon: 'spelling',
        group: 'hidden',
        // Bound by createEditor through the update event (see attachAutoCheck).
        run: (e) => {
          if (timer) clearTimeout(timer);
          timer = setTimeout(() => void run(e), delay);
          return true;
        },
      });
    }
  }

  registry.register({
    id: 'clearIssues',
    labelKey: 'editor.checkers.clear',
    icon: 'clear',
    group: 'tools',
    run: (e) => e.commands.clearIssues(),
  });
}

/** Re-checks spelling after edits when `autoCheckDelay` is set. */
export function attachAutoCheck(editor: Editor, registry: CommandRegistry): () => void {
  if (!registry.has('spellingAutoCheck')) return () => undefined;
  const onUpdate = (): void => {
    registry.run(editor, 'spellingAutoCheck');
  };
  editor.on('update', onUpdate);
  return () => editor.off('update', onUpdate);
}
