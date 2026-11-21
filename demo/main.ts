import 'katex/dist/katex.min.css';
import '../src/styles/kelson-editor.css';
import { mathPlugin } from '../src/math.js';
import * as core from '../src/index.js';
import { createEditorUI, getDocumentStats, type EditorMode } from '../src/index.js';

const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;

const ui = createEditorUI($('host'), {
  content: `<h2>Documento de exemplo</h2>
<p>Texto com <strong>negrito</strong>, <em>itálico</em> e <span data-editable-region>região editável</span>.</p>
<ul data-list-type="check"><li><p>Item ✔</p></li><li><p>Outro item</p></li></ul>
<table><caption style="caption-side: bottom">Tabela 1</caption><tbody>
<tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>
<pre><code class="language-python">def soma(a, b):
    return a + b  # comentário</code></pre>
<p></p>`,
  restrictedEdit: false,
  codeHighlight: true,
  revision: { user: { id: 'demo', name: 'Pessoa Demo' } },
  plugins: [mathPlugin()],
  insertions: {
    templates: [
      {
        id: 'oficio',
        label: 'Ofício',
        content: '<h2>Ofício nº __/2026</h2><p>Prezados,</p><p>Atenciosamente,</p>',
      },
    ],
  },
  customStyles: [
    { id: 'lead', label: 'Destaque', kind: 'block', className: 'demo-lead' },
    { id: 'marker', label: 'Marca-texto', kind: 'inline', className: 'demo-marker' },
  ],
  mentions: {
    items: [
      { id: 'inicioEdital', label: 'Início do edital' },
      { id: 'fimEdital', label: 'Fim do edital' },
      { id: 'ana', label: 'Ana Júlia', description: 'Coordenação' },
    ],
  },
  mergeFields: [
    { key: 'nomeEdital', label: 'Nome do edital' },
    { key: 'numeroEdital', label: 'Número do edital', description: 'Ex.: 12/2026' },
  ],
  features: { tableOfContents: true },
});

const render = (): void => {
  const stats = getDocumentStats(ui.editor.state.doc);
  $('out').textContent = `${JSON.stringify(stats)}\n\n${ui.editor.getHTML()}`;
};
ui.editor.on('update', render);
render();

$<HTMLSelectElement>('mode').addEventListener('change', (e) =>
  ui.setMode((e.target as HTMLSelectElement).value as EditorMode),
);
$<HTMLSelectElement>('locale').addEventListener('change', (e) =>
  ui.i18n.setLocale((e.target as HTMLSelectElement).value),
);
$<HTMLInputElement>('restricted').addEventListener('change', (e) =>
  ui.setRestricted((e.target as HTMLInputElement).checked),
);
$('region').addEventListener('click', () => ui.editor.chain().focus().setEditableRegion().run());

Object.assign(window, { ui, core });
