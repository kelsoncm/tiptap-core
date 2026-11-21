import type { AnyExtension, Editor, JSONContent } from '@tiptap/core';

import type { CommandRegistry } from '../commands/registry.js';
import { Comments, newId, type CommentThread, type RevisionUser } from '../extensions/comments.js';
import { TrackChanges } from '../extensions/track-changes.js';
import type { I18n } from '../i18n/i18n.js';
import { openFormDialog } from '../ui/dialog.js';

export interface DocumentVersion {
  id: string;
  label: string;
  author: RevisionUser | null;
  /** ISO date. */
  createdAt: string;
  content: JSONContent;
}

/**
 * - `viewer`: reads only.
 * - `commenter`: reads and comments.
 * - `suggester`: edits in suggestion mode (track changes forced on).
 * - `editor`: edits freely, accepts/rejects suggestions.
 */
export const USER_ROLES = ['viewer', 'commenter', 'suggester', 'editor'] as const;
export type UserRole = (typeof USER_ROLES)[number];

export interface RevisionOptions {
  user?: RevisionUser;
  /** Initial role. Default: `editor`. */
  role?: UserRole;
  comments?: {
    threads?: CommentThread[];
    onChange?: (threads: CommentThread[]) => void;
  };
  /** Start in suggestion mode. */
  trackChanges?: boolean;
  versions?: {
    /** Saved versions to start with (newest last). */
    initial?: DocumentVersion[];
    /** Persists a new version. */
    onSave?: (version: DocumentVersion) => Promise<void> | void;
    /** Maximum kept in memory. Default: 50. */
    limit?: number;
  };
}

export interface RevisionController {
  readonly role: UserRole;
  setRole(role: UserRole): void;
  readonly versions: readonly DocumentVersion[];
  saveVersion(label?: string): DocumentVersion;
  restoreVersion(id: string): boolean;
  onChange(listener: () => void): () => void;
}

export function revisionExtensions(options: RevisionOptions): AnyExtension[] {
  return [
    Comments.configure({
      user: options.user ?? null,
      threads: options.comments?.threads ?? [],
      onChange: options.comments?.onChange ?? null,
    }),
    TrackChanges.configure({
      enabled: options.trackChanges === true || options.role === 'suggester',
      user: options.user ?? null,
    }),
  ];
}

export function createRevisionController(
  editor: Editor,
  options: RevisionOptions,
): RevisionController {
  let role: UserRole = options.role ?? 'editor';
  const versions: DocumentVersion[] = [...(options.versions?.initial ?? [])];
  const limit = options.versions?.limit ?? 50;
  const listeners = new Set<() => void>();
  const notify = (): void => {
    for (const listener of listeners) listener();
  };

  const applyRole = (): void => {
    editor.setEditable(role === 'editor' || role === 'suggester');
    if (role === 'suggester') editor.commands.setTrackChanges(true);
    notify();
  };
  // setEditable during construction is overridden by createEditor's `editable`; apply after.
  queueMicrotask(() => {
    if (!editor.isDestroyed) applyRole();
  });

  return {
    get role() {
      return role;
    },
    setRole(next) {
      if (!(USER_ROLES as readonly string[]).includes(next)) {
        throw new Error(`Papel "${String(next)}" inválido. Use: ${USER_ROLES.join(', ')}.`);
      }
      role = next;
      applyRole();
    },
    get versions() {
      return versions;
    },
    saveVersion(label) {
      const version: DocumentVersion = {
        id: newId(),
        label: label?.trim() || new Date().toLocaleString(),
        author: options.user ?? null,
        createdAt: new Date().toISOString(),
        content: editor.getJSON(),
      };
      versions.push(version);
      if (versions.length > limit) versions.splice(0, versions.length - limit);
      void Promise.resolve(options.versions?.onSave?.(version)).catch((error: unknown) =>
        console.error('[tiptap-core] Falha ao salvar versão:', error),
      );
      notify();
      return version;
    },
    restoreVersion(id) {
      const version = versions.find((v) => v.id === id);
      if (!version || role === 'viewer' || role === 'commenter') return false;
      editor
        .chain()
        .setMeta('trackChangesBypass', true)
        .setContent(version.content, { emitUpdate: true })
        .run();
      notify();
      return true;
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

export function registerRevisionCommands(
  registry: CommandRegistry,
  i18n: I18n,
  getController: () => RevisionController | null,
  options: RevisionOptions,
): void {
  const role = (): UserRole => getController()?.role ?? 'editor';
  const canComment = (): boolean => role() !== 'viewer' && Boolean(options.user);
  const canReview = (): boolean => role() === 'editor';

  registry.register<string | undefined>({
    id: 'comment',
    labelKey: 'editor.revision.comment',
    icon: 'comment',
    shortcut: 'Mod-Alt-m',
    group: 'revision',
    isEnabled: (e) => canComment() && !e.state.selection.empty,
    run: (e, text) => {
      if (!canComment()) return false;
      // No focus(): commenters work on a non-editable view.
      if (text) return e.chain().addComment(text).run();
      const { from, to } = e.state.selection;
      if (from === to) return false;
      void openFormDialog({
        i18n,
        titleKey: 'editor.revision.comment',
        submitKey: 'common.submit',
        fields: [
          {
            name: 'text',
            labelKey: 'editor.revision.commentText',
            type: 'textarea',
            required: true,
          },
        ],
      }).then((values) => {
        const value = values ? String(values['text'] ?? '') : '';
        if (value) e.chain().setTextSelection({ from, to }).addComment(value).run();
      });
      return true;
    },
  });

  registry.register({
    id: 'trackChanges',
    labelKey: 'editor.revision.trackChanges',
    icon: 'track',
    group: 'revision',
    isActive: (e) => e.storage.trackChanges.enabled,
    // Suggesters cannot turn it off; viewers/commenters cannot edit anyway.
    isEnabled: () => canReview(),
    run: (e) => canReview() && e.commands.setTrackChanges(!e.storage.trackChanges.enabled),
  });

  for (const [id, labelKey, command] of [
    ['acceptChange', 'editor.revision.accept', 'acceptChange'],
    ['rejectChange', 'editor.revision.reject', 'rejectChange'],
    ['acceptAllChanges', 'editor.revision.acceptAll', 'acceptAllChanges'],
    ['rejectAllChanges', 'editor.revision.rejectAll', 'rejectAllChanges'],
  ] as const) {
    registry.register({
      id,
      labelKey,
      icon: id.startsWith('accept') ? 'accept' : 'reject',
      group: 'revision',
      isEnabled: (e) =>
        canReview() && (e.isActive('insertion') || e.isActive('deletion') || id.includes('All')),
      run: (e) => canReview() && e.commands[command](),
    });
  }

  registry.register<string | undefined>({
    id: 'saveVersion',
    labelKey: 'editor.revision.saveVersion',
    icon: 'version',
    group: 'revision',
    isEnabled: () => getController() !== null && role() !== 'viewer',
    run: (_e, label) => {
      const controller = getController();
      if (!controller) return false;
      if (label !== undefined) {
        controller.saveVersion(label);
        return true;
      }
      void openFormDialog({
        i18n,
        titleKey: 'editor.revision.saveVersion',
        submitKey: 'common.save',
        fields: [{ name: 'label', labelKey: 'editor.revision.versionLabel' }],
      }).then((values) => {
        if (values) controller.saveVersion(String(values['label'] ?? ''));
      });
      return true;
    },
  });
}
