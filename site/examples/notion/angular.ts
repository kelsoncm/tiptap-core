import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-notas',
  imports: [FormsModule, EditorComponent],
  template: `
    <app-editor
      mode="notion"
      [showFooter]="false"
      [options]="opcoes"
      [(ngModel)]="html"
    ></app-editor>
  `,
})
export class NotasComponent {
  html = '<h2>Reunião de planejamento</h2><p></p>';
  readonly opcoes: EditorUIOptions = {
    dragHandle: true,
    slashCommands: ['paragraph', 'heading-2', 'bulletList', 'taskList', 'quote', 'insertTable'],
  };
}
