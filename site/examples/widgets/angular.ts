import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';

import { alertaPlugin } from './alerta-plugin'; // o mesmo da aba Core
import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-avisos',
  imports: [FormsModule, EditorComponent],
  template: `<kt-editor [options]="opcoes" [(ngModel)]="html"></kt-editor>`,
})
export class AvisosComponent {
  html = '';
  readonly opcoes: EditorUIOptions = {
    plugins: [alertaPlugin()],
    toolbar: ['bold', 'italic', '|', 'alerta-info', 'alerta-atencao'],
    slashCommands: ['paragraph', 'alerta-info', 'alerta-atencao'],
  };
}
