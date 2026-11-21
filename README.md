# @kelsoncm/tiptap-core

Núcleo framework-agnóstico do editor **KelsonCM TipTap**. Reúne extensões, comandos, i18n e
utilitários sobre o [Tiptap](https://tiptap.dev) 3, reutilizados por:

- [kelsoncm/tiptap-ng](https://github.com/kelsoncm/tiptap-ng): componente Angular.
- [kelsoncm/tiptap-webcomponent](https://github.com/kelsoncm/tiptap-webcomponent): custom element sem framework.

O roadmap de recursos está na [issue #1](https://github.com/kelsoncm/tiptap-core/issues/1).

## Instalação

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm
```

`@tiptap/core` e `@tiptap/pm` são `peerDependencies` (3.x), para que a aplicação use uma única cópia
do Tiptap. As extensões oficiais usadas (StarterKit, tabelas, listas, text-style...) vêm como dependências.

## Editor pronto (DOM)

```ts
import { createEditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

const ui = createEditorUI(document.querySelector('#editor')!, {
  mode: 'toolbar', // toolbar | balloon | inline | notion | readonly
  toolbar: 'full', // minimal | basic | full | lista de itens
  content: '<p>Olá</p>',
});

ui.setMode('notion');
ui.editor.on('update', () => console.log(ui.editor.getHTML()));
```

| Modo       | Comportamento                                                                    |
| ---------- | -------------------------------------------------------------------------------- |
| `toolbar`  | Barra fixa acima do conteúdo e balão sobre a seleção (`balloon: false` desliga). |
| `balloon`  | Sem barra fixa; formatação no balão.                                             |
| `inline`   | Sem moldura; a barra flutua acima do conteúdo enquanto ele tem foco.             |
| `notion`   | Sem barra; balão e dica “/” em blocos vazios.                                    |
| `readonly` | Sem barra e sem edição.                                                          |

Itens da barra: id de comando, `'|'` (separador), `{ type: 'select', command, options }` ou
`{ type: 'commands', labelKey, commands }`. Ícones padrão são texto; passe `renderIcon` para usar
Font Awesome, SVG etc.

### Menções, merge fields e slash commands

```ts
createEditorUI(host, {
  mentions: {
    items: async (query) => (await fetch(`/api/pessoas?q=${encodeURIComponent(query)}`)).json(),
  },
  mergeFields: [
    { key: 'nomeEdital', label: 'Nome do edital' },
    { key: 'numeroEdital', label: 'Número do edital', description: 'Ex.: 12/2026' },
  ],
  slashCommands: true, // padrão no createEditorUI; ou lista de ids de comando
});
```

- `@` abre as menções; `{{` abre os campos; `/` (no início do texto ou após espaço) abre os comandos.
- Preencher campos: `fillMergeFields(editor.getJSON(), { nomeEdital: 'Edital 1/2026' })` ou
  `fillMergeFieldsHTML(html, valores)`; `listMergeFields(json)` devolve as chaves usadas.

### Código, estilos e pincel

```ts
createEditorUI(host, {
  codeHighlight: true, // ou { languages: { python, sql } } com gramáticas do highlight.js
  customStyles: [
    { id: 'lead', label: 'Destaque', kind: 'block', className: 'lead' },
    { id: 'marker', label: 'Marca-texto', kind: 'inline', className: 'marker' },
  ],
});
```

- `codeBlockLanguage` (payload: nome da linguagem) e `customStyle` (payload: id do estilo; `null` limpa).
- `formatPainter`: clique no botão, depois selecione o texto de destino com o mouse. Esc cancela.

### Edição restrita

```ts
const ui = createEditorUI(host, {
  content: '<p>Contrato entre <span data-editable-region>NOME</span> e a empresa.</p>',
  restrictedEdit: true, // só o texto das regiões pode mudar
});
ui.setRestricted(false); // modo autor
ui.editor.chain().focus().setEditableRegion().run(); // marca a seleção como região
```

O texto pode ser digitado dentro da região ou logo após o seu fim; o início da região não aceita
inserção. Transações com a meta `RESTRICTED_EDIT_BYPASS` ignoram o filtro (conteúdo gerado por código).

## Uso (headless)

```ts
import { createEditor } from '@kelsoncm/tiptap-core';

const kelson = createEditor({
  element: document.querySelector('#editor'),
  content: '<p>Olá</p>',
  i18n: { locale: 'pt-BR' },
});

// Comandos declarativos: os adaptadores renderizam botões a partir deles.
for (const command of kelson.commands.list('marks')) {
  console.log(command.id, kelson.i18n.t(command.labelKey, command.labelParams));
}

kelson.run('bold');
kelson.setEditable(false); // somente leitura
kelson.destroy();
```

### i18n

```ts
import { createI18n } from '@kelsoncm/tiptap-core';

const i18n = createI18n({
  locale: navigator.language, // aceita pt_br, pt, en-US...
  messages: { 'pt-BR': { 'editor.toolbar.bold': 'Forte' } },
});
i18n.t('editor.toolbar.heading', { level: 2 }); // "Título 2"
```

Idiomas embutidos: `pt-BR` (padrão e fallback), `en`, `es`.

### Recursos opcionais

Todos ativos por padrão, exceto `tableOfContents`:

```ts
createEditor({
  features: { table: false, tableOfContents: true },
});
```

| Recurso                     | Comandos (`id`)                                                                                                                                                                                               | Payload                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| `subscript` / `superscript` | `subscript`, `superscript`                                                                                                                                                                                    | —                                    |
| `fontFamily` / `fontSize`   | `fontFamily`, `fontSize`                                                                                                                                                                                      | `string` ou `null` para remover      |
| `textColor` / `highlight`   | `textColor`, `highlight`                                                                                                                                                                                      | cor ou `null`                        |
| `lineHeight`                | `lineHeight`                                                                                                                                                                                                  | ex.: `'1.5'` ou `null`               |
| `textAlign`                 | `align-left`, `align-center`, `align-right`, `align-justify`                                                                                                                                                  | —                                    |
| `indent`                    | `indent`, `outdent` (Tab / Shift-Tab)                                                                                                                                                                         | —                                    |
| `listTypes`                 | `orderedListType`, `bulletListType`                                                                                                                                                                           | `OrderedListType` / `BulletListType` |
| `taskList`                  | `taskList` (Mod-Shift-9)                                                                                                                                                                                      | —                                    |
| `pageBreak`                 | `pageBreak` (Mod-Enter)                                                                                                                                                                                       | —                                    |
| `table`                     | `insertTable`, `deleteTable`, `addRowBefore/After`, `deleteRow`, `addColumnBefore/After`, `deleteColumn`, `mergeCells`, `splitCell`, `toggleHeaderRow`, `cellVerticalAlign`, `cellBackground`, `tableCaption` | ver tipos exportados                 |
| `tableOfContents`           | — (dados em `editor.storage.tableOfContents`)                                                                                                                                                                 | —                                    |

```ts
kelson.run('fontSize', '18px');
kelson.run('orderedListType', 'upper-roman');
kelson.run('tableCaption', { text: 'Tabela 1', side: 'bottom' });
```

As opções exibidas nos menus ficam em `FONT_FAMILIES`, `FONT_SIZES`, `LINE_HEIGHTS`, `TEXT_COLORS`,
`HIGHLIGHT_COLORS`, `ORDERED_LIST_OPTIONS` e `BULLET_LIST_OPTIONS` (com `labelKey` para i18n).

### Comandos próprios

```ts
kelson.commands.register({
  id: 'hello',
  labelKey: 'meu.hello',
  group: 'insert',
  run: (editor) => editor.chain().focus().insertContent('Olá!').run(),
});
```

## API

| Exportação              | Descrição                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEditor(options)` | Cria o editor (StarterKit com H1–H6) e devolve `{ editor, commands, i18n, run, setEditable, destroy }`.                                                                                |
| `CommandRegistry`       | Registro de `CommandDefinition` (`id`, `labelKey`, `icon`, `shortcut`, `group`, `isActive`, `isEnabled`, `run`).                                                                       |
| `defaultCommands()`     | Comandos do StarterKit: undo, redo, bold, italic, underline, strike, code, removeFormat, paragraph, heading-1…6, quote, codeBlock, bulletList, orderedList, horizontalRule, selectAll. |
| `getDocumentStats(doc)` | Caracteres (sem e com espaços), palavras e parágrafos não vazios.                                                                                                                      |
| `createI18n(options)`   | Tradução com fallback, interpolação e troca de idioma (`onChange`).                                                                                                                    |

## Desenvolvimento

```bash
npm ci
npm run demo   # http://localhost:5180
npm run lint
npm run typecheck
npm test
npm run build
```

## Publicação

Incremente `version` no `package.json`, atualize o `CHANGELOG.md` e envie a tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `release.yml` publica no npm com provenance e cria a release no GitHub. Requer trusted
publishing configurado no npmjs.com para o pacote ou o secret `NPM_TOKEN`.

## Licença

[MIT](LICENSE)
