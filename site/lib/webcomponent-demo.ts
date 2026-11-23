import type { EditorUI } from '@kelsoncm/tiptap-core';

import { registerEditor } from './editors.js';

/**
 * Loads the real <kelsoncm-tiptap> bundle (copied from the web component release by
 * `npm run site:fetch-wc`) and shows what the form would submit.
 */
export async function mountWebComponentDemo(container: HTMLElement): Promise<void> {
  const url = `${import.meta.env.BASE_URL}vendor/kelsoncm-tiptap.bundle.js`;
  // A <script> tag, not import(): Vite refuses to import files from public/ in dev.
  const loaded = await new Promise<boolean>((resolve) => {
    const script = document.createElement('script');
    script.type = 'module';
    script.src = url;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
  if (loaded) await customElements.whenDefined('kelsoncm-tiptap');
  else {
    const warning = document.createElement('div');
    warning.className = 'alert alert-warning';
    warning.textContent =
      'O arquivo do web component não foi encontrado. Rode "npm run site:fetch-wc" e recarregue a página.';
    container.prepend(warning);
    return;
  }

  for (const element of container.querySelectorAll<HTMLElement & { editor?: EditorUI }>(
    'kelsoncm-tiptap',
  )) {
    if (element.editor) registerEditor(element.editor);
    element.addEventListener('kt-ready', (event) =>
      registerEditor((event as CustomEvent<{ editor: EditorUI }>).detail.editor),
    );
  }

  const form = container.querySelector('form');
  const output = container.querySelector<HTMLElement>('[data-form-output]');
  form?.addEventListener('submit', (event) => {
    event.preventDefault();
    if (!output) return;
    const data = new FormData(form);
    output.textContent = JSON.stringify(Object.fromEntries(data.entries()), null, 2);
  });
}
