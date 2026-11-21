/**
 * Import from Word (.docx) with mammoth. Separate entry because mammoth is large:
 * `import { officePlugin } from '@kelsoncm/tiptap-core/office'` (install `mammoth`).
 */
import type { EditorPlugin } from './editor/plugins.js';
import { pickFiles } from './ui/dialog.js';
import { cleanPastedHtml } from './utils/paste-cleanup.js';

/** The part of mammoth's API used here. */
export interface MammothLike {
  convertToHtml(input: {
    arrayBuffer: ArrayBuffer;
  }): Promise<{ value: string; messages: unknown[] }>;
}

export interface OfficePluginOptions {
  /** mammoth module; loaded with a dynamic import when omitted. */
  mammoth?: MammothLike;
  /** Uploads images embedded in the document and returns their URL (default: data URLs). */
  onError?: (error: Error) => void;
}

const MESSAGES = {
  'pt-BR': { 'editor.io.importWord': 'Importar do Word (.docx)' },
  en: { 'editor.io.importWord': 'Import from Word (.docx)' },
  es: { 'editor.io.importWord': 'Importar desde Word (.docx)' },
};

/** Converts a .docx file into clean HTML. */
export async function docxToHtml(file: Blob, mammoth?: MammothLike): Promise<string> {
  const mod: MammothLike & { default?: MammothLike } =
    mammoth ?? ((await import('mammoth')) as unknown as MammothLike & { default?: MammothLike });
  const api: MammothLike = mod.default ?? mod;
  const result = await api.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  return cleanPastedHtml(result.value);
}

export function officePlugin(options: OfficePluginOptions = {}): EditorPlugin {
  return {
    name: 'office',
    messages: MESSAGES,
    register: (registry) => {
      registry.register<Blob | undefined>({
        id: 'importWord',
        labelKey: 'editor.io.importWord',
        icon: 'import',
        group: 'io',
        isEnabled: (e) => e.isEditable,
        run: (e, file) => {
          const pick = file
            ? Promise.resolve([file])
            : pickFiles(
                '.docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document',
              );
          void pick
            .then(async ([chosen]) => {
              if (!chosen) return;
              const html = await docxToHtml(chosen, options.mammoth);
              e.chain().focus().insertContent(html).run();
            })
            .catch((error: unknown) => {
              const err = error instanceof Error ? error : new Error(String(error));
              (
                options.onError ??
                ((x: Error) => console.error('[tiptap-core] Importação do Word:', x.message))
              )(err);
            });
          return true;
        },
      });
    },
  };
}
