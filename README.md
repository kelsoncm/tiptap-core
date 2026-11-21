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

## Uso

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
