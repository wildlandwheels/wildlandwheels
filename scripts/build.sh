#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dist="$root/dist"

rm -rf "$dist"
mkdir -p "$dist"

cp "$root/index.html" "$root/404.html" "$root/favicon.svg" "$dist/"
cp -R "$root/about" "$root/photography" "$root/journal" "$root/admin" "$root/work" \
  "$root/css" "$root/js" "$root/photos" "$root/fonts" "$dist/"

test -s "$dist/index.html"
test -s "$dist/photography/index.html"
test -s "$dist/work/farm-truck-brewing/index.html"
test -s "$dist/about/index.html"
test -s "$dist/css/site.css"
test -s "$dist/js/gallery.js"
test -s "$dist/photos/archive-01.jpg"
test -s "$dist/photos/archive-12.jpg"
test -s "$dist/fonts/Sora-Regular.woff2"
test -s "$dist/favicon.svg"

echo "Built static site in dist/"
