/** True for HTML copied from Word, Excel, Outlook or LibreOffice. */
export function isOfficeHtml(html: string): boolean {
  return /class="?Mso|urn:schemas-microsoft-com:office|<o:p>|mso-[a-z-]+:|ProgId[^>]*Word/i.test(
    html,
  );
}

/** True for HTML copied from Google Docs. */
export function isGoogleDocsHtml(html: string): boolean {
  return /id="docs-internal-guid-/i.test(html);
}

export interface CleanupOptions {
  /**
   * Keep colors, highlights and font sizes ("enhanced"); otherwise only the document
   * structure and basic marks (bold, italic, underline, strike, sub/sup, links) survive.
   */
  keepFormatting?: boolean;
}

const NBSP = new RegExp(String.fromCharCode(0xa0), 'g');

const KEPT_STYLES = ['color', 'background-color', 'font-size', 'font-family', 'text-align'];

/** Word list paragraphs carry `mso-list: l0 level2 lfo1`; returns [listId, level]. */
const msoList = (el: Element): [string, number] | null => {
  const match = /mso-list:\s*(l\d+)\s+level(\d+)/i.exec(el.getAttribute('style') ?? '');
  return match ? [match[1] ?? 'l0', Number(match[2] ?? '1')] : null;
};

/** Converts Word "fake list" paragraphs into real nested lists. */
function convertWordLists(doc: Document): void {
  const paragraphs = [...doc.body.querySelectorAll('p')].filter((p) => msoList(p));
  let stack: HTMLElement[] = [];
  let lastParagraph: Element | null = null;
  let lastList: string | null = null;
  for (const p of paragraphs) {
    const info = msoList(p);
    if (!info) continue;
    const [listId, level] = info;
    const contiguous =
      lastParagraph !== null && p.previousElementSibling === lastParagraph && listId === lastList;
    if (!contiguous) stack = [];
    // The bullet/number is in a span with mso-list:Ignore (or inside conditional comments).
    const marker = p.querySelector('[style*="mso-list:Ignore" i], [style*="mso-list: Ignore" i]');
    const markerText = (marker?.textContent ?? '').trim();
    marker?.remove();
    const ordered = /^[\da-z]+[.)]/i.test(markerText);
    while (stack.length > level) stack.pop();
    while (stack.length < level) {
      const list = doc.createElement(ordered ? 'ol' : 'ul');
      const parentItem = stack[stack.length - 1]?.lastElementChild;
      if (parentItem) parentItem.append(list);
      else p.before(list);
      stack.push(list);
    }
    const item = doc.createElement('li');
    item.innerHTML = p.innerHTML;
    stack[stack.length - 1]?.append(item);
    lastList = listId;
    // Keep `previousElementSibling` chains working: replace the paragraph by an empty marker.
    const placeholder = doc.createElement('span');
    placeholder.setAttribute('data-kt-removed', '');
    p.replaceWith(placeholder);
    lastParagraph = placeholder;
  }
  doc.body.querySelectorAll('[data-kt-removed]').forEach((el) => el.remove());
}

/** Turns style-only formatting (Google Docs, Word) into semantic tags. */
function semanticMarks(doc: Document): void {
  doc.body.querySelectorAll<HTMLElement>('span[style], font').forEach((el) => {
    const style = el.style;
    const wrappers: string[] = [];
    if (/^(bold|[6-9]00)$/.test(style.fontWeight)) wrappers.push('strong');
    if (style.fontStyle === 'italic') wrappers.push('em');
    if (/underline/.test(style.textDecoration || style.textDecorationLine)) wrappers.push('u');
    if (/line-through/.test(style.textDecoration || style.textDecorationLine)) wrappers.push('s');
    if (style.verticalAlign === 'super') wrappers.push('sup');
    if (style.verticalAlign === 'sub') wrappers.push('sub');
    for (const tag of wrappers.reverse()) {
      const wrapper = doc.createElement(tag);
      wrapper.append(...el.childNodes);
      el.append(wrapper);
    }
  });
}

/**
 * Cleans HTML pasted from Word, LibreOffice or Google Docs: removes Office namespaces,
 * conditional comments, classes and layout styles, converts fake lists and style-based
 * bold/italic into real elements.
 */
export function cleanPastedHtml(html: string, options: CleanupOptions = {}): string {
  const source = html
    .replace(/<!--\[if[\s\S]*?<!\[endif\]-->/gi, '')
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?o:p>/gi, '')
    .replace(/<\/?(w|m|v|st1):[^>]*>/gi, '');
  const doc = new DOMParser().parseFromString(source, 'text/html');
  doc.querySelectorAll('style, script, meta, link, title, xml').forEach((el) => el.remove());

  convertWordLists(doc);
  semanticMarks(doc);

  // Google Docs wraps everything in <b style="font-weight:normal" id="docs-internal-guid-…">.
  doc.body
    .querySelectorAll('b[id^="docs-internal-guid-"]')
    .forEach((el) => el.replaceWith(...el.childNodes));

  doc.body.querySelectorAll<HTMLElement>('*').forEach((el) => {
    el.removeAttribute('class');
    el.removeAttribute('id');
    el.removeAttribute('lang');
    for (const attr of [...el.attributes]) {
      if (/^on/i.test(attr.name) || attr.name.includes(':')) el.removeAttribute(attr.name);
    }
    const style = el.getAttribute('style');
    if (style !== null) {
      const kept = options.keepFormatting
        ? KEPT_STYLES.map((name) => {
            const value = el.style.getPropertyValue(name);
            return value && !/windowtext|inherit|initial/i.test(value) ? `${name}: ${value}` : '';
          })
            .filter(Boolean)
            .join('; ')
        : el.style.textAlign && el.tagName !== 'SPAN'
          ? `text-align: ${el.style.textAlign}`
          : '';
      if (kept) el.setAttribute('style', kept);
      else el.removeAttribute('style');
    }
  });

  // Unwrap attribute-less spans and fonts; drop empty paragraphs Word adds as spacing.
  doc.body
    .querySelectorAll('span:not([style]), font')
    .forEach((el) => el.replaceWith(...el.childNodes));
  doc.body.querySelectorAll('p').forEach((p) => {
    if (!p.textContent?.replace(NBSP, ' ').trim() && !p.querySelector('img, br')) p.remove();
  });
  return doc.body.innerHTML.trim();
}

const MARKDOWN_HINTS = [
  /^#{1,6}\s+\S/m,
  /^\s*[-*+]\s+\S/m,
  /^\s*\d+[.)]\s+\S/m,
  /^>\s?\S/m,
  /^```/m,
  /\*\*[^*\n]+\*\*/,
  /\[[^\]\n]+\]\([^)\s]+\)/,
  /^\s*\|.+\|\s*$/m,
  /^\s*[-*]\s+\[[ xX]\]\s/m,
];

/** Heuristic: plain text that looks like Markdown (two or more hints, or a heading/fence). */
export function looksLikeMarkdown(text: string): boolean {
  if (!text.trim() || /<\/?[a-z][\s\S]*>/i.test(text)) return false;
  const hits = MARKDOWN_HINTS.filter((re) => re.test(text)).length;
  return hits >= 2 || /^#{1,6}\s+\S/m.test(text) || /^```/m.test(text);
}
