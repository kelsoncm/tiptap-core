import { Extension, Mark, mergeAttributes } from '@tiptap/core';
import type { Mark as PMMark, MarkType, Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, TextSelection, type Transaction } from '@tiptap/pm/state';
import { ReplaceStep } from '@tiptap/pm/transform';

import type { RevisionUser } from './comments.js';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    trackChanges: {
      /** Turns suggestion mode on or off. */
      setTrackChanges: (enabled: boolean) => ReturnType;
      /** Accepts/rejects the change at the selection (or every change in it). */
      acceptChange: () => ReturnType;
      rejectChange: () => ReturnType;
      acceptAllChanges: () => ReturnType;
      rejectAllChanges: () => ReturnType;
    };
  }
  interface Storage {
    trackChanges: { enabled: boolean };
  }
}

export interface TrackChangesOptions {
  enabled: boolean;
  user: RevisionUser | null;
}

/** Skips change tracking for a transaction (accept/reject, programmatic content). */
export const TRACK_CHANGES_BYPASS = 'trackChangesBypass';
export const trackChangesKey = new PluginKey('ktTrackChanges');

const changeAttributes = {
  author: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('data-author'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes['author'] ? { 'data-author': attributes['author'] } : {},
  },
  authorName: {
    default: null,
    parseHTML: (element: HTMLElement) =>
      element.getAttribute('data-author-name') ?? element.getAttribute('title'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes['authorName']
        ? { 'data-author-name': attributes['authorName'], title: attributes['authorName'] }
        : {},
  },
  date: {
    default: null,
    parseHTML: (element: HTMLElement) => element.getAttribute('datetime'),
    renderHTML: (attributes: Record<string, unknown>) =>
      attributes['date'] ? { datetime: attributes['date'] } : {},
  },
};

/** Suggested insertion: `<ins data-author datetime>`. */
export const Insertion = Mark.create({
  name: 'insertion',
  inclusive: true,
  // Exclusive with itself too (a new insertion replaces the old mark, no nesting).
  excludes: 'insertion deletion',
  addAttributes: () => changeAttributes,
  parseHTML: () => [{ tag: 'ins' }],
  renderHTML: ({ HTMLAttributes }) => [
    'ins',
    mergeAttributes(HTMLAttributes, { class: 'kt-insertion' }),
    0,
  ],
});

/** Suggested deletion: `<del data-author datetime>`. */
export const Deletion = Mark.create({
  name: 'deletion',
  inclusive: false,
  excludes: 'deletion insertion',
  addAttributes: () => changeAttributes,
  parseHTML: () => [{ tag: 'del' }],
  renderHTML: ({ HTMLAttributes }) => [
    'del',
    mergeAttributes(HTMLAttributes, { class: 'kt-deletion' }),
    0,
  ],
});

export interface TrackedChange {
  type: 'insertion' | 'deletion';
  from: number;
  to: number;
  text: string;
  author: string | null;
  authorName: string | null;
  date: string | null;
}

/** Suggested changes in document order (adjacent pieces of the same change merged). */
export function listChanges(doc: PMNode): TrackedChange[] {
  const changes: TrackedChange[] = [];
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      const type = mark.type.name;
      if (type !== 'insertion' && type !== 'deletion') continue;
      const last = changes[changes.length - 1];
      if (last && last.type === type && last.to === pos && last.author === mark.attrs['author']) {
        last.to = pos + node.nodeSize;
        last.text += node.text ?? '';
      } else {
        changes.push({
          type,
          from: pos,
          to: pos + node.nodeSize,
          text: node.text ?? '',
          author: (mark.attrs['author'] as string | null) ?? null,
          authorName: (mark.attrs['authorName'] as string | null) ?? null,
          date: (mark.attrs['date'] as string | null) ?? null,
        });
      }
    }
    return false;
  });
  return changes;
}

/** Applies accept/reject to changes inside [from, to] (all when omitted). */
function resolveChanges(
  tr: Transaction,
  accept: boolean,
  from = 0,
  to = tr.doc.content.size,
): Transaction {
  const insertion = tr.doc.type.schema.marks['insertion'] as MarkType;
  const deletion = tr.doc.type.schema.marks['deletion'] as MarkType;
  const ranges: { from: number; to: number; mark: PMMark }[] = [];
  tr.doc.nodesBetween(from, to, (node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type === insertion || mark.type === deletion) {
        ranges.push({ from: pos, to: pos + node.nodeSize, mark });
      }
    }
    return false;
  });
  // From the end, so earlier positions stay valid when text is removed.
  for (const range of ranges.reverse()) {
    const keepText = (range.mark.type === insertion) === accept;
    if (keepText) tr.removeMark(range.from, range.to, range.mark.type);
    else tr.delete(range.from, range.to);
  }
  return tr.setMeta(TRACK_CHANGES_BYPASS, true);
}

