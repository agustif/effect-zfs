#!/usr/bin/env bash
# Run the Linux ZFS 2.3+ live suite inside a Ubuntu 25.04 Lima guest.
# Separate instance from effect-zfs (Ubuntu 24.04 / ZFS 2.2.2).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export EFFECT_ZFS_LIMA=effect-zfs-2.3
# Guest-local cache (do not expand the Darwin $HOME — /Users/af is virtiofs read-only).
export EFFECT_ZFS_GUEST_ROOT="${EFFECT_ZFS_GUEST_ROOT:-}"
exec bash "$root/scripts/lima-live.sh"
