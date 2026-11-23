import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { fillMergeFieldsHTML, type EditorUIOptions } from '@kelsoncm/tiptap-core';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-oficio',
  imports: [FormsModule, EditorComponent],
  template: `
    <app-editor [(ngModel)]="html" [mentionItems]="pessoas" [options]="opcoes"></app-editor>
    <button type="button" (click)="gerar()">Gerar documento</button>
    <div [innerHTML]="final"></div>
  `,
})
export class OficioComponent {
  html = '<p>Ofício nº <span data-merge-field="numero"></span></p>';
  final = '';
  readonly pessoas = [
    { id: 'ana', label: 'Ana Júlia', description: 'Coordenação' },
    { id: 'bruno', label: 'Bruno Costa', description: 'Secretaria' },
  ];
  readonly opcoes: EditorUIOptions = {
    mergeFields: [
      { key: 'numero', label: 'Número do ofício' },
      { key: 'destinatario', label: 'Destinatário' },
    ],
  };

  gerar(): void {
    this.final = fillMergeFieldsHTML(this.html, { numero: '27/2026', destinatario: 'DIGPE' });
  }
}
