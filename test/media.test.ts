import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  classifyMediaUrl,
  createEditor,
  hostAllowed,
  isSafeUrl,
  MediaUploader,
  openFormDialog,
  openPickerDialog,
  createI18n,
  toEmbedUrl,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../src/index.js';

let instance: KelsonEditor | undefined;
afterEach(() => {
  instance?.destroy();
  instance = undefined;
  document.body.replaceChildren();
});

const make = (content = '<p></p>', options: KelsonEditorOptions = {}): KelsonEditor => {
  instance = createEditor({ element: document.createElement('div'), content, ...options });
  return instance;
};

const flush = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 10));
const pngFile = (name = 'foto.png', size = 4): File =>
  new File([new Uint8Array(size)], name, { type: 'image/png' });

describe('url helpers', () => {
  it.each([
    ['https://x.org/a.png', true],
    ['/relativo/a.png', true],
    ['mailto:a@b.c', true],
    ['javascript:alert(1)', false],
    ['  JaVa\nScRiPt:alert(1)', false],
    ['vbscript:x', false],
    ['data:text/html,<script>', false],
    ['', false],
  ])('isSafeUrl(%j) = %s', (url, expected) => {
    expect(isSafeUrl(url)).toBe(expected);
  });

  it('accepts data images only when asked', () => {
    const data = 'data:image/png;base64,iVBORw0KGgo=';
    expect(isSafeUrl(data)).toBe(false);
    expect(isSafeUrl(data, { allowDataImages: true })).toBe(true);
  });

  it('matches hosts and subdomains', () => {
    expect(hostAllowed('https://www.youtube.com/embed/x', ['youtube.com'])).toBe(true);
    expect(hostAllowed('https://evil-youtube.com/x', ['youtube.com'])).toBe(false);
    expect(hostAllowed('javascript:x', ['youtube.com'])).toBe(false);
  });

  it('converts YouTube and Vimeo links to player URLs', () => {
    expect(toEmbedUrl('https://www.youtube.com/watch?v=abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123',
    );
    expect(toEmbedUrl('https://youtu.be/abc123')).toBe(
      'https://www.youtube-nocookie.com/embed/abc123',
    );
    expect(toEmbedUrl('https://vimeo.com/42')).toBe('https://player.vimeo.com/video/42');
    expect(toEmbedUrl('not a url')).toBe('not a url');
  });

  it('classifies media URLs', () => {
    expect(classifyMediaUrl('https://x.org/v.mp4?t=1')).toBe('video');
    expect(classifyMediaUrl('/audio.mp3')).toBe('audio');
    expect(classifyMediaUrl('https://docs.google.com/x')).toBe('embed');
    expect(classifyMediaUrl('ftp://x')).toBeNull();
  });
});

describe('images', () => {
  it('inserts images through the command and rejects unsafe sources', () => {
    const k = make();
    expect(k.run('image', { src: 'https://x.org/a.png', alt: 'logo' })).toBe(true);
    expect(k.editor.getHTML()).toContain(
      '<img class="kt-image" src="https://x.org/a.png" alt="logo"',
    );
    expect(k.run('image', { src: 'javascript:alert(1)' })).toBe(false);
  });

  it('renders a resizable node view', () => {
    const k = make('<p><img src="https://x.org/a.png"></p>');
    expect(k.editor.view.dom.querySelector('[data-resize-handle]')).not.toBeNull();
  });

  it('uploads files and inserts images and file links', async () => {
    const upload = vi.fn(async (file: File) => `https://cdn.example.org/${file.name}`);
    const k = make('<p></p>', { media: { upload } });
    const uploader = new MediaUploader({ upload });
    await uploader.insertFiles(k.editor, [
      pngFile(),
      new File(['%PDF'], 'edital.pdf', { type: 'application/pdf' }),
    ]);
    expect(upload).toHaveBeenCalledTimes(2);
    const html = k.editor.getHTML();
    expect(html).toContain('src="https://cdn.example.org/foto.png" alt="foto"');
    expect(html).toContain('href="https://cdn.example.org/edital.pdf"');
    expect(html).toContain('>edital.pdf</a>');
    expect(k.commands.has('fileUpload')).toBe(true);
  });

  it('falls back to data URLs without upload and rejects other files', async () => {
    const onError = vi.fn();
    const k = make('<p></p>', { media: { onError } });
    const uploader = new MediaUploader({ onError });
    await uploader.insertFiles(k.editor, [
      pngFile(),
      new File(['x'], 'a.zip', { type: 'application/zip' }),
    ]);
    expect(k.editor.getHTML()).toContain('src="data:image/png;base64,');
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringMatching(/a\.zip/) }),
    );
    expect(k.commands.has('fileUpload')).toBe(false);
  });

  it('enforces the size limit and validates upload URLs', async () => {
    const onError = vi.fn();
    const uploader = new MediaUploader({
      maxFileSize: 2,
      onError,
      upload: async () => 'javascript:alert(1)',
    });
    expect(await uploader.urlFor(pngFile('grande.png', 10))).toBeNull();
    expect(await uploader.urlFor(pngFile('ok.png', 1))).toBeNull();
    expect(onError.mock.calls.map(([e]) => (e as Error).message)).toEqual([
      expect.stringMatching(/excede o limite/),
      expect.stringMatching(/URL inválida/),
    ]);
  });

  it('reports upload failures', async () => {
    const onError = vi.fn();
    const uploader = new MediaUploader({
      onError,
      upload: () => Promise.reject(new Error('rede')),
    });
    expect(await uploader.urlFor(pngFile())).toBeNull();
    expect(onError).toHaveBeenCalledWith(new Error('rede'));
  });

  it('inserts an image picked from the gallery', async () => {
    const k = make('<p></p>', {
      media: { gallery: () => [{ src: 'https://x.org/g1.png', alt: 'Logo IFRN' }] },
    });
    k.run('imageGallery');
    await flush();
    const item = document.querySelector<HTMLButtonElement>('.kt-picker-item');
    expect(item?.title).toBe('Logo IFRN');
    item!.click();
    await flush();
    expect(k.editor.getHTML()).toContain('src="https://x.org/g1.png" alt="Logo IFRN"');
    expect(document.querySelector('.kt-dialog')).toBeNull();
  });

  it('inserts an image from the URL dialog', async () => {
    const k = make();
    k.run('image');
    const dialog = document.querySelector('.kt-dialog')!;
    dialog.querySelector<HTMLInputElement>('input[name="src"]')!.value = 'https://x.org/d.png';
    dialog.querySelector<HTMLInputElement>('input[name="alt"]')!.value = 'desc';
    dialog.querySelector('form')!.dispatchEvent(new Event('submit', { cancelable: true }));
    await flush();
    expect(k.editor.getHTML()).toContain('src="https://x.org/d.png" alt="desc"');
  });
});

