import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createEditor,
  createEditorUI,
  fillMergeFields,
  fillMergeFieldsHTML,
  listMergeFields,
  matches,
  normalizeSearch,
  resolveMentionItems,
  type KelsonEditor,
  type KelsonEditorOptions,
  type MentionItem,
} from '../src/index.js';

const people: MentionItem[] = [
  { id: 'ana', label: 'Ana Júlia', description: 'Coordenação' },
  { id: 'bruno', label: 'Bruno' },
  { id: 'carla', label: 'Carla' },
];

const fields = [
  { key: 'nomeEdital', label: 'Nome do edital' },
  { key: 'inicioEdital', label: 'Início do edital', description: 'Data de abertura' },
];

let instance: KelsonEditor | undefined;
afterEach(async () => {
  // Tiptap's focus() finishes in a frame callback; let it run before tearing down.
  await new Promise((resolve) => setTimeout(resolve, 20));
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (options: KelsonEditorOptions = {}): KelsonEditor => {
  const element = document.createElement('div');
  document.body.append(element);
  instance = createEditor({ element, content: '<p></p>', ...options });
  instance.editor.commands.focus('end');
  return instance;
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));
const menu = (): HTMLElement | null => document.querySelector('.kt-suggestion');
const menuLabels = (): string[] =>
  [...document.querySelectorAll('.kt-suggestion-label')].map((e) => e.textContent ?? '');
const press = (k: KelsonEditor, key: string): void => {
  k.editor.view.dom.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
};
const type = async (k: KelsonEditor, text: string): Promise<void> => {
  for (const char of text) k.editor.commands.insertContent(char);
  await flush();
};

describe('search helpers', () => {
  it('ignores accents and case', () => {
    expect(normalizeSearch(' Título ')).toBe('titulo');
    expect(matches('jul', 'Ana Júlia')).toBe(true);
    expect(matches('', 'x')).toBe(true);
    expect(matches('zzz', 'Ana', undefined)).toBe(false);
  });
});

describe('mentions', () => {
  it('filters static items and limits results', async () => {
    expect((await resolveMentionItems(people, 'coord')).map((p) => p.id)).toEqual(['ana']);
    expect(await resolveMentionItems(people, '', 2)).toHaveLength(2);
  });

  it('uses async sources and survives their errors', async () => {
    const source = vi.fn(async (q: string) => people.filter((p) => p.id.startsWith(q)));
    expect(await resolveMentionItems(source, 'b')).toEqual([people[1]]);
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(await resolveMentionItems(() => Promise.reject(new Error('rede')), 'x')).toEqual([]);
    expect(spy).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('opens the menu on @, filters, and inserts with Enter', async () => {
    const k = make({ mentions: { items: people } });
    await type(k, '@ju');
    expect(menu()?.getAttribute('role')).toBe('listbox');
    expect(menuLabels()).toEqual(['Ana Júlia']);
    press(k, 'Enter');
    await flush();
    expect(menu()).toBeNull();
    expect(k.editor.getHTML()).toBe(
      '<p><span data-type="mention" class="kt-mention" data-id="ana" data-label="Ana Júlia" data-mention-suggestion-char="@">@Ana Júlia</span> </p>',
    );
    expect(k.editor.getText()).toBe('@Ana Júlia ');
  });

  it('navigates with arrows and closes with Escape', async () => {
    const k = make({ mentions: { items: people } });
    await type(k, '@');
    expect(menuLabels()).toHaveLength(3);
    press(k, 'ArrowDown');
    expect(document.querySelector('.is-selected')?.textContent).toContain('Bruno');
    press(k, 'ArrowUp');
    press(k, 'ArrowUp');
    expect(document.querySelector('.is-selected')?.textContent).toContain('Carla');
    press(k, 'Escape');
    expect(menu()).toBeNull();
  });

  it('shows an empty state', async () => {
    const k = make({ mentions: { items: people } });
    await type(k, '@xyz');
    expect(menu()?.textContent).toBe('Nenhum resultado');
  });

  it('mention command inserts an item or opens the autocomplete', async () => {
    const k = make({ mentions: { items: people } });
    k.run('mention', people[2]);
    expect(k.editor.getText()).toBe('@Carla ');
    k.run('mention');
    await flush();
    expect(menu()).not.toBeNull();
  });

  it('is not registered without the option', () => {
    expect(make().commands.has('mention')).toBe(false);
  });
});

describe('merge fields', () => {
  it('inserts, renders and parses fields', () => {
    const k = make({ mergeFields: fields });
    k.run('mergeField', 'nomeEdital');
    const html = k.editor.getHTML();
    expect(html).toBe(
      '<p><span data-merge-field="nomeEdital" data-label="Nome do edital" class="kt-merge-field">{{Nome do edital}}</span> </p>',
    );
    expect(k.editor.getText()).toBe('{{nomeEdital}} ');
    k.editor.commands.setContent('<p>Edital <span data-merge-field="x">{{X}}</span></p>');
    expect(k.editor.state.doc.firstChild?.child(1).attrs).toEqual({ key: 'x', label: 'X' });
  });

  it('opens the field menu on {{ and inserts with Enter', async () => {
    const k = make({ mergeFields: fields });
    await type(k, '{{inic');
    expect(menuLabels()).toEqual(['Início do edital']);
    press(k, 'Enter');
    expect(k.editor.getText()).toBe('{{inicioEdital}} ');
  });

  it('lists and fills fields in JSON, keeping marks', () => {
    const k = make({ mergeFields: fields });
    k.editor.commands.setContent(
      '<p><strong><span data-merge-field="nomeEdital">{{Nome}}</span></strong> e <span data-merge-field="inicioEdital"></span> e <span data-merge-field="nomeEdital"></span></p>',
    );
    const doc = k.editor.getJSON();
    expect(listMergeFields(doc)).toEqual(['nomeEdital', 'inicioEdital']);
    const filled = fillMergeFields(doc, { nomeEdital: 'Edital 1/2026' });
    k.editor.commands.setContent(filled);
    expect(k.editor.getHTML()).toMatch(
      /^<p><strong>Edital 1\/2026<\/strong> e <span data-merge-field="inicioEdital"/,
    );
    const emptied = fillMergeFields(doc, {}, { missing: 'empty' });
    expect(listMergeFields(emptied)).toEqual([]);
  });

  it('fills fields in HTML escaping values', () => {
    const html =
      '<p>Olá <span data-merge-field="nome">{{Nome}}</span><span data-merge-field="x"></span></p>';
    expect(fillMergeFieldsHTML(html, { nome: '<b>Ana</b>' })).toBe(
      '<p>Olá &lt;b&gt;Ana&lt;/b&gt;<span data-merge-field="x"></span></p>',
    );
    expect(fillMergeFieldsHTML(html, { nome: 1 }, { missing: 'empty' })).toBe('<p>Olá 1</p>');
  });
});

describe('slash commands', () => {
  it('lists commands with translated labels and runs the chosen one', async () => {
    const k = make({ slashCommands: true });
    await type(k, '/tít');
    expect(menuLabels()).toEqual(['Título 1', 'Título 2', 'Título 3']);
    press(k, 'ArrowDown');
    press(k, 'Enter');
    expect(k.editor.getHTML()).toMatch(/^<h2><\/h2>/);
  });

  it('respects a custom command list and skips unknown ids', async () => {
    const k = make({ slashCommands: ['quote', 'nope', 'bulletList'] });
    await type(k, '/');
    expect(menuLabels()).toEqual(['Citação', 'Lista com marcadores']);
  });

  it('does not open in the middle of a word', async () => {
    const k = make({ slashCommands: true });
    await type(k, 'a/b');
    expect(menu()).toBeNull();
  });

  it('is enabled by default in createEditorUI', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, { content: '<p></p>' });
    ui.editor.commands.focus();
    ui.editor.commands.insertContent('/');
    await flush();
    expect(menu()).not.toBeNull();
    await new Promise((resolve) => setTimeout(resolve, 20));
    ui.destroy();
  });
});
