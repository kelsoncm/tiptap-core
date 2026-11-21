import { mergeAttributes, Node, type JSONContent } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { escapeHtml } from '../utils/html.js';
import { isSafeUrl } from '../utils/url.js';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    insertions: {
      /** Inserts a call-to-action link styled as a button. */
      setButton: (options: { label: string; href: string; variant?: ButtonVariant }) => ReturnType;
      /** Inserts a footnote with the given text at the cursor. */
      setFootnote: (text: string) => ReturnType;
      /** Inserts a table of contents block that follows the headings. */
      setTableOfContentsBlock: () => ReturnType;
      /** Inserts a Mermaid diagram (source code). */
      setMermaid: (code: string) => ReturnType;
      /** Inserts a chart. */
      setChart: (data: ChartData) => ReturnType;
    };
  }
}

// ---------------------------------------------------------------- Button

export const BUTTON_VARIANTS = ['primary', 'secondary', 'outline'] as const;
export type ButtonVariant = (typeof BUTTON_VARIANTS)[number];

/** `<a data-type="button" class="kt-btn kt-btn-primary" href>label</a>` */
export const KtButton = Node.create({
  name: 'button',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      href: { default: null },
      label: {
        default: '',
        parseHTML: (element) => element.textContent ?? '',
        renderHTML: () => ({}),
      },
      variant: {
        default: 'primary',
        parseHTML: (element) => {
          const variant = element.getAttribute('data-variant');
          return (BUTTON_VARIANTS as readonly string[]).includes(variant ?? '')
            ? variant
            : 'primary';
        },
        renderHTML: (attributes) => ({ 'data-variant': attributes['variant'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'a[data-type="button"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const href = node.attrs['href'] as string | null;
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        href: href && isSafeUrl(href) ? href : null,
        'data-type': 'button',
        class: `kt-btn kt-btn-${String(node.attrs['variant'])}`,
        rel: 'noopener noreferrer',
      }),
      String(node.attrs['label'] ?? ''),
    ];
  },

  renderText({ node }) {
    return String(node.attrs['label'] ?? '');
  },

  addCommands() {
    return {
      setButton:
        ({ label, href, variant }) =>
        ({ commands }) =>
          Boolean(label.trim()) &&
          isSafeUrl(href) &&
          commands.insertContent({
            type: this.name,
            attrs: { label: label.trim(), href, variant: variant ?? 'primary' },
          }),
    };
  },
});

// ---------------------------------------------------------------- Footnotes

/**
 * Footnote reference: `<sup data-type="footnote" data-note="texto">`. The number is drawn
 * with a CSS counter; `renderFootnotes` builds the numbered list for export.
 */
export const Footnote = Node.create({
  name: 'footnote',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      note: {
        default: '',
        parseHTML: (element) =>
          element.getAttribute('data-note') ?? element.getAttribute('title') ?? '',
        // Emitted by renderHTML as data-note/title.
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'sup[data-type="footnote"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const note = String(node.attrs['note'] ?? '');
    return [
      'sup',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'footnote',
        'data-note': note,
        class: 'kt-footnote',
        title: note,
      }),
    ];
  },

  renderText() {
    return '';
  },

  addCommands() {
    return {
      setFootnote:
        (text) =>
        ({ commands }) =>
          Boolean(text.trim()) &&
          commands.insertContent({ type: this.name, attrs: { note: text.trim() } }),
    };
  },
});

/** Footnote texts in document order. */
export function listFootnotes(doc: PMNode): string[] {
  const notes: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'footnote') notes.push(String(node.attrs['note'] ?? ''));
    return true;
  });
  return notes;
}

/** `<ol class="kt-footnotes">` with the footnote texts, for printing or export. */
export function renderFootnotes(doc: PMNode): string {
  const notes = listFootnotes(doc);
  if (notes.length === 0) return '';
  const items = notes.map((note, i) => `<li id="fn-${i + 1}">${escapeHtml(note)}</li>`).join('');
  return `<ol class="kt-footnotes">${items}</ol>`;
}

// ---------------------------------------------------------------- Table of contents block

export interface TocItem {
  level: number;
  text: string;
  id: string | null;
}

