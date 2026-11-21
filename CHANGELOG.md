# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.10.0] - 2026-11-21

### Adicionado

- Feature `insertions` (ligada por padrão):
  - Emoji: seletor com busca (pt-BR/en) e sugestões com `:` + duas letras, sem base de emojis externa.
  - Mapa de caracteres: letras acentuadas, pontuação, matemática, setas, moedas e grego.
  - Botão (link com aparência de botão: primary, secondary, outline), com URL validada.
  - Acordeão (seção recolhível) com `@tiptap/extension-details`.
  - Notas de rodapé numeradas por CSS e `renderFootnotes` para gerar a lista.
  - Bloco de sumário que acompanha os títulos (com links quando a feature `tableOfContents` está ativa).
  - Diagramas Mermaid guardados como código; renderização opcional via `insertions.mermaid` (SVG sanitizado).
  - Gráficos de barra, linha e pizza em SVG próprio (sem biblioteca), salvos como dados + imagem.
  - Widgets customizados (`insertions.widgets`, `createWidget`).
  - Galeria de modelos (`insertions.templates`, lista ou função assíncrona).
- Plugins (`plugins: EditorPlugin[]`) com extensões, comandos e traduções.
- Entrada separada `@kelsoncm/tiptap-core/math` com `mathPlugin()`: fórmulas LaTeX na linha e em bloco (KaTeX), edição por clique.
- Campo `textarea` nos diálogos e `openSymbolDialog`.

### Dependências

- `@tiptap/extension-details` (acordeão), `@tiptap/extension-mathematics` e `katex` (somente pela entrada `/math`).

## [0.9.0] - 2026-11-21

### Adicionado

- Link: diálogo próprio para inserir e editar (URL, texto, nova aba), atalho Mod-K, comandos `link`, `unlink` e `openLink`; balão mostra as ações com o cursor dentro de um link.
- `normalizeHref`: `ifrn.edu.br` vira `https://ifrn.edu.br` e e-mails viram `mailto:`.
- Link configurado com `openOnClick: false`, autolink, link ao colar e validação `isSafeUrl` (HTML com `javascript:` perde o link).
- Âncoras (marcadores): nó `anchor` (`<a id data-type="anchor">`, lê `<a name>` legados), comando `anchor` com nome normalizado (`slugify`) e sugestão de `#âncoras` no diálogo de link.
- Verificador de links: `checkLinks` aponta endereços inseguros, âncoras inexistentes e, com `links.isReachable`, endereços inacessíveis; comando `checkLinks` destaca os links quebrados e entrega o resultado em `links.onCheck`.
- `openFormDialog` aceita sugestões (`datalist`).

## [0.8.0] - 2026-11-21

### Adicionado

- Imagens (feature `media`, ligada por padrão): inserção por URL ou arquivo (diálogo), envio (`imageUpload`), colar e soltar arquivos, galeria (`media.gallery`), redimensionamento com proporção preservada e arrastar para mover.
- Upload configurável (`media.upload`), limite de tamanho, validação da URL devolvida e `onError`; sem upload, imagens viram data URL (`allowBase64`).
- Anexos (`fileUpload`): arquivos não-imagem enviados viram link com o nome do arquivo.
- Vídeo e áudio (`<video>`/`<audio controls>`) e conteúdo web em `<iframe>` com sandbox e lista de hosts permitidos (`media.embedHosts`, `DEFAULT_EMBED_HOSTS`); links do YouTube/Vimeo convertidos para o player (YouTube sem cookies).
- Comando `media` decide entre vídeo, áudio e embed pela URL.
- Diálogos acessíveis em `<dialog>` (`openFormDialog`, `openPickerDialog`, `pickFiles`), reaproveitáveis.
- `isSafeUrl`, `hostAllowed`, `urlHost`: bloqueiam `javascript:`, `vbscript:`, `data:` não-imagem e hosts fora da lista.
- Estilo das alças de redimensionamento (o Tiptap as renderiza sem estilo).

### Corrigido

