#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../../.." && pwd)"
pidfile="$root/artifacts/verify-wildlandwheels/server.pid"

if [[ ! -f "$pidfile" ]]; then
  echo "cleanup: no server.pid"
  exit 0
fi

pid="$(tr -d '[:space:]' < "$pidfile")"
if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
  cmd="$(tr '\0' ' ' < "/proc/$pid/cmdline" || true)"
  case "$cmd" in
    *http.server*)
      kill "$pid"
      for _ in 1 2 3 4 5 6 7 8 9 10; do
        kill -0 "$pid" 2>/dev/null || break
        sleep 0.2
      done
      if kill -0 "$pid" 2>/dev/null; then
        echo "cleanup: pid $pid did not exit" >&2
        exit 1
      fi
      echo "cleanup: stopped pid $pid"
      ;;
    *)
      echo "cleanup: refused to kill pid $pid ($cmd)" >&2
      exit 1
      ;;
  esac
else
  echo "cleanup: pid $pid was not running"
fi

rm -f "$pidfile"
echo "cleanup: evidence kept in $root/artifacts/verify-wildlandwheels"
