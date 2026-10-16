#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../../.." && pwd)"
port="${PORT:-4173}"
base="http://127.0.0.1:${port}"
pidfile="$root/artifacts/verify-wildlandwheels/server.pid"

if [[ ! -f "$pidfile" ]]; then
  echo "doctor: no server.pid at $pidfile" >&2
  exit 1
fi

pid="$(tr -d '[:space:]' < "$pidfile")"
if [[ ! "$pid" =~ ^[0-9]+$ ]] || ! kill -0 "$pid" 2>/dev/null; then
  echo "doctor: pid $pid is not running" >&2
  exit 1
fi

cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline")"
case "$cmd" in
  *http.server*"$port"*dist*) ;;
  *)
    echo "doctor: pid $pid is not this preview ($cmd)" >&2
    exit 1
    ;;
esac

home_html="$(curl -fsS "$base/")"
photo_html="$(curl -fsS "$base/photography")"
case_html="$(curl -fsS "$base/work/farm-truck-brewing")"

grep -q "People. Places. A closer look." <<<"$home_html"
grep -q "An alpine afternoon" <<<"$photo_html"
grep -q "/photos/archive-01.jpg" <<<"$photo_html"
grep -q "Farm Truck" <<<"$case_html"

echo "doctor: ok $base pid $pid"
