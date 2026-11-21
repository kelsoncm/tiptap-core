import { Extension } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type IssueSeverity = 'error' | 'warning';

export interface DocumentIssue {
  /** Rule id, e.g. `image-alt` or a LanguageTool rule id. */
  rule: string;
  source: 'accessibility' | 'spelling';
  severity: IssueSeverity;
  /** i18n key (accessibility) or literal message (spelling services). */
  message: string;
  /** Params interpolated into `message` when it is an i18n key. */
  params?: Record<string, string | number>;
  from: number;
  to: number;
  /** Suggested replacements (spelling). */
  replacements?: string[];
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    checkers: {
      /** Stores issues of a source and highlights them. */
      setIssues: (source: DocumentIssue['source'], issues: DocumentIssue[]) => ReturnType;
      clearIssues: (source?: DocumentIssue['source']) => ReturnType;
      /** Replaces the text of an issue with a suggestion. */
      applySuggestion: (issue: DocumentIssue, replacement: string) => ReturnType;
    };
  }
  interface Storage {
    checkers: { issues: Map<DocumentIssue['source'], DocumentIssue[]> };
  }
}

// ---------------------------------------------------------------- Accessibility rules

/** WCAG relative luminance of a #rgb/#rrggbb/rgb() color, or null if not parseable. */
export function luminance(color: string): number | null {
  let r: number;
  let g: number;
  let b: number;
  const hex = /^#([\da-f]{3}|[\da-f]{6})$/i.exec(color.trim());
  const rgb = /^rgba?\(\s*(\d+)[,\s]+(\d+)[,\s]+(\d+)/i.exec(color.trim());
  if (hex) {
    const value = hex[1] ?? '';
    const full = value.length === 3 ? [...value].map((c) => c + c).join('') : value;
    [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [
      number,
      number,
      number,
    ];
  } else if (rgb) {
    [r, g, b] = [rgb[1], rgb[2], rgb[3]].map(Number) as [number, number, number];
  } else {
    return null;
  }
  const channel = (c: number): number => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colors (1–21), or null. */
export function contrastRatio(foreground: string, background: string): number | null {
  const a = luminance(foreground);
  const b = luminance(background);
  if (a === null || b === null) return null;
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

const VAGUE_LINK_TEXT =
  /^(clique aqui|clique|aqui|saiba mais|leia mais|link|veja|click here|here|read more|more|haga clic aquí|aquí)$/i;

export interface AccessibilityOptions {
  /** Background used for contrast checks. Default: white. */
  background?: string;
  /** Minimum contrast for normal text. Default: 4.5 (WCAG AA). */
  minContrast?: number;
}

/**
 * Checks common accessibility problems: images without alt text, skipped or empty
 * headings, tables without header cells, vague or empty link text and low color contrast.
 */
export function checkAccessibility(
  doc: PMNode,
  options: AccessibilityOptions = {},
): DocumentIssue[] {
  const background = options.background ?? '#ffffff';
  const minContrast = options.minContrast ?? 4.5;
  const issues: DocumentIssue[] = [];
  const issue = (
    rule: string,
    severity: IssueSeverity,
    message: string,
    from: number,
    to: number,
    params?: Record<string, string | number>,
  ): void => {
    issues.push({
      rule,
      source: 'accessibility',
      severity,
      message,
      from,
      to,
      ...(params ? { params } : {}),
    });
  };
  let lastLevel = 0;
  const contrastSeen = new Set<string>();

  doc.descendants((node, pos) => {
    const end = pos + node.nodeSize;
    switch (node.type.name) {
      case 'image':
        if (!String(node.attrs['alt'] ?? '').trim())
          issue('image-alt', 'error', 'editor.a11y.imageAlt', pos, end);
        break;
      case 'heading': {
        const level = Number(node.attrs['level']) || 1;
        if (!node.textContent.trim())
          issue('heading-empty', 'warning', 'editor.a11y.headingEmpty', pos, end);
        if (lastLevel && level > lastLevel + 1) {
          issue('heading-order', 'warning', 'editor.a11y.headingOrder', pos, end, {
            from: lastLevel,
            to: level,
          });
        }
        lastLevel = level;
        break;
      }
      case 'table': {
        let hasHeader = false;
        node.descendants((child) => {
          if (child.type.name === 'tableHeader') hasHeader = true;
          return !hasHeader;
        });
        if (!hasHeader) issue('table-header', 'warning', 'editor.a11y.tableHeader', pos, end);
        break;
      }
      default:
        break;
    }
    if (node.isText && node.text) {
      for (const mark of node.marks) {
        if (mark.type.name === 'link') {
          const text = node.text.trim();
          if (!text) issue('link-empty', 'error', 'editor.a11y.linkEmpty', pos, end);
          else if (VAGUE_LINK_TEXT.test(text))
            issue('link-text', 'warning', 'editor.a11y.linkText', pos, end, { text });
        }
        if (mark.type.name === 'textStyle' && mark.attrs['color']) {
          const bg =
            (node.marks.find((m) => m.type.name === 'highlight')?.attrs['color'] as
              string | undefined) ?? background;
          const ratio = contrastRatio(String(mark.attrs['color']), bg);
          const key = `${pos}`;
          if (ratio !== null && ratio < minContrast && !contrastSeen.has(key)) {
            contrastSeen.add(key);
            issue('color-contrast', 'warning', 'editor.a11y.contrast', pos, end, {
              ratio: Math.round(ratio * 10) / 10,
            });
          }
        }
      }
    }
    return true;
  });
  return issues;
}

// ---------------------------------------------------------------- Spelling (LanguageTool)

export interface TextMap {
  text: string;
  /** Document position of each character of `text` (-1 for block separators). */
  positions: number[];
}

/** Plain text of the document with a position map (blocks separated by "\n\n"). */
export function textWithPositions(doc: PMNode): TextMap {
  let text = '';
  const positions: number[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    if (text) {
      text += '\n\n';
      positions.push(-1, -1);
    }
    node.forEach((child, offset) => {
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) positions.push(pos + 1 + offset + i);
        text += child.text;
      } else {
        positions.push(pos + 1 + offset);
        text += ' ';
      }
    });
    return false;
  });
  return { text, positions };
}

/** Converts LanguageTool-style matches (offset/length) into issues. */
export function matchesToIssues(
  map: TextMap,
  matches: readonly {
    offset: number;
    length: number;
    message: string;
    rule?: { id?: string; issueType?: string };
    replacements?: readonly { value: string }[];
  }[],
): DocumentIssue[] {
  const issues: DocumentIssue[] = [];
  for (const match of matches) {
    const from = map.positions[match.offset];
    const last = map.positions[match.offset + match.length - 1];
    if (from === undefined || last === undefined || from < 0 || last < 0) continue;
    issues.push({
      rule: match.rule?.id ?? 'spelling',
      source: 'spelling',
      severity: match.rule?.issueType === 'misspelling' ? 'error' : 'warning',
      message: match.message,
      from,
      to: last + 1,
      replacements: (match.replacements ?? []).slice(0, 5).map((r) => r.value),
    });
  }
  return issues;
}

export interface LanguageToolOptions {
  /** e.g. `https://api.languagetool.org/v2/check` or your own server. */
  endpoint: string;
  /** Language code; default: editor locale. */
  language?: string;
  /** Extra form fields (username/apiKey for premium accounts). */
  params?: Record<string, string>;
}

/** Sends the document text to a LanguageTool-compatible endpoint. */
export async function checkSpelling(
  doc: PMNode,
  options: LanguageToolOptions,
  language: string,
): Promise<DocumentIssue[]> {
  const map = textWithPositions(doc);
  if (!map.text.trim()) return [];
  const body = new URLSearchParams({
    text: map.text,
    language: options.language ?? language,
    ...options.params,
  });
  const response = await fetch(options.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body,
  });
  if (!response.ok) throw new Error(`Verificador ortográfico respondeu ${response.status}.`);
  const data = (await response.json()) as { matches?: Parameters<typeof matchesToIssues>[1] };
  return matchesToIssues(map, data.matches ?? []);
}

