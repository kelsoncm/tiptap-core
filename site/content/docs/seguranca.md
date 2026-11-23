# Segurança

<p class="lead">O editor limita o que entra no documento, mas o HTML salvo vem do navegador de quem
digitou. Trate-o como entrada do usuário.</p>

## Sanitize no servidor

Antes de exibir o HTML a outras pessoas, sanitize-o no servidor com uma lista de tags e atributos
permitidos (por exemplo, `bleach` ou `nh3` em Python, HTML Purifier em PHP, DOMPurify em Node). O
editor nunca substitui essa etapa: uma requisição pode ser montada sem passar por ele.

## O que o editor já faz

- **Links**: só aceita `http`, `https`, `mailto`, `tel` e âncoras `#`. `javascript:` e similares são
  recusados. Domínios sem esquema (`ifrn.edu.br`) viram `https://`.
- **Incorporações**: vídeo, áudio e `<iframe>` só de hosts em `media.embedHosts`. O iframe recebe `sandbox`.
- **Colagem**: HTML do Word e do Google Docs é limpo (scripts e estilos removidos), e o resultado passa pelo esquema do editor.
- **Campos de mesclagem**: `fillMergeFieldsHTML` escapa os valores antes de inseri-los.
- **Código-fonte**: o HTML editado em `sourceCode` passa pelo mesmo esquema do editor; o que ele não
  conhece é descartado.

## Dados enviados a serviços externos

| Recurso                            | O que sai do navegador | Para onde                   |
| ---------------------------------- | ---------------------- | --------------------------- |
| `checkers.spellcheck.languageTool` | Texto do documento     | O `endpoint` configurado    |
| `links.isReachable`                | URLs dos links         | Seu endpoint                |
| `media.upload`                     | Arquivos enviados      | Seu endpoint                |
| `autosave.save`                    | HTML do documento      | Seu endpoint                |
| `dictation`                        | Áudio do microfone     | Serviço de voz do navegador |

Para conteúdo sigiloso, use servidores próprios (LanguageTool pode ser hospedado internamente) e
desligue o ditado.

## Rascunhos locais

`autosave.storageKey` guarda o HTML no `localStorage` do navegador. Em computadores compartilhados,
limpe o rascunho após o envio ou não use essa opção.

## Relatar vulnerabilidades

Veja a [política de segurança](https://github.com/tiptap-by-kelsoncm/tiptap-core/security/policy).