/** Headings of the document, with their id when the TableOfContents feature assigned one. */
export function collectHeadings(doc: PMNode): TocItem[] {
  const items: TocItem[] = [];
  doc.descendants((node) => {
    if (node.type.name !== 'heading') return true;
    const id =
      (node.attrs['id'] as string | undefined) ?? (node.attrs['data-toc-id'] as string | undefined);
    items.push({ level: Number(node.attrs['level']) || 1, text: node.textContent, id: id ?? null });
    return false;
  });
  return items;
}

const tocKey = new PluginKey('ktTocBlock');

/** Block listing the headings; kept up to date by a plugin (also in the saved HTML). */
export const TocBlock = Node.create({
  name: 'tocBlock',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      items: {
        default: [] as TocItem[],
        parseHTML: () => [] as TocItem[],
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'nav[data-type="toc"]' }];
  },

  renderHTML({ node }) {
    const items = (node.attrs['items'] as TocItem[]) ?? [];
    const list = items.map((item) => [
      'li',
      { class: `kt-toc-level-${item.level}` },
      item.id ? ['a', { href: `#${item.id}` }, item.text] : item.text,
    ]);
    return ['nav', { 'data-type': 'toc', class: 'kt-toc' }, ['ol', {}, ...list]] as unknown as [
      string,
      Record<string, string>,
    ];
  },

  addCommands() {
    return {
      setTableOfContentsBlock:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name }),
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: tocKey,
        appendTransaction: (transactions, _old, state) => {
          if (!transactions.some((tr) => tr.docChanged)) return null;
          const items = collectHeadings(state.doc);
          const json = JSON.stringify(items);
          const tr = state.tr;
          state.doc.descendants((node, pos) => {
            if (node.type.name === 'tocBlock' && JSON.stringify(node.attrs['items']) !== json) {
              tr.setNodeMarkup(pos, undefined, { ...node.attrs, items });
            }
            return node.isBlock && node.type.name !== 'tocBlock';
          });
          return tr.docChanged ? tr.setMeta('addToHistory', false) : null;
        },
      }),
    ];
  },
});

// ---------------------------------------------------------------- Mermaid

export interface MermaidOptions {
  /**
   * Renders Mermaid source to SVG markup, e.g.
   * `async (code) => (await mermaid.render('id' + Date.now(), code)).svg`.
   * Without it the source is shown as code. Use `securityLevel: 'strict'` in Mermaid.
   */
  render: ((code: string) => Promise<string>) | null;
}

/** Mermaid diagram stored as source: `<pre data-type="mermaid"><code>…</code></pre>`. */
export const Mermaid = Node.create<MermaidOptions>({
  name: 'mermaid',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addOptions() {
    return { render: null };
  },

  addAttributes() {
    return {
      code: {
        default: '',
        parseHTML: (element) => element.textContent?.trim() ?? '',
        renderHTML: () => ({}),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'pre[data-type="mermaid"]', preserveWhitespace: 'full' }];
  },

  renderHTML({ node }) {
    return [
      'pre',
      { 'data-type': 'mermaid', class: 'kt-mermaid' },
      ['code', {}, String(node.attrs['code'])],
    ];
  },

  addNodeView() {
    const render = this.options.render;
    return ({ node }) => {
      const dom = document.createElement('div');
      dom.className = 'kt-mermaid-view';
      dom.setAttribute('data-type', 'mermaid');
      let current = '';
      const draw = (code: string): void => {
        if (code === current) return;
        current = code;
        const fallback = (): void => {
          const pre = document.createElement('pre');
          pre.className = 'kt-mermaid';
          pre.textContent = code;
          dom.replaceChildren(pre);
        };
        if (!render) return fallback();
        render(code)
          .then((svg) => {
            if (current !== code) return;
            // Parse as SVG only: drops any <script> or HTML injected into the output.
            const parsed = new DOMParser().parseFromString(svg, 'image/svg+xml').documentElement;
            if (parsed.nodeName.toLowerCase() !== 'svg') return fallback();
            parsed.querySelectorAll('script, foreignObject').forEach((el) => el.remove());
            dom.replaceChildren(document.importNode(parsed, true));
          })
          .catch(fallback);
      };
      draw(String(node.attrs['code']));
      return {
        dom,
        update: (updated) => {
          if (updated.type.name !== 'mermaid') return false;
          draw(String(updated.attrs['code']));
          return true;
        },
      };
    };
  },

  addCommands() {
    return {
      setMermaid:
        (code) =>
        ({ commands }) =>
          Boolean(code.trim()) &&
          commands.insertContent({ type: this.name, attrs: { code: code.trim() } }),
    };
  },
});

