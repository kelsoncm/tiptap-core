import type { Editor } from '@tiptap/core';

import type { TranslateParams } from '../i18n/i18n.js';

/**
 * A UI-agnostic editor action. Adapters (Angular, web component, ...) render it as a
 * button, menu item or slash-command entry.
 */
export interface CommandDefinition<Payload = void> {
  /** Unique id, e.g. `bold` or `heading-2`. */
  readonly id: string;
  /** i18n key of the label. */
  readonly labelKey: string;
  /** Params interpolated into the label. */
  readonly labelParams?: TranslateParams;
  /** Icon name; the adapter decides how to render it. */
  readonly icon?: string;
  /** Keyboard shortcut hint in Tiptap notation, e.g. `Mod-b`. Display only. */
  readonly shortcut?: string;
  /** Grouping hint for toolbars and menus, e.g. `history`, `marks`, `blocks`. */
  readonly group?: string;
  isActive?(editor: Editor): boolean;
  isEnabled?(editor: Editor): boolean;
  /** Current value for value commands (font, color...), shown as the selected option. */
  getValue?(editor: Editor): string | null;
  run(editor: Editor, payload: Payload): boolean;
}

// The payload type is erased in the registry; callers that need it use `get<P>()`.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyCommand = CommandDefinition<any>;

export class CommandRegistry {
  readonly #commands = new Map<string, AnyCommand>();

  constructor(commands: Iterable<AnyCommand> = []) {
    for (const command of commands) this.register(command);
  }

  /** Adds a command. Throws when the id is taken, unless `replace` is true. */
  register(command: AnyCommand, replace = false): this {
    if (!command.id) throw new Error('Comando sem "id".');
    if (!replace && this.#commands.has(command.id)) {
      throw new Error(`Comando "${command.id}" já registrado. Use replace=true para substituir.`);
    }
    this.#commands.set(command.id, command);
    return this;
  }

  unregister(id: string): boolean {
    return this.#commands.delete(id);
  }

  has(id: string): boolean {
    return this.#commands.has(id);
  }

  get<Payload = void>(id: string): CommandDefinition<Payload> | undefined {
    return this.#commands.get(id) as CommandDefinition<Payload> | undefined;
  }

  /** All commands in registration order, optionally filtered by group. */
  list(group?: string): AnyCommand[] {
    const all = [...this.#commands.values()];
    return group === undefined ? all : all.filter((c) => c.group === group);
  }

  /** Runs a command by id. Throws when it does not exist; returns false when disabled. */
  run<Payload = void>(editor: Editor, id: string, payload?: Payload): boolean {
    const command = this.#commands.get(id);
    if (!command) throw new Error(`Comando "${id}" não encontrado.`);
    if (command.isEnabled && !command.isEnabled(editor)) return false;
    return command.run(editor, payload);
  }
}
