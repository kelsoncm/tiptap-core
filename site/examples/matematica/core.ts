import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import { mathPlugin } from '@kelsoncm/tiptap-core/math';
import '@kelsoncm/tiptap-core/styles.css';
import 'katex/dist/katex.min.css';

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    // Comandos inlineMath e blockMath (barra, menu "/" e API). Clique numa fórmula para editar.
    plugins: [mathPlugin()],
    toolbar: ['undo', 'redo', '|', 'bold', 'italic', '|', 'inlineMath', 'blockMath'],
    content: `<p>A área do círculo é <span data-type="inline-math" data-latex="A = \\pi r^2"></span>.</p>
<div data-type="block-math" data-latex="x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}"></div>
<p>Insira outras fórmulas pelos botões ∑ da barra.</p>`,
  });
}
