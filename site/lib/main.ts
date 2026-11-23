import '@abrasileirado/dsgovbr-bootstrapped/dist/dsgovbr-bootstrapped.min.css';
import '@kelsoncm/tiptap-core/styles.css';
import './site.css';

import { currentLocale, setLocale } from './editors.js';
import { mountExample } from './example.js';

function setupMenu(): void {
  const button = document.querySelector<HTMLButtonElement>('[data-site-menu]');
  const nav = document.getElementById('site-nav');
  if (!button || !nav) return;
  const toggle = (open: boolean): void => {
    nav.classList.toggle('open', open);
    button.setAttribute('aria-expanded', String(open));
    button.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
  };
  button.addEventListener('click', () => toggle(!nav.classList.contains('open')));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && nav.classList.contains('open')) {
      toggle(false);
      button.focus();
    }
  });
}

function setupLocale(): void {
  const select = document.querySelector<HTMLSelectElement>('#site-locale');
  if (!select) return;
  select.value = currentLocale();
  select.addEventListener('change', () => setLocale(select.value));
}

/** "Copiar" buttons of every code block (static Markdown blocks and example tabs). */
function setupCopy(): void {
  document.addEventListener('click', (event) => {
    const button = (event.target as Element | null)?.closest<HTMLButtonElement>('[data-copy]');
    const code = button?.parentElement?.querySelector('code');
    if (!button || !code) return;
    navigator.clipboard.writeText(code.textContent ?? '').then(
      () => {
        button.textContent = 'Copiado!';
        setTimeout(() => (button.textContent = 'Copiar'), 1500);
      },
      () => {
        button.textContent = 'Selecione e copie';
      },
    );
  });
}

async function mountPageWidgets(): Promise<void> {
  const jobs: Promise<void>[] = [];
  for (const container of document.querySelectorAll<HTMLElement>('[data-example]')) {
    jobs.push(mountExample(container));
  }
  const playground = document.querySelector<HTMLElement>('[data-playground]');
  if (playground) jobs.push(import('./playground.js').then((m) => m.mountPlayground(playground)));
  const wc = document.querySelector<HTMLElement>('[data-webcomponent-demo]');
  if (wc) jobs.push(import('./webcomponent-demo.js').then((m) => m.mountWebComponentDemo(wc)));
  const results = await Promise.allSettled(jobs);
  for (const result of results) {
    if (result.status === 'rejected') console.error(result.reason);
  }
}

setupMenu();
setupLocale();
setupCopy();
void mountPageWidgets();
