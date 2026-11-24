import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUI, EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-parecer',
  imports: [FormsModule, EditorComponent],
  template: `
    <kt-editor [options]="opcoes" [(ngModel)]="html" (ready)="editor = $event"></kt-editor>
    <button type="button" (click)="editor?.run('acceptAllChanges')">Aceitar todas</button>
  `,
})
export class ParecerComponent {
  html = '';
  editor?: EditorUI;
  readonly opcoes: EditorUIOptions = {
    revision: {
      user: { id: '2080882', name: 'Kelson' },
      role: 'suggester',
      trackChanges: true,
      comments: { threads: [], onChange: (threads) => console.log(threads) },
      versions: { onSave: (versao) => console.log(versao) },
    },
  };
}
