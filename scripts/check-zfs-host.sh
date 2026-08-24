#!/usr/bin/env bash
set -euo pipefail

missing=0
for cmd in zfs zpool truncate mktemp node npm git; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "missing: $cmd" >&2
    missing=1
  fi
done

if [[ "$missing" -ne 0 ]]; then
  exit 2
fi

echo "node:  $(node --version)"
echo "npm:   $(npm --version)"
echo "zfs:   $(zfs version 2>/dev/null | head -n 1 || zfs --version 2>/dev/null | head -n 1 || true)"
echo "zpool: $(zpool version 2>/dev/null | head -n 1 || true)"

if [[ "${EUID}" -ne 0 ]] && ! command -v sudo >/dev/null 2>&1; then
  echo "warning: not root and sudo is unavailable; disposable-pool tests may not run" >&2
fi
