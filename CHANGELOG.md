# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

## [0.17.0] - 2026-11-23

### Adicionado

- Bundle UMD de arquivo único publicado em cada release: `kelsoncm-tiptap-core.umd.js` (global `KelsonTiptap`, AMD anônimo para o RequireJS) e `kelsoncm-tiptap-core.css`. Expõe toda a API, `officePlugin` (passe `mammoth` nas opções) e os primitivos do Tiptap (`Node`, `Mark`, `Extension`, `mergeAttributes`), para plugins não empacotarem outra cópia. Usado pelo `editor_tiptap` do Moodle.
- Scripts `build:umd` e `check:umd` (teste de fumaça do bundle, também no CI).

## [0.16.0] - 2026-11-23

### Adicionado

- Site de exemplos e documentação em `site/` (Vite multipágina, tema `@abrasileirado/dsgovbr-bootstrapped`), publicado no GitHub Pages pelo workflow `pages.yml`: galeria "Veja o que dá para construir", 12 exemplos ao vivo com abas de código (Core, Web component, Angular e HTML gerado), playground e 10 páginas de documentação. Seletor de idioma dos editores e modo claro/escuro.
- Scripts `site:dev`, `site:build`, `site:preview` e `site:fetch-wc`; `demo` passa a abrir o site (a pasta `demo/` foi removida). O CI também compila o site.

### Corrigido

- Campo de mesclagem salvo sem rótulo (`<span data-merge-field="x"></span>`) aparecia como `{{}}`; agora mostra a chave.
- Ícone de texto curto (até 2 caracteres, ex.: `⚠`) em comandos de plugins era trocado pelo id do comando; agora é exibido como está.

## [0.15.2] - 2026-11-21

### Corrigido

- `katex` volta para `^0.18.11`: a 0.19 (PR !38) fica fora da faixa aceita por `@tiptap/extension-mathematics` (`^0.16.4 || ^0.17.0 || ^0.18.0`). O Dependabot passa a ignorar `katex` >=0.19.

## [0.15.1] - 2026-11-21

### Alterado

- Script `prepare` trocado por `prepack` (limpa e compila em `npm pack`/`npm publish`); `prepublishOnly` removido. O npm 12 não avisa mais sobre script bloqueado ao instalar o tarball, que já traz o `dist`.

## [0.15.0] - 2026-11-21

### Alterado

- Release: a GitHub Release com o tarball é criada antes da publicação no npm, que só ocorre com `NPM_TOKEN` (o npm 12 recusa dependências git; o tarball da release é instalável por URL).

### Adicionado

- Verificador de acessibilidade (`checkAccessibility`): imagem sem texto alternativo, salto de nível e título vazio, tabela sem cabeçalho, link vazio ou pouco descritivo ("clique aqui") e contraste de cor abaixo de 4,5:1 (WCAG AA, inclusive sobre realce).
- Ortografia e gramática: verificação nativa do navegador (`spellcheck`, idioma do editor) e integração opcional com servidor LanguageTool (`checkers.spellcheck.languageTool`), com destaque, sugestões aplicáveis e verificação automática opcional (`autoCheckDelay`).
- Painel de verificações no `createEditorUI` (acessibilidade e ortografia, clique leva ao trecho, botões de sugestão).
- Área editável com `role="textbox"`, `aria-multiline`, `aria-label` traduzido e `lang` do idioma atual (atualizados ao trocar o idioma).
- `contrastRatio`, `luminance`, `textWithPositions`, `matchesToIssues`.

### Revisado

- Textos de interface: todos via i18n (pt-BR, en, es, 298 chaves); só mensagens de erro para desenvolvedores ficam em português.

## [0.14.0] - 2026-11-21

### Adicionado

