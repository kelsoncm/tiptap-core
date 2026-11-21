import { Extension, type AnyExtension, type Editor } from '@tiptap/core';

import type { CommandRegistry } from '../commands/registry.js';
import {
  Anchor,
  checkLinks,
  getLinkAt,
  LinkChecker,
  listAnchors,
  type LinkCheckResult,
} from '../extensions/links.js';
import type { I18n } from '../i18n/i18n.js';
import { openFormDialog } from '../ui/dialog.js';
import { isSafeUrl, normalizeHref } from '../utils/url.js';

export interface LinkOptions {
  /** Open links in a new tab by default. Default: false. */
  newTabByDefault?: boolean;
  /** Reachability check for the link checker (e.g. a HEAD request through your API). */
  isReachable?: (href: string) => Promise<boolean>;
  /** Receives the link checker results (to list them in your UI). */
  onCheck?: (results: LinkCheckResult[]) => void;
}

/** StarterKit `link` configuration: no navigation on click while editing, safe URLs only. */
export const SAFE_LINK_CONFIG = {
  openOnClick: false,
  enableClickSelection: true,
  autolink: true,
  linkOnPaste: true,
  defaultProtocol: 'https',
  isAllowedUri: (url: string, ctx: { defaultValidate: (url: string) => boolean }) =>
    isSafeUrl(url) && ctx.defaultValidate(url),
  HTMLAttributes: { rel: 'noopener noreferrer nofollow', target: null },
} as const;

export function linkExtensions(registry: CommandRegistry): AnyExtension[] {
  return [
    Anchor,
    LinkChecker,
    Extension.create({
      name: 'linkShortcut',
      addKeyboardShortcuts() {
        return { 'Mod-k': () => registry.has('link') && registry.run(this.editor, 'link') };
      },
    }),
  ];
}

export interface LinkPayload {
  href: string;
  newTab?: boolean;
  /** Text to insert when the selection is empty (defaults to the URL). */
  text?: string;
}

/** Applies a link to the selection (or inserts text) — validated. */
export function applyLink(editor: Editor, payload: LinkPayload): boolean {
  const href = normalizeHref(payload.href);
  if (!href || !isSafeUrl(href)) return false;
  const attrs = { href, target: payload.newTab ? '_blank' : null };
  const { empty } = editor.state.selection;
  if (empty && !editor.isActive('link')) {
    const text = payload.text?.trim() || href;
    return editor
      .chain()
      .focus()
      .insertContent({ type: 'text', text, marks: [{ type: 'link', attrs }] })
      .run();
  }
  return editor.chain().focus().extendMarkRange('link').setLink(attrs).run();
}

export function registerLinkCommands(
  registry: CommandRegistry,
  i18n: I18n,
  options: LinkOptions = {},
): void {
  const editable = (e: Editor): boolean => e.isEditable;

  registry.register<LinkPayload | undefined>({
    id: 'link',
    labelKey: 'editor.toolbar.link',
    icon: 'link',
    shortcut: 'Mod-k',
    group: 'insert',
    isActive: (e) => e.isActive('link'),
    isEnabled: editable,
    run: (e, payload) => {
      if (payload) return applyLink(e, payload);
      const current = getLinkAt(e);
      const { from, to, empty } = e.state.selection;
      const anchors = listAnchors(e.state.doc);
      void openFormDialog({
        i18n,
        titleKey: current ? 'editor.links.edit' : 'editor.toolbar.link',
        submitKey: 'common.save',
        fields: [
          {
            name: 'href',
            labelKey: 'editor.links.url',
            type: 'text',
            value: current?.href ?? '',
            required: true,
          },
          ...(empty && !current ? [{ name: 'text', labelKey: 'editor.links.text' }] : []),
          {
            name: 'newTab',
            labelKey: 'editor.links.newTab',
            type: 'checkbox' as const,
            value: current ? current.target === '_blank' : (options.newTabByDefault ?? false),
          },
        ],
        datalist: anchors.length ? { href: anchors.map((id) => `#${id}`) } : undefined,
      }).then((values) => {
        if (!values) return;
        e.commands.setTextSelection({ from, to });
        const ok = applyLink(e, {
          href: String(values['href'] ?? ''),
          newTab: values['newTab'] === true,
          text: String(values['text'] ?? ''),
        });
        if (!ok) console.error('[tiptap-core]', i18n.t('validation.invalidUrl'));
      });
      return true;
    },
  });

  registry.register({
    id: 'unlink',
    labelKey: 'editor.toolbar.unlink',
    icon: 'unlink',
    group: 'insert',
    isEnabled: (e) => editable(e) && e.isActive('link'),
    run: (e) => e.chain().focus().extendMarkRange('link').unsetLink().run(),
  });

  registry.register({
    id: 'openLink',
    labelKey: 'editor.links.open',
    icon: 'open-link',
    group: 'insert',
    isEnabled: (e) => e.isActive('link'),
    run: (e) => {
      const link = getLinkAt(e);
      if (!link || !isSafeUrl(link.href) || typeof window === 'undefined') return false;
      window.open(link.href, '_blank', 'noopener,noreferrer');
      return true;
    },
  });

  registry.register<string | undefined>({
    id: 'anchor',
    labelKey: 'editor.links.anchor',
    icon: 'anchor',
    group: 'insert',
    isEnabled: editable,
    run: (e, name) => {
      if (name) return e.chain().focus().setAnchor(name).run();
      const { from } = e.state.selection;
      void openFormDialog({
        i18n,
        titleKey: 'editor.links.anchor',
        fields: [{ name: 'name', labelKey: 'editor.links.anchorName', required: true }],
      }).then((values) => {
        const value = values ? String(values['name'] ?? '') : '';
        if (value) e.chain().setTextSelection(from).setAnchor(value).run();
      });
      return true;
    },
  });

  registry.register({
    id: 'checkLinks',
    labelKey: 'editor.links.check',
    icon: 'check-links',
    group: 'tools',
    run: (e) => {
      void checkLinks(e.state.doc, options.isReachable).then((results) => {
        if (e.isDestroyed) return;
        e.commands.setLinkCheckResults(results);
        options.onCheck?.(results);
      });
      return true;
    },
  });
}
