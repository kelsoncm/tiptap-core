import { describe, expect, it } from 'vitest';

import { defaultIconRenderer } from '../src/index.js';

describe('defaultIconRenderer', () => {
  it('uses the built-in icon when it exists', () => {
    expect(defaultIconRenderer('bold', 'bold')).toBe('B');
  });

  it('renders heading levels', () => {
    expect(defaultIconRenderer('heading-3', 'heading-3')).toBe('H3');
  });

  it('shows short text icons from plugins as they are', () => {
    expect(defaultIconRenderer('⚠', 'alerta')).toBe('⚠');
    expect(defaultIconRenderer('👋', 'ola')).toBe('👋');
  });

  it('falls back to the command id for unknown icon names', () => {
    expect(defaultIconRenderer('desconhecido', 'meu-comando')).toBe('meu-comando');
  });
});
