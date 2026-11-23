# Modelo de ofício

<p class="lead">Campos de mesclagem para documentos padronizados, menções a pessoas e modelos prontos.
Clique em <strong>Gerar documento</strong> para ver os campos preenchidos.</p>

<div data-example="oficio"></div>

## Como funciona

- Digite <code>{{</code> para inserir um campo de `mergeFields`. Ele é salvo como
  `<span data-merge-field="chave">`.
- `fillMergeFieldsHTML(html, valores)` troca os campos pelos valores, com escape de HTML.
  `fillMergeFields(json, valores)` faz o mesmo no JSON, e `listMergeFields(json)` lista as chaves usadas.
- Digite `@` para mencionar. `mentions.items` aceita uma lista ou uma função assíncrona (busca na API).
- `insertions.templates` adiciona o botão **Modelos**, que troca o conteúdo pelo modelo escolhido.
