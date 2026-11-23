# Opções

<p class="lead"><code>createEditorUI(host, opções)</code> monta o editor completo (barra, balão, menus,
barra de status). <code>createEditor(opções)</code> cria só o editor, para quem desenha a própria interface.</p>

```ts
import { createEditorUI } from '@kelsoncm/tiptap-core';

const ui = createEditorUI(host, {
  mode: 'toolbar',
  toolbar: 'full',
  content: '<p>Olá</p>',
});
```

Todas as opções abaixo também valem na propriedade `options` do web component e no input `options` do
componente Angular.

## Interface

| Opção                    | Padrão          | Descrição                                                                                              |
| ------------------------ | --------------- | ------------------------------------------------------------------------------------------------------ |
| `mode`                   | `toolbar`       | `toolbar`, `balloon`, `inline`, `notion` ou `readonly` (`ui.setMode()`).                               |
| `toolbar`                | `full`          | `minimal`, `basic`, `full` ou lista de itens ([Comandos e barra]({{root}}docs/comandos-e-barra.html)). |
| `balloon`                | preset do balão | Itens do balão; `false` desliga no modo `toolbar`.                                                     |
| `tableMenu`              | preset          | Menu contextual de tabelas; `false` desliga.                                                           |
| `dragHandle`             | `true`          | Alça para arrastar blocos.                                                                             |
| `statusBar`              | `true`          | Contadores, limites e estado do salvamento.                                                            |
| `minHeight`, `maxHeight` | —               | Altura do conteúdo (CSS); cresce entre os dois.                                                        |
| `placeholder`            | padrão do i18n  | Texto (ou chave de tradução) do documento vazio.                                                       |
| `restrictedEdit`         | `false`         | Só regiões editáveis mudam ([exemplo]({{root}}exemplos/edicao-restrita.html)).                         |
| `renderIcon`             | ícones de texto | Função `(icon, commandId) => HTMLElement` (Font Awesome, SVG…).                                        |

## Conteúdo e idioma

| Opção             | Descrição                                                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `content`         | HTML ou JSON inicial.                                                                                                     |
| `editable`        | `false` para somente leitura (`ui.setEditable()`).                                                                        |
| `i18n`            | `{ locale, messages }` ou uma instância de `createI18n` ([i18n]({{root}}docs/i18n.html)).                                 |
| `contentLanguage` | Idioma do texto (BCP 47): `lang` da área editável, ditado, LanguageTool e página completa. Padrão: o idioma da interface. |
| `fullPage`        | Aceita um documento HTML completo e mantém o `<head>` em `getFullPageHTML()`.                                             |
| `features`        | Liga e desliga recursos (todos ativos, menos `tableOfContents`).                                                          |
| `starterKit`      | Configuração do StarterKit do Tiptap (mesclada ao padrão).                                                                |
| `extensions`      | Extensões Tiptap extras.                                                                                                  |
| `editorOptions`   | Outras opções do Tiptap (`onUpdate`, `editorProps`…).                                                                     |

```ts
createEditorUI(host, {
  features: { table: false, pageBreak: false, tableOfContents: true },
});
```

## Inserção e menus

| Opção           | Descrição                                                                                         |
| --------------- | ------------------------------------------------------------------------------------------------- |
| `slashCommands` | Menu `/`: `true` (lista padrão) ou ids de comandos.                                               |
| `mentions`      | `{ items, char?, limit? }`: lista ou função assíncrona ([exemplo]({{root}}exemplos/oficio.html)). |
| `mergeFields`   | `[{ key, label, description? }]`, inseridos com `{{`.                                             |
| `insertions`    | `templates`, `widgets` e `mermaid` (renderizador opcional).                                       |
| `customStyles`  | `[{ id, label, kind: 'block' \| 'inline', className }]`.                                          |
| `codeHighlight` | Destaque de sintaxe nos blocos de código (`true` ou `{ languages }`).                             |
| `plugins`       | Pacotes opcionais como `mathPlugin()` e `officePlugin()` ([Plugins]({{root}}docs/plugins.html)).  |

## Mídia e links

| Opção   | Descrição                                                                                                            |
| ------- | -------------------------------------------------------------------------------------------------------------------- |
| `media` | `upload`, `gallery`, `embedHosts`, `maxFileSize`, `allowBase64`, `onError` ([exemplo]({{root}}exemplos/midia.html)). |
| `links` | `newTabByDefault`, `isReachable(href)`, `onCheck(results)`.                                                          |

## Limites e salvamento

| Opção          | Descrição                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| `limits`       | `maxCharacters`, `maxWords`, `maxParagraphs` (aplicados) e `min*` (informados).      |
| `autosave`     | `{ save, delay, storageKey }`: salva com atraso e guarda rascunho no `localStorage`. |
| `restoreDraft` | Começa pelo rascunho local, quando houver (precisa de `autosave.storageKey`).        |
| `autocorrect`  | Tipografia, substituições e maiúsculas; `false` desliga.                             |

```ts
const ui = createEditorUI(host, {
  limits: { maxWords: 500, minWords: 100 },
  autosave: {
    save: ({ html }) => fetch('/api/rascunho', { method: 'PUT', body: html }),
    delay: 2000,
    storageKey: 'rascunho-edital-12',
  },
  restoreDraft: true,
  autocorrect: { replacements: { vc: 'você' }, capitalizeSentences: true },
});
await ui.autosave?.flush(); // salva agora (ex.: antes de enviar)
```

## Revisão, verificação e importação

| Opção      | Descrição                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `revision` | `user`, `role`, `trackChanges`, `comments`, `versions` ([exemplo]({{root}}exemplos/revisao.html)). |
| `checkers` | `spellcheck`, `accessibility`, `onIssues` ([exemplo]({{root}}exemplos/verificadores.html)).        |
| `io`       | `keepPastedFormatting` e ajustes de colagem e exportação.                                          |

## O que createEditorUI devolve

| Membro                                 | Descrição                                               |
| -------------------------------------- | ------------------------------------------------------- |
| `editor`                               | Instância do editor Tiptap (`getHTML()`, `getJSON()`…). |
| `run(id, payload?)`                    | Executa um comando registrado.                          |
| `commands`                             | Registro de comandos (`list`, `get`, `register`).       |
| `i18n`                                 | Traduções (`t`, `setLocale`).                           |
| `setMode(modo)`, `setRestricted(bool)` | Trocam o modo e a restrição sem recriar o editor.       |
| `setEditable(bool)`                    | Liga e desliga a edição.                                |
| `getMarkdown()`, `getFullPageHTML()`   | Saídas alternativas.                                    |
| `autosave`, `revision`, `limits`       | Controladores dos recursos configurados.                |
| `destroy()`                            | Remove o editor e os ouvintes.                          |