- Inserir mídia com um bloco selecionado (ou duas vezes seguidas) substituía o bloco; agora insere depois dele.

### Dependências

- `@tiptap/extension-image` e `@tiptap/extension-file-handler`: imagem redimensionável e eventos de colar/soltar arquivos.

## [0.7.0] - 2026-11-21

### Adicionado

- Propriedades de tabela (`setTableProperties`): largura, alinhamento, layout (colunas automáticas ou fixas), cor da borda e estilos predefinidos (grade, listrada, sem bordas, compacta), com valores validados e aplicados também na visão editável.
- Linha de rodapé (`toggleFooterRow`, atributo `data-footer`; `<tfoot>` é lido como rodapé).
- Comandos `duplicateTable`, `selectTable`, `insertParagraphNearTable` (antes/depois), `selectTableRow`, `selectTableColumn` e `setCellProperties` (fundo, alinhamento vertical, cor da borda da célula).
- Menu contextual de tabela no `createEditorUI` (`tableMenu`), ancorado na tabela, com linhas, colunas, mesclagem, cabeçalho/rodapé, propriedades de célula e de tabela, legenda e ações de bloco.
- Listas de opções `TABLE_WIDTH_OPTIONS`, `TABLE_ALIGN_OPTIONS`, `TABLE_LAYOUT_OPTIONS`, `TABLE_STYLE_OPTIONS`, `VERTICAL_ALIGN_OPTIONS`, `TABLE_COLORS`.
- Botão de legenda pede o texto (ou remove a legenda existente).

### Alterado

- Seletores da barra mostram o nome do comando quando não há valor (antes podiam exibir a primeira opção).

## [0.6.0] - 2026-11-21

### Adicionado

- Checklist interativo (`taskList`, ligado por padrão): TaskList/TaskItem oficiais com itens aninháveis, comando `taskList` (Mod-Shift-9), atalho markdown `[ ] `, botão no preset `full` e no menu `/`.
- Estilo do checklist (item marcado riscado).

## [0.5.0] - 2026-11-21

### Adicionado

- Realce de sintaxe em blocos de código (`codeHighlight`), com lowlight/highlight.js (`common` por padrão ou gramáticas próprias), comando `codeBlockLanguage` e seletor de linguagem no preset `full`. Desligado por padrão para não pesar no bundle.
- Estilos customizados (`customStyles`): estilos de bloco (`data-block-style` + classe) e de trecho (marca `inlineStyle`), comando `customStyle`; classes validadas contra injeção.
- Pincel de formatação (`formatPainter`, ligado por padrão): copia as marcas da seleção e aplica na próxima seleção feita com o mouse; modo contínuo (`copyFormat(true)`) e Esc para cancelar.
- Tema de cores para o realce e cursor de cópia no modo pincel.

### Dependências

- `@tiptap/extension-code-block-lowlight`, `lowlight` e `highlight.js`: exigidos pelo realce de sintaxe (motivo: o Tiptap não realça código sem eles).

## [0.4.0] - 2026-11-21

### Adicionado

- Menções (`mentions`): autocomplete com `@` (lista estática ou fonte assíncrona, busca sem acentos) e comando `mention` (insere um item ou abre o autocomplete).
- Merge fields (`mergeFields`): nó `mergeField` (`<span data-merge-field="chave">{{Rótulo}}</span>`), menu com `{{`, comando `mergeField` e utilitários `listMergeFields`, `fillMergeFields` (JSON, mantém marcas) e `fillMergeFieldsHTML` (escapa valores).
- Slash commands (`slashCommands`): menu com `/` a partir do registro de comandos, filtrado pelos rótulos traduzidos; ligado por padrão no `createEditorUI`.
- `createSuggestionMenu`: lista acessível (`role="listbox"`, `aria-activedescendant`) posicionada com floating-ui, usada pelos três menus.
- Botões `mention` e `mergeField` no preset `full` (aparecem só quando configurados).
- `CommandRegistry.register` genérico no tipo do payload.

## [0.3.0] - 2026-11-21

### Adicionado

