# Instalação

<p class="lead">Enquanto os pacotes não estão no registro do npm, eles são distribuídos como arquivos
das releases do GitHub.</p>

## Core

```bash
npm install https://github.com/kelsoncm/tiptap-core/releases/download/v{{version}}/kelsoncm-tiptap-core-{{version}}.tgz @tiptap/core @tiptap/pm
```

`@tiptap/core` e `@tiptap/pm` são `peerDependencies` (3.x), para que a aplicação use uma única cópia do
Tiptap. As extensões oficiais usadas (StarterKit, tabelas, listas…) vêm como dependências.

Entradas do pacote:

| Importação                         | Conteúdo                                                 |
| ---------------------------------- | -------------------------------------------------------- |
| `@kelsoncm/tiptap-core`            | `createEditorUI`, `createEditor`, extensões, utilitários |
| `@kelsoncm/tiptap-core/styles.css` | CSS do editor                                            |
| `@kelsoncm/tiptap-core/math`       | `mathPlugin()` (KaTeX)                                   |
| `@kelsoncm/tiptap-core/office`     | `officePlugin()` (importar .docx; precisa do `mammoth`)  |

## Web component

Sem bundler, use o arquivo único `kelsoncm-tiptap.bundle.js` da
[release](https://github.com/kelsoncm/tiptap-webcomponent/releases/latest). O GitHub não serve assets
com o tipo JavaScript: hospede o arquivo no seu servidor ou CDN.

Com bundler:

```bash
npm install https://github.com/kelsoncm/tiptap-webcomponent/releases/download/v0.1.2/kelsoncm-tiptap-webcomponent-0.1.2.tgz
```

```ts
import '@kelsoncm/tiptap-webcomponent'; // registra <kelsoncm-tiptap> e injeta o CSS
```

## npm 12 e dependências por URL

O npm 12 recusa dependências por URL que não estejam liberadas. Libere só as declaradas pelo seu
projeto no `.npmrc`:

```ini
allow-remote=root
```

O web component depende do core por URL. Por isso, instale-o como dependência direta do projeto
(raiz), não como dependência de outro pacote.

## Angular

O `tiptap-ng` é um repositório privado com o componente `<app-editor>` e um app de demonstração. Copie
`src/app/shared/editor` para o seu projeto e instale o core como acima (veja [Angular]({{root}}docs/angular.html)).

## Quando o pacote estiver no npm

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm
```
