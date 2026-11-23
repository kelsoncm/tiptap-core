# Revisão

<p class="lead">Comentários em threads, sugestões com autor e data, versões nomeadas e papéis de usuário.
Troque o papel para ver o que cada um pode fazer.</p>

<div data-example="revisao"></div>

## Como funciona

- `revision.user` identifica quem edita. `role` pode ser `viewer`, `commenter`, `suggester` ou `editor`.
- Com `trackChanges: true`, edições viram `<ins>`/`<del>` com autor e data. Aceite ou rejeite uma a uma
  ou todas de uma vez.
- Comentários marcam o texto com `span[data-comment]`. As threads chegam em `comments.onChange` para
  você salvar no backend.
- `saveVersion` guarda uma versão nomeada (`versions.onSave`). O painel de revisão lista versões e sugestões.
- Mudanças estruturais (tabelas, imagens) são aplicadas diretamente, sem virar sugestão.
