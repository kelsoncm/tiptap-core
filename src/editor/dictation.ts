import type { Editor } from '@tiptap/core';

/** Subset of the Web Speech API used here (not in TypeScript's DOM lib everywhere). */
interface SpeechRecognitionResultLike {
  readonly isFinal: boolean;
  readonly 0: { readonly transcript: string };
}
interface SpeechRecognitionEventLike {
  readonly resultIndex: number;
  readonly results: ArrayLike<SpeechRecognitionResultLike>;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
}
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

const getRecognition = (): SpeechRecognitionCtor | null => {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, SpeechRecognitionCtor | undefined>;
  return w['SpeechRecognition'] ?? w['webkitSpeechRecognition'] ?? null;
};

export const isDictationSupported = (): boolean => getRecognition() !== null;

export interface DictationController {
  readonly listening: boolean;
  start(lang: string): boolean;
  stop(): void;
  onChange(listener: (listening: boolean) => void): () => void;
}

/** Voice to text with the browser's Web Speech API; final results are inserted at the cursor. */
export function createDictation(
  editor: Editor,
  onError?: (message: string) => void,
): DictationController {
  let recognition: SpeechRecognitionLike | null = null;
  let listening = false;
  const listeners = new Set<(listening: boolean) => void>();
  const set = (value: boolean): void => {
    listening = value;
    for (const listener of listeners) listener(value);
  };

  return {
    get listening() {
      return listening;
    },
    start(lang) {
      const Recognition = getRecognition();
      if (!Recognition || listening) return false;
      recognition = new Recognition();
      recognition.lang = lang;
      recognition.continuous = true;
      recognition.interimResults = false;
      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (!result?.isFinal) continue;
          const text = result[0].transcript.trim();
          if (!text || editor.isDestroyed) continue;
          const { from } = editor.state.selection;
          const before = editor.state.doc.textBetween(Math.max(0, from - 1), from);
          editor
            .chain()
            .focus()
            .insertContent(before && !/\s/.test(before) ? ` ${text}` : text)
            .run();
        }
      };
      recognition.onerror = (event) => onError?.(event.error);
      recognition.onend = () => set(false);
      try {
        recognition.start();
        set(true);
        return true;
      } catch (error) {
        onError?.(error instanceof Error ? error.message : String(error));
        return false;
      }
    },
    stop() {
      recognition?.stop();
      set(false);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
