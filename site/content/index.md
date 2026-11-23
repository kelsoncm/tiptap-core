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

| Pacote                          | Para quem                           | Como usar                              |
| ------------------------------- | ----------------------------------- | -------------------------------------- |
| `@kelsoncm/tiptap-core`         | Qualquer projeto com bundler        | `createEditorUI(elemento, opções)`     |
| `@kelsoncm/tiptap-webcomponent` | HTML puro, Django, PHP, Vue, React… | `<kelsoncm-tiptap name="campo">`       |
| `tiptap-ng` (privado)           | Aplicações Angular 22               | `<app-editor formControlName="campo">` |

Comece pelos [primeiros passos]({{root}}docs/primeiros-passos.html) ou abra o
[playground]({{root}}playground.html) com todos os recursos ligados.
