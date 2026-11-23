import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUI, EditorUIOptions } from '@kelsoncm/tiptap-core';
import { officePlugin } from '@kelsoncm/tiptap-core/office';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-relatorio',
  imports: [FormsModule, EditorComponent],
  template: `
    <app-editor [options]="opcoes" [(ngModel)]="html" (ready)="editor = $event"></app-editor>
    <button type="button" (click)="editor?.run('exportWord')">Baixar Word</button>
    <button type="button" (click)="markdown = editor?.getMarkdown() ?? ''">Ver Markdown</button>
    <pre>{{ markdown }}</pre>
  `,
})
export class RelatorioComponent {
  html = '<h2>Relatório anual</h2>';
  markdown = '';
  editor?: EditorUI;
  readonly opcoes: EditorUIOptions = { plugins: [officePlugin()] };
}
