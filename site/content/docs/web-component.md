# Web component

<p class="lead"><code>&lt;kelsoncm-tiptap&gt;</code> funciona em HTML puro, Django, PHP, Vue, React ou
Angular, e participa de formulários como um <code>&lt;textarea&gt;</code>.</p>

## Ao vivo

Este formulário usa o arquivo único da release do web component (não o código do core).

<div data-webcomponent-demo>
<form class="mb-2">
  <label class="form-label fw-semibold" for="wc-descricao">Descrição</label>
  <kelsoncm-tiptap id="wc-descricao" name="descricao" required toolbar="basic" max-words="80" placeholder="Descreva em até 80 palavras…"><p>Conteúdo <strong>inicial</strong>.</p></kelsoncm-tiptap>
  <button class="btn btn-primary btn-sm mt-2">Enviar (simulado)</button>
</form>
<p class="small text-body-secondary mb-1">Dados que o formulário enviaria:</p>
<div class="site-code site-output"><pre><code data-form-output>{}</code></pre></div>
</div>

## Uso

```html
<form method="post">
  <kelsoncm-tiptap name="descricao" required toolbar="full" max-words="500" placeholder="Descreva…">
    <p>Conteúdo inicial</p>
  </kelsoncm-tiptap>
  <button>Enviar</button>
</form>
```

O valor enviado é o HTML do editor (vazio quando o documento está vazio).

## Atributos

| Atributo                                        | Descrição                                                      |
| ----------------------------------------------- | -------------------------------------------------------------- |
| `name`, `required`, `disabled`                  | Comportamento de campo de formulário.                          |
| `value`                                         | HTML inicial (alternativa ao conteúdo dentro da tag).          |
| `mode`                                          | `toolbar` (padrão), `balloon`, `inline`, `notion`, `readonly`. |
| `toolbar`                                       | `minimal`, `basic`, `full` (padrão).                           |
| `readonly`                                      | Somente leitura.                                               |
| `locale`                                        | `pt-BR` (padrão), `en`, `es`.                                  |
| `placeholder`                                   | Texto do documento vazio.                                      |
| `min-height`, `max-height`                      | Altura do conteúdo (CSS).                                      |
| `max-characters`, `max-words`, `max-paragraphs` | Limites aplicados durante a digitação.                         |
| `min-characters`, `min-words`, `min-paragraphs` | Mínimos exibidos na barra de status.                           |
| `status-bar="false"`                            | Esconde a barra de status.                                     |

## Propriedades e métodos

```js
const el = document.querySelector('kelsoncm-tiptap');
el.value = '<p>Novo conteúdo</p>';
el.options = {
  mentions: { items: [{ id: 'ana', label: 'Ana' }] },
  media: { upload: async (file) => (await enviar(file)).url },
};
el.editor; // EditorUI do core (comandos, i18n, editor Tiptap)
el.editor.run('bold');
el.checkValidity();
```

`options` aceita qualquer opção de `createEditorUI` (veja [Opções]({{root}}docs/opcoes.html)). Alterar
`options` recria o editor mantendo o conteúdo.

## Eventos

| Evento          | Quando                                                        |
| --------------- | ------------------------------------------------------------- |
| `kt-ready`      | Editor criado (`event.detail.editor`).                        |
| `kt-change`     | A cada alteração (`event.detail.html`, `event.detail.empty`). |
| `input`         | A cada alteração.                                             |
| `change`        | Ao sair do editor após alterações.                            |
| `focus`, `blur` | Foco do editor.                                               |

## Estilos

O CSS do core é injetado uma vez no `<head>` (`#kelsoncm-tiptap-styles`). O editor fica no DOM da página
(sem shadow DOM), então seus estilos e as variáveis `--kt-*` se aplicam
(veja [Estilos e temas]({{root}}docs/estilos.html)).
