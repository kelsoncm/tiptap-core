# Estilos e temas

<p class="lead">O CSS do editor é pequeno e configurável por variáveis <code>--kt-*</code>. Este site usa o
<a href="https://abrasileirado.github.io/dsgovbr-bootstrapped/">dsgovbr-bootstrapped</a> (GOV.BR DS) e
segue o modo claro/escuro escolhido no topo.</p>

## Variáveis

```css
.kt-editor {
  --kt-border: #c5c5c5;
  --kt-bg: #fff;
  --kt-fg: #1b1b1b;
  --kt-muted: #6b6b6b;
  --kt-accent: #1351b4; /* azul GOV.BR */
  --kt-active-bg: #dbe8fb;
  --kt-hover-bg: #f0f0f0;
  --kt-radius: 6px;
  --kt-min-height: 160px;
  --kt-region-bg: #fff6d6; /* regiões editáveis */
  --kt-region-border: #e0b400;
}
```

Sobrescreva só o que precisar, num seletor mais específico:

```css
.meu-formulario .kt-editor {
  --kt-accent: #168821;
  --kt-radius: 0;
}
```

## Modo escuro

O core não força um tema escuro. Redefina as variáveis quando a página estiver no modo escuro (como faz
este site com o `data-bs-theme` do Bootstrap):

```css
[data-bs-theme='dark'] .kt-editor {
  --kt-border: #4a4f57;
  --kt-bg: #1e2228;
  --kt-fg: #e6e6e6;
  --kt-muted: #a3a3a3;
  --kt-accent: #8cb4ff;
  --kt-active-bg: #23395d;
  --kt-hover-bg: #2b3038;
}
```

## Com o GOV.BR DS

1. Carregue o tema e o CSS do editor:

```html
<link rel="stylesheet" href="dsgovbr-bootstrapped.min.css" />
<script src="dsgovbr-bootstrapped-modo.js"></script>
```

2. Use as classes do Bootstrap ao redor do editor (`.form-label`, `.card`, `.btn`); o tema aplica a
   aparência do GOV.BR DS.
3. Mantenha `--kt-accent: #1351b4`, a cor primária do GOV.BR DS.

## Ícones

Os ícones padrão são texto, sem dependências. Para Font Awesome ou SVG, passe `renderIcon`:

```ts
createEditorUI(host, {
  renderIcon: (icon) => {
    const i = document.createElement('i');
    i.className = `fa-solid fa-${icon}`;
    i.setAttribute('aria-hidden', 'true');
    return i;
  },
});
```

## Estilos nomeados

`customStyles` aplica classes CSS suas a blocos ou trechos (ex.: “Destaque”, “Marca-texto”), escolhidas
numa lista da barra:

```ts
createEditorUI(host, {
  customStyles: [
    { id: 'lead', label: 'Destaque', kind: 'block', className: 'lead' },
    { id: 'marker', label: 'Marca-texto', kind: 'inline', className: 'marcador' },
  ],
});
```
