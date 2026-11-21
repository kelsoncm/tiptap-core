import type { Editor, JSONContent } from '@tiptap/core';

export interface AutosaveContent {
  html: string;
  json: JSONContent;
}

export interface AutosaveOptions {
  /** Persists the content (e.g. POST to your API). Optional when only `storageKey` is used. */
  save?: (content: AutosaveContent) => Promise<void> | void;
  /** Debounce in milliseconds after the last change. Default: 2000. */
  delay?: number;
  /** Also keeps a local draft in `localStorage` under this key. */
  storageKey?: string;
}

export type AutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface AutosaveController {
  readonly status: AutosaveStatus;
  readonly lastError: Error | null;
  /** Saves now, cancelling the pending debounce. */
  flush(): Promise<void>;
  /** Local draft (HTML), if any. */
  readDraft(): string | null;
  clearDraft(): void;
  onStatus(listener: (status: AutosaveStatus) => void): () => void;
  destroy(): void;
}

const storage = (): Storage | null => {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
};

export function createAutosave(editor: Editor, options: AutosaveOptions): AutosaveController {
  const delay = options.delay ?? 2000;
  let status: AutosaveStatus = 'idle';
  let lastError: Error | null = null;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let running: Promise<void> = Promise.resolve();
  const listeners = new Set<(status: AutosaveStatus) => void>();

  const setStatus = (next: AutosaveStatus): void => {
    status = next;
    for (const listener of listeners) listener(next);
  };

  const save = async (): Promise<void> => {
    if (editor.isDestroyed) return;
    const content = { html: editor.getHTML(), json: editor.getJSON() };
    if (options.storageKey) {
      try {
        storage()?.setItem(options.storageKey, content.html);
      } catch {
        // Quota exceeded or storage disabled: the remote save still runs.
      }
    }
    if (!options.save) {
      setStatus('saved');
      return;
    }
    setStatus('saving');
    try {
      await options.save(content);
      lastError = null;
      setStatus('saved');
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      console.error('[tiptap-core] Falha no salvamento automático:', lastError.message);
      setStatus('error');
    }
  };

  const flush = (): Promise<void> => {
    if (timer) clearTimeout(timer);
    timer = null;
    // Serialize saves so an older request never finishes after a newer one.
    running = running.then(save, save);
    return running;
  };

  const onUpdate = (): void => {
    if (timer) clearTimeout(timer);
    setStatus('pending');
    timer = setTimeout(() => void flush(), delay);
  };
  editor.on('update', onUpdate);

  const onUnload = (): void => {
    if (status === 'pending' && options.storageKey) {
      try {
        storage()?.setItem(options.storageKey, editor.getHTML());
      } catch {
        // ignore
      }
    }
  };
  if (typeof window !== 'undefined') window.addEventListener('beforeunload', onUnload);

  return {
    get status() {
      return status;
    },
    get lastError() {
      return lastError;
    },
    flush,
    readDraft: () => (options.storageKey ? (storage()?.getItem(options.storageKey) ?? null) : null),
    clearDraft: () => {
      if (options.storageKey) storage()?.removeItem(options.storageKey);
    },
    onStatus(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    destroy() {
      if (timer) clearTimeout(timer);
      editor.off('update', onUpdate);
      if (typeof window !== 'undefined') window.removeEventListener('beforeunload', onUnload);
      listeners.clear();
    },
  };
}
