#!/usr/bin/env bash
# Runs inside the Lima Ubuntu guest. Copies the bind-mounted (often read-only)
# tree to a VM-local directory, installs Linux native bindings there, then
# runs smoke + Vitest. Never writes the Darwin host node_modules.
set -euo pipefail

src="${1:-}"
if [[ -z "$src" || ! -f "$src/package-lock.json" ]]; then
  echo "usage: lima-guest-live.sh /path/to/effect-zfs-v0" >&2
  exit 2
fi

dest="${EFFECT_ZFS_GUEST_ROOT:-}"
if [[ -z "$dest" ]]; then
  dest="$HOME/.cache/effect-zfs-live"
fi
path="/usr/local/bin:/usr/sbin:/sbin:/usr/bin:/bin"
export PATH="$path"

mkdir -p "$dest"
rsync -a --delete \
  --exclude node_modules \
  --exclude .git \
  --exclude vendor \
  --exclude .generated-specs \
  --exclude .live-deps-stamp \
  "$src/" "$dest/"

cd "$dest"

stamp=".live-deps-stamp"
expected="$(sha256sum package-lock.json | awk '{print $1}') $(node -v) $(uname -m)"
# Previous `sudo vitest` can leave root-owned Vite caches that block npm ci.
sudo -n rm -rf node_modules/.vite node_modules/.cache 2>/dev/null || true
if [[ ! -x node_modules/.bin/vitest || "$(cat "$stamp" 2>/dev/null || true)" != "$expected" ]]; then
  echo "installing Linux node_modules in $dest"
  sudo -n rm -rf node_modules 2>/dev/null || true
  npm ci --no-audit --no-fund --include=optional
  npm rebuild koffi --silent >/dev/null 2>&1 || true
  printf '%s\n' "$expected" > "$stamp"
fi

sudo -n env PATH="$path" bash scripts/check-zfs-host.sh
sudo -n env PATH="$path" bash scripts/smoke-zfs.sh
# Full Vitest so test/live/* actually runs (it skipIfs on non-Linux).
sudo -n env PATH="$path" npx --no-install vitest run
