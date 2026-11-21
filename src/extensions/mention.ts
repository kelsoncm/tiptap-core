import { Mention } from '@tiptap/extension-mention';
import { PluginKey } from '@tiptap/pm/state';

import type { I18n } from '../i18n/i18n.js';
import { createSuggestionMenu } from '../ui/suggestion-menu.js';
import { matches } from '../utils/search.js';

export interface MentionItem {
  id: string;
  label: string;
  description?: string;
}

export type MentionSource =
  | readonly MentionItem[]
  | ((query: string) => readonly MentionItem[] | Promise<readonly MentionItem[]>);

export interface MentionOptions {
  items: MentionSource;
  /** Trigger character. Default `@`. */
  char?: string;
  /** Maximum number of suggestions. Default 10. */
  limit?: number;
}

export const mentionPluginKey = new PluginKey('ktMention');

/** Filters a static list or calls the async source; errors become an empty list. */
export async function resolveMentionItems(
  source: MentionSource,
  query: string,
  limit = 10,
): Promise<MentionItem[]> {
  try {
    const items =
      typeof source === 'function'
        ? await source(query)
        : source.filter((item) => matches(query, item.label, item.id, item.description));
    return items.slice(0, limit);
  } catch (error) {
    console.error('[tiptap-core] Falha ao buscar menções:', error);
    return [];
  }
}

/** Mention extension with the core suggestion menu. */
export function createMentionExtension(options: MentionOptions, i18n: I18n) {
  const char = options.char ?? '@';
  return Mention.configure({
    HTMLAttributes: { class: 'kt-mention' },
    renderText: ({ node }) => `${char}${String(node.attrs['label'] ?? node.attrs['id'])}`,
    renderHTML: ({ node, options: o }) => [
      'span',
      { ...o.HTMLAttributes, 'data-type': 'mention', 'data-id': node.attrs['id'] },
      `${char}${String(node.attrs['label'] ?? node.attrs['id'])}`,
    ],
    suggestion: {
      char,
      pluginKey: mentionPluginKey,
      items: ({ query }) => resolveMentionItems(options.items, query, options.limit),
      render: createSuggestionMenu<MentionItem>({
        i18n,
        className: 'kt-mention-menu',
        label: (item) => item.label,
        detail: (item) => item.description,
      }),
    },
  });
}
