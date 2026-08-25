#!/usr/bin/env bash
# Run the Linux ZFS 2.4+ live suite inside a Ubuntu 26.04 Lima guest.
# Separate instance from effect-zfs (2.2.2) and effect-zfs-2.3 (2.3.1).
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
export EFFECT_ZFS_LIMA=effect-zfs-2.4
# Guest-local cache (do not expand the Darwin $HOME — /Users/af is virtiofs read-only).
export EFFECT_ZFS_GUEST_ROOT="${EFFECT_ZFS_GUEST_ROOT:-}"
exec bash "$root/scripts/lima-live.sh"
