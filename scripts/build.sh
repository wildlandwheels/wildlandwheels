#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"
dist="$root/dist"

rm -rf "$dist"
mkdir -p "$dist"

cp "$root/index.html" "$root/404.html" "$root/favicon.svg" "$dist/"
cp -R "$root/about" "$root/photography" "$root/journal" "$root/work" \
  "$root/css" "$root/js" "$root/photos" "$root/fonts" "$dist/"

node "$root/scripts/generate-images.mjs"

test -s "$dist/photos/image-manifest.json"
test -s "$dist/photos/derived/archive-01-480.webp"
test -s "$dist/photos/derived/archive-12-960.jpg"
test -s "$dist/index.html"
test -s "$dist/photography/index.html"
test -s "$dist/work/farm-truck-brewing/index.html"
test -s "$dist/about/index.html"
test -s "$dist/css/site.css"
test -s "$dist/js/gallery.js"
test -s "$dist/photos/archive-01.jpg"
test -s "$dist/photos/archive-12.jpg"
test -s "$dist/photos/lift-me-up-can-label.jpg"
test -s "$dist/fonts/Sora-Regular.woff2"
test -s "$dist/fonts/Sora-SemiBold.woff2"
test -s "$dist/fonts/FamiljenGrotesk-Regular.woff2"
test -s "$dist/fonts/FamiljenGrotesk-Bold.woff2"
test -s "$dist/fonts/LICENSE-sora.txt"
test -s "$dist/fonts/LICENSE-familjen-grotesk.txt"
test ! -e "$dist/fonts/ApfelGrotezk-Regular.woff2"
test ! -e "$dist/fonts/ApfelGrotezk-Fett.woff2"
test -s "$dist/favicon.svg"

echo "Built static site in dist/"
