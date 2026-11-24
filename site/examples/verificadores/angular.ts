import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUI, EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-pagina',
  imports: [FormsModule, EditorComponent],
  template: `
    <kt-editor [options]="opcoes" [(ngModel)]="html" (ready)="editor = $event"></kt-editor>
    <button type="button" (click)="editor?.run('checkAccessibility')">
      Verificar acessibilidade
    </button>
    <button type="button" (click)="editor?.run('checkLinks')">Verificar links</button>
  `,
})
export class PaginaComponent {
  html = '';
  editor?: EditorUI;
  readonly opcoes: EditorUIOptions = {
    checkers: {
      spellcheck: { native: true },
      accessibility: { minContrast: 4.5 },
      onIssues: (source, issues) => console.log(source, issues),
    },
    links: {
      isReachable: async (href) => (await fetch(`/api/link?url=${encodeURIComponent(href)}`)).ok,
    },
  };
}
