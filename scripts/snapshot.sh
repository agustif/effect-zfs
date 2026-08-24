#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
out="${1:-$root/effect-zfs-snapshot.zip}"
rm -f "$out"
cd "$root"
zip -qr "$out" . -x '*.zip' 'node_modules/*' 'dist/*'
echo "$out"
