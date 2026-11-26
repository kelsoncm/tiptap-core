import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  createEditor,
  countCharacters,
  createEditorUI,
  getDocumentStats,
  limitStatus,
  LIMITS_BYPASS,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
  vi.useRealTimers();
  localStorage.clear();
});

const make = (content = '<p></p>', options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};

/** Types text through ProseMirror's text input path, so input rules run. */
const typeText = (k: KelsonEditor, text: string): void => {
  for (const char of text) {
    const { from, to } = k.editor.state.selection;
    const handled = k.editor.view.someProp('handleTextInput', (f) =>
      f(k.editor.view, from, to, char, () => k.editor.state.tr.insertText(char, from, to)),
    );
    if (!handled) k.editor.view.dispatch(k.editor.state.tr.insertText(char, from, to));
  }
};

describe('limits', () => {
  it('reports over and under', () => {
    const stats = { characters: 10, charactersWithSpaces: 12, words: 3, paragraphs: 1 };
    expect(limitStatus(stats, { maxWords: 2, minParagraphs: 2, maxCharacters: 20 })).toEqual({
      stats,
      over: ['words'],
      under: ['paragraphs'],
    });
  });

  it('counts characters by the characterCount rule', () => {
    const k = make('<p>ab cd</p><p>ef</p>');
    const doc = k.editor.state.doc;
    expect(countCharacters(doc)).toBe(6);
    expect(countCharacters(doc, 'noSpaces')).toBe(6);
    expect(countCharacters(doc, 'withSpaces')).toBe(8);
    expect(countCharacters(doc, 'text')).toBe(7);
    expect(countCharacters(doc, 'text')).toBe(doc.textContent.replace(/[\r\n]/g, '').length);
    expect(getDocumentStats(doc).characters).toBe(6);
    expect(getDocumentStats(doc, { characterCount: 'text' }).characters).toBe(7);
    expect(getDocumentStats(doc, { characterCount: 'withSpaces' }).characters).toBe(8);
    expect(() => countCharacters(doc, 'x' as never)).toThrow(/characterCount/);
  });

  it('applies characterCount to the limits and the status bar', () => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, {
      content: '<p>ab</p><p>c</p>',
      limits: { maxCharacters: 5, minCharacters: 6, characterCount: 'text' },
    });
    instance = ui;
    ui.editor.commands.focus('end');
    typeText(ui, ' de');
    // "text" ignores the separator between blocks: "ab" + "c d" = 5.
    expect(ui.editor.state.doc.textContent).toBe('abc d');
    const item = ui.root.querySelector<HTMLElement>('[data-counter="characters"]')!;
    expect(item.textContent).toBe('Caracteres: 5/5 (mín. 6)');
    expect(item.classList.contains('is-under')).toBe(true);
  });

  it('blocks typing beyond the character limit', () => {
    const k = make('<p>abc</p>', { limits: { maxCharacters: 5 } });
    k.editor.commands.focus('end');
    typeText(k, 'defgh');
    expect(k.editor.getText()).toBe('abcde');
  });

  it('blocks new words and paragraphs beyond the limits', () => {
    const k = make('<p>um dois</p>', { limits: { maxWords: 2, maxParagraphs: 1 } });
    k.editor.commands.focus('end');
    typeText(k, ' tres');
    expect(getDocumentStats(k.editor.state.doc).words).toBe(2);
    k.editor.commands.insertContent('<p>outro</p>');
    expect(getDocumentStats(k.editor.state.doc).paragraphs).toBe(1);
  });

  it('allows shortening an oversized document and bypassing the limit', () => {
    const k = make('<p>abcdefgh</p>', { limits: { maxCharacters: 3 } });
    // setContent at creation is not filtered; deleting is always allowed.
    k.editor.commands.deleteRange({ from: 1, to: 3 });
    expect(k.editor.getText()).toBe('cdefgh');
    k.editor.view.dispatch(k.editor.state.tr.insertText('XYZ', 1).setMeta(LIMITS_BYPASS, true));
    expect(k.editor.getText()).toBe('XYZcdefgh');
  });
});

