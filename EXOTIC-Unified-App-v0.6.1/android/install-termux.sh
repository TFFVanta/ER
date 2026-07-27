#!/data/data/com.termux/files/usr/bin/bash
set -e
ROOT="$HOME/exotic"
PORT=8787
pkg update -y
pkg install -y python
rm -rf "$ROOT"
mkdir -p "$ROOT"
cp -r "$(cd "$(dirname "$0")/.." && pwd)/app/." "$ROOT/"
cd "$ROOT"
termux-open-url "http://127.0.0.1:$PORT" || true
python -m http.server "$PORT" --bind 127.0.0.1
