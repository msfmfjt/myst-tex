// tex-passthrough プラグイン単体のテスト
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

test('.tex 以外のファイルは変更しない', () => {
  const { tree, children } = run('page.md', '# Title\n');
  assert.equal(tree.children, children);
});

test('.tex ページを raw ノードで包み、元ソースと構文木を保持する', () => {
  const source = '\\section{A}\\label{a}\n\\hspace{1cm}\n';
  const { tree, children } = run('page.tex', source);
  assert.equal(tree.children.length, 1);
  const [raw] = tree.children;
  assert.equal(raw.type, 'raw');
  assert.equal(raw.tex, source);
  assert.equal(raw.children, children);
});

test('\\title{} の行だけを除く', () => {
  const { tree } = run('titled.tex', '\\title{はじめに}\n\\subsection{背景}\n本文\n');
  assert.equal(tree.children[0].tex, '\\subsection{背景}\n本文\n');
});

test('\\title{} がなければソースはそのまま', () => {
  const source = '本文 \\textbf{x}\n';
  const { tree } = run('untitled.tex', source);
  assert.equal(tree.children[0].tex, source);
});
