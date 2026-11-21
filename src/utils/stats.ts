import type { Node as PMNode } from '@tiptap/pm/model';

export interface DocumentStats {
  /** Characters excluding whitespace (same rule as the tiptap-ng footer). */
  characters: number;
  /** Characters including whitespace. */
  charactersWithSpaces: number;
  words: number;
  /** Non-empty paragraphs and headings. */
  paragraphs: number;
}

const TEXT_BLOCKS = new Set(['paragraph', 'heading']);

/** Counts characters, words and paragraphs of a ProseMirror document. */
export function getDocumentStats(doc: PMNode): DocumentStats {
  const text = doc.textBetween(0, doc.content.size, ' ', ' ');
  let paragraphs = 0;
  doc.descendants((node) => {
    if (TEXT_BLOCKS.has(node.type.name)) {
      if (node.textContent.trim()) paragraphs += 1;
      return false;
    }
    return true;
  });
  const trimmed = text.trim();
  return {
    characters: text.replace(/\s/g, '').length,
    charactersWithSpaces: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    paragraphs,
  };
}
