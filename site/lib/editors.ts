import type { EditorUI } from '@kelsoncm/tiptap-core';

const STORAGE_KEY = 'kt-site:locale';
const LOCALES = ['pt-BR', 'en', 'es'];
const editors = new Set<EditorUI>();

const read = (): string | null => {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
};

export function currentLocale(): string {
  const saved = read();
  return saved && LOCALES.includes(saved) ? saved : 'pt-BR';
}

/** Tracks an editor so the locale selector in the header reaches it. */
export function registerEditor(ui: EditorUI): EditorUI {
  editors.add(ui);
  if (currentLocale() !== 'pt-BR') ui.i18n.setLocale(currentLocale());
  return ui;
}

export function setLocale(locale: string): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // storage blocked: the choice applies to this page only
  }
  for (const ui of editors) ui.i18n.setLocale(locale);
}
