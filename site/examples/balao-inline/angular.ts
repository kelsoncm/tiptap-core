import { Component, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-aviso',
  imports: [FormsModule, EditorComponent],
  template: `
    <button type="button" (click)="modo.set(modo() === 'balloon' ? 'inline' : 'balloon')">
      Alternar modo
    </button>
    <!-- Mudar "mode" não recria o editor. -->
    <app-editor
      [mode]="modo()"
      toolbarPreset="minimal"
      [showFooter]="false"
      minHeight="0"
      [(ngModel)]="html"
    ></app-editor>
  `,
})
export class AvisoComponent {
  readonly modo = signal<'balloon' | 'inline'>('balloon');
  html = '<h3>Aviso</h3><p>As inscrições vão até <strong>30 de novembro</strong>.</p>';
}
