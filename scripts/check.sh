#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "usage: bash scripts/check.sh [dist-dir|--self-test]"
  exit 0
fi

if [[ ! -d "$root/node_modules/playwright" ]]; then
  echo "check: install dependencies with npm install before the overflow check." >&2
  exit 1
fi

if [[ "${1:-}" == "--self-test" ]]; then
  status=0
  python3 "$root/scripts/check_site.py" --self-test || status=1
  node "$root/scripts/check_overflow.mjs" --self-test || status=1
  exit "$status"
fi

target="${1:-$root/dist}"
if [[ ! -d "$target" ]]; then
  echo "check: $target does not exist. Run bash scripts/build.sh first." >&2
  exit 2
fi

python3 "$root/scripts/check_site.py" "$target"
node "$root/scripts/check_overflow.mjs" "$target"
