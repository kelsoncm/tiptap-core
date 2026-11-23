import 'katex/dist/katex.min.css';

import { createEditorUI, getDocumentStats, type EditorMode } from '@kelsoncm/tiptap-core';
import { mathPlugin } from '@kelsoncm/tiptap-core/math';

import { registerEditor } from './editors.js';

const CONTENT = `<h2>Documento de exemplo</h2>
<p>Texto com <strong>negrito</strong>, <em>itálico</em> e <span data-editable-region>região editável</span>.</p>
<ul data-list-type="check"><li><p>Item ✔</p></li><li><p>Outro item</p></li></ul>
<table><caption style="caption-side: bottom">Tabela 1</caption><tbody>
<tr><th><p>A</p></th><th><p>B</p></th></tr><tr><td><p>1</p></td><td><p>2</p></td></tr></tbody></table>
<pre><code class="language-python">def soma(a, b):
    return a + b  # comentário</code></pre>
<p></p>`;

/** Every feature on, plus controls for mode and restricted editing (former demo/). */
export function mountPlayground(container: HTMLElement): void {
  const controls = document.createElement('div');
  controls.className = 'site-controls';
  controls.innerHTML = `
    <label class="form-label">Modo
      <select class="form-select form-select-sm" data-mode>
        <option>toolbar</option><option>balloon</option><option>inline</option>
        <option>notion</option><option>readonly</option>
      </select>
    </label>
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch" id="pg-restrito" data-restricted>
      <label class="form-check-label" for="pg-restrito">Edição restrita</label>
    </div>
    <button type="button" class="btn btn-sm btn-outline-primary" data-region>Marcar região editável</button>`;
  const host = document.createElement('div');
  const stats = document.createElement('p');
  stats.className = 'site-stats';
  container.replaceChildren(controls, host, stats);

  const ui = registerEditor(
    createEditorUI(host, {
      content: CONTENT,
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
        { id: 'lead', label: 'Destaque', kind: 'block', className: 'lead' },
        { id: 'marker', label: 'Marca-texto', kind: 'inline', className: 'site-marker' },
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
      maxHeight: '70vh',
    }),
  );

  const render = (): void => {
    const s = getDocumentStats(ui.editor.state.doc);
    stats.textContent = `${s.words} palavras · ${s.characters} caracteres · ${s.paragraphs} parágrafos`;
  };
  ui.editor.on('update', render);
  render();

  controls
    .querySelector<HTMLSelectElement>('[data-mode]')
    ?.addEventListener('change', (event) =>
      ui.setMode((event.target as HTMLSelectElement).value as EditorMode),
    );
  controls
    .querySelector<HTMLInputElement>('[data-restricted]')
    ?.addEventListener('change', (event) =>
      ui.setRestricted((event.target as HTMLInputElement).checked),
    );
  controls
    .querySelector('[data-region]')
    ?.addEventListener('click', () => ui.editor.chain().focus().setEditableRegion().run());
}
