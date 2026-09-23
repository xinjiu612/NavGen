#!/usr/bin/env bash
#
# Install / remove a systemd *user* service so the site comes back by itself
# after a reboot, with no terminal involved.
#
#   ./install-service.sh install     enable + start now, and on every boot
#   ./install-service.sh uninstall   disable + stop
#   ./install-service.sh status      show state and the URLs
#
# Requires systemd and (for start-on-boot-without-login) lingering, which the
# install step turns on for you.
#
set -euo pipefail

HERE="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
PROJECT="$(dirname "$HERE")"
UNIT_NAME="paper-site-v2.service"
UNIT_SRC="$HERE/$UNIT_NAME"
UNIT_DST="$HOME/.config/systemd/user/$UNIT_NAME"
PORT=5299

urls() {
  echo "  local     http://127.0.0.1:${PORT}/"
  ip -4 addr show 2>/dev/null \
    | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.' \
    | while read -r ip; do echo "  network   http://${ip}:${PORT}/"; done
}

case "${1:-install}" in
  install)
    if [ ! -d "$PROJECT/dist" ]; then
      echo "dist/ is missing — run 'npm run build' in $PROJECT first."
      exit 1
    fi
    mkdir -p "$HOME/.config/systemd/user"
    # Keep the unit in sync with the real paths on this machine.
    sed -e "s#^WorkingDirectory=.*#WorkingDirectory=$PROJECT#" \
        -e "s#^ExecStart=.*#ExecStart=$(command -v node || echo /home/hxj/.local/share/fnm/node-versions/v22.22.0/installation/bin/node) $PROJECT/node_modules/vite/bin/vite.js preview --host 0.0.0.0 --port $PORT --strictPort#" \
        "$UNIT_SRC" >"$UNIT_DST"

    systemctl --user daemon-reload
    systemctl --user enable --now "$UNIT_NAME"
    loginctl enable-linger "$USER" 2>/dev/null \
      || echo "  (could not enable lingering; the service will start when you log in)"
    sleep 1
    echo
    systemctl --user --no-pager --lines=0 status "$UNIT_NAME" || true
    echo
    urls
    ;;

  uninstall)
    systemctl --user disable --now "$UNIT_NAME" 2>/dev/null || true
    rm -f "$UNIT_DST"
    systemctl --user daemon-reload
    echo "Removed $UNIT_NAME."
    ;;

  status)
    systemctl --user --no-pager --lines=0 status "$UNIT_NAME" || true
    echo
    urls
    ;;

  *)
    sed -n '3,13p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac
