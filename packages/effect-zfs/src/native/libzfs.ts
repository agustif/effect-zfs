import { Effect, Schema } from "effect"
import type {
  CreatePool,
  CreateSnapshot,
  Destroy,
  DestroyPool,
  GetProperty,
  GetVdevProperty,
  Hold,
  InheritProperty,
  InitializePool,
  ListDatasets,
  ListPools,
  ListSnapshots,
  MountFilesystem,
  Release,
  Rollback,
  SetProperty,
  SetVdevProperty,
  ShareFilesystem,
  TrimPool,
  UnmountFilesystem,
  UnshareFilesystem
} from "../args/index.js"
import {
  DatasetListItem,
  EncodedProperty,
  ListEntityName,
  PoolListItem,
  propertyName,
  SnapshotListItem
} from "../args/index.js"
import { byteCount } from "../schema/limits.js"
import type { DatasetKind } from "../schema/models.js"
import { PropertyGetRow } from "../schema/models.js"
import { PoolName, SnapshotName } from "../schema/name.js"
import type { NativeBindings, NativeFailureOrTransport } from "./bindings.js"
import type { ResumeParts } from "./codec.js"
import { NativeFailure } from "./failure.js"
import { bindLibzfsExtended } from "./libzfs-extra.js"
import type { NvpairFns } from "./nvlist.js"
import { nvlistFromProperties, propertyRowsFromNvlist } from "./nvlist.js"

type KoffiLib = {
  readonly func: (signature: string) => (...args: Array<unknown>) => unknown
  readonly symbol?: (name: string) => unknown
}

type Koffi = {
  readonly load: (name: string) => KoffiLib
  readonly proto: (signature: string) => unknown
  readonly pointer?: (ref: unknown) => unknown
  readonly register?: (callback: (...args: Array<unknown>) => unknown, type: unknown) => bigint
  readonly unregister?: (handle: bigint) => void
  readonly struct: (nameOrMembers: string | Record<string, unknown>, members?: Record<string, unknown>) => unknown
  readonly decode?: (value: unknown, type: unknown, length?: number) => unknown
  readonly array?: (type: string | unknown, length: number) => unknown
  readonly view?: (ref: unknown, len: number) => ArrayBuffer
  readonly as?: (value: unknown, type: string | unknown) => unknown
  readonly alloc?: (type: unknown, length: number) => unknown
  readonly encode?: (ref: unknown, ...rest: Array<unknown>) => void
  readonly sizeof?: (type: unknown) => number
  readonly free?: (value: unknown) => void
}

const ZFS_TYPE_FILESYSTEM = 1
const ZFS_TYPE_SNAPSHOT = 2
const ZFS_TYPE_VOLUME = 4
const ZFS_TYPE_BOOKMARK = 16
const ZFS_TYPE_DATASET = ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME | ZFS_TYPE_SNAPSHOT
const MS_FORCE = 0x400000
const POOL_INITIALIZE_START = 0
const POOL_INITIALIZE_CANCEL = 1
const POOL_INITIALIZE_SUSPEND = 2
const POOL_INITIALIZE_UNINIT = 3
const POOL_TRIM_START = 0
const POOL_TRIM_CANCEL = 1
const POOL_TRIM_SUSPEND = 2

const unixToCode = (errno: number): string | undefined => {
  switch (errno) {
    case 1:
    case 13:
      return "EZFS_PERM"
    case 2:
      return "EZFS_NOENT"
    case 16:
      return "EZFS_BUSY"
    case 17:
      return "EZFS_EXISTS"
    case 22:
      return "EZFS_INVALIDNAME"
    case 28:
      return "EZFS_NOSPC"
    default:
      return undefined
  }
}

const nativeFail = (operation: string, errno: number, message: string): NativeFailure => {
  const code = unixToCode(errno)
  return new NativeFailure({
    operation,
    errno,
    message,
    ...(code === undefined ? {} : { code })
  })
}

const fromErrno = (operation: string, errno: number, message: string): Effect.Effect<void, NativeFailure> =>
  errno === 0
    ? Effect.void
    : Effect.fail(nativeFail(operation, errno, message))

const decodeListName = Schema.decodeUnknownSync(ListEntityName)
const decodeSnapName = Schema.decodeUnknownSync(SnapshotName)
const decodePoolName = Schema.decodeUnknownSync(PoolName)

const kindOf = (mask: number): DatasetKind => {
  if ((mask & ZFS_TYPE_SNAPSHOT) !== 0) return "snapshot"
  if ((mask & ZFS_TYPE_VOLUME) !== 0) return "volume"
  if ((mask & ZFS_TYPE_BOOKMARK) !== 0) return "bookmark"
  return "filesystem"
}

const tryLoad = (koffi: Koffi, name: string): KoffiLib | undefined => {
  try {
    return koffi.load(name)
  } catch {
    return undefined
  }
}

const leafType = (tag: "File" | "Disk"): string => tag === "File" ? "file" : "disk"

