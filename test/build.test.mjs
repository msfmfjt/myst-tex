// Build the sample project and check its output
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

test('LaTeX: .tex page body matches the original source (minus \\title)', () => {
  const source = read('chapters/intro.tex').replace(/^\\title\{.*\}\n/m, '');
  const exported = read('_build/exports/book-intro.tex');
  assert.equal(exported, `\\section{Introduction}\n\n${source}`.trimEnd());
});

test('LaTeX: template preamble and per-page includes', () => {
  const book = read('_build/exports/book.tex');
  for (const pkg of ['amsmath', 'amssymb', 'luatexja']) {
    assert.match(book, new RegExp(`\\\\usepackage\\{${pkg}\\}`));
  }
  assert.match(book, /\\include\{book-intro\}/);
  assert.match(book, /\\include\{book-methods\}/);
});

test('HTML: .tex page title comes from \\title{}', () => {
  const pages = readJson('_build/html/config.json').projects[0].pages;
  assert.deepEqual(
    pages.map((p) => [p.slug, p.title]),
    [['intro', 'Introduction'], ['methods', 'Methods']],
  );
});

test('HTML: the AST inside the raw node is rendered', () => {
  const [raw] = readJson('_build/html/intro.json').mdast.children;
  assert.equal(raw.type, 'raw');
  assert.ok(findAll(raw, 'math').length > 0);
  const html = read('_build/html/intro/index.html');
  const article = html.slice(html.indexOf('<article'), html.indexOf('</article>'));
  assert.match(article, /<li[^>]*>.*Item 1/s);
});

test('HTML: cross-references from Markdown to TeX labels resolve', () => {
  const refs = findAll(readJson('_build/html/methods.json').mdast, 'crossReference');
  const byId = Object.fromEntries(refs.map((r) => [r.identifier, r]));
  assert.equal(byId['sec:intro']?.resolved, true);
  assert.equal(byId['sec:intro']?.url, '/intro');
  assert.equal(byId['eq:euler']?.resolved, true);
  assert.equal(byId['eq:euler']?.enumerator, '1');
});
