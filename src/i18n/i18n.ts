import { en } from './locales/en.js';
import { es } from './locales/es.js';
import { ptBR } from './locales/pt-BR.js';

/** Flat dictionary: dotted key -> message. Messages may contain `{name}` placeholders. */
export type Messages = Readonly<Record<string, string>>;

export type TranslateParams = Readonly<Record<string, string | number>>;

export interface I18nOptions {
  /** Active locale. Defaults to `pt-BR`. */
  locale?: string;
  /** Locale used when a key is missing in the active locale. Defaults to `pt-BR`. */
  fallbackLocale?: string;
  /** Extra or overriding dictionaries, merged over the built-in ones. */
  messages?: Readonly<Record<string, Messages>>;
}

export interface I18n {
  readonly locale: string;
  readonly locales: readonly string[];
  setLocale(locale: string): void;
  /** Returns the message for `key`, or the key itself when no dictionary has it. */
  t(key: string, params?: TranslateParams): string;
  addMessages(locale: string, messages: Messages): void;
  onChange(listener: (locale: string) => void): () => void;
}

export const DEFAULT_LOCALE = 'pt-BR';

export const builtInMessages: Readonly<Record<string, Messages>> = {
  'pt-BR': ptBR,
  en,
  es,
};

/** Normalizes tags such as `pt_br`, `PT-br` or `pt` to the closest known locale. */
export function normalizeLocale(locale: string, known: readonly string[]): string | undefined {
  const wanted = locale.trim().replace('_', '-').toLowerCase();
  if (!wanted) return undefined;
  const exact = known.find((k) => k.toLowerCase() === wanted);
  if (exact) return exact;
  const language = wanted.split('-')[0];
  return known.find((k) => k.toLowerCase().split('-')[0] === language);
}

function interpolate(message: string, params?: TranslateParams): string {
  if (!params) return message;
  return message.replace(/\{(\w+)\}/g, (match, name: string) =>
    Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : match,
  );
}

export function createI18n(options: I18nOptions = {}): I18n {
  const dictionaries = new Map<string, Record<string, string>>();
  const listeners = new Set<(locale: string) => void>();

  const add = (locale: string, messages: Messages): void => {
    dictionaries.set(locale, { ...(dictionaries.get(locale) ?? {}), ...messages });
  };

  for (const [locale, messages] of Object.entries(builtInMessages)) add(locale, messages);
  for (const [locale, messages] of Object.entries(options.messages ?? {})) add(locale, messages);

  const resolve = (locale: string): string => {
    const found = normalizeLocale(locale, [...dictionaries.keys()]);
    if (!found) {
      throw new Error(
        `Locale "${locale}" não disponível. Disponíveis: ${[...dictionaries.keys()].join(', ')}.`,
      );
    }
    return found;
  };

  const fallback = resolve(options.fallbackLocale ?? DEFAULT_LOCALE);
  let current = resolve(options.locale ?? DEFAULT_LOCALE);

  return {
    get locale() {
      return current;
    },
    get locales() {
      return [...dictionaries.keys()];
    },
    setLocale(locale) {
      const next = resolve(locale);
      if (next === current) return;
      current = next;
      for (const listener of listeners) listener(current);
    },
    t(key, params) {
      const message = dictionaries.get(current)?.[key] ?? dictionaries.get(fallback)?.[key] ?? key;
      return interpolate(message, params);
    },
    addMessages(locale, messages) {
      add(locale, messages);
    },
    onChange(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
