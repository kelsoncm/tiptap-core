import { afterEach, describe, expect, it } from 'vitest';

import {
  createEditor,
  createEditorUI,
  formatShortcut,
  RESTRICTED_EDIT_BYPASS,
  RestrictedEdit,
  SEPARATOR,
  Toolbar,
  TOOLBAR_PRESETS,
  type EditorUI,
  type KelsonEditor,
} from '../src/index.js';

const cleanups: (() => void)[] = [];
afterEach(() => {
  for (const fn of cleanups.splice(0)) fn();
  document.body.replaceChildren();
});

const mountUI = (options: Parameters<typeof createEditorUI>[1] = {}): EditorUI => {
  const host = document.createElement('div');
  document.body.append(host);
  const ui = createEditorUI(host, { content: '<p>texto</p>', ...options });
  cleanups.push(() => ui.destroy());
  return ui;
};

const mountEditor = (content = '<p>texto</p>'): KelsonEditor => {
  const kelson = createEditor({ element: document.createElement('div'), content });
  cleanups.push(() => kelson.destroy());
  return kelson;
};

const button = (root: HTMLElement, id: string): HTMLButtonElement | null =>
  root.querySelector(`button[data-command="${id}"]`);

describe('Toolbar', () => {
  it('renders buttons with accessible labels and skips unknown commands', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, ['bold', SEPARATOR, 'nope', SEPARATOR, 'italic']);
    cleanups.push(() => toolbar.destroy());
    expect(toolbar.element.getAttribute('role')).toBe('toolbar');
    const bold = button(toolbar.element, 'bold')!;
    expect(bold.getAttribute('aria-label')).toMatch(/^Negrito \((Ctrl\+B|⌘B)\)$/);
    expect(button(toolbar.element, 'nope')).toBeNull();
    // Consecutive separators collapse into one.
    expect(toolbar.element.querySelectorAll('.kt-toolbar-separator')).toHaveLength(1);
  });

  it('runs commands and reflects the active state', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, ['bold']);
    cleanups.push(() => toolbar.destroy());
    kelson.editor.commands.selectAll();
    const bold = button(toolbar.element, 'bold')!;
    expect(bold.getAttribute('aria-pressed')).toBe('false');
    bold.click();
    expect(kelson.editor.getHTML()).toContain('<strong>');
    expect(bold.getAttribute('aria-pressed')).toBe('true');
    expect(bold.classList.contains('is-active')).toBe(true);
  });

  it('disables buttons whose command cannot run', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, ['undo', 'addRowAfter']);
    cleanups.push(() => toolbar.destroy());
    expect(button(toolbar.element, 'undo')!.disabled).toBe(true);
    expect(button(toolbar.element, 'addRowAfter')!.disabled).toBe(true);
  });

  it('value selects run commands and show the current value', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, TOOLBAR_PRESETS.full);
    cleanups.push(() => toolbar.destroy());
    kelson.editor.commands.selectAll();
    const size = toolbar.element.querySelector<HTMLSelectElement>(
      'select[data-command="fontSize"]',
    )!;
    size.value = '24px';
    size.dispatchEvent(new Event('change'));
    expect(kelson.editor.getHTML()).toContain('font-size: 24px');
    toolbar.update();
    expect(size.value).toBe('24px');
  });

  it('block type select switches blocks and shows the active one', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, TOOLBAR_PRESETS.basic);
    cleanups.push(() => toolbar.destroy());
    const blocks = toolbar.element.querySelector<HTMLSelectElement>('select:not([data-command])')!;
    expect(blocks.value).toBe('paragraph');
    blocks.value = 'heading-4';
    blocks.dispatchEvent(new Event('change'));
    expect(kelson.editor.getHTML()).toMatch(/^<h4>texto<\/h4>/);
    expect(blocks.value).toBe('heading-4');
  });

  it('uses a roving tabindex with arrow keys, Home and End', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, ['bold', 'italic', 'underline']);
    cleanups.push(() => toolbar.destroy());
    document.body.append(toolbar.element);
    const bold = button(toolbar.element, 'bold')!;
    const italic = button(toolbar.element, 'italic')!;
    const underline = button(toolbar.element, 'underline')!;
    expect([bold.tabIndex, italic.tabIndex, underline.tabIndex]).toEqual([0, -1, -1]);
    bold.focus();
    bold.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(italic);
    italic.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true }));
    expect(document.activeElement).toBe(underline);
    underline.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    expect(document.activeElement).toBe(bold);
  });

  it('relabels on locale change', () => {
    const kelson = mountEditor();
    const toolbar = new Toolbar(kelson, ['bold']);
    cleanups.push(() => toolbar.destroy());
    kelson.i18n.setLocale('en');
    expect(button(toolbar.element, 'bold')!.getAttribute('aria-label')).toMatch(/^Bold/);
  });

  it('formats shortcuts per platform', () => {
    expect(formatShortcut('Mod-Shift-z', false)).toBe('Ctrl+Shift+Z');
    expect(formatShortcut('Mod-Shift-z', true)).toBe('⌘⇧Z');
  });
});

