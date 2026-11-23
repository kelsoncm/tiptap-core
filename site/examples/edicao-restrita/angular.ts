import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-termo',
  imports: [FormsModule, EditorComponent],
  template: `
    <label><input type="checkbox" (change)="leitura.set(!leitura())" /> Somente leitura</label>
    <app-editor
      toolbarPreset="basic"
      [readonly]="leitura()"
      [options]="opcoes"
      [(ngModel)]="html"
    ></app-editor>
  `,
})
export class TermoComponent {
  readonly leitura = signal(false);
  readonly opcoes: EditorUIOptions = { restrictedEdit: true };
  html =
    '<p>Eu, <span data-editable-region>NOME COMPLETO</span>, declaro estar ciente das normas.</p>';
}