// ---------------------------------------------------------------- Highlighting

const checkersKey = new PluginKey('ktCheckers');

/** Highlights issues from the checkers (`kt-issue-spelling`, `kt-issue-accessibility`). */
export const Checkers = Extension.create<
  Record<string, never>,
  { issues: Map<DocumentIssue['source'], DocumentIssue[]> }
>({
  name: 'checkers',

  addStorage() {
    return { issues: new Map() };
  },

  addCommands() {
    return {
      setIssues:
        (source, issues) =>
        ({ tr, dispatch }) => {
          this.storage.issues.set(source, issues);
          if (dispatch) dispatch(tr.setMeta(checkersKey, source));
          return true;
        },
      clearIssues:
        (source) =>
        ({ tr, dispatch }) => {
          if (source) this.storage.issues.delete(source);
          else this.storage.issues.clear();
          if (dispatch) dispatch(tr.setMeta(checkersKey, 'clear'));
          return true;
        },
      applySuggestion:
        (issue, replacement) =>
        ({ tr, dispatch, state }) => {
          if (issue.to > state.doc.content.size) return false;
          if (dispatch) {
            tr.insertText(replacement, issue.from, issue.to);
            const list = this.storage.issues.get(issue.source) ?? [];
            const delta = replacement.length - (issue.to - issue.from);
            this.storage.issues.set(
              issue.source,
              list
                .filter((i) => i !== issue)
                .map((i) =>
                  i.from > issue.from ? { ...i, from: i.from + delta, to: i.to + delta } : i,
                ),
            );
            dispatch(tr);
          }
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: checkersKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, set, _old, state) => {
            if (tr.getMeta(checkersKey) !== undefined || !set) {
              const decorations: Decoration[] = [];
              for (const [source, issues] of storage.issues) {
                for (const issue of issues) {
                  if (issue.to > state.doc.content.size || issue.from >= issue.to) continue;
                  decorations.push(
                    Decoration.inline(
                      issue.from,
                      issue.to,
                      {
                        class: `kt-issue kt-issue-${source} is-${issue.severity}`,
                        title: issue.message,
                      },
                      { issue },
                    ),
                  );
                }
              }
              return DecorationSet.create(state.doc, decorations);
            }
            // Keep highlights aligned while typing; text edited inside an issue drops it.
            return set.map(tr.mapping, tr.doc);
          },
        },
        props: {
          decorations: (state) => checkersKey.getState(state) as DecorationSet,
        },
      }),
    ];
  },
});
