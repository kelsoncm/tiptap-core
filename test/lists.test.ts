import { afterEach, describe, expect, it } from 'vitest';

import { createEditor, type KelsonEditor, type KelsonEditorOptions } from '../src/index.js';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
});

const make = (content: string, options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};

describe('checklist', () => {
  it('toggles a task list and reports active state', () => {
    const k = make('<p>comprar pão</p>');
    k.run('taskList');
    expect(k.editor.getHTML()).toMatch(
      /^<ul data-type="taskList"><li class="kt-task-item" data-checked="false" data-type="taskItem">/,
    );
    expect(k.commands.get('taskList')!.isActive!(k.editor)).toBe(true);
    k.run('taskList');
    expect(k.editor.getHTML().startsWith('<p>comprar pão</p>')).toBe(true);
  });

  it('parses and keeps checked items', () => {
    const k = make(
      '<ul data-type="taskList"><li data-type="taskItem" data-checked="true"><p>feito</p></li></ul>',
    );
    expect(k.editor.state.doc.firstChild?.firstChild?.attrs['checked']).toBe(true);
    const checkbox = k.editor.view.dom.querySelector<HTMLInputElement>('input[type="checkbox"]');
    expect(checkbox?.checked).toBe(true);
  });

  it('checks an item by clicking its checkbox', () => {
    const k = make('<ul data-type="taskList"><li data-type="taskItem"><p>a</p></li></ul>');
    const checkbox = k.editor.view.dom.querySelector<HTMLInputElement>('input[type="checkbox"]')!;
    checkbox.checked = true;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(k.editor.getHTML()).toContain('data-checked="true"');
  });

  it('nests task items with indent', () => {
    const k = make(
      '<ul data-type="taskList"><li data-type="taskItem"><p>a</p></li><li data-type="taskItem"><p>b</p></li></ul>',
    );
    k.editor.commands.setTextSelection(8);
    expect(k.run('indent')).toBe(true);
    expect(k.editor.state.doc.firstChild?.childCount).toBe(1);
  });

  it('converts markdown "[ ] " input', () => {
    const k = make('<p></p>');
    k.editor.commands.focus();
    k.editor.view.dispatch(k.editor.state.tr.insertText('[ ]'));
    // Input rules run on text input; simulate the final space through the view handler.
    const handled = k.editor.view.someProp('handleTextInput', (f) =>
      f(k.editor.view, 4, 4, ' ', () => k.editor.state.tr.insertText(' ', 4, 4)),
    );
    expect(handled).toBe(true);
    expect(k.editor.isActive('taskList')).toBe(true);
  });

  it('can be disabled', () => {
    const k = make('<p></p>', { features: { taskList: false } });
    expect(k.commands.has('taskList')).toBe(false);
  });
});
