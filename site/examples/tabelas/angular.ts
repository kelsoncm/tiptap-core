import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUI } from '@kelsoncm/tiptap-core';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-vagas',
  imports: [FormsModule, EditorComponent],
  template: `
    <kt-editor
      toolbarPreset="full"
      [enableTable]="true"
      [(ngModel)]="html"
      (ready)="pronto($event)"
    ></kt-editor>
  `,
})
export class VagasComponent {
  html = `<table data-width="100%" data-table-style="striped">
    <caption>Vagas por campus</caption>
    <tbody><tr><th>Campus</th><th>Vagas</th></tr><tr><td>Natal-Central</td><td>40</td></tr></tbody>
  </table>`;

  pronto(ui: EditorUI): void {
    ui.editor.commands.toggleFooterRow();
  }
}
