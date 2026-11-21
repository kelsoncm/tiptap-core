# @kelsoncm/tiptap-core

Núcleo framework-agnóstico do editor **KelsonCM TipTap**. Reúne extensões, comandos, i18n e
utilitários sobre o [Tiptap](https://tiptap.dev) 3, reutilizados por:

- [kelsoncm/tiptap-ng](https://github.com/kelsoncm/tiptap-ng): componente Angular.
- [kelsoncm/tiptap-webcomponent](https://github.com/kelsoncm/tiptap-webcomponent): custom element sem framework.

O roadmap de recursos está na [issue #1](https://github.com/kelsoncm/tiptap-core/issues/1).

## Instalação

```bash
npm install @kelsoncm/tiptap-core @tiptap/core @tiptap/pm @tiptap/starter-kit
```

`@tiptap/core`, `@tiptap/pm` e `@tiptap/starter-kit` são `peerDependencies` (3.x), para que a aplicação
use uma única cópia do Tiptap.

## Uso

```ts
import { createEditor } from '@kelsoncm/tiptap-core';

const kelson = createEditor({
  element: document.querySelector('#editor'),
  content: '<p>Olá</p>',
  i18n: { locale: 'pt-BR' },
});

// Comandos declarativos: os adaptadores renderizam botões a partir deles.
for (const command of kelson.commands.list('marks')) {
  console.log(command.id, kelson.i18n.t(command.labelKey, command.labelParams));
}

kelson.run('bold');
kelson.setEditable(false); // somente leitura
kelson.destroy();
```

### i18n

```ts
import { createI18n } from '@kelsoncm/tiptap-core';

const i18n = createI18n({
  locale: navigator.language, // aceita pt_br, pt, en-US...
  messages: { 'pt-BR': { 'editor.toolbar.bold': 'Forte' } },
});
i18n.t('editor.toolbar.heading', { level: 2 }); // "Título 2"
```

Idiomas embutidos: `pt-BR` (padrão e fallback), `en`, `es`.

### Comandos próprios

```ts
kelson.commands.register({
  id: 'hello',
  labelKey: 'meu.hello',
  group: 'insert',
  run: (editor) => editor.chain().focus().insertContent('Olá!').run(),
});
```

## API

| Exportação              | Descrição                                                                                                                                                                              |
| ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `createEditor(options)` | Cria o editor (StarterKit com H1–H6) e devolve `{ editor, commands, i18n, run, setEditable, destroy }`.                                                                                |
| `CommandRegistry`       | Registro de `CommandDefinition` (`id`, `labelKey`, `icon`, `shortcut`, `group`, `isActive`, `isEnabled`, `run`).                                                                       |
| `defaultCommands()`     | Comandos do StarterKit: undo, redo, bold, italic, underline, strike, code, removeFormat, paragraph, heading-1…6, quote, codeBlock, bulletList, orderedList, horizontalRule, selectAll. |
| `createI18n(options)`   | Tradução com fallback, interpolação e troca de idioma (`onChange`).                                                                                                                    |

## Desenvolvimento

```bash
npm ci
npm run lint
npm run typecheck
npm test
npm run build
```

## Publicação

Incremente `version` no `package.json`, atualize o `CHANGELOG.md` e envie a tag:

```bash
git tag v0.1.0 && git push origin v0.1.0
```

O workflow `release.yml` publica no npm com provenance e cria a release no GitHub. Requer trusted
publishing configurado no npmjs.com para o pacote ou o secret `NPM_TOKEN`.

## Licença

[MIT](LICENSE)
