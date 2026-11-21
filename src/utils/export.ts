import { buildFullPage, PRINT_CSS } from './document.js';
import { escapeHtml } from './html.js';

/** Properties copied from computed styles when inlining. */
const INLINE_PROPERTIES = [
  'color',
  'background-color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-decoration-line',
  'text-align',
  'vertical-align',
  'line-height',
  'margin-left',
  'list-style-type',
  'border-top',
  'border-right',
  'border-bottom',
  'border-left',
  'border-collapse',
  'padding',
  'width',
  'table-layout',
];

const INHERITED = new Set([
  'color',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'text-align',
  'line-height',
  'list-style-type',
]);

const hiddenFrame = (): HTMLIFrameElement => {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:800px;height:600px;border:0;';
  document.body.append(frame);
  return frame;
};

/**
 * Returns the HTML with computed styles written into `style` attributes (for e-mail and
 * systems that strip stylesheets). Rendering happens in a hidden iframe with `css`.
 * A value is written when it differs from the browser default for that element; inherited
 * properties only where they change relative to the parent.
 */
export function inlineStyles(html: string, css = PRINT_CSS): string {
  const styled = hiddenFrame();
  const blank = hiddenFrame();
  try {
    const doc = styled.contentDocument;
    const win = styled.contentWindow;
    const blankDoc = blank.contentDocument;
    const blankWin = blank.contentWindow;
    if (!doc || !win || !blankDoc || !blankWin) return html;
    doc.open();
    doc.write(
      `<!doctype html><html><head><style>${css.replace(/<\/style/gi, '')}</style></head><body><div id="kt-root">${html}</div></body></html>`,
    );
    doc.close();
    blankDoc.open();
    blankDoc.write('<!doctype html><html><head></head><body></body></html>');
    blankDoc.close();
    const root = doc.getElementById('kt-root');
    if (!root) return html;

    const defaults = new Map<string, CSSStyleDeclaration>();
    const defaultFor = (tag: string): CSSStyleDeclaration => {
      let style = defaults.get(tag);
      if (!style) {
        const probe = blankDoc.createElement(tag);
        blankDoc.body.append(probe);
        style = blankWin.getComputedStyle(probe);
        defaults.set(tag, style);
      }
      return style;
    };

    const elements = [...root.querySelectorAll<HTMLElement>('*')];
    // Read everything first, then write, so written values do not affect later reads.
    const computed = elements.map((el) => {
      const style = win.getComputedStyle(el);
      const parent = el.parentElement;
      const parentStyle = parent && parent !== root ? win.getComputedStyle(parent) : null;
      const base = defaultFor(el.tagName.toLowerCase());
      const declarations: string[] = [];
      for (const property of INLINE_PROPERTIES) {
        const value = style.getPropertyValue(property);
        if (!value) continue;
        if (INHERITED.has(property) && parentStyle) {
          if (value === parentStyle.getPropertyValue(property)) continue;
        } else if (value === base.getPropertyValue(property)) {
          continue;
        }
        declarations.push(`${property}: ${value}`);
      }
      return declarations;
    });
    elements.forEach((el, i) => {
      const own = el.getAttribute('style');
      const merged = [own, ...(computed[i] ?? [])].filter(Boolean).join('; ');
      if (merged) el.setAttribute('style', merged);
      el.removeAttribute('class');
    });
    return root.innerHTML;
  } finally {
    styled.remove();
    blank.remove();
  }
}

/** Word-compatible HTML document (.doc). Word opens it with styles and page settings. */
export function toWordDocument(html: string, title = 'Documento'): string {
  const head = `<meta charset="utf-8">
<meta name="ProgId" content="Word.Document">
<title>${escapeHtml(title)}</title>
<!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->`;
  const css = `${PRINT_CSS}
@page { size: 21cm 29.7cm; margin: 2.5cm 2cm 2cm 3cm; }
.page-break { page-break-after: always; }`;
  return buildFullPage(html, { head, css, title }).replace(
    '<html lang=',
    '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40" lang=',
  );
}

/** Offers content as a file download. */
export function downloadFile(filename: string, content: string | Blob, mimeType: string): void {
  const blob = content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lowercase, accent-free, dash-separated file name. */
export function safeFilename(name: string, extension: string): string {
  const base =
    name
      .normalize('NFD')
      .replace(/\p{M}/gu, '')
      .replace(/[^\w.-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || 'documento';
  return `${base}.${extension}`;
}
