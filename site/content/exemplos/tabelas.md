# Tabelas

<p class="lead">Tabelas com legenda, linha de rodapé, estilos, largura, alinhamento e cores de célula.
Clique numa célula para abrir o menu contextual.</p>

<div data-example="tabelas"></div>

## Como funciona

- O menu contextual aparece com o cursor numa tabela (`tableMenu: false` desliga).
- Pela API: `setTableProperties({ width, align, layout, tableStyle })`,
  `setCellProperties({ backgroundColor, verticalAlign })`, `toggleFooterRow()`, `duplicateTable()` e
  `insertParagraphNearTable('before' | 'after')`.
- As propriedades ficam em atributos (`data-width`, `data-table-style`…). A linha de rodapé usa
  `data-footer="true"`, porque o ProseMirror não modela `<tfoot>`; um `<tfoot>` colado vira rodapé.
- As colunas podem ser redimensionadas arrastando a borda.
