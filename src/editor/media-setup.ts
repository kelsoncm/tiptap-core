import type { AnyExtension, Editor } from '@tiptap/core';
import { FileHandler } from '@tiptap/extension-file-handler';
import { Image } from '@tiptap/extension-image';

import type { CommandRegistry } from '../commands/registry.js';
import {
  Audio,
  classifyMediaUrl,
  DEFAULT_EMBED_HOSTS,
  Embed,
  moveCursorAfterNode,
  toEmbedUrl,
  Video,
} from '../extensions/media.js';
import type { I18n } from '../i18n/i18n.js';
import { openFormDialog, openPickerDialog, pickFiles, type PickerItem } from '../ui/dialog.js';
import { isSafeUrl } from '../utils/url.js';

export interface GalleryItem {
  src: string;
  alt?: string;
  /** Thumbnail shown in the picker (defaults to `src`). */
  thumbnail?: string;
}

export interface MediaOptions {
  /** Uploads a file and resolves with its public URL. Without it, images become data URLs. */
  upload?: (file: File) => Promise<string>;
  /** Images offered by the gallery picker. */
  gallery?: () => Promise<readonly GalleryItem[]> | readonly GalleryItem[];
  /** Accept pasted/dropped images as data URLs when there is no `upload`. Default: true. */
  allowBase64?: boolean;
  /** Hosts allowed in web-content embeds. Default: `DEFAULT_EMBED_HOSTS`. */
  embedHosts?: readonly string[];
  /** Maximum file size in bytes. Default: 10 MB. */
  maxFileSize?: number;
  /** Called on upload/validation errors. Default: `console.error`. */
  onError?: (error: Error) => void;
}

export const IMAGE_MIME_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/avif',
];

const readAsDataUrl = (file: File): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error('Falha ao ler o arquivo.'));
    reader.readAsDataURL(file);
  });

/** Upload helper shared by paste, drop and the toolbar. */
export class MediaUploader {
  constructor(private readonly options: MediaOptions) {}

  private fail(error: unknown): null {
    const err = error instanceof Error ? error : new Error(String(error));
    (this.options.onError ?? ((e: Error) => console.error('[tiptap-core]', e.message)))(err);
    return null;
  }

  /** Resolves the URL to insert for a file, or `null` (error already reported). */
  async urlFor(file: File): Promise<string | null> {
    const max = this.options.maxFileSize ?? 10 * 1024 * 1024;
    if (file.size > max) {
      return this.fail(
        new Error(`Arquivo "${file.name}" excede o limite de ${Math.round(max / 1024 / 1024)} MB.`),
      );
    }
    try {
      if (this.options.upload) {
        const url = await this.options.upload(file);
        if (!isSafeUrl(url, { protocols: ['http', 'https'] })) {
          return this.fail(new Error(`URL inválida devolvida pelo upload: ${url}`));
        }
        return url;
      }
      if (IMAGE_MIME_TYPES.includes(file.type) && (this.options.allowBase64 ?? true)) {
        return await readAsDataUrl(file);
      }
      return this.fail(new Error(`Sem função de upload configurada para "${file.name}".`));
    } catch (error) {
      return this.fail(error);
    }
  }

  /** Inserts files at `pos` (or the selection): images as images, others as links. */
  async insertFiles(editor: Editor, files: readonly File[], pos?: number): Promise<void> {
    for (const file of files) {
      const url = await this.urlFor(file);
      if (!url || editor.isDestroyed) continue;
      const content = IMAGE_MIME_TYPES.includes(file.type)
        ? { type: 'image', attrs: { src: url, alt: file.name.replace(/\.[^.]+$/, '') } }
        : {
            type: 'text',
            text: file.name,
            marks: [{ type: 'link', attrs: { href: url, target: '_blank' } }],
          };
      const chain = editor.chain().focus();
      (pos === undefined
        ? chain.command(moveCursorAfterNode).insertContent(content)
        : chain.insertContentAt(pos, content)
      )
        .command(moveCursorAfterNode)
        .run();
    }
  }
}

export function mediaExtensions(options: MediaOptions, uploader: MediaUploader): AnyExtension[] {
  return [
    Image.configure({
      allowBase64: options.allowBase64 ?? true,
      HTMLAttributes: { class: 'kt-image' },
      resize: { enabled: true, minWidth: 40, minHeight: 40, alwaysPreserveAspectRatio: true },
    }),
    FileHandler.configure({
      // Images always; other files only when they can be uploaded.
      ...(options.upload ? {} : { allowedMimeTypes: IMAGE_MIME_TYPES }),
      onPaste: (editor: Editor, files: File[]) => void uploader.insertFiles(editor, files),
      onDrop: (editor: Editor, files: File[], pos: number) =>
        void uploader.insertFiles(editor, files, pos),
    }),
    Video,
    Audio,
    Embed.configure({ allowedHosts: options.embedHosts ?? DEFAULT_EMBED_HOSTS }),
  ];
}

