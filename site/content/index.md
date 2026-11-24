# Veja o que dá para construir

<p class="lead">O <strong>KelsonCM TipTap</strong> é um editor de texto rico sobre o
<a href="https://tiptap.dev">Tiptap 3</a>. O mesmo núcleo atende páginas HTML puras (web component),
aplicações Angular e qualquer framework. Todos os exemplos abaixo rodam nesta página, com o tema GOV.BR.</p>

<div class="site-hero" data-example="inicio"></div>

## Exemplos

Cada exemplo mostra o editor funcionando e o código para **web component**, **core** (TypeScript) e
**Angular**. O código exibido é o mesmo que roda na página.

<!-- gallery -->

## Três pacotes, um núcleo

| Pacote                          | Para quem                           | Como usar                               | Código e releases                                                                                                                                      |
| ------------------------------- | ----------------------------------- | --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@kelsoncm/tiptap-core`         | Qualquer projeto com bundler        | `createEditorUI(elemento, opções)`      | [código](https://github.com/tiptap-by-kelsoncm/tiptap-core) · [releases](https://github.com/tiptap-by-kelsoncm/tiptap-core/releases)                   |
| `@kelsoncm/tiptap-webcomponent` | HTML puro, Django, PHP, Vue, React… | `<kelsoncm-tiptap name="campo">`        | [código](https://github.com/tiptap-by-kelsoncm/tiptap-webcomponent) · [releases](https://github.com/tiptap-by-kelsoncm/tiptap-webcomponent/releases)   |
| `@kelsoncm/tiptap-ng`           | Aplicações Angular 22               | `<kt-editor formControlName="campo">`   | [código](https://github.com/tiptap-by-kelsoncm/tiptap-ng) · [releases](https://github.com/tiptap-by-kelsoncm/tiptap-ng/releases)                       |
| `editor_tiptap`                 | Moodle 4.5 e 5.3                    | Plugin de editor com plugins `tiptap_*` | [código](https://github.com/moodle-by-kelsoncm/moodle-editor_tiptap) · [releases](https://github.com/moodle-by-kelsoncm/moodle-editor_tiptap/releases) |

Comece pelos [primeiros passos]({{root}}docs/primeiros-passos.html) ou abra o
[playground]({{root}}playground.html) com todos os recursos ligados.
