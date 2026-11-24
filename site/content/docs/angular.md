# Angular

<p class="lead">O <code>&lt;kt-editor&gt;</code> da biblioteca <code>@kelsoncm/tiptap-ng</code> é um componente standalone para Angular 22,
com Reactive Forms, <code>ngModel</code> e ngx-translate.</p>

Pacote: [npm](https://www.npmjs.com/package/@kelsoncm/tiptap-ng) · código: [tiptap-ng](https://github.com/tiptap-by-kelsoncm/tiptap-ng) · [releases](https://github.com/tiptap-by-kelsoncm/tiptap-ng/releases). Nos exemplos deste site, a aba
**Angular** mostra o código do `<kt-editor>`; o editor ao vivo é o do core, com o mesmo resultado.

## Requisitos

- Angular 22, TypeScript 6.0, Node 22+.
- Instale a biblioteca e as dependências:

```bash
npm install @kelsoncm/tiptap-ng @kelsoncm/tiptap-core @tiptap/core @tiptap/pm @ngx-translate/core
```

- O provider do ngx-translate é opcional; sem ele, o core traduz a interface sozinho.
- Em `angular.json`, inclua o CSS do core nos estilos globais:

```json
"styles": [
  "node_modules/@kelsoncm/tiptap-core/dist/styles/kelson-editor.css",
  "src/styles.scss"
]
```

## Uso

O seletor `<app-editor>`, das versões anteriores, continua aceito.

```ts
import { Component } from '@angular/core';
import { ReactiveFormsModule, FormControl } from '@angular/forms';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-edital',
  imports: [ReactiveFormsModule, EditorComponent],
  template: `
    <kt-editor
      [formControl]="corpo"
      toolbarPreset="full"
      mode="toolbar"
      [wordLimit]="200"
      [wordMinimum]="10"
      [options]="{ media: { upload: enviar } }"
      (jsonChange)="json = $event"
    ></kt-editor>
  `,
})
export class EditalComponent {
  readonly corpo = new FormControl('');
  json: unknown;
  enviar = async (file: File): Promise<string> => URL.createObjectURL(file);
}
```

## Inputs

| Input                                                                       | Padrão                        | Descrição                                                                |
| --------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------------------------------ |
| `toolbarPreset`                                                             | `full`                        | `minimal`, `basic` ou `full`.                                            |
| `mode`                                                                      | `toolbar`                     | `toolbar`, `balloon`, `inline`, `notion`, `readonly`.                    |
| `readonly`                                                                  | `false`                       | Somente leitura (também com `control.disable()`).                        |
| `placeholder`                                                               | `editor.placeholders.default` | Chave do ngx-translate ou texto.                                         |
| `minHeight`, `maxHeight`                                                    | `200px`, —                    | Altura do conteúdo.                                                      |
| `enableBold`, `enableItalic`, `enableStrike`, `enableCode`, `enableHeading` | `true`                        | Botões e recursos de formatação.                                         |
| `enableTable`, `enablePageBreak`, `enableTextColor`, `enableHighlight`…     | `true`                        | Recursos opcionais do core.                                              |
| `enableTableOfContents`                                                     | `false`                       | Ids nos títulos e links no sumário.                                      |
| `enableBalloonMenu`                                                         | `true`                        | Balão sobre a seleção.                                                   |
| `enableMention`, `mentionItems`                                             | `true`, lista padrão          | Menções com `@`.                                                         |
| `showFooter`                                                                | `true`                        | Barra de status.                                                         |
| `characterLimit/Minimum`, `wordLimit/Minimum`, `paragraphLimit/Minimum`     | —                             | Máximos aplicados e mínimos informados.                                  |
| `cleanListParagraphs`                                                       | `true`                        | Salva `<li>texto</li>`, sem `<p>`.                                       |
| `options`                                                                   | `{}`                          | Qualquer opção do `createEditorUI` ([Opções]({{root}}docs/opcoes.html)). |

Mudar `mode` ou `readonly` não recria o editor; os demais inputs recriam mantendo o conteúdo.

## Outputs

`htmlChange`, `jsonChange`, `focus`, `blur` e `ready` (a instância `EditorUI` do core, também em
`component.editor`).

## Idioma

O idioma do ngx-translate (`pt_br`, `en`, `es`) é repassado ao core (`pt-BR`, `en`, `es`) e acompanha
`translate.use()`.
