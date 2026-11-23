import { Component, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { EditorComponent } from './shared/editor';

@Component({
  selector: 'app-projeto',
  imports: [ReactiveFormsModule, EditorComponent],
  template: `
    <form [formGroup]="form" (ngSubmit)="enviar()">
      <label for="justificativa">Justificativa do projeto</label>
      <app-editor
        id="justificativa"
        formControlName="justificativa"
        toolbarPreset="basic"
        placeholder="Descreva o projeto em 20 a 120 palavras…"
        [wordMinimum]="20"
        [wordLimit]="120"
        [paragraphLimit]="5"
        minHeight="140px"
        maxHeight="320px"
      ></app-editor>
      <button type="submit" [disabled]="form.invalid">Enviar</button>
    </form>
  `,
})
export class ProjetoComponent {
  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.group({ justificativa: ['', Validators.required] });

  enviar(): void {
    console.log(this.form.value.justificativa); // HTML do editor
  }
}
