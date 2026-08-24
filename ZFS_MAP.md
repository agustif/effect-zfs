# Full ZFS surface map

Goal: Linux **zfs(8) + zpool(8)** for **2.2.2+**, same `ZfsProtocol` / `Args` / services for CLI and native.

Legend:

| Mark | Meaning |
| --- | --- |
| **done** | Protocol + domain service, typed args, exercised (host and/or live 2.2.2) |
| **partial** | Present but missing flags, multi-target, or typed shape |
| **missing** | Not in `ZfsProtocol` / services |
| **libzfs** | Needs libzfs (list/props/status/topology), not only lzc |
| **lzc** | `libzfs_core` has a direct call |
| **2.3+** | CLI/JSON extra; skip on Ubuntu 24.04 2.2.2 |

Command lists are from Lima Ubuntu 24.04 **zfs-2.2.2**. Ioctl enum from vendor OpenZFS `sys/fs/zfs.h`.

---

## What v0 actually covers

91 operations in `spec/operations.json`. Every id has `ZfsProtocol` + `Cli.protocolLayer` + `NativeBindings`/`layerFrom` + `Schema.Class` args. Domain services yield `ZfsProtocol` only (Pool.program `argv` is Lua extras, not CLI). Native `unboundBindings` fail `NativeFailure`; Linux `linuxBindings` binds a `libzfs_core` subset via koffi.

| Id | Service | Native | Notes |
| --- | --- | --- | --- |
| Dataset.List / Get / Set / Inherit | `Datasets.*` | libzfs | `-t`/`-d`/`-s`/`-S`/`-o`, recursive get, `-u` set, `-r`/`-S` inherit |
| Dataset.CreateFilesystem / CreateVolume / Destroy | `Datasets.*` | `lzc_create` / `lzc_destroy` | `-n`/`-P`/`-u`/`-v`; vol `-b` `VolBlockSize`; destroy `-R`/`-n`/`-p`/`-v` and `@from%to` |
| Dataset.Upgrade / Exists | `Datasets.upgrade` / `exists` | libzfs / `lzc_exists` | Filesystem version 1–5; exists is boolean |
| Dataset.Rename | `Datasets.rename` | `lzc_rename` | `-p`/`-u`/`-f` |
| Dataset.Allow / Unallow / ListAllow | `Delegations.*` | libzfs FSACL | Schema.Class who/perms |
| Dataset.Userspace / Groupspace / Projectspace / Project | `Quotas.*` | libzfs / zpl | bigint accounting |
| Dataset.Wait / Diff / Zone / Unzone | `Datasets.*` / `Snapshots.diff` | `lzc_wait_fs` / `ZFS_IOC_DIFF` / userns | Zone is Linux-only |
| Snapshot.Create / Destroy / Clone | `Snapshots.*` | lzc | Multi-snap + `-o`; clone `-p`; destroy `%` ranges |
| Snapshot.List / Rollback / Promote / Rename | `Snapshots.*` | lzc + libzfs flags | |
| Snapshot.Hold / Holds / Release | `Snapshots.*` | `lzc_hold` / `get_holds` / `release` | |
| Snapshot.Redact | `Snapshots.redact` | `lzc_redact` | |
| Bookmark.Create / Destroy / List / Get | `Bookmarks.*` | `lzc_bookmark*` | Branded names |
| Pool.List / Get / Set / Status | `Pools.*` | libzfs | List extra `-o`; status vdev tree + `PoolHealth`; scan typed |
| Pool.GetVdev / SetVdev | `Pools.getVdev` / `setVdev` | `lzc_get/set_vdev_prop` | Generated `VdevProperty` |
| Pool.Create / Destroy | `Pools.*` | libzfs `zpool_create`/`destroy` | `Vdev` AST |
| Pool.Add / Remove / Attach / Detach / Replace / Split / Online / Offline | `Pools.*` | `zpool_vdev_*` | Branded `VdevId`/`DevicePath` |
| Pool.Import / Export / Reguid / Upgrade / LabelClear / Checkpoint | `Pools.*` | libzfs + `lzc_pool_checkpoint` | |
| Pool.Trim / Initialize / Clear / Reopen / Sync | `Pools.*` | lzc + `zpool_clear` | 2.2.2 flags; trim no `-a` |
| Pool.Scrub / Resilver | `Pools.*` | `lzc_scrub` / `zpool_scan` | |
| Pool.Events / EventsClear / EventsSeek / Iostat / Wait / History / Prefetch | `Pools.*` | libzfs + `lzc_wait` / `lzc_pool_prefetch` | Streams stay streams |
| Pool.Program / GetBootenv / SetBootenv / DdtPrune / Condense | `Pools.*` | lzc | Channel-program Lua `argv` |
| Replication.Send / SendSpace / SendProgress / SnaprangeSpace | `Replication.*` | `lzc_send*` / `lzc_snaprange_space` | Incremental, resume, redact, saved, space, progress, snap range |
| Replication.Receive / AbortReceive | `Replication.*` | `lzc_receive*` | `-d`/`-e`, `-o`/`-x`, heal, resumable, `-A` |
| Crypto.LoadKey / UnloadKey / ChangeKey | `Crypto.*` | `lzc_*_key` | `Redacted` wrapping key; never on argv |
| Mount.Mount / Unmount / Share / Unshare | `Mount.*` | libzfs | Not lzc |
| Zfs.Version | `Pools.version` | userland/kernel | Protocol op, not only `Version.ts` parse |

