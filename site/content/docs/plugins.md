# Plugins

<p class="lead">Um plugin empacota extensões do Tiptap, comandos e traduções num objeto só, que entra no
editor por <code>plugins: [...]</code>.</p>

## Plugins incluídos

| Plugin           | Importação                     | Dependência         |
| ---------------- | ------------------------------ | ------------------- |
| `mathPlugin()`   | `@kelsoncm/tiptap-core/math`   | KaTeX (já incluso)  |
| `officePlugin()` | `@kelsoncm/tiptap-core/office` | `mammoth` (instale) |

Eles ficam em entradas separadas para não pesar em quem não usa.

## Anatomia

```ts
import type { EditorPlugin } from '@kelsoncm/tiptap-core';

export function meuPlugin(): EditorPlugin {
  return {
    name: 'meu-plugin',
    // Traduções por idioma (mescladas às do core).
    messages: {
      'pt-BR': { 'meu.ola': 'Inserir saudação' },
      en: { 'meu.ola': 'Insert greeting' },
    },
    // Extensões do Tiptap (nós, marcas, plugins do ProseMirror).
    extensions: (i18n) => [],
    // Comandos: aparecem na barra, no menu "/" e em ui.run(id).
    register: (registry, i18n) => {
      registry.register({
        id: 'ola',
        labelKey: 'meu.ola',
        icon: '👋',
        group: 'insert',
        isEnabled: (editor) => editor.isEditable,
        run: (editor) => editor.chain().focus().insertContent('Olá!').run(),
      });
    },
  };
}
```

```ts
createEditorUI(host, {
  plugins: [meuPlugin()],
  toolbar: ['bold', 'italic', '|', 'ola'],
  slashCommands: ['paragraph', 'ola'],
});
```

## Campos de um comando

| Campo       | Descrição                                                |
| ----------- | -------------------------------------------------------- |
| `id`        | Identificador único, usado na barra, no menu e em `run`. |
| `labelKey`  | Chave de tradução ou texto.                              |
| `icon`      | Nome de ícone (para `renderIcon`) ou texto curto.        |
| `group`     | Grupo na barra completa e no menu `/` (ex.: `insert`).   |
| `shortcut`  | Atalho exibido no título do botão.                       |
| `isActive`  | `(editor) => boolean`: botão pressionado.                |
| `isEnabled` | `(editor) => boolean`: botão habilitado.                 |
| `getValue`  | Valor atual, para listas suspensas.                      |
| `run`       | `(editor, payload) => boolean`: executa a ação.          |

## Widgets

`createWidget()` cria nós atômicos salvos no HTML, ideais para blocos com aparência própria (alertas,
cartões, botões de ação). Veja o [exemplo de widgets]({{root}}exemplos/widgets.html).
