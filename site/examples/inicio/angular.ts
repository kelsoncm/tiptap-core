import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-edital',
  imports: [FormsModule, EditorComponent],
  template: `
    <kt-editor toolbarPreset="full" mode="toolbar" maxHeight="420px" [(ngModel)]="html"></kt-editor>
  `,
})
export class EditalComponent {
  html = '<h2>Edital nº 12/2026</h2><p>Experimente a barra, o menu / e os atalhos.</p>';
}
