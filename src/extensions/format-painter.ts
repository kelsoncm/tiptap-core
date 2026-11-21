import { Extension } from '@tiptap/core';
import type { Mark as PMMark } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';

export interface FormatPainterStorage {
  /** Marks copied from the source selection; `null` when the painter is off. */
  marks: readonly PMMark[] | null;
  /** Keep painting after applying (double-click behavior in office suites). */
  sticky: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    formatPainter: {
      /** Copies the formatting of the selection; the next selection receives it. */
      copyFormat: (sticky?: boolean) => ReturnType;
      /** Applies the copied formatting to the selection (replaces its marks). */
      pasteFormat: () => ReturnType;
      /** Turns the painter off. */
      cancelFormatPainter: () => ReturnType;
    };
  }
  interface Storage {
    formatPainter: FormatPainterStorage;
  }
}

export const formatPainterKey = new PluginKey('formatPainter');

/** Marks the painter copies; structural marks (links, mentions, regions) are kept as is. */
const SKIPPED_MARKS = new Set(['link', 'editableRegion', 'comment']);

/** Format painter: copy the marks of one selection and apply them to the next one. */
export const FormatPainter = Extension.create<Record<string, never>, FormatPainterStorage>({
  name: 'formatPainter',

  addStorage() {
    return { marks: null, sticky: false };
  },

  addCommands() {
    return {
      copyFormat:
        (sticky = false) =>
        ({ state }) => {
          const { $from, empty } = state.selection;
          const marks = empty
            ? (state.storedMarks ?? $from.marks())
            : ($from.marksAcross(state.selection.$to) ?? $from.marks());
          this.storage.marks = marks.filter((m) => !SKIPPED_MARKS.has(m.type.name));
          this.storage.sticky = sticky;
          return true;
        },
      pasteFormat:
        () =>
        ({ state, tr, dispatch }) => {
          const marks = this.storage.marks;
          const { from, to, empty } = state.selection;
          if (!marks || empty) return false;
          if (dispatch) {
            state.doc.nodesBetween(from, to, (node, pos) => {
              if (!node.isText) return true;
              const start = Math.max(from, pos);
              const end = Math.min(to, pos + node.nodeSize);
              for (const mark of node.marks) {
                if (!SKIPPED_MARKS.has(mark.type.name)) tr.removeMark(start, end, mark.type);
              }
              return false;
            });
            for (const mark of marks) tr.addMark(from, to, mark);
            dispatch(tr);
          }
          if (!this.storage.sticky) this.storage.marks = null;
          return true;
        },
      cancelFormatPainter:
        () =>
        ({ tr, dispatch }) => {
          this.storage.marks = null;
          if (dispatch) dispatch(tr.setMeta(formatPainterKey, 'cancel'));
          return true;
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      Escape: () => this.storage.marks !== null && this.editor.commands.cancelFormatPainter(),
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const editor = this.editor;
    return [
      new Plugin({
        key: formatPainterKey,
        props: {
          attributes: (): Record<string, string> =>
            storage.marks ? { class: 'kt-format-painter-active' } : {},
          handleDOMEvents: {
            // Apply when the user finishes selecting with the mouse.
            mouseup: () => {
              if (!storage.marks) return false;
              setTimeout(() => {
                if (storage.marks && !editor.state.selection.empty) editor.commands.pasteFormat();
              });
              return false;
            },
          },
        },
      }),
    ];
  },
});
