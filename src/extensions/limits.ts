import { Extension, InputRule } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';

import { getDocumentStats, type DocumentStats } from '../utils/stats.js';

export interface DocumentLimits {
  /** Characters without whitespace (same rule as the counters). */
  maxCharacters?: number;
  maxWords?: number;
  maxParagraphs?: number;
  /** Minimums are only reported (status bar), never enforced while typing. */
  minCharacters?: number;
  minWords?: number;
  minParagraphs?: number;
}

export type LimitKey = 'characters' | 'words' | 'paragraphs';

export interface LimitStatus {
  stats: DocumentStats;
  /** Counters above their maximum (possible after setContent). */
  over: LimitKey[];
  /** Counters below their minimum. */
  under: LimitKey[];
}

const MAX: Record<LimitKey, keyof DocumentLimits> = {
  characters: 'maxCharacters',
  words: 'maxWords',
  paragraphs: 'maxParagraphs',
};
const MIN: Record<LimitKey, keyof DocumentLimits> = {
  characters: 'minCharacters',
  words: 'minWords',
  paragraphs: 'minParagraphs',
};
const KEYS: readonly LimitKey[] = ['characters', 'words', 'paragraphs'];

/** Compares stats with the limits. */
export function limitStatus(stats: DocumentStats, limits: DocumentLimits): LimitStatus {
  const over = KEYS.filter((key) => {
    const max = limits[MAX[key]];
    return max !== undefined && stats[key] > max;
  });
  const under = KEYS.filter((key) => {
    const min = limits[MIN[key]];
    return min !== undefined && stats[key] < min;
  });
  return { stats, over, under };
}

export const documentLimitsKey = new PluginKey('ktDocumentLimits');

/** Lets a transaction exceed the limits (e.g. loading a stored document). */
export const LIMITS_BYPASS = 'documentLimitsBypass';

/**
 * Blocks changes that would push characters, words or paragraphs above the maximum.
 * Changes that keep or reduce a counter that is already over the limit are allowed, so
 * an oversized document can still be shortened.
 */
export const DocumentLimitsExtension = Extension.create<DocumentLimits>({
  name: 'documentLimits',

  addOptions() {
    return {};
  },

  addProseMirrorPlugins() {
    const limits = this.options;
    const enforced = KEYS.filter((key) => limits[MAX[key]] !== undefined);
    if (enforced.length === 0) return [];
    return [
      new Plugin({
        key: documentLimitsKey,
        filterTransaction: (tr, state) => {
          if (!tr.docChanged || tr.getMeta(LIMITS_BYPASS) || tr.getMeta('preventUpdate'))
            return true;
          const before = getDocumentStats(state.doc);
          const after = getDocumentStats(tr.doc);
          return enforced.every((key) => {
            const max = limits[MAX[key]] as number;
            return after[key] <= max || after[key] <= before[key];
          });
        },
      }),
    ];
  },
});

export interface AutocorrectOptions {
  /** Typographic replacements: quotes, dashes, ellipsis, (c), arrows, fractions. Default: true. */
  typography: boolean;
  /** Word replacements applied when the word is followed by a space or punctuation. */
  replacements: Readonly<Record<string, string>>;
  /** Capitalize the first letter of a sentence. Default: false. */
  capitalizeSentences: boolean;
}

const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Word replacements ("vc " -> "você ") and optional sentence capitalization. */
export const Autocorrect = Extension.create<Omit<AutocorrectOptions, 'typography'>>({
  name: 'autocorrect',

  addOptions() {
    return { replacements: {}, capitalizeSentences: false };
  },

  addInputRules() {
    const rules: InputRule[] = [];
    for (const [from, to] of Object.entries(this.options.replacements)) {
      if (!from.trim()) continue;
      rules.push(
        new InputRule({
          find: new RegExp(`(?:^|\\s)(${escapeRegExp(from)})([\\s.,;:!?])$`, 'iu'),
          // The typed separator (match[2]) is not in the document yet: replace the word
          // and insert the separator ourselves.
          handler: ({ state, range, match }) => {
            const word = match[1] ?? '';
            const separator = match[2] ?? '';
            // Keep a leading capital ("Vc" -> "Você", e.g. after sentence capitalization).
            const first = word.charAt(0);
            const replacement =
              first !== first.toLocaleLowerCase('pt-BR')
                ? to.charAt(0).toLocaleUpperCase('pt-BR') + to.slice(1)
                : to;
            const start = range.from + (match[0].length - word.length - separator.length);
            state.tr.insertText(`${replacement}${separator}`, start, range.to);
          },
        }),
      );
    }
    if (this.options.capitalizeSentences) {
      rules.push(
        new InputRule({
          // A lowercase letter after ". ", "! ", "? " or at the start of a paragraph.
          find: /(?:^|[.!?]\s)(\p{Ll})$/u,
          handler: ({ state, range, match }) => {
            const letter = match[1] ?? '';
            const upper = letter.toLocaleUpperCase('pt-BR');
            // Depending on the input path the typed letter may already be in the document.
            const start = Math.max(0, range.to - letter.length);
            const typed = state.doc.textBetween(start, range.to) === letter;
            state.tr.insertText(upper, typed ? start : range.to, range.to);
          },
        }),
      );
    }
    return rules;
  },
});