- Revisão (`revision`), implementação própria sem TipTap Pro:
  - Comentários em threads (marca `comment`): comentar a seleção, responder, resolver/reabrir, excluir; threads carregadas de fora (`comments.threads`) e persistidas por `comments.onChange`.
  - Controle de alterações (modo sugestão): digitação vira `<ins>`, exclusão marca `<del>` sem apagar; as próprias sugestões ainda não aceitas somem de verdade; aceitar/rejeitar na seleção ou todas. Cobre edições de texto dentro de um bloco; mudanças estruturais (dividir parágrafo, listas) são aplicadas diretamente.
  - Histórico de versões: salvar com nome, restaurar, limite em memória e `versions.onSave` para persistir.
  - Papéis (`role`): `viewer`, `commenter`, `suggester` (sugestão obrigatória) e `editor` (aceita/rejeita), trocáveis com `revision.setRole()`.
- Painel de revisão no `createEditorUI` (comentários com resposta, alterações com aceitar/rejeitar, versões com restaurar).

## [0.13.0] - 2026-11-21

### Adicionado

- Colar do Word, LibreOffice e Google Docs com limpeza (`cleanPastedHtml`): remove classes, estilos `mso-`, comentários condicionais e invólucros do Google Docs; converte listas falsas do Word em listas aninhadas e negrito/itálico por estilo em tags. Modo "enhanced" (`io.keepPastedFormatting`) preserva cores, tamanhos e fontes.
- Colar como texto simples: comando `pastePlainText` (modo persistente); Ctrl+Shift+V continua colando sem formatação.
- Colar Markdown: texto que parece Markdown vira conteúdo formatado (`io.pasteMarkdown`).
- Markdown com `@tiptap/markdown`: `getMarkdown()`, `importMarkdown`, `exportMarkdown`.
- Exportar: Word (`.doc` em HTML compatível com Word, com página A4), PDF (pela impressão do navegador), HTML com estilos embutidos (`inlineStyles`, para e-mail), Markdown; nome do arquivo em `io.filename`.
- Entrada `@kelsoncm/tiptap-core/office` com `officePlugin()`: importar `.docx` com mammoth (dependência opcional).

### Dependências

- `@tiptap/markdown` (Markdown); `mammoth` como peer opcional, só para a entrada `/office`.

## [0.12.0] - 2026-11-21

### Adicionado

- Localizar e substituir (`SearchReplace`): diferenciar maiúsculas, palavra inteira, expressão regular, navegação, substituir um/todos, destaque dos resultados; barra no `createEditorUI` (Mod-F/Mod-H, Enter/Shift+Enter, Esc).
- Caracteres invisíveis (espaços, espaço não separável, ¶, quebra de linha).
- Idioma do trecho (`<span lang>`) com códigos validados.
- Ditado por voz (Web Speech API), desabilitado quando o navegador não oferece.
- Impressão/visualização de impressão por iframe, com estilos de impressão e lista de notas de rodapé.
- HTML de página inteira: `fullPage` aceita documento completo e `getFullPageHTML()` devolve o documento com o `<head>` original (sem scripts); `splitFullPage`/`buildFullPage`.
- No `createEditorUI`: código-fonte HTML editável, mostrar blocos, estrutura do documento (painel), minimapa, tela cheia (Esc sai) e alça para arrastar blocos (`dragHandle`).

## [0.11.0] - 2026-11-21

### Adicionado

- Limites (`limits`): máximo de caracteres, palavras e parágrafos aplicado de fato (transações que ultrapassam são bloqueadas; reduzir um documento acima do limite continua possível) e mínimos informados; `LIMITS_BYPASS` para carregar conteúdo por código.
- Barra de status no `createEditorUI` (`statusBar`, padrão ligado): contadores, limites (acima em vermelho, abaixo do mínimo em amarelo) e estado do salvamento.
- Salvamento automático (`autosave`): callback com debounce, rascunho em `localStorage` (`storageKey`, `restoreDraft`), estados `pending/saving/saved/error`, `flush()`.
- Autocorreção (`autocorrect`): tipografia ligada por padrão (travessão, reticências, aspas curvas, ©, ®, ™, setas, frações), substituições de palavras (`replacements`, mantendo maiúscula inicial) e maiúscula no início de frases (`capitalizeSentences`).
- Altura mínima e máxima do conteúdo (`minHeight`, `maxHeight`) com rolagem.
- Testes da auto-formatação markdown do StarterKit (`#`, `>`, `-`, `1.`, ```, `**`).

### Dependências

- `@tiptap/extension-typography`: substituições tipográficas.

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
