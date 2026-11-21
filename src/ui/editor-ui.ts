import { BubbleMenu } from '@tiptap/extension-bubble-menu';
import { Placeholder } from '@tiptap/extensions';
import type { AnyExtension, Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

import {
  createEditor,
  type KelsonEditor,
  type KelsonEditorOptions,
} from '../editor/create-editor.js';
import { RestrictedEdit } from '../extensions/restricted-edit.js';
import { createI18n, type I18n } from '../i18n/i18n.js';
import type { IconRenderer } from './icons.js';
import { DragHandle, FindBar, Minimap, OutlinePanel, SourceEditor } from './panels.js';
import { CheckerPanel } from './checker-panel.js';
import { RevisionPanel } from './revision-panel.js';
import { StatusBar } from './status-bar.js';
import { Extension } from '@tiptap/core';
import {
  BALLOON_PRESET,
  TABLE_MENU_PRESET,
  Toolbar,
  TOOLBAR_PRESETS,
  type ToolbarItem,
} from './toolbar.js';

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
  /** Handle to drag blocks (hover left of a block). Default: true. */
  dragHandle?: boolean;
  /** Footer with counters, limits and autosave state. Default: true. */
  statusBar?: boolean;
  /** Minimum and maximum height of the content (CSS length); grows in between. */
  minHeight?: string;
  maxHeight?: string;
  /** Contextual menu shown while the cursor is in a table; `false` disables it. */
  tableMenu?: readonly ToolbarItem[] | false;
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
  const tableBubble = document.createElement('div');
  tableBubble.className = 'kt-bubble kt-table-bubble';
  // Bubble elements are attached and detached by the BubbleMenu plugin itself.
  const body = document.createElement('div');
  body.className = 'kt-body';
  body.append(content);
  root.append(toolbarHost, body);
  host.append(root);

  const balloonItems = options.balloon === false ? null : (options.balloon ?? BALLOON_PRESET);
  const balloonActive = (): boolean =>
    balloonItems !== null && (mode === 'balloon' || mode === 'notion' || mode === 'toolbar');

  const tableItems = options.tableMenu === false ? null : (options.tableMenu ?? TABLE_MENU_PRESET);

  const placeholderText = (): string => {
    const key =
      options.placeholder ??
      (mode === 'notion' ? 'editor.placeholders.notion' : 'editor.placeholders.default');
    return i18n.t(key);
  };

  // Created up front: the placeholder reads it while the editor is being constructed.
  const i18n: I18n = options.i18n && 't' in options.i18n ? options.i18n : createI18n(options.i18n);

  // UI actions bound after the panels exist (keyboard shortcuts call them).
  const uiCommands = { findReplace: (): boolean => false, exitFullscreen: (): boolean => false };

  // Set once the editor exists; plugin callbacks may run during construction.
  let editorRef: Editor | null = null;

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
        // Over a selection, or with the cursor inside a link (edit/remove/open).
        (from !== to || editor.isActive('link')) &&
        !(state.selection instanceof NodeSelection) &&
        !editor.isActive('codeBlock') &&
        !(state.selection instanceof CellSelection),
    }),
    BubbleMenu.configure({
      element: tableBubble,
      pluginKey: 'ktTableMenu',
      options: { placement: 'top-start' },
      shouldShow: ({ editor, state }: { editor: Editor; state: Editor['state'] }) =>
        tableItems !== null &&
        mode !== 'readonly' &&
        editor.isEditable &&
        editor.isActive('table') &&
        (state.selection.empty || state.selection instanceof CellSelection),
      getReferencedVirtualElement: () => {
        // Anchor the menu to the table, not to the cursor, so it does not cover the text.
        if (!editorRef) return null;
        const { view, state } = editorRef;
        const { $from } = state.selection;
        for (let depth = $from.depth; depth > 0; depth--) {
          if ($from.node(depth).type.name !== 'table') continue;
          const dom = view.nodeDOM($from.before(depth));
          if (dom instanceof HTMLElement) {
            return {
              getBoundingClientRect: () => dom.getBoundingClientRect(),
              getClientRects: () => dom.getClientRects(),
            };
          }
        }
        return null;
      },
    }),
    Extension.create({
      name: 'ktUiShortcuts',
      addKeyboardShortcuts: () => ({
        'Mod-f': () => uiCommands.findReplace(),
        'Mod-h': () => uiCommands.findReplace(),
        Escape: () => uiCommands.exitFullscreen(),
      }),
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

  editorRef = kelson.editor;

  // ---- view panels
  const findBar = new FindBar(kelson);
  root.insertBefore(findBar.element, body);
  const source = new SourceEditor(kelson, content);
  body.append(source.element);
  const outline = new OutlinePanel(kelson);
  const minimap = new Minimap(kelson, content);
  body.append(outline.element, minimap.element);
  const dragHandle =
    options.dragHandle === false
      ? null
      : new DragHandle(kelson.editor, root, i18n.t('editor.view.dragHandle'));

  const refreshToolbars = (): void => {
    toolbar.update();
    balloon?.update();
  };
  const uiCommand = (
    id: string,
    labelKey: string,
    icon: string,
    run: () => boolean,
    isActive?: () => boolean,
    shortcut?: string,
  ): void => {
    kelson.commands.register(
      {
        id,
        labelKey,
        icon,
        group: 'view',
        ...(shortcut ? { shortcut } : {}),
        ...(isActive ? { isActive: () => isActive() } : {}),
        run: () => {
          const result = run();
          refreshToolbars();
          return result;
        },
      },
      true,
    );
  };
  uiCommand(
    'findReplace',
    'editor.find.title',
    'search',
    () => {
      if (findBar.open) findBar.close();
      else findBar.show();
      return true;
    },
    () => findBar.open,
    'Mod-f',
  );
  uiCommand(
    'sourceCode',
    'editor.view.source',
    'source',
    () => {
      source.toggle();
      root.classList.toggle('is-source', source.active);
      return true;
    },
    () => source.active,
  );
  uiCommand(
    'showBlocks',
    'editor.view.blocks',
    'blocks',
    () => {
      root.classList.toggle('kt-show-blocks');
      return true;
    },
    () => root.classList.contains('kt-show-blocks'),
  );
  uiCommand(
    'outline',
    'editor.view.outline',
    'outline',
    () => {
      outline.toggle();
      return true;
    },
    () => !outline.element.hidden,
  );
  uiCommand(
    'minimap',
    'editor.view.minimap',
    'minimap',
    () => {
      minimap.toggle();
      return true;
    },
    () => !minimap.element.hidden,
  );
  uiCommand(
    'fullscreen',
    'editor.view.fullscreen',
    'fullscreen',
    () => {
      root.classList.toggle('is-fullscreen');
      return true;
    },
    () => root.classList.contains('is-fullscreen'),
  );
  const revisionPanel = kelson.commands.has('comment')
    ? new RevisionPanel(kelson, kelson.revision)
    : null;
  if (revisionPanel) {
    body.append(revisionPanel.element);
    uiCommand(
      'revisionPanel',
      'editor.revision.panel',
      'review',
      () => {
        revisionPanel.toggle();
        return true;
      },
      () => !revisionPanel.element.hidden,
    );
  }
  const checkerPanel = new CheckerPanel(kelson);
  body.append(checkerPanel.element);
  uiCommand(
    'checkerPanel',
    'editor.checkers.panel',
    'checks',
    () => {
      checkerPanel.toggle();
      return true;
    },
    () => !checkerPanel.element.hidden,
  );
  uiCommands.findReplace = () => kelson.run('findReplace');
  uiCommands.exitFullscreen = () => {
    if (!root.classList.contains('is-fullscreen')) return false;
    return kelson.run('fullscreen');
  };

  const statusBar =
    options.statusBar === false
      ? null
      : new StatusBar(kelson, kelson.limits, kelson.autosave ?? undefined);
  if (statusBar) root.append(statusBar.element);
  if (options.minHeight) root.style.setProperty('--kt-min-height', options.minHeight);
  if (options.maxHeight) root.style.setProperty('--kt-max-height', options.maxHeight);

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
  const tableMenu = tableItems
    ? new Toolbar(kelson, tableItems, {
        ...toolbarOptions,
        className: 'kt-toolbar-table',
        ariaLabel: 'editor.table.menu',
      })
    : null;
  if (tableMenu) tableBubble.append(tableMenu.element);

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
      tableMenu?.destroy();
      statusBar?.destroy();
      findBar.destroy();
      source.destroy();
      outline.destroy();
      minimap.destroy();
      dragHandle?.destroy();
      revisionPanel?.destroy();
      checkerPanel.destroy();
      kelson.destroy();
      root.remove();
    },
  };
}
