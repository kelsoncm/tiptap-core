import type { Node as PMNode } from '@tiptap/pm/model';

/**
 * How `characters` is counted:
 * - `noSpaces`: text without any whitespace (default, same rule as the tiptap-ng footer);
 * - `withSpaces`: text with whitespace, plus one separator between blocks;
 * - `text`: document text with whitespace, without separators between blocks and without
 *   `\r`/`\n` (`doc.textContent`).
 */
export type CharacterCountMode = 'noSpaces' | 'withSpaces' | 'text';

export interface DocumentStatsOptions {
  /** Rule for `characters`. Default: `noSpaces`. */
  characterCount?: CharacterCountMode;
}

export interface DocumentStats {
  /** Characters by the `characterCount` rule (default: excluding whitespace). */
  characters: number;
  /** Characters including whitespace and one separator between blocks. */
  charactersWithSpaces: number;
  words: number;
  /** Non-empty paragraphs and headings. */
  paragraphs: number;
}

const TEXT_BLOCKS = new Set(['paragraph', 'heading']);

const blockText = (doc: PMNode): string => doc.textBetween(0, doc.content.size, ' ', ' ');

/** Counts the characters of a ProseMirror document by the given rule. */
export function countCharacters(doc: PMNode, mode: CharacterCountMode = 'noSpaces'): number {
  switch (mode) {
    case 'text':
      return doc.textContent.replace(/[\r\n]/g, '').length;
    case 'withSpaces':
      return blockText(doc).length;
    case 'noSpaces':
      return blockText(doc).replace(/\s/g, '').length;
    default:
      throw new Error(
        `Unknown characterCount "${String(mode)}": use noSpaces, withSpaces or text.`,
      );
  }
}

/** Counts characters, words and paragraphs of a ProseMirror document. */
export function getDocumentStats(doc: PMNode, options: DocumentStatsOptions = {}): DocumentStats {
  const text = blockText(doc);
  let paragraphs = 0;
  doc.descendants((node) => {
    if (TEXT_BLOCKS.has(node.type.name)) {
      if (node.textContent.trim()) paragraphs += 1;
      return false;
    }
    return true;
  });
  const trimmed = text.trim();
  const mode = options.characterCount ?? 'noSpaces';
  return {
    characters: mode === 'noSpaces' ? text.replace(/\s/g, '').length : countCharacters(doc, mode),
    charactersWithSpaces: text.length,
    words: trimmed ? trimmed.split(/\s+/).length : 0,
    paragraphs,
  };
}
