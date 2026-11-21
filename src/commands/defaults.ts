import type { Editor } from '@tiptap/core';

import type { CommandDefinition } from './registry.js';

export const HEADING_LEVELS = [1, 2, 3, 4, 5, 6] as const;
export type HeadingLevel = (typeof HEADING_LEVELS)[number];

const toggleMark = (
  id: string,
  mark: string,
  icon: string,
  shortcut: string,
  run: (editor: Editor) => boolean,
): CommandDefinition => ({
  id,
  labelKey: `editor.toolbar.${id}`,
  icon,
  shortcut,
  group: 'marks',
  isActive: (editor) => editor.isActive(mark),
  isEnabled: (editor) => editor.isEditable,
  run,
});

const headingCommands: CommandDefinition[] = HEADING_LEVELS.map((level) => ({
  id: `heading-${level}`,
  labelKey: 'editor.toolbar.heading',
  labelParams: { level },
  icon: `heading-${level}`,
  shortcut: `Mod-Alt-${level}`,
  group: 'blocks',
  isActive: (editor) => editor.isActive('heading', { level }),
  isEnabled: (editor) => editor.isEditable,
  run: (editor) => editor.chain().focus().toggleHeading({ level }).run(),
}));

/** Commands backed by StarterKit. Feature-specific commands are added by their modules. */
export function defaultCommands(): CommandDefinition[] {
  return [
    {
      id: 'undo',
      labelKey: 'editor.toolbar.undo',
      icon: 'undo',
      shortcut: 'Mod-z',
      group: 'history',
      isEnabled: (editor) => editor.isEditable && editor.can().undo(),
      run: (editor) => editor.chain().focus().undo().run(),
    },
    {
      id: 'redo',
      labelKey: 'editor.toolbar.redo',
      icon: 'redo',
      shortcut: 'Mod-Shift-z',
      group: 'history',
      isEnabled: (editor) => editor.isEditable && editor.can().redo(),
      run: (editor) => editor.chain().focus().redo().run(),
    },
    toggleMark('bold', 'bold', 'bold', 'Mod-b', (e) => e.chain().focus().toggleBold().run()),
    toggleMark('italic', 'italic', 'italic', 'Mod-i', (e) =>
      e.chain().focus().toggleItalic().run(),
    ),
    toggleMark('underline', 'underline', 'underline', 'Mod-u', (e) =>
      e.chain().focus().toggleUnderline().run(),
    ),
    toggleMark('strike', 'strike', 'strikethrough', 'Mod-Shift-s', (e) =>
      e.chain().focus().toggleStrike().run(),
    ),
    toggleMark('code', 'code', 'code', 'Mod-e', (e) => e.chain().focus().toggleCode().run()),
    {
      id: 'removeFormat',
      labelKey: 'editor.toolbar.removeFormat',
      icon: 'remove-format',
      group: 'marks',
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().unsetAllMarks().clearNodes().run(),
    },
    {
      id: 'paragraph',
      labelKey: 'editor.toolbar.paragraph',
      icon: 'paragraph',
      shortcut: 'Mod-Alt-0',
      group: 'blocks',
      isActive: (editor) => editor.isActive('paragraph'),
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().setParagraph().run(),
    },
    ...headingCommands,
    {
      id: 'quote',
      labelKey: 'editor.toolbar.quote',
      icon: 'quote',
      shortcut: 'Mod-Shift-b',
      group: 'blocks',
      isActive: (editor) => editor.isActive('blockquote'),
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().toggleBlockquote().run(),
    },
    {
      id: 'codeBlock',
      labelKey: 'editor.toolbar.codeBlock',
      icon: 'code-block',
      shortcut: 'Mod-Alt-c',
      group: 'blocks',
      isActive: (editor) => editor.isActive('codeBlock'),
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().toggleCodeBlock().run(),
    },
    {
      id: 'bulletList',
      labelKey: 'editor.toolbar.bulletList',
      icon: 'list-ul',
      shortcut: 'Mod-Shift-8',
      group: 'lists',
      isActive: (editor) => editor.isActive('bulletList'),
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().toggleBulletList().run(),
    },
    {
      id: 'orderedList',
      labelKey: 'editor.toolbar.orderedList',
      icon: 'list-ol',
      shortcut: 'Mod-Shift-7',
      group: 'lists',
      isActive: (editor) => editor.isActive('orderedList'),
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().toggleOrderedList().run(),
    },
    {
      id: 'horizontalRule',
      labelKey: 'editor.toolbar.horizontalRule',
      icon: 'horizontal-rule',
      group: 'insert',
      isEnabled: (editor) => editor.isEditable,
      run: (editor) => editor.chain().focus().setHorizontalRule().run(),
    },
    {
      id: 'selectAll',
      labelKey: 'editor.toolbar.selectAll',
      icon: 'select-all',
      shortcut: 'Mod-a',
      group: 'tools',
      run: (editor) => editor.chain().focus().selectAll().run(),
    },
  ];
}
