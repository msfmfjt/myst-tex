// .tex ページを LaTeX/PDF 出力時に元ソースのまま渡す MyST プラグイン。
// ページ全体を raw ノードで包み、tex には元ソースを、children には
// パース済み AST (HTML など他の出力用) を持たせる。
import fs from 'node:fs';

const texPassthrough = {
  name: 'tex-passthrough',
  doc: 'Pass original .tex source through verbatim for LaTeX/PDF exports.',
  stage: 'document',
  plugin: () => (tree, vfile) => {
    if (!vfile.path?.endsWith('.tex')) return;
    // \title{} は MyST がページタイトルとして出力するので本文からは除く
    const source = fs.readFileSync(vfile.path, 'utf8').replace(/^[ \t]*\\title\{.*\}[ \t]*\r?\n?/m, '');
    tree.children = [{ type: 'raw', tex: source, children: tree.children }];
  },
};

export default { name: 'TeX passthrough', transforms: [texPassthrough] };
