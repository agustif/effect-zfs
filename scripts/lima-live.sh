#!/usr/bin/env bash
# Run the Linux ZFS 2.2.2+ live suite inside the Lima VM. Never uses macOS OpenZFS.
# The guest mount of $HOME is read-only virtiofs; Linux native bindings are
# installed under ~/.cache/effect-zfs-live inside the VM.
set -euo pipefail
root="$(cd "$(dirname "$0")/.." && pwd)"
if ! command -v limactl >/dev/null 2>&1; then
  echo "limactl is required (Linux guest with a real distro kernel, not OrbStack)" >&2
  exit 2
fi
instance="${EFFECT_ZFS_LIMA:-effect-zfs}"
if ! limactl list -q 2>/dev/null | grep -qx "$instance"; then
  echo "Lima instance $instance is not running. Create it with:" >&2
  if [[ "$instance" == "effect-zfs-2.3" ]]; then
    echo "  limactl start --yes $root/scripts/lima/effect-zfs-2.3.yaml" >&2
  elif [[ "$instance" == "effect-zfs-2.4" ]]; then
    echo "  limactl start --yes $root/scripts/lima/effect-zfs-2.4.yaml" >&2
  else
    echo "  limactl start --yes --name=effect-zfs --cpus=4 --memory=4 --disk=20 --containerd=none --vm-type=vz template://ubuntu-24.04" >&2
  fi
  exit 2
fi

limactl shell "$instance" -- env \
  EFFECT_ZFS_GUEST_ROOT="${EFFECT_ZFS_GUEST_ROOT:-}" \
  bash "$root/scripts/lima-guest-live.sh" "$root"
