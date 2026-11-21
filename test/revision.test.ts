import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  createEditor,
  createEditorUI,
  listChanges,
  listComments,
  type CommentThread,
  type EditorUI,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

const ana = { id: 'u1', name: 'Ana' };
const bia = { id: 'u2', name: 'Bia' };

let instance: KelsonEditor | EditorUI | undefined;
afterEach(async () => {
  await new Promise((resolve) => setTimeout(resolve, 20));
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content: string, options: KelsonEditorOptions = {}): KelsonEditor => {
  const k = createEditor({ element: document.createElement('div'), content, ...options });
  instance = k;
  return k;
};
const tick = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** Types through ProseMirror's text input path. */
const typeText = (k: KelsonEditor, text: string): void => {
  for (const char of text) {
    const { from, to } = k.editor.state.selection;
    const handled = k.editor.view.someProp('handleTextInput', (f) =>
      f(k.editor.view, from, to, char, () => k.editor.state.tr.insertText(char, from, to)),
    );
    if (!handled) k.editor.view.dispatch(k.editor.state.tr.insertText(char, from, to));
  }
};
/** Backspace as the browser reports it: a deletion of the character before the cursor. */
const backspace = (k: KelsonEditor): void => {
  const { from, to, empty } = k.editor.state.selection;
  k.editor.view.dispatch(
    empty ? k.editor.state.tr.delete(from - 1, from) : k.editor.state.tr.delete(from, to),
  );
};

describe('comments', () => {
  it('adds threads, replies, resolves and deletes; reports changes', () => {
    const onChange = vi.fn();
    const k = make('<p>prazo final do edital</p>', {
      revision: { user: ana, comments: { onChange } },
    });
    k.editor.commands.setTextSelection({ from: 1, to: 6 });
    expect(k.run('comment', 'Confirmar data')).toBe(true);
    const [thread] = listComments(k.editor);
    expect(thread).toMatchObject({ quote: 'prazo', resolved: false });
    expect(thread!.messages[0]).toMatchObject({ text: 'Confirmar data', author: ana });
    expect(k.editor.getHTML()).toContain(
      `<span data-comment="${thread!.id}" class="kt-comment">prazo</span>`,
    );
    k.editor.commands.replyComment(thread!.id, 'Ok, 30/11');
    expect(listComments(k.editor)[0]!.messages).toHaveLength(2);
    k.editor.commands.resolveComment(thread!.id);
    expect(k.editor.view.dom.querySelector('.is-resolved')).not.toBeNull();
    k.editor.commands.deleteComment(thread!.id);
    expect(k.editor.getHTML()).toBe('<p>prazo final do edital</p>');
    expect(onChange).toHaveBeenCalledTimes(4);
  });

  it('loads saved threads and requires a user and a selection', () => {
    const saved: CommentThread[] = [
      {
        id: 't1',
        resolved: false,
        createdAt: '2026-11-01T10:00:00Z',
        messages: [{ id: 'm1', author: bia, text: 'Revisar', createdAt: '2026-11-01T10:00:00Z' }],
      },
    ];
    const k = make('<p><span data-comment="t1">texto</span></p>', {
      revision: { user: ana, comments: { threads: saved } },
    });
    expect(listComments(k.editor)[0]).toMatchObject({ id: 't1', quote: 'texto' });
    expect(k.run('comment', 'x')).toBe(false); // empty selection
    const anon = make('<p>a</p>', { revision: {} });
    anon.editor.commands.selectAll();
    expect(anon.run('comment', 'x')).toBe(false);
  });
});

describe('track changes', () => {
  const suggest = (content: string): KelsonEditor =>
    make(content, { revision: { user: ana, trackChanges: true }, autocorrect: false });

  it('marks typed text as insertion', () => {
    const k = suggest('<p>Olá</p>');
    k.editor.commands.setTextSelection(4);
    typeText(k, ' mundo');
    expect(k.editor.getText()).toBe('Olá mundo');
    const changes = listChanges(k.editor.state.doc);
    expect(changes).toEqual([
      expect.objectContaining({
        type: 'insertion',
        text: ' mundo',
        author: 'u1',
        authorName: 'Ana',
      }),
    ]);
    expect(k.editor.getHTML()).toContain(
      '<ins data-author="u1" data-author-name="Ana" title="Ana"',
    );
  });

  it('keeps deleted text marked as deletion (Backspace and selection)', () => {
    const k = suggest('<p>abcdef</p>');
    k.editor.commands.setTextSelection(4);
    backspace(k);
    expect(k.editor.getText()).toBe('abcdef');
    expect(listChanges(k.editor.state.doc)).toEqual([
      expect.objectContaining({ type: 'deletion', text: 'c' }),
    ]);
    expect(k.editor.state.selection.from).toBe(3); // before the deleted letter
    k.editor.commands.setTextSelection({ from: 5, to: 7 });
    typeText(k, 'X');
    expect(k.editor.getText()).toBe('abcdefX');
    expect(listChanges(k.editor.state.doc).map((c) => [c.type, c.text])).toEqual([
      ['deletion', 'c'],
      ['deletion', 'ef'],
      ['insertion', 'X'],
    ]);
  });

  it('really removes the author own suggestions', () => {
    const k = suggest('<p>ab</p>');
    k.editor.commands.setTextSelection(3);
    typeText(k, 'XY');
    backspace(k);
    expect(k.editor.getText()).toBe('abX');
    expect(listChanges(k.editor.state.doc)).toEqual([
      expect.objectContaining({ type: 'insertion', text: 'X' }),
    ]);
  });

  it('accepts and rejects changes', () => {
    const k = suggest('<p>um dois</p>');
    k.editor.commands.setTextSelection(8);
    typeText(k, ' três');
    k.editor.commands.setTextSelection({ from: 1, to: 3 });
    backspace(k);
    expect(k.editor.getText()).toBe('um dois três');
    k.editor.commands.acceptAllChanges();
    expect(k.editor.getText()).toBe(' dois três');
    expect(listChanges(k.editor.state.doc)).toEqual([]);
    typeText(k, '!');
    k.editor.commands.rejectAllChanges();
    expect(k.editor.getText()).toBe(' dois três');
  });

  it('is off unless enabled and can be toggled by editors', () => {
    const k = make('<p>a</p>', { revision: { user: ana } });
    k.editor.commands.setTextSelection(2);
    typeText(k, 'b');
    expect(listChanges(k.editor.state.doc)).toEqual([]);
    k.run('trackChanges');
    typeText(k, 'c');
    expect(listChanges(k.editor.state.doc)).toHaveLength(1);
  });
});

describe('versions and roles', () => {
  it('saves and restores versions', async () => {
    const onSave = vi.fn();
    const k = make('<p>v1</p>', { revision: { user: ana, versions: { onSave } } });
    await tick();
    const v1 = k.revision!.saveVersion('Primeira');
    k.editor.commands.setContent('<p>v2</p>');
    expect(k.revision!.versions).toHaveLength(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ label: 'Primeira', author: ana }),
    );
    expect(k.revision!.restoreVersion(v1.id)).toBe(true);
    expect(k.editor.getText()).toBe('v1');
    expect(k.revision!.restoreVersion('nope')).toBe(false);
  });

  it('applies roles: viewer, commenter, suggester, editor', async () => {
    const k = make('<p>texto</p>', { revision: { user: ana, role: 'viewer' } });
    await tick();
    expect(k.editor.isEditable).toBe(false);
    k.editor.commands.selectAll();
    expect(k.commands.get('comment')!.isEnabled!(k.editor)).toBe(false);
    k.revision!.setRole('commenter');
    expect(k.editor.isEditable).toBe(false);
    expect(k.run('comment', 'nota')).toBe(true);
    k.revision!.setRole('suggester');
    expect(k.editor.isEditable).toBe(true);
    expect(k.editor.storage.trackChanges.enabled).toBe(true);
    expect(k.run('trackChanges')).toBe(false); // suggesters cannot turn it off
    expect(k.commands.get('acceptAllChanges')!.isEnabled!(k.editor)).toBe(false);
    k.revision!.setRole('editor');
    expect(k.commands.get('acceptAllChanges')!.isEnabled!(k.editor)).toBe(true);
    expect(() => k.revision!.setRole('admin' as never)).toThrow(/Papel "admin" inválido/);
  });
});

