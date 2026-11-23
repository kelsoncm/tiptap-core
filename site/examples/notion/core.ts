import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    // Sem barra fixa: "/" abre o menu de blocos e o balão aparece sobre a seleção.
    mode: 'notion',
    // Passe o mouse à esquerda de um bloco para arrastá-lo.
    dragHandle: true,
    // Lista de comandos do menu "/" (true usa a lista padrão).
    slashCommands: [
      'paragraph',
      'heading-1',
      'heading-2',
      'heading-3',
      'bulletList',
      'orderedList',
      'taskList',
      'quote',
      'codeBlock',
      'insertTable',
      'horizontalRule',
      'emoji',
    ],
    statusBar: false,
    content: `<h2>Reunião de planejamento</h2>
<p>Digite <code>/</code> numa linha vazia para inserir um bloco.</p>
<ul data-type="taskList">
  <li data-type="taskItem" data-checked="true"><p>Definir o cronograma</p></li>
  <li data-type="taskItem" data-checked="false"><p>Publicar o edital</p></li>
</ul>
<p></p>`,
  });
}
