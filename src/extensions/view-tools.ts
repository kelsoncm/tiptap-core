import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import {
  Plugin,
  PluginKey,
  TextSelection,
  type EditorState,
  type Transaction,
} from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    viewTools: {
      /** Shows or hides spaces, paragraph marks and line breaks. */
      toggleInvisibleCharacters: (visible?: boolean) => ReturnType;
      setSearchTerm: (term: string) => ReturnType;
      setReplaceTerm: (term: string) => ReturnType;
      setSearchOptions: (options: Partial<SearchOptions>) => ReturnType;
      /** Moves to (and selects) the next/previous match. */
      nextSearchResult: () => ReturnType;
      previousSearchResult: () => ReturnType;
      /** Replaces the current match and moves to the next one. */
      replaceCurrent: () => ReturnType;
      replaceAll: () => ReturnType;
      clearSearch: () => ReturnType;
      /** Marks the selection as written in another language (`lang` attribute). */
      setTextLanguage: (lang: string) => ReturnType;
      unsetTextLanguage: () => ReturnType;
    };
  }
  interface Storage {
    invisibleCharacters: { visible: boolean };
    searchReplace: SearchStorage;
  }
}

// ---------------------------------------------------------------- Invisible characters

const invisiblesKey = new PluginKey('ktInvisibles');
const NBSP = String.fromCharCode(0xa0);
/** Stands for non-text leaves (mentions, images) when matching text. */
const OBJECT_CHAR = String.fromCharCode(0xfffc);

/** Paragraph marks (¶), spaces (·), non-breaking spaces (°) and line breaks (↵). */
export const InvisibleCharacters = Extension.create<Record<string, never>, { visible: boolean }>({
  name: 'invisibleCharacters',

  addStorage() {
    return { visible: false };
  },

  addCommands() {
    return {
      toggleInvisibleCharacters:
        (visible) =>
        ({ tr, dispatch }) => {
          this.storage.visible = visible ?? !this.storage.visible;
          if (dispatch) dispatch(tr.setMeta(invisiblesKey, this.storage.visible));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: invisiblesKey,
        props: {
          decorations: (state) => {
            if (!storage.visible) return null;
            const decorations: Decoration[] = [];
            state.doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                for (let i = 0; i < node.text.length; i++) {
                  const char = node.text[i];
                  if (char === ' ' || char === NBSP) {
                    decorations.push(
                      Decoration.inline(pos + i, pos + i + 1, {
                        class: char === ' ' ? 'kt-invisible-space' : 'kt-invisible-nbsp',
                      }),
                    );
                  }
                }
              } else if (node.type.name === 'hardBreak') {
                decorations.push(
                  Decoration.widget(pos, () => mark('↵', 'kt-invisible-break'), { side: -1 }),
                );
              } else if (node.isTextblock) {
                decorations.push(
                  Decoration.widget(
                    pos + node.nodeSize - 1,
                    () => mark('¶', 'kt-invisible-paragraph'),
                    {
                      side: 1,
                    },
                  ),
                );
              }
              return true;
            });
            return DecorationSet.create(state.doc, decorations);
          },
        },
      }),
    ];
  },
});

const mark = (text: string, className: string): HTMLElement => {
  const span = document.createElement('span');
  span.className = className;
  span.textContent = text;
  span.setAttribute('aria-hidden', 'true');
  span.contentEditable = 'false';
  return span;
};

// ---------------------------------------------------------------- Find and replace

export interface SearchOptions {
  caseSensitive: boolean;
  /** Treat the term as a regular expression. */
  regex: boolean;
  wholeWord: boolean;
}

export interface SearchResult {
  from: number;
  to: number;
}

export interface SearchStorage extends SearchOptions {
  term: string;
  replace: string;
  results: SearchResult[];
  index: number;
  /** Error message when the regular expression is invalid. */
  error: string | null;
}

const searchKey = new PluginKey('ktSearchReplace');
const escapeRegExp = (value: string): string => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Builds the search pattern; returns an error message for invalid regex. */
export function buildSearchPattern(term: string, options: SearchOptions): RegExp | string {
  if (!term) return 'empty';
  try {
    let source = options.regex ? term : escapeRegExp(term);
    if (options.wholeWord) source = `(?<![\\p{L}\\d_])(?:${source})(?![\\p{L}\\d_])`;
    return new RegExp(source, options.caseSensitive ? 'gu' : 'giu');
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
}

/** Finds matches inside each text block (matches never span blocks). */
export function findMatches(doc: PMNode, pattern: RegExp): SearchResult[] {
  const results: SearchResult[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    // Map text offsets to positions, leaf nodes (mentions, images) count as one char.
    let text = '';
    const positions: number[] = [];
    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) positions.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        positions.push(pos + 1 + offset);
        text += OBJECT_CHAR;
      }
    });
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (match[0].length === 0) {
        pattern.lastIndex++;
        continue;
      }
      const from = positions[match.index];
      const last = positions[match.index + match[0].length - 1];
      if (from !== undefined && last !== undefined) results.push({ from, to: last + 1 });
    }
    return false;
  });
  return results;
}

