import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  const centralizar = document.createElement('button');
  centralizar.type = 'button';
  centralizar.className = 'btn btn-sm btn-outline-primary mb-2';
  centralizar.textContent = 'Centralizar e alinhar células ao meio (API)';
  const editorHost = document.createElement('div');
  host.append(centralizar, editorHost);

  const ui = createEditorUI(editorHost, {
    toolbar: 'full',
    // Com o cursor numa tabela aparece o menu contextual (tableMenu: false desliga).
    content: `<p>Clique numa célula para ver o menu da tabela.</p>
<table data-width="100%" data-table-style="striped">
  <caption style="caption-side: top">Vagas por campus</caption>
  <tbody>
    <tr><th><p>Campus</p></th><th><p>Vagas</p></th><th><p>Inscritos</p></th></tr>
    <tr><td><p>Natal-Central</p></td><td><p>40</p></td><td><p>312</p></td></tr>
    <tr><td><p>Mossoró</p></td><td><p>30</p></td><td><p>174</p></td></tr>
    <tr data-footer="true"><td><p><strong>Total</strong></p></td><td><p>70</p></td><td><p>486</p></td></tr>
  </tbody>
</table>
<p></p>`,
  });

  // O menu contextual chama estes mesmos comandos; aqui, pela API, na tabela do cursor.
  centralizar.addEventListener('click', () => {
    const { editor } = ui;
    if (!editor.isActive('table'))
      editor.commands.setTextSelection(editor.$node('tableCell')!.from + 1);
    editor
      .chain()
      .focus()
      .setTableProperties({ align: 'center', width: '80%' })
      .setCellProperties({ verticalAlign: 'middle' })
      .run();
  });
  return ui;
}
