// サンプルプロジェクトを実際にビルドして出力を確認するテスト
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const readJson = (p) => JSON.parse(read(p));

function findAll(node, type, found = []) {
  if (node.type === type) found.push(node);
  for (const child of node.children ?? []) findAll(child, type, found);
  return found;
}

before(() => {
  fs.rmSync(path.join(root, '_build/exports'), { recursive: true, force: true });
  execFileSync(path.join(root, 'node_modules/.bin/myst'), ['build', '--tex', '--html'], {
    cwd: root,
    stdio: 'pipe',
  });
});

test('LaTeX 出力: .tex ページの本文が元ソース (\\title 除く) と一致する', () => {
  const source = read('chapters/intro.tex').replace(/^\\title\{.*\}\n/m, '');
  const exported = read('_build/exports/book-intro.tex');
  assert.equal(exported, `\\section{はじめに}\n\n${source}`.trimEnd());
});

test('LaTeX 出力: テンプレートのプリアンブルと各ページの include', () => {
  const book = read('_build/exports/book.tex');
  for (const pkg of ['amsmath', 'amssymb', 'luatexja']) {
    assert.match(book, new RegExp(`\\\\usepackage\\{${pkg}\\}`));
  }
  assert.match(book, /\\include\{book-intro\}/);
  assert.match(book, /\\include\{book-methods\}/);
});

test('HTML: .tex ページのタイトルが \\title{} から付く', () => {
  const pages = readJson('_build/html/config.json').projects[0].pages;
  assert.deepEqual(
    pages.map((p) => [p.slug, p.title]),
    [['intro', 'はじめに'], ['methods', '手法']],
  );
});

test('HTML: raw ノードの中の構文木が描画される', () => {
  const [raw] = readJson('_build/html/intro.json').mdast.children;
  assert.equal(raw.type, 'raw');
  assert.ok(findAll(raw, 'math').length > 0);
  const html = read('_build/html/intro/index.html');
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  assert.match(article, /<li[^>]*>.*項目1/s);
});

test('HTML: Markdown から TeX 側のラベルへの相互参照が解決される', () => {
  const refs = findAll(readJson('_build/html/methods.json').mdast, 'crossReference');
  const byId = Object.fromEntries(refs.map((r) => [r.identifier, r]));
  assert.equal(byId['sec:intro']?.resolved, true);
  assert.equal(byId['sec:intro']?.url, '/intro');
  assert.equal(byId['eq:euler']?.resolved, true);
  assert.equal(byId['eq:euler']?.enumerator, '1');
});
