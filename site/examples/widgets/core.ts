import {
  createEditorUI,
  createWidget,
  type EditorPlugin,
  type EditorUI,
} from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

type Tipo = 'info' | 'atencao';

/** Plugin próprio: um widget (nó atômico), dois comandos e as traduções deles. */
function alertaPlugin(): EditorPlugin {
  const render = (attrs: Record<string, unknown>): HTMLElement => {
    const tipo = attrs['tipo'] === 'atencao' ? 'warning' : 'info';
    const box = document.createElement('div');
    box.className = `alert alert-${tipo} mb-0`;
    box.textContent = String(attrs['texto'] ?? '');
    return box;
  };

  return {
    name: 'alerta',
    messages: {
      'pt-BR': { 'alerta.info': 'Alerta informativo', 'alerta.atencao': 'Alerta de atenção' },
      en: { 'alerta.info': 'Info alert', 'alerta.atencao': 'Warning alert' },
      es: { 'alerta.info': 'Alerta informativa', 'alerta.atencao': 'Alerta de atención' },
    },
    // Salvo como <div data-widget="alerta" data-attrs='{"tipo":"info","texto":"…"}'>.
    extensions: () => [createWidget({ name: 'alerta', label: 'alerta.info', render })],
    register: (registry) => {
      const comando = (tipo: Tipo, texto: string): void => {
        registry.register({
          id: `alerta-${tipo}`,
          labelKey: `alerta.${tipo}`,
          icon: tipo === 'info' ? 'ℹ' : '⚠',
          group: 'insert',
          isEnabled: (editor) => editor.isEditable,
          run: (editor) =>
            editor
              .chain()
              .focus()
              .insertContent({ type: 'alerta', attrs: { props: { tipo, texto } } })
              .run(),
        });
      };
      comando('info', 'As inscrições abrem na segunda-feira.');
      comando('atencao', 'Documentos enviados após o prazo não serão aceitos.');
    },
  };
}

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    plugins: [alertaPlugin()],
    // Os comandos do plugin entram na barra e no menu "/" como os do core.
    toolbar: ['undo', 'redo', '|', 'bold', 'italic', '|', 'alerta-info', 'alerta-atencao'],
    slashCommands: ['paragraph', 'heading-2', 'bulletList', 'alerta-info', 'alerta-atencao'],
    content: `<p>Use os botões ℹ e ⚠ ou digite <code>/</code> numa linha vazia.</p>
<div data-widget="alerta" data-attrs='{"tipo":"info","texto":"Widget salvo no HTML e recriado ao abrir."}'></div>
<p></p>`,
  });
}
