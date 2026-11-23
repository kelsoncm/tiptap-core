// Gera as páginas do site em site/www/ a partir de um layout único (site/layout.html), do menu
// (site/nav.json) e do conteúdo em Markdown (site/content/**/*.md).
//
// Cada página do menu tem um arquivo de conteúdo com o mesmo caminho (exemplos/oficio.html ->
// content/exemplos/oficio.md). O Markdown aceita HTML; os exemplos ao vivo são marcados com
// <div data-example="id"></div> e montados no navegador por site/lib/example.ts.
//
// Uso: node site/build-pages.mjs (o vite.config.ts também chama generatePages()).
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, posix } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { common, createLowlight } from 'lowlight';
import { Marked } from 'marked';

const SITE = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const lowlight = createLowlight(common);

const escapeHtml = (text) =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');

const slug = (text) =>
  text
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/<[^>]+>/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Serializa a árvore hast do lowlight (só elementos <span> e texto). */
function hastToHtml(node) {
  if (node.type === 'text') return escapeHtml(node.value);
  const inner = (node.children ?? []).map(hastToHtml).join('');
  if (node.type !== 'element') return inner;
  const classes = node.properties?.className;
  return classes ? `<span class="${classes.join(' ')}">${inner}</span>` : `<span>${inner}</span>`;
}

const LANGUAGE_ALIASES = { html: 'xml', ts: 'typescript', js: 'javascript', sh: 'bash' };

export function highlight(code, lang) {
  const language = LANGUAGE_ALIASES[lang] ?? lang;
  if (language && lowlight.registered(language)) {
    return hastToHtml(lowlight.highlight(language, code));
  }
  return escapeHtml(code);
}

function createMarkdown() {
  const marked = new Marked({ gfm: true });
  marked.use({
    renderer: {
      code({ text, lang }) {
        const language = (lang ?? '').split(/\s/)[0] ?? '';
        return (
          `<div class="site-code"><button type="button" class="btn btn-sm site-copy" data-copy>Copiar</button>` +
          `<pre><code class="hljs${language ? ` language-${language}` : ''}">${highlight(text, language)}</code></pre></div>\n`
        );
      },
      heading({ tokens, depth }) {
        const html = this.parser.parseInline(tokens);
        if (depth === 1) return `<h1>${html}</h1>\n`;
        const id = slug(html);
        return `<h${depth} id="${id}">${html} <a class="site-anchor" href="#${id}" aria-label="Link para esta seção">#</a></h${depth}>\n`;
      },
      table(token) {
        const cell = (c, tag) =>
          `<${tag}${c.align ? ` class="text-${c.align === 'center' ? 'center' : c.align === 'right' ? 'end' : 'start'}"` : ''}>${this.parser.parseInline(c.tokens)}</${tag}>`;
        const head = token.header.map((c) => cell(c, 'th')).join('');
        const rows = token.rows
          .map((row) => `<tr>${row.map((c) => cell(c, 'td')).join('')}</tr>`)
          .join('');
        return `<div class="table-responsive"><table class="table table-sm"><thead><tr>${head}</tr></thead><tbody>${rows}</tbody></table></div>\n`;
      },
    },
  });
  return marked;
}

export function loadNav() {
  return JSON.parse(readFileSync(join(SITE, 'nav.json'), 'utf8'));
}

function renderNav(nav, current, root) {
  return nav.sections
    .map((section) => {
      const items = section.items
        .map((item) => {
          const active = item.path === current;
          return `<li><a class="site-nav-link${active ? ' active' : ''}" href="${root}${item.path}"${active ? ' aria-current="page"' : ''}>${escapeHtml(item.title)}</a></li>`;
        })
        .join('');
      return `<p class="site-nav-title">${escapeHtml(section.title)}</p><ul class="list-unstyled">${items}</ul>`;
    })
    .join('');
}

