export interface SafeUrlOptions {
  /** Allowed protocols without the colon. Default: `http`, `https`, `mailto`, `tel`. */
  protocols?: readonly string[];
  /** Allow `data:image/*;base64` URLs (pasted images without upload). */
  allowDataImages?: boolean;
  /** Allow relative URLs (`/arquivo.pdf`, `#ancora`). Default: true. */
  allowRelative?: boolean;
}

const DEFAULT_PROTOCOLS = ['http', 'https', 'mailto', 'tel'];
const DATA_IMAGE = /^data:image\/(png|jpe?g|gif|webp|svg\+xml|avif);base64,[a-z0-9+/=\s]+$/i;

/** True for URLs that cannot run script (`javascript:`, `vbscript:`, `data:text/html`...). */
export function isSafeUrl(url: string, options: SafeUrlOptions = {}): boolean {
  const value = url.trim();
  if (!value) return false;
  if (options.allowDataImages && DATA_IMAGE.test(value)) return true;
  // Strip control characters and whitespace browsers ignore inside schemes ("java\nscript:").
  const compact = value.replace(/[\p{Cc}\s]/gu, '');
  const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(compact);
  if (!scheme) return options.allowRelative ?? true;
  const protocol = (scheme[1] ?? '').toLowerCase();
  return (options.protocols ?? DEFAULT_PROTOCOLS).includes(protocol);
}

/** Host of an absolute http(s) URL, or `null`. */
export function urlHost(url: string): string | null {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
      ? parsed.hostname.toLowerCase()
      : null;
  } catch {
    return null;
  }
}

/** True when the URL's host equals or is a subdomain of one of `hosts`. */
export function hostAllowed(url: string, hosts: readonly string[]): boolean {
  const host = urlHost(url);
  if (!host) return false;
  return hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
}

/**
 * Completes what users type in a link field: `ifrn.edu.br` -> `https://ifrn.edu.br`,
 * `ana@ifrn.edu.br` -> `mailto:ana@ifrn.edu.br`. Relative paths, anchors and URLs with
 * a scheme are returned unchanged.
 */
export function normalizeHref(value: string, defaultProtocol = 'https'): string {
  const href = value.trim();
  if (!href || /^[a-z][a-z0-9+.-]*:/i.test(href) || /^[/#?.]/.test(href)) return href;
  if (/^[^\s@/]+@[^\s@/]+\.[^\s@/]+$/.test(href)) return `mailto:${href}`;
  if (/^(www\.)?[\p{L}\d-]+(\.[\p{L}\d-]+)+(:\d+)?([/?#].*)?$/u.test(href)) {
    return `${defaultProtocol}://${href}`;
  }
  return href;
}