export function registerMediaCommands(
  registry: CommandRegistry,
  options: MediaOptions,
  uploader: MediaUploader,
  i18n: I18n,
): void {
  const editable = (e: Editor): boolean => e.isEditable;

  registry.register<{ src: string; alt?: string } | undefined>({
    id: 'image',
    labelKey: 'editor.media.image',
    icon: 'image',
    group: 'insert',
    isEnabled: editable,
    run: (e, payload) => {
      if (payload) {
        return isSafeUrl(payload.src, { protocols: ['http', 'https'], allowDataImages: true })
          ? e
              .chain()
              .focus()
              .command(moveCursorAfterNode)
              .setImage({ src: payload.src, alt: payload.alt ?? '' })
              .command(moveCursorAfterNode)
              .run()
          : false;
      }
      void openFormDialog({
        i18n,
        titleKey: 'editor.media.image',
        submitKey: 'editor.media.insert',
        fields: [
          { name: 'src', labelKey: 'editor.media.url', type: 'url' },
          ...(options.upload || (options.allowBase64 ?? true)
            ? [
                {
                  name: 'file',
                  labelKey: 'editor.media.file',
                  type: 'file' as const,
                  accept: 'image/*',
                },
              ]
            : []),
          { name: 'alt', labelKey: 'editor.media.alt' },
        ],
      }).then(async (values) => {
        if (!values) return;
        const file = values['file'];
        const src =
          file instanceof File ? await uploader.urlFor(file) : String(values['src'] ?? '').trim();
        if (src) registry.run(e, 'image', { src, alt: String(values['alt'] ?? '') });
      });
      return true;
    },
  });

  registry.register({
    id: 'imageUpload',
    labelKey: 'editor.media.upload',
    icon: 'upload',
    group: 'insert',
    isEnabled: editable,
    run: (e) => {
      void pickFiles('image/*', true).then((files) => uploader.insertFiles(e, files));
      return true;
    },
  });

  if (options.gallery) {
    const gallery = options.gallery;
    registry.register({
      id: 'imageGallery',
      labelKey: 'editor.media.gallery',
      icon: 'gallery',
      group: 'insert',
      isEnabled: editable,
      run: (e) => {
        void Promise.resolve(gallery())
          .then((items) =>
            openPickerDialog<PickerItem & { item: GalleryItem }>({
              i18n,
              titleKey: 'editor.media.gallery',
              items: items.map((item, index) => ({
                id: String(index),
                src: item.thumbnail ?? item.src,
                label: item.alt ?? item.src.split('/').pop() ?? item.src,
                item,
              })),
            }),
          )
          .then((picked) => {
            if (picked)
              registry.run(e, 'image', { src: picked.item.src, alt: picked.item.alt ?? '' });
          })
          .catch((error: unknown) => {
            (options.onError ?? ((err: Error) => console.error('[tiptap-core]', err.message)))(
              error instanceof Error ? error : new Error(String(error)),
            );
          });
        return true;
      },
    });
  }

  if (options.upload) {
    registry.register({
      id: 'fileUpload',
      labelKey: 'editor.media.attach',
      icon: 'attach',
      group: 'insert',
      isEnabled: editable,
      run: (e) => {
        void pickFiles('', true).then((files) => uploader.insertFiles(e, files));
        return true;
      },
    });
  }

  /** Inserts a video, audio or embed from a URL, or asks for it. */
  registry.register<string | undefined>({
    id: 'media',
    labelKey: 'editor.media.embed',
    icon: 'media',
    group: 'insert',
    isEnabled: editable,
    run: (e, url) => {
      if (url) {
        const target = toEmbedUrl(url);
        const kind = classifyMediaUrl(target);
        if (kind === 'video') return e.chain().focus().setVideo({ src: target }).run();
        if (kind === 'audio') return e.chain().focus().setAudio({ src: target }).run();
        if (kind === 'embed') return e.chain().focus().setEmbed({ src: target }).run();
        return false;
      }
      void openFormDialog({
        i18n,
        titleKey: 'editor.media.embed',
        submitKey: 'editor.media.insert',
        fields: [{ name: 'url', labelKey: 'editor.media.url', type: 'url', required: true }],
      }).then((values) => {
        const value = values ? String(values['url'] ?? '') : '';
        if (value && !registry.run(e, 'media', value)) {
          (options.onError ?? ((err: Error) => console.error('[tiptap-core]', err.message)))(
            new Error(i18n.t('editor.media.notAllowed')),
          );
        }
      });
      return true;
    },
  });
}