/** Cards da galeria: itens do menu que têm `example`. */
function renderGallery(nav, root) {
  const cards = nav.sections
    .flatMap((section) => section.items)
    .filter((item) => item.example)
    .map(
      (item) => `<div class="col"><a class="card h-100 site-card" href="${root}${item.path}">
  <div class="card-body">
    <h3 class="h5 card-title">${escapeHtml(item.title)}</h3>
    <p class="card-text">${escapeHtml(item.description ?? '')}</p>
  </div>
  <div class="card-footer site-card-tags">${(item.tags ?? []).map((tag) => `<span class="badge text-bg-light">${escapeHtml(tag)}</span>`).join(' ')}</div>
</a></div>`,
    )
    .join('\n');
  return `<div class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-3 site-gallery">${cards}</div>`;
}

/** Links "anterior / próxima" na ordem do menu. */
function renderPager(nav, current, root) {
  const items = nav.sections.flatMap((section) => section.items);
  const index = items.findIndex((item) => item.path === current);
  const prev = items[index - 1];
  const next = items[index + 1];
  const link = (item, label, cls) =>
    item
      ? `<a class="btn btn-outline-primary ${cls}" href="${root}${item.path}">${label}: ${escapeHtml(item.title)}</a>`
      : '<span></span>';
  return `<nav class="site-pager" aria-label="Navegação entre páginas">${link(prev, '← Anterior', '')}${link(next, 'Próxima →', 'ms-auto')}</nav>`;
}

/**
 * Gera site/www/ e devolve os caminhos dos HTML gerados (entradas do Vite).
 * @param {{ outDir?: string }} [options]
 */
export function generatePages(options = {}) {
  const outDir = options.outDir ?? join(SITE, 'www');
  const nav = loadNav();
  const layout = readFileSync(join(SITE, 'layout.html'), 'utf8');
  const version = JSON.parse(readFileSync(join(SITE, '..', 'package.json'), 'utf8')).version;
  const modeScript = readFileSync(
    require.resolve('@abrasileirado/dsgovbr-bootstrapped/dist/dsgovbr-bootstrapped-modo.js'),
    'utf8',
  );
  const marked = createMarkdown();

  rmSync(outDir, { recursive: true, force: true });
  const outputs = [];
  for (const item of nav.sections.flatMap((section) => section.items)) {
    const depth = item.path.split('/').length - 1;
    const root = '../'.repeat(depth);
    const source = join(SITE, 'content', item.path.replace(/\.html$/, '.md'));
    let markdown;
    try {
      markdown = readFileSync(source, 'utf8');
    } catch {
      throw new Error(`Conteúdo não encontrado para "${item.path}": crie ${source}.`);
    }
    let content = marked.parse(markdown);
    content = content
      .replace(/<p>\s*<!--\s*gallery\s*-->\s*<\/p>|<!--\s*gallery\s*-->/g, () =>
        renderGallery(nav, root),
      )
      .replaceAll('{{root}}', root)
      .replaceAll('{{version}}', version);

    const html = layout
      .replaceAll('{{title}}', escapeHtml(item.title))
      .replaceAll('{{description}}', escapeHtml(item.description ?? nav.description))
      // O comentário do arquivo traz "</script>": escapado para não fechar a tag antes da hora.
      .replace(
        '<!--mode-script-->',
        () => `<script>\n${modeScript.replaceAll('</script', '<\\/script')}\n</script>`,
      )
      .replace('{{nav}}', () => renderNav(nav, item.path, root))
      .replace('{{content}}', () => content)
      .replace('{{pager}}', () => renderPager(nav, item.path, root))
      .replaceAll('{{root}}', root)
      .replaceAll('{{version}}', version);

    const target = join(outDir, ...item.path.split('/'));
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, html);
    outputs.push(target);
  }
  return outputs;
}

export const pagePaths = () =>
  loadNav().sections.flatMap((section) => section.items.map((item) => posix.normalize(item.path)));

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const files = generatePages();
  console.log(`${files.length} páginas geradas em site/www/`);
}
