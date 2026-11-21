import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Placeholder } from '@tiptap/extensions';
import type { AnyExtension, Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';

import {
  createEditor,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../editor/create-editor.js';
import { RestrictedEdit } from '../extensions/restricted-edit.js';
import { createI18n, type I18n } from '../i18n/i18n.js';
import type { IconRenderer } from './icons.js';
import { BALLOON_PRESET, Toolbar, TOOLBAR_PRESETS, type ToolbarItem } from './toolbar.js';

/**
 * - `toolbar`: fixed toolbar above the content (plus balloon if `balloon` is set).
 * - `balloon`: no fixed toolbar; formatting appears over the selection.
 * - `inline`: borderless; the toolbar floats above the content only while focused.
 * - `notion`: no toolbar, balloon over the selection, block placeholder hint.
 * - `readonly`: no toolbar, not editable.
 */
export const EDITOR_MODES = ['toolbar', 'balloon', 'inline', 'notion', 'readonly'] as const;
export type EditorMode = (typeof EDITOR_MODES)[number];

export interface EditorUIOptions extends Omit<KelsonEditorOptions, 'element'> {
  mode?: EditorMode;
  /** Toolbar items or a preset name. Default: `full`. */
  toolbar?: readonly ToolbarItem[] | keyof typeof TOOLBAR_PRESETS;
  /** Balloon items; `false` disables the balloon in `toolbar` mode. Default: balloon preset. */
  balloon?: readonly ToolbarItem[] | false;
  /** Placeholder for an empty document (i18n key or text). */
  placeholder?: string;
  /** Load restricted editing; `true` also turns the restriction on. */
  restrictedEdit?: boolean;
  renderIcon?: IconRenderer;
}

export interface EditorUI extends KelsonEditor {
  /** Root element appended to the host. */
  readonly root: HTMLElement;
  readonly mode: EditorMode;
  setMode(mode: EditorMode): void;
  /** Turns restricted editing on/off. Requires `restrictedEdit` at creation. */
  setRestricted(enabled: boolean): void;
}

const isMode = (value: string): value is EditorMode =>
  (EDITOR_MODES as readonly string[]).includes(value);

/** Mounts a complete editor (toolbar, balloon, content) inside `host`. */
export function createEditorUI(host: HTMLElement, options: EditorUIOptions = {}): EditorUI {
  let mode: EditorMode = options.mode ?? 'toolbar';
  if (!isMode(mode))
    throw new Error(`Modo "${String(mode)}" inválido. Use: ${EDITOR_MODES.join(', ')}.`);

  const root = document.createElement('div');
  root.className = 'kt-editor';
  const toolbarHost = document.createElement('div');
  toolbarHost.className = 'kt-toolbar-host';
  const content = document.createElement('div');
  content.className = 'kt-content';
  const bubble = document.createElement('div');
  bubble.className = 'kt-bubble';
  // The bubble element is attached and detached by the BubbleMenu plugin itself.
  root.append(toolbarHost, content);
  host.append(root);

  const balloonItems = options.balloon === false ? null : (options.balloon ?? BALLOON_PRESET);
  const balloonActive = (): boolean =>
    balloonItems !== null && (mode === 'balloon' || mode === 'notion' || mode === 'toolbar');

  const placeholderText = (): string => {
    const key =
      options.placeholder ??
      (mode === 'notion' ? 'editor.placeholders.notion' : 'editor.placeholders.default');
    return i18n.t(key);
  };

  // Created up front: the placeholder reads it while the editor is being constructed.
  const i18n: I18n = options.i18n && 't' in options.i18n ? options.i18n : createI18n(options.i18n);

  const extensions: AnyExtension[] = [
    Placeholder.configure({ placeholder: () => placeholderText() }),
    BubbleMenu.configure({
      element: bubble,
      pluginKey: 'ktBubbleMenu',
      shouldShow: ({
        editor,
        state,
        from,
        to,
      }: {
        editor: Editor;
        state: Editor['state'];
        from: number;
        to: number;
      }) =>
        balloonActive() &&
        editor.isEditable &&
        from !== to &&
        !(state.selection instanceof NodeSelection) &&
        !editor.isActive('codeBlock'),
    }),
    ...(options.restrictedEdit !== undefined
      ? [RestrictedEdit.configure({ enabled: options.restrictedEdit })]
      : []),
    ...(options.extensions ?? []),
  ];

  const kelson = createEditor({
    // The slash menu is on by default in the full UI.
    slashCommands: true,
    ...options,
    i18n,
    element: content,
    editable: mode !== 'readonly' && options.editable !== false,
    extensions,
  });

  const toolbarItems =
    typeof options.toolbar === 'string'
      ? TOOLBAR_PRESETS[options.toolbar]
      : (options.toolbar ?? TOOLBAR_PRESETS.full);
  const toolbarOptions = options.renderIcon ? { renderIcon: options.renderIcon } : {};
  const toolbar = new Toolbar(kelson, toolbarItems, toolbarOptions);
  toolbarHost.append(toolbar.element);
  const balloon = balloonItems
    ? new Toolbar(kelson, balloonItems, { ...toolbarOptions, className: 'kt-toolbar-balloon' })
    : null;
  if (balloon) bubble.append(balloon.element);

  const applyMode = (): void => {
    root.dataset['mode'] = mode;
    toolbarHost.hidden = !(mode === 'toolbar' || mode === 'inline');
    kelson.editor.setEditable(mode !== 'readonly');
    // Re-render the placeholder decoration for the new mode.
    kelson.editor.view.dispatch(kelson.editor.state.tr.setMeta('ktMode', mode));
  };

  const onFocus = (): void => root.classList.add('is-focused');
  const onBlur = ({ event }: { event: FocusEvent }): void => {
    // Keep the inline toolbar open while focus moves into it.
    if (event.relatedTarget instanceof Node && root.contains(event.relatedTarget)) return;
    root.classList.remove('is-focused');
  };
  kelson.editor.on('focus', onFocus);
  kelson.editor.on('blur', onBlur);
  const onFocusOut = (event: FocusEvent): void => {
    if (!(event.relatedTarget instanceof Node) || !root.contains(event.relatedTarget)) {
      if (!kelson.editor.isFocused) root.classList.remove('is-focused');
    }
  };
  root.addEventListener('focusout', onFocusOut);

  applyMode();

  return {
    ...kelson,
    root,
    get mode() {
      return mode;
    },
    setMode(next) {
      if (!isMode(next))
        throw new Error(`Modo "${String(next)}" inválido. Use: ${EDITOR_MODES.join(', ')}.`);
      mode = next;
      applyMode();
    },
    setRestricted(enabled) {
      if (options.restrictedEdit === undefined) {
        throw new Error('Edição restrita não carregada: crie o editor com a opção restrictedEdit.');
      }
      kelson.editor.commands.setRestrictedEdit(enabled);
    },
    setEditable(editable) {
      kelson.setEditable(editable && mode !== 'readonly');
    },
    destroy() {
      kelson.editor.off('focus', onFocus);
      kelson.editor.off('blur', onBlur);
      root.removeEventListener('focusout', onFocusOut);
      toolbar.destroy();
      balloon?.destroy();
      kelson.destroy();
      root.remove();
    },
  };
}
