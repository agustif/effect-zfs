#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rev="$(cat "$root/vendor/openzfs.rev")"
dest="$root/vendor/openzfs"
if [[ ! -d "$dest/.git" ]]; then
  git clone --filter=blob:none --sparse https://github.com/openzfs/zfs.git "$dest"
  git -C "$dest" sparse-checkout set module/zcommon include
fi
git -C "$dest" fetch --depth 1 origin "$rev"
git -C "$dest" checkout --detach "$rev"
echo "openzfs $rev"
