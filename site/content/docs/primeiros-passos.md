# Primeiros passos

<p class="lead">Escolha a forma de uso, instale e monte o editor. Em poucos minutos você tem um campo
de texto rico que salva HTML.</p>

## Qual pacote usar?

- **Página HTML sem bundler** (Django, PHP, Moodle, HTML estático): use o
  [web component]({{root}}docs/web-component.html) pelo arquivo único.
- **Projeto com bundler** (Vite, webpack) e sem framework, ou com Vue, React, Svelte: use o
  [core](#core) ou o web component pelo npm.
- **Angular**: use o [componente Angular]({{root}}docs/angular.html).

## Web component em 1 minuto

1. Baixe `kelsoncm-tiptap.bundle.js` da
   [release do web component](https://github.com/tiptap-by-kelsoncm/tiptap-webcomponent/releases/latest) e
   hospede o arquivo junto da sua página.
2. Carregue o script e use a tag dentro do formulário:

```html
<script type="module" src="/static/kelsoncm-tiptap.bundle.js"></script>

<form method="post">
  <kelsoncm-tiptap name="descricao" required placeholder="Descreva…"></kelsoncm-tiptap>
  <button>Enviar</button>
</form>
```

O campo `descricao` chega ao servidor com o HTML do editor. Valide e sanitize esse HTML no servidor
antes de exibi-lo a outras pessoas (veja [Segurança]({{root}}docs/seguranca.html)).

## Core

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm
```

```ts
import { createEditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

const ui = createEditorUI(document.querySelector<HTMLElement>('#editor')!, {
  content: '<p>Olá!</p>',
});

ui.editor.on('update', () => {
  console.log(ui.editor.getHTML());
});
```

## Próximos passos

- Ajuste a barra, o modo e os recursos em [Opções]({{root}}docs/opcoes.html).
- Veja os [exemplos]({{root}}index.html#exemplos) com código para os três pacotes.
- Mude cores e bordas em [Estilos e temas]({{root}}docs/estilos.html).
