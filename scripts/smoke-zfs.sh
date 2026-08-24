#!/usr/bin/env bash
# Destructive only to a newly-created, uniquely-named file-backed pool.
# It refuses any caller-supplied pool name that is not prefixed effectzfs_test_.
set -euo pipefail

for cmd in zfs zpool truncate mktemp; do
  command -v "$cmd" >/dev/null 2>&1 || { echo "missing required command: $cmd" >&2; exit 2; }
done

if [[ "${EUID}" -eq 0 ]]; then
  ZRUN=()
elif command -v sudo >/dev/null 2>&1; then
  ZRUN=(sudo)
else
  echo "need root or sudo for zpool create/destroy" >&2
  exit 2
fi

POOL="${EFFECT_ZFS_TEST_POOL:-effectzfs_test_${$}_$(date +%s)}"
case "$POOL" in
  effectzfs_test_*) ;;
  *) echo "refusing non-test pool name: $POOL" >&2; exit 64 ;;
esac

if "${ZRUN[@]}" zpool list -H -o name "$POOL" >/dev/null 2>&1; then
  echo "refusing to touch an existing pool: $POOL" >&2
  exit 64
fi

TMP="$(mktemp -d -t effect-zfs.XXXXXX)"
DISK_A="$TMP/vdev-a.img"
DISK_B="$TMP/vdev-b.img"
truncate -s 256M "$DISK_A" "$DISK_B"
created=0
cleanup() {
  set +e
  if [[ "$created" -eq 1 ]]; then
    "${ZRUN[@]}" zpool destroy -f "$POOL" >/dev/null 2>&1
  fi
  rm -rf "$TMP"
}
trap cleanup EXIT INT TERM

echo "creating disposable pool $POOL in $TMP"
"${ZRUN[@]}" zpool create -f -O mountpoint=none "$POOL" mirror "$DISK_A" "$DISK_B"
created=1

"${ZRUN[@]}" zpool list -Hp "$POOL" >/dev/null
# Linux ZFS 2.2.2 has no `zpool status -j`. `-p` is parsable on every
# supported version; JSON is an optional 2.3+ path in the library.
if "${ZRUN[@]}" zpool status -j -p "$POOL" >/dev/null 2>&1; then
  :
else
  "${ZRUN[@]}" zpool status -p "$POOL" >/dev/null
fi

"${ZRUN[@]}" zfs create -o mountpoint=none -o compression=lz4 "$POOL/source"
compression="$("${ZRUN[@]}" zfs get -Hp -o value compression "$POOL/source")"
[[ "$compression" == "lz4" ]] || { echo "unexpected compression=$compression" >&2; exit 1; }

"${ZRUN[@]}" zfs set atime=off "$POOL/source"
atime="$("${ZRUN[@]}" zfs get -Hp -o value atime "$POOL/source")"
[[ "$atime" == "off" ]] || { echo "unexpected atime=$atime" >&2; exit 1; }

"${ZRUN[@]}" zfs snapshot "$POOL/source@seed"
"${ZRUN[@]}" zfs clone -o mountpoint=none "$POOL/source@seed" "$POOL/clone"
"${ZRUN[@]}" zfs get -Hp -o value compression "$POOL/clone" >/dev/null

# Exercise the stream boundary without buffering the stream in a file.
"${ZRUN[@]}" zfs send "$POOL/source@seed" | "${ZRUN[@]}" zfs receive -u "$POOL/received"
"${ZRUN[@]}" zfs list -H "$POOL/received" >/dev/null

echo "OpenZFS CLI smoke test passed for $POOL"
