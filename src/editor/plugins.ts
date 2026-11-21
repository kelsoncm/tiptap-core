import type { AnyExtension } from '@tiptap/core';

import type { CommandRegistry } from '../commands/registry.js';
import type { I18n, Messages } from '../i18n/i18n.js';

/**
 * Optional bundle of extensions + commands + messages, kept out of the main entry when it
 * pulls heavy dependencies (e.g. `@kelsoncm/tiptap-core/math` with KaTeX).
 */
export interface EditorPlugin {
  name: string;
  extensions?: (i18n: I18n) => AnyExtension[];
  register?: (registry: CommandRegistry, i18n: I18n) => void;
  /** Extra translations, by locale. */
  messages?: Readonly<Record<string, Messages>>;
}
