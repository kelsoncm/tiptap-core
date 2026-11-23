# Estilo Notion

<p class="lead">Sem barra fixa: o conteúdo ocupa a tela, a formatação aparece no balão sobre a seleção e
os blocos são inseridos pelo menu <code>/</code>.</p>

<div data-example="notion"></div>

## Como funciona

- `mode: 'notion'` esconde a barra e mostra a dica “/” nos blocos vazios.
- `slashCommands` define a lista do menu (ids de comandos). `true` usa a lista padrão.
- `dragHandle: true` mostra a alça à esquerda do bloco para arrastá-lo.
- Atalhos de Markdown funcionam ao digitar: `## ` vira título, `- ` vira lista, `[ ] ` vira tarefa.