export type NativeExpand = {
  readonly filesystems?: (root: string) => ReadonlyArray<string>
  readonly leafGuids?: (
    pool: string,
    devices: ReadonlyArray<string> | undefined,
    operation: string
  ) => Effect.Effect<ReadonlyArray<readonly [string, bigint]>, NativeFailure>
  readonly snapshot?: (input: CreateSnapshot) => Effect.Effect<void, NativeFailure>
  readonly hold?: (input: Hold) => Effect.Effect<void, NativeFailure>
  readonly release?: (input: Release) => Effect.Effect<void, NativeFailure>
  readonly createAncestors?: (operation: string, name: string) => Effect.Effect<void, NativeFailure>
  readonly initialize?: (input: InitializePool) => Effect.Effect<void, NativeFailure>
  readonly trim?: (input: TrimPool) => Effect.Effect<void, NativeFailure>
  readonly destroy?: (input: Destroy) => Effect.Effect<void, NativeFailureOrTransport>
  readonly rollback?: (input: Rollback) => Effect.Effect<void, NativeFailureOrTransport>
  readonly getVdevProperty?: (input: GetVdevProperty) => Effect.Effect<PropertyGetRow, NativeFailureOrTransport>
  readonly getVdevProperties?: (
    input: GetVdevProperty
  ) => Effect.Effect<ReadonlyArray<PropertyGetRow>, NativeFailureOrTransport>
  readonly setVdevProperty?: (input: SetVdevProperty) => Effect.Effect<void, NativeFailureOrTransport>
  readonly resumeToken?: (token: string) => ResumeParts | undefined
}

/**
 * Optional Linux `libzfs` FFI via koffi: list/get/set/inherit, mount/share,
 * and pool create/destroy. Missing library returns undefined.
 */
