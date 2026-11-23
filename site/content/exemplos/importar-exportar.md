# Importar e exportar

<p class="lead">Importe arquivos .docx e Markdown, limpe o que vem colado do Word e do Google Docs e
exporte para Word, PDF, HTML com estilos e Markdown.</p>

<div data-example="importar-exportar"></div>

## Como funciona

- `officePlugin()` (entrada `@kelsoncm/tiptap-core/office`) adiciona o comando `importWord`. Precisa
  do pacote `mammoth`.
- Colagens do Word e do Google Docs são limpas; `io.keepPastedFormatting: true` mantém cores e fontes.
- Markdown colado vira formatação; `pastePlainText` (Ctrl+Shift+V) cola texto simples.
- Exportação: `exportWord` (.doc em HTML compatível com o Word), `exportPdf` (impressão do navegador),
  `exportHtml` (estilos embutidos, bom para e-mail) e `exportMarkdown`. `ui.getMarkdown()` devolve o texto.

O .docx nativo e o PDF gerado sem a janela de impressão não fazem parte do core.