describe('revision panel', () => {
  it('lists threads, changes and versions and acts on them', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const ui = createEditorUI(host, {
      content: '<p>prazo <ins data-author="u2" data-author-name="Bia">novo</ins></p>',
      revision: { user: ana },
    });
    instance = ui;
    await tick();
    ui.editor.commands.setTextSelection({ from: 1, to: 6 });
    ui.run('comment', 'Verificar');
    ui.revision!.saveVersion('Rascunho');
    ui.run('revisionPanel');
    const panel = ui.root.querySelector<HTMLElement>('.kt-revision-panel')!;
    expect(panel.hidden).toBe(false);
    expect(panel.querySelector('.kt-thread-quote')?.textContent).toBe('prazo');
    expect(panel.querySelector('.kt-change-insertion')?.textContent).toContain('novo');
    expect(panel.querySelector('.kt-version span')?.textContent).toBe('Rascunho');
    const reply = panel.querySelector<HTMLInputElement>('.kt-thread-reply input')!;
    reply.value = 'Feito';
    reply.form!.dispatchEvent(new Event('submit', { cancelable: true }));
    expect(listComments(ui.editor)[0]!.messages).toHaveLength(2);
    panel.querySelector<HTMLButtonElement>('.kt-change .kt-button')!.click(); // accept
    expect(listChanges(ui.editor.state.doc)).toEqual([]);
    expect(ui.editor.getText()).toBe('prazo novo');
  });
});