describe('createEditorUI modes', () => {
  it('mounts toolbar, content and balloon in toolbar mode', () => {
    const ui = mountUI();
    expect(ui.root.dataset['mode']).toBe('toolbar');
    expect(ui.root.querySelector<HTMLElement>('.kt-toolbar-host')!.hidden).toBe(false);
    expect(ui.root.querySelector('.kt-content .tiptap')).not.toBeNull();
    expect(ui.root.querySelector('.kt-toolbar-balloon')).toBeNull(); // attached only over a selection
  });

  it.each(['balloon', 'notion'] as const)('hides the fixed toolbar in %s mode', (mode) => {
    const ui = mountUI({ mode });
    expect(ui.root.querySelector<HTMLElement>('.kt-toolbar-host')!.hidden).toBe(true);
    expect(ui.editor.isEditable).toBe(true);
  });

  it('readonly mode is not editable and cannot be made editable', () => {
    const ui = mountUI({ mode: 'readonly' });
    expect(ui.editor.isEditable).toBe(false);
    ui.setEditable(true);
    expect(ui.editor.isEditable).toBe(false);
    ui.setMode('toolbar');
    expect(ui.editor.isEditable).toBe(true);
  });

  it('switches modes at runtime and rejects invalid ones', () => {
    const ui = mountUI({ toolbar: 'minimal' });
    ui.setMode('inline');
    expect(ui.mode).toBe('inline');
    expect(ui.root.dataset['mode']).toBe('inline');
    expect(() => ui.setMode('bogus' as never)).toThrow(/Modo "bogus" inválido/);
    expect(() => mountUI({ mode: 'x' as never })).toThrow(/inválido/);
  });

  it('shows the notion placeholder on empty documents', () => {
    const ui = mountUI({ mode: 'notion', content: '' });
    const p = ui.root.querySelector('.tiptap p')!;
    expect(p.getAttribute('data-placeholder')).toBe('Digite “/” para comandos…');
  });

  it('uses a toolbar preset by name', () => {
    const ui = mountUI({ toolbar: 'minimal', balloon: false });
    expect(ui.root.querySelectorAll('.kt-toolbar-host button')).toHaveLength(4);
    expect(ui.root.querySelector('.kt-toolbar-balloon')).toBeNull();
  });

  it('removes its DOM on destroy', () => {
    const host = document.createElement('div');
    const ui = createEditorUI(host);
    ui.destroy();
    expect(host.children).toHaveLength(0);
  });
});

describe('restricted edit', () => {
  const content =
    '<p>Fixo <span data-editable-region>editável</span> fixo.</p><p>Outro parágrafo.</p>';

  const restricted = (): KelsonEditor => {
    const kelson = createEditor({
      element: document.createElement('div'),
      content,
      extensions: [RestrictedEdit.configure({ enabled: true })],
    });
    cleanups.push(() => kelson.destroy());
    return kelson;
  };

  // "Fixo " = positions 1..6; region "editável" = 6..14.
  it('allows typing inside a region', () => {
    const k = restricted();
    k.editor.commands.insertContentAt(10, 'X');
    expect(k.editor.getText()).toContain('editXável');
  });

  it('allows typing at the end of a region and extends it', () => {
    const k = restricted();
    k.editor.commands.insertContentAt(14, '!');
    expect(k.editor.getHTML()).toContain('editável!</span>');
  });

  it('blocks typing and deleting outside regions', () => {
    const k = restricted();
    const before = k.editor.getHTML();
    k.editor.commands.insertContentAt(2, 'X');
    k.editor.commands.deleteRange({ from: 3, to: 8 });
    k.editor.commands.insertContentAt(30, 'X');
    expect(k.editor.getHTML()).toBe(before);
  });

  it('allows formatting inside a region but not outside', () => {
    const k = restricted();
    k.editor.chain().setTextSelection({ from: 7, to: 10 }).toggleBold().run();
    expect(k.editor.getHTML()).toContain('<strong>');
    const before = k.editor.getHTML();
    k.editor.chain().setTextSelection({ from: 1, to: 4 }).toggleItalic().run();
    k.editor.chain().setTextSelection(2).setTextAlign?.('center').run();
    expect(k.editor.getHTML()).toBe(before);
  });

  it('blocks structural changes and region edits while restricted', () => {
    const k = restricted();
    const before = k.editor.getHTML();
    k.editor.chain().setTextSelection(10).toggleHeading({ level: 1 }).run();
    k.editor.chain().setTextSelection({ from: 1, to: 4 }).setEditableRegion().run();
    expect(k.editor.getHTML()).toBe(before);
  });

  it('author mode marks new regions; bypass meta skips the filter', () => {
    const k = restricted();
    expect(k.editor.storage.editableRegion.enabled).toBe(true);
    k.editor.commands.setRestrictedEdit(false);
    expect(k.editor.storage.editableRegion.enabled).toBe(false);
    k.editor.chain().setTextSelection({ from: 1, to: 5 }).setEditableRegion().run();
    expect(k.editor.getHTML()).toContain(
      '<span data-editable-region="" class="kt-editable-region">Fixo</span>',
    );
    k.editor.commands.setRestrictedEdit(true);
    k.editor.view.dispatch(
      k.editor.state.tr.insertText('Z', 30).setMeta(RESTRICTED_EDIT_BYPASS, true),
    );
    expect(k.editor.getText()).toContain('Z');
  });

  it('createEditorUI toggles the restriction', () => {
    const ui = mountUI({ content, restrictedEdit: false });
    ui.editor.commands.insertContentAt(2, 'X');
    expect(ui.editor.getText()).toContain('FXixo');
    ui.setRestricted(true);
    ui.editor.commands.insertContentAt(2, 'Y');
    expect(ui.editor.getText()).not.toContain('Y');
    expect(() => mountUI().setRestricted(true)).toThrow(/restrictedEdit/);
  });
});
