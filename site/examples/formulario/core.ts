import {
  createEditorUI,
  getDocumentStats,
  limitStatus,
  type EditorUI,
} from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  const form = document.createElement('form');
  form.noValidate = true;
  form.innerHTML = `
    <p class="form-label fw-semibold" id="justificativa-rotulo">Justificativa do projeto</p>
    <div data-editor></div>
    <div class="d-flex gap-2 align-items-center mt-2">
      <button type="submit" class="btn btn-primary btn-sm">Enviar</button>
      <span data-feedback role="status"></span>
    </div>`;
  host.append(form);

  const ui = createEditorUI(form.querySelector<HTMLElement>('[data-editor]')!, {
    toolbar: 'basic',
    placeholder: 'Descreva o projeto em 20 a 120 palavras…',
    limits: { minWords: 20, maxWords: 120, maxParagraphs: 5 },
    minHeight: '140px',
    maxHeight: '320px',
  });
  ui.editor.view.dom.setAttribute('aria-labelledby', 'justificativa-rotulo');

  const feedback = form.querySelector<HTMLElement>('[data-feedback]')!;
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    // Máximos são aplicados durante a digitação; mínimos são conferidos no envio.
    const status = limitStatus(getDocumentStats(ui.editor.state.doc), ui.limits);
    const ok = status.under.length === 0 && status.over.length === 0;
    feedback.className = ok ? 'text-success' : 'text-danger';
    feedback.textContent = ok
      ? `Enviado: ${status.stats.words} palavras.`
      : `Texto curto: o mínimo é de ${ui.limits.minWords} palavras.`;
  });
  return ui;
}
