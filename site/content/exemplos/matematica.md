# Fórmulas matemáticas

<p class="lead">Notação LaTeX renderizada com KaTeX, em linha e em bloco. Clique numa fórmula para editar.</p>

<div data-example="matematica"></div>

## Como funciona

- `mathPlugin()` fica na entrada `@kelsoncm/tiptap-core/math`, para não pesar em quem não usa fórmulas.
- Importe o CSS do KaTeX (`katex/dist/katex.min.css`).
- Comandos `inlineMath` e `blockMath`. Com payload, inserem direto: `ui.run('inlineMath', 'E = mc^2')`.
- O HTML salvo guarda o LaTeX em `data-latex`.
