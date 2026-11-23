import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUI, EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-parecer',
  imports: [FormsModule, EditorComponent],
  template: `
    <app-editor [options]="opcoes" [(ngModel)]="html" (ready)="editor = $event"></app-editor>
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
