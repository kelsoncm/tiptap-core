import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    mode: 'toolbar', // toolbar | balloon | inline | notion | readonly
    toolbar: 'full', // minimal | basic | full | lista de comandos
    maxHeight: '420px',
    content: `<h2>Edital nº 12/2026</h2>
<p>Experimente: <strong>negrito</strong>, <em>itálico</em>, listas, tabelas, links,
imagens, emoji (<code>:</code>), comandos (<code>/</code>) e atalhos como <code>Ctrl+B</code>.</p>
<blockquote><p>O editor salva HTML limpo e funciona em qualquer página.</p></blockquote>
<ul data-list-type="check"><li><p>Núcleo sem framework</p></li><li><p>Web component</p></li><li><p>Componente Angular</p></li></ul>
<p></p>`,
  });
}
