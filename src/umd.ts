/**
 * Entry of the single-file UMD build (`kelsoncm-tiptap-core.umd.js`, global `KelsonTiptap`),
 * for pages without a bundler such as Moodle's RequireJS. It also exposes the Tiptap primitives,
 * so plugins built on top of it reuse this copy of Tiptap instead of bundling another one.
 */
export * from './index.js';
export { docxToHtml, officePlugin, type MammothLike, type OfficePluginOptions } from './office.js';
export { Extension, Mark, mergeAttributes, Node } from '@tiptap/core';
