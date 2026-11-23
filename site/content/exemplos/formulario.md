# Formulário com limites

<p class="lead">Um campo de formulário com barra enxuta, limite máximo de palavras e parágrafos
aplicado durante a digitação e mínimo conferido no envio.</p>

<div data-example="formulario"></div>

## Como funciona

- `limits` aceita `maxCharacters`, `maxWords`, `maxParagraphs` e os mínimos correspondentes.
- Ao atingir um máximo, digitação e colagem que aumentariam o contador são bloqueadas.
- Os mínimos só aparecem na barra de status. Confira-os no envio com
  `limitStatus(getDocumentStats(doc), ui.limits)`.
- No web component, o campo participa do `<form>` (com `required`) e envia o HTML do editor.
- No Angular, o `<app-editor>` é um `ControlValueAccessor`: funciona com `formControlName` e `ngModel`.

Veja também: [opções de limites]({{root}}docs/opcoes.html#limites-e-salvamento).