describe('autocorrect and autoformat', () => {
  it('applies typography by default (dash, ellipsis, quotes, ©)', () => {
    const k = make();
    k.editor.commands.focus();
    typeText(k, 'a -- b... "c" (c)');
    expect(k.editor.getText()).toBe('a — b… “c” ©');
  });

  it('can disable typography', () => {
    const k = make('<p></p>', { autocorrect: false });
    k.editor.commands.focus();
    typeText(k, 'a -- b');
    expect(k.editor.getText()).toBe('a -- b');
  });

  it('replaces words and capitalizes sentences', () => {
    const k = make('<p></p>', {
      autocorrect: { replacements: { vc: 'você', tb: 'também' }, capitalizeSentences: true },
    });
    k.editor.commands.focus();
    typeText(k, 'oi vc vai? tb. sim');
    expect(k.editor.getText()).toBe('Oi você vai? Também. Sim');
  });

  it.each([
    ['# ', 'heading'],
    ['> ', 'blockquote'],
    ['- ', 'bulletList'],
    ['1. ', 'orderedList'],
    ['``` ', 'codeBlock'],
  ])('autoformats "%s" into %s', (input, type) => {
    const k = make();
    k.editor.commands.focus();
    typeText(k, input.trimEnd());
    typeText(k, ' ');
    expect(k.editor.state.doc.firstChild?.type.name).toBe(type);
  });

  it('autoformats **bold**', () => {
    const k = make();
    k.editor.commands.focus();
    typeText(k, '**forte**');
    expect(k.editor.getHTML()).toBe('<p><strong>forte</strong></p>');
  });
});

describe('autosave', () => {
  beforeEach(() => vi.useFakeTimers());

  it('debounces saves and reports status', async () => {
    const save = vi.fn(async () => undefined);
    const k = make('<p>a</p>', { autosave: { save, delay: 500, storageKey: 'kt-test' } });
    const statuses: string[] = [];
    k.autosave!.onStatus((s) => statuses.push(s));
    k.editor.commands.insertContent('b');
    k.editor.commands.insertContent('c');
    expect(save).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(600);
    expect(save).toHaveBeenCalledTimes(1);
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ html: '<p>bca</p>' }));
    expect(statuses).toEqual(['pending', 'pending', 'saving', 'saved']);
    expect(localStorage.getItem('kt-test')).toBe('<p>bca</p>');
  });

  it('reports errors and keeps working', async () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const save = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue(undefined);
    const k = make('<p>a</p>', { autosave: { save, delay: 10 } });
    k.editor.commands.insertContent('b');
    await vi.advanceTimersByTimeAsync(20);
    expect(k.autosave!.status).toBe('error');
    expect(k.autosave!.lastError?.message).toBe('offline');
    await k.autosave!.flush();
    expect(k.autosave!.status).toBe('saved');
    spy.mockRestore();
  });

  it('restores the local draft', () => {
    localStorage.setItem('kt-draft', '<p>rascunho</p>');
    const k = make('<p>original</p>', { autosave: { storageKey: 'kt-draft' }, restoreDraft: true });
    expect(k.editor.getText()).toBe('rascunho');
    k.autosave!.clearDraft();
    expect(k.autosave!.readDraft()).toBeNull();
  });
});

describe('status bar and auto-resize', () => {
  it('shows counters with limits and the save state', async () => {
    vi.useFakeTimers();
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, {
      content: '<p>um dois três</p>',
      limits: { maxWords: 2, minParagraphs: 2 },
      autosave: { delay: 10, storageKey: 'kt-ui' },
      minHeight: '100px',
      maxHeight: '300px',
    });
    const words = ui.root.querySelector('[data-counter="words"]')!;
    expect(words.textContent).toBe('Palavras: 3/2');
    expect(words.classList.contains('is-over')).toBe(true);
    expect(ui.root.querySelector('[data-counter="paragraphs"]')!.textContent).toBe(
      'Parágrafos: 1 (mín. 2)',
    );
    ui.editor.commands.deleteRange({ from: 1, to: 4 });
    await vi.advanceTimersByTimeAsync(20);
    expect(ui.root.querySelector('[data-counter="words"]')!.classList.contains('is-over')).toBe(
      false,
    );
    expect(ui.root.querySelector('.kt-status-save')!.textContent).toBe('Salvo');
    expect(ui.root.style.getPropertyValue('--kt-max-height')).toBe('300px');
    ui.destroy();
  });

  it('can be hidden', () => {
    const host = document.createElement('div');
    const ui = createEditorUI(host, { statusBar: false });
    expect(ui.root.querySelector('.kt-status-bar')).toBeNull();
    ui.destroy();
  });
});
