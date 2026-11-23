import type { EditorUI } from '@kelsoncm/tiptap-core';

import { registerEditor } from './editors.js';
import { highlightInto } from './highlight.js';

/** Each example folder exports `mount(host)` from core.ts; that file is also shown as code. */
type ExampleModule = { mount: (host: HTMLElement) => EditorUI | Promise<EditorUI> };

const modules = import.meta.glob<ExampleModule>('../examples/*/core.ts');
const sources = import.meta.glob<string>('../examples/*/*.{ts,html}', {
  query: '?raw',
  import: 'default',
});

interface Tab {
  id: string;
  label: string;
  language: string;
  load: () => Promise<string>;
  note?: string;
}

const TAB_KEY = 'kt-site:tab';
const ANGULAR_NOTE =
  'O tiptap-ng é privado: o editor ao vivo acima é o do core, com o mesmo resultado do <app-editor>.';

const readTab = (): string => {
  try {
    return localStorage.getItem(TAB_KEY) ?? 'core';
  } catch {
    return 'core';
  }
};
const saveTab = (id: string): void => {
  try {
    localStorage.setItem(TAB_KEY, id);
  } catch {
    // storage blocked
  }
};

function sourceTab(
  id: string,
  label: string,
  language: string,
  path: string,
  note?: string,
): Tab | null {
  const loader = sources[path];
  if (!loader) return null;
  return { id, label, language, load: loader, ...(note ? { note } : {}) };
}

/** Pretty-prints editor HTML (one block per line) for the output tab. */
function formatHtml(html: string): string {
  return html
    .replace(/></g, '>\n<')
    .replace(/\n(<\/(?:strong|em|s|u|code|a|span|mark|sub|sup)>)/g, '$1');
}

export async function mountExample(container: HTMLElement): Promise<void> {
  const id = container.dataset['example'] ?? '';
  const base = `../examples/${id}/`;
  const load = modules[`${base}core.ts`];
  if (!load) {
    container.textContent = `Exemplo "${id}" não encontrado.`;
    return;
  }

  container.classList.add('site-example');
  const live = document.createElement('div');
  live.className = 'site-example-live';
  const code = document.createElement('div');
  code.className = 'site-example-code';
  container.replaceChildren(live, code);

  let ui: EditorUI;
  try {
    ui = registerEditor(await (await load()).mount(live));
  } catch (error) {
    live.textContent = `Falha ao montar o exemplo: ${error instanceof Error ? error.message : String(error)}`;
    live.classList.add('text-danger');
    throw error;
  }

  const tabs = [
    sourceTab('core', 'Core (TypeScript)', 'typescript', `${base}core.ts`),
    sourceTab('wc', 'Web component', 'xml', `${base}wc.html`),
    sourceTab('angular', 'Angular', 'typescript', `${base}angular.ts`, ANGULAR_NOTE),
    {
      id: 'html',
      label: 'HTML gerado',
      language: 'xml',
      load: async () => formatHtml(ui.editor.getHTML()),
    },
  ].filter((tab): tab is Tab => tab !== null);

  const list = document.createElement('div');
  list.className = 'nav nav-tabs site-tabs';
  list.setAttribute('role', 'tablist');
  list.setAttribute('aria-label', 'Código do exemplo');
  const panel = document.createElement('div');
  panel.className = 'site-tab-panel';
  panel.setAttribute('role', 'tabpanel');
  panel.id = `painel-${id}`;
  const note = document.createElement('p');
  note.className = 'site-tab-note';
  const wrapper = document.createElement('div');
  wrapper.className = 'site-code';
  const copy = document.createElement('button');
  copy.type = 'button';
  copy.className = 'btn btn-sm site-copy';
  copy.dataset['copy'] = '';
  copy.textContent = 'Copiar';
  const pre = document.createElement('pre');
  const codeEl = document.createElement('code');
  pre.append(codeEl);
  wrapper.append(copy, pre);
  panel.append(note, wrapper);
  code.append(list, panel);

  const buttons = tabs.map((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-link';
    button.id = `aba-${id}-${tab.id}`;
    button.textContent = tab.label;
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-controls', panel.id);
    list.append(button);
    return button;
  });

  let active = tabs.findIndex((tab) => tab.id === readTab());
  if (active < 0) active = 0;

  const select = async (index: number, focus = false): Promise<void> => {
    const tab = tabs[index];
    if (!tab) return;
    active = index;
    buttons.forEach((button, i) => {
      const selected = i === index;
      button.classList.toggle('active', selected);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
    });
    panel.setAttribute('aria-labelledby', buttons[index]?.id ?? '');
    note.textContent = tab.note ?? '';
    note.hidden = !tab.note;
    highlightInto(codeEl, await tab.load(), tab.language);
    if (focus) buttons[index]?.focus();
  };

  buttons.forEach((button, index) =>
    button.addEventListener('click', () => {
      saveTab(tabs[index]?.id ?? 'core');
      void select(index);
    }),
  );
  list.addEventListener('keydown', (event) => {
    const step = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    void select((active + step + tabs.length) % tabs.length, true);
  });
  // Keep the output tab current while the reader types.
  ui.editor.on('update', () => {
    if (tabs[active]?.id === 'html') void select(active);
  });

  await select(active);
}
