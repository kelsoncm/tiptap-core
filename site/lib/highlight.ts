import bash from 'highlight.js/lib/languages/bash';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';

const lowlight = createLowlight({ typescript, xml, bash });

interface HastNode {
  type: string;
  value?: string;
  tagName?: string;
  properties?: { className?: string[] };
  children?: HastNode[];
}

function toDom(node: HastNode, parent: Node): void {
  if (node.type === 'text') {
    parent.appendChild(document.createTextNode(node.value ?? ''));
    return;
  }
  let target = parent;
  if (node.type === 'element') {
    const span = document.createElement('span');
    if (node.properties?.className) span.className = node.properties.className.join(' ');
    parent.appendChild(span);
    target = span;
  }
  for (const child of node.children ?? []) toDom(child, target);
}

/** Fills `code` with highlighted `source` (built from DOM nodes, never from HTML strings). */
export function highlightInto(code: HTMLElement, source: string, language: string): void {
  code.replaceChildren();
  code.className = `hljs language-${language}`;
  if (!lowlight.registered(language)) {
    code.textContent = source;
    return;
  }
  toDom(lowlight.highlight(language, source) as HastNode, code);
}
