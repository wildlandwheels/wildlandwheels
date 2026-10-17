#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/.." && pwd)"

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  echo "usage: bash scripts/check.sh [dist-dir|--self-test]"
  exit 0
fi

if [[ "${1:-}" == "--self-test" ]]; then
  exec python3 "$root/scripts/check_site.py" --self-test
fi

target="${1:-$root/dist}"
if [[ ! -d "$target" ]]; then
  echo "check: $target does not exist. Run bash scripts/build.sh first." >&2
  exit 2
fi

exec python3 "$root/scripts/check_site.py" "$target"
