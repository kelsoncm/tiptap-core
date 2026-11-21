import { Extension, mergeAttributes, Node, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

import { isSafeUrl } from '../utils/url.js';

/** Turns a label into an anchor id: "Seção 2.1" -> "secao-2-1". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    anchor: {
      /** Inserts a bookmark (anchor) with the given name at the cursor. */
      setAnchor: (name: string) => ReturnType;
    };
    linkChecker: {
      /** Stores link results and highlights the broken ones. */
      setLinkCheckResults: (results: readonly LinkCheckResult[]) => ReturnType;
      clearLinkCheckResults: () => ReturnType;
    };
  }
  interface Storage {
    linkChecker: { broken: Set<string> };
  }
}

/** Bookmark target: `<a id="nome" data-type="anchor"></a>`, referenced by `#nome` links. */
export const Anchor = Node.create({
  name: 'anchor',
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: (element) => element.getAttribute('id') ?? element.getAttribute('name'),
        renderHTML: (attributes) => ({ id: attributes['id'] }),
      },
    };
  },

  parseHTML() {
    return [
      { tag: 'a[data-type="anchor"]' },
      { tag: 'a[name]:not([href])' },
      { tag: 'a[id]:not([href])' },
    ];
  },

  renderHTML({ HTMLAttributes, node }) {
    return [
      'a',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'anchor',
        class: 'kt-anchor',
        title: `#${String(node.attrs['id'])}`,
      }),
    ];
  },

  renderText() {
    return '';
  },

  addCommands() {
    return {
      setAnchor:
        (name) =>
        ({ commands, state }) => {
          const id = slugify(name);
          if (!id || listAnchors(state.doc).includes(id)) return false;
          return commands.insertContent({ type: this.name, attrs: { id } });
        },
    };
  },
});

/** Anchor ids in the document (bookmarks and heading ids). */
export function listAnchors(doc: PMNode): string[] {
  const ids: string[] = [];
  doc.descendants((node) => {
    if (node.type.name === 'anchor' && node.attrs['id']) ids.push(String(node.attrs['id']));
    else if (node.type.name === 'heading' && node.attrs['id']) ids.push(String(node.attrs['id']));
    return true;
  });
  return ids;
}

export interface LinkInfo {
  href: string;
  text: string;
  from: number;
  to: number;
}

/** All links in the document, merged across adjacent text nodes. */
export function findLinks(doc: PMNode): LinkInfo[] {
  const links: LinkInfo[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    const mark = node.marks.find((m) => m.type.name === 'link');
    if (!mark) return false;
    const href = String(mark.attrs['href'] ?? '');
    const last = links[links.length - 1];
    if (last && last.href === href && last.to === pos) {
      last.text += node.text ?? '';
      last.to = pos + node.nodeSize;
    } else {
      links.push({ href, text: node.text ?? '', from: pos, to: pos + node.nodeSize });
    }
    return false;
  });
  return links;
}

export interface LinkCheckResult extends LinkInfo {
  ok: boolean;
  /** i18n key explaining the problem. */
  reason?:
    | 'editor.links.unsafe'
    | 'editor.links.missingAnchor'
    | 'editor.links.unreachable'
    | 'editor.links.empty';
}

/**
 * Checks every link: unsafe schemes, `#anchors` missing from the document and, when
 * `isReachable` is given (e.g. a server-side HEAD request), unreachable URLs.
 */
export async function checkLinks(
  doc: PMNode,
  isReachable?: (href: string) => Promise<boolean>,
): Promise<LinkCheckResult[]> {
  const anchors = new Set(listAnchors(doc));
  const cache = new Map<string, Promise<boolean>>();
  return Promise.all(
    findLinks(doc).map(async (link): Promise<LinkCheckResult> => {
      if (!link.href.trim()) return { ...link, ok: false, reason: 'editor.links.empty' };
      if (!isSafeUrl(link.href)) return { ...link, ok: false, reason: 'editor.links.unsafe' };
      if (link.href.startsWith('#')) {
        return anchors.has(decodeURIComponent(link.href.slice(1)))
          ? { ...link, ok: true }
          : { ...link, ok: false, reason: 'editor.links.missingAnchor' };
      }
      if (isReachable && /^https?:/i.test(link.href)) {
        if (!cache.has(link.href))
          cache.set(
            link.href,
            isReachable(link.href).catch(() => false),
          );
        if (!(await cache.get(link.href)))
          return { ...link, ok: false, reason: 'editor.links.unreachable' };
      }
      return { ...link, ok: true };
    }),
  );
}

const linkCheckerKey = new PluginKey<DecorationSet>('ktLinkChecker');

/** Highlights links reported as broken by `setLinkCheckResults`. */
export const LinkChecker = Extension.create<Record<string, never>, { broken: Set<string> }>({
  name: 'linkChecker',

  addStorage() {
    return { broken: new Set<string>() };
  },

  addCommands() {
    return {
      setLinkCheckResults:
        (results) =>
        ({ tr, dispatch }) => {
          this.storage.broken = new Set(results.filter((r) => !r.ok).map((r) => r.href));
          if (dispatch) dispatch(tr.setMeta(linkCheckerKey, true));
          return true;
        },
      clearLinkCheckResults:
        () =>
        ({ tr, dispatch }) => {
          this.storage.broken = new Set();
          if (dispatch) dispatch(tr.setMeta(linkCheckerKey, true));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: linkCheckerKey,
        props: {
          decorations: (state) => {
            if (storage.broken.size === 0) return null;
            const decorations = findLinks(state.doc)
              .filter((link) => storage.broken.has(link.href))
              .map((link) => Decoration.inline(link.from, link.to, { class: 'kt-link-broken' }));
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

/** Current link attributes at the selection, or `null`. */
export function getLinkAt(editor: Editor): { href: string; target: string | null } | null {
  if (!editor.isActive('link')) return null;
  const attrs = editor.getAttributes('link');
  return { href: String(attrs['href'] ?? ''), target: (attrs['target'] as string | null) ?? null };
}
