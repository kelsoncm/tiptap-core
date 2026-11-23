import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

/** Simula o envio ao servidor: aqui a imagem fica só no navegador (URL temporária). */
async function enviarArquivo(file: File): Promise<string> {
  await new Promise((resolve) => setTimeout(resolve, 300));
  return URL.createObjectURL(file);
  // Na sua aplicação:
  // const body = new FormData();
  // body.append('file', file);
  // return (await (await fetch('/api/upload', { method: 'POST', body })).json()).url;
}

const svg = (cor: string, texto: string): string =>
  `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180"><rect width="100%" height="100%" fill="${cor}"/><text x="50%" y="50%" fill="#fff" font-family="sans-serif" font-size="28" text-anchor="middle" dominant-baseline="middle">${texto}</text></svg>`,
  )}`;

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    toolbar: 'full',
    media: {
      upload: enviarArquivo, // botão de upload, colar e arrastar imagens
      gallery: () => [
        { src: svg('#1351b4', 'Campus'), alt: 'Imagem azul com o texto Campus' },
        { src: svg('#168821', 'Biblioteca'), alt: 'Imagem verde com o texto Biblioteca' },
        { src: svg('#e52207', 'Laboratório'), alt: 'Imagem vermelha com o texto Laboratório' },
      ],
      // Vídeo, áudio e iframe só destes hosts (o resto é recusado).
      embedHosts: ['youtube.com', 'www.youtube-nocookie.com', 'player.vimeo.com'],
      maxFileSize: 2 * 1024 * 1024,
      onError: (error) => alert(error.message),
    },
    content: `<p>Use os botões de imagem, galeria e mídia da barra, cole uma imagem ou arraste um arquivo.
As imagens têm alças para redimensionar.</p>
<img src="${svg('#071d41', 'Imagem inicial')}" alt="Imagem de exemplo" width="320">
<p></p>`,
  });
}
