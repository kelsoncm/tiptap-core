import { createEditorUI, type EditorMode, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  const controls = document.createElement('div');
  controls.className = 'd-flex gap-3 mb-2';
  controls.innerHTML = `
    <div class="form-check"><input class="form-check-input" type="radio" name="modo-bi" id="modo-balloon" value="balloon" checked>
      <label class="form-check-label" for="modo-balloon">Balão</label></div>
    <div class="form-check"><input class="form-check-input" type="radio" name="modo-bi" id="modo-inline" value="inline">
      <label class="form-check-label" for="modo-inline">Inline</label></div>`;
  const card = document.createElement('article');
  card.className = 'card card-body';
  host.append(controls, card);

  const ui = createEditorUI(card, {
    // balloon: formatação só no balão sobre a seleção.
    // inline: sem moldura; a barra flutua acima do texto enquanto ele tem foco.
    mode: 'balloon',
    toolbar: 'minimal',
    statusBar: false,
    minHeight: '0',
    content:
      '<h3>Aviso</h3><p>Selecione uma palavra para formatar. As inscrições vão até <strong>30 de novembro</strong>.</p>',
  });

  controls.addEventListener('change', (event) => {
    ui.setMode((event.target as HTMLInputElement).value as EditorMode);
  });
  return ui;
}
