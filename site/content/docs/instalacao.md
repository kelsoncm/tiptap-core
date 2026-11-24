# Instalação

<p class="lead">Os pacotes estão no registro do npm. O arquivo único do web component e o bundle UMD do core
também vêm nas releases do GitHub, para páginas sem bundler.</p>

## Core

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm
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

Sem bundler (por exemplo, no RequireJS do Moodle), use `kelsoncm-tiptap-core.umd.js` e
`kelsoncm-tiptap-core.css` da [release](https://github.com/tiptap-by-kelsoncm/tiptap-core/releases/latest).

## Web component

Com bundler:

```bash
npm install @kelsoncm/tiptap-webcomponent
```

```ts
import '@kelsoncm/tiptap-webcomponent'; // registra <kelsoncm-tiptap> e injeta o CSS
```

Sem bundler, use o arquivo único `kelsoncm-tiptap.bundle.js`, que está no pacote (`dist/`) e na
[release](https://github.com/tiptap-by-kelsoncm/tiptap-webcomponent/releases/latest). Hospede o arquivo
no seu servidor ou use um CDN de pacotes npm.

## Angular

O [`tiptap-ng`](https://github.com/tiptap-by-kelsoncm/tiptap-ng) tem o componente `<app-editor>` e um app
de demonstração. Copie `src/app/shared/editor` para o seu projeto e instale o core como acima (veja
[Angular]({{root}}docs/angular.html)).

## Versões anteriores ao npm

As versões até a 0.18.1 do core e 0.1.2 do web component só existem como tarball nas releases do GitHub.
Para instalá-las, o npm 12 exige `allow-remote=root` no `.npmrc` do projeto.
