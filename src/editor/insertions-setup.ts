import type { AnyExtension, Content, Editor } from '@tiptap/core';
import { Details, DetailsContent, DetailsSummary } from '@tiptap/extension-details';
import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { Suggestion } from '@tiptap/suggestion';

import type { CommandRegistry } from '../commands/registry.js';
import { CHARACTER_GROUPS, EMOJI_GROUPS, type SymbolItem } from '../data/symbols.js';
import {
  BUTTON_VARIANTS,
  Chart,
  CHART_TYPES,
  createWidget,
  Footnote,
  KtButton,
  Mermaid,
  parseChartLines,
  TocBlock,
  widgetContent,
  type ButtonVariant,
  type ChartData,
  type ChartType,
  type WidgetDefinition,
} from '../extensions/insertions.js';
import type { I18n } from '../i18n/i18n.js';
import { openFormDialog, openPickerDialog } from '../ui/dialog.js';
import { createSuggestionMenu } from '../ui/suggestion-menu.js';
import { openSymbolDialog } from '../ui/symbol-dialog.js';
import { escapeHtml } from '../utils/html.js';
import { matches } from '../utils/search.js';

export interface TemplateDefinition {
  id: string;
  label: string;
  /** Preview image; a placeholder with the label is drawn when omitted. */
  thumbnail?: string;
  /** HTML string or Tiptap JSON. */
  content: Content;
}

export interface InsertionOptions {
  /** Renders Mermaid source to SVG (see `MermaidOptions.render`). */
  mermaid?: (code: string) => Promise<string>;
  /** Custom atom widgets. */
  widgets?: readonly WidgetDefinition[];
  /** Templates offered by the template gallery. */
  templates?: readonly TemplateDefinition[] | (() => Promise<readonly TemplateDefinition[]>);
}

const allEmoji: SymbolItem[] = EMOJI_GROUPS.flatMap((g) => [...g.items]);

/** `:` + at least two letters opens an emoji suggestion list. */
const EmojiSuggestion = (i18n: I18n) =>
  Extension.create({
    name: 'emojiSuggestion',
    addProseMirrorPlugins() {
      return [
        Suggestion<SymbolItem>({
          editor: this.editor,
          pluginKey: new PluginKey('ktEmojiSuggestion'),
          char: ':',
          allowedPrefixes: [' '],
          minQueryLength: 2,
          items: ({ query }) => allEmoji.filter((e) => matches(query, e.keywords)).slice(0, 8),
          command: ({ editor, range, props }) => {
            editor.chain().focus().deleteRange(range).insertContent(props.char).run();
          },
          render: createSuggestionMenu<SymbolItem>({
            i18n,
            className: 'kt-emoji-menu',
            icon: (e) => e.char,
            label: (e) => e.keywords.split(' ').slice(0, 2).join(' '),
          }),
        }),
      ];
    },
  });