describe('video, audio and embeds', () => {
  it('inserts video and audio files', () => {
    const k = make();
    expect(k.run('media', 'https://x.org/aula.mp4')).toBe(true);
    expect(k.run('media', 'https://x.org/podcast.mp3')).toBe(true);
    const html = k.editor.getHTML();
    expect(html).toContain('<video src="https://x.org/aula.mp4" controls="true"');
    expect(html).toContain('<audio src="https://x.org/podcast.mp3" controls="true"');
  });

  it('embeds allowed hosts in a sandboxed iframe', () => {
    const k = make();
    expect(k.run('media', 'https://www.youtube.com/watch?v=abc')).toBe(true);
    const html = k.editor.getHTML();
    expect(html).toContain('src="https://www.youtube-nocookie.com/embed/abc"');
    expect(html).toContain('sandbox="allow-scripts allow-same-origin');
  });

  it('refuses hosts outside the allowlist, also when parsing HTML', () => {
    const k = make('<iframe src="https://evil.example/x"></iframe>');
    expect(k.editor.getHTML()).toContain('src="about:blank"');
    expect(k.run('media', 'https://evil.example/page')).toBe(false);
    expect(k.run('media', 'http://www.youtube.com/watch?v=1')).toBe(true); // converted to https player
  });

  it('accepts custom embed hosts', () => {
    const k = make('<p></p>', { media: { embedHosts: ['intranet.ifrn.edu.br'] } });
    expect(k.run('media', 'https://intranet.ifrn.edu.br/painel')).toBe(true);
    expect(k.run('media', 'https://docs.google.com/x')).toBe(false);
  });

  it('parses <video><source></video>', () => {
    const k = make('<video controls><source src="https://x.org/v.webm"></video>');
    expect(k.editor.state.doc.firstChild?.attrs['src']).toBe('https://x.org/v.webm');
  });

  it('can be disabled', () => {
    const k = make('<p></p>', { features: { media: false } });
    expect(k.commands.has('image')).toBe(false);
  });
});

describe('dialogs', () => {
  it('resolves null on cancel', async () => {
    const promise = openFormDialog({
      i18n: createI18n(),
      titleKey: 'editor.media.embed',
      fields: [{ name: 'url', labelKey: 'editor.media.url' }],
    });
    expect(document.querySelector('.kt-dialog-title')?.textContent).toBe(
      'Inserir vídeo, áudio ou conteúdo web',
    );
    document.querySelector<HTMLButtonElement>('.kt-dialog-cancel')!.click();
    expect(await promise).toBeNull();
  });

  it('shows an empty picker', async () => {
    const promise = openPickerDialog({
      i18n: createI18n(),
      titleKey: 'editor.media.gallery',
      items: [],
    });
    expect(document.querySelector('.kt-picker-empty')?.textContent).toBe('Nenhum resultado');
    document.querySelector<HTMLButtonElement>('.kt-dialog-cancel')!.click();
    expect(await promise).toBeNull();
  });
});

describe('insertion next to a selected block', () => {
  it('inserts after a selected image instead of replacing it', () => {
    const k = make('<img src="https://x.org/a.png"><p></p>');
    k.editor.commands.setNodeSelection(0);
    k.run('media', 'https://x.org/v.mp4');
    k.editor.commands.setNodeSelection(0);
    k.run('image', { src: 'https://x.org/b.png' });
    const types: string[] = [];
    k.editor.state.doc.forEach((n) => types.push(n.type.name));
    expect(types.filter((t) => t !== 'paragraph')).toEqual(['image', 'image', 'video']);
  });
});
