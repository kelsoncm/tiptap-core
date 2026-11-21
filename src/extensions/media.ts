import { mergeAttributes, Node, type CommandProps } from '@tiptap/core';
import { NodeSelection, Selection } from '@tiptap/pm/state';

import { hostAllowed, isSafeUrl } from '../utils/url.js';

/** Hosts accepted by the web-content embed by default. */
export const DEFAULT_EMBED_HOSTS: readonly string[] = [
  'youtube.com',
  'youtube-nocookie.com',
  'player.vimeo.com',
  'google.com',
  'docs.google.com',
  'maps.google.com',
  'forms.office.com',
  'onedrive.live.com',
  'h5p.org',
  'codepen.io',
];

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    mediaEmbeds: {
      /** Inserts a `<video controls>` for a direct video file URL. */
      setVideo: (options: { src: string; title?: string }) => ReturnType;
      /** Inserts an `<audio controls>` for an audio file URL. */
      setAudio: (options: { src: string; title?: string }) => ReturnType;
      /** Inserts an `<iframe>` for an allowed host (sandboxed). */
      setEmbed: (options: { src: string; title?: string; height?: number }) => ReturnType;
    };
  }
}

const httpOnly = { protocols: ['http', 'https'], allowRelative: true } as const;

/**
 * After inserting an atom block the selection is a NodeSelection on it, so the next
 * insertion would replace it. Move the cursor past the node instead.
 */
export const moveCursorAfterNode = ({ tr }: CommandProps): boolean => {
  const { selection } = tr;
  if (!(selection instanceof NodeSelection)) return true;
  const after = selection.to;
  const next = tr.doc.resolve(after).nodeAfter;
  const paragraph = tr.doc.type.schema.nodes['paragraph'];
  if (!next?.isTextblock && paragraph) {
    tr.insert(after, paragraph.create());
  }
  tr.setSelection(Selection.near(tr.doc.resolve(after + 1), 1));
  return true;
};

const mediaNode = (name: 'video' | 'audio', label: string) =>
  Node.create({
    name,
    group: 'block',
    atom: true,
    draggable: true,
    selectable: true,

    addAttributes() {
      return {
        src: {
          default: null,
          parseHTML: (element: HTMLElement) =>
            element.getAttribute('src') ??
            element.querySelector('source')?.getAttribute('src') ??
            null,
        },
        title: { default: null },
      };
    },

    parseHTML() {
      return [{ tag: `${name}[src]` }, { tag: `${name}:has(source[src])` }];
    },

    renderHTML({ HTMLAttributes, node }) {
      const src = node.attrs['src'] as string | null;
      const safe = src && isSafeUrl(src, httpOnly) ? src : null;
      return [
        name,
        mergeAttributes(HTMLAttributes, {
          src: safe,
          controls: 'true',
          preload: 'metadata',
          class: `kt-${name}`,
          'aria-label': (node.attrs['title'] as string | null) ?? label,
        }),
      ];
    },

    addCommands() {
      const insert =
        ({ src, title }: { src: string; title?: string }) =>
        ({ chain }: CommandProps) =>
          isSafeUrl(src, httpOnly) &&
          chain()
            .command(moveCursorAfterNode)
            .insertContent({ type: name, attrs: { src, title: title ?? null } })
            .command(moveCursorAfterNode)
            .run();
      return name === 'video' ? { setVideo: insert } : { setAudio: insert };
    },
  });

export const Video = mediaNode('video', 'video');
export const Audio = mediaNode('audio', 'audio');

export interface EmbedOptions {
  /** Hosts allowed in iframes (subdomains included). */
  allowedHosts: readonly string[];
}

/** Sandboxed iframe for web content from allowed hosts. */
export const Embed = Node.create<EmbedOptions>({
  name: 'embed',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addOptions() {
    return { allowedHosts: DEFAULT_EMBED_HOSTS };
  },

  addAttributes() {
    return {
      src: {
        default: null,
        parseHTML: (element: HTMLElement) =>
          (element.tagName === 'IFRAME' ? element : element.querySelector('iframe'))?.getAttribute(
            'src',
          ) ?? null,
      },
      title: { default: null },
      height: {
        default: 400,
        parseHTML: (element: HTMLElement) => {
          const value = Number.parseInt(
            (element.tagName === 'IFRAME'
              ? element
              : element.querySelector('iframe')
            )?.getAttribute('height') ?? '',
            10,
          );
          return Number.isFinite(value) && value > 0 ? Math.min(value, 2000) : 400;
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="embed"]' }, { tag: 'iframe[src]' }];
  },

  renderHTML({ node }) {
    const src = node.attrs['src'] as string | null;
    const allowed =
      src !== null && hostAllowed(src, this.options.allowedHosts) && src.startsWith('https://');
    return [
      'div',
      { 'data-type': 'embed', class: 'kt-embed' },
      [
        'iframe',
        {
          src: allowed ? src : 'about:blank',
          title: (node.attrs['title'] as string | null) ?? 'embed',
          height: String(node.attrs['height'] ?? 400),
          loading: 'lazy',
          allowfullscreen: 'true',
          referrerpolicy: 'strict-origin-when-cross-origin',
          sandbox: 'allow-scripts allow-same-origin allow-popups allow-presentation allow-forms',
        },
      ],
    ];
  },

  addCommands() {
    return {
      setEmbed:
        ({ src, title, height }) =>
        ({ chain }) => {
          if (!src.startsWith('https://') || !hostAllowed(src, this.options.allowedHosts))
            return false;
          return chain()
            .command(moveCursorAfterNode)
            .insertContent({
              type: this.name,
              attrs: { src, title: title ?? null, height: height ?? 400 },
            })
            .command(moveCursorAfterNode)
            .run();
        },
    };
  },
});

/** Converts YouTube/Vimeo page links to embeddable player URLs; other URLs are returned as is. */
export function toEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    if (host === 'youtu.be')
      return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`;
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const id =
        parsed.searchParams.get('v') ?? parsed.pathname.match(/\/(?:shorts|embed)\/([\w-]+)/)?.[1];
      if (id) return `https://www.youtube-nocookie.com/embed/${id}`;
    }
    if (host === 'vimeo.com') {
      const id = parsed.pathname.match(/^\/(\d+)/)?.[1];
      if (id) return `https://player.vimeo.com/video/${id}`;
    }
    return url;
  } catch {
    return url;
  }
}

const VIDEO_FILE = /\.(mp4|webm|ogv|mov|m4v)(\?|#|$)/i;
const AUDIO_FILE = /\.(mp3|ogg|oga|wav|m4a|aac|flac|opus)(\?|#|$)/i;

/** Decides how a pasted media URL should be inserted. */
export function classifyMediaUrl(url: string): 'video' | 'audio' | 'embed' | null {
  if (VIDEO_FILE.test(url)) return 'video';
  if (AUDIO_FILE.test(url)) return 'audio';
  if (/^https:\/\//i.test(url)) return 'embed';
  return null;
}
