import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

import type { KelsonEditor } from '../editor/create-editor.js';

const button = (text: string, label: string, onClick: () => void): HTMLButtonElement => {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'kt-button';
  el.textContent = text;
  el.title = label;
  el.setAttribute('aria-label', label);
  el.addEventListener('mousedown', (e) => e.preventDefault());
  el.addEventListener('click', onClick);
  return el;
};

// ---------------------------------------------------------------- Find & replace bar

export class FindBar {
  readonly element: HTMLDivElement;
  readonly #find: HTMLInputElement;
  readonly #replace: HTMLInputElement;
  readonly #count: HTMLSpanElement;
  readonly #cleanup: (() => void)[] = [];

  constructor(private readonly kelson: KelsonEditor) {
    const { i18n, editor } = kelson;
    this.element = document.createElement('div');
    this.element.className = 'kt-find-bar';
    this.element.setAttribute('role', 'search');
    this.element.hidden = true;

    const input = (labelKey: string): HTMLInputElement => {
      const el = document.createElement('input');
      el.type = 'search';
      el.placeholder = i18n.t(labelKey);
      el.setAttribute('aria-label', i18n.t(labelKey));
      return el;
    };
    this.#find = input('editor.find.find');
    this.#replace = input('editor.find.replace');
    this.#count = document.createElement('span');
    this.#count.className = 'kt-find-count';
    this.#count.setAttribute('aria-live', 'polite');

    const toggle = (
      key: 'caseSensitive' | 'regex' | 'wholeWord',
      text: string,
      labelKey: string,
    ) => {
      const el = button(text, i18n.t(labelKey), () => {
        const value = !editor.storage.searchReplace[key];
        editor.commands.setSearchOptions({ [key]: value });
        el.setAttribute('aria-pressed', String(value));
        this.update();
      });
      el.setAttribute('aria-pressed', 'false');
      return el;
    };

    this.#find.addEventListener('input', () => {
      editor.commands.setSearchTerm(this.#find.value);
      this.update();
    });
    this.#find.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        if (event.shiftKey) editor.commands.previousSearchResult();
        else editor.commands.nextSearchResult();
        this.update();
      } else if (event.key === 'Escape') {
        this.close();
      }
    });
    this.#replace.addEventListener('input', () =>
      editor.commands.setReplaceTerm(this.#replace.value),
    );
    this.#replace.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        editor.commands.replaceCurrent();
        this.update();
      } else if (event.key === 'Escape') {
        this.close();
      }
    });

    this.element.append(
      this.#find,
      toggle('caseSensitive', 'Aa', 'editor.find.caseSensitive'),
      toggle('wholeWord', '“ab”', 'editor.find.wholeWord'),
      toggle('regex', '.*', 'editor.find.regex'),
      button('↑', i18n.t('editor.find.previous'), () => {
        editor.commands.previousSearchResult();
        this.update();
      }),
      button('↓', i18n.t('editor.find.next'), () => {
        editor.commands.nextSearchResult();
        this.update();
      }),
      this.#count,
      this.#replace,
      button(i18n.t('editor.find.replaceOne'), i18n.t('editor.find.replaceOne'), () => {
        editor.commands.replaceCurrent();
        this.update();
      }),
      button(i18n.t('editor.find.replaceAll'), i18n.t('editor.find.replaceAll'), () => {
        editor.commands.replaceAll();
        this.update();
      }),
      button('✕', i18n.t('common.close'), () => this.close()),
    );
    const onUpdate = (): void => this.update();
    editor.on('update', onUpdate);
    this.#cleanup.push(() => editor.off('update', onUpdate));
  }

  get open(): boolean {
    return !this.element.hidden;
  }

  show(): void {
    const { editor } = this.kelson;
    this.element.hidden = false;
    const { from, to, empty } = editor.state.selection;
    if (!empty) {
      this.#find.value = editor.state.doc.textBetween(from, to, ' ');
      editor.commands.setSearchTerm(this.#find.value);
    }
    this.#find.focus();
    this.#find.select();
    this.update();
  }

  close(): void {
    this.element.hidden = true;
    this.kelson.editor.commands.clearSearch();
    this.kelson.editor.commands.focus();
  }

  update(): void {
    const { results, index, error } = this.kelson.editor.storage.searchReplace;
    const { i18n } = this.kelson;
    this.#count.textContent = error
      ? i18n.t('editor.find.invalid')
      : this.#find.value
        ? i18n.t('editor.find.count', {
            current: results.length ? index + 1 : 0,
            total: results.length,
          })
        : '';
    this.#find.classList.toggle(
      'is-error',
      Boolean(error) || (Boolean(this.#find.value) && !results.length),
    );
  }

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}

// ---------------------------------------------------------------- Outline panel

/** Side panel listing the headings; clicking scrolls to and selects the heading. */
export class OutlinePanel {
  readonly element: HTMLElement;
  readonly #cleanup: (() => void)[] = [];

  constructor(private readonly kelson: KelsonEditor) {
    this.element = document.createElement('nav');
    this.element.className = 'kt-side-panel kt-outline';
    this.element.setAttribute('aria-label', kelson.i18n.t('editor.view.outline'));
    this.element.hidden = true;
    const update = (): void => {
      if (!this.element.hidden) this.render();
    };
    kelson.editor.on('update', update);
    this.#cleanup.push(() => kelson.editor.off('update', update));
  }

  render(): void {
    const { editor, i18n } = this.kelson;
    this.element.replaceChildren();
    const title = document.createElement('h3');
    title.textContent = i18n.t('editor.view.outline');
    const list = document.createElement('ol');
    editor.state.doc.descendants((node, pos) => {
      if (node.type.name !== 'heading') return true;
      const item = document.createElement('li');
      item.className = `kt-outline-level-${String(node.attrs['level'])}`;
      const link = document.createElement('a');
      link.href = '#';
      link.textContent = node.textContent || '—';
      link.addEventListener('click', (event) => {
        event.preventDefault();
        editor
          .chain()
          .focus()
          .setTextSelection(pos + 1)
          .scrollIntoView()
          .run();
      });
      item.append(link);
      list.append(item);
      return false;
    });
    if (!list.children.length) {
      const empty = document.createElement('p');
      empty.textContent = i18n.t('editor.tableOfContents.noHeadings');
      this.element.append(title, empty);
      return;
    }
    this.element.append(title, list);
  }

  toggle(force?: boolean): boolean {
    this.element.hidden = !(force ?? this.element.hidden);
    if (!this.element.hidden) this.render();
    return !this.element.hidden;
  }

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}

// ---------------------------------------------------------------- Minimap

/** Scaled-down live copy of the content; clicking scrolls the editor there. */
export class Minimap {
  readonly element: HTMLDivElement;
  readonly #inner: HTMLDivElement;
  #timer: ReturnType<typeof setTimeout> | null = null;
  readonly #cleanup: (() => void)[] = [];

  constructor(
    private readonly kelson: KelsonEditor,
    private readonly scroller: HTMLElement,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'kt-side-panel kt-minimap';
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    this.#inner = document.createElement('div');
    this.#inner.className = 'kt-minimap-content tiptap';
    this.element.append(this.#inner);
    this.element.addEventListener('click', (event) => {
      const rect = this.element.getBoundingClientRect();
      const ratio =
        (event.clientY - rect.top + this.element.scrollTop) /
        Math.max(this.#inner.scrollHeight * 0.2, 1);
      const target = this.scrollTarget();
      target.scrollTop = ratio * target.scrollHeight - target.clientHeight / 2;
    });
    const update = (): void => this.schedule();
    kelson.editor.on('update', update);
    this.#cleanup.push(() => kelson.editor.off('update', update));
  }

  private scrollTarget(): HTMLElement {
    const content = this.scroller;
    return content.scrollHeight > content.clientHeight
      ? content
      : ((document.scrollingElement as HTMLElement) ?? content);
  }

  private schedule(): void {
    if (this.element.hidden) return;
    if (this.#timer) clearTimeout(this.#timer);
    this.#timer = setTimeout(() => this.render(), 200);
  }

  render(): void {
    const clone = this.kelson.editor.view.dom.cloneNode(true) as HTMLElement;
    clone.removeAttribute('contenteditable');
    clone
      .querySelectorAll('[contenteditable]')
      .forEach((el) => el.removeAttribute('contenteditable'));
    clone
      .querySelectorAll('iframe, video, audio')
      .forEach((el) => el.replaceWith(document.createElement('div')));
    this.#inner.replaceChildren(...[...clone.childNodes]);
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

// ---------------------------------------------------------------- Source code editor

/** Replaces the content with a `<textarea>` of HTML; toggling back applies it. */
export class SourceEditor {
  readonly element: HTMLTextAreaElement;
  #active = false;

  constructor(
    private readonly kelson: KelsonEditor,
    private readonly content: HTMLElement,
  ) {
    this.element = document.createElement('textarea');
    this.element.className = 'kt-source';
    this.element.spellcheck = false;
    this.element.setAttribute('aria-label', kelson.i18n.t('editor.view.source'));
    this.element.hidden = true;
  }

  get active(): boolean {
    return this.#active;
  }

  toggle(force?: boolean): boolean {
    const next = force ?? !this.#active;
    if (next === this.#active) return next;
    const { editor } = this.kelson;
    if (next) {
      this.element.value = formatHtml(editor.getHTML());
      this.element.style.minHeight = `${Math.max(this.content.offsetHeight, 160)}px`;
      this.content.hidden = true;
      this.element.hidden = false;
      this.element.focus();
    } else {
      editor.commands.setContent(this.element.value, { emitUpdate: true });
      this.element.hidden = true;
      this.content.hidden = false;
      editor.commands.focus();
    }
    this.#active = next;
    return next;
  }

  destroy(): void {
    this.element.remove();
  }
}

/** One block element per line, for readability in the source view. */
export function formatHtml(html: string): string {
  return html
    .replace(
      /(<\/(p|h[1-6]|li|ul|ol|blockquote|pre|table|tr|thead|tbody|figure|div|nav|details)>)/g,
      '$1\n',
    )
    .replace(/(<(ul|ol|table|tbody|thead|tr|blockquote|details)(\s[^>]*)?>)/g, '$1\n')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

// ---------------------------------------------------------------- Drag handle

/**
 * Handle shown left of the hovered top-level block; dragging it moves the block, clicking
 * selects it. Built on ProseMirror's own drag-and-drop (`view.dragging`).
 */
export class DragHandle {
  readonly element: HTMLDivElement;
  #pos: number | null = null;
  readonly #cleanup: (() => void)[] = [];

  constructor(
    private readonly editor: Editor,
    private readonly root: HTMLElement,
    label: string,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'kt-drag-handle';
    this.element.draggable = true;
    this.element.textContent = '⠿';
    this.element.title = label;
    this.element.setAttribute('aria-hidden', 'true');
    this.element.hidden = true;
    root.append(this.element);

    const dom = editor.view.dom;
    const onMove = (event: MouseEvent): void => this.track(event);
    const onLeave = (event: MouseEvent): void => {
      if (event.relatedTarget !== this.element) this.element.hidden = true;
    };
    dom.addEventListener('mousemove', onMove);
    dom.addEventListener('mouseleave', onLeave);
    this.element.addEventListener('dragstart', this.onDragStart);
    this.element.addEventListener('click', this.onClick);
    this.element.addEventListener('dragend', () => (this.element.hidden = true));
    this.#cleanup.push(() => {
      dom.removeEventListener('mousemove', onMove);
      dom.removeEventListener('mouseleave', onLeave);
    });
  }

  private blockAt(event: MouseEvent): { pos: number; dom: HTMLElement } | null {
    const { view } = this.editor;
    const coords = view.posAtCoords({ left: event.clientX, top: event.clientY });
    if (!coords) return null;
    const $pos = view.state.doc.resolve(coords.inside >= 0 ? coords.inside : coords.pos);
    const depth = $pos.depth >= 1 ? 1 : 0;
    const pos = depth === 0 ? coords.inside : $pos.before(1);
    if (pos < 0) return null;
    const node = view.nodeDOM(pos);
    return node instanceof HTMLElement ? { pos, dom: node } : null;
  }

  private track(event: MouseEvent): void {
    if (!this.editor.isEditable) return;
    const block = this.blockAt(event);
    if (!block) return;
    this.#pos = block.pos;
    const rootRect = this.root.getBoundingClientRect();
    const rect = block.dom.getBoundingClientRect();
    this.element.style.top = `${rect.top - rootRect.top}px`;
    this.element.hidden = false;
  }

  private select(): NodeSelection | null {
    if (this.#pos === null) return null;
    const { view } = this.editor;
    try {
      const selection = NodeSelection.create(view.state.doc, this.#pos);
      view.dispatch(view.state.tr.setSelection(selection));
      return selection;
    } catch {
      return null;
    }
  }

  private onClick = (): void => {
    this.select();
    this.editor.commands.focus();
  };

  private onDragStart = (event: DragEvent): void => {
    const selection = this.select();
    if (!selection || !event.dataTransfer) return;
    const { view } = this.editor;
    const slice = selection.content();
    const dom = view.nodeDOM(selection.from);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData(
      'text/plain',
      slice.content.textBetween(0, slice.content.size, '\n'),
    );
    if (dom instanceof HTMLElement) event.dataTransfer.setDragImage(dom, 0, 0);
    view.dragging = { slice, move: true };
  };

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}
