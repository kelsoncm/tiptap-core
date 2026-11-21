# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/); versionamento [SemVer](https://semver.org/lang/pt-BR/).

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
