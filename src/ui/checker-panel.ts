import type { KelsonEditor } from '../editor/create-editor.js';
import type { DocumentIssue } from '../extensions/checkers.js';

/** Side panel listing accessibility and spelling issues, with suggestions. */
export class CheckerPanel {
  readonly element: HTMLElement;
  readonly #cleanup: (() => void)[] = [];

  constructor(private readonly kelson: KelsonEditor) {
    this.element = document.createElement('aside');
    this.element.className = 'kt-side-panel kt-checker-panel';
    this.element.setAttribute('aria-label', kelson.i18n.t('editor.checkers.panel'));
    this.element.hidden = true;
    const update = (): void => {
      if (!this.element.hidden) this.render();
    };
    kelson.editor.on('transaction', update);
    this.#cleanup.push(() => kelson.editor.off('transaction', update));
  }

  /** Runs the available checks. */
  check(): void {
    this.kelson.run('checkAccessibility');
    if (this.kelson.commands.has('checkSpelling')) this.kelson.run('checkSpelling');
  }

  render(): void {
    const { editor, i18n } = this.kelson;
    const groups = editor.storage.checkers.issues;
    this.element.replaceChildren();
    const recheck = document.createElement('button');
    recheck.type = 'button';
    recheck.className = 'kt-button';
    recheck.textContent = i18n.t('editor.checkers.recheck');
    recheck.addEventListener('click', () => this.check());
    this.element.append(recheck);

    for (const source of ['spelling', 'accessibility'] as const) {
      const issues = groups.get(source);
      if (!issues) continue;
      const title = document.createElement('h3');
      title.textContent = `${i18n.t(`editor.checkers.${source}`)} (${issues.length})`;
      this.element.append(title);
      if (issues.length === 0) {
        const ok = document.createElement('p');
        ok.className = 'kt-checker-ok';
        ok.textContent = i18n.t('editor.checkers.none');
        this.element.append(ok);
      }
      for (const issue of issues) this.element.append(this.item(issue));
    }
  }

  private item(issue: DocumentIssue): HTMLElement {
    const { editor } = this.kelson;
    const item = document.createElement('div');
    item.className = `kt-checker-item is-${issue.severity}`;
    const text = document.createElement('button');
    text.type = 'button';
    text.className = 'kt-checker-message';
    const excerpt =
      issue.to <= editor.state.doc.content.size
        ? editor.state.doc.textBetween(issue.from, issue.to, ' ')
        : '';
    text.textContent = excerpt ? `“${excerpt.slice(0, 40)}” — ${issue.message}` : issue.message;
    text.addEventListener('click', () =>
      editor
        .chain()
        .focus()
        .setTextSelection({ from: issue.from, to: issue.to })
        .scrollIntoView()
        .run(),
    );
    item.append(text);
    for (const replacement of issue.replacements ?? []) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'kt-button kt-checker-suggestion';
      button.textContent = replacement;
      button.addEventListener('click', () => editor.commands.applySuggestion(issue, replacement));
      item.append(button);
    }
    return item;
  }

  toggle(force?: boolean): boolean {
    this.element.hidden = !(force ?? this.element.hidden);
    if (!this.element.hidden) {
      this.check();
      this.render();
    }
    return !this.element.hidden;
  }

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}