/**
 * Suggestion mode: typing becomes `<ins>`, deleting marks text as `<del>` instead of
 * removing it. Handles single-step text edits (typing, deleting, pasting, Enter); other
 * structural changes are applied directly.
 */
export const TrackChanges = Extension.create<TrackChangesOptions, { enabled: boolean }>({
  name: 'trackChanges',

  addOptions() {
    return { enabled: false, user: null };
  },

  addStorage() {
    return { enabled: this.options.enabled };
  },

  addExtensions() {
    return [Insertion, Deletion];
  },

  addCommands() {
    const range = (state: {
      selection: {
        from: number;
        to: number;
        empty: boolean;
        $from: { parent: PMNode; start: () => number; end: () => number };
      };
    }) =>
      state.selection.empty
        ? { from: state.selection.$from.start(), to: state.selection.$from.end() }
        : { from: state.selection.from, to: state.selection.to };
    return {
      setTrackChanges:
        (enabled) =>
        ({ tr, dispatch }) => {
          this.storage.enabled = enabled;
          if (dispatch) dispatch(tr.setMeta(trackChangesKey, enabled));
          return true;
        },
      acceptChange:
        () =>
        ({ state, tr, dispatch }) => {
          const { from, to } = range(state);
          if (dispatch) dispatch(resolveChanges(tr, true, from, to));
          return true;
        },
      rejectChange:
        () =>
        ({ state, tr, dispatch }) => {
          const { from, to } = range(state);
          if (dispatch) dispatch(resolveChanges(tr, false, from, to));
          return true;
        },
      acceptAllChanges:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(resolveChanges(tr, true));
          return true;
        },
      rejectAllChanges:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) dispatch(resolveChanges(tr, false));
          return true;
        },
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const options = this.options;
    return [
      new Plugin({
        key: trackChangesKey,
        // The edit is applied normally; this appended transaction puts deleted text back
        // (marked as deletion) and marks the inserted text, in the same undo step.
        appendTransaction: (transactions, oldState, newState) => {
          if (!storage.enabled) return null;
          const changed = transactions.filter((t) => t.docChanged);
          if (changed.length !== 1) return null;
          const tr = changed[0] as Transaction;
          if (tr.getMeta(TRACK_CHANGES_BYPASS) || tr.getMeta('history$')) return null;
          const step = tr.steps[0];
          if (tr.steps.length !== 1 || !(step instanceof ReplaceStep)) return null;
          const { from, to, slice } = step as ReplaceStep & { from: number; to: number };
          const deleted = oldState.doc.slice(from, to);
          // Only inline edits inside one text block are tracked; structural edits pass.
          const inlineOnly = (content: { forEach: (f: (n: PMNode) => void) => void }): boolean => {
            let ok = true;
            content.forEach((node) => {
              if (!node.isInline) ok = false;
            });
            return ok;
          };
          if (deleted.openStart !== deleted.openEnd || !inlineOnly(deleted.content)) return null;
          if (slice.size > 0 && (slice.openStart !== slice.openEnd || !inlineOnly(slice.content)))
            return null;

          const schema = newState.schema;
          const attrs = {
            author: options.user?.id ?? null,
            authorName: options.user?.name ?? null,
            date: new Date().toISOString(),
          };
          const insertion = schema.marks['insertion']?.create(attrs);
          const deletion = schema.marks['deletion']?.create(attrs);
          if (!insertion || !deletion) return null;

          const fix = newState.tr.setMeta(TRACK_CHANGES_BYPASS, true);
          // Deleted text that was the author's own pending insertion really goes away.
          const restored: PMNode[] = [];
          deleted.content.forEach((node) => {
            const ins = node.marks.find((m) => m.type.name === 'insertion');
            if (ins && ins.attrs['author'] === attrs.author) return;
            if (node.marks.some((m) => m.type.name === 'deletion')) {
              restored.push(node);
              return;
            }
            restored.push(
              node.mark(deletion.addToSet(node.marks.filter((m) => m.type.name !== 'insertion'))),
            );
          });
          const restoredSize = restored.reduce((size, node) => size + node.nodeSize, 0);
          if (restored.length) fix.insert(from, restored);
          const insertedFrom = from + restoredSize;
          const insertedTo = insertedFrom + slice.size;
          if (slice.size > 0) {
            fix.removeMark(insertedFrom, insertedTo, schema.marks['deletion']);
            fix.addMark(insertedFrom, insertedTo, insertion);
          }
          let cursor = insertedTo;
          if (slice.size === 0) {
            // Backspace leaves the cursor before the deleted text, Delete after it.
            const backspace = oldState.selection.empty && oldState.selection.from === to;
            cursor = backspace ? from : insertedTo;
          }
          fix.setSelection(TextSelection.create(fix.doc, Math.min(cursor, fix.doc.content.size)));
          return fix.steps.length || slice.size === 0 ? fix : null;
        },
      }),
    ];
  },
});
