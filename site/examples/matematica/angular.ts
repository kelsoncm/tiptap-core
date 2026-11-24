import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';
import { mathPlugin } from '@kelsoncm/tiptap-core/math';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

// Em angular.json, inclua "node_modules/katex/dist/katex.min.css" em "styles".
@Component({
  selector: 'app-questao',
  imports: [FormsModule, EditorComponent],
  template: `<kt-editor [options]="opcoes" [(ngModel)]="html"></kt-editor>`,
})
export class QuestaoComponent {
  html =
    '<p>A área do círculo é <span data-type="inline-math" data-latex="A = \\pi r^2"></span>.</p>';
  readonly opcoes: EditorUIOptions = { plugins: [mathPlugin()] };
}
