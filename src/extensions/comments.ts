import { Mark, mergeAttributes, type Editor } from '@tiptap/core';
import type { Node as PMNode } from '@tiptap/pm/model';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export interface RevisionUser {
  id: string;
  name: string;
  /** Highlight color for this user's suggestions/comments. */
  color?: string;
}

export interface CommentMessage {
  id: string;
  author: RevisionUser;
  text: string;
  /** ISO date. */
  createdAt: string;
}

export interface CommentThread {
  id: string;
  messages: CommentMessage[];
  resolved: boolean;
  createdAt: string;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    comments: {
      /** Starts a thread on the selection. */
      addComment: (text: string) => ReturnType;
      replyComment: (threadId: string, text: string) => ReturnType;
      resolveComment: (threadId: string, resolved?: boolean) => ReturnType;
      /** Removes the thread and its highlight. */
      deleteComment: (threadId: string) => ReturnType;
      /** Selects the text of a thread. */
      selectComment: (threadId: string) => ReturnType;
    };
  }
  interface Storage {
    comment: CommentStorage;
  }
}

export interface CommentsOptions {
  /** Who is writing. Required to add or reply. */
  user: RevisionUser | null;
  /** Threads loaded from your backend. */
  threads: CommentThread[];
  /** Called after every change with all threads (persist them). */
  onChange: ((threads: CommentThread[]) => void) | null;
}

export interface CommentStorage {
  threads: Map<string, CommentThread>;
  listeners: Set<(threads: CommentThread[]) => void>;
}

export const newId = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;

/** Ranges of each thread in the document. */
export function commentRanges(doc: PMNode): Map<string, { from: number; to: number }> {
  const ranges = new Map<string, { from: number; to: number }>();
  doc.descendants((node, pos) => {
    if (!node.isText) return true;
    for (const mark of node.marks) {
      if (mark.type.name !== 'comment') continue;
      const id = String(mark.attrs['threadId']);
      const range = ranges.get(id);
      if (range) range.to = pos + node.nodeSize;
      else ranges.set(id, { from: pos, to: pos + node.nodeSize });
    }
    return false;
  });
  return ranges;
}

/** Threads in document order, with the commented text. */
export function listComments(
  editor: Editor,
): (CommentThread & { quote: string; from: number; to: number })[] {
  const ranges = commentRanges(editor.state.doc);
  const threads = editor.storage.comment.threads;
  return [...ranges.entries()]
    .map(([id, range]) => {
      const thread = threads.get(id);
      return thread
        ? { ...thread, ...range, quote: editor.state.doc.textBetween(range.from, range.to, ' ') }
        : null;
    })
    .filter((t): t is NonNullable<typeof t> => t !== null)
    .sort((a, b) => a.from - b.from);
}

/** Comment highlight: `<span data-comment="threadId">`. Threads live in storage. */
export const Comments = Mark.create<CommentsOptions, CommentStorage>({
  name: 'comment',
  inclusive: false,
  excludes: '',

  addOptions() {
    return { user: null, threads: [], onChange: null };
  },

  addStorage() {
    return {
      threads: new Map(this.options.threads.map((t) => [t.id, structuredClone(t)])),
      listeners: new Set(),
    };
  },

  addAttributes() {
    return {
      threadId: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-comment'),
        renderHTML: (attributes) => ({ 'data-comment': attributes['threadId'] }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-comment]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['span', mergeAttributes(HTMLAttributes, { class: 'kt-comment' }), 0];
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin({
        key: new PluginKey('ktComments'),
        props: {
          // Resolved threads are dimmed through decorations (thread state is not in the doc).
          decorations: (state) => {
            const decorations: Decoration[] = [];
            for (const [id, range] of commentRanges(state.doc)) {
              if (storage.threads.get(id)?.resolved) {
                decorations.push(Decoration.inline(range.from, range.to, { class: 'is-resolved' }));
              }
            }
            return decorations.length ? DecorationSet.create(state.doc, decorations) : null;
          },
        },
      }),
    ];
  },

  addCommands() {
    const changed = (): void => {
      const all = [...this.storage.threads.values()];
      this.options.onChange?.(all);
      for (const listener of this.storage.listeners) listener(all);
    };
    const message = (text: string): CommentMessage | null => {
      const user = this.options.user;
      if (!user || !text.trim()) return null;
      return { id: newId(), author: user, text: text.trim(), createdAt: new Date().toISOString() };
    };

    return {
      addComment:
        (text) =>
        ({ state, chain }) => {
          const first = message(text);
          if (!first || state.selection.empty) return false;
          const id = newId();
          this.storage.threads.set(id, {
            id,
            messages: [first],
            resolved: false,
            createdAt: first.createdAt,
          });
          const ok = chain().setMark(this.name, { threadId: id }).run();
          if (ok) changed();
          else this.storage.threads.delete(id);
          return ok;
        },
      replyComment: (threadId, text) => () => {
        const thread = this.storage.threads.get(threadId);
        const reply = message(text);
        if (!thread || !reply) return false;
        thread.messages.push(reply);
        changed();
        return true;
      },
      resolveComment:
        (threadId, resolved = true) =>
        ({ tr, dispatch }) => {
          const thread = this.storage.threads.get(threadId);
          if (!thread) return false;
          thread.resolved = resolved;
          // Re-render the marks (class depends on the thread state).
          if (dispatch) dispatch(tr.setMeta('ktCommentResolve', threadId));
          changed();
          return true;
        },
      deleteComment:
        (threadId) =>
        ({ tr, dispatch, state }) => {
          const range = commentRanges(state.doc).get(threadId);
          const had = this.storage.threads.delete(threadId);
          if (range && dispatch) {
            state.doc.nodesBetween(range.from, range.to, (node, pos) => {
              const mark = node.marks.find(
                (m) => m.type.name === this.name && m.attrs['threadId'] === threadId,
              );
              if (mark) tr.removeMark(pos, pos + node.nodeSize, mark);
            });
            dispatch(tr);
          }
          if (had) changed();
          return had || range !== undefined;
        },
      selectComment:
        (threadId) =>
        ({ state, commands }) => {
          const range = commentRanges(state.doc).get(threadId);
          return range ? commands.setTextSelection(range) : false;
        },
    };
  },
});
