#!/bin/zsh
set -euo pipefail

# Mission Control Plug-and-Play Launcher
# Usage: ./scripts/start-mission-control.sh [--build] [--port 4300]

export HOME="/Users/baileyeubanks"
export PATH="/Users/baileyeubanks/.local/bin:/Users/baileyeubanks/.nvm/versions/node/v22.22.0/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

REPO_DIR="/Users/baileyeubanks/Downloads/root-os-_-mission-control"
PORT="${PORT:-4300}"
BUILD="${BUILD:-0}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --build) BUILD=1; shift ;;
    --port) PORT="$2"; shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

cd "$REPO_DIR"

echo "=== Mission Control Launcher ==="
echo "Directory: $REPO_DIR"
echo "Port:      $PORT"
echo "Node:      $(node --version)"
echo ""

if [[ "$BUILD" == "1" ]]; then
  echo "→ Building production bundle..."
  npm run build
  echo "→ Starting production server..."
  NODE_ENV=production PORT="$PORT" npx tsx server.ts &
else
  echo "→ Starting dev server (vite + express)..."
  npm run dev &
fi

PID=$!
echo "→ Server PID: $PID"
echo "→ Health:     http://127.0.0.1:$PORT/api/health"
echo "→ Dashboard:  http://127.0.0.1:$PORT/admin"
echo ""
echo "Press Ctrl+C to stop"
wait $PID
