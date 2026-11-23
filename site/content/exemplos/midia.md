# Imagens e mídia

<p class="lead">Upload, galeria, colar e arrastar imagens com redimensionamento; vídeo, áudio e páginas
incorporadas só de hosts permitidos.</p>

<div data-example="midia"></div>

## Como funciona

- `media.upload(file)` envia o arquivo e devolve a URL pública. Sem ele, imagens viram data URL e
  outros arquivos são recusados.
- `media.gallery()` devolve `[{ src, alt, thumbnail? }]` para o seletor de imagens.
- O comando `media` insere vídeo (YouTube, Vimeo, arquivo), áudio ou `<iframe>` conforme a URL. Hosts
  fora de `embedHosts` são recusados, e o iframe usa `sandbox`.
- `maxFileSize` e `onError` tratam arquivos grandes ou recusados.

Neste exemplo o upload é simulado: a imagem fica só no seu navegador.
