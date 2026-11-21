import type { AutosaveController, AutosaveStatus } from '../editor/autosave.js';
import type { KelsonEditor } from '../editor/create-editor.js';
import { limitStatus, type DocumentLimits, type LimitKey } from '../extensions/limits.js';
import { getDocumentStats } from '../utils/stats.js';

const LABELS: Record<LimitKey, string> = {
  words: 'editor.footer.words',
  characters: 'editor.footer.characters',
  paragraphs: 'editor.footer.paragraphs',
};
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

/** Footer with word/character/paragraph counts, limits and autosave state. */
export class StatusBar {
  readonly element: HTMLDivElement;
  readonly #cleanup: (() => void)[] = [];

  constructor(
    private readonly kelson: KelsonEditor,
    private readonly limits: DocumentLimits = {},
    private readonly autosave?: AutosaveController,
  ) {
    this.element = document.createElement('div');
    this.element.className = 'kt-status-bar';
    this.element.setAttribute('role', 'status');
    this.element.setAttribute('aria-live', 'polite');
    const update = (): void => this.render();
    kelson.editor.on('update', update);
    kelson.editor.on('create', update);
    this.#cleanup.push(() => {
      kelson.editor.off('update', update);
      kelson.editor.off('create', update);
    });
    this.#cleanup.push(kelson.i18n.onChange(update));
    if (autosave) this.#cleanup.push(autosave.onStatus(update));
    this.render();
  }

  render(): void {
    const { i18n, editor } = this.kelson;
    const status = limitStatus(getDocumentStats(editor.state.doc), this.limits);
    this.element.replaceChildren();
    for (const key of ['words', 'characters', 'paragraphs'] as const) {
      const item = document.createElement('span');
      item.className = 'kt-status-item';
      item.dataset['counter'] = key;
      const max = this.limits[MAX[key]];
      const min = this.limits[MIN[key]];
      let text = `${i18n.t(LABELS[key])}: ${status.stats[key]}`;
      if (max !== undefined) text += `/${max}`;
      if (min !== undefined) text += ` (${i18n.t('editor.limits.min', { value: min })})`;
      item.textContent = text;
      if (status.over.includes(key)) item.classList.add('is-over');
      if (status.under.includes(key)) item.classList.add('is-under');
      this.element.append(item);
    }
    if (this.autosave) {
      const state = document.createElement('span');
      state.className = `kt-status-save is-${this.autosave.status}`;
      state.textContent = this.saveLabel(this.autosave.status);
      this.element.append(state);
    }
  }

  private saveLabel(status: AutosaveStatus): string {
    return status === 'idle' ? '' : this.kelson.i18n.t(`editor.autosave.${status}`);
  }

  destroy(): void {
    for (const fn of this.#cleanup.splice(0)) fn();
    this.element.remove();
  }
}
