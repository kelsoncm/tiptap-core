import { afterEach, describe, expect, it } from 'vitest';

import {
  CommandRegistry,
  createEditor,
  createI18n,
  defaultCommands,
  type KelsonEditor,
} from '../src/index.js';

let instance: KelsonEditor | undefined;

afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

const make = (content = '<p>texto</p>', editable = true): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, editable });
  return instance;
};

describe('CommandRegistry', () => {
  it('rejects duplicate ids unless replace is true', () => {
    const registry = new CommandRegistry(defaultCommands());
    const bold = registry.get('bold');
    expect(bold).toBeDefined();
    expect(() => registry.register(bold!)).toThrow(/já registrado/);
    expect(() => registry.register(bold!, true)).not.toThrow();
  });

  it('lists by group and unregisters', () => {
    const registry = new CommandRegistry(defaultCommands());
    expect(registry.list('history').map((c) => c.id)).toEqual(['undo', 'redo']);
    expect(registry.unregister('undo')).toBe(true);
    expect(registry.has('undo')).toBe(false);
  });

  it('throws for unknown commands', () => {
    const { editor, commands } = make();
    expect(() => commands.run(editor, 'nope')).toThrow(/não encontrado/);
  });

  it('has unique ids and i18n labels for every default command', () => {
    const i18n = createI18n();
    const commands = defaultCommands();
    expect(new Set(commands.map((c) => c.id)).size).toBe(commands.length);
    for (const c of commands) expect(i18n.t(c.labelKey, c.labelParams)).not.toBe(c.labelKey);
  });
});

describe('createEditor', () => {
  it('toggles marks through the registry', () => {
    const k = make();
    k.editor.commands.selectAll();
    expect(k.run('bold')).toBe(true);
    expect(k.commands.get('bold')!.isActive!(k.editor)).toBe(true);
    expect(k.editor.getHTML()).toBe('<p><strong>texto</strong></p>');
  });

  it.each([1, 2, 3, 4, 5, 6])('supports heading level %i', (level) => {
    const k = make();
    k.run(`heading-${level}`);
    // StarterKit's TrailingNode appends an empty paragraph after non-paragraph blocks.
    expect(k.editor.getHTML()).toBe(`<h${level}>texto</h${level}><p></p>`);
  });

  it('removes all formatting', () => {
    const k = make('<h2><strong><em>texto</em></strong></h2>');
    k.editor.commands.selectAll();
    k.run('removeFormat');
    expect(k.editor.getHTML()).toBe('<p>texto</p><p></p>');
  });

  it('undoes and redoes', () => {
    const k = make();
    k.editor.commands.selectAll();
    k.run('italic');
    k.run('undo');
    expect(k.editor.getHTML()).toBe('<p>texto</p>');
    k.run('redo');
    expect(k.editor.getHTML()).toBe('<p><em>texto</em></p>');
  });

  it('disables editing commands in read-only mode', () => {
    const k = make('<p>texto</p>', false);
    k.editor.commands.selectAll();
    expect(k.run('bold')).toBe(false);
    k.setEditable(true);
    expect(k.run('bold')).toBe(true);
  });

  it('accepts a shared i18n instance', () => {
    const i18n = createI18n({ locale: 'en' });
    instance = createEditor({ i18n });
    expect(instance.i18n).toBe(i18n);
  });
});
