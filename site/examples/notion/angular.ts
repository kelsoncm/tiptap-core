import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-notas',
  imports: [FormsModule, EditorComponent],
  template: `
    <kt-editor mode="notion" [showFooter]="false" [options]="opcoes" [(ngModel)]="html"></kt-editor>
  `,
})
export class NotasComponent {
  html = '<h2>Reunião de planejamento</h2><p></p>';
  readonly opcoes: EditorUIOptions = {
    dragHandle: true,
    slashCommands: ['paragraph', 'heading-2', 'bulletList', 'taskList', 'quote', 'insertTable'],
  };
}
