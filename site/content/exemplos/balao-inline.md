# Balão e inline

<p class="lead">Para textos curtos dentro de cartões, avisos ou células: sem moldura, com a formatação no
balão ou numa barra que flutua enquanto o texto tem foco.</p>

<div data-example="balao-inline"></div>

## Como funciona

- `balloon`: sem barra fixa; selecione o texto para formatar.
- `inline`: sem moldura; a barra flutua acima do conteúdo durante a edição.
- `ui.setMode()` (core), o atributo `mode` (web component) e o input `mode` (Angular) trocam o modo
  sem recriar o editor.
- `toolbar: 'minimal'` deixa só negrito, itálico, sublinhado e tachado.
