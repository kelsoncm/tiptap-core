# Widgets e comandos próprios

<p class="lead">Um plugin reúne extensões, comandos e traduções. Os comandos dele aparecem na barra e no
menu <code>/</code> como os do core, e o widget é salvo no HTML.</p>

<div data-example="widgets"></div>

## Como funciona

- `createWidget({ name, label, render, defaults, inline })` cria um nó atômico salvo como
  `<div data-widget="nome" data-attrs="…">`.
- Um `EditorPlugin` tem `name`, `extensions(i18n)`, `register(registry, i18n)` e `messages` por idioma.
- `registry.register({ id, labelKey, icon, group, isActive, isEnabled, run })` cria um comando. O `id`
  vale na barra, no menu `/` e em `ui.run(id)`.
- Sem plugin, `insertions.widgets` registra widgets simples com o comando `widget:nome`.

Veja também: [Plugins]({{root}}docs/plugins.html).
