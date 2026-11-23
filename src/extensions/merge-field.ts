import { mergeAttributes, Node, type JSONContent } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion } from '@tiptap/suggestion';

import type { I18n } from '../i18n/i18n.js';
import { createSuggestionMenu } from '../ui/suggestion-menu.js';
import { matches } from '../utils/search.js';

export interface MergeFieldDefinition {
  /** Key used when filling values, e.g. `nomeEdital`. */
  key: string;
  /** Text shown in the editor, e.g. `Nome do edital`. */
  label: string;
  description?: string;
}

export interface MergeFieldOptions {
  fields: readonly MergeFieldDefinition[];
  /** Characters that open the field menu. Default `{{`. */
  trigger: string;
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mergeField: {
      /** Inserts a merge field by key (label taken from the definitions when omitted). */
      insertMergeField: (key: string, label?: string) => ReturnType;
    };
  }
}

export const mergeFieldPluginKey = new PluginKey('ktMergeField');

/**
 * Merge field (placeholder) node: `<span data-merge-field="key">{{label}}</span>`.
 * Fill the values with `fillMergeFields` (JSON) or `fillMergeFieldsHTML` (HTML).
 */
export const MergeField = Node.create<MergeFieldOptions & { i18n?: I18n }>({
  name: 'mergeField',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addOptions() {
    return { fields: [], trigger: '{{', HTMLAttributes: {} };
  },

  addAttributes() {
    return {
      key: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-merge-field'),
        renderHTML: (attributes) => ({ 'data-merge-field': attributes['key'] }),
      },
      label: {
        default: null,
        parseHTML: (element) =>
          // An empty span falls back to the key when rendered (an empty label would show "{{}}").
          element.getAttribute('data-label') ||
          element.textContent?.replace(/^\{\{|\}\}$/g, '').trim() ||
          null,
        renderHTML: (attributes) =>
          attributes['label'] ? { 'data-label': attributes['label'] } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-merge-field]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: 'kt-merge-field' }),
      `{{${String(node.attrs['label'] ?? node.attrs['key'])}}}`,
    ];
  },

  renderText({ node }) {
    return `{{${String(node.attrs['key'])}}}`;
  },

  addCommands() {
    return {
      insertMergeField:
        (key, label) =>
        ({ chain }) => {
          const definition = this.options.fields.find((f) => f.key === key);
          return chain()
            .insertContent([
              { type: this.name, attrs: { key, label: label ?? definition?.label ?? key } },
              { type: 'text', text: ' ' },
            ])
            .run();
        },
    };
  },

  addProseMirrorPlugins() {
    const { i18n, fields, trigger } = this.options;
    if (!i18n) return [];
    return [
      Suggestion<MergeFieldDefinition>({
        editor: this.editor,
        pluginKey: mergeFieldPluginKey,
        char: trigger,
        allowSpaces: true,
        items: ({ query }) => fields.filter((f) => matches(query, f.label, f.key, f.description)),
        command: ({ editor, range, props }) => {
          editor.chain().focus().deleteRange(range).insertMergeField(props.key, props.label).run();
        },
        render: createSuggestionMenu<MergeFieldDefinition>({
          i18n,
          className: 'kt-merge-field-menu',
          icon: () => '{ }',
          label: (f) => f.label,
          detail: (f) => f.description ?? f.key,
        }),
      }),
    ];
  },
});

export type MergeValues = Readonly<Record<string, string | number | null | undefined>>;

export interface FillOptions {
  /** What to do with fields without value: keep the node (default), or replace with ''. */
  missing?: 'keep' | 'empty';
}

/** Keys of all merge fields in a document (in order, without duplicates). */
export function listMergeFields(doc: JSONContent): string[] {
  const keys = new Set<string>();
  const walk = (node: JSONContent): void => {
    if (node.type === 'mergeField' && typeof node.attrs?.['key'] === 'string') {
      keys.add(node.attrs['key']);
    }
    node.content?.forEach(walk);
  };
  walk(doc);
  return [...keys];
}

/** Returns a copy of the document with merge fields replaced by text (marks kept). */
export function fillMergeFields(
  doc: JSONContent,
  values: MergeValues,
  options: FillOptions = {},
): JSONContent {
  const fill = (node: JSONContent): JSONContent[] => {
    if (node.type === 'mergeField') {
      const key = node.attrs?.['key'] as string | undefined;
      const value = key !== undefined ? values[key] : undefined;
      if (value === undefined || value === null) {
        return options.missing === 'empty' ? [] : [node];
      }
      const text = String(value);
      return text ? [{ type: 'text', text, ...(node.marks ? { marks: node.marks } : {}) }] : [];
    }
    if (!node.content) return [node];
    return [{ ...node, content: node.content.flatMap(fill) }];
  };
  return fill(doc)[0] ?? doc;
}

/** Replaces merge field spans in an HTML string (escapes the values). Needs a DOM. */
export function fillMergeFieldsHTML(
  html: string,
  values: MergeValues,
  options: FillOptions = {},
): string {
  const template = document.createElement('template');
  template.innerHTML = html;
  template.content.querySelectorAll<HTMLElement>('span[data-merge-field]').forEach((span) => {
    const key = span.getAttribute('data-merge-field') ?? '';
    const value = values[key];
    if (value === undefined || value === null) {
      if (options.missing === 'empty') span.remove();
      return;
    }
    span.replaceWith(document.createTextNode(String(value)));
  });
  return template.innerHTML;
}