---

## `zfs` subcommands (2.2.2)

| Command | Status | Native | Typed-args holes |
| --- | --- | --- | --- |
| `version` | **done** | `zfs_version_*` | `Zfs.Version` on protocol |
| `create` filesystem | **done** | `lzc_create` | `-n`/`-P`/`-u`/`-v`; wrapping key optional |
| `create -V` volume | **done** | `lzc_create` | `-b` `VolBlockSize`, `-n`/`-P`/`-u`/`-v`; size branded |
| `destroy` dataset | **done** | `lzc_destroy` | `-n`/`-p`/`-R`/`-v`/`-r`/`-f` |
| `destroy` snapshot | **done** | `lzc_destroy_snaps` | `@from%to` range; comma lists still CLI-only extra names |
| `destroy` bookmark | **done** | `lzc_destroy_bookmarks` | |
| `snapshot` | **done** | `lzc_snapshot` | Multi-snap, `-o`, recursive |
| `rollback` | **done** | `lzc_rollback` / `lzc_rollback_to` | `-r`/`-R`/`-f` |
| `clone` | **done** | `lzc_clone` | `-p` parents |
| `promote` | **done** | `lzc_promote` | |
| `rename` | **done** | `lzc_rename` | `-p`/`-u`/`-r`/`-f` |
| `bookmark` | **done** | `lzc_bookmark` | |
| `program` | **done** | `lzc_channel_program` | Lua extras, not CLI spawn |
| `list` | **done** | **libzfs** | `-t` types, `-d` depth, sort, `-o` columns; snapshots/bookmarks first-class |
| `set` | **done** | **libzfs** | Multi-target, `-u` unmounted; user props branded |
| `get` | **done** | **libzfs** | `all`, recursive, types, sources, bookmarks |
| `inherit` | **done** | **libzfs** | `-r`, `-S` received |
| `upgrade` | **done** | **libzfs** | Dataset version 1–5 (`Datasets.upgrade`) |
| `userspace` / `groupspace` / `projectspace` | **done** | **libzfs** | Quota accounting |
| `project` | **done** | ioctl / zpl | Project IDs |
| `mount` / `unmount` | **done** | **libzfs** | Not lzc |
| `share` / `unshare` | **done** | **libzfs** | NFS/SMB |
| `send` | **done** | `lzc_send*` | Incremental, resume, replicate exclude, redact, saved, progress, space estimate |
| `receive` | **done** | `lzc_receive*` | `-d`/`-e`/`-A` abort, `-o`/`-x` props, heal, resumable |
| `allow` / `unallow` | **done** | **libzfs** ACL | Delegated admin |
| `hold` / `holds` / `release` | **done** | `lzc_hold` / `lzc_get_holds` / `lzc_release` | |
| `diff` | **done** | `ZFS_IOC_DIFF` | |
| `load-key` / `unload-key` / `change-key` | **done** | `lzc_load_key` / `unload` / `change_key` | `Redacted` stdin / keylocation |
| `redact` | **done** | `lzc_redact` | |
| `wait` | **done** | `lzc_wait_fs` | |
| `zone` / `unzone` | **done** | Linux userns ioctls | Linux-only |

---

## `zpool` subcommands (2.2.2)