/** Find & replace with highlighted matches (`kt-search-match`, current `kt-search-current`). */
export const SearchReplace = Extension.create<Record<string, never>, SearchStorage>({
  name: 'searchReplace',

  addStorage() {
    return {
      term: '',
      replace: '',
      caseSensitive: false,
      regex: false,
      wholeWord: false,
      results: [],
      index: -1,
      error: null,
    };
  },

  addCommands() {
    const refresh = (state: EditorState): void => {
      const pattern = buildSearchPattern(this.storage.term, this.storage);
      if (typeof pattern === 'string') {
        this.storage.results = [];
        this.storage.index = -1;
        this.storage.error = pattern === 'empty' ? null : pattern;
        return;
      }
      this.storage.error = null;
      this.storage.results = findMatches(state.doc, pattern);
      const { from } = state.selection;
      const next = this.storage.results.findIndex((r) => r.from >= from);
      this.storage.index = this.storage.results.length ? Math.max(0, next) : -1;
    };
    const select =
      (index: number) =>
      ({ tr, dispatch }: { tr: Transaction; dispatch?: unknown }) => {
        const result = this.storage.results[index];
        if (!result) return false;
        this.storage.index = index;
        if (dispatch) {
          tr.setSelection(TextSelection.create(tr.doc, result.from, result.to)).scrollIntoView();
          tr.setMeta(searchKey, 'select');
        }
        return true;
      };

    return {
      setSearchTerm:
        (term) =>
        ({ state, tr, dispatch }) => {
          this.storage.term = term;
          refresh(state);
          if (dispatch) dispatch(tr.setMeta(searchKey, 'term'));
          return true;
        },
      setReplaceTerm: (term) => () => {
        this.storage.replace = term;
        return true;
      },
      setSearchOptions:
        (options) =>
        ({ state, tr, dispatch }) => {
          Object.assign(this.storage, options);
          refresh(state);
          if (dispatch) dispatch(tr.setMeta(searchKey, 'options'));
          return true;
        },
      nextSearchResult: () => (props) => {
        const count = this.storage.results.length;
        return count > 0 && select((this.storage.index + 1) % count)(props);
      },
      previousSearchResult: () => (props) => {
        const count = this.storage.results.length;
        return count > 0 && select((this.storage.index - 1 + count) % count)(props);
      },
      replaceCurrent:
        () =>
        ({ tr, dispatch }) => {
          const result = this.storage.results[this.storage.index];
          if (!result) return false;
          if (dispatch) {
            const text = this.storage.replace;
            if (text) tr.insertText(text, result.from, result.to);
            else tr.delete(result.from, result.to);
            dispatch(tr);
          }
          // Matches are recomputed by the plugin's appendTransaction.
          return true;
        },
      replaceAll:
        () =>
        ({ tr, dispatch }) => {
          const results = [...this.storage.results];
          if (results.length === 0) return false;
          if (dispatch) {
            // From the end so earlier positions stay valid.
            for (const result of results.reverse()) {
              if (this.storage.replace) tr.insertText(this.storage.replace, result.from, result.to);
              else tr.delete(result.from, result.to);
            }
            dispatch(tr);
          }
          // Matches are recomputed by the plugin's appendTransaction.
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          this.storage.term = '';
          this.storage.results = [];
          this.storage.index = -1;
          this.storage.error = null;
          if (dispatch) dispatch(tr.setMeta(searchKey, 'clear'));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: searchKey,
        appendTransaction: (transactions, _old, state) => {
          // Keep matches in sync with edits.
          if (!storage.term || !transactions.some((tr) => tr.docChanged)) return null;
          const pattern = buildSearchPattern(storage.term, storage);
          if (typeof pattern === 'string') return null;
          storage.results = findMatches(state.doc, pattern);
          if (storage.index >= storage.results.length) storage.index = storage.results.length - 1;
          return null;
        },
        props: {
          decorations: (state) => {
            if (!storage.term || storage.results.length === 0) return null;
            return DecorationSet.create(
              state.doc,
              storage.results.map((r, i) =>
                Decoration.inline(r.from, r.to, {
                  class:
                    i === storage.index ? 'kt-search-match kt-search-current' : 'kt-search-match',
                }),
              ),
            );
          },
        },
      }),
    ];
  },
});

// ---------------------------------------------------------------- Text part language

const LANG_TAG = /^[a-z]{2,3}(-[A-Za-z0-9]{2,8})*$/;

/** `<span lang="en">` for passages in another language (screen readers, spell checkers). */
export const TextLanguage = Mark.create({
  name: 'textLanguage',

  addAttributes() {
    return {
      lang: {
        default: null,
        parseHTML: (element) => element.getAttribute('lang'),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[lang]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'kt-lang' }), 0];
  },

  addCommands() {
    return {
      setTextLanguage:
        (lang) =>
        ({ commands }) =>
          LANG_TAG.test(lang) && commands.setMark(this.name, { lang }),
      unsetTextLanguage:
        () =>
        ({ commands }) =>
          commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },
});
