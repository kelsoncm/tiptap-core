import type { KelsonEditor } from '../editor/create-editor.js';
import type { RevisionController } from '../editor/revision-setup.js';
import { listComments } from '../extensions/comments.js';
import { listChanges } from '../extensions/track-changes.js';

const el = <K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string,
): HTMLElementTagNameMap[K] => {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
};

const formatDate = (iso: string | null, locale: string): string => {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: 'short', timeStyle: 'short' });
  } catch {
    return iso;
  }
};

/** Side panel with comment threads, suggested changes and saved versions. */
export class RevisionPanel {
  readonly element: HTMLElement;
  readonly #cleanup: (() => void)[] = [];
  #timer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly kelson: KelsonEditor,
    private readonly controller: RevisionController | null,
  ) {
    this.element = el('aside', 'kt-side-panel kt-revision-panel');
    this.element.setAttribute('aria-label', kelson.i18n.t('editor.revision.panel'));
    this.element.hidden = true;
    const update = (): void => this.schedule();
    kelson.editor.on('update', update);
    kelson.editor.on('selectionUpdate', update);
    this.#cleanup.push(() => {
      kelson.editor.off('update', update);
      kelson.editor.off('selectionUpdate', update);
    });
    const listeners = kelson.editor.storage.comment?.listeners;
    if (listeners) {
      listeners.add(update);
      this.#cleanup.push(() => listeners.delete(update));
    }
    if (controller) this.#cleanup.push(controller.onChange(update));
  }

  private schedule(): void {
    if (this.element.hidden) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.render(), 50);
  }

  render(): void {
    const { editor, i18n, run } = this.kelson;
    const locale = i18n.locale;
    this.element.replaceChildren();

    // --- Comments
    const comments = listComments(editor);
    this.element.append(
      el('h3', undefined, `${i18n.t('editor.revision.comments')} (${comments.length})`),
    );
    for (const thread of comments) {
      const card = el('article', `kt-thread${thread.resolved ? ' is-resolved' : ''}`);
      const quote = el('blockquote', 'kt-thread-quote', thread.quote);
      quote.addEventListener('click', () => editor.chain().focus().selectComment(thread.id).run());
      card.append(quote);
      for (const message of thread.messages) {
        const item = el('div', 'kt-thread-message');
        item.append(
          el('strong', undefined, message.author.name),
          el('time', undefined, formatDate(message.createdAt, locale)),
          el('p', undefined, message.text),
        );
        card.append(item);
      }
      const reply = el('form', 'kt-thread-reply');
      const input = el('input');
      input.placeholder = i18n.t('editor.revision.reply');
      input.setAttribute('aria-label', i18n.t('editor.revision.reply'));
      reply.append(input);
      reply.addEventListener('submit', (event) => {
        event.preventDefault();
        if (editor.commands.replyComment(thread.id, input.value)) input.value = '';
      });
      const actions = el('div', 'kt-thread-actions');
      const resolve = el(
        'button',
        'kt-button',
        i18n.t(thread.resolved ? 'editor.revision.reopen' : 'editor.revision.resolve'),
      );
      resolve.type = 'button';
      resolve.addEventListener('click', () =>
        editor.commands.resolveComment(thread.id, !thread.resolved),
      );
      const remove = el('button', 'kt-button', i18n.t('common.delete'));
      remove.type = 'button';
      remove.addEventListener('click', () => editor.commands.deleteComment(thread.id));
      actions.append(resolve, remove);
      card.append(reply, actions);
      this.element.append(card);
    }

    // --- Suggestions
    const changes = listChanges(editor.state.doc);
    this.element.append(
      el('h3', undefined, `${i18n.t('editor.revision.changes')} (${changes.length})`),
    );
    for (const change of changes) {
      const item = el('div', `kt-change kt-change-${change.type}`);
      const label = el(
        'span',
        undefined,
        `${i18n.t(`editor.revision.${change.type}`)}: “${change.text}”`,
      );
      label.addEventListener('click', () =>
        editor.chain().focus().setTextSelection({ from: change.from, to: change.to }).run(),
      );
      const meta = el(
        'small',
        undefined,
        [change.authorName, formatDate(change.date, locale)].filter(Boolean).join(' · '),
      );
      const accept = el('button', 'kt-button', '✓');
      accept.type = 'button';
      accept.title = i18n.t('editor.revision.accept');
      accept.addEventListener('click', () => {
        editor.chain().setTextSelection({ from: change.from, to: change.to }).run();
        run('acceptChange');
      });
      const reject = el('button', 'kt-button', '✕');
      reject.type = 'button';
      reject.title = i18n.t('editor.revision.reject');
      reject.addEventListener('click', () => {
        editor.chain().setTextSelection({ from: change.from, to: change.to }).run();
        run('rejectChange');
      });
      item.append(label, meta, accept, reject);
      this.element.append(item);
    }

    // --- Versions
    if (this.controller) {
      this.element.append(
        el(
          'h3',
          undefined,
          `${i18n.t('editor.revision.versions')} (${this.controller.versions.length})`,
        ),
      );
      for (const version of [...this.controller.versions].reverse()) {
        const item = el('div', 'kt-version');
        item.append(
          el('span', undefined, version.label),
          el(
            'small',
            undefined,
            [version.author?.name, formatDate(version.createdAt, locale)]
              .filter(Boolean)
              .join(' · '),
          ),
        );
        const restore = el('button', 'kt-button', i18n.t('editor.revision.restore'));
        restore.type = 'button';
        restore.addEventListener('click', () => {
          if (
            typeof window === 'undefined' ||
            window.confirm(i18n.t('editor.revision.restoreConfirm'))
          ) {
            this.controller?.restoreVersion(version.id);
          }
        });
        item.append(restore);
        this.element.append(item);
      }
    }
  }

  toggle(force?: boolean): boolean {
    this.element.hidden = !(force ?? this.element.hidden);
    if (!this.element.hidden) this.render();
    return !this.element.hidden;
  }

  destroy(): void {
    if (this.#timer) clearTimeout(this.#timer);
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}
