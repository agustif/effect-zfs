# TASKS

## Done

- [x] Workspace/package scaffold.
- [x] OpenZFS property C-table parser (register forms, impl, mc_props, onetime-default, C string concat, vdev skip).
- [x] Index/enum table extraction and `ZFS_TYPE_DATASET` mask expansion.
- [x] Applicability / mutability extraction; hidden properties stay out of the public object.
- [x] Property and error semantic patch layers.
- [x] `zfs_error_t` extraction with comment stripping.
- [x] Smithy 2.0 model + Effect generator (`Schema.TaggedError`, `defineProperty` + codecs).
- [x] Codegen against vendor OpenZFS `84aa7e7e09f6a4ddad9ec40dbe9498d50184ed07` (265 extracted / 188 dataset+pool public + vdev properties, 103 libzfs codes, patched error classes, 91 operations).
- [x] Effect `4.0.0-rc.111` + TypeScript 5.9.3; `tsc --noEmit` and property type tests clean.
- [x] `Context.Service` domain API: `Datasets`, `Pools`, `Snapshots`, `Bookmarks`, `Replication`, `Crypto`, `Mount`, `Delegations`, `Quotas`.
- [x] `Schema.Class` models, branded names, Schema codecs (`BooleanFromOnOff`, `BigIntFromString`).
- [x] Typed `ZfsProtocol` operations (not argv). `Cli.protocolLayer` is the CLI adapter; `ZfsProcess` is CLI-only.
- [x] `ZfsProtocol.testLayer` / `Test.layer` typed handlers.
- [x] `NativeBindings` + `Native.layerFrom` + `classifyNativeError` (`errorValueToCode` for numeric `libzfs_errno()`).
- [x] Streaming send/receive: concurrent stderr drain, post-EOF exit check, typed stdin errors, Scope interrupt/reap.
- [x] Conservative CLI classifier gated by generated per-operation tags.
- [x] Host tests: codegen + Vitest (process/classify/property/protocol/native/limits/version plus slice suites).
- [x] Guarded `scripts/smoke-zfs.sh`; Lima Ubuntu 24.04 / Linux ZFS 2.2.2 smoke passed.
- [x] JSON-then-text pool status for 2.2.2 vs 2.3+ (inside `Cli.protocolLayer`).
- [x] Schema-typed operation args (`Args.*`), OpenZFS limits (`Limits.*`), `zfs_namecheck` names.
- [x] Version-split tests: `test/version/2.2.2`, `test/version/2.3`, `test/live/2.2.2`, `test/live/2.3`.
- [x] Lima live Vitest: guest-local `~/.cache/effect-zfs-live` + `npm ci`; 10 live 2.2.2 tests green. 2.3 live skipped on 2.2.2.
- [x] README / architecture / examples updated to the service API.
- [x] Replication complete: incremental send/receive, resume, send space, abort receive.
- [x] Crypto: load/unload/change-key (`Redacted`).
- [x] Snapshot lifecycle: rollback, promote, rename, holds, snapshot list, bookmarks.
- [x] Pool topology: `Vdev` AST, create/destroy/import/export, attach/replace/add/remove, online/offline.
- [x] Mount/share/unmount/unshare.
- [x] Pool health: scrub, resilver, trim, initialize, clear, wait, events, iostat, history, prefetch, sync, reopen.
- [x] Delegated allow/unallow, userspace/project quotas, channel program, redact, checkpoint, bootenv, zone, ddt prune, condense.

## Remaining for v0

- [x] Encrypted dataset / key stdin **live** tests (`Redacted`) — present in `test/live/2.2.2.test.ts`.
- [x] Permission-denied live case via `su nobody` `zfs list` (classifier + live test; does not touch non-test pools).
- [x] Dataset `zfs upgrade` (filesystem version).
- [x] Vdev properties (`zpool get/set` + `lzc_get/set_vdev_prop` contract).
- [x] Native protocol: `unboundBindings` (no silent voids) + optional Linux `libzfs_core` koffi FFI for `lzc_exists` / destroy / rename / promote / checkpoint / reopen / rollback_to / unload_key. Remaining native ops fail `NativeFailure`.
- [x] Run `test/live/2.3.test.ts` on Lima Ubuntu 25.04 (`effect-zfs-2.3`, zfsutils-linux 2.3.1). `npm run test:live:2.3`.
- [ ] Full libzfs list/mount/pool-create `.node` and CLI-vs-native differential tests on Linux.

Do not add Alchemy-style reconciliation. Expand `ZfsProtocol` + `Args` + `spec/operations.json` per remaining hole only.
