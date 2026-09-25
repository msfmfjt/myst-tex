// MyST plugin that passes .tex pages to LaTeX/PDF exports as their original source.
// Wraps the whole page in a raw node: `tex` holds the original source and
// `children` holds the parsed AST (used by HTML and other outputs).
import fs from 'node:fs';

const texPassthrough = {
  name: 'tex-passthrough',
  doc: 'Pass original .tex source through verbatim for LaTeX/PDF exports.',
  stage: 'document',
  plugin: () => (tree, vfile) => {
    if (!vfile.path?.endsWith('.tex')) return;
    // MyST outputs \title{} as the page title, so drop it from the body
    const source = fs.readFileSync(vfile.path, 'utf8').replace(/^[ \t]*\\title\{.*\}[ \t]*\r?\n?/m, '');
    tree.children = [{ type: 'raw', tex: source, children: tree.children }];
  },
};

export default { name: 'TeX passthrough', transforms: [texPassthrough] };