| Command | Status | Native | Typed-args holes |
| --- | --- | --- | --- |
| `version` | **done** | — | Same `Zfs.Version` protocol op |
| `create` | **done** | **libzfs** `zpool_create` | `Vdev` AST + `Limits.VdevSize`; no lzc |
| `destroy` | **done** | **libzfs** | Live tests use library on `effectzfs_test_*` |
| `add` | **done** | **libzfs** `zpool_add` | Topology |
| `remove` | **done** | **libzfs** | Device removal |
| `labelclear` | **done** | **libzfs** | |
| `checkpoint` | **done** | `lzc_pool_checkpoint` | discard flag |
| `list` | **done** | **libzfs** | Extra `-o` columns; interval is `iostat` |
| `iostat` | **done** | **libzfs** | Streaming samples |
| `status` | **done** | **libzfs** | Typed `PoolHealth` + vdev tree; 2.3 JSON live skipped until 2.3 guest |
| `online` / `offline` | **done** | **libzfs** | |
| `clear` | **done** | **libzfs** | `zpool_clear`; rewind `-nF` typed |
| `reopen` | **done** | `lzc_reopen` | `-n` / `noRestart` |
| `attach` / `detach` / `replace` | **done** | **libzfs** | |
| `split` | **done** | **libzfs** | |
| `initialize` | **done** | `lzc_initialize` | 2.2.2 `-c/-s/-u/-w`; no `-z`/`-a` |
| `resilver` | **done** | **libzfs** scan | optional wait |
| `scrub` | **done** | `lzc_scrub` | pause/stop/wait |
| `trim` | **done** | `lzc_trim` | 2.2.2 `-d/-w/-r/-c/-s`; no `-a` |
| `import` / `export` | **done** | **libzfs** | |
| `upgrade` | **done** | **libzfs** | Pool version/features |
| `reguid` | **done** | **libzfs** | |
| `history` | **done** | **libzfs** | |
| `events` | **done** | **libzfs** Linux | `ZFS_IOC_EVENTS_*` |
| `get` / `set` | **done** | **libzfs** | Pool + vdev (`Pool.GetVdev` / `SetVdev`) |
| `sync` | **done** | `lzc_sync` | one pool; optional `force` |
| `wait` | **done** | `lzc_wait` | |
| `prefetch` | **done** | `lzc_pool_prefetch` | |
| `get/set bootenv` | **done** | `lzc_get/set_bootenv` | |
| `ddt prune` | **done** | `lzc_ddt_prune` | |
| `condense` | **done** | `lzc_condense` | |

---

## Kernel `ZFS_IOC_*` (vendor header)

Covered: `CREATE`, `DESTROY`, `DESTROY_SNAPS`, `SNAPSHOT`, `CLONE`, `SET_PROP`, `INHERIT_PROP`, `POOL_GET/SET_PROPS`, `SEND`/`RECV`/`SEND_NEW`/`SEND_SPACE`/`SEND_PROGRESS`/`RECV_NEW`, `ROLLBACK`, `RENAME`, `PROMOTE`, `HOLD`/`RELEASE`/`GET_HOLDS`, `BOOKMARK`/`GET_BOOKMARKS`/`DESTROY_BOOKMARKS`/`GET_BOOKMARK_PROPS`, `POOL_CREATE`/`DESTROY`/`IMPORT`/`EXPORT`, `VDEV_ADD`/`REMOVE`/`ATTACH`/`DETACH`/`SPLIT`/`SET_STATE`, `POOL_SCAN`/`SCRUB`, `CLEAR`, `SHARE`, `USERSPACE_*`, `DIFF`, `POOL_REGUID`/`REOPEN`/`SYNC`/`UPGRADE`/`GET_HISTORY`, `CHANNEL_PROGRAM`, `LOAD_KEY`/`UNLOAD_KEY`/`CHANGE_KEY`, `POOL_CHECKPOINT`, `POOL_INITIALIZE`/`TRIM`, `REDACT`, `WAIT`/`WAIT_FS`, `POOL_PREFETCH`, `DDT_PRUNE`, `POOL_CONDENSE`, Linux `EVENTS_*`, `USERNS_ATTACH/DETACH`, `SET/GET_BOOTENV`.

**Still unmapped** (skip or later): `POOL_CONFIGS`, `POOL_STATS`, `POOL_TRYIMPORT`, `POOL_FREEZE`, `INJECT_*` (debug), `ERROR_LOG`, `SMB_ACL`, `DSOBJ_TO_DSNAME`, `OBJ_TO_PATH`, `NEXT_OBJ`, `TMP_SNAPSHOT`, `OBJ_TO_STATS`, `SPACE_WRITTEN`, `SPACE_SNAPS`, `LOG_HISTORY`, `REMAP`, `VDEV_SETPATH`/`SETFRU`, `OBJSET_STATS`/`ZPLPROPS`/`RECVD_PROPS`, `DATASET_LIST_NEXT`/`SNAPSHOT_LIST_NEXT` (iter via libzfs, not public ioctl ops). `VDEV_GET/SET_PROPS` is mapped as `Pool.GetVdev` / `SetVdev`.

