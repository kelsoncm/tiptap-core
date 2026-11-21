import type { AnyExtension } from '@tiptap/core';
import { Highlight } from '@tiptap/extension-highlight';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { Subscript } from '@tiptap/extension-subscript';
import { Superscript } from '@tiptap/extension-superscript';
import { TableOfContents } from '@tiptap/extension-table-of-contents';
import { TextAlign } from '@tiptap/extension-text-align';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';

import { BlockLineHeight } from '../extensions/block-line-height.js';
import { Indent } from '../extensions/indent.js';
import { TypedBulletList, TypedOrderedList } from '../extensions/list-types.js';
import { PageBreak } from '../extensions/page-break.js';
import {
  CaptionTable,
  FooterTableRow,
  StyledTableCell,
  StyledTableHeader,
} from '../extensions/table.js';

/** Optional features. All default to `true` except `tableOfContents`. */
export interface EditorFeatures {
  subscript: boolean;
  superscript: boolean;
  fontFamily: boolean;
  fontSize: boolean;
  textColor: boolean;
  highlight: boolean;
  lineHeight: boolean;
  textAlign: boolean;
  indent: boolean;
  /** Ordered/bullet list styles (decimal, roman, ✔, ☐...). */
  listTypes: boolean;
  table: boolean;
  pageBreak: boolean;
  /** Tracks headings for an outline panel (`editor.storage.tableOfContents`). */
  tableOfContents: boolean;
  /** Copy the formatting of one selection to another. */
  formatPainter: boolean;
  /** Interactive checklist (`<ul data-type="taskList">` with checkboxes). */
  taskList: boolean;
}

export const DEFAULT_FEATURES: Readonly<EditorFeatures> = {
  subscript: true,
  superscript: true,
  fontFamily: true,
  fontSize: true,
  textColor: true,
  highlight: true,
  lineHeight: true,
  textAlign: true,
  indent: true,
  listTypes: true,
  table: true,
  pageBreak: true,
  tableOfContents: false,
  formatPainter: true,
  taskList: true,
};

export function resolveFeatures(features: Partial<EditorFeatures> = {}): EditorFeatures {
  return { ...DEFAULT_FEATURES, ...features };
}

/** Extensions for the enabled features (StarterKit is added separately). */
export function featureExtensions(features: Readonly<EditorFeatures>): AnyExtension[] {
  const out: AnyExtension[] = [];
  if (features.listTypes) out.push(TypedBulletList, TypedOrderedList);
  if (features.taskList) {
    out.push(
      TaskList,
      TaskItem.configure({ nested: true, HTMLAttributes: { class: 'kt-task-item' } }),
    );
  }
  if (features.subscript) out.push(Subscript);
  if (features.superscript) out.push(Superscript);
  if (features.fontFamily || features.fontSize || features.textColor) out.push(TextStyle);
  if (features.fontFamily) out.push(FontFamily);
  if (features.fontSize) out.push(FontSize);
  if (features.textColor) out.push(Color);
  if (features.highlight) out.push(Highlight.configure({ multicolor: true }));
  if (features.lineHeight) out.push(BlockLineHeight);
  if (features.textAlign) {
    out.push(
      TextAlign.configure({
        types: ['heading', 'paragraph'],
        alignments: ['left', 'center', 'right', 'justify'],
      }),
    );
  }
  if (features.indent) out.push(Indent);
  if (features.table) {
    out.push(
      CaptionTable.configure({ resizable: true, HTMLAttributes: { class: 'tiptap-table' } }),
      FooterTableRow,
      StyledTableHeader,
      StyledTableCell,
    );
  }
  if (features.pageBreak) out.push(PageBreak);
  if (features.tableOfContents) out.push(TableOfContents);
  return out;
}
