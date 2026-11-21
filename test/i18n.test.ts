import { describe, expect, it, vi } from 'vitest';

import { builtInMessages, createI18n, normalizeLocale } from '../src/index.js';

describe('normalizeLocale', () => {
  const known = ['pt-BR', 'en', 'es'];

  it.each([
    ['pt-BR', 'pt-BR'],
    ['pt_br', 'pt-BR'],
    ['PT', 'pt-BR'],
    ['en-US', 'en'],
    ['es', 'es'],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeLocale(input, known)).toBe(expected);
  });

  it('returns undefined for unknown or empty locales', () => {
    expect(normalizeLocale('fr', known)).toBeUndefined();
    expect(normalizeLocale(' ', known)).toBeUndefined();
  });
});

describe('createI18n', () => {
  it('defaults to pt-BR', () => {
    const i18n = createI18n();
    expect(i18n.locale).toBe('pt-BR');
    expect(i18n.t('editor.toolbar.bold')).toBe('Negrito');
  });

  it('interpolates params and keeps unknown placeholders', () => {
    const i18n = createI18n({ locale: 'en' });
    expect(i18n.t('editor.toolbar.heading', { level: 3 })).toBe('Heading 3');
    expect(i18n.t('editor.toolbar.heading')).toBe('Heading {level}');
  });

  it('falls back to the fallback locale, then to the key', () => {
    const i18n = createI18n({ locale: 'en', messages: { 'pt-BR': { 'only.pt': 'Só PT' } } });
    expect(i18n.t('only.pt')).toBe('Só PT');
    expect(i18n.t('missing.key')).toBe('missing.key');
  });

  it('merges custom messages over built-in ones', () => {
    const i18n = createI18n({ messages: { 'pt-BR': { 'editor.toolbar.bold': 'Forte' } } });
    expect(i18n.t('editor.toolbar.bold')).toBe('Forte');
    expect(i18n.t('editor.toolbar.italic')).toBe('Itálico');
  });

  it('notifies listeners on locale change only when it changes', () => {
    const i18n = createI18n();
    const listener = vi.fn();
    const off = i18n.onChange(listener);
    i18n.setLocale('es');
    i18n.setLocale('es-AR');
    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith('es');
    off();
    i18n.setLocale('en');
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('throws a clear error for unknown locales', () => {
    expect(() => createI18n({ locale: 'fr' })).toThrow(/Locale "fr" não disponível/);
  });

  it('ships the same keys in every built-in locale', () => {
    const reference = Object.keys(builtInMessages['pt-BR'] ?? {}).sort();
    for (const messages of Object.values(builtInMessages)) {
      expect(Object.keys(messages).sort()).toEqual(reference);
    }
  });
});
