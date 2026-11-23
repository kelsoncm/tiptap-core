import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import { officePlugin } from '@kelsoncm/tiptap-core/office'; // npm install mammoth
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  const editorHost = document.createElement('div');
  const actions = document.createElement('div');
  actions.className = 'd-flex flex-wrap gap-2 mt-2';
  const output = document.createElement('div');
  output.className = 'site-code site-output';
  output.hidden = true;
  const pre = document.createElement('pre');
  const code = document.createElement('code');
  pre.append(code);
  output.append(pre);
  host.append(editorHost, actions, output);

  const ui = createEditorUI(editorHost, {
    plugins: [officePlugin()], // comando importWord (.docx)
    io: { keepPastedFormatting: false }, // limpa o HTML colado do Word/Google Docs
    toolbar: [
      'undo',
      'redo',
      '|',
      'bold',
      'italic',
      'bulletList',
      '|',
      'importWord',
      'importMarkdown',
    ],
    content: `<h2>Relatório anual</h2>
<p>Cole aqui um trecho do Word ou do Google Docs, ou importe um arquivo <strong>.docx</strong>.</p>
<ul><li><p>Markdown colado vira formatação</p></li><li><p>Ctrl+Shift+V cola como texto simples</p></li></ul>`,
  });

  const button = (label: string, run: () => void): void => {
    const element = document.createElement('button');
    element.type = 'button';
    element.className = 'btn btn-sm btn-outline-primary';
    element.textContent = label;
    element.addEventListener('click', run);
    actions.append(element);
  };
  button('Baixar Word (.doc)', () => ui.run('exportWord'));
  button('PDF (imprimir)', () => ui.run('exportPdf'));
  button('Baixar HTML com estilos', () => ui.run('exportHtml'));
  button('Ver Markdown', () => {
    code.textContent = ui.getMarkdown();
    output.hidden = false;
  });
  return ui;
}