- `createEditorUI(host, options)`: editor completo em DOM puro com modos `toolbar`, `balloon`, `inline`, `notion` e `readonly`, trocáveis em tempo de execução (`setMode`).
- `Toolbar`: barra gerada a partir do registro de comandos, com presets `minimal`, `basic` e `full`, seletores de valor (fonte, tamanho, cores, altura da linha, tipos de lista) e de tipo de bloco; `role="toolbar"`, `aria-label`, `aria-pressed` e navegação por setas/Home/End.
- Balão (BubbleMenu) sobre a seleção, com preset próprio.
- `RestrictedEdit`: edição restrita a regiões marcadas (`span[data-editable-region]`); fora delas, digitação, exclusão, formatação e mudanças estruturais são bloqueadas. Modo autor para marcar regiões.
- Placeholder por modo (dica de “/” no modo notion).
- `getValue` em `CommandDefinition` para mostrar o valor atual nos seletores.
- Estilos base em `@kelsoncm/tiptap-core/styles.css`, personalizáveis por variáveis `--kt-*`.
- Página de demonstração (`npm run demo`).

### Alterado

- `peerDependencies` passam a `^3.35.0` (as extensões oficiais exigem a mesma versão do `@tiptap/core`).
- Script `prepare` permite instalar o pacote direto do GitHub.

## [0.2.0] - 2026-11-21

### Adicionado

- `features` em `createEditor` (todas ativas por padrão, exceto `tableOfContents`) e `featureCommands`.
- Extensões migradas do tiptap-ng: `BlockLineHeight`, `Indent`, `TypedOrderedList` (6 tipos), `TypedBulletList` (disc, circle, square, ✔, ✅, ☐), `PageBreak`, `CaptionTable`, `StyledTableCell`, `StyledTableHeader`.
- Extensões oficiais integradas: subscript, superscript, font family, font size, color, highlight multicolor, text align, tabelas redimensionáveis e table of contents.
- Comandos: sub/sobrescrito, fonte, tamanho, cor, realce, altura da linha, alinhamentos, recuo, tipos de lista, quebra de página e operações de tabela (inserir, excluir, linhas, colunas, mesclar, dividir, cabeçalho, alinhamento vertical, fundo de célula, legenda).
- Listas de opções para os adaptadores: `FONT_FAMILIES`, `FONT_SIZES`, `LINE_HEIGHTS`, `TEXT_COLORS`, `HIGHLIGHT_COLORS`, `ORDERED_LIST_OPTIONS`, `BULLET_LIST_OPTIONS`.
- `getDocumentStats`: caracteres (com e sem espaços), palavras e parágrafos.
- Dicionários pt-BR/en/es completos, migrados do tiptap-ng (146 chaves).

### Corrigido (em relação ao tiptap-ng)

- Títulos 4–6 habilitados.
- Alinhamento vertical e cor de fundo de célula agora são persistidos.
- Legenda de tabela guardada como atributo da tabela; o nó `tableCaption` quebrava o modelo de conteúdo e os comandos de tabela.
- Recuo dentro de listas aninha o item em vez de aplicar margem; Tab dentro de tabela navega entre células.
- Subscrito e sobrescrito passam a ser mutuamente exclusivos.
- Cores de fundo de célula validadas contra injeção de CSS.

## [0.1.0] - 2026-11-21

### Adicionado

- Estrutura inicial do pacote `@kelsoncm/tiptap-core` (ESM, TypeScript strict, Vitest, ESLint, Prettier).
- `createI18n`: dicionários `pt-BR` (padrão), `en` e `es`, interpolação `{param}`, fallback e mensagens injetáveis.
- `CommandRegistry` e `defaultCommands`: comandos declarativos (desfazer/refazer, marcas, parágrafo, títulos 1–6, citação, bloco de código, listas, linha horizontal, remover formatação, selecionar tudo).
- `createEditor`: fábrica sobre `@tiptap/core` + StarterKit com H1–H6, modo somente leitura e registro de comandos.
- Workflows de CI (Node 22/24) e release (npm com provenance + GitHub Release por tag).
