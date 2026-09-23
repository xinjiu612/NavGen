#!/usr/bin/env bash
#
# Serve this site in the background so it keeps running after the terminal
# closes — and after the DSH session ends.
#
#   ./serve.sh start [port]     build if needed, then serve on 0.0.0.0
#   ./serve.sh stop             stop it
#   ./serve.sh status           is it up, and on which URLs
#   ./serve.sh log              tail the server log
#   ./serve.sh dev [port]       run the Vite dev server instead (foreground)
#
# Binds 0.0.0.0 rather than 127.0.0.1 so the page is also reachable from your
# phone, another laptop on the same Wi-Fi, or over ZeroTier. Pass a different
# port as the second argument if 5299 is taken.
#
set -euo pipefail

cd "$(dirname "$(readlink -f "$0")")"

PORT="${2:-5299}"
PIDFILE=".serve.pid"
LOGFILE=".serve.log"

# The default npm cache may live on a read-only mount on this machine.
NPM_CACHE="../.npm-cache"
[ -d "$NPM_CACHE" ] || NPM_CACHE="$PWD/.npm-cache"

urls() {
  echo "  local     http://127.0.0.1:${PORT}/"
  # every non-loopback IPv4 on this host
  ip -4 addr show 2>/dev/null \
    | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' \
    | while read -r ip; do echo "  network   http://${ip}:${PORT}/"; done
}

alive() {
  [ -f "$PIDFILE" ] || return 1
  local pid; pid="$(cat "$PIDFILE" 2>/dev/null)"
  [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null
}

case "${1:-start}" in
  start)
    if alive; then
      echo "Already running (pid $(cat "$PIDFILE"))."
      urls
      exit 0
    fi

    if [ ! -d node_modules ]; then
      echo "Installing dependencies ..."
      npm install --no-audit --no-fund --cache "$NPM_CACHE" >/dev/null
    fi

    if [ ! -d dist ] || [ -n "$(find src index.html -newer dist/index.html 2>/dev/null)" ]; then
      echo "Building ..."
      npm run build >/dev/null
    fi

    echo "Serving on 0.0.0.0:${PORT} ..."
    # setsid puts the server in its own session, so it survives this shell
    # exiting (nohup alone does not escape the caller's process group).
    setsid nohup npx vite preview --host 0.0.0.0 --port "$PORT" --strictPort \
      >"$LOGFILE" 2>&1 < /dev/null &
    disown 2>/dev/null || true

    # The PID of the npx wrapper is not the PID of the server, so read the
    # listener straight off the socket table once it comes up.
    pid=""
    for _ in $(seq 1 60); do
      pid="$(ss -ltnp 2>/dev/null | grep -F ":${PORT} " \
             | grep -oP 'pid=\K[0-9]+' | head -1 || true)"
      if [ -n "$pid" ]; then break; fi
      sleep 0.25
    done
    [ -n "$pid" ] && echo "$pid" >"$PIDFILE"

    if [ -n "$pid" ]; then
      echo "Up (pid ${pid}). Open:"
      urls
    else
      echo "Failed to start. Log:"
      tail -20 "$LOGFILE"
      exit 1
    fi
    ;;

  stop)
    if alive; then
      kill "$(cat "$PIDFILE")" && echo "Stopped (pid $(cat "$PIDFILE"))."
    else
      echo "Not running."
    fi
    rm -f "$PIDFILE"
    ;;

  restart)
    "$0" stop || true
    "$0" start "$PORT"
    ;;

  status)
    if alive; then
      echo "Running (pid $(cat "$PIDFILE")). Open:"
      urls
    else
      echo "Not running."
    fi
    ;;

  log)
    tail -n 40 -f "$LOGFILE"
    ;;

  dev)
    exec npx vite --host 0.0.0.0 --port "$PORT"
    ;;

  *)
    sed -n '3,16p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