Debug inject/clear/list-next: **out of scope** for the public library.

---

## `libzfs_core` (`lzc_*`) vs us

| lzc | Library |
| --- | --- |
| `lzc_create` | **done** (fs/vol; CLI dry-run extras are CLI-only) |
| `lzc_destroy` | **done** (ranges/flags still CLI / `lzc_destroy_snaps`) |
| `lzc_snapshot` | **done** (multi + `-o` on CLI; native one nvlist) |
| `lzc_clone` | **done** (`-p` is CLI/libzfs) |
| `lzc_send` / `lzc_receive` | **done** (+ resume/space/progress/heal/cmdprops) |
| `lzc_get_props` | get via CLI/libzfs |
| `lzc_exists` | **done** (`Dataset.Exists`) |
| `lzc_promote` | **done** |
| `lzc_destroy_snaps` | destroy one snap |
| `lzc_bookmark` / get / destroy / props | **done** |
| `lzc_load_key` / unload / change_key | **done** |
| `lzc_initialize` / `lzc_trim` | **done** |
| `lzc_redact` | **done** |
| `lzc_snaprange_space` | **done** (`Replication.snaprangeSpace`) |
| `lzc_hold` / release / get_holds | **done** |
| `lzc_send_resume` / redacted / space / progress | **done** |
| `lzc_receive_resumable` / heal / cmdprops | **done** |
| `lzc_rollback` / `rollback_to` | **done** |
| `lzc_rename` | **done** |
| `lzc_channel_program` | **done** |
| `lzc_sync` / `reopen` / `condense` | **done** |
| `lzc_pool_checkpoint` | **done** |
| `lzc_wait` / `wait_fs` / `wait_tag` | **done** (`wait_tag` via wait activity) |
| `lzc_pool_prefetch` | **done** |
| `lzc_set/get_bootenv` | **done** |
| `lzc_get/set_vdev_prop` | **done** (`Pool.GetVdev` / `SetVdev`) |
| `lzc_scrub` | **done** |
| `lzc_ddt_prune` | **done** |

Still **libzfs-only** (no lzc): pool create/import/export/add/attach, dataset list/iter, mount/share, allow, history, events, iostat, most status/vdev trees.

---

## Typing gaps on what already exists

| Item | Gap |
| --- | --- |
| `CreateDatasetProperties` / `WritableDatasetProperties` | TS mapped types, not a single Schema.Class (still per-property codecs) |
| `PropertyWireValue` | raw string; codec-per-property already on `defineProperty.schema` |
| Pool status `raw` | wire document / text leftover |
| Native create/snapshot/send | still need nvlist `.node` for full lzc; koffi subset is exists/destroy/rename/promote/checkpoint/reopen/rollback_to/unload_key |

---

## Tests / versions

| Gap | State |
| --- | --- |
| Host Vitest | argv, protocol, native errno, classify, limits, send/receive/crypto/bookmark/holds/vdev/quota/allow |
| Live 2.2.2 | gated to process-created `effectzfs_test_*`; skipped on Darwin |
| Live 2.3 JSON status | Lima `effect-zfs-2.3` Ubuntu 25.04 / zfs-2.3.1 (`npm run test:live:2.3`) |
| Live 2.4 | none |
| Encryption / key stdin | live 2.2.2 test present |
| `PermissionDenied` | live `su nobody zfs list` |
| Native vs CLI diff | unbound + Linux koffi subset; no full libzfs `.node` |

---

## Implementation order (full map)

Do not add Alchemy reconciliation. Expand `ZfsProtocol` + `Args` + `spec/operations.json` per slice:

1. **Replication complete** — **done** (incremental send/receive, resume, send space).
2. **Crypto** — **done** (load/unload/change-key with `Redacted`).
3. **Snapshot lifecycle** — **done** (rollback, promote, rename, holds, snapshot list, bookmark CRUD).
4. **Pool topology** — **done** (`Vdev` AST, create/destroy/import/export, attach/replace/add/remove). Vdev **props** still missing.
5. **Mount/share** — **done**.
6. **Pool health** — **done** (scrub, resilver, trim, initialize, clear, online/offline, wait, events, iostat).
7. **Deleg / quota / project / channel program / redact / checkpoint / bootenv** — **done**.
8. **Native `.node`** on the same `Args`; differential tests vs CLI — **missing**.

Each new op: patch `spec/operations.json` → `npm run generate` → `Args` Schema.Class → protocol method → CLI adapter → service → versioned tests (fixture + live 2.2.2, extra live file if 2.3-only).
