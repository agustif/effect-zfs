import { Duration, Effect, Schedule, Stream } from "effect"
import { closeSync, lstatSync, openSync, readdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type {
  AbortReceive,
  AddVdevs,
  Allow,
  AttachVdev,
  ClearFault,
  ClearPool,
  CreatePool,
  Destroy,
  DetachVdev,
  Diff,
  ErrorLog,
  Events,
  EventsClear,
  EventsSeek,
  ExportPool,
  FreezePool,
  GetVdevProperty,
  History,
  ImportPool,
  InjectFault,
  Iostat,
  LabelClear,
  ListAllow,
  LoadKey,
  NextObj,
  ObjToPath,
  ObjToStats,
  OfflineVdevs,
  OnlineVdevs,
  Project,
  ReguidPool,
  Remap,
  RemoveVdevs,
  ReplaceVdev,
  Rollback,
  SetVdevProperty,
  SmbAcl,
  SplitPool,
  StatusPool,
  UpgradeDataset,
  UpgradePool,
  Userspace,
  Vdev,
  Zone
} from "../args/index.js"
import {
  AllowGrant,
  AllowListing,
  AllowSet,
  delegPermission,
  DelegWho,
  ErrorLogRow,
  EventsCleared,
  HistoryRecord,
  InjectRecord,
  IostatRow,
  IostatSample,
  NextObjResult,
  ObjPath,
  ObjStats,
  parseDiffOutput,
  PoolEvent,
  ProjectRow,
  SetVdevFru,
  SetVdevPath,
  uint64,
  Unallow,
  UserspaceRow
} from "../args/index.js"
import { byteCount, projectId } from "../schema/limits.js"
import { poolHealthOf, PoolStatus, PropertyGetRow, VdevStatus } from "../schema/models.js"
import { datasetName, delegPermSetName, poolName, poolWhy } from "../schema/name.js"
import { parseVersionOutput } from "../schema/version.js"
import type { NativeBindings } from "./bindings.js"
import {
  eventsSeekFlags,
  FS_IOC_FSGETXATTR,
  FS_IOC_FSSETXATTR,
  FS_XFLAG_PROJINHERIT,
  fsaclKeys,
  importFlagsOf,
  iostatCountersFromStats,
  iostatDeltaThroughput,
  type IostatThroughput,
  parseFsaclKey,
  quotaFieldOf,
  quotaPropsFor,
  quotaTypeLabel,
  recvHiddenName,
  type ResumeParts,
  resumePartsFromNv,
  snapshotSpecOf,
  vdevStateHealth,
  VdevStatIndex,
  writeZfsCmd,
  writeZfsInjectCmd,
  ZEVENT_NONBLOCK,
  ZEVENT_NONE,
  ZFS_IMPORT_ANY_HOST,
  ZFS_IOC_CLEAR_FAULT,
  ZFS_IOC_INJECT_FAULT,
  ZFS_IOC_INJECT_LIST_NEXT,
  ZFS_IOC_NEXT_OBJ,
  ZFS_IOC_OBJ_TO_STATS,
  ZFS_IOC_POOL_FREEZE,
  ZFS_IOC_REMAP,
  ZFS_IOC_SMB_ACL,
  ZFS_IOC_USERNS_ATTACH,
  ZFS_IOC_USERNS_DETACH,
  ZFS_IOC_VDEV_SETFRU,
  ZFS_IOC_VDEV_SETPATH,
  ZFS_ONLINE_EXPAND,
  zfsCmdCookieOffset,
  zfsCmdGuidOffset,
  zfsCmdObjOffset
} from "./codec.js"
import { NativeFailure } from "./failure.js"
import type { NvObject, NvpairFns } from "./nvlist.js"

const ZFS_TYPE_FILESYSTEM = 1
const ZFS_TYPE_SNAPSHOT = 2
const ZFS_TYPE_VOLUME = 4
const ZFS_TYPE_DATASET = ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME | ZFS_TYPE_SNAPSHOT
const MS_FORCE = 0x400000

type KoffiLib = {
  readonly func: (signature: string) => (...args: Array<unknown>) => unknown
  readonly symbol?: (name: string) => unknown
}

export type LibzfsKoffi = {
  readonly load: (name: string) => KoffiLib
  readonly proto: (signature: string) => unknown
  readonly struct: (nameOrMembers: string | Record<string, unknown>, members?: Record<string, unknown>) => unknown
  readonly decode?: (value: unknown, type: unknown, length?: number) => unknown
  readonly array?: (type: string | unknown, length: number) => unknown
  readonly pointer?: (ref: string | unknown) => unknown
  readonly view?: (ref: unknown, len: number) => ArrayBuffer
  readonly as?: (value: unknown, type: string | unknown) => unknown
  readonly alloc?: (type: unknown, length: number) => unknown
  readonly encode?: (ref: unknown, ...rest: Array<unknown>) => void
  readonly sizeof?: (type: unknown) => number
  readonly free?: (value: unknown) => void
}

export type LibzfsExtraContext = {
  readonly koffi: LibzfsKoffi
  readonly tryFunc: (signature: string) => ((...args: Array<unknown>) => unknown) | undefined
  readonly hdl: unknown
  readonly nv: NvpairFns | undefined
  readonly openZfs: (name: string, types: number) => unknown | undefined
  readonly zfsClose: (zhp: unknown) => void
  readonly zfsGetName: (zhp: unknown) => unknown
  readonly withZfs: <A>(
    operation: string,
    name: string,
    types: number,
    run: (zhp: unknown) => Effect.Effect<A, NativeFailure>
  ) => Effect.Effect<A, NativeFailure>
  readonly fromLibzfs: (operation: string, rc: unknown, fallback: string) => Effect.Effect<void, NativeFailure>
  readonly libzfsError: (operation: string, fallback: string) => NativeFailure
  readonly iterFilesystems: (zhp: unknown, cb: unknown) => void
  readonly canIterFilesystems: boolean
  readonly zfsIterRoot?: (...args: Array<unknown>) => unknown
  readonly zpoolOpen?: (...args: Array<unknown>) => unknown
  readonly zpoolOpenCanfail?: (...args: Array<unknown>) => unknown
  readonly zpoolClose?: (...args: Array<unknown>) => unknown
  readonly zpoolGetConfig?: (...args: Array<unknown>) => unknown
  readonly zpoolGetName?: (...args: Array<unknown>) => unknown
  readonly zpoolIter?: (...args: Array<unknown>) => unknown
  readonly filesystems?: (root: string) => ReadonlyArray<string>
  readonly leafNv: (leaf: { readonly _tag: "File" | "Disk"; readonly path: string }) => unknown
  readonly dataNv: (vdev: CreatePool["vdevs"][number]) => unknown
  readonly zfsLib?: {
    readonly symbol?: (name: string) => unknown
    readonly func?: {
      (signature: string): (...args: Array<unknown>) => unknown
      (name: string, result: string, args: ReadonlyArray<string>): (...args: Array<unknown>) => unknown
    }
  }
}

const asBigint = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

const isNvObject = (value: unknown): value is NvObject =>
  value !== null && typeof value === "object" && !Array.isArray(value)

const tryLoad = (koffi: LibzfsKoffi, name: string): KoffiLib | undefined => {
  try {
    return koffi.load(name)
  } catch {
    return undefined
  }
}

const listFiles = (dir: string): ReadonlyArray<string> => {
  try {
    return readdirSync(dir).flatMap((entry) => {
      const path = join(dir, entry)
      try {
        const st = lstatSync(path)
        if (st.isFile() || st.isBlockDevice()) return [path]
      } catch {
        return []
      }
      return []
    })
  } catch {
    return []
  }
}

const isNativePtr = (value: unknown): boolean => {
  if (value === null || value === undefined) return false
  if (value === 0 || value === 0n) return false
  return true
}

const koffiRelease = (koffi: LibzfsKoffi, held: ReadonlyArray<unknown>): void => {
  const free = koffi.free
  if (free === undefined) return
  for (const ptr of held) {
    if (!isNativePtr(ptr)) continue
    try {
      free(ptr)
    } catch {
      // already released
    }
  }
}

/** OpenZFS `libpc_handle_t` + `importargs_t` for `zpool_search_import`. */
const defineImportSearchStructs = (
  koffi: LibzfsKoffi
): { readonly libpc: unknown; readonly importArgs: unknown } | undefined => {
  try {
    const desc = koffi.array === undefined ? "char [1024]" : koffi.array("char", 1024)
    return {
      libpc: koffi.struct({
        lpc_error: "int",
        lpc_printerr: "int",
        lpc_open_access_error: "int",
        lpc_desc_active: "int",
        lpc_desc: desc,
        lpc_ops: "void *",
        lpc_lib_handle: "void *"
      }),
      importArgs: koffi.struct({
        path: "void *",
        paths: "int",
        poolname: "void *",
        guid: "uint64_t",
        cachefile: "void *",
        can_be_active: "int",
        scan: "int",
        policy: "void *",
        do_destroyed: "int",
        do_all: "int"
      })
    }
  } catch {
    return undefined
  }
}

const encodePointerArray = (koffi: LibzfsKoffi, dest: unknown, pointers: ReadonlyArray<unknown>): void => {
  const encode = koffi.encode
  if (encode === undefined) throw new Error("koffi.encode is not loaded")
  if (koffi.array !== undefined) {
    encode(dest, koffi.array("void *", pointers.length), [...pointers])
    return
  }
  const ptrSize = koffi.sizeof === undefined ? 8 : koffi.sizeof("void *")
  for (let i = 0; i < pointers.length; i++) {
    encode(dest, i * ptrSize, "void *", pointers[i])
  }
}

const lpcDetailOf = (koffi: LibzfsKoffi, libpc: unknown, lpcBuf: unknown): string => {
  if (koffi.decode === undefined) return ""
  try {
    const decoded = koffi.decode(lpcBuf, libpc)
    if (!isNvObject(decoded)) return ""
    const descValue = decoded["lpc_desc"]
    const desc = typeof descValue === "string" ? descValue.replace(/\0.*$/s, "") : ""
    if (desc.length > 0) return desc
    const errorValue = decoded["lpc_error"]
    if (errorValue !== undefined && Number(errorValue) !== 0) {
      return `lpc_error=${String(errorValue)}`
    }
  } catch {
    return ""
  }
  return ""
}

/**
 * Scan `dirs` through libzutil `zpool_search_import` so a multi-disk pool
 * (mirror/raidz) is assembled from every label, not a single `zpool_read_label`.
 *
 * koffi 3 `alloc` is always `(type, length)`. Encoding a JS string as `char *`
 * copies into a call-local heap that dies when `encode` returns, so path and
 * pool name bytes stay in Node buffers for the duration of the C call.
 */
const searchImportNvlist = (
  koffi: LibzfsKoffi,
  structs: { readonly libpc: unknown; readonly importArgs: unknown },
  search: (...args: Array<unknown>) => unknown,
  ops: unknown,
  hdl: unknown,
  pool: string,
  dirs: ReadonlyArray<string>,
  destroyed: boolean
): { readonly found: unknown | undefined; readonly detail: string; readonly release: () => void } => {
  const alloc = koffi.alloc
  const encode = koffi.encode
  const release = () => undefined
  if (alloc === undefined || encode === undefined) {
    return { found: undefined, detail: "koffi.alloc/encode is not loaded", release }
  }
  const pathBytes = dirs.map((dir) => Buffer.from(`${dir}\0`, "utf8"))
  const nameBytes = Buffer.from(`${pool}\0`, "utf8")
  const held: Array<unknown> = []
  const releaseHeld = () => koffiRelease(koffi, held)
  try {
    const pathMem = alloc("void *", pathBytes.length)
    held.push(pathMem)
    encodePointerArray(koffi, pathMem, pathBytes)
    const lpcBuf = alloc(structs.libpc, 1)
    held.push(lpcBuf)
    encode(lpcBuf, structs.libpc, {
      lpc_error: 0,
      lpc_printerr: 0,
      lpc_open_access_error: 0,
      lpc_desc_active: 0,
      lpc_desc: "",
      lpc_ops: ops,
      lpc_lib_handle: hdl
    })
    const iargsBuf = alloc(structs.importArgs, 1)
    held.push(iargsBuf)
    encode(iargsBuf, structs.importArgs, {
      path: pathMem,
      paths: dirs.length,
      poolname: nameBytes,
      guid: 0n,
      can_be_active: 0,
      scan: 1,
      do_destroyed: destroyed ? 1 : 0,
      do_all: 0
    })
    const found = search(lpcBuf, iargsBuf)
    const detail = lpcDetailOf(koffi, structs.libpc, lpcBuf)
    if (!isNativePtr(found)) {
      return {
        found: undefined,
        detail: detail.length > 0 ? detail : `search returned ${String(found)}`,
        release: releaseHeld
      }
    }
    return { found, detail, release: releaseHeld }
  } catch (cause) {
    releaseHeld()
    throw cause
  }
}

const vdevFromNv = (nv: NvpairFns, ptr: unknown): VdevStatus => {
  const type = nv.lookupString(ptr, "type") ?? "disk"
  const path = nv.lookupString(ptr, "path")
  const name = path ?? type
  const stateNum = nv.lookupUint64(ptr, "state")
  const state = stateNum === undefined ? undefined : vdevStateHealth(stateNum)
  const stats = nv.lookupUint64Array(ptr, "vdev_stats")
  const read = stats[VdevStatIndex.readErrors] ?? nv.lookupUint64(ptr, "read_errors")
  const write = stats[VdevStatIndex.writeErrors] ?? nv.lookupUint64(ptr, "write_errors")
  const checksum = stats[VdevStatIndex.checksumErrors] ?? nv.lookupUint64(ptr, "checksum_errors")
  let children: Array<VdevStatus> = []
  try {
    children = nv.lookupNvlistArray(ptr, "children").map((child) => vdevFromNv(nv, child))
  } catch {
    children = []
  }
  return new VdevStatus({
    name,
    kind: type,
    ...(state === undefined ? {} : { state }),
    ...(read === undefined ? {} : { read }),
    ...(write === undefined ? {} : { write }),
    ...(checksum === undefined ? {} : { checksum }),
    ...(children.length === 0 ? {} : { children })
  })
}

const historyString = (row: NvObject, keys: ReadonlyArray<string>): string | undefined => {
  for (const key of keys) {
    const value = row[key]
    if (typeof value === "string" && value.length > 0) return value
  }
  return undefined
}

const historyFromNv = (unpacked: NvObject): ReadonlyArray<HistoryRecord> => {
  const rows: Array<HistoryRecord> = []
  const pushRecord = (row: NvObject) => {
    const command = historyString(row, [
      "history command",
      "cmd",
      "history internal str",
      "intstr",
      "internal"
    ]) ?? ""
    const timeValue = row["history time"] ?? row["time"]
    if (command.length === 0 && timeValue === undefined) return
    const time = typeof timeValue === "bigint"
      ? timeValue.toString()
      : typeof timeValue === "string"
      ? timeValue
      : "0"
    const user = historyString(row, ["history who", "who"])
    const hostname = historyString(row, ["history hostname", "hostname"])
    const zone = historyString(row, ["history zone", "zone"])
    const internal = row["history command"] === undefined && row["cmd"] === undefined && (
      row["history internal event"] !== undefined ||
      row["int_event"] !== undefined ||
      command.startsWith("[internal")
    )
    rows.push(
      new HistoryRecord({
        time,
        command: command.length === 0 ? "history" : command,
        internal,
        ...(user === undefined ? {} : { user }),
        ...(hostname === undefined ? {} : { hostname }),
        ...(zone === undefined ? {} : { zone })
      })
    )
  }
  const records = unpacked["history record"] ?? unpacked["history"]
  if (Array.isArray(records)) {
    for (const item of records) {
      if (isNvObject(item)) pushRecord(item)
    }
    if (rows.length > 0) return rows
  }
  if (isNvObject(records)) {
    for (const value of Object.values(records)) {
      if (isNvObject(value)) pushRecord(value)
    }
    if (rows.length > 0) return rows
  }
  for (const value of Object.values(unpacked)) {
    if (isNvObject(value)) pushRecord(value)
  }
  return rows
}

const eventFromNv = (unpacked: NvObject): PoolEvent => {
  const eventClass = typeof unpacked["class"] === "string" ? unpacked["class"] : "unknown"
  const timeValue = unpacked["time"]
  const time = typeof timeValue === "bigint"
    ? timeValue.toString()
    : typeof timeValue === "string"
    ? timeValue
    : "0"
  const payload: { [key: string]: string } = {}
  for (const [key, value] of Object.entries(unpacked)) {
    if (typeof value === "string") payload[key] = value
    else if (typeof value === "bigint") payload[key] = value.toString()
    else if (typeof value === "boolean") payload[key] = value ? "true" : "false"
  }
  const pool = typeof unpacked["pool"] === "string" ? unpacked["pool"] : undefined
  return new PoolEvent({
    time,
    eventClass,
    payload,
    ...(pool === undefined || pool.length === 0 || poolWhy(pool) !== undefined ? {} : { pool: poolName(pool) })
  })
}

const parseAllowNv = (
  setpoint: string,
  unpacked: NvObject
): AllowListing => {
  const sets: Array<AllowSet> = []
  const create: Array<ReturnType<typeof delegPermission>> = []
  const grants: Array<AllowGrant> = []
  for (const [key, value] of Object.entries(unpacked)) {
    const parsed = parseFsaclKey(key)
    if (parsed === undefined) continue
    const perms = isNvObject(value)
      ? Object.keys(value).flatMap((perm) => {
        try {
          return [delegPermission(perm)]
        } catch {
          return []
        }
      })
      : []
    if (parsed.kind === "create") {
      for (const perm of perms) {
        create.push(perm)
      }
      continue
    }
    if (parsed.kind === "set") {
      if (parsed.name !== undefined) {
        try {
          sets.push(new AllowSet({ name: delegPermSetName(parsed.name), permissions: perms }))
        } catch {
          // skip malformed set names
        }
      }
      continue
    }
    grants.push(
      new AllowGrant({
        who: new DelegWho({
          kind: parsed.kind,
          ...(parsed.name === undefined ? {} : { name: parsed.name })
        }),
        inherit: parsed.inherit,
        permissions: perms
      })
    )
  }
  return new AllowListing({
    setpoint: datasetName(setpoint),
    sets,
    create,
    grants
  })
}

const walkParents = (name: string): ReadonlyArray<string> => {
  const out: Array<string> = [name]
  let current = name
  for (;;) {
    const slash = current.lastIndexOf("/")
    if (slash <= 0) break
    current = current.slice(0, slash)
    out.push(current)
  }
  return out
}

const packAddRoot = (
  nv: NvpairFns,
  vdevs: ReadonlyArray<Vdev>,
  leafNv: LibzfsExtraContext["leafNv"],
  dataNv: LibzfsExtraContext["dataNv"]
): unknown => {
  const nvroot = nv.alloc()
  nv.addString(nvroot, "type", "root")
  const children: Array<unknown> = []
  const spares: Array<unknown> = []
  const l2cache: Array<unknown> = []
  for (const vdev of vdevs) {
    if (vdev._tag === "Spare") {
      for (const child of vdev.children) spares.push(leafNv(child))
      continue
    }
    if (vdev._tag === "Cache") {
      for (const child of vdev.children) l2cache.push(leafNv(child))
      continue
    }
    if (vdev._tag === "Log") {
      for (const child of vdev.children) {
        if (child._tag === "Mirror") {
          const node = nv.alloc()
          nv.addString(node, "type", "mirror")
          nv.addUint64(node, "is_log", 1n)
          nv.addNvlistArray(node, "children", child.children.map((leaf) => leafNv(leaf)))
          children.push(node)
          continue
        }
        const node = leafNv(child)
        nv.addUint64(node, "is_log", 1n)
        children.push(node)
      }
      continue
    }
    children.push(dataNv(vdev))
  }
  if (children.length > 0) nv.addNvlistArray(nvroot, "children", children)
  if (spares.length > 0) nv.addNvlistArray(nvroot, "spares", spares)
  if (l2cache.length > 0) nv.addNvlistArray(nvroot, "l2cache", l2cache)
  return nvroot
}

const fsxattr = (koffi: LibzfsKoffi): unknown | undefined => {
  try {
    return koffi.struct("EffectZfsFsxattr", {
      fsx_xflags: "uint32",
      fsx_extsize: "uint32",
      fsx_nextents: "uint32",
      fsx_projid: "uint32",
      fsx_cowextsize: "uint32",
      fsx_pad0: "uint32",
      fsx_pad1: "uint32"
    })
  } catch {
    return undefined
  }
}

/**
 * libzfs operations with no stable lzc equivalent: pool topology, import,
 * status/events/history, delegations, quotas, version, zone, diff, upgrade.
 */
export const bindLibzfsExtended = (
  ctx: LibzfsExtraContext
): {
  bound: Partial<NativeBindings>
  resumeToken?: (token: string) => ResumeParts | undefined
} => {
  const {
    canIterFilesystems,
    dataNv,
    filesystems,
    fromLibzfs,
    hdl,
    iterFilesystems,
    koffi,
    leafNv,
    libzfsError,
    nv,
    openZfs,
    tryFunc,
    withZfs,
    zfsClose,
    zfsGetName,
    zfsIterRoot,
    zpoolClose,
    zpoolGetConfig,
    zpoolGetName,
    zpoolIter,
    zpoolOpen
  } = ctx
  const zfsLib = ctx.zfsLib
  const zpoolOpenCanfail = ctx.zpoolOpenCanfail ?? zpoolOpen
  const bound: { -readonly [K in keyof NativeBindings]?: NativeBindings[K] } = {}
  const zpoolExport = tryFunc("int zpool_export(void *zhp, int force, const char *msg)")
  const zpoolReguid = tryFunc("int zpool_reguid(void *zhp)")
  const zpoolSetGuid = tryFunc("int zpool_set_guid(void *zhp, const uint64_t *guid)")
  const zpoolUpgrade = tryFunc("int zpool_upgrade(void *zhp, uint64_t version)")
  const zpoolClear = tryFunc("int zpool_clear(void *zhp, const char *vdev, void *rewind)")
  const zpoolClearLabel = tryFunc("int zpool_clear_label(int fd)")
  const zpoolAdd = tryFunc("int zpool_add(void *zhp, void *nvroot, int check_ashift)")
  const zpoolVdevRemove = tryFunc("int zpool_vdev_remove(void *zhp, const char *path)")
  const zpoolVdevRemoveCancel = tryFunc("int zpool_vdev_remove_cancel(void *zhp)")
  const zpoolVdevAttach = tryFunc(
    "int zpool_vdev_attach(void *zhp, const char *old_disk, const char *new_disk, void *nvroot, int replacing, int rebuild)"
  )
  const zpoolVdevDetach = tryFunc("int zpool_vdev_detach(void *zhp, const char *path)")
  const zpoolVdevOnline = tryFunc("int zpool_vdev_online(void *zhp, const char *path, int flags, _Out_ int *newstate)")
  const zpoolVdevOffline = tryFunc("int zpool_vdev_offline(void *zhp, const char *path, int temporary)")
  const zpoolVdevSplit = tryFunc(
    "int zpool_vdev_split(void *zhp, const char *newname, _Out_ void **config, void *props, uint64_t flags)"
  )
  const zpoolImport = tryFunc("int zpool_import(void *hdl, void *config, const char *newname, const char *altroot)")
  const zpoolImportProps = tryFunc(
    "int zpool_import_props(void *hdl, void *config, const char *newname, void *props, int flags)"
  )
  const zpoolReadLabel = tryFunc("int zpool_read_label(int fd, _Out_ void **label, _Out_ int *state)")
  const zpoolSearchImport = tryFunc("void *zpool_search_import(void *lpc, void *iargs)")
  const zpoolGetStateStr = tryFunc("const char *zpool_get_state_str(void *zhp)")
  const zpoolGetStatus = tryFunc("int zpool_get_status(void *zhp, _Out_ char **msgid, void *errata)")
  const zpoolStateToName = tryFunc("const char *zpool_state_to_name(int state, int aux)")
  const zpoolGetPropInt = tryFunc("uint64_t zpool_get_prop_int(void *zhp, int prop, void *src)")
  const zpoolNameToProp = tryFunc("int zpool_name_to_prop(const char *name)")
  const zpoolGetVdevProp = tryFunc(
    "int zpool_get_vdev_prop(void *zhp, const char *vdev, int prop, char *buf, char *srcbuf, uint64_t buflen, _Out_ int *src, int literal)"
  )
  const zpoolGetAllVdevProps = tryFunc("int zpool_get_all_vdev_props(void *zhp, const char *vdev, _Out_ void **props)")
  const zpoolSetVdevProp = tryFunc(
    "int zpool_set_vdev_prop(void *zhp, const char *vdev, const char *name, const char *value)"
  )
  const vdevNameToProp = tryFunc("int vdev_name_to_prop(const char *name)")
  const zpoolEventsNext = tryFunc(
    "int zpool_events_next(void *hdl, _Out_ void **nvl, _Out_ int *dropped, uint32_t nvlsize, int flags)"
  )
  const zpoolEventsClear = tryFunc("int zpool_events_clear(void *hdl, _Out_ int *count)")
  const zpoolEventsSeek = tryFunc("int zpool_events_seek(void *hdl, uint64_t eid, int flags)")
  const zpoolGetHistory = tryFunc(
    "int zpool_get_history(void *zhp, _Out_ void **nvhisp, _Out_ uint64_t *off, _Out_ int *eof)"
  )
  const zpoolGetErrlog = tryFunc("int zpool_get_errlog(void *zhp, _Out_ void **nverrlist)")
  const zpoolObjToPath = tryFunc(
    "void zpool_obj_to_path(void *zhp, uint64_t dsobj, uint64_t obj, _Out_ char *buf, uint64_t buflen)"
  )
  const zpoolObjToPathDs = tryFunc(
    "void zpool_obj_to_path_ds(void *zhp, uint64_t dsobj, uint64_t obj, _Out_ char *buf, uint64_t buflen)"
  )
  const zpoolVdevPathToGuid = tryFunc("uint64_t zpool_vdev_path_to_guid(void *zhp, const char *path)")
  const zfsCryptoAttemptLoadKeys = tryFunc("int zfs_crypto_attempt_load_keys(void *hdl, const char *fsname)")
  const zfsUnmountall = tryFunc("int zfs_unmountall(void *zhp, int flags)")
  const zfsDestroy = tryFunc("int zfs_destroy(void *zhp, int defer)")
  const zfsDestroySnaps = tryFunc("int zfs_destroy_snaps(void *zhp, const char *snapname, int defer)")
  const zfsRollback = tryFunc("int zfs_rollback(void *zhp, void *snap, int force)")
  const zfsUnmount = tryFunc("int zfs_unmount(void *zhp, const char *mnt, int flags)")
  const zfsPropSet = tryFunc("int zfs_prop_set(void *zhp, const char *name, const char *value)")
  const zfsGetFsacl = tryFunc("int zfs_get_fsacl(void *zhp, _Out_ void **nvl)")
  const zfsSetFsacl = tryFunc("int zfs_set_fsacl(void *zhp, int unallow, void *nvl)")
  try {
    koffi.proto(
      "int EffectZfsUserspaceCb(void *arg, const char *domain, uint32_t rid, uint64_t space, uint64_t default_quota)"
    )
  } catch {
    // already registered
  }
  const zfsUserspace = tryFunc("int zfs_userspace(void *zhp, int type, EffectZfsUserspaceCb *cb, void *data)")
  const zfsShowDiffs = tryFunc(
    "int zfs_show_diffs(void *zhp, int outfd, const char *fromsnap, const char *tosnap, int flags)"
  )
  const zfsIoctl = tryFunc("int zfs_ioctl(void *hdl, int ioc, void *zc)")
  const zfsVersionUserland = tryFunc("const char *zfs_version_userland()")
  const zfsVersionKernel = tryFunc("char *zfs_version_kernel()")
  const zfsSendResumeToken = tryFunc("void *zfs_send_resume_token_to_nvlist(void *hdl, const char *token)")
  const libc = tryLoad(koffi, "libc.so.6")
  const ioctlFn = libc === undefined
    ? undefined
    : (() => {
      try {
        return libc.func("int ioctl(int fd, uint64_t request, void *argp)")
      } catch {
        return undefined
      }
    })()
  const util = tryLoad(koffi, "libzutil.so.3") ?? tryLoad(koffi, "libzutil.so.1") ?? tryLoad(koffi, "libzutil.so")
  const utilReadLabel = zpoolReadLabel ?? (util === undefined
    ? undefined
    : (() => {
      try {
        return util.func("int zpool_read_label(int fd, _Out_ void **label, _Out_ int *state)")
      } catch {
        return undefined
      }
    })())
  const utilSearchImport = zpoolSearchImport ?? (util === undefined
    ? undefined
    : (() => {
      try {
        return util.func("void *zpool_search_import(void *lpc, void *iargs)")
      } catch {
        return undefined
      }
    })())
  const importSearchStructs = defineImportSearchStructs(koffi)
  const searchImportFn = zpoolSearchImport ?? utilSearchImport

  const withPool = <A>(
    operation: string,
    name: string,
    run: (zhp: unknown) => Effect.Effect<A, NativeFailure>,
    canfail = false
  ): Effect.Effect<A, NativeFailure> =>
    Effect.suspend(() => {
      const open = canfail ? zpoolOpenCanfail : zpoolOpen
      if (open === undefined || zpoolClose === undefined) {
        return Effect.fail(new NativeFailure({ operation, message: "zpool_open is not loaded" }))
      }
      const zhp = open(hdl, name)
      if (zhp === null || zhp === undefined || zhp === 0) {
        return Effect.fail(libzfsError(operation, `zpool_open ${name}`))
      }
      return run(zhp).pipe(Effect.ensuring(Effect.sync(() => zpoolClose(zhp))))
    })

  const openPool = zpoolOpenCanfail ?? zpoolOpen

  if (zpoolExport !== undefined && openPool !== undefined && zpoolClose !== undefined) {
    bound.exportPool = (input: ExportPool) =>
      withPool(
        "Pool.Export",
        input.name,
        (zhp) =>
          fromLibzfs(
            "Pool.Export",
            zpoolExport(zhp, input.force === true ? 1 : 0, "effect-zfs export"),
            `zpool_export ${input.name}`
          )
      )
  }
  if (openPool !== undefined && zpoolClose !== undefined) {
    if (zpoolReguid !== undefined || zpoolSetGuid !== undefined) {
      bound.reguidPool = (input: ReguidPool) =>
        withPool("Pool.Reguid", input.name, (zhp) => {
          if (input.guid !== undefined && zpoolSetGuid !== undefined) {
            return fromLibzfs("Pool.Reguid", zpoolSetGuid(zhp, [input.guid]), `zpool_set_guid ${input.name}`)
          }
          if (zpoolReguid === undefined) {
            return Effect.fail(new NativeFailure({ operation: "Pool.Reguid", message: "zpool_reguid is not loaded" }))
          }
          return fromLibzfs("Pool.Reguid", zpoolReguid(zhp), `zpool_reguid ${input.name}`)
        })
    }
    if (zpoolUpgrade !== undefined) {
      bound.upgradePool = (input: UpgradePool) =>
        withPool("Pool.Upgrade", input.name, (zhp) =>
          fromLibzfs(
            "Pool.Upgrade",
            zpoolUpgrade(zhp, input.version ?? 0n),
            `zpool_upgrade ${input.name}`
          ))
    }
    if (zpoolClear !== undefined) {
      bound.clearPool = (input: ClearPool) =>
        withPool("Pool.Clear", input.name, (zhp) => {
          const devices = input.devices
          if (devices === undefined || devices.length === 0) {
            return fromLibzfs("Pool.Clear", zpoolClear(zhp, null, null), `zpool_clear ${input.name}`)
          }
          return Effect.gen(function*() {
            for (const device of devices) {
              yield* fromLibzfs("Pool.Clear", zpoolClear(zhp, device, null), `zpool_clear ${device}`)
            }
          })
        })
    }
  }
  if (zpoolClearLabel !== undefined) {
    bound.labelClear = (input: LabelClear) =>
      Effect.try({
        try: () => {
          const fd = openSync(input.device, input.force === true ? "r+" : "r")
          try {
            const rc = Number(zpoolClearLabel(fd))
            if (rc !== 0) {
              throw new NativeFailure({
                operation: "Pool.LabelClear",
                message: `zpool_clear_label ${input.device}`
              })
            }
          } finally {
            closeSync(fd)
          }
        },
        catch: (cause) =>
          cause instanceof NativeFailure
            ? cause
            : new NativeFailure({
              operation: "Pool.LabelClear",
              message: cause instanceof Error ? cause.message : `zpool_clear_label ${input.device}`,
              cause
            })
      })
  }

  if (zpoolAdd !== undefined && nv !== undefined) {
    bound.addVdevs = (input: AddVdevs) => {
      if (input.dryRun === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Add",
            message: "Pool.Add dry-run is CLI-only"
          })
        )
      }
      return withPool("Pool.Add", input.pool, (zhp) => {
        const nvroot = packAddRoot(nv, input.vdevs, leafNv, dataNv)
        const result = fromLibzfs(
          "Pool.Add",
          zpoolAdd(zhp, nvroot, input.force === true ? 0 : 1),
          `zpool_add ${input.pool}`
        )
        nv.free(nvroot)
        return result
      })
    }
  }
  if (zpoolVdevRemove !== undefined) {
    bound.removeVdevs = (input: RemoveVdevs) => {
      if (input.dryRun === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Remove",
            message: "Pool.Remove dry-run is CLI-only"
          })
        )
      }
      if (input.cancel === true && zpoolVdevRemoveCancel !== undefined) {
        return withPool(
          "Pool.Remove",
          input.pool,
          (zhp) => fromLibzfs("Pool.Remove", zpoolVdevRemoveCancel(zhp), `zpool_vdev_remove_cancel ${input.pool}`)
        )
      }
      return withPool("Pool.Remove", input.pool, (zhp) =>
        Effect.gen(function*() {
          for (const device of input.devices) {
            yield* fromLibzfs("Pool.Remove", zpoolVdevRemove(zhp, device), `zpool_vdev_remove ${device}`)
          }
        }))
    }
  }
  if (zpoolVdevAttach !== undefined && nv !== undefined) {
    const attach = (operation: string, replacing: number, input: AttachVdev | ReplaceVdev) => {
      const newPath = "newDevice" in input && input.newDevice !== undefined ? input.newDevice : input.device
      return withPool(operation, input.pool, (zhp) => {
        const leaf = leafNv({ _tag: "File", path: newPath })
        const nvroot = nv.alloc()
        nv.addString(nvroot, "type", "root")
        nv.addNvlistArray(nvroot, "children", [leaf])
        const result = fromLibzfs(
          operation,
          zpoolVdevAttach(
            zhp,
            input.device,
            newPath,
            nvroot,
            replacing,
            input.sequential === true ? 1 : 0
          ),
          `${operation} ${input.device}`
        )
        nv.free(nvroot)
        return result
      })
    }
    bound.attachVdev = (input: AttachVdev) => attach("Pool.Attach", 0, input)
    bound.replaceVdev = (input: ReplaceVdev) => attach("Pool.Replace", 1, input)
  }
  if (zpoolVdevDetach !== undefined) {
    bound.detachVdev = (input: DetachVdev) =>
      withPool(
        "Pool.Detach",
        input.pool,
        (zhp) => fromLibzfs("Pool.Detach", zpoolVdevDetach(zhp, input.device), `zpool_vdev_detach ${input.device}`)
      )
  }
  if (zpoolVdevOnline !== undefined) {
    bound.onlineVdevs = (input: OnlineVdevs) =>
      withPool("Pool.Online", input.pool, (zhp) =>
        Effect.gen(function*() {
          for (const device of input.devices) {
            const state: Array<unknown> = [0]
            yield* fromLibzfs(
              "Pool.Online",
              zpoolVdevOnline(zhp, device, input.expand === true ? ZFS_ONLINE_EXPAND : 0, state),
              `zpool_vdev_online ${device}`
            )
          }
        }))
  }
  if (zpoolVdevOffline !== undefined) {
    bound.offlineVdevs = (input: OfflineVdevs) =>
      withPool("Pool.Offline", input.pool, (zhp) =>
        Effect.gen(function*() {
          for (const device of input.devices) {
            yield* fromLibzfs(
              "Pool.Offline",
              zpoolVdevOffline(zhp, device, input.temporary === true ? 1 : 0),
              `zpool_vdev_offline ${device}`
            )
          }
        }))
  }
  if (zpoolVdevSplit !== undefined) {
    bound.splitPool = (input: SplitPool) => {
      if (input.dryRun === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Split",
            message: "Pool.Split dry-run is CLI-only"
          })
        )
      }
      return withPool("Pool.Split", input.pool, (zhp) => {
        const props = nv === undefined ? null : (() => {
          const nvl = nv.alloc()
          for (const row of input.properties) nv.addString(nvl, row.name, row.value)
          if (input.altroot !== undefined) nv.addString(nvl, "altroot", input.altroot)
          return nvl
        })()
        const config: Array<unknown> = [null]
        const result = fromLibzfs(
          "Pool.Split",
          zpoolVdevSplit(zhp, input.newPool, config, props, 0n),
          `zpool_vdev_split ${input.pool}`
        )
        if (nv !== undefined && props !== null) nv.free(props)
        return result
      })
    }
  }

  if ((zpoolImport !== undefined || zpoolImportProps !== undefined) && nv !== undefined) {
    bound.importPool = (input: ImportPool) =>
      Effect.suspend(() => {
        const dirs = input.searchDirs
        if (dirs === undefined || dirs.length === 0) {
          return Effect.fail(
            new NativeFailure({
              operation: "Pool.Import",
              message: "native import needs searchDirs (will not scan /dev)"
            })
          )
        }
        const pool = String(input.name)
        let matched: unknown | undefined
        let searchRoot: unknown | undefined
        let searchKeys: ReadonlyArray<string> = []
        let searchDetail = ""
        let releaseSearch = (): void => undefined
        const ops = zfsLib?.symbol?.("libzfs_config_ops")
        const canSearch = isNativePtr(ops) &&
          searchImportFn !== undefined &&
          importSearchStructs !== undefined &&
          koffi.alloc !== undefined &&
          koffi.encode !== undefined
        if (
          canSearch &&
          isNativePtr(ops) &&
          searchImportFn !== undefined &&
          importSearchStructs !== undefined
        ) {
          try {
            const scanned = searchImportNvlist(
              koffi,
              importSearchStructs,
              searchImportFn,
              ops,
              hdl,
              pool,
              dirs,
              input.destroyed === true
            )
            releaseSearch = scanned.release
            searchDetail = scanned.detail
            if (scanned.found !== undefined) {
              searchRoot = scanned.found
              searchKeys = Object.keys(nv.unpack(scanned.found))
              matched = nv.lookupNvlist(scanned.found, pool)
              if (matched === undefined) {
                const fallback = searchKeys.find((key) => key === pool) ?? searchKeys[0]
                if (fallback !== undefined) matched = nv.lookupNvlist(scanned.found, fallback)
              }
            }
          } catch (cause) {
            releaseSearch()
            return Effect.fail(
              new NativeFailure({
                operation: "Pool.Import",
                message: `zpool_search_import: ${cause instanceof Error ? cause.message : String(cause)}`
              })
            )
          }
        }
        const files = dirs.flatMap((dir) => listFiles(dir))
        // A single-disk label is not a valid mirror/raidz config. Only fall
        // back to zpool_read_label when search_import is unavailable and
        // there is exactly one candidate device.
        if (matched === undefined && !canSearch && utilReadLabel !== undefined && files.length === 1) {
          const file = files[0] ?? ""
          if (file.length === 0) {
            releaseSearch()
            return Effect.fail(
              new NativeFailure({
                operation: "Pool.Import",
                message: `no exported pool ${pool} in search dirs`
              })
            )
          }
          let fd: number | undefined
          try {
            fd = openSync(file, "r")
            const slot: Array<unknown> = [null]
            const state: Array<unknown> = [0]
            const rc = Number(utilReadLabel(fd, slot, state))
            const label = slot[0]
            if (rc === 0 && isNativePtr(label)) {
              const unpacked = nv.unpack(label)
              if (unpacked["name"] === pool) matched = label
              else nv.free(label)
            }
          } catch {
            matched = undefined
          } finally {
            if (fd !== undefined) closeSync(fd)
          }
        }
        if (matched === undefined) {
          if (searchRoot !== undefined) nv.free(searchRoot)
          releaseSearch()
          const extra = searchDetail.length > 0
            ? `: ${searchDetail}`
            : searchKeys.length > 0
            ? ` (found ${searchKeys.join(",")})`
            : files.length === 0
            ? " (search dir is empty)"
            : ""
          return Effect.fail(
            new NativeFailure({
              operation: "Pool.Import",
              message: canSearch
                ? `no exported pool ${pool} in search dirs${extra}`
                : `zpool_search_import is not bound; cannot import ${pool}`
            })
          )
        }
        const props = (() => {
          if (input.properties === undefined && input.altroot === undefined) return null
          const nvl = nv.alloc()
          if (input.altroot !== undefined) nv.addString(nvl, "altroot", input.altroot)
          for (const row of input.properties ?? []) nv.addString(nvl, row.name, row.value)
          return nvl
        })()
        const newName = input.newName === undefined ? null : input.newName
        const flags = importFlagsOf(input) | (input.force === true ? ZFS_IMPORT_ANY_HOST : 0)
        const errno = Number(
          zpoolImportProps !== undefined
            ? zpoolImportProps(hdl, matched, newName, props, flags)
            : zpoolImport === undefined
            ? -1
            : zpoolImport(hdl, matched, newName, input.altroot === undefined ? null : input.altroot)
        )
        if (searchRoot !== undefined) nv.free(searchRoot)
        else nv.free(matched)
        if (props !== null) nv.free(props)
        releaseSearch()
        const imported = fromLibzfs(
          "Pool.Import",
          errno,
          searchRoot !== undefined ? `zpool_import search ${pool}` : `zpool_import label ${pool}`
        )
        if (input.unmounted !== true || zfsUnmountall === undefined) return imported
        return imported.pipe(
          Effect.flatMap(() => {
            const zhp = openZfs(pool, ZFS_TYPE_FILESYSTEM)
            if (zhp === undefined || zhp === null || zhp === 0) return Effect.void
            const rc = zfsUnmountall(zhp, MS_FORCE)
            zfsClose(zhp)
            return fromLibzfs("Pool.Import", rc, `zfs_unmountall ${pool}`)
          })
        )
      })
  }

  if (openPool !== undefined && zpoolClose !== undefined && zpoolGetConfig !== undefined && nv !== undefined) {
    bound.poolStatus = (input: StatusPool) =>
      withPool("Pool.Status", input.name, (zhp) =>
        Effect.try({
          try: () => {
            const stateStr = zpoolGetStateStr === undefined ? undefined : String(zpoolGetStateStr(zhp) ?? "")
            const state = poolHealthOf(stateStr?.split(/\s+/)[0])
            let vdevs: Array<VdevStatus> = []
            let raw: { readonly errlog?: NvObject } | undefined
            if (nv !== undefined && zpoolGetConfig !== undefined) {
              const config = zpoolGetConfig(zhp, null)
              if (config !== null && config !== undefined && config !== 0) {
                const tree = nv.lookupNvlist(config, "vdev_tree")
                if (tree !== undefined) vdevs = [vdevFromNv(nv, tree)]
              }
            }
            if (nv !== undefined && zpoolGetErrlog !== undefined) {
              const slot: Array<unknown> = [null]
              if (Number(zpoolGetErrlog(zhp, slot)) === 0 && isNativePtr(slot[0])) {
                raw = { errlog: nv.unpack(slot[0]) }
                nv.free(slot[0])
              }
            }
            void zpoolGetStatus
            void zpoolStateToName
            return new PoolStatus({
              name: input.name,
              ...(state === undefined ? {} : { state }),
              ...(vdevs.length === 0 ? {} : { config: vdevs }),
              ...(raw === undefined ? {} : { raw })
            })
          },
          catch: (cause) =>
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Pool.Status",
                message: cause instanceof Error ? cause.message : "zpool_get_config failed",
                cause
              })
        }), true)
  }

  if (zpoolGetAllVdevProps !== undefined && nv !== undefined) {
    bound.getVdevProperties = (input: GetVdevProperty) =>
      withPool("Pool.GetVdev", input.pool, (zhp) =>
        Effect.suspend(() => {
          const slot: Array<unknown> = [null]
          const errno = Number(zpoolGetAllVdevProps(zhp, input.vdev, slot))
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nv.free(dumped)
            return Effect.fail(libzfsError("Pool.GetVdev", `zpool_get_all_vdev_props ${input.vdev}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nv.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nv.free(dumped)
          const keys = input.property === "all" ? Object.keys(unpacked) : [input.property]
          return Effect.succeed(keys.flatMap((key) => {
            const value = unpacked[key]
            if (value === undefined) return []
            const nested = isNvObject(value) ? value["value"] : value
            const source = isNvObject(value) && typeof value["source"] === "string" ? value["source"] : "local"
            const text = typeof nested === "string"
              ? nested
              : typeof nested === "bigint"
              ? nested.toString()
              : typeof value === "string"
              ? value
              : typeof value === "bigint"
              ? value.toString()
              : "-"
            return [
              new PropertyGetRow({
                name: input.vdev,
                property: key,
                value: text,
                source
              })
            ]
          }))
        }))
    bound.getVdevProperty = (input: GetVdevProperty) => {
      if (input.property !== "all" && zpoolGetVdevProp !== undefined && vdevNameToProp !== undefined) {
        return withPool("Pool.GetVdev", input.pool, (zhp) =>
          Effect.try({
            try: () => {
              const prop = Number(vdevNameToProp(input.property))
              if (!Number.isFinite(prop) || prop < 0) {
                throw new NativeFailure({
                  operation: "Pool.GetVdev",
                  message: `vdev_name_to_prop ${input.property}`
                })
              }
              const buf = Buffer.alloc(1024)
              const srcbuf = Buffer.alloc(64)
              const src: Array<unknown> = [0]
              const errno = Number(zpoolGetVdevProp(
                zhp,
                input.vdev,
                prop,
                buf,
                srcbuf,
                buf.byteLength,
                src,
                1
              ))
              if (errno !== 0) {
                throw libzfsError("Pool.GetVdev", `zpool_get_vdev_prop ${input.vdev} ${input.property}`)
              }
              return new PropertyGetRow({
                name: input.vdev,
                property: input.property,
                value: buf.toString("utf8").replace(/\0.*$/s, ""),
                source: srcbuf.toString("utf8").replace(/\0.*$/s, "") || "local"
              })
            },
            catch: (cause) =>
              cause instanceof NativeFailure
                ? cause
                : new NativeFailure({
                  operation: "Pool.GetVdev",
                  message: cause instanceof Error ? cause.message : "zpool_get_vdev_prop failed",
                  cause
                })
          }))
      }
      if (bound.getVdevProperties === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.GetVdev",
            message: "zpool_get_all_vdev_props is not loaded"
          })
        )
      }
      return bound.getVdevProperties(input).pipe(
        Effect.flatMap((rows) => {
          const row = rows.find((item) => item.property === input.property) ?? rows[0]
          return row === undefined
            ? Effect.fail(
              new NativeFailure({
                operation: "Pool.GetVdev",
                message: `no vdev prop ${input.property} on ${input.vdev}`
              })
            )
            : Effect.succeed(row)
        })
      )
    }
  }
  if (zpoolSetVdevProp !== undefined) {
    bound.setVdevProperty = (input: SetVdevProperty) =>
      withPool("Pool.SetVdev", input.pool, (zhp) =>
        fromLibzfs(
          "Pool.SetVdev",
          zpoolSetVdevProp(zhp, input.vdev, input.property, String(input.value)),
          `zpool_set_vdev_prop ${input.vdev}`
        ))
  }

  if (zpoolEventsNext !== undefined && nv !== undefined) {
    bound.events = (input: Events) => {
      const pull = (blocking: boolean): PoolEvent | undefined => {
        const slot: Array<unknown> = [null]
        const dropped: Array<unknown> = [0]
        const errno = Number(zpoolEventsNext(hdl, slot, dropped, 0, blocking ? ZEVENT_NONE : ZEVENT_NONBLOCK))
        const dumped = slot[0]
        if (errno !== 0) {
          if (dumped !== null && dumped !== undefined) nv.free(dumped)
          return undefined
        }
        if (dumped === null || dumped === undefined) return undefined
        const unpacked = nv.unpack(dumped)
        nv.free(dumped)
        return eventFromNv(unpacked)
      }
      const pullMatching = (blocking: boolean): PoolEvent | undefined => {
        for (;;) {
          const event = pull(blocking)
          if (event === undefined) return undefined
          if (input.name === undefined || event.pool === undefined || event.pool === input.name) {
            return event
          }
        }
      }
      if (input.follow !== true) {
        const rows: Array<PoolEvent> = []
        for (;;) {
          const event = pullMatching(false)
          if (event === undefined) break
          rows.push(event)
        }
        return Stream.fromIterable(rows)
      }
      const asyncNext = Reflect.get(zpoolEventsNext, "async")
      const nextBlocking = async (): Promise<PoolEvent | undefined> => {
        if (typeof asyncNext !== "function") {
          return pullMatching(true)
        }
        for (;;) {
          const slot: Array<unknown> = [null]
          const dropped: Array<unknown> = [0]
          const rc = await new Promise<number>((resolve, reject) => {
            asyncNext.call(zpoolEventsNext, hdl, slot, dropped, 0, ZEVENT_NONE, (err: unknown, value: unknown) => {
              if (err !== null && err !== undefined) reject(err)
              else resolve(Number(value))
            })
          })
          const dumped = slot[0]
          if (rc !== 0 || dumped === null || dumped === undefined) return undefined
          const unpacked = nv.unpack(dumped)
          nv.free(dumped)
          const event = eventFromNv(unpacked)
          if (event === undefined) continue
          if (input.name === undefined || event.pool === undefined || event.pool === input.name) {
            return event
          }
        }
      }
      return Stream.fromEffect(
        Effect.tryPromise({
          try: nextBlocking,
          catch: (cause) =>
            new NativeFailure({
              operation: "Pool.Events",
              message: cause instanceof Error ? cause.message : "zpool_events_next failed",
              cause
            })
        }).pipe(
          Effect.flatMap((event) =>
            event === undefined
              ? Effect.fail(
                new NativeFailure({
                  operation: "Pool.Events",
                  message: "zpool_events_next ended"
                })
              )
              : Effect.succeed(event)
          )
        )
      ).pipe(Stream.repeat(Schedule.forever))
    }
  }
  if (zpoolEventsClear !== undefined) {
    bound.eventsClear = (_input: EventsClear) =>
      Effect.suspend(() => {
        const slot: Array<unknown> = [0]
        const errno = Number(zpoolEventsClear(hdl, slot))
        if (errno !== 0) return Effect.fail(libzfsError("Pool.EventsClear", "zpool_events_clear"))
        return Effect.succeed(new EventsCleared({ dropped: Number(slot[0] ?? 0) }))
      })
  }
  if (zpoolEventsSeek !== undefined) {
    bound.eventsSeek = (input: EventsSeek) => {
      const seek = eventsSeekFlags(input.eid)
      return fromLibzfs(
        "Pool.EventsSeek",
        zpoolEventsSeek(hdl, seek.eid, seek.flags),
        `zpool_events_seek ${input.eid}`
      )
    }
  }

  const iostatRowFromNv = (rowName: string, nv: NvpairFns, ptr: unknown): IostatRow => {
    const stats = nv.lookupUint64Array(ptr, "vdev_stats")
    const counters = iostatCountersFromStats(stats)
    const allocated = counters.allocated !== 0n
      ? counters.allocated
      : nv.lookupUint64(ptr, "allocated") ?? nv.lookupUint64(ptr, "alloc") ?? 0n
    const space = stats[VdevStatIndex.space] ?? nv.lookupUint64(ptr, "asize") ?? nv.lookupUint64(ptr, "size") ??
      allocated
    const free = space > allocated ? space - allocated : nv.lookupUint64(ptr, "free") ?? 0n
    return new IostatRow({
      name: rowName,
      allocated: byteCount(allocated),
      free: byteCount(free),
      readOps: byteCount(counters.readOps),
      writeOps: byteCount(counters.writeOps),
      readBytes: byteCount(counters.readBytes),
      writeBytes: byteCount(counters.writeBytes)
    })
  }

  const iostatThroughput = (row: IostatRow): IostatThroughput => ({
    readOps: row.readOps,
    writeOps: row.writeOps,
    readBytes: row.readBytes,
    writeBytes: row.writeBytes
  })

  const deltaIostat = (
    current: IostatSample,
    previous: ReadonlyMap<string, IostatThroughput>
  ): IostatSample =>
    new IostatSample({
      rows: current.rows.map((row) => {
        const prev = previous.get(row.name)
        if (prev === undefined) return row
        const delta = iostatDeltaThroughput(iostatThroughput(row), prev)
        return new IostatRow({
          name: row.name,
          allocated: row.allocated,
          free: row.free,
          readOps: byteCount(delta.readOps),
          writeOps: byteCount(delta.writeOps),
          readBytes: byteCount(delta.readBytes),
          writeBytes: byteCount(delta.writeBytes)
        })
      }),
      ...(current.timestamp === undefined ? {} : { timestamp: current.timestamp })
    })

  const walkIostatNv = (
    nv: NvpairFns,
    ptr: unknown,
    pool: string,
    verbose: boolean,
    wanted: ReadonlyArray<string> | undefined,
    rows: Array<IostatRow>
  ): void => {
    const type = nv.lookupString(ptr, "type") ?? "disk"
    const path = nv.lookupString(ptr, "path")
    const rowName = type === "root" ? pool : (path ?? type)
    let children: ReadonlyArray<unknown> = []
    try {
      children = nv.lookupNvlistArray(ptr, "children")
    } catch {
      children = []
    }
    const isLeaf = children.length === 0
    const include = wanted !== undefined && wanted.length > 0
      ? wanted.some((device) => device === rowName || rowName.endsWith(device) || device.endsWith(rowName))
      : verbose || isLeaf || type === "root"
    if (include) rows.push(iostatRowFromNv(rowName, nv, ptr))
    for (const child of children) walkIostatNv(nv, child, pool, verbose, wanted, rows)
  }

  const sampleIostat = (input: Iostat): Effect.Effect<IostatSample, NativeFailure> => {
    if (nv === undefined || zpoolGetConfig === undefined || openPool === undefined || zpoolClose === undefined) {
      return Effect.fail(new NativeFailure({ operation: "Pool.Iostat", message: "zpool_get_config is not loaded" }))
    }
    const names = input.name === undefined
      ? collectPoolNames()
      : [input.name]
    const wanted = input.vdevs
    const verbose = input.verbose === true
    return Effect.try({
      try: () => {
        const rows: Array<IostatRow> = []
        for (const name of names) {
          const zhp = openPool(hdl, name)
          if (zhp === null || zhp === undefined || zhp === 0) continue
          try {
            const config = zpoolGetConfig(zhp, null)
            if (config === null || config === undefined || config === 0) continue
            const tree = nv.lookupNvlist(config, "vdev_tree")
            if (tree === undefined) continue
            walkIostatNv(nv, tree, name, verbose, wanted, rows)
          } finally {
            zpoolClose(zhp)
          }
        }
        return new IostatSample({ rows, timestamp: BigInt(Date.now()) })
      },
      catch: (cause) =>
        new NativeFailure({
          operation: "Pool.Iostat",
          message: cause instanceof Error ? cause.message : "iostat sample failed",
          cause
        })
    })
  }

  const collectPoolNames = (): ReadonlyArray<string> => {
    if (zpoolIter === undefined || zpoolGetName === undefined || zpoolClose === undefined) return []
    const names: Array<string> = []
    zpoolIter(hdl, (zhp: unknown) => {
      const name = String(zpoolGetName(zhp) ?? "")
      if (name.length > 0) names.push(name)
      zpoolClose(zhp)
      return 0
    }, null)
    return names
  }

  if (zpoolGetConfig !== undefined && nv !== undefined) {
    bound.iostat = (input: Iostat) => {
      let previous: Map<string, IostatThroughput> | undefined
      const snapshot = (asDelta: boolean) =>
        sampleIostat(input).pipe(
          Effect.map((sample) => {
            const next = new Map(sample.rows.map((row) => [row.name, iostatThroughput(row)]))
            const out = asDelta && previous !== undefined ? deltaIostat(sample, previous) : sample
            previous = next
            return out
          })
        )
      const first = input.skipSinceBoot === true
        ? snapshot(false).pipe(Effect.flatMap(() => snapshot(true)))
        : snapshot(false)
      if (input.interval === undefined) return Stream.fromEffect(first)
      const later = Stream.fromEffect(
        Effect.sleep(Duration.seconds(Number(input.interval))).pipe(
          Effect.flatMap(() => snapshot(true))
        )
      ).pipe(Stream.repeat(Schedule.forever))
      const count = input.count
      if (count === undefined) return Stream.fromEffect(first).pipe(Stream.concat(later))
      if (count <= 1) return Stream.fromEffect(first)
      return Stream.fromEffect(first).pipe(Stream.concat(later.pipe(Stream.take(count - 1))))
    }
  }

  if (zpoolGetHistory !== undefined && nv !== undefined) {
    bound.history = (input: History) =>
      Stream.unwrap(
        Effect.gen(function*() {
          const names = input.name === undefined ? collectPoolNames() : [input.name]
          const rows: Array<HistoryRecord> = []
          for (const name of names) {
            yield* withPool("Pool.History", name, (zhp) =>
              Effect.suspend(() => {
                let off = 0n
                for (;;) {
                  const slot: Array<unknown> = [null]
                  const offSlot: Array<unknown> = [off]
                  const eof: Array<unknown> = [0]
                  const errno = Number(zpoolGetHistory(zhp, slot, offSlot, eof))
                  const dumped = slot[0]
                  if (errno !== 0) {
                    if (dumped !== null && dumped !== undefined) nv.free(dumped)
                    return Effect.fail(libzfsError("Pool.History", `zpool_get_history ${name}`))
                  }
                  if (dumped !== null && dumped !== undefined) {
                    for (const row of historyFromNv(nv.unpack(dumped))) {
                      rows.push(row)
                    }
                    nv.free(dumped)
                  }
                  off = asBigint(offSlot[0])
                  if (Number(eof[0]) !== 0) break
                  if (off === 0n) break
                }
                return Effect.void
              }))
          }
          return Stream.fromIterable(
            input.internal === true ? rows : rows.filter((row) => row.internal !== true)
          )
        })
      )
  }

  if (zfsVersionUserland !== undefined) {
    bound.version = () =>
      Effect.try({
        try: () => {
          const userland = String(zfsVersionUserland() ?? "")
          const kernelPtr = zfsVersionKernel === undefined ? undefined : zfsVersionKernel()
          const kernel = kernelPtr === undefined || kernelPtr === null ? "" : String(kernelPtr)
          const raw = kernel.length === 0 ? userland : `${userland}\n${kernel}`
          return parseVersionOutput(raw)
        },
        catch: (cause) =>
          new NativeFailure({
            operation: "Zfs.Version",
            message: cause instanceof Error ? cause.message : "zfs_version_userland failed",
            cause
          })
      })
  }

  if (zfsDestroy !== undefined) {
    bound.destroy = (input: Destroy) => {
      if (input.dryRun === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Dataset.Destroy",
            message: "Dataset.Destroy dry-run is CLI-only"
          })
        )
      }
      const spec = snapshotSpecOf(input.name)
      if (spec !== undefined && zfsDestroySnaps !== undefined) {
        const roots = input.recursive === true && filesystems !== undefined
          ? filesystems(spec.fs)
          : [spec.fs]
        return Effect.gen(function*() {
          for (const fs of roots) {
            yield* withZfs("Snapshot.Destroy", fs, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, (zhp) =>
              fromLibzfs(
                "Snapshot.Destroy",
                zfsDestroySnaps(zhp, spec.spec, input.defer === true ? 1 : 0),
                `zfs_destroy_snaps ${fs}@${spec.spec}`
              ))
          }
        })
      }
      const operation = input.name.includes("#") ? "Bookmark.Destroy" : "Dataset.Destroy"
      return withZfs(operation, input.name, ZFS_TYPE_DATASET, (zhp) =>
        Effect.gen(function*() {
          if (input.force === true && zfsUnmount !== undefined) {
            zfsUnmount(zhp, null, MS_FORCE)
          }
          if (input.recursive === true || input.descendants === true) {
            const children = filesystems === undefined
              ? []
              : filesystems(input.name).filter((name) => name !== input.name)
            const deepestFirst = [...children].sort((left, right) => right.split("/").length - left.split("/").length)
            for (const child of deepestFirst) {
              yield* withZfs(operation, child, ZFS_TYPE_DATASET, (handle) => {
                if (input.force === true && zfsUnmount !== undefined) zfsUnmount(handle, null, MS_FORCE)
                return fromLibzfs(operation, zfsDestroy(handle, input.defer === true ? 1 : 0), `zfs_destroy ${child}`)
              })
            }
          }
          return yield* fromLibzfs(
            operation,
            zfsDestroy(zhp, input.defer === true ? 1 : 0),
            `zfs_destroy ${input.name}`
          )
        }))
    }
  }

  if (zfsRollback !== undefined) {
    bound.rollback = (input: Rollback) => {
      const spec = snapshotSpecOf(input.snapshot)
      if (spec === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Rollback",
            message: `zfs_rollback needs filesystem@snap, got ${input.snapshot}`
          })
        )
      }
      return withZfs("Snapshot.Rollback", spec.fs, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, (zhp) => {
        const snap = openZfs(input.snapshot, ZFS_TYPE_SNAPSHOT)
        if (snap === undefined) {
          return Effect.fail(libzfsError("Snapshot.Rollback", `zfs_open ${input.snapshot}`))
        }
        const result = fromLibzfs(
          "Snapshot.Rollback",
          zfsRollback(zhp, snap, input.force === true ? 1 : 0),
          `zfs_rollback ${input.snapshot}`
        )
        zfsClose(snap)
        return result
      })
    }
  }

  bound.abortReceive = (input: AbortReceive) => {
    const hidden = recvHiddenName(input.target)
    if (zfsDestroy === undefined) {
      return Effect.fail(
        new NativeFailure({
          operation: "Replication.AbortReceive",
          message: `zfs_destroy is required to abort ${hidden}`
        })
      )
    }
    return withZfs(
      "Replication.AbortReceive",
      hidden,
      ZFS_TYPE_DATASET,
      (zhp) => fromLibzfs("Replication.AbortReceive", zfsDestroy(zhp, 0), `zfs_destroy ${hidden}`)
    )
  }

  if (zfsPropSet !== undefined) {
    bound.upgradeDataset = (input: UpgradeDataset) => {
      const version = String(input.version ?? 5)
      const apply = (name: string) =>
        withZfs(
          "Dataset.Upgrade",
          name,
          ZFS_TYPE_FILESYSTEM,
          (zhp) => fromLibzfs("Dataset.Upgrade", zfsPropSet(zhp, "version", version), `zfs_prop_set version ${name}`)
        )
      if (input.all === true) {
        if (zfsIterRoot === undefined) {
          return Effect.fail(
            new NativeFailure({ operation: "Dataset.Upgrade", message: "upgrade -a needs zfs_iter_root" })
          )
        }
        const names: Array<string> = []
        const visit = (zhp: unknown): number => {
          const name = String(zfsGetName(zhp) ?? "")
          if (name.length > 0) names.push(name)
          if (canIterFilesystems) iterFilesystems(zhp, (child: unknown) => visit(child))
          zfsClose(zhp)
          return 0
        }
        zfsIterRoot(hdl, (zhp: unknown) => visit(zhp), null)
        return Effect.forEach(names, (name) => apply(name), { discard: true })
      }
      if (input.name === undefined) {
        return Effect.fail(
          new NativeFailure({ operation: "Dataset.Upgrade", message: "upgrade needs a dataset or all" })
        )
      }
      if (input.recursive === true && filesystems !== undefined) {
        return Effect.forEach(filesystems(input.name), (name) => apply(name), { discard: true })
      }
      return apply(input.name)
    }
  }

  if (zfsSetFsacl !== undefined && nv !== undefined) {
    const writeAcl = (operation: string, input: Allow | Unallow, unallow: boolean) =>
      withZfs(operation, input.name, ZFS_TYPE_FILESYSTEM, (zhp) =>
        Effect.suspend(() => {
          const nvl = nv.alloc()
          const keys = fsaclKeys(input.who, input.inherit)
          const perms = "permissions" in input && input.permissions !== undefined ? input.permissions : []
          for (const key of keys) {
            const child = nv.alloc()
            for (const perm of perms) nv.addBoolean(child, perm)
            nv.addNvlist(nvl, key, child)
          }
          const result = fromLibzfs(operation, zfsSetFsacl(zhp, unallow ? 1 : 0, nvl), `${operation} ${input.name}`)
          nv.free(nvl)
          return result
        }))
    bound.allow = (input: Allow) => writeAcl("Dataset.Allow", input, false)
    bound.unallow = (input: Unallow) => {
      const one = writeAcl("Dataset.Unallow", input, true)
      if (input.recursive !== true || filesystems === undefined) return one
      return Effect.forEach(
        filesystems(input.name),
        (name) =>
          writeAcl(
            "Dataset.Unallow",
            new Unallow({
              name: datasetName(name),
              who: input.who,
              ...(input.permissions === undefined ? {} : { permissions: input.permissions }),
              ...(input.inherit === undefined ? {} : { inherit: input.inherit })
            }),
            true
          ),
        { discard: true }
      )
    }
  }
  if (zfsGetFsacl !== undefined && nv !== undefined) {
    bound.listAllow = (input: ListAllow) =>
      Effect.gen(function*() {
        const listings: Array<AllowListing> = []
        for (const name of walkParents(input.name)) {
          yield* withZfs("Dataset.ListAllow", name, ZFS_TYPE_FILESYSTEM, (zhp) =>
            Effect.suspend(() => {
              const slot: Array<unknown> = [null]
              const errno = Number(zfsGetFsacl(zhp, slot))
              const dumped = slot[0]
              if (errno !== 0) {
                if (dumped !== null && dumped !== undefined) nv.free(dumped)
                return Effect.void
              }
              if (dumped !== null && dumped !== undefined) {
                listings.push(parseAllowNv(name, nv.unpack(dumped)))
                nv.free(dumped)
              }
              return Effect.void
            }))
        }
        return listings
      })
  }

  if (zfsUserspace !== undefined) {
    const collectQuota = (kind: "userspace" | "groupspace" | "projectspace", input: Userspace) =>
      withZfs(
        kind === "userspace"
          ? "Dataset.Userspace"
          : kind === "groupspace"
          ? "Dataset.Groupspace"
          : "Dataset.Projectspace",
        input.name,
        ZFS_TYPE_DATASET,
        (zhp) =>
          Effect.try({
            try: () => {
              const merged = new Map<string, {
                used: bigint
                quota: bigint
                objused: bigint
                objquota: bigint
                domain: string
                rid: number
              }>()
              for (const prop of quotaPropsFor(kind)) {
                zfsUserspace(
                  zhp,
                  prop,
                  (arg: unknown, domain: unknown, rid: unknown, space: unknown, quota: unknown) => {
                    const id = `${String(domain ?? "")}:${Number(rid)}`
                    const prev = merged.get(id) ?? {
                      used: 0n,
                      quota: 0n,
                      objused: 0n,
                      objquota: 0n,
                      domain: String(domain ?? ""),
                      rid: Number(rid)
                    }
                    const field = quotaFieldOf(prop)
                    if (field === "used") prev.used = asBigint(space)
                    if (field === "quota") prev.quota = asBigint(space) === 0n ? asBigint(quota) : asBigint(space)
                    if (field === "objused") prev.objused = asBigint(space)
                    if (field === "objquota") prev.objquota = asBigint(space)
                    merged.set(id, prev)
                    return 0
                  },
                  null
                )
              }
              const type = quotaTypeLabel(kind)
              return [...merged.values()].map((row) =>
                new UserspaceRow({
                  type,
                  name: input.numeric === true || row.domain.length === 0
                    ? String(row.rid)
                    : `${row.domain}-${row.rid}`,
                  used: byteCount(row.used),
                  quota: row.quota === 0n ? "none" : byteCount(row.quota),
                  objused: byteCount(row.objused),
                  objquota: row.objquota === 0n ? "none" : byteCount(row.objquota)
                })
              )
            },
            catch: (cause) =>
              new NativeFailure({
                operation: kind === "userspace"
                  ? "Dataset.Userspace"
                  : kind === "groupspace"
                  ? "Dataset.Groupspace"
                  : "Dataset.Projectspace",
                message: cause instanceof Error ? cause.message : "zfs_userspace failed",
                cause
              })
          })
      )
    bound.userspace = (input) => collectQuota("userspace", input)
    bound.groupspace = (input) => collectQuota("groupspace", input)
    bound.projectspace = (input) => collectQuota("projectspace", input)
  }

  if (ioctlFn !== undefined) {
    const attrType = fsxattr(koffi)
    const visitProject = (path: string, input: Project, rows: Array<ProjectRow>): void => {
      const st = lstatSync(path)
      if (st.isDirectory() && input.recursive === true && input.directoryOnly !== true) {
        for (const entry of readdirSync(path)) visitProject(join(path, entry), input, rows)
      }
      if (input.directoryOnly === true && !st.isDirectory()) return
      const fd = openSync(path, "r")
      try {
        const attr = {
          fsx_xflags: 0,
          fsx_extsize: 0,
          fsx_nextents: 0,
          fsx_projid: 0,
          fsx_cowextsize: 0,
          fsx_pad0: 0,
          fsx_pad1: 0
        }
        const getRc = Number(ioctlFn(fd, BigInt(FS_IOC_FSGETXATTR), attr))
        if (getRc !== 0) return
        if (input.action === "list" || input.action === "check") {
          rows.push(
            new ProjectRow({
              path,
              projectId: projectId(BigInt(attr.fsx_projid)),
              inherit: (attr.fsx_xflags & FS_XFLAG_PROJINHERIT) !== 0
            })
          )
          return
        }
        if (input.action === "set" && input.projectId !== undefined) {
          attr.fsx_projid = Number(input.projectId)
          if (input.inherit === true) attr.fsx_xflags |= FS_XFLAG_PROJINHERIT
          ioctlFn(fd, BigInt(FS_IOC_FSSETXATTR), attr)
          return
        }
        if (input.action === "clear") {
          if (input.keepId !== true) attr.fsx_projid = 0
          attr.fsx_xflags &= ~FS_XFLAG_PROJINHERIT
          ioctlFn(fd, BigInt(FS_IOC_FSSETXATTR), attr)
        }
      } finally {
        closeSync(fd)
      }
    }
    bound.project = (input: Project) =>
      Effect.try({
        try: () => {
          const rows: Array<ProjectRow> = []
          for (const path of input.paths) visitProject(path, input, rows)
          return rows
        },
        catch: (cause) =>
          new NativeFailure({
            operation: "Dataset.Project",
            message: cause instanceof Error ? cause.message : "project ioctl failed",
            cause
          })
      })
    void attrType
  }

  if (zfsShowDiffs !== undefined) {
    bound.diff = (input: Diff) => {
      const spec = snapshotSpecOf(input.from)
      const fs = spec?.fs ?? input.from
      return withZfs("Dataset.Diff", fs, ZFS_TYPE_FILESYSTEM | ZFS_TYPE_VOLUME, (zhp) =>
        Effect.try({
          try: () => {
            const tmp = join(tmpdir(), `effect-zfs-diff-${process.pid}-${Date.now()}`)
            writeFileSync(tmp, "")
            const fd = openSync(tmp, "r+")
            try {
              let flags = 1
              if (input.timestamps === true) flags |= 2
              if (input.fileTypes === true) flags |= 4
              const rc = Number(zfsShowDiffs(
                zhp,
                fd,
                input.from,
                input.to === undefined ? null : input.to,
                flags
              ))
              if (rc !== 0) {
                throw libzfsError("Dataset.Diff", `zfs_show_diffs ${input.from}`)
              }
            } finally {
              closeSync(fd)
            }
            const stdout = readFileSync(tmp, "utf8")
            unlinkSync(tmp)
            return parseDiffOutput(stdout, {
              ...(input.fileTypes === undefined ? {} : { fileTypes: input.fileTypes }),
              ...(input.timestamps === undefined ? {} : { timestamps: input.timestamps })
            })
          },
          catch: (cause) =>
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Dataset.Diff",
                message: cause instanceof Error ? cause.message : "zfs_show_diffs failed",
                cause
              })
        }))
    }
  }

  if (zfsIoctl !== undefined) {
    bound.zone = (input: Zone) =>
      fromLibzfs(
        "Dataset.Zone",
        zfsIoctl(hdl, ZFS_IOC_USERNS_ATTACH, writeZfsCmd(input.dataset, input.namespace)),
        `ZFS_IOC_USERNS_ATTACH ${input.dataset}`
      )
    bound.unzone = (input: Zone) =>
      fromLibzfs(
        "Dataset.Unzone",
        zfsIoctl(hdl, ZFS_IOC_USERNS_DETACH, writeZfsCmd(input.dataset, input.namespace)),
        `ZFS_IOC_USERNS_DETACH ${input.dataset}`
      )
    bound.freezePool = (input: FreezePool) =>
      fromLibzfs(
        "Pool.Freeze",
        zfsIoctl(hdl, ZFS_IOC_POOL_FREEZE, writeZfsCmd(input.name)),
        `zpool freeze ${input.name}`
      )
    bound.remap = (input: Remap) =>
      fromLibzfs("Pool.Remap", zfsIoctl(hdl, ZFS_IOC_REMAP, writeZfsCmd(input.name)), `ZFS_IOC_REMAP ${input.name}`)
    bound.smbAcl = (input: SmbAcl) =>
      fromLibzfs(
        "Mount.SmbAcl",
        zfsIoctl(hdl, ZFS_IOC_SMB_ACL, writeZfsCmd(input.dataset, input.path ?? input.action)),
        `ZFS_IOC_SMB_ACL ${input.dataset}`
      )
    bound.injectFault = (input: InjectFault) =>
      Effect.suspend(() => {
        const guid = input.device === undefined || zpoolVdevPathToGuid === undefined || openPool === undefined
          ? 0n
          : (() => {
            const zhp = openPool(hdl, input.pool)
            if (zhp === null || zhp === undefined || zhp === 0) return 0n
            const value = asBigint(zpoolVdevPathToGuid(zhp, input.device))
            zpoolClose?.(zhp)
            return value
          })()
        return fromLibzfs(
          "Pool.InjectFault",
          zfsIoctl(
            hdl,
            ZFS_IOC_INJECT_FAULT,
            writeZfsInjectCmd({
              pool: input.pool,
              kind: input.kind,
              guid,
              ...(input.object === undefined ? {} : { object: input.object }),
              ...(input.duration === undefined ? {} : { duration: input.duration })
            })
          ),
          `ZFS_IOC_INJECT_FAULT ${input.pool}`
        )
      })
    bound.clearFault = (input: ClearFault) =>
      fromLibzfs(
        "Pool.ClearFault",
        zfsIoctl(hdl, ZFS_IOC_CLEAR_FAULT, writeZfsCmd("", undefined, { guid: input.id })),
        `ZFS_IOC_CLEAR_FAULT ${input.id}`
      )
    bound.listFaults = () =>
      Effect.try({
        try: () => {
          const rows: Array<InjectRecord> = []
          let cookie = 0n
          for (let i = 0; i < 64; i++) {
            const cmd = writeZfsCmd("", undefined, { cookie })
            const rc = Number(zfsIoctl(hdl, ZFS_IOC_INJECT_LIST_NEXT, cmd))
            if (rc !== 0) break
            const id = cmd.readBigUInt64LE(zfsCmdGuidOffset)
            cookie = cmd.readBigUInt64LE(zfsCmdCookieOffset)
            const raw = cmd.toString("utf8", 0, 256).replace(/\0.*$/s, "") || "unknown"
            const named = poolWhy(raw) === undefined ? poolName(raw) : undefined
            rows.push(
              new InjectRecord({
                id: uint64(id),
                ...(named === undefined ? {} : { pool: named })
              })
            )
          }
          return rows
        },
        catch: (cause) =>
          cause instanceof NativeFailure ? cause : new NativeFailure({
            operation: "Pool.ListFaults",
            message: cause instanceof Error ? cause.message : "ZFS_IOC_INJECT_LIST_NEXT failed",
            cause
          })
      })
    bound.nextObj = (input: NextObj) =>
      Effect.try({
        try: () => {
          const cmd = writeZfsCmd(input.dataset, undefined, { obj: input.object ?? 0n })
          const rc = Number(zfsIoctl(hdl, ZFS_IOC_NEXT_OBJ, cmd))
          if (rc !== 0) {
            throw libzfsError("Dataset.NextObj", `ZFS_IOC_NEXT_OBJ ${input.dataset}`)
          }
          return new NextObjResult({ object: uint64(cmd.readBigUInt64LE(zfsCmdObjOffset)) })
        },
        catch: (cause) =>
          cause instanceof NativeFailure ? cause : new NativeFailure({
            operation: "Dataset.NextObj",
            message: cause instanceof Error ? cause.message : "ZFS_IOC_NEXT_OBJ failed",
            cause
          })
      })
    bound.objToStats = (input: ObjToStats) =>
      Effect.try({
        try: () => {
          const cmd = writeZfsCmd(input.dataset, undefined, { obj: input.object })
          const rc = Number(zfsIoctl(hdl, ZFS_IOC_OBJ_TO_STATS, cmd))
          if (rc !== 0) {
            throw libzfsError("Dataset.ObjToStats", `ZFS_IOC_OBJ_TO_STATS ${input.dataset}`)
          }
          const path = cmd.toString("utf8", 4144, 4144 + 256).replace(/\0.*$/s, "") || "/"
          return new ObjStats({ path })
        },
        catch: (cause) =>
          cause instanceof NativeFailure ? cause : new NativeFailure({
            operation: "Dataset.ObjToStats",
            message: cause instanceof Error ? cause.message : "ZFS_IOC_OBJ_TO_STATS failed",
            cause
          })
      })
    bound.setVdevPath = (input: SetVdevPath) =>
      Effect.suspend(() => {
        if (openPool === undefined || zpoolVdevPathToGuid === undefined) {
          return fromLibzfs(
            "Pool.SetVdevPath",
            zfsIoctl(hdl, ZFS_IOC_VDEV_SETPATH, writeZfsCmd(input.pool, input.path)),
            `ZFS_IOC_VDEV_SETPATH ${input.vdev}`
          )
        }
        const zhp = openPool(hdl, input.pool)
        if (zhp === null || zhp === undefined || zhp === 0) {
          return Effect.fail(libzfsError("Pool.SetVdevPath", `zpool_open ${input.pool}`))
        }
        const guid = asBigint(zpoolVdevPathToGuid(zhp, input.vdev))
        zpoolClose?.(zhp)
        return fromLibzfs(
          "Pool.SetVdevPath",
          zfsIoctl(hdl, ZFS_IOC_VDEV_SETPATH, writeZfsCmd(input.pool, input.path, { guid })),
          `ZFS_IOC_VDEV_SETPATH ${input.vdev}`
        )
      })
    bound.setVdevFru = (input: SetVdevFru) =>
      fromLibzfs(
        "Pool.SetVdevFru",
        zfsIoctl(hdl, ZFS_IOC_VDEV_SETFRU, writeZfsCmd(input.pool, input.fru)),
        `ZFS_IOC_VDEV_SETFRU ${input.vdev}`
      )
  }
  if (bound.setVdevProperty !== undefined) {
    const previousSet = bound.setVdevProperty
    const setPath = bound.setVdevPath
    const setFru = bound.setVdevFru
    bound.setVdevProperty = (input: SetVdevProperty) => {
      if (input.property === "path" && setPath !== undefined) {
        return setPath(new SetVdevPath({ pool: input.pool, vdev: input.vdev, path: String(input.value) }))
      }
      if (input.property === "fru" && setFru !== undefined) {
        return setFru(new SetVdevFru({ pool: input.pool, vdev: input.vdev, fru: String(input.value) }))
      }
      return previousSet(input)
    }
  }

  if (zpoolObjToPath !== undefined && openPool !== undefined && zpoolClose !== undefined) {
    bound.objToPath = (input: ObjToPath) =>
      withPool("Dataset.ObjToPath", input.pool, (zhp) =>
        Effect.sync(() => {
          const buf = Buffer.alloc(4096)
          zpoolObjToPath(zhp, input.datasetObject, input.object, buf, buf.byteLength)
          return new ObjPath({ path: buf.toString("utf8").replace(/\0.*$/s, "") || "/" })
        }))
  }
  if (zpoolObjToPathDs !== undefined && openPool !== undefined && zpoolClose !== undefined) {
    bound.dsobjToName = (input: ObjToPath) =>
      withPool("Dataset.DsobjToName", input.pool, (zhp) =>
        Effect.sync(() => {
          const buf = Buffer.alloc(4096)
          zpoolObjToPathDs(zhp, input.datasetObject, input.object, buf, buf.byteLength)
          return new ObjPath({ path: buf.toString("utf8").replace(/\0.*$/s, "") || String(input.pool) })
        }))
  }
  if (zpoolGetErrlog !== undefined && nv !== undefined && openPool !== undefined) {
    bound.errorLog = (input: ErrorLog) =>
      withPool("Pool.ErrorLog", input.name, (zhp) =>
        Effect.sync(() => {
          const slot: Array<unknown> = [null]
          if (Number(zpoolGetErrlog(zhp, slot)) !== 0 || !isNativePtr(slot[0])) return []
          const unpacked = nv.unpack(slot[0])
          nv.free(slot[0])
          return Object.keys(unpacked).map((name) => new ErrorLogRow({ name }))
        }))
  }
  if (zfsCryptoAttemptLoadKeys !== undefined) {
    bound.loadKey = (input: LoadKey) => {
      if (input.all !== true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Crypto.LoadKey",
            message: "lzc_load_key requires a dataset name"
          })
        )
      }
      return fromLibzfs(
        "Crypto.LoadKey",
        zfsCryptoAttemptLoadKeys(hdl, input.name === undefined ? null : input.name),
        "zfs_crypto_attempt_load_keys"
      )
    }
  }
  const resumeToken = zfsSendResumeToken === undefined || nv === undefined
    ? undefined
    : (token: string): ResumeParts | undefined => {
      const nvl = zfsSendResumeToken(hdl, token)
      if (nvl === null || nvl === undefined || nvl === 0) return undefined
      const unpacked = nv.unpack(nvl)
      nv.free(nvl)
      return resumePartsFromNv(unpacked)
    }

  void zpoolNameToProp
  void zpoolGetPropInt

  return resumeToken === undefined ? { bound } : { bound, resumeToken }
}
