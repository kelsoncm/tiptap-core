import type { SymbolGroup, SymbolItem } from '../data/symbols.js';
import type { I18n } from '../i18n/i18n.js';
import { matches } from '../utils/search.js';

/**
 * Searchable grid of characters (emoji picker, character map). Resolves with the chosen
 * character, or `null` when cancelled.
 */
export function openSymbolDialog(options: {
  i18n: I18n;
  titleKey: string;
  groups: readonly SymbolGroup[];
  container?: HTMLElement;
}): Promise<string | null> {
  const { i18n } = options;
  const dialog = document.createElement('dialog');
  dialog.className = 'kt-dialog kt-symbol-dialog';
  const title = document.createElement('h2');
  title.className = 'kt-dialog-title';
  title.textContent = i18n.t(options.titleKey);
  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'kt-symbol-search';
  search.placeholder = i18n.t('editor.symbols.search');
  search.setAttribute('aria-label', i18n.t('editor.symbols.search'));
  const body = document.createElement('div');
  body.className = 'kt-symbol-groups';
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'kt-dialog-cancel';
  close.textContent = i18n.t('common.close');
  const actions = document.createElement('div');
  actions.className = 'kt-dialog-actions';
  actions.append(close);
  dialog.append(title, search, body, actions);
  (options.container ?? document.body).append(dialog);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (value: string | null): void => {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(value);
    };

    const render = (): void => {
      body.replaceChildren();
      const query = search.value;
      let total = 0;
      for (const group of options.groups) {
        const items = group.items.filter((item: SymbolItem) =>
          matches(query, item.keywords, item.char),
        );
        if (items.length === 0) continue;
        total += items.length;
        const section = document.createElement('section');
        const heading = document.createElement('h3');
        heading.textContent = i18n.t(group.labelKey);
        const grid = document.createElement('div');
        grid.className = 'kt-symbol-grid';
        grid.setAttribute('role', 'listbox');
        grid.setAttribute('aria-label', i18n.t(group.labelKey));
        for (const item of items) {
          const button = document.createElement('button');
          button.type = 'button';
          button.className = 'kt-symbol';
          button.textContent = item.char;
          button.title = item.keywords;
          button.setAttribute('aria-label', `${item.char} ${item.keywords}`);
          button.addEventListener('click', () => finish(item.char));
          grid.append(button);
        }
        section.append(heading, grid);
        body.append(section);
      }
      if (total === 0) {
        const empty = document.createElement('p');
        empty.className = 'kt-picker-empty';
        empty.textContent = i18n.t('editor.messages.noResults');
        body.append(empty);
      }
    };

    search.addEventListener('input', render);
    search.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        body.querySelector<HTMLButtonElement>('.kt-symbol')?.click();
      }
    });
    close.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', () => finish(null));
    dialog.addEventListener('close', () => finish(null));
    render();
    try {
      dialog.showModal();
    } catch {
      dialog.setAttribute('open', '');
    }
    search.focus();
  });
}
