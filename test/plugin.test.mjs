// Unit tests for the tex-passthrough plugin
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import plugin from '../plugins/tex-passthrough.mjs';

const transform = plugin.transforms[0].plugin();
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tex-passthrough-'));

function run(file, source) {
  const filePath = path.join(tmp, file);
  fs.writeFileSync(filePath, source);
  const children = [{ type: 'paragraph', children: [{ type: 'text', value: 'parsed' }] }];
  const tree = { type: 'root', children };
  transform(tree, { path: filePath });
  return { tree, children };
}

test('leaves non-.tex files unchanged', () => {
  const { tree, children } = run('page.md', '# Title\n');
  assert.equal(tree.children, children);
});

test('wraps .tex pages in a raw node with the original source and the AST', () => {
  const source = '\\section{A}\\label{a}\n\\hspace{1cm}\n';
  const { tree, children } = run('page.tex', source);
  assert.equal(tree.children.length, 1);
  const [raw] = tree.children;
  assert.equal(raw.type, 'raw');
  assert.equal(raw.tex, source);
  assert.equal(raw.children, children);
});

test('removes only the \\title{} line', () => {
  const { tree } = run('titled.tex', '\\title{Introduction}\n\\subsection{Background}\nBody\n');
  assert.equal(tree.children[0].tex, '\\subsection{Background}\nBody\n');
});

test('keeps the source unchanged without \\title{}', () => {
  const source = 'Body \\textbf{x}\n';
  const { tree } = run('untitled.tex', source);
  assert.equal(tree.children[0].tex, source);
});
