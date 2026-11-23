# Edição restrita

<p class="lead">Documentos em que só alguns trechos podem mudar, como termos e contratos. Ligue o
<strong>modo autor</strong> para editar tudo e marcar novas regiões.</p>

<div data-example="edicao-restrita"></div>

## Como funciona

- `restrictedEdit: true` só permite mudar o texto dentro de `span[data-editable-region]`.
- `ui.setRestricted(false)` libera a edição (modo autor). `setEditableRegion()` marca a seleção como região.
- Dá para digitar dentro da região ou logo após o fim dela; o início não aceita inserção.
- Somente leitura: `mode: 'readonly'`, o atributo `readonly` do web component ou o input `readonly`
  do Angular.
