import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  const controls = document.createElement('div');
  controls.className = 'site-controls';
  controls.innerHTML = `
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch" id="restrita-autor">
      <label class="form-check-label" for="restrita-autor">Modo autor (edita tudo)</label>
    </div>
    <button type="button" class="btn btn-sm btn-outline-primary" disabled>Marcar seleção como região</button>
    <div class="form-check form-switch">
      <input class="form-check-input" type="checkbox" role="switch" id="restrita-leitura">
      <label class="form-check-label" for="restrita-leitura">Somente leitura</label>
    </div>`;
  const editorHost = document.createElement('div');
  host.append(controls, editorHost);

  const ui = createEditorUI(editorHost, {
    // Só o texto das regiões (span[data-editable-region]) pode mudar.
    restrictedEdit: true,
    toolbar: 'basic',
    content: `<h3>Termo de compromisso</h3>
<p>Eu, <span data-editable-region>NOME COMPLETO</span>, matrícula
<span data-editable-region>000000</span>, declaro estar ciente das normas do programa.</p>
<p>Natal, <span data-editable-region>DATA</span>.</p>`,
  });

  const [autor, leitura] = controls.querySelectorAll<HTMLInputElement>('input');
  const marcar = controls.querySelector('button')!;
  autor!.addEventListener('change', () => {
    ui.setRestricted(!autor!.checked);
    marcar.disabled = !autor!.checked;
  });
  marcar.addEventListener('click', () => ui.editor.chain().focus().setEditableRegion().run());
  leitura!.addEventListener('change', () => ui.setMode(leitura!.checked ? 'readonly' : 'toolbar'));
  return ui;
}