// ---------------------------------------------------------------- Charts

export const CHART_TYPES = ['bar', 'line', 'pie'] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export interface ChartData {
  type: ChartType;
  title?: string;
  labels: string[];
  values: number[];
}

const PALETTE = [
  '#1351b4',
  '#168821',
  '#e52207',
  '#ffcd07',
  '#8e44ad',
  '#155bcb',
  '#e67e22',
  '#16a085',
];

/** Parses "Rótulo: valor" lines (one per line) into labels and values. */
export function parseChartLines(text: string): { labels: string[]; values: number[] } {
  const labels: string[] = [];
  const values: number[] = [];
  for (const line of text.split('\n')) {
    const match = /^(.+?)[:;=\t]\s*(-?[\d.,]+)\s*$/.exec(line.trim());
    const [, label, value] = match ?? [];
    if (label === undefined || value === undefined) continue;
    labels.push(label.trim());
    values.push(Number(value.replace(/\.(?=\d{3}\b)/g, '').replace(',', '.')));
  }
  return { labels, values };
}

/** Self-contained SVG for a chart (no chart library). */
export function renderChartSvg(data: ChartData, width = 480, height = 280): string {
  const values = data.values.map((v) => (Number.isFinite(v) ? v : 0));
  const title = data.title
    ? `<text x="${width / 2}" y="18" text-anchor="middle" font-size="14" font-weight="600">${escapeHtml(data.title)}</text>`
    : '';
  const top = data.title ? 30 : 10;
  let body = '';
  if (data.type === 'pie') {
    const total = values.reduce((a, b) => a + Math.max(b, 0), 0) || 1;
    const cx = width / 3;
    const cy = top + (height - top) / 2;
    const r = Math.min(cx, (height - top) / 2) - 10;
    let angle = -Math.PI / 2;
    values.forEach((value, i) => {
      const slice = (Math.max(value, 0) / total) * Math.PI * 2;
      const x1 = cx + r * Math.cos(angle);
      const y1 = cy + r * Math.sin(angle);
      angle += slice;
      const x2 = cx + r * Math.cos(angle);
      const y2 = cy + r * Math.sin(angle);
      const large = slice > Math.PI ? 1 : 0;
      const path =
        slice >= Math.PI * 2 - 1e-6
          ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${PALETTE[i % PALETTE.length]}"/>`
          : `<path d="M${cx},${cy} L${x1.toFixed(2)},${y1.toFixed(2)} A${r},${r} 0 ${large} 1 ${x2.toFixed(2)},${y2.toFixed(2)} Z" fill="${PALETTE[i % PALETTE.length]}"/>`;
      body += path;
      const ly = top + 10 + i * 18;
      body += `<rect x="${width * 0.68}" y="${ly}" width="12" height="12" fill="${PALETTE[i % PALETTE.length]}"/><text x="${width * 0.68 + 18}" y="${ly + 11}" font-size="12">${escapeHtml(data.labels[i] ?? '')} (${value})</text>`;
    });
  } else {
    const max = Math.max(...values, 0) || 1;
    const left = 40;
    const bottom = height - 30;
    const plotW = width - left - 10;
    const plotH = bottom - top;
    const step = plotW / Math.max(values.length, 1);
    body += `<line x1="${left}" y1="${bottom}" x2="${width - 10}" y2="${bottom}" stroke="#888"/><line x1="${left}" y1="${top}" x2="${left}" y2="${bottom}" stroke="#888"/>`;
    body += `<text x="${left - 6}" y="${top + 4}" text-anchor="end" font-size="10">${max}</text><text x="${left - 6}" y="${bottom}" text-anchor="end" font-size="10">0</text>`;
    const points: string[] = [];
    values.forEach((value, i) => {
      const h = (Math.max(value, 0) / max) * plotH;
      const x = left + i * step;
      const label = `<text x="${(x + step / 2).toFixed(1)}" y="${bottom + 16}" text-anchor="middle" font-size="11">${escapeHtml(data.labels[i] ?? '')}</text>`;
      if (data.type === 'bar') {
        body += `<rect x="${(x + step * 0.15).toFixed(1)}" y="${(bottom - h).toFixed(1)}" width="${(step * 0.7).toFixed(1)}" height="${h.toFixed(1)}" fill="${PALETTE[0]}"><title>${escapeHtml(data.labels[i] ?? '')}: ${value}</title></rect>`;
      } else {
        points.push(`${(x + step / 2).toFixed(1)},${(bottom - h).toFixed(1)}`);
      }
      body += label;
    });
    if (data.type === 'line' && points.length) {
      body += `<polyline points="${points.join(' ')}" fill="none" stroke="${PALETTE[0]}" stroke-width="2"/>`;
      body += points
        .map(
          (p) =>
            `<circle cx="${p.split(',')[0]}" cy="${p.split(',')[1]}" r="3" fill="${PALETTE[0]}"/>`,
        )
        .join('');
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}" font-family="system-ui, sans-serif" role="img" aria-label="${escapeHtml(data.title ?? 'gráfico')}">${title}${body}</svg>`;
}

const svgDataUrl = (svg: string): string =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

/** Chart stored as data and rendered as an SVG image (portable HTML, no script). */
export const Chart = Node.create({
  name: 'chart',
  group: 'block',
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      data: {
        default: { type: 'bar', labels: [], values: [] } as ChartData,
        parseHTML: (element) => {
          try {
            return JSON.parse(element.getAttribute('data-chart') ?? '') as ChartData;
          } catch {
            return { type: 'bar', labels: [], values: [] };
          }
        },
        renderHTML: (attributes) => ({ 'data-chart': JSON.stringify(attributes['data']) }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'figure[data-type="chart"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const data = node.attrs['data'] as ChartData;
    return [
      'figure',
      mergeAttributes(HTMLAttributes, { 'data-type': 'chart', class: 'kt-chart' }),
      ['img', { src: svgDataUrl(renderChartSvg(data)), alt: data.title ?? 'gráfico' }],
    ];
  },

  addCommands() {
    return {
      setChart:
        (data) =>
        ({ commands }) => {
          if (!(CHART_TYPES as readonly string[]).includes(data.type) || data.labels.length === 0)
            return false;
          return commands.insertContent({ type: this.name, attrs: { data } });
        },
    };
  },
});

// ---------------------------------------------------------------- Custom widgets

export interface WidgetDefinition {
  /** Node name, letters and digits only (e.g. `alertBox`). */
  name: string;
  /** i18n key or text for menus. */
  label: string;
  /** Default attribute values. */
  defaults?: Record<string, unknown>;
  /** Builds the widget DOM (editor view and saved HTML). Return a string for text content. */
  render: (attrs: Record<string, unknown>) => HTMLElement | string;
  /** Inline (in text) or block. Default: block. */
  inline?: boolean;
}

/** Creates an atom node for a custom widget, saved as `<div data-widget="name" data-attrs>`. */
export function createWidget(definition: WidgetDefinition) {
  if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(definition.name)) {
    throw new Error(`Nome de widget inválido: "${definition.name}". Use apenas letras e números.`);
  }
  const tag = definition.inline ? 'span' : 'div';
  const toDom = (attrs: Record<string, unknown>): HTMLElement => {
    const out = definition.render(attrs);
    if (typeof out === 'string') {
      const el = document.createElement(tag);
      el.textContent = out;
      return el;
    }
    return out;
  };
  return Node.create({
    name: definition.name,
    group: definition.inline ? 'inline' : 'block',
    inline: definition.inline ?? false,
    atom: true,
    selectable: true,
    draggable: true,

    addAttributes() {
      return {
        props: {
          default: definition.defaults ?? {},
          parseHTML: (element: HTMLElement) => {
            try {
              return JSON.parse(element.getAttribute('data-attrs') ?? '{}') as Record<
                string,
                unknown
              >;
            } catch {
              return definition.defaults ?? {};
            }
          },
          renderHTML: (attributes: Record<string, unknown>) => ({
            'data-attrs': JSON.stringify(attributes['props'] ?? {}),
          }),
        },
      };
    },

    parseHTML() {
      return [{ tag: `${tag}[data-widget="${definition.name}"]` }];
    },

    renderHTML({ node, HTMLAttributes }) {
      const inner = toDom(node.attrs['props'] as Record<string, unknown>);
      return [
        tag,
        mergeAttributes(HTMLAttributes, { 'data-widget': definition.name, class: 'kt-widget' }),
        inner,
      ];
    },
  });
}

/** JSON content for inserting a widget. */
export function widgetContent(name: string, props: Record<string, unknown> = {}): JSONContent {
  return { type: name, attrs: { props } };
}
