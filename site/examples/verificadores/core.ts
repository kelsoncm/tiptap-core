import { createEditorUI, type EditorUI } from '@kelsoncm/tiptap-core';
import '@kelsoncm/tiptap-core/styles.css';

export function mount(host: HTMLElement): EditorUI {
  return createEditorUI(host, {
    checkers: {
      // Corretor do navegador. Para LanguageTool, informe o servidor (o texto é enviado a ele):
      // languageTool: { endpoint: 'https://seu-servidor/v2/check' }
      spellcheck: { native: true },
      accessibility: { minContrast: 4.5 },
      onIssues: (source, issues) => console.log(source, issues),
    },
    links: {
      // Simulação: na sua aplicação, consulte um endpoint do servidor (evita CORS).
      isReachable: async (href) => !href.includes('quebrado'),
      onCheck: (results) => console.table(results),
    },
    toolbar: ['bold', 'italic', 'link', '|', 'checkAccessibility', 'checkLinks', 'checkerPanel'],
    content: `<h1>Edital</h1>
<h4>Título que pula níveis</h4>
<p><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='60'%3E%3Crect width='100%25' height='100%25' fill='%23ccc'/%3E%3C/svg%3E"></p>
<p><span style="color: #c8c8c8">Texto com pouco contraste.</span></p>
<p>Veja o <a href="https://www.gov.br/">portal</a>, o <a href="https://quebrado.example/">link quebrado</a>
e <a href="https://www.gov.br/pt-br">clique aqui</a>.</p>
<p>Use os botões de verificação na barra e abra o painel de problemas.</p>`,
  });
}
