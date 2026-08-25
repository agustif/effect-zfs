#!/usr/bin/env bash
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
rev="${1:-$(cat "$root/vendor/openzfs.rev")}"
dest="$root/vendor/openzfs"
if [[ ! -d "$dest/.git" ]]; then
  git clone --filter=blob:none --sparse https://github.com/openzfs/zfs.git "$dest"
  git -C "$dest" sparse-checkout set module/zcommon include
fi
if [[ "$rev" == zfs-* ]]; then
  git -C "$dest" fetch --depth 1 origin "refs/tags/${rev}:refs/tags/${rev}"
else
  git -C "$dest" fetch --depth 1 origin "$rev"
fi
git -C "$dest" checkout --detach "$rev"
echo "openzfs $rev"
