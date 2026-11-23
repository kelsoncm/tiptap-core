import { createEditorUI, fillMergeFieldsHTML, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

const VALORES = {
  numero: '27/2026',
  destinatario: 'Diretoria de Gestão de Pessoas',
  assunto: 'Solicitação de capacitação',
  data: '23 de novembro de 2026',
};

const PESSOAS = [
  { id: 'ana', label: 'Ana Júlia', description: 'Coordenação' },
  { id: 'bruno', label: 'Bruno Costa', description: 'Secretaria' },
  { id: 'carla', label: 'Carla Dias', description: 'Direção-geral' },
];

export function mount(host: HTMLElement): EditorUI {
  const editorHost = document.createElement('div');
  const gerar = document.createElement('button');
  gerar.type = 'button';
  gerar.className = 'btn btn-sm btn-primary mt-2';
  gerar.textContent = 'Gerar documento';
  const preview = document.createElement('div');
  preview.className = 'border rounded p-3 mt-2 bg-body';
  preview.hidden = true;
  host.append(editorHost, gerar, preview);

  const ui = createEditorUI(editorHost, {
    content: `<p>Ofício nº <span data-merge-field="numero" data-label="Número do ofício"></span></p>
<p>À <span data-merge-field="destinatario" data-label="Destinatário"></span></p>
<p><strong>Assunto:</strong> <span data-merge-field="assunto" data-label="Assunto"></span></p>
<p>Prezados, encaminhamos a solicitação para análise. Responsável:
<span data-type="mention" data-id="ana" data-label="Ana Júlia">@Ana Júlia</span>.</p>
<p>Natal, <span data-merge-field="data" data-label="Data por extenso"></span>.</p>`,
    // Digite {{ para inserir um campo.
    mergeFields: [
      { key: 'numero', label: 'Número do ofício', description: 'Ex.: 27/2026' },
      { key: 'destinatario', label: 'Destinatário' },
      { key: 'assunto', label: 'Assunto' },
      { key: 'data', label: 'Data por extenso' },
    ],
    // Digite @ para mencionar; a fonte pode ser uma API (função assíncrona).
    mentions: {
      items: async (query) =>
        PESSOAS.filter((pessoa) => pessoa.label.toLowerCase().includes(query.toLowerCase())),
    },
    // Botão "Modelos" no grupo de inserção da barra.
    insertions: {
      templates: [
        {
          id: 'memorando',
          label: 'Memorando',
          content: '<h2>Memorando</h2><p>De: </p><p>Para: </p><p>Assunto: </p>',
        },
      ],
    },
  });

  gerar.addEventListener('click', () => {
    // O HTML salvo guarda os campos; o documento final recebe os valores (já escapados).
    preview.innerHTML = fillMergeFieldsHTML(ui.editor.getHTML(), VALORES);
    preview.hidden = false;
  });
  return ui;
}
