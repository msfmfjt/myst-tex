#!/usr/bin/env bash
# Build the PDF with and without the tex-passthrough plugin and render each
# body page (everything after the title page) to PNG for comparison.
# Requires latexmk/LuaLaTeX and pdftoppm/pdfinfo (poppler-utils).
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
out="$root/_build/compare"
rm -rf "$out"
mkdir -p "$out"

build_pdf() { # <project dir> <output name>
  (cd "$1" && "$root/node_modules/.bin/myst" build --pdf)
  cp "$1/_build/pdf/book.pdf" "$out/$2.pdf"
  local pages
  pages="$(pdfinfo "$out/$2.pdf" | awk '/^Pages:/ {print $2}')"
  for ((p = 2; p <= pages; p++)); do
    pdftoppm -f "$p" -l "$p" -r 110 -png -singlefile "$out/$2.pdf" "$out/$2-p$p"
  done
}

build_pdf "$root" with-plugin

# Same project and template, with the plugin removed from myst.yml
tmp="$(mktemp -d)"
trap 'rm -rf "$tmp"' EXIT
rsync -a --exclude node_modules --exclude _build --exclude .git "$root/" "$tmp/"
ln -s "$root/node_modules" "$tmp/node_modules"
sed -i.bak '/^  plugins:$/d; /tex-passthrough\.mjs$/d' "$tmp/myst.yml"
if grep -q tex-passthrough.mjs "$tmp/myst.yml"; then
  echo "failed to remove the plugin from myst.yml" >&2
  exit 1
fi
build_pdf "$tmp" without-plugin

ls -l "$out"
