# Changelog

## 0.1.0 — 2026-08-25

First tagged release of `effect-zfs`. Effect v4 library for Linux OpenZFS 2.2.2–2.4.4.

### Surface

- 105 `ZfsProtocol` operations with CLI, Linux native (`libzfs_core` / `libzfs` via koffi), and test interpreters
- Nine domain services: Datasets, Pools, Snapshots, Bookmarks, Replication, Crypto, Mount, Delegations, Quotas
- Generated properties, libzfs error codes, operation IO, and Linux minor catalog from OpenZFS source plus patches

### Production notes

- On Linux, `Native.linuxLayer()` is the interpreter for ioctl-only ops
- CLI has no subcommand for obj-to-path, next-obj, obj-to-stats, events seek, or send-progress query
- `zinject`, `zpool freeze`, and `zfs remap` are often missing from Ubuntu `zfsutils-linux`
- `zpool trim|initialize|scrub -a` is typed and refused (would touch non-test pools)
- Live tests mutate only process-created pools named `effectzfs_test_*`

Peer: `effect@>=4.0.0-rc.111 <5`. This is not a 1.0 while Effect 4 is still an RC.
