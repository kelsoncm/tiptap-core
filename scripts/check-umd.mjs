// Smoke test of the UMD build: runs it as a plain script and checks the exports used by
// the Moodle editor (editor_tiptap) and its subplugins.
import { readFileSync } from 'node:fs';
import { createContext, runInContext } from 'node:vm';

const file = 'dist-umd/kelsoncm-tiptap-core.umd.js';
const source = readFileSync(file, 'utf8');
if (source.includes('process.env')) {
  console.error(`${file}: contém process.env (não existe no navegador).`);
  process.exit(1);
}
// Runs it as a browser script would (no module loader): it must set the global.
const context = createContext({});
runInContext(source, context);
const lib = context.KelsonTiptap ?? {};
const expected = [
  'createEditorUI',
  'createWidget',
  'builtInMessages',
  'officePlugin',
  'Node',
  'Mark',
  'Extension',
  'mergeAttributes',
];
const missing = expected.filter((name) => !(name in lib));
if (missing.length) {
  console.error(`${file}: exportações ausentes: ${missing.join(', ')}`);
  process.exit(1);
}
console.log(
  `${file}: ok (${Object.keys(lib).length} exportações, ${Object.keys(lib.builtInMessages.en).length} textos em inglês)`,
);
