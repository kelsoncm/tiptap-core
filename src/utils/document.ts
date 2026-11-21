import type { Editor } from '@tiptap/core';

import { escapeHtml } from './html.js';

export interface FullPageParts {
  /** Inner HTML of `<head>` without scripts. */
  head: string;
  /** Inner HTML of `<body>`. */
  body: string;
  lang: string | null;
  title: string | null;
}

/**
 * Splits a full HTML document into head and body. Scripts and inline event handlers are
 * removed from the head; plain fragments come back as `body`.
 */
export function splitFullPage(html: string): FullPageParts {
  if (!/<html[\s>]|<body[\s>]|<head[\s>]/i.test(html)) {
    return { head: '', body: html, lang: null, title: null };
  }
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.head.querySelectorAll('script, noscript, base').forEach((el) => el.remove());
  doc.head.querySelectorAll('*').forEach((el) => {
    for (const attr of [...el.attributes])
      if (/^on/i.test(attr.name)) el.removeAttribute(attr.name);
  });
  return {
    head: doc.head.innerHTML.trim(),
    body: doc.body.innerHTML,
    lang: doc.documentElement.getAttribute('lang'),
    title: doc.title || null,
  };
}

export interface FullPageOptions {
  head?: string;
  lang?: string | null;
  title?: string | null;
  /** Extra CSS placed in a `<style>` in the head. */
  css?: string;
}

/** Wraps body HTML in a complete document. */
export function buildFullPage(body: string, options: FullPageOptions = {}): string {
  const head = options.head ?? '';
  const hasCharset = /<meta[^>]+charset/i.test(head);
  const hasTitle = /<title[\s>]/i.test(head);
  return [
    '<!doctype html>',
    `<html lang="${escapeHtml(options.lang ?? 'pt-BR')}">`,
    '<head>',
    hasCharset ? '' : '<meta charset="utf-8">',
    hasTitle ? '' : `<title>${escapeHtml(options.title ?? '')}</title>`,
    head,
    options.css ? `<style>${options.css.replace(/<\/style/gi, '<\\/style')}</style>` : '',
    '</head>',
    `<body>${body}</body>`,
    '</html>',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Minimal print CSS for exported/printed documents. */
export const PRINT_CSS = `
body { font: 12pt/1.5 Georgia, 'Times New Roman', serif; margin: 2cm; color: #000; }
table { border-collapse: collapse; } td, th { border: 1px solid #555; padding: 4px 8px; }
img { max-width: 100%; } pre { white-space: pre-wrap; }
.page-break { break-after: page; } .page-break-label { display: none; }
sup[data-type="footnote"] { counter-increment: fn; } sup[data-type="footnote"]::after { content: '[' counter(fn) ']'; }
body { counter-reset: fn; } .kt-anchor { display: none; }
`;

/**
 * Prints HTML through a hidden iframe (the browser's print dialog doubles as preview).
 * Resolves when the dialog was opened.
 */
export function printHTML(html: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const frame = document.createElement('iframe');
    frame.setAttribute('aria-hidden', 'true');
    frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
    document.body.append(frame);
    const win = frame.contentWindow;
    if (!win) {
      frame.remove();
      reject(new Error('Não foi possível abrir a janela de impressão.'));
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
    const done = (): void => {
      setTimeout(() => frame.remove(), 1000);
      resolve();
    };
    const go = (): void => {
      try {
        win.focus();
        win.print();
      } finally {
        done();
      }
    };
    if (win.document.readyState === 'complete') go();
    else win.addEventListener('load', go, { once: true });
  });
}

/** Full document for the editor content, with footnote list and print styles. */
export function documentForPrint(
  editor: Editor,
  options: FullPageOptions & { footnotes?: string } = {},
): string {
  return buildFullPage(`${editor.getHTML()}${options.footnotes ?? ''}`, {
    ...options,
    css: `${PRINT_CSS}${options.css ?? ''}`,
  });
}
