// Check that the PDF compiles with LuaLaTeX (skipped without latexmk)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let hasLatexmk = true;
try {
  execFileSync('latexmk', ['-v'], { stdio: 'ignore' });
} catch {
  hasLatexmk = false;
}

test('builds the PDF', { skip: !hasLatexmk && 'latexmk not found' }, () => {
  const pdf = path.join(root, '_build/pdf/book.pdf');
  fs.rmSync(pdf, { force: true });
  execFileSync(path.join(root, 'node_modules/.bin/myst'), ['build', '--pdf'], {
    cwd: root,
    stdio: 'inherit',
  });
  assert.ok(fs.existsSync(pdf), `${pdf} was not generated`);
  assert.equal(fs.readFileSync(pdf).subarray(0, 5).toString(), '%PDF-');
});