export const loadLinuxLibzfs = (
  koffi: Koffi,
  nv: NvpairFns | undefined,
  expand?: { current?: NativeExpand }
): Partial<NativeBindings> | undefined => {
  if (process.platform !== "linux") return undefined
  // Ubuntu 24.04 / ZFS 2.2 → libzfs.so.4; 25.04 / 2.3 → .so.6; 26.04 / 2.4 → .so.7.
  let lib: KoffiLib | undefined
  for (let n = 10; n >= 2; n--) {
    lib = tryLoad(koffi, `libzfs.so.${n}`)
    if (lib !== undefined) break
  }
  if (lib === undefined) lib = tryLoad(koffi, "libzfs.so")
  if (lib === undefined) return undefined
  const tryFunc = (signature: string) => {
    try {
      return lib.func(signature)
    } catch {
      return undefined
    }
  }
  const init = tryFunc("void *libzfs_init()")
  const fini = tryFunc("void libzfs_fini(void *hdl)")
  const zfsOpen = tryFunc("void *zfs_open(void *hdl, const char *name, int types)")
  const zfsClose = tryFunc("void zfs_close(void *zhp)")
  const zfsGetName = tryFunc("const char *zfs_get_name(void *zhp)")
  const zfsGetType = tryFunc("int zfs_get_type(void *zhp)")
  const zfsPropSet = tryFunc("int zfs_prop_set(void *zhp, const char *name, const char *value)")
  const zfsPropInherit = tryFunc("int zfs_prop_inherit(void *zhp, const char *name, int received)")
  const zfsPropGet = tryFunc(
    "int zfs_prop_get(void *zhp, int prop, _Out_ char *buf, uint64_t buflen, _Out_ int *src, void *statbuf, uint64_t statlen, int literal)"
  )
  const zfsNameToProp = tryFunc("int zfs_name_to_prop(const char *name)")
  const zfsGetAllProps = tryFunc("void *zfs_get_all_props(void *zhp)")
  const zfsMount = tryFunc("int zfs_mount(void *zhp, const char *options, int flags)")
  const zfsUnmount = tryFunc("int zfs_unmount(void *zhp, const char *mnt, int flags)")
  const zfsUnmountall = tryFunc("int zfs_unmountall(void *zhp, int flags)")
  const zfsPathToZhandle = tryFunc("void *zfs_path_to_zhandle(void *hdl, const char *path, int types)")
  const zfsShare = tryFunc("int zfs_share(void *zhp, void *proto)")
  const zfsUnshare = tryFunc("int zfs_unshare(void *zhp, const char *mountpoint, void *proto)")
  const zfsUnshareall = tryFunc("int zfs_unshareall(void *zhp, void *proto)")
  const zpoolOpen = tryFunc("void *zpool_open(void *hdl, const char *name)")
  const zpoolOpenCanfail = tryFunc("void *zpool_open_canfail(void *hdl, const char *name)")
  const zpoolClose = tryFunc("void zpool_close(void *zhp)")
  const zpoolGetName = tryFunc("const char *zpool_get_name(void *zhp)")
  const zpoolCreate = tryFunc("int zpool_create(void *hdl, const char *name, void *nvroot, void *props, void *fsprops)")
  const zpoolDestroy = tryFunc("int zpool_destroy(void *zhp, const char *msg)")
  const zpoolSetProp = tryFunc("int zpool_set_prop(void *zhp, const char *name, const char *value)")
  const libzfsErrno = tryFunc("int libzfs_errno(void *hdl)")
  const libzfsDesc = tryFunc("const char *libzfs_error_description(void *hdl)")
  const zfsSnapshot = tryFunc("int zfs_snapshot(void *hdl, const char *path, int recursive, void *props)")
  const zfsHold = tryFunc(
    "int zfs_hold(void *zhp, const char *snapname, const char *tag, int recursive, int cleanup_fd)"
  )
  const zfsRelease = tryFunc("int zfs_release(void *zhp, const char *snapname, const char *tag, int recursive)")
  const zfsCreateAncestors = tryFunc("int zfs_create_ancestors(void *hdl, const char *path)")
  const zpoolGetConfig = tryFunc("void *zpool_get_config(void *zhp, void *txg)")
  const zpoolCollectLeaves = tryFunc("void zpool_collect_leaves(void *zhp, void *nvroot, void *res)")
  const zpoolVdevGuid = tryFunc("uint64_t zpool_vdev_path_to_guid(void *zhp, const char *path)")
  const zpoolInitialize = tryFunc("int zpool_initialize(void *zhp, int cmd, void *vds, uint64_t value, int provided)")
  let trimFlagsType: unknown
  try {
    trimFlagsType = koffi.struct("ZpoolTrimFlags", {
      fullpool: "int",
      secure: "int",
      wait: "int",
      rate: "uint64_t"
    })
  } catch {
    trimFlagsType = undefined
  }
  const zpoolTrim = trimFlagsType === undefined
    ? undefined
    : tryFunc("int zpool_trim(void *zhp, int cmd, void *vds, ZpoolTrimFlags *flags)")
  let iterCbType: unknown
  let iterCbPtr = "void *cb"
  try {
    iterCbType = koffi.proto("int EffectZfsIterCb(void *zhp, void *data)")
    iterCbPtr = "EffectZfsIterCb *cb"
  } catch {
    try {
      iterCbType = koffi.proto("int (void *zhp, void *data)")
    } catch {
      iterCbType = undefined
    }
  }
  const poolIterCbType = iterCbType
  const zfsIterRoot = iterCbType === undefined
    ? undefined
    : tryFunc(`int zfs_iter_root(void *hdl, ${iterCbPtr}, void *data)`)
  const zfsIterFilesystems = iterCbType === undefined
    ? undefined
    : tryFunc(`int zfs_iter_filesystems(void *zhp, ${iterCbPtr}, void *data)`)
  const zfsIterFilesystemsV2 = iterCbType === undefined
    ? undefined
    : tryFunc(`int zfs_iter_filesystems_v2(void *zhp, int flags, ${iterCbPtr}, void *data)`)
  const zfsIterSnapshots = iterCbType === undefined
    ? undefined
    : tryFunc(
      `int zfs_iter_snapshots(void *zhp, int simple, ${iterCbPtr}, void *data, uint64_t min_txg, uint64_t max_txg)`
    )
  const zpoolIter = iterCbType === undefined
    ? undefined
    : tryFunc(`int zpool_iter(void *hdl, ${iterCbPtr}, void *data)`)
  if (init === undefined || zfsOpen === undefined || zfsClose === undefined || zfsGetName === undefined) {
    return undefined
  }
  const hdl = init()
  if (hdl === null || hdl === undefined || hdl === 0) return undefined
  const libzfsError = (operation: string, fallback: string): NativeFailure => {
    const errno = libzfsErrno === undefined ? 0 : Number(libzfsErrno(hdl))
    const message = libzfsDesc === undefined ? fallback : String(libzfsDesc(hdl) ?? fallback)
    const code = unixToCode(errno)
    return new NativeFailure({
      operation,
      errno,
      message,
      ...(code === undefined ? {} : { code })
    })
  }
  const openZfs = (name: string, types: number): unknown | undefined => {
    const zhp = zfsOpen(hdl, name, types)
    if (zhp === null || zhp === undefined || zhp === 0) return undefined
    return zhp
  }
  const fromLibzfs = (operation: string, rc: unknown, fallback: string): Effect.Effect<void, NativeFailure> =>
    Number(rc) === 0 ? Effect.void : Effect.fail(libzfsError(operation, fallback))
  const iterFilesystems = (zhp: unknown, cb: unknown): void => {
    if (zfsIterFilesystemsV2 !== undefined) {
      zfsIterFilesystemsV2(zhp, 0, cb, null)
      return
    }
    if (zfsIterFilesystems !== undefined) zfsIterFilesystems(zhp, cb, null)
  }
  const canIterFilesystems = zfsIterFilesystemsV2 !== undefined || zfsIterFilesystems !== undefined
  const fsAndSnap = (snapshot: string): readonly [string, string] | undefined => {
    const at = snapshot.lastIndexOf("@")
    if (at <= 0) return undefined
    return [snapshot.slice(0, at), snapshot.slice(at + 1)]
  }
  const initializeCommand = (command: InitializePool["command"]): number => {
    if (command === "cancel") return POOL_INITIALIZE_CANCEL
    if (command === "suspend") return POOL_INITIALIZE_SUSPEND
    if (command === "uninit") return POOL_INITIALIZE_UNINIT
    return POOL_INITIALIZE_START
  }
  const trimCommand = (command: TrimPool["command"]): number => {
    if (command === "cancel") return POOL_TRIM_CANCEL
    if (command === "suspend") return POOL_TRIM_SUSPEND
    return POOL_TRIM_START
  }
  const vdevPathNv = (
    zhp: unknown,
    devices: ReadonlyArray<string> | undefined,
    operation: string
  ): Effect.Effect<unknown, NativeFailure> =>
    Effect.suspend(() => {
      if (nv === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation,
            message: "libnvpair is not loaded"
          })
        )
      }
      const vds = nv.alloc()
      if (devices !== undefined && devices.length > 0) {
        for (const device of devices) nv.addBoolean(vds, device)
        return Effect.succeed(vds)
      }
      if (zpoolGetConfig === undefined || zpoolCollectLeaves === undefined) {
        nv.free(vds)
        return Effect.fail(
          new NativeFailure({
            operation,
            message: "zpool_collect_leaves is not loaded"
          })
        )
      }
      const config = zpoolGetConfig(zhp, null)
      if (config === null || config === undefined || config === 0) {
        nv.free(vds)
        return Effect.fail(
          new NativeFailure({
            operation,
            message: `${operation} zpool_get_config returned null`
          })
        )
      }
      const nvroot = nv.lookupNvlist(config, "vdev_tree")
      if (nvroot === undefined) {
        nv.free(vds)
        return Effect.fail(
          new NativeFailure({
            operation,
            message: "pool config has no vdev_tree"
          })
        )
      }
      zpoolCollectLeaves(zhp, nvroot, vds)
      return Effect.succeed(vds)
    })
  const withZfs = <A>(
    operation: string,
    name: string,
    types: number,
    run: (zhp: unknown) => Effect.Effect<A, NativeFailure>
  ): Effect.Effect<A, NativeFailure> =>
    Effect.suspend(() => {
      const zhp = openZfs(name, types)
      if (zhp === undefined) {
        return Effect.fail(libzfsError(operation, `zfs_open ${name}`))
      }
      return run(zhp).pipe(Effect.ensuring(Effect.sync(() => zfsClose(zhp))))
    })

  const leafNv = (leaf: { readonly _tag: "File" | "Disk"; readonly path: string }): unknown => {
    if (nv === undefined) throw new Error("libnvpair is not loaded")
    const child = nv.alloc()
    nv.addString(child, "type", leafType(leaf._tag))
    nv.addString(child, "path", leaf.path)
    return child
  }

  const dataNv = (vdev: CreatePool["vdevs"][number]): unknown => {
    if (nv === undefined) throw new Error("libnvpair is not loaded")
    if (vdev._tag === "File" || vdev._tag === "Disk") return leafNv(vdev)
    if (vdev._tag === "Draid") {
      const node = nv.alloc()
      nv.addString(node, "type", "draid")
      nv.addUint64(node, "nparity", BigInt(vdev.parity))
      if (vdev.data !== undefined) nv.addUint64(node, "draid_ndata", BigInt(vdev.data))
      if (vdev.spares !== undefined) nv.addUint64(node, "draid_nspares", BigInt(vdev.spares))
      nv.addNvlistArray(node, "children", vdev.children.map((child) => leafNv(child)))
      return node
    }
    const node = nv.alloc()
    if (vdev._tag === "Mirror") {
      nv.addString(node, "type", "mirror")
      const children = vdev.children.map((child) => leafNv(child))
      nv.addNvlistArray(node, "children", children)
      return node
    }
    nv.addString(node, "type", "raidz")
    nv.addUint64(node, "nparity", BigInt(vdev.parity))
    const children = vdev.children.map((child) => leafNv(child))
    nv.addNvlistArray(node, "children", children)
    return node
  }

  const bound: { -readonly [K in keyof NativeBindings]?: NativeBindings[K] } = {}

  if (zfsIterRoot !== undefined && zfsGetType !== undefined && iterCbType !== undefined) {
    bound.listDatasets = (options?: ListDatasets) =>
      Effect.try({
        try: () => {
          const rows: Array<DatasetListItem> = []
          const recursive = options?.recursive === true
          const types = options?.types
          const want = (kind: DatasetKind) => types === undefined || types.includes(kind)
          const visit = (zhp: unknown): number => {
            const name = String(zfsGetName(zhp) ?? "")
            const kind = kindOf(Number(zfsGetType(zhp)))
            if (name.length > 0 && want(kind)) {
              rows.push(new DatasetListItem({ name: decodeListName(name), kind }))
            }
            if (recursive && canIterFilesystems) {
              iterFilesystems(zhp, (child: unknown) => visit(child))
            }
            zfsClose(zhp)
            return 0
          }
          if (options?.root !== undefined) {
            const zhp = openZfs(options.root, ZFS_TYPE_DATASET | ZFS_TYPE_BOOKMARK)
            if (zhp === undefined) {
              throw libzfsError("Dataset.List", `zfs_open ${options.root}`)
            }
            visit(zhp)
          } else {
            zfsIterRoot(hdl, (zhp: unknown) => visit(zhp), null)
          }
          return rows
        },
        catch: (cause) =>
          cause instanceof NativeFailure
            ? cause
            : new NativeFailure({
              operation: "Dataset.List",
              message: cause instanceof Error ? cause.message : "zfs_iter_root failed",
              cause
            })
      })
  }

  if (zfsIterSnapshots !== undefined && iterCbType !== undefined) {
    bound.listSnapshots = (options?: ListSnapshots) =>
      Effect.try({
        try: () => {
          const rows: Array<SnapshotListItem> = []
          const root = options?.root
          if (root === undefined) {
            throw new NativeFailure({
              operation: "Snapshot.List",
              message: "native snapshot list requires a dataset root"
            })
          }
          if (root.includes("@")) {
            return [new SnapshotListItem({ name: decodeSnapName(root) })]
          }
          const zhp = openZfs(root, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME)
          if (zhp === undefined) {
            throw libzfsError("Snapshot.List", `zfs_open ${root}`)
          }
          zfsIterSnapshots(
            zhp,
            0,
            (snap: unknown) => {
              const name = String(zfsGetName(snap) ?? "")
              if (name.includes("@")) rows.push(new SnapshotListItem({ name: decodeSnapName(name) }))
              zfsClose(snap)
              return 0
            },
            null,
            0n,
            0n
          )
          zfsClose(zhp)
          return rows
        },
        catch: (cause) =>
          cause instanceof NativeFailure
            ? cause
            : new NativeFailure({
              operation: "Snapshot.List",
              message: cause instanceof Error ? cause.message : "zfs_iter_snapshots failed",
              cause
            })
      })
  }

  if (zpoolIter !== undefined && zpoolGetName !== undefined && poolIterCbType !== undefined) {
    bound.listPools = (options?: ListPools) =>
      Effect.try({
        try: () => {
          const rows: Array<PoolListItem> = []
          zpoolIter(hdl, (zhp: unknown) => {
            const name = String(zpoolGetName(zhp) ?? "")
            if (options?.name === undefined || options.name === name) {
              rows.push(
                new PoolListItem({
                  name: decodePoolName(name),
                  size: byteCount(0n),
                  free: byteCount(0n),
                  health: "ONLINE"
                })
              )
            }
            if (zpoolClose !== undefined) zpoolClose(zhp)
            return 0
          }, null)
          return rows
        },
        catch: (cause) =>
          new NativeFailure({
            operation: "Pool.List",
            message: cause instanceof Error ? cause.message : "zpool_iter failed",
            cause
          })
      })
  }

  if (zfsPropSet !== undefined) {
    bound.setProperty = (input: SetProperty) => {
      if (input.scope === "pool") {
        if (zpoolOpen === undefined || zpoolSetProp === undefined || zpoolClose === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Pool.Set",
              message: "zpool_set_prop is not loaded"
            })
          )
        }
        return Effect.suspend(() => {
          const zhp = zpoolOpen(hdl, input.name)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError("Pool.Set", `zpool_open ${input.name}`))
          }
          const errno = Number(zpoolSetProp(zhp, input.property, String(input.value)))
          zpoolClose(zhp)
          return fromErrno("Pool.Set", errno, `zpool_set_prop ${input.property}`)
        })
      }
      return withZfs(
        "Dataset.Set",
        input.name,
        ZFS_TYPE_DATASET,
        (zhp) =>
          fromErrno(
            "Dataset.Set",
            Number(zfsPropSet(zhp, input.property, String(input.value))),
            `zfs_prop_set ${input.property}`
          )
      )
    }
  }

  if (zfsPropInherit !== undefined) {
    bound.inheritProperty = (input: InheritProperty) =>
      withZfs("Dataset.Inherit", input.name, ZFS_TYPE_DATASET, (zhp) =>
        fromErrno(
          "Dataset.Inherit",
          Number(zfsPropInherit(zhp, input.property, input.received === true ? 1 : 0)),
          `zfs_prop_inherit ${input.property}`
        ))
  }

  if (zfsPropGet !== undefined && zfsNameToProp !== undefined) {
    bound.getProperty = (input: GetProperty) => {
      if (input.scope === "pool") {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Get",
            message: "pool get uses lzc_get_props"
          })
        )
      }
      return withZfs("Dataset.Get", input.name, ZFS_TYPE_DATASET | ZFS_TYPE_BOOKMARK, (zhp) =>
        Effect.try({
          try: () => {
            const prop = Number(zfsNameToProp(input.property))
            if (!Number.isFinite(prop) || prop < 0) {
              throw new NativeFailure({
                operation: "Dataset.Get",
                message: `native get of ${input.property} needs a zfs_prop_t`
              })
            }
            const buf = Buffer.alloc(1024)
            const src: Array<unknown> = [0]
            const errno = Number(zfsPropGet(zhp, prop, buf, buf.byteLength, src, null, 0, 1))
            if (errno !== 0) {
              throw nativeFail("Dataset.Get", errno, `zfs_prop_get ${input.property}`)
            }
            const value = buf.toString("utf8").replace(/\0.*$/s, "")
            return new PropertyGetRow({
              name: input.name,
              property: input.property,
              value,
              source: "local"
            })
          },
          catch: (cause) =>
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Dataset.Get",
                message: cause instanceof Error ? cause.message : "zfs_prop_get failed",
                cause
              })
        }))
    }
  }

  if (zfsGetAllProps !== undefined && nv !== undefined) {
    bound.getProperties = (input: GetProperty) => {
      if (input.scope === "pool") {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Get",
            message: "pool get uses lzc_get_props"
          })
        )
      }
      return withZfs("Dataset.Get", input.name, ZFS_TYPE_DATASET | ZFS_TYPE_BOOKMARK, (zhp) =>
        Effect.try({
          try: () => {
            const nvl = zfsGetAllProps(zhp)
            if (nvl === null || nvl === undefined || nvl === 0) {
              throw new NativeFailure({
                operation: "Dataset.Get",
                message: `zfs_get_all_props ${input.name} returned null`
              })
            }
            const unpacked = nv.unpack(nvl)
            return propertyRowsFromNvlist(
              input.name,
              unpacked,
              input.property === "all" ? undefined : input.property
            ).map((row) => new PropertyGetRow(row))
          },
          catch: (cause) =>
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Dataset.Get",
                message: cause instanceof Error ? cause.message : "zfs_get_all_props failed",
                cause
              })
        }))
    }
  }

  if (zfsMount !== undefined) {
    bound.mount = (input: MountFilesystem) => {
      if (input.all === true) {
        if (zfsIterRoot === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Mount",
              message: "native mount of -a requires libzfs iteration of every filesystem"
            })
          )
        }
        return Effect.suspend(() => {
          let errno = 0
          const visit = (zhp: unknown): number => {
            const rc = Number(zfsMount(zhp, input.options ?? null, 0))
            if (rc !== 0 && errno === 0) errno = rc
            if (canIterFilesystems) iterFilesystems(zhp, (child: unknown) => visit(child))
            zfsClose(zhp)
            return 0
          }
          zfsIterRoot(hdl, (zhp: unknown) => visit(zhp), null)
          return fromErrno("Mount.Mount", errno, "zfs_mount -a")
        })
      }
      if (input.name === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Mount.Mount",
            message: "native mount needs a dataset or all"
          })
        )
      }
      return withZfs("Mount.Mount", input.name, ZFS_TYPE_FILESYSTEM, (zhp) =>
        fromErrno(
          "Mount.Mount",
          Number(zfsMount(zhp, input.options ?? null, 0)),
          `zfs_mount ${input.name}`
        ))
    }
  }

  if (zfsUnmount !== undefined) {
    bound.unmount = (input: UnmountFilesystem) => {
      if (input.all === true) {
        if (zfsIterRoot === undefined || zfsUnmountall === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Unmount",
              message: "native unmount of -a requires libzfs iteration"
            })
          )
        }
        return Effect.suspend(() => {
          let errno = 0
          zfsIterRoot(hdl, (zhp: unknown) => {
            const rc = Number(zfsUnmountall(zhp, input.force === true ? MS_FORCE : 0))
            if (rc !== 0 && errno === 0) errno = rc
            zfsClose(zhp)
            return 0
          }, null)
          return fromErrno("Mount.Unmount", errno, "zfs_unmountall -a")
        })
      }
      if (input.target === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Mount.Unmount",
            message: "native unmount needs a target or all"
          })
        )
      }
      if (input.target.startsWith("/")) {
        if (zfsPathToZhandle === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Unmount",
              message: "native unmount by mountpoint needs zfs_path_to_zhandle"
            })
          )
        }
        return Effect.suspend(() => {
          const zhp = zfsPathToZhandle(hdl, input.target, ZFS_TYPE_FILESYSTEM)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError("Mount.Unmount", `zfs_path_to_zhandle ${input.target}`))
          }
          const errno = Number(zfsUnmount(zhp, input.target, input.force === true ? MS_FORCE : 0))
          zfsClose(zhp)
          return fromErrno("Mount.Unmount", errno, `zfs_unmount ${input.target}`)
        })
      }
      return withZfs("Mount.Unmount", input.target, ZFS_TYPE_FILESYSTEM, (zhp) =>
        fromErrno(
          "Mount.Unmount",
          Number(zfsUnmount(zhp, null, input.force === true ? MS_FORCE : 0)),
          `zfs_unmount ${input.target}`
        ))
    }
  }

  if (zfsShare !== undefined) {
    bound.share = (input: ShareFilesystem) => {
      if (input.all === true) {
        if (zfsIterRoot === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Share",
              message: "native share of -a requires libzfs iteration"
            })
          )
        }
        return Effect.suspend(() => {
          const visit = (zhp: unknown): number => {
            zfsShare(zhp, null)
            if (canIterFilesystems) iterFilesystems(zhp, (child: unknown) => visit(child))
            zfsClose(zhp)
            return 0
          }
          zfsIterRoot(hdl, (zhp: unknown) => visit(zhp), null)
          return Effect.void
        })
      }
      if (input.name === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Mount.Share",
            message: "native share needs a dataset or all"
          })
        )
      }
      return withZfs(
        "Mount.Share",
        input.name,
        ZFS_TYPE_FILESYSTEM,
        (zhp) => fromErrno("Mount.Share", Number(zfsShare(zhp, null)), `zfs_share ${input.name}`)
      )
    }
  }

  if (zfsUnshare !== undefined) {
    bound.unshare = (input: UnshareFilesystem) => {
      if (input.all === true) {
        if (zfsIterRoot === undefined || zfsUnshareall === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Unshare",
              message: "native unshare of -a requires libzfs iteration"
            })
          )
        }
        return Effect.suspend(() => {
          zfsIterRoot(hdl, (zhp: unknown) => {
            zfsUnshareall(zhp, null)
            zfsClose(zhp)
            return 0
          }, null)
          return Effect.void
        })
      }
      if (input.target === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Mount.Unshare",
            message: "native unshare needs a target or all"
          })
        )
      }
      if (input.target.startsWith("/")) {
        if (zfsPathToZhandle === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Mount.Unshare",
              message: "native unshare by mountpoint needs zfs_path_to_zhandle"
            })
          )
        }
        return Effect.suspend(() => {
          const zhp = zfsPathToZhandle(hdl, input.target, ZFS_TYPE_FILESYSTEM)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError("Mount.Unshare", `zfs_path_to_zhandle ${input.target}`))
          }
          const errno = Number(zfsUnshare(zhp, input.target, null))
          zfsClose(zhp)
          return fromErrno("Mount.Unshare", errno, `zfs_unshare ${input.target}`)
        })
      }
      return withZfs(
        "Mount.Unshare",
        input.target,
        ZFS_TYPE_FILESYSTEM,
        (zhp) => fromErrno("Mount.Unshare", Number(zfsUnshare(zhp, null, null)), `zfs_unshare ${input.target}`)
      )
    }
  }

  if (zpoolCreate !== undefined && nv !== undefined) {
    bound.createPool = (input: CreatePool) =>
      Effect.suspend(() => {
        try {
          const children = input.vdevs.map((vdev) => dataNv(vdev))
          if (input.log !== undefined) {
            for (const child of input.log.children) {
              if (child._tag === "Mirror") {
                const node = nv.alloc()
                nv.addString(node, "type", "mirror")
                nv.addUint64(node, "is_log", 1n)
                nv.addNvlistArray(node, "children", child.children.map((leaf) => leafNv(leaf)))
                children.push(node)
              } else {
                const node = leafNv(child)
                nv.addUint64(node, "is_log", 1n)
                children.push(node)
              }
            }
          }
          const nvroot = nv.alloc()
          nv.addString(nvroot, "type", "root")
          nv.addNvlistArray(nvroot, "children", children)
          if (input.spare !== undefined) {
            nv.addNvlistArray(nvroot, "spares", input.spare.children.map((child) => leafNv(child)))
          }
          if (input.cache !== undefined) {
            nv.addNvlistArray(nvroot, "l2cache", input.cache.children.map((child) => leafNv(child)))
          }
          const props = nvlistFromProperties(nv, input.properties)
          const fsprops = nvlistFromProperties(nv, [
            ...input.filesystemProperties,
            ...(input.mountpoint === undefined
              ? []
              : [new EncodedProperty({ name: propertyName("mountpoint"), value: input.mountpoint })])
          ])
          const errno = Number(zpoolCreate(hdl, input.name, nvroot, props ?? null, fsprops ?? null))
          nv.free(nvroot)
          if (props !== undefined) nv.free(props)
          if (fsprops !== undefined) nv.free(fsprops)
          if (errno !== 0) return Effect.fail(libzfsError("Pool.Create", `zpool_create ${input.name}`))
          return Effect.void
        } catch (cause) {
          return Effect.fail(
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Pool.Create",
                message: cause instanceof Error ? cause.message : "zpool_create failed",
                cause
              })
          )
        }
      })
  }

  if (zpoolOpen !== undefined && zpoolDestroy !== undefined && zpoolClose !== undefined) {
    bound.destroyPool = (input: DestroyPool) =>
      Effect.suspend(() => {
        const zhp = zpoolOpen(hdl, input.name)
        if (zhp === null || zhp === undefined || zhp === 0) {
          return Effect.fail(libzfsError("Pool.Destroy", `zpool_open ${input.name}`))
        }
        const errno = Number(zpoolDestroy(zhp, "effect-zfs destroy"))
        zpoolClose(zhp)
        return fromErrno("Pool.Destroy", errno, `zpool_destroy ${input.name}`)
      })
  }

  void fini

  const listFilesystems = (root: string): ReadonlyArray<string> => {
    if (!canIterFilesystems || iterCbType === undefined) return [root]
    const names: Array<string> = []
    const visit = (zhp: unknown): number => {
      const name = String(zfsGetName(zhp) ?? "")
      if (name.length > 0) names.push(name)
      iterFilesystems(zhp, (child: unknown) => visit(child))
      zfsClose(zhp)
      return 0
    }
    const zhp = openZfs(root, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME)
    if (zhp === undefined) return names
    visit(zhp)
    return names
  }

  let extra: ReturnType<typeof bindLibzfsExtended> = { bound: {} }
  try {
    extra = bindLibzfsExtended({
      koffi,
      tryFunc,
      hdl,
      nv,
      openZfs,
      zfsClose,
      zfsGetName,
      withZfs,
      fromLibzfs,
      libzfsError,
      iterFilesystems,
      canIterFilesystems,
      filesystems: listFilesystems,
      leafNv,
      dataNv,
      zfsLib: lib,
      ...(zfsIterRoot === undefined ? {} : { zfsIterRoot }),
      ...(zpoolOpen === undefined ? {} : { zpoolOpen }),
      ...(zpoolOpenCanfail === undefined ? {} : { zpoolOpenCanfail }),
      ...(zpoolClose === undefined ? {} : { zpoolClose }),
      ...(zpoolGetConfig === undefined ? {} : { zpoolGetConfig }),
      ...(zpoolGetName === undefined ? {} : { zpoolGetName }),
      ...(zpoolIter === undefined ? {} : { zpoolIter })
    })
    Object.assign(bound, extra.bound)
  } catch {
    extra = { bound: {} }
  }

  if (expand !== undefined) {
    const glue: { -readonly [K in keyof NativeExpand]?: NativeExpand[K] } = {}
    if (canIterFilesystems && iterCbType !== undefined) {
      glue.filesystems = listFilesystems
    }
    if (
      zpoolOpen !== undefined &&
      zpoolClose !== undefined &&
      zpoolGetConfig !== undefined &&
      zpoolCollectLeaves !== undefined &&
      zpoolVdevGuid !== undefined &&
      nv !== undefined
    ) {
      glue.leafGuids = (pool, devices, operation) =>
        Effect.suspend(() => {
          const zhp = zpoolOpen(hdl, pool)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError(operation, `zpool_open ${pool}`))
          }
          try {
            const config = zpoolGetConfig(zhp, null)
            if (config === null || config === undefined || config === 0) {
              return Effect.fail(
                new NativeFailure({
                  operation,
                  message: `zpool_get_config ${pool} returned null`
                })
              )
            }
            const nvroot = nv.lookupNvlist(config, "vdev_tree")
            if (nvroot === undefined) {
              return Effect.fail(
                new NativeFailure({
                  operation,
                  message: "pool config has no vdev_tree"
                })
              )
            }
            const leaves = nv.alloc()
            zpoolCollectLeaves(zhp, nvroot, leaves)
            const paths = Object.keys(nv.unpack(leaves))
            nv.free(leaves)
            const wanted = devices === undefined || devices.length === 0
              ? paths
              : paths.filter((path) =>
                devices.some((device) =>
                  device === path ||
                  path.endsWith(device) ||
                  device.endsWith(path)
                )
              )
            if (devices !== undefined && devices.length > 0 && wanted.length === 0) {
              return Effect.fail(
                new NativeFailure({
                  operation,
                  code: "EZFS_NODEVICE",
                  message: `no matching leaf vdevs in ${pool}`
                })
              )
            }
            const rows: Array<readonly [string, bigint]> = []
            for (const path of wanted) {
              const guid = asBigintGuid(zpoolVdevGuid(zhp, path))
              if (guid === 0n) continue
              rows.push([path, guid])
            }
            return Effect.succeed(rows)
          } finally {
            zpoolClose(zhp)
          }
        })
    }
    if (zfsSnapshot !== undefined) {
      glue.snapshot = (input: CreateSnapshot) =>
        Effect.suspend(() => {
          const props = nv === undefined ? undefined : nvlistFromProperties(nv, input.properties)
          const names = [input.name, ...(input.snapshots ?? [])]
          try {
            for (const snap of names) {
              const rc = zfsSnapshot(
                hdl,
                snap,
                input.recursive === true ? 1 : 0,
                snap === input.name ? props ?? null : null
              )
              if (Number(rc) !== 0) {
                return Effect.fail(libzfsError("Snapshot.Create", `zfs_snapshot ${snap}`))
              }
            }
            return Effect.void
          } finally {
            if (props !== undefined && nv !== undefined) nv.free(props)
          }
        })
    }
    if (zfsHold !== undefined) {
      glue.hold = (input: Hold) =>
        Effect.suspend(() => {
          const parts = fsAndSnap(input.snapshot)
          if (parts === undefined) {
            return Effect.fail(
              new NativeFailure({
                operation: "Snapshot.Hold",
                message: `zfs_hold needs filesystem@snap, got ${input.snapshot}`
              })
            )
          }
          const zhp = openZfs(parts[0], ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME)
          if (zhp === undefined) {
            return Effect.fail(libzfsError("Snapshot.Hold", `zfs_open ${parts[0]}`))
          }
          const result = fromLibzfs(
            "Snapshot.Hold",
            zfsHold(zhp, parts[1], input.tag, input.recursive === true ? 1 : 0, -1),
            `zfs_hold ${input.snapshot}`
          )
          zfsClose(zhp)
          return result
        })
    }
    if (zfsRelease !== undefined) {
      glue.release = (input: Release) =>
        Effect.suspend(() => {
          const parts = fsAndSnap(input.snapshot)
          if (parts === undefined) {
            return Effect.fail(
              new NativeFailure({
                operation: "Snapshot.Release",
                message: `zfs_release needs filesystem@snap, got ${input.snapshot}`
              })
            )
          }
          const zhp = openZfs(parts[0], ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME)
          if (zhp === undefined) {
            return Effect.fail(libzfsError("Snapshot.Release", `zfs_open ${parts[0]}`))
          }
          const result = fromLibzfs(
            "Snapshot.Release",
            zfsRelease(zhp, parts[1], input.tag, input.recursive === true ? 1 : 0),
            `zfs_release ${input.snapshot}`
          )
          zfsClose(zhp)
          return result
        })
    }
    if (zfsCreateAncestors !== undefined) {
      glue.createAncestors = (operation, name) =>
        fromLibzfs(operation, zfsCreateAncestors(hdl, name), `zfs_create_ancestors ${name}`)
    }
    if (zpoolInitialize !== undefined && zpoolOpen !== undefined && zpoolClose !== undefined) {
      glue.initialize = (input: InitializePool) =>
        Effect.suspend(() => {
          if (input.all === true) {
            return Effect.fail(
              new NativeFailure({
                operation: "Pool.Initialize",
                message: "native initialize -a would touch every imported pool"
              })
            )
          }
          const zhp = zpoolOpen(hdl, input.name)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError("Pool.Initialize", `zpool_open ${input.name}`))
          }
          return vdevPathNv(zhp, input.devices, "Pool.Initialize").pipe(
            Effect.flatMap((vds) => {
              const result = fromLibzfs(
                "Pool.Initialize",
                zpoolInitialize(zhp, initializeCommand(input.command), vds, 0n, 0),
                `zpool_initialize ${input.name}`
              )
              if (nv !== undefined) nv.free(vds)
              return result
            }),
            Effect.ensuring(Effect.sync(() => zpoolClose(zhp)))
          )
        })
    }
    if (zpoolTrim !== undefined && zpoolOpen !== undefined && zpoolClose !== undefined) {
      glue.trim = (input: TrimPool) =>
        Effect.suspend(() => {
          if (input.all === true) {
            return Effect.fail(
              new NativeFailure({
                operation: "Pool.Trim",
                message: "native trim -a would touch every imported pool"
              })
            )
          }
          const zhp = zpoolOpen(hdl, input.name)
          if (zhp === null || zhp === undefined || zhp === 0) {
            return Effect.fail(libzfsError("Pool.Trim", `zpool_open ${input.name}`))
          }
          return vdevPathNv(zhp, input.devices, "Pool.Trim").pipe(
            Effect.flatMap((vds) => {
              const flags = {
                fullpool: devicesMissing(input.devices) ? 1 : 0,
                secure: input.secure === true ? 1 : 0,
                wait: input.wait === true ? 1 : 0,
                rate: input.rate ?? 0n
              }
              const result = fromLibzfs(
                "Pool.Trim",
                zpoolTrim(zhp, trimCommand(input.command), vds, flags),
                `zpool_trim ${input.name}`
              )
              if (nv !== undefined) nv.free(vds)
              return result
            }),
            Effect.ensuring(Effect.sync(() => zpoolClose(zhp)))
          )
        })
    }
    if (extra.bound.destroy !== undefined) glue.destroy = extra.bound.destroy
    if (extra.bound.rollback !== undefined) glue.rollback = extra.bound.rollback
    if (extra.bound.getVdevProperty !== undefined) glue.getVdevProperty = extra.bound.getVdevProperty
    if (extra.bound.getVdevProperties !== undefined) glue.getVdevProperties = extra.bound.getVdevProperties
    if (extra.bound.setVdevProperty !== undefined) glue.setVdevProperty = extra.bound.setVdevProperty
    if (extra.resumeToken !== undefined) glue.resumeToken = extra.resumeToken
    expand.current = glue
  }

  return bound
}

const devicesMissing = (devices: ReadonlyArray<string> | undefined): boolean =>
  devices === undefined || devices.length === 0

const asBigintGuid = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}
