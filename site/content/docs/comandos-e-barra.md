# Comandos e barra

<p class="lead">Tudo o que a barra, o balão e o menu <code>/</code> fazem são comandos com um id. O mesmo id
funciona em <code>ui.run(id)</code>.</p>

## Executar comandos

```ts
ui.run('bold');
ui.run('heading-2');
ui.run('fontSize', '18px');
ui.run('orderedListType', 'upper-roman');
ui.run('tableCaption', { text: 'Tabela 1', side: 'bottom' });
```

Para listar o que está disponível (por exemplo, para montar uma barra própria):

```ts
for (const command of ui.commands.list('marks')) {
  console.log(command.id, ui.i18n.t(command.labelKey, command.labelParams));
}
```

## Presets da barra

| Preset    | Conteúdo                                                                          |
| --------- | --------------------------------------------------------------------------------- |
| `minimal` | Negrito, itálico, sublinhado, tachado.                                            |
| `basic`   | Desfazer/refazer, tipo de bloco, marcas, listas, limpar formatação.               |
| `full`    | Tudo: fontes, cores, alinhamento, tabelas, mídia, inserções, revisão, exportação. |

## Barra própria

```ts
createEditorUI(host, {
  toolbar: [
    'undo',
    'redo',
    '|', // separador
    'bold',
    'italic',
    { type: 'select', command: 'fontSize', options: FONT_SIZES },
    {
      type: 'commands',
      labelKey: 'editor.toolbar.insert',
      commands: ['insertTable', 'image', 'emoji'],
    },
  ],
});
```

- Texto: id de comando.
- `'|'`: separador.
- `{ type: 'select', command, options }`: lista suspensa (as opções padrão estão em `FONT_FAMILIES`,
  `FONT_SIZES`, `LINE_HEIGHTS`, `TEXT_COLORS`, `HIGHLIGHT_COLORS`…).
- `{ type: 'commands', labelKey, commands }`: grupo em menu.

## Comandos mais usados

| Grupo        | Ids                                                                                                                                                                                              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Histórico    | `undo`, `redo`                                                                                                                                                                                   |
| Marcas       | `bold`, `italic`, `underline`, `strike`, `code`, `subscript`, `superscript`, `removeFormat`                                                                                                      |
| Blocos       | `paragraph`, `heading-1` … `heading-6`, `quote`, `codeBlock`, `horizontalRule`, `pageBreak`                                                                                                      |
| Listas       | `bulletList`, `orderedList`, `taskList`, `orderedListType`, `bulletListType`, `indent`, `outdent`                                                                                                |
| Estilo       | `fontFamily`, `fontSize`, `textColor`, `highlight`, `lineHeight`, `align-left` … `align-justify`, `customStyle`, `formatPainter`                                                                 |
| Tabelas      | `insertTable`, `addRowBefore/After`, `deleteRow`, `addColumnBefore/After`, `deleteColumn`, `mergeCells`, `splitCell`, `toggleHeaderRow`, `tableCaption`                                          |
| Inserção     | `link`, `unlink`, `anchor`, `image`, `imageUpload`, `imageGallery`, `fileUpload`, `media`, `emoji`, `characterMap`, `templates`, `footnote`, `tocBlock`, `details`, `button`, `chart`, `mermaid` |
| Visualização | `findReplace`, `sourceCode`, `showBlocks`, `invisibleCharacters`, `outline`, `minimap`, `fullscreen`, `print`                                                                                    |
| Ferramentas  | `selectAll`, `textLanguage`, `dictation`, `pastePlainText`                                                                                                                                       |
| Revisão      | `comment`, `trackChanges`, `acceptChange`, `rejectChange`, `acceptAllChanges`, `rejectAllChanges`, `saveVersion`, `revisionPanel`                                                                |
| Verificação  | `checkAccessibility`, `checkLinks`, `checkSpelling`, `checkerPanel`, `clearIssues`                                                                                                               |
| Arquivos     | `importMarkdown`, `exportMarkdown`, `exportHtml`, `exportWord`, `exportPdf`, `importWord` (plugin)                                                                                               |

## Atalhos

| Atalho                 | Ação                         |
| ---------------------- | ---------------------------- |
| Ctrl+B, Ctrl+I, Ctrl+U | Negrito, itálico, sublinhado |
| Ctrl+K                 | Link                         |
| Ctrl+F                 | Localizar e substituir       |
| Ctrl+Shift+V           | Colar como texto simples     |
| Ctrl+Enter             | Quebra de página             |
| Tab, Shift+Tab         | Recuar e avançar             |
| Ctrl+P                 | Imprimir                     |

No macOS, use Cmd no lugar de Ctrl.

## Comandos próprios

```ts
ui.commands.register({
  id: 'assinatura',
  labelKey: 'Inserir assinatura',
  group: 'insert',
  run: (editor) => editor.chain().focus().insertContent('<p>— Coordenação</p>').run(),
});
```

Para distribuir comandos com extensões e traduções, crie um [plugin]({{root}}docs/plugins.html).
