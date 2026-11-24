# @kelsoncm/tiptap-core

Núcleo framework-agnóstico do editor **KelsonCM TipTap**. Reúne extensões, comandos, i18n e
utilitários sobre o [Tiptap](https://tiptap.dev) 3, reutilizados por:

- [kelsoncm/tiptap-ng](https://github.com/tiptap-by-kelsoncm/tiptap-ng): componente Angular `<kt-editor>` (`@kelsoncm/tiptap-ng` no npm).
- [kelsoncm/tiptap-webcomponent](https://github.com/tiptap-by-kelsoncm/tiptap-webcomponent): custom element sem framework.

**Exemplos ao vivo e documentação: <https://tiptap-by-kelsoncm.github.io/tiptap-core/>** (código para core, web
component e Angular em cada exemplo).

## Instalação

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm
```

Sem bundler (por exemplo, no RequireJS do Moodle), use o arquivo único da release,
`kelsoncm-tiptap-core.umd.js`, e o `kelsoncm-tiptap-core.css`. Ele define `window.KelsonTiptap` (ou um
módulo AMD anônimo) com toda a API, `officePlugin` e os primitivos do Tiptap (`Node`, `Mark`,
`Extension`, `mergeAttributes`):

```js
require(['/caminho/kelsoncm-tiptap-core.umd.js'], (KelsonTiptap) => {
  KelsonTiptap.createEditorUI(document.querySelector('#editor'), { toolbar: 'basic' });
});
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

### Tabelas

Com o cursor numa tabela, o `createEditorUI` mostra um menu contextual (`tableMenu: false` desliga).
Pela API:

```ts
editor.commands.setTableProperties({
  width: '100%',
  align: 'center',
  layout: 'fixed',
  tableStyle: 'striped',
});
editor.commands.setCellProperties({ backgroundColor: '#FFE4B5', verticalAlign: 'middle' });
editor.commands.toggleFooterRow();
editor.commands.duplicateTable();
editor.commands.insertParagraphNearTable('after');
```

A legenda e as propriedades ficam em atributos da tabela (`data-width`, `data-table-style`...);
a linha de rodapé usa `data-footer="true"` porque o ProseMirror não modela `<tfoot>`.

### Imagens, mídia e arquivos

```ts
createEditorUI(host, {
  media: {
    upload: async (file) => {
      const body = new FormData();
      body.append('file', file);
      const response = await fetch('/api/upload', { method: 'POST', body });
      return (await response.json()).url; // URL pública
    },
    gallery: async () => (await fetch('/api/imagens')).json(), // [{ src, alt, thumbnail? }]
    embedHosts: ['youtube.com', 'player.vimeo.com', 'intranet.ifrn.edu.br'],
    maxFileSize: 5 * 1024 * 1024,
    onError: (error) => alert(error.message),
  },
});
```

- Colar ou soltar imagens envia pelo `upload` (sem ele, viram data URL). Outros arquivos só são aceitos com `upload` e entram como link.
- `media` (payload: URL) insere vídeo, áudio ou `<iframe>` conforme a URL; hosts fora de `embedHosts` são recusados.
- Imagens têm alças de redimensionamento e podem ser arrastadas.

### Links e âncoras

- Mod-K ou o botão de link abrem o diálogo (editar quando o cursor está num link). `ifrn.edu.br` vira `https://ifrn.edu.br`.
- `anchor` insere um marcador; links `#nome` apontam para ele.
- Verificação de links:

```ts
createEditorUI(host, {
  links: {
    isReachable: async (href) =>
      (await fetch(`/api/verificar-link?url=${encodeURIComponent(href)}`)).ok,
    onCheck: (results) => console.table(results.filter((r) => !r.ok)),
  },
});
ui.run('checkLinks'); // destaca links quebrados no texto
```

### Inserções

Emoji (`:` + palavra), mapa de caracteres, botão, acordeão, notas de rodapé, sumário, Mermaid, gráficos,
widgets e modelos ficam no grupo "insert" da barra e no menu `/`.

```ts
import mermaid from 'mermaid';

createEditorUI(host, {
  insertions: {
    mermaid: async (code) => (await mermaid.render(`m${Date.now()}`, code)).svg,
    templates: [{ id: 'oficio', label: 'Ofício', content: '<h2>Ofício nº</h2><p>Prezados,</p>' }],
    widgets: [
      {
        name: 'alerta',
        label: 'Alerta',
        defaults: { texto: 'Atenção' },
        render: (a) => `⚠ ${a.texto}`,
      },
    ],
  },
});
```

- Notas de rodapé: `renderFootnotes(editor.state.doc)` devolve a lista `<ol>` para impressão/exportação.
- Gráficos: o diálogo aceita linhas `Rótulo: valor`; o HTML salvo traz os dados (`data-chart`) e um SVG.

### Fórmulas (KaTeX)

```ts
import { mathPlugin } from '@kelsoncm/tiptap-core/math';
import 'katex/dist/katex.min.css';

createEditorUI(host, { plugins: [mathPlugin()] });
```

### Limites, salvamento e autocorreção

```ts
createEditorUI(host, {
  limits: { maxWords: 500, minWords: 100, maxParagraphs: 20 },
  autosave: {
    save: ({ html }) => fetch('/api/rascunho', { method: 'PUT', body: html }),
    delay: 2000,
    storageKey: 'rascunho-edital-12',
  },
  restoreDraft: true,
  autocorrect: { replacements: { vc: 'você', tb: 'também' }, capitalizeSentences: true },
  minHeight: '200px',
  maxHeight: '60vh',
});
```

- Ao atingir o máximo, digitação e colagem que aumentariam o contador são bloqueadas.
- `ui.autosave.flush()` salva imediatamente (por exemplo, antes de enviar o formulário).
- `autocorrect: false` desliga também a tipografia.

### Visualização e ferramentas

| Comando                             | Efeito                                                              |
| ----------------------------------- | ------------------------------------------------------------------- |
| `findReplace` (Mod-F)               | Barra de localizar/substituir (maiúsculas, palavra inteira, regex). |
| `sourceCode`                        | Edita o HTML; ao voltar, o conteúdo é aplicado.                     |
| `showBlocks`, `invisibleCharacters` | Contornos dos blocos; espaços e ¶ visíveis.                         |
| `outline`, `minimap`                | Painéis laterais de estrutura e miniatura.                          |
| `fullscreen`                        | Tela cheia (Esc sai).                                               |
| `print` (Mod-P)                     | Impressão com visualização do navegador.                            |
| `textLanguage`                      | Marca um trecho com `lang` (ex.: `en`).                             |
| `dictation`                         | Ditado por voz (Web Speech API).                                    |

Documento completo: `createEditorUI(host, { content: htmlCompleto, fullPage: true })` e `ui.getFullPageHTML()`.

### Colar, importar e exportar

- Colar do Word/Google Docs limpa o HTML; `io: { keepPastedFormatting: true }` mantém cores e fontes.
- Texto Markdown colado vira formatação; `pastePlainText` força texto simples.
- `ui.getMarkdown()`; comandos `exportWord`, `exportPdf`, `exportHtml` (estilos embutidos), `exportMarkdown`, `importMarkdown`.

Importar do Word (.docx):

```ts
import { officePlugin } from '@kelsoncm/tiptap-core/office'; // npm install mammoth
createEditorUI(host, { plugins: [officePlugin()] });
```

### Revisão: comentários, sugestões, versões e papéis

```ts
const ui = createEditorUI(host, {
  revision: {
    user: { id: '2080882', name: 'Kelson' },
    role: 'suggester', // viewer | commenter | suggester | editor
    comments: { threads: await api.threads(), onChange: (threads) => api.saveThreads(threads) },
    versions: { initial: await api.versions(), onSave: (v) => api.saveVersion(v) },
  },
});
ui.revision.setRole('editor');
ui.run('acceptAllChanges');
```

- Comandos: `comment`, `trackChanges`, `acceptChange`, `rejectChange`, `acceptAllChanges`, `rejectAllChanges`, `saveVersion`, `revisionPanel`.
- O HTML salvo mantém `<ins>`/`<del>` (com autor e data) e `span[data-comment]`; as threads ficam no seu backend.

### Verificadores

```ts
createEditorUI(host, {
  checkers: {
    spellcheck: {
      native: true, // corretor do navegador
      languageTool: { endpoint: 'https://api.languagetool.org/v2/check' }, // ou seu servidor
      autoCheckDelay: 3000,
    },
    accessibility: { minContrast: 4.5 },
    onIssues: (source, issues) => console.log(source, issues),
  },
});
ui.run('checkAccessibility');
ui.run('checkerPanel');
```

O texto do documento é enviado ao servidor LanguageTool configurado; use um servidor próprio para
conteúdo sigiloso.

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
npm run build      # dist/ (também roda em npm pack)
npm run site:dev   # site de exemplos e docs em http://localhost:5180 (também: npm run demo)
npm run lint
npm run typecheck
npm test
```

### Site

O site fica em `site/`: menu em `nav.json`, layout em `layout.html`, páginas em Markdown em
`content/` e exemplos em `examples/<id>/` (`core.ts` roda na página e aparece na aba Core; `wc.html` e
`angular.ts` são só exibidos). Os exemplos importam `@kelsoncm/tiptap-core`, apontado para `src/`.

```bash
npm run site:fetch-wc  # copia o arquivo único do web component para site/public/vendor/
npm run site:build     # site/dist/ (publicado pelo workflow pages.yml a cada push na main)
```

## Publicação

Incremente `version` no `package.json`, atualize o `CHANGELOG.md` e envie a tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `release.yml` cria a release no GitHub (tarball, bundle UMD e CSS) e publica no npm com
provenance, por _Trusted Publishing_ (OIDC). O secret `NPM_TOKEN` é só reserva.

## Licença

[MIT](LICENSE)
