# Remaining gaps (2026-08-25)

105 public ops on `ZfsProtocol` plus CLI and Linux native (`spec/operations.json`).

Do not skip tests or drop bindings to make CI green. Do not live-run `zpool trim|initialize|scrub -a` (touches non-test pools). Do not add Alchemy-style reconciliation.

Host last verified: `tsc` + Vitest + codegen tests (`npm test` / `npm run typecheck`). First tag: `0.1.0`.

Live last verified: Lima 2.2.2 (256 tests), 2.3.1 (261), 2.4.1 (266) all green after ioctl + native-live additions. Rewrite fail-clean before 2.4, success on 2.4.

---

## Closed this round

- Leftover ioctls are first-class ops: `Pool.Freeze`, `InjectFault`, `ClearFault`, `ListFaults`, `ErrorLog`, `SetVdevPath`, `SetVdevFru`, `Remap`, `Dataset.ObjToPath`, `DsobjToName`, `NextObj`, `ObjToStats`, `Mount.SmbAcl`.
- Native `Pool.Status` walks `vdev_tree` children with per-element `koffi.decode` (do not decode whole nvlist arrays) and folds `zpool_get_errlog` into `raw`.
- Import `unmounted` unmounts after import (`zfs_unmountall`). `ZFS_IMPORT_ONLY` is not “don’t mount”.
- CLI `trim` / `initialize` / `scrub` `all: true` is refused (same as native).
- Events `follow` blocks on `zpool_events_next`.
- Destroy extra snap names (`Destroy.names`) go through native `lzc_destroy_snaps`.
- Crypto `load-key -a` uses `zfs_crypto_attempt_load_keys`.
- Inject packs `zinject_record_t` into `zfs_cmd_t.zc_inject_record`.
- Native live cases added for attach/detach, split, quotas, history/iostat/events, vdev comment, encrypted load/unload, trim, mount `all`, freeze+export/import, status tree, listFaults/remap/nextObj/objToPath.
- Native `Pool.Events` `follow` blocks on `zpool_events_next` (`ZEVENT_NONE`) via koffi `async`. `eventsSeek` passes `ZEVENT_SEEK_START` / `ZEVENT_SEEK_END`.
- Native `Pool.Iostat` interval/`-y` samples emit ops/byte deltas from `vdev_stats`.
- CLI `Pool.SetVdevPath` / `SetVdevFru` use `zpool set path=` / `zpool set fru=`. Native `setVdevProperty` for `path`/`fru` routes to `ZFS_IOC_VDEV_SETPATH` / `SETFRU`.

---

## Still thinner / leftover

| Item | Reality |
| --- | --- |
| Linux CLI for freeze / remap / inject | `zpool freeze`, `zfs remap`, `zinject` — often missing on Ubuntu `zfsutils-linux`. Inject argv now matches `zinject` (`-e`/`-d`/`-D`/`-p`/`-a`/`-u`). Live CLI may still fail transport if the binary is absent; native is the real path. |
| Linux CLI for obj-to-path / next / stats / eventsSeek / sendProgress | No subcommand (or no query API). CLI handlers fail `UnknownZfsError`; native implements the ioctl/libzfs call. |
| Linux CLI setpath / fru | `zpool set path=` / `zpool set fru=` (vdev properties). Native still uses `ZFS_IOC_VDEV_SETPATH` / `SETFRU`. `fru` is readonly in the generated vdev table, so live `zpool set fru=` may fail `InvalidProperty`; native ioctl remains the real setter. |
| `CreateDatasetProperties` | Mapped TS bag over generated properties, not a generated `Schema.Class` of ~188 optionals. Service API stays the mapped bag. |
| Property wire values | Raw strings; per-property codecs live on `defineProperty.schema`. |
| Codegen boundary | Smithy generates properties, errors, operation IO, native catalog, `linuxReleases`. Args / `ZfsProtocol` / CLI argv / koffi stay handwritten. |

---

## Environment (not skip-as-green)

| Item | Reality |
| --- | --- |
| Darwin host `vitest` skips `test/live/*` | This process is not Linux. Live from this Mac: `npm run test:live` / `:2.3` / `:2.4` (Lima). |
| `ZFS_IOC_REWRITE` | Ubuntu 2.2.2 and 2.3.1: no `zfs rewrite`, file ioctl `ENOTTY`. Ubuntu 2.4: CLI + ioctl work. Live test **runs on all three** (fail before 2.4, success on 2.4). |

Do not live-run `zpool trim|initialize|scrub -a`.
