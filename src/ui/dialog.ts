import type { I18n } from '../i18n/i18n.js';

export interface DialogField {
  name: string;
  /** i18n key of the label. */
  labelKey: string;
  type?: 'text' | 'url' | 'checkbox' | 'file';
  value?: string | boolean;
  required?: boolean;
  /** For file inputs, e.g. `image/*`. */
  accept?: string;
}

export type DialogValues = Record<string, string | boolean | File | null>;

export interface FormDialogOptions {
  i18n: I18n;
  titleKey: string;
  fields: readonly DialogField[];
  submitKey?: string;
  /** Suggestions per field name, rendered as a `<datalist>`. */
  datalist?: Readonly<Record<string, readonly string[]>> | undefined;
  /** Element the dialog is appended to. Default: `document.body`. */
  container?: HTMLElement;
}

let dialogCounter = 0;

const createShell = (i18n: I18n, titleKey: string, container: HTMLElement) => {
  const dialog = document.createElement('dialog');
  dialog.className = 'kt-dialog';
  const id = `kt-dialog-${++dialogCounter}`;
  dialog.setAttribute('aria-labelledby', `${id}-title`);
  const form = document.createElement('form');
  form.method = 'dialog';
  const title = document.createElement('h2');
  title.id = `${id}-title`;
  title.className = 'kt-dialog-title';
  title.textContent = i18n.t(titleKey);
  form.append(title);
  dialog.append(form);
  container.append(dialog);
  const open = (): void => {
    if (typeof dialog.showModal === 'function') {
      try {
        dialog.showModal();
        return;
      } catch {
        // Not connected or not supported: fall through.
      }
    }
    dialog.setAttribute('open', '');
  };
  return { dialog, form, id, open };
};

const actions = (i18n: I18n, submitKey: string): HTMLDivElement => {
  const bar = document.createElement('div');
  bar.className = 'kt-dialog-actions';
  const cancel = document.createElement('button');
  cancel.type = 'button';
  cancel.value = 'cancel';
  cancel.className = 'kt-dialog-cancel';
  cancel.textContent = i18n.t('common.cancel');
  const submit = document.createElement('button');
  submit.type = 'submit';
  submit.value = 'ok';
  submit.className = 'kt-dialog-submit';
  submit.textContent = i18n.t(submitKey);
  bar.append(cancel, submit);
  return bar;
};

/**
 * Small modal form built on `<dialog>`. Resolves with the values, or `null` when the
 * user cancels (button, Escape or closing the dialog).
 */
export function openFormDialog(options: FormDialogOptions): Promise<DialogValues | null> {
  const { i18n } = options;
  const { dialog, form, id, open } = createShell(
    i18n,
    options.titleKey,
    options.container ?? document.body,
  );
  const inputs = new Map<string, HTMLInputElement>();

  for (const field of options.fields) {
    const label = document.createElement('label');
    label.className = `kt-dialog-field kt-dialog-field-${field.type ?? 'text'}`;
    const input = document.createElement('input');
    input.type = field.type ?? 'text';
    input.name = field.name;
    input.id = `${id}-${field.name}`;
    if (field.required) input.required = true;
    if (field.accept) input.accept = field.accept;
    if (field.type === 'checkbox') input.checked = field.value === true;
    else if (field.type !== 'file' && typeof field.value === 'string') input.value = field.value;
    const text = document.createElement('span');
    text.textContent = i18n.t(field.labelKey);
    if (field.type === 'checkbox') label.append(input, text);
    else label.append(text, input);
    const suggestions = options.datalist?.[field.name];
    if (suggestions?.length) {
      const list = document.createElement('datalist');
      list.id = `${id}-${field.name}-list`;
      for (const value of suggestions) list.append(new Option(value, value));
      input.setAttribute('list', list.id);
      label.append(list);
    }
    form.append(label);
    inputs.set(field.name, input);
  }
  form.append(actions(i18n, options.submitKey ?? 'common.submit'));

  return new Promise((resolve) => {
    let settled = false;
    const finish = (values: DialogValues | null): void => {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(values);
    };
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      if (!form.reportValidity?.() && form.checkValidity && !form.checkValidity()) return;
      const values: DialogValues = {};
      for (const [name, input] of inputs) {
        values[name] =
          input.type === 'checkbox'
            ? input.checked
            : input.type === 'file'
              ? (input.files?.[0] ?? null)
              : input.value.trim();
      }
      finish(values);
    });
    form.querySelector('.kt-dialog-cancel')?.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', () => finish(null));
    dialog.addEventListener('close', () => finish(null));
    open();
    inputs.values().next().value?.focus();
  });
}

export interface PickerItem {
  id: string;
  src: string;
  label: string;
}

/** Grid of images to pick one (image gallery, templates). Resolves `null` on cancel. */
export function openPickerDialog<T extends PickerItem>(options: {
  i18n: I18n;
  titleKey: string;
  items: readonly T[];
  container?: HTMLElement;
}): Promise<T | null> {
  const { i18n } = options;
  const { dialog, form, open } = createShell(
    i18n,
    options.titleKey,
    options.container ?? document.body,
  );
  const grid = document.createElement('div');
  grid.className = 'kt-picker';
  grid.setAttribute('role', 'listbox');
  form.append(grid);
  const bar = actions(i18n, 'common.close');
  bar.querySelector('.kt-dialog-submit')?.remove();
  form.append(bar);

  return new Promise((resolve) => {
    let settled = false;
    const finish = (item: T | null): void => {
      if (settled) return;
      settled = true;
      dialog.remove();
      resolve(item);
    };
    if (options.items.length === 0) {
      const empty = document.createElement('p');
      empty.className = 'kt-picker-empty';
      empty.textContent = i18n.t('editor.messages.noResults');
      grid.append(empty);
    }
    for (const item of options.items) {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'kt-picker-item';
      button.setAttribute('role', 'option');
      button.title = item.label;
      const img = document.createElement('img');
      img.src = item.src;
      img.alt = item.label;
      img.loading = 'lazy';
      const caption = document.createElement('span');
      caption.textContent = item.label;
      button.append(img, caption);
      button.addEventListener('click', () => finish(item));
      grid.append(button);
    }
    form.querySelector('.kt-dialog-cancel')?.addEventListener('click', () => finish(null));
    dialog.addEventListener('cancel', () => finish(null));
    dialog.addEventListener('close', () => finish(null));
    open();
  });
}

/** Opens the native file picker. Resolves with the chosen files (empty when cancelled). */
export function pickFiles(accept = '', multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    input.addEventListener('change', () => resolve([...(input.files ?? [])]));
    input.addEventListener('cancel', () => resolve([]));
    input.click();
  });
}
