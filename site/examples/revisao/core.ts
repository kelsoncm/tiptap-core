import {
  createEditorUI,
  type CommentThread,
  type EditorUI,
  type UserRole,
} from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

const ana = { id: 'ana', name: 'Ana Júlia', color: '#1351b4' };

// Threads e versões ficam no seu backend; aqui começam com um comentário de exemplo.
const threads: CommentThread[] = [
  {
    id: 't1',
    resolved: false,
    createdAt: '2026-11-20T14:00:00Z',
    messages: [
      {
        id: 'm1',
        author: ana,
        text: 'Confirmar a data com a Reitoria.',
        createdAt: '2026-11-20T14:00:00Z',
      },
    ],
  },
];

export function mount(host: HTMLElement): EditorUI {
  const controls = document.createElement('div');
  controls.className = 'site-controls';
  controls.innerHTML = `
    <label class="form-label">Papel
      <select class="form-select form-select-sm">
        <option value="editor">editor</option>
        <option value="suggester">suggester (sugere)</option>
        <option value="commenter">commenter (só comenta)</option>
        <option value="viewer">viewer (só lê)</option>
      </select>
    </label>`;
  const editorHost = document.createElement('div');
  host.append(controls, editorHost);

  const ui = createEditorUI(editorHost, {
    content: `<p>O resultado será publicado em <span data-comment="t1">5 de dezembro</span>.</p>
<p>As inscrições <del data-author="ana" data-author-name="Ana Júlia" datetime="2026-11-20T14:05:00Z">ficam</del><ins data-author="ana" data-author-name="Ana Júlia" datetime="2026-11-20T14:05:00Z">permanecem</ins> abertas até sexta-feira.</p>`,
    revision: {
      user: { id: 'voce', name: 'Você', color: '#168821' },
      role: 'editor',
      trackChanges: true, // novas edições viram sugestões
      comments: { threads, onChange: (lista) => console.log('salvar threads', lista) },
      versions: { onSave: (versao) => console.log('salvar versão', versao) },
    },
    // Barra com os comandos de revisão.
    toolbar: [
      'undo',
      'redo',
      '|',
      'bold',
      'italic',
      '|',
      'comment',
      'trackChanges',
      'acceptChange',
      'rejectChange',
      'acceptAllChanges',
      'rejectAllChanges',
      '|',
      'saveVersion',
      'revisionPanel',
    ],
  });

  controls.querySelector('select')!.addEventListener('change', (event) => {
    ui.revision?.setRole((event.target as HTMLSelectElement).value as UserRole);
  });
  return ui;
}