const placeholderThumb = (label: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="100"><rect width="160" height="100" fill="#f1f6fd" stroke="#1351b4"/><text x="80" y="55" text-anchor="middle" font-family="sans-serif" font-size="12" fill="#1351b4">${escapeHtml(label)}</text></svg>`,
  )}`;

export function insertionExtensions(options: InsertionOptions, i18n: I18n): AnyExtension[] {
  return [
    KtButton,
    Footnote,
    TocBlock,
    Mermaid.configure({ render: options.mermaid ?? null }),
    Chart,
    Details.configure({ persist: true, HTMLAttributes: { class: 'kt-details' } }),
    DetailsSummary,
    DetailsContent,
    EmojiSuggestion(i18n),
    ...(options.widgets ?? []).map(createWidget),
  ];
}

export function registerInsertionCommands(
  registry: CommandRegistry,
  options: InsertionOptions,
  i18n: I18n,
): void {
  const editable = (e: Editor): boolean => e.isEditable;
  const insertText = (e: Editor, from: number, text: string | null): void => {
    if (text) e.chain().focus().setTextSelection(from).insertContent(text).run();
  };

  registry.register<string | undefined>({
    id: 'emoji',
    labelKey: 'editor.symbols.emoji',
    icon: 'emoji',
    group: 'insert',
    isEnabled: editable,
    run: (e, char) => {
      if (char) return e.chain().focus().insertContent(char).run();
      const { from } = e.state.selection;
      void openSymbolDialog({ i18n, titleKey: 'editor.symbols.emoji', groups: EMOJI_GROUPS }).then(
        (c) => insertText(e, from, c),
      );
      return true;
    },
  });

  registry.register<string | undefined>({
    id: 'characterMap',
    labelKey: 'editor.symbols.characterMap',
    icon: 'omega',
    group: 'insert',
    isEnabled: editable,
    run: (e, char) => {
      if (char) return e.chain().focus().insertContent(char).run();
      const { from } = e.state.selection;
      void openSymbolDialog({
        i18n,
        titleKey: 'editor.symbols.characterMap',
        groups: CHARACTER_GROUPS,
      }).then((c) => insertText(e, from, c));
      return true;
    },
  });

  registry.register<{ label: string; href: string; variant?: ButtonVariant } | undefined>({
    id: 'button',
    labelKey: 'editor.insertions.button',
    icon: 'button',
    group: 'insert',
    isEnabled: editable,
    run: (e, payload) => {
      if (payload) return e.chain().focus().setButton(payload).run();
      const { from } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.insertions.button',
        submitKey: 'editor.media.insert',
        fields: [
          { name: 'label', labelKey: 'editor.insertions.buttonLabel', required: true },
          { name: 'href', labelKey: 'editor.links.url', required: true },
          { name: 'variant', labelKey: 'editor.insertions.buttonVariant', value: 'primary' },
        ],
        datalist: { variant: BUTTON_VARIANTS },
      }).then((values) => {
        if (!values) return;
        const variant = String(values['variant'] ?? 'primary') as ButtonVariant;
        e.chain()
          .setTextSelection(from)
          .setButton({
            label: String(values['label'] ?? ''),
            href: String(values['href'] ?? ''),
            variant: (BUTTON_VARIANTS as readonly string[]).includes(variant) ? variant : 'primary',
          })
          .run();
      });
      return true;
    },
  });

  registry.register({
    id: 'details',
    labelKey: 'editor.insertions.accordion',
    icon: 'accordion',
    group: 'insert',
    isActive: (e) => e.isActive('details'),
    isEnabled: editable,
    run: (e) =>
      e.isActive('details')
        ? e.chain().focus().unsetDetails().run()
        : e.chain().focus().setDetails().run(),
  });

  registry.register<string | undefined>({
    id: 'footnote',
    labelKey: 'editor.insertions.footnote',
    icon: 'footnote',
    group: 'insert',
    isEnabled: editable,
    run: (e, text) => {
      if (text) return e.chain().focus().setFootnote(text).run();
      const { from } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.insertions.footnote',
        submitKey: 'editor.media.insert',
        fields: [
          {
            name: 'note',
            labelKey: 'editor.insertions.footnoteText',
            type: 'textarea',
            required: true,
          },
        ],
      }).then((values) => {
        const note = values ? String(values['note'] ?? '') : '';
        if (note) e.chain().setTextSelection(from).setFootnote(note).run();
      });
      return true;
    },
  });

  registry.register({
    id: 'tocBlock',
    labelKey: 'editor.insertions.toc',
    icon: 'toc',
    group: 'insert',
    isEnabled: editable,
    run: (e) => e.chain().focus().setTableOfContentsBlock().run(),
  });

  registry.register<string | undefined>({
    id: 'mermaid',
    labelKey: 'editor.insertions.mermaid',
    icon: 'diagram',
    group: 'insert',
    isEnabled: editable,
    run: (e, code) => {
      if (code) return e.chain().focus().setMermaid(code).run();
      const { from } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.insertions.mermaid',
        submitKey: 'editor.media.insert',
        fields: [
          {
            name: 'code',
            labelKey: 'editor.insertions.mermaidCode',
            type: 'textarea',
            value: 'flowchart TD\n  A[Início] --> B{Decisão}\n  B -->|Sim| C[Fim]\n  B -->|Não| A',
            required: true,
          },
        ],
      }).then((values) => {
        const value = values ? String(values['code'] ?? '') : '';
        if (value) e.chain().setTextSelection(from).setMermaid(value).run();
      });
      return true;
    },
  });

  registry.register<ChartData | undefined>({
    id: 'chart',
    labelKey: 'editor.insertions.chart',
    icon: 'chart',
    group: 'insert',
    isEnabled: editable,
    run: (e, data) => {
      if (data) return e.chain().focus().setChart(data).run();
      const { from } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.insertions.chart',
        submitKey: 'editor.media.insert',
        fields: [
          { name: 'type', labelKey: 'editor.insertions.chartType', value: 'bar', required: true },
          { name: 'title', labelKey: 'editor.insertions.chartTitle' },
          {
            name: 'data',
            labelKey: 'editor.insertions.chartData',
            type: 'textarea',
            value: 'Janeiro: 10\nFevereiro: 14\nMarço: 8',
            required: true,
          },
        ],
        datalist: { type: CHART_TYPES },
      }).then((values) => {
        if (!values) return;
        const type = String(values['type'] ?? 'bar') as ChartType;
        const parsed = parseChartLines(String(values['data'] ?? ''));
        const title = String(values['title'] ?? '');
        e.chain()
          .setTextSelection(from)
          .setChart({
            type: (CHART_TYPES as readonly string[]).includes(type) ? type : 'bar',
            ...(title ? { title } : {}),
            ...parsed,
          })
          .run();
      });
      return true;
    },
  });

  for (const widget of options.widgets ?? []) {
    registry.register<Record<string, unknown> | undefined>({
      id: `widget:${widget.name}`,
      labelKey: widget.label,
      icon: 'widget',
      group: 'insert',
      isEnabled: editable,
      run: (e, props) =>
        e
          .chain()
          .focus()
          .insertContent(widgetContent(widget.name, props ?? widget.defaults ?? {}))
          .run(),
    });
  }

  if (options.templates) {
    const source = options.templates;
    registry.register<string | undefined>({
      id: 'templates',
      labelKey: 'editor.insertions.templates',
      icon: 'templates',
      group: 'insert',
      isEnabled: editable,
      run: (e, id) => {
        const load = typeof source === 'function' ? source : async () => source;
        if (id) {
          void load().then((list) => {
            const template = list.find((t) => t.id === id);
            if (template) e.chain().focus().insertContent(template.content).run();
          });
          return true;
        }
        const { from } = e.state.selection;
        void load()
          .then((list) =>
            openPickerDialog({
              i18n,
              titleKey: 'editor.insertions.templates',
              items: list.map((t) => ({
                id: t.id,
                label: t.label,
                src: t.thumbnail ?? placeholderThumb(t.label),
                template: t,
              })),
            }),
          )
          .then((picked) => {
            if (picked)
              e.chain().focus().setTextSelection(from).insertContent(picked.template.content).run();
          })
          .catch((error: unknown) =>
            console.error('[tiptap-core] Falha ao carregar modelos:', error),
          );
        return true;
      },
    });
  }
}
