#!/usr/bin/env bash
set -euo pipefail

root="$(cd "$(dirname "$0")/../../../.." && pwd)"
cd "$root"
port="${PORT:-4173}"
log="$root/artifacts/verify-wildlandwheels/server.log"
pidfile="$root/artifacts/verify-wildlandwheels/server.pid"

bash "$root/scripts/build.sh"
mkdir -p "$root/artifacts/verify-wildlandwheels"

if [[ -f "$pidfile" ]]; then
  old="$(tr -d '[:space:]' < "$pidfile")"
  if [[ "$old" =~ ^[0-9]+$ ]] && kill -0 "$old" 2>/dev/null; then
    echo "launch: preview already running as pid $old" >&2
    exit 1
  fi
fi

if python3 - "$port" <<'PY'
import socket, sys
port = int(sys.argv[1])
sock = socket.socket()
code = sock.connect_ex(("127.0.0.1", port))
sock.close()
sys.exit(0 if code == 0 else 1)
PY
then
  echo "launch: 127.0.0.1:$port is already in use. Set PORT to a free port." >&2
  exit 1
fi

python3 -u -m http.server "$port" --bind 127.0.0.1 --directory dist >"$log" 2>&1 &
echo $! >"$pidfile"
server_pid="$(tr -d '[:space:]' < "$pidfile")"

for _ in 1 2 3 4 5 6 7 8 9 10 11 12 13 14 15; do
  if grep -q "Serving HTTP on 127.0.0.1 port $port" "$log" \
    && curl -fsS "http://127.0.0.1:$port/" | grep -q "People. Places. A closer look."; then
    echo "launch: ready http://127.0.0.1:$port pid $server_pid"
    exit 0
  fi
  if ! kill -0 "$server_pid" 2>/dev/null; then
    echo "launch: server exited" >&2
    cat "$log" >&2 || true
    exit 1
  fi
  sleep 0.2
done

echo "launch: timed out waiting for the hero heading" >&2
cat "$log" >&2 || true
exit 1
