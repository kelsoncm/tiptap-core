import { Extension, type Editor } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion } from '@tiptap/suggestion';

import type { CommandDefinition, CommandRegistry } from '../commands/registry.js';
import type { I18n } from '../i18n/i18n.js';
import { defaultIconRenderer } from '../ui/icons.js';
import { createSuggestionMenu } from '../ui/suggestion-menu.js';
import { matches } from '../utils/search.js';

/** Commands offered by `/` by default (those not registered are skipped). */
export const DEFAULT_SLASH_COMMANDS: readonly string[] = [
  'paragraph',
  'heading-1',
  'heading-2',
  'heading-3',
  'bulletList',
  'orderedList',
  'taskList',
  'quote',
  'codeBlock',
  'insertTable',
  'horizontalRule',
  'pageBreak',
];

export interface SlashCommandsOptions {
  registry: CommandRegistry | null;
  i18n: I18n | null;
  /** Command ids, in menu order. */
  commands: readonly string[];
  char: string;
}

export const slashCommandsPluginKey = new PluginKey('ktSlashCommands');

type Item = CommandDefinition<never>;

/** `/` menu listing editor commands; filtering uses the translated labels. */
export const SlashCommands = Extension.create<SlashCommandsOptions>({
  name: 'slashCommands',

  addOptions() {
    return { registry: null, i18n: null, commands: DEFAULT_SLASH_COMMANDS, char: '/' };
  },

  addProseMirrorPlugins() {
    const { registry, i18n, commands, char } = this.options;
    if (!registry || !i18n) return [];
    const label = (c: Item): string => i18n.t(c.labelKey, c.labelParams);
    return [
      Suggestion<Item>({
        editor: this.editor,
        pluginKey: slashCommandsPluginKey,
        char,
        startOfLine: false,
        allowedPrefixes: [' '],
        items: ({ query, editor }: { query: string; editor: Editor }) =>
          commands
            .map((id) => registry.get<never>(id))
            .filter((c): c is Item => c !== undefined)
            .filter((c) => !c.isEnabled || c.isEnabled(editor) || c.id === 'insertTable')
            .filter((c) => matches(query, label(c), c.id)),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).run();
          registry.run(editor, props.id);
        },
        render: createSuggestionMenu<Item>({
          i18n,
          className: 'kt-slash-menu',
          icon: (c) => {
            const icon = defaultIconRenderer(c.icon ?? c.id, c.id);
            return typeof icon === 'string' ? icon : undefined;
          },
          label,
        }),
      }),
    ];
  },
});
