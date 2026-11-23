# Verificadores

<p class="lead">Acessibilidade (texto alternativo, níveis de título, contraste, links genéricos), links
quebrados e ortografia, com destaque no texto e painel de problemas.</p>

<div data-example="verificadores"></div>

## Como funciona

- `checkAccessibility` aponta imagens sem `alt`, títulos que pulam níveis, contraste abaixo de
  `accessibility.minContrast` e links como “clique aqui”.
- `checkLinks` chama `links.isReachable(href)` para cada link. Faça a verificação no servidor, para
  evitar bloqueio por CORS.
- `spellcheck.native` usa o corretor do navegador. `spellcheck.languageTool.endpoint` envia o texto a
  um servidor LanguageTool; use um servidor próprio para conteúdo sigiloso.
- `checkerPanel` lista os problemas, e `onIssues` entrega os resultados ao seu código.
