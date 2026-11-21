import { Mark, mergeAttributes } from '@tiptap/core';
import type { Node as PMNode, MarkType } from '@tiptap/pm/model';
import { Plugin, PluginKey, type Transaction } from '@tiptap/pm/state';
import { AddMarkStep, RemoveMarkStep, ReplaceStep, type Step } from '@tiptap/pm/transform';

export interface RestrictedEditOptions {
  /** Start with the restriction on. */
  enabled: boolean;
  HTMLAttributes: Record<string, unknown>;
}

export interface RestrictedEditStorage {
  enabled: boolean;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    restrictedEdit: {
      /** Turns the restriction on or off (off = author mode, regions can be marked). */
      setRestrictedEdit: (enabled: boolean) => ReturnType;
      /** Marks the selection as an editable region. Only works with the restriction off. */
      setEditableRegion: () => ReturnType;
      /** Removes the editable-region mark from the selection. Only works with the restriction off. */
      unsetEditableRegion: () => ReturnType;
    };
  }
  interface Storage {
    editableRegion: RestrictedEditStorage;
  }
}

export const restrictedEditKey = new PluginKey('restrictedEdit');

/** Lets a transaction through even with the restriction on (e.g. programmatic content). */
export const RESTRICTED_EDIT_BYPASS = 'restrictedEditBypass';

/** True when every text in [from, to] carries the mark and no whole block is removed. */
function rangeEditable(doc: PMNode, from: number, to: number, mark: MarkType): boolean {
  if (from === to) {
    const $pos = doc.resolve(from);
    // Typing inherits the marks before the cursor (the mark is inclusive), so the text
    // before the cursor must be in a region. The start of a region is not editable.
    const before = $pos.nodeBefore;
    return !!before && mark.isInSet(before.marks) !== undefined;
  }
  let ok = true;
  doc.nodesBetween(from, to, (node, pos) => {
    if (!ok) return false;
    if (node.isInline) {
      if (!mark.isInSet(node.marks)) ok = false;
      return false;
    }
    // A block fully inside the range would be deleted or replaced as a whole.
    if (pos >= from && pos + node.nodeSize <= to) ok = false;
    return ok;
  });
  return ok;
}

function stepAllowed(step: Step, doc: PMNode, mark: MarkType): boolean {
  if (step instanceof AddMarkStep || step instanceof RemoveMarkStep) {
    // Never let the region mark itself be changed while restricted.
    if (step.mark.type === mark) return false;
    return rangeEditable(doc, step.from, step.to, mark);
  }
  if (step instanceof ReplaceStep) {
    return rangeEditable(doc, step.from, step.to, mark);
  }
  // ReplaceAroundStep (wrap/lift), AttrStep (alignment, indent...), node marks: blocked.
  return false;
}

/**
 * Restricted editing: with the restriction on, only text inside `editableRegion`
 * marks can change. Formatting is allowed inside regions; structural changes are not.
 */
export const RestrictedEdit = Mark.create<RestrictedEditOptions, RestrictedEditStorage>({
  name: 'editableRegion',
  inclusive: true,
  excludes: '',
  priority: 1100,

  addOptions() {
    return { enabled: false, HTMLAttributes: {} };
  },

  addStorage() {
    return { enabled: this.options.enabled };
  },

  parseHTML() {
    return [{ tag: 'span[data-editable-region]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-editable-region': '',
        class: 'kt-editable-region',
      }),
      0,
    ];
  },

  addCommands() {
    return {
      setRestrictedEdit:
        (enabled) =>
        ({ tr, dispatch }) => {
          this.storage.enabled = enabled;
          if (dispatch) dispatch(tr.setMeta(restrictedEditKey, { enabled }));
          return true;
        },
      setEditableRegion:
        () =>
        ({ commands }) =>
          !this.storage.enabled && commands.setMark(this.name),
      unsetEditableRegion:
        () =>
        ({ commands }) =>
          !this.storage.enabled && commands.unsetMark(this.name, { extendEmptyMarkRange: true }),
    };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    const markType = this.type;
    return [
      new Plugin({
        key: restrictedEditKey,
        props: {
          attributes: (): Record<string, string> =>
            storage.enabled ? { class: 'kt-restricted' } : {},
        },
        filterTransaction: (tr: Transaction) => {
          if (!storage.enabled || !tr.docChanged || tr.getMeta(RESTRICTED_EDIT_BYPASS)) return true;
          return tr.steps.every((step, index) => {
            const doc = tr.docs[index];
            return doc !== undefined && stepAllowed(step, doc, markType);
          });
        },
      }),
    ];
  },
});
