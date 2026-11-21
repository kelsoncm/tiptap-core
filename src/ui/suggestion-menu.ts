import { autoUpdate, computePosition, flip, offset, shift } from '@floating-ui/dom';
import type { SuggestionKeyDownProps, SuggestionProps } from '@tiptap/suggestion';

import type { I18n } from '../i18n/i18n.js';

export interface SuggestionMenuOptions<I> {
  i18n: I18n;
  /** Visible text of an item. */
  label(item: I): string;
  /** Optional secondary text (description, shortcut, id...). */
  detail?(item: I): string | undefined;
  /** Optional leading icon/preview. */
  icon?(item: I): string | undefined;
  /** CSS class added to the menu, e.g. `kt-mention-menu`. */
  className?: string;
}

let menuCounter = 0;

/**
 * Accessible list popup (`role="listbox"`) for `@tiptap/suggestion`: mentions, merge
 * fields and slash commands. Arrow keys move, Enter/Tab select, Escape closes.
 */
export function createSuggestionMenu<I, S = I>(
  options: SuggestionMenuOptions<I>,
): () => {
  onStart: (props: SuggestionProps<I, S>) => void;
  onUpdate: (props: SuggestionProps<I, S>) => void;
  onKeyDown: (props: SuggestionKeyDownProps) => boolean;
  onExit: () => void;
} {
  return () => {
    let element: HTMLDivElement | null = null;
    let props: SuggestionProps<I, S> | null = null;
    let selected = 0;
    let stopAutoUpdate: (() => void) | null = null;
    const id = `kt-suggestion-${++menuCounter}`;

    const select = (index: number): void => {
      const item = props?.items[index];
      if (item !== undefined && props) props.command(item as unknown as S);
    };

    const render = (): void => {
      if (!element || !props) return;
      element.replaceChildren();
      if (props.items.length === 0) {
        const empty = document.createElement('div');
        empty.className = 'kt-suggestion-empty';
        empty.textContent = options.i18n.t('editor.messages.noResults');
        element.append(empty);
        return;
      }
      selected = Math.min(selected, props.items.length - 1);
      props.items.forEach((item, index) => {
        const option = document.createElement('div');
        option.className = 'kt-suggestion-item';
        option.id = `${id}-${index}`;
        option.setAttribute('role', 'option');
        option.setAttribute('aria-selected', String(index === selected));
        if (index === selected) option.classList.add('is-selected');
        const icon = options.icon?.(item);
        if (icon) {
          const span = document.createElement('span');
          span.className = 'kt-suggestion-icon';
          span.textContent = icon;
          option.append(span);
        }
        const label = document.createElement('span');
        label.className = 'kt-suggestion-label';
        label.textContent = options.label(item);
        option.append(label);
        const detail = options.detail?.(item);
        if (detail) {
          const span = document.createElement('span');
          span.className = 'kt-suggestion-detail';
          span.textContent = detail;
          option.append(span);
        }
        // mousedown keeps the editor focused; click would blur it first.
        option.addEventListener('mousedown', (event) => {
          event.preventDefault();
          select(index);
        });
        element?.append(option);
      });
      element.setAttribute('aria-activedescendant', `${id}-${selected}`);
      element.querySelector('.is-selected')?.scrollIntoView?.({ block: 'nearest' });
    };

    const position = (): void => {
      const rect = props?.clientRect?.();
      if (!element || !rect) return;
      const reference = { getBoundingClientRect: () => props?.clientRect?.() ?? rect };
      void computePosition(reference, element, {
        placement: 'bottom-start',
        strategy: 'fixed',
        middleware: [offset(4), flip(), shift({ padding: 8 })],
      }).then(({ x, y }) => {
        if (!element) return;
        element.style.left = `${x}px`;
        element.style.top = `${y}px`;
      });
    };

    return {
      onStart: (next) => {
        props = next;
        selected = 0;
        element = document.createElement('div');
        element.id = id;
        element.className = ['kt-suggestion', options.className].filter(Boolean).join(' ');
        element.setAttribute('role', 'listbox');
        element.style.position = 'fixed';
        document.body.append(element);
        render();
        position();
        const reference = next.decorationNode;
        if (reference) stopAutoUpdate = autoUpdate(reference, element, position);
      },
      onUpdate: (next) => {
        props = next;
        selected = 0;
        render();
        position();
      },
      onKeyDown: ({ event }) => {
        if (!props) return false;
        const count = props.items.length;
        if (event.key === 'Escape') {
          element?.remove();
          element = null;
          return true;
        }
        if (count === 0) return false;
        if (event.key === 'ArrowDown') {
          selected = (selected + 1) % count;
          render();
          return true;
        }
        if (event.key === 'ArrowUp') {
          selected = (selected - 1 + count) % count;
          render();
          return true;
        }
        if (event.key === 'Enter' || event.key === 'Tab') {
          select(selected);
          return true;
        }
        return false;
      },
      onExit: () => {
        stopAutoUpdate?.();
        stopAutoUpdate = null;
        element?.remove();
        element = null;
        props = null;
      },
    };
  };
}
