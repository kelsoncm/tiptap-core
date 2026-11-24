import { HttpClient } from '@angular/common/http';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import type { EditorUIOptions } from '@kelsoncm/tiptap-core';
import { firstValueFrom } from 'rxjs';

import { EditorComponent } from '@kelsoncm/tiptap-ng';

@Component({
  selector: 'app-noticia',
  imports: [FormsModule, EditorComponent],
  template: `<kt-editor toolbarPreset="full" [options]="opcoes" [(ngModel)]="html"></kt-editor>`,
})
export class NoticiaComponent {
  private readonly http = inject(HttpClient);
  html = '';

  readonly opcoes: EditorUIOptions = {
    media: {
      upload: async (file) => {
        const body = new FormData();
        body.append('file', file);
        const resposta = await firstValueFrom(this.http.post<{ url: string }>('/api/upload', body));
        return resposta.url;
      },
      gallery: () => firstValueFrom(this.http.get<{ src: string; alt: string }[]>('/api/imagens')),
      embedHosts: ['youtube.com', 'player.vimeo.com'],
    },
  };
}
