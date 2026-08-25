import { Effect, Schema, Stream } from "effect"
import { closeSync, createReadStream, lstatSync, openSync, readdirSync, writeSync } from "node:fs"
import { createRequire } from "node:module"
import { join } from "node:path"
import type {
  AbortReceive,
  ChangeKey,
  ChannelProgram,
  Clone,
  Condense,
  CreateBookmark,
  CreateFilesystem,
  CreateSnapshot,
  CreateVolume,
  DdtPrune,
  Destroy,
  DestroyBookmark,
  Exists,
  GetBookmarkProps,
  GetProperty,
  GetVdevProperty,
  Hold,
  InitializePool,
  ListBookmarks,
  ListHolds,
  LoadKey,
  Prefetch,
  Receive,
  Redact,
  Release,
  Rewrite,
  Rollback,
  Scrub,
  Send,
  SendProgress,
  SetBootenv,
  SetVdevProperty,
  SnaprangeSpace,
  SyncPool,
  TrimPool,
  WaitFilesystem,
  WaitPool
} from "../args/index.js"
import {
  BookmarkListItem,
  Bootenv,
  BootenvPair,
  ChannelProgramResult,
  dcpCmdOf,
  keyFormatFromProperties,
  SendProgressReport,
  SendSpaceEstimate,
  SnapshotHold,
  WaitResult,
  wrappingKeyToNativeBytes
} from "../args/index.js"
import { byteCount, minPbkdf2Iterations } from "../schema/limits.js"
import { PropertyGetRow } from "../schema/models.js"
import { bookmarkName, DatasetName, holdTag, SnapshotName } from "../schema/name.js"
import type { NativeBindings, NativeFailureOrTransport } from "./bindings.js"
import {
  needsLibzfsDestroy,
  needsLibzfsRollback,
  needsLibzfsSend,
  recvHiddenName,
  snapshotInRange,
  snapshotSpecOf
} from "./codec.js"
import { NativeFailure } from "./failure.js"
import { loadLinuxLibzfs, type NativeExpand } from "./libzfs.js"
import {
  jsonFromNvObject,
  loadNvpair,
  nvlistBooleanKeys,
  nvlistFromProperties,
  nvlistGuidMap,
  nvlistStringMap,
  type NvObject,
  type NvpairFns,
  propertyRowsFromNvlist
} from "./nvlist.js"
import { beginRecordBytes, concatBytes, receiveSnapName, receiveSnapWhy, sendBeginInfo } from "./stream-header.js"

const require = createRequire(import.meta.url)

type KoffiFn = ((...args: Array<unknown>) => unknown) & {
  readonly async: (...args: Array<unknown>) => void
}

type KoffiLib = {
  readonly func: (signature: string) => KoffiFn
}

type Koffi = {
  readonly load: (name: string) => KoffiLib
  readonly proto: (signature: string) => unknown
  readonly register: (callback: (...args: Array<unknown>) => unknown, type: unknown) => bigint
  readonly unregister: (handle: bigint) => void
  readonly struct: (nameOrMembers: string | Record<string, unknown>, members?: Record<string, unknown>) => unknown
  readonly errno?: {
    (): number
    (value: number): number
  }
}

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

const unsupportedDryRun = (operation: string) =>
  Effect.fail(
    new NativeFailure({
      operation,
      message: `${operation} dry-run is CLI-only`
    })
  )

const poolWaitActivity = {
  discard: 0,
  free: 1,
  initialize: 2,
  replace: 3,
  remove: 4,
  resilver: 5,
  scrub: 6,
  trim: 7,
  raidz_expand: 8,
  condense: 9
} as const

const defaultPoolWait = [
  "discard",
  "free",
  "initialize",
  "replace",
  "remove",
  "resilver",
  "scrub",
  "trim"
] as const

const sendFlagBits = (input: Send): number => {
  const options = input.options
  let bits = 0
  if (options?.compressed === true) bits |= 1 << 2
  if (options?.raw === true) bits |= 1 << 3
  if (options?.saved === true) bits |= 1 << 4
  for (const flag of options?.flags ?? []) {
    if (flag === "embed") bits |= 1 << 0
    if (flag === "large-block") bits |= 1 << 1
    if (flag === "compress") bits |= 1 << 2
    if (flag === "raw") bits |= 1 << 3
  }
  return bits
}

const decodeSnap = Schema.decodeUnknownSync(SnapshotName)
const decodeDataset = Schema.decodeUnknownSync(DatasetName)

const asBigint = (value: unknown): bigint => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) return BigInt(value)
  return 0n
}

const ZFS_IOC_POOL_SCRUB = 0x5a57
const ZFS_IOC_REWRITE = 0x40208303
const POOL_SCAN_NONE = 0
const POOL_SCAN_SCRUB = 1
const POOL_SCAN_RESILVER = 2
const POOL_SCRUB_NORMAL = 0
const POOL_SCRUB_PAUSE = 1
const POOL_INITIALIZE_START = 0
const POOL_INITIALIZE_CANCEL = 1
const POOL_INITIALIZE_SUSPEND = 2
const POOL_INITIALIZE_UNINIT = 3
const POOL_TRIM_START = 0
const POOL_TRIM_CANCEL = 1
const POOL_TRIM_SUSPEND = 2
const ZPOOL_DDT_PRUNE_AGE = 1
const ZPOOL_DDT_PRUNE_PERCENTAGE = 2
const ZFS_REWRITE_PHYSICAL = 0x1
const ZFS_REWRITE_SKIP_SNAPSHOT = 0x2
const ZFS_REWRITE_SKIP_BRT = 0x4
const CHANNEL_INSTRLIMIT = 10_000_000n
const CHANNEL_MEMLIMIT = 10n * 1024n * 1024n

const callAsync = (fn: KoffiFn, args: ReadonlyArray<unknown>): Promise<number> =>
  new Promise((resolve, reject) => {
    fn.async(...args, (err: unknown, rc: unknown) => {
      if (err !== null && err !== undefined) reject(err)
      else resolve(Number(rc))
    })
  })

const guidOf = (vdev: string): bigint | undefined => {
  if (!/^\d+$/.test(vdev)) return undefined
  try {
    return BigInt(vdev)
  } catch {
    return undefined
  }
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

const rowFromNv = (name: string, property: string, unpacked: NvObject): PropertyGetRow => {
  const rows = propertyRowsFromNvlist(name, unpacked, property)
  const row = rows[0]
  if (row === undefined) {
    return new PropertyGetRow({ name, property, value: "-", source: "-" })
  }
  return new PropertyGetRow({
    name: row.name,
    property: row.property,
    value: row.value,
    source: row.source
  })
}

/**
 * Optional Linux `libzfs_core` + libnvpair FFI via koffi, merged with a
 * `libzfs` subset. Missing libraries or non-Linux hosts return `undefined`;
 * callers merge onto `unboundBindings`.
 */
export const loadLinuxLzc = (): Partial<NativeBindings> | undefined => {
  if (process.platform !== "linux") return undefined
  let koffi: Koffi
  try {
    koffi = require("koffi") as Koffi
  } catch {
    return undefined
  }
  let core: KoffiLib
  try {
    core = koffi.load("libzfs_core.so.3")
  } catch {
    try {
      core = koffi.load("libzfs_core.so")
    } catch {
      return undefined
    }
  }
  const tryFunc = (signature: string) => {
    try {
      return core.func(signature)
    } catch {
      return undefined
    }
  }
  const init = tryFunc("int libzfs_core_init()")
  if (init === undefined) return undefined
  const existsFn = tryFunc("int lzc_exists(const char *name)")
  const destroyFn = tryFunc("int lzc_destroy(const char *name)")
  const renameFn = tryFunc("int lzc_rename(const char *from, const char *to)")
  const promoteFn = tryFunc("int lzc_promote(const char *name, void *fillmsg, int fillmsgsz)")
  const unloadKeyFn = tryFunc("int lzc_unload_key(const char *name)")
  const reopenFn = tryFunc("int lzc_reopen(const char *pool, int restart)")
  const checkpointFn = tryFunc("int lzc_pool_checkpoint(const char *pool)")
  const checkpointDiscardFn = tryFunc("int lzc_pool_checkpoint_discard(const char *pool)")
  const rollbackToFn = tryFunc("int lzc_rollback_to(const char *fsname, const char *snapname)")
  const waitFn = tryFunc("int lzc_wait(const char *pool, int activity, _Out_ int *waited)")
  const waitFsFn = tryFunc("int lzc_wait_fs(const char *fs, int activity, _Out_ int *waited)")
  const prefetchFn = tryFunc("int lzc_pool_prefetch(const char *pool, int type)")
  const snaprangeFn = tryFunc("int lzc_snaprange_space(const char *first, const char *last, _Out_ uint64_t *size)")
  const sendSpaceFn = tryFunc("int lzc_send_space(const char *snap, const char *from, int flags, _Out_ uint64_t *size)")
  const condenseFn = tryFunc("int lzc_condense(const char *pool, const char *type, const char *command)")
  const createFn = tryFunc("int lzc_create(const char *name, int type, void *props, void *wkey, uint32_t wkeylen)")
  const snapshotFn = tryFunc("int lzc_snapshot(void *snaps, void *props, _Out_ void **errlist)")
  const cloneFn = tryFunc("int lzc_clone(const char *name, const char *origin, void *props)")
  const holdFn = tryFunc("int lzc_hold(void *holds, int cleanup_fd, _Out_ void **errlist)")
  const releaseFn = tryFunc("int lzc_release(void *holds, _Out_ void **errlist)")
  const bookmarkFn = tryFunc("int lzc_bookmark(void *bookmarks, _Out_ void **errlist)")
  const destroyBookmarksFn = tryFunc("int lzc_destroy_bookmarks(void *bookmarks, _Out_ void **errlist)")
  const destroySnapsFn = tryFunc("int lzc_destroy_snaps(void *snaps, int defer, _Out_ void **errlist)")
  const getHoldsFn = tryFunc("int lzc_get_holds(const char *snap, _Out_ void **holds)")
  const getBookmarksFn = tryFunc("int lzc_get_bookmarks(const char *fs, void *props, _Out_ void **bmarks)")
  const getBookmarkPropsFn = tryFunc("int lzc_get_bookmark_props(const char *bookmark, _Out_ void **props)")
  const getPropsFn = tryFunc("int lzc_get_props(const char *pool, _Out_ void **props)")
  const loadKeyFn = tryFunc("int lzc_load_key(const char *name, int noop, void *wkey, uint32_t wkeylen)")
  const changeKeyFn = tryFunc(
    "int lzc_change_key(const char *name, uint64_t cmd, void *props, void *wkey, uint32_t wkeylen)"
  )
  const syncFn = tryFunc("int lzc_sync(const char *pool, void *innvl, void *outnvl)")
  const trimFn = tryFunc(
    "int lzc_trim(const char *pool, int cmd, uint64_t rate, int secure, void *vdevs, _Out_ void **errlist)"
  )
  const initializeFn = tryFunc(
    "int lzc_initialize(const char *pool, int cmd, uint64_t value, int value_provided, void *vdevs, _Out_ void **errlist)"
  )
  const scrubFn = tryFunc("int lzc_scrub(int ioc, const char *pool, void *args, _Out_ void **errlist)")
  const sendFn = tryFunc("int lzc_send(const char *snap, const char *from, int fd, int flags)")
  const sendResumeFn = tryFunc(
    "int lzc_send_resume(const char *snap, const char *from, int fd, int flags, uint64_t obj, uint64_t off)"
  )
  const sendRedactedFn = tryFunc(
    "int lzc_send_redacted(const char *snap, const char *from, int fd, int flags, const char *book)"
  )
  const receiveFn = tryFunc(
    "int lzc_receive(const char *snap, void *props, const char *origin, int force, int raw, int fd)"
  )
  const receiveResumableFn = tryFunc(
    "int lzc_receive_resumable(const char *snap, void *props, const char *origin, int force, int raw, int fd)"
  )
  const receiveCmdpropsFn = tryFunc(
    "int lzc_receive_with_cmdprops(const char *snap, void *props, void *cmdprops, void *wkey, uint32_t wkeylen, const char *origin, int force, int raw, int resumable, int fd, void *begin, int cleanup_fd, _Out_ uint64_t *read_bytes, _Out_ uint64_t *errflags, _Out_ uint64_t *action_handle, _Out_ void **errors)"
  )
  const receiveHealFn = tryFunc(
    "int lzc_receive_with_heal(const char *snap, void *props, void *cmdprops, void *wkey, uint32_t wkeylen, const char *origin, int force, int resumable, int raw, int heal, int fd, void *begin, int cleanup_fd, _Out_ uint64_t *read_bytes, _Out_ uint64_t *errflags, _Out_ uint64_t *action_handle, _Out_ void **errors)"
  )
  const sendProgressFn = tryFunc(
    "int lzc_send_progress(const char *snap, int fd, _Out_ uint64_t *bytes, _Out_ uint64_t *blocks)"
  )
  const channelFn = tryFunc(
    "int lzc_channel_program(const char *pool, const char *program, uint64_t instrlimit, uint64_t memlimit, void *args, _Out_ void **outnvl)"
  )
  const channelNosyncFn = tryFunc(
    "int lzc_channel_program_nosync(const char *pool, const char *program, uint64_t instrlimit, uint64_t memlimit, void *args, _Out_ void **outnvl)"
  )
  const redactFn = tryFunc("int lzc_redact(const char *snap, const char *book, void *snapnv)")
  const getBootenvFn = tryFunc("int lzc_get_bootenv(const char *pool, _Out_ void **outnvl)")
  const setBootenvFn = tryFunc("int lzc_set_bootenv(const char *pool, void *env)")
  const ddtPruneFn = tryFunc("int lzc_ddt_prune(const char *pool, int unit, uint64_t amount)")
  const getVdevFn = tryFunc("int lzc_get_vdev_prop(const char *pool, void *innvl, _Out_ void **outnvl)")
  const setVdevFn = tryFunc("int lzc_set_vdev_prop(const char *pool, void *innvl, _Out_ void **outnvl)")
  let libc: KoffiLib | undefined
  try {
    libc = koffi.load("libc.so.6")
  } catch {
    libc = undefined
  }
  const pipeFn = libc === undefined
    ? undefined
    : (() => {
      try {
        return libc.func("int pipe(_Out_ int pipefd[2])")
      } catch {
        try {
          return libc.func("int pipe(_Out_ int *pipefd)")
        } catch {
          return undefined
        }
      }
    })()
  const closeFn = libc === undefined
    ? undefined
    : (() => {
      try {
        return libc.func("int close(int fd)")
      } catch {
        return undefined
      }
    })()
  let ioctlFn: KoffiFn | undefined
  let rewriteArgsType: unknown
  try {
    rewriteArgsType = koffi.struct("ZfsRewriteArgs", {
      off: "uint64_t",
      len: "uint64_t",
      flags: "uint64_t",
      arg: "uint64_t"
    })
    ioctlFn = libc?.func("int ioctl(int fd, unsigned long request, ZfsRewriteArgs *argp)")
  } catch {
    ioctlFn = undefined
  }
  const nv: NvpairFns | undefined = loadNvpair(koffi)
  const expand: { current?: NativeExpand } = {}
  const withNvlist = <A>(
    operation: string,
    run: (nvl: NvpairFns) => Effect.Effect<A, NativeFailureOrTransport>
  ) => {
    if (nv === undefined) {
      return Effect.fail(
        new NativeFailure({
          operation,
          message: "libnvpair is not loaded"
        })
      )
    }
    return run(nv)
  }
  const callWithErrlist = (
    operation: string,
    nvl: NvpairFns,
    invoke: (errlist: Array<unknown>) => unknown,
    message: string
  ) => {
    const errlist: Array<unknown> = [null]
    const errno = Number(invoke(errlist))
    const dumped = errlist[0]
    if (dumped !== null && dumped !== undefined) nvl.free(dumped)
    return fromErrno(operation, errno, message)
  }
  const rc = Number(init())
  if (!Number.isFinite(rc) || rc !== 0) return undefined

  const bound: { -readonly [K in keyof NativeBindings]?: NativeBindings[K] } = {}

  if (existsFn !== undefined) {
    bound.exists = (input: Exists) => Effect.sync(() => Number(existsFn(input.name)) !== 0)
  }
  if (destroyFn !== undefined) {
    bound.destroy = (input: Destroy) => {
      if (input.name.includes("%") || input.recursive === true || input.descendants === true || input.defer === true) {
        return Effect.fail(
          new NativeFailure({
            operation: input.name.includes("@") ? "Snapshot.Destroy" : "Dataset.Destroy",
            message: "native destroy of ranges/flags requires nvlist lzc_destroy_snaps"
          })
        )
      }
      const operation = input.name.includes("#")
        ? "Bookmark.Destroy"
        : input.name.includes("@")
        ? "Snapshot.Destroy"
        : "Dataset.Destroy"
      return fromErrno(operation, Number(destroyFn(input.name)), `lzc_destroy ${input.name}`)
    }
  }
  if (renameFn !== undefined) {
    bound.rename = (input) =>
      fromErrno(
        input.from.includes("@") ? "Snapshot.Rename" : "Dataset.Rename",
        Number(renameFn(input.from, input.to)),
        `lzc_rename ${input.from} ${input.to}`
      )
  }
  if (promoteFn !== undefined) {
    bound.promote = (input) =>
      fromErrno("Snapshot.Promote", Number(promoteFn(input.name, null, 0)), `lzc_promote ${input.name}`)
  }
  if (unloadKeyFn !== undefined) {
    bound.unloadKey = (input) => {
      if (input.name === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Crypto.UnloadKey",
            message: "lzc_unload_key requires a dataset name"
          })
        )
      }
      return fromErrno("Crypto.UnloadKey", Number(unloadKeyFn(input.name)), `lzc_unload_key ${input.name}`)
    }
  }
  if (reopenFn !== undefined) {
    bound.reopenPool = (input) =>
      fromErrno(
        "Pool.Reopen",
        Number(reopenFn(input.name, input.noRestart === true ? 0 : 1)),
        `lzc_reopen ${input.name}`
      )
  }
  if (checkpointFn !== undefined && checkpointDiscardFn !== undefined) {
    bound.checkpointPool = (input) =>
      fromErrno(
        "Pool.Checkpoint",
        Number((input.discard === true ? checkpointDiscardFn : checkpointFn)(input.name)),
        `lzc_pool_checkpoint ${input.name}`
      )
  }
  if (rollbackToFn !== undefined) {
    bound.rollback = (input: Rollback) => {
      if (needsLibzfsRollback(input) && expand.current?.rollback !== undefined) {
        return expand.current.rollback(input)
      }
      if (needsLibzfsRollback(input)) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Rollback",
            message: "native rollback -r/-R/-f is libzfs, not lzc_rollback_to"
          })
        )
      }
      const fsname = input.snapshot.slice(0, input.snapshot.indexOf("@"))
      return fromErrno(
        "Snapshot.Rollback",
        Number(rollbackToFn(fsname, input.snapshot)),
        `lzc_rollback_to ${input.snapshot}`
      )
    }
  }
  if (waitFn !== undefined) {
    bound.waitPool = (input: WaitPool) =>
      Effect.gen(function*() {
        const activities = input.activities ?? defaultPoolWait
        let waited = false
        for (const activity of activities) {
          const slot = [0]
          const errno = Number(waitFn(input.pool, poolWaitActivity[activity], slot))
          if (errno !== 0) {
            return yield* nativeFail("Pool.Wait", errno, `lzc_wait ${input.pool} ${activity}`)
          }
          if (Number(slot[0]) !== 0) waited = true
        }
        return new WaitResult({ waited })
      })
  }
  if (waitFsFn !== undefined) {
    bound.waitFs = (input: WaitFilesystem) =>
      Effect.gen(function*() {
        const slot = [0]
        const errno = Number(waitFsFn(input.dataset, 0, slot))
        if (errno !== 0) {
          return yield* nativeFail("Dataset.Wait", errno, `lzc_wait_fs ${input.dataset}`)
        }
        return new WaitResult({ waited: Number(slot[0]) !== 0 })
      })
  }
  if (prefetchFn !== undefined) {
    bound.prefetch = (input: Prefetch) => {
      const type = input.prefetchType === "brt" ? 2 : 1
      return fromErrno("Pool.Prefetch", Number(prefetchFn(input.name, type)), `lzc_pool_prefetch ${input.name}`)
    }
  }
  if (snaprangeFn !== undefined) {
    bound.snaprangeSpace = (input: SnaprangeSpace) =>
      Effect.gen(function*() {
        const slot: Array<unknown> = [0n]
        const errno = Number(snaprangeFn(input.first, input.last, slot))
        if (errno !== 0) {
          return yield* nativeFail(
            "Replication.SnaprangeSpace",
            errno,
            `lzc_snaprange_space ${input.first} ${input.last}`
          )
        }
        return new SendSpaceEstimate({ bytes: byteCount(asBigint(slot[0])) })
      })
  }
  if (sendSpaceFn !== undefined) {
    bound.sendSpace = (input: Send) =>
      Effect.gen(function*() {
        const snap = input.snapshot
        if (snap === undefined) {
          return yield* new NativeFailure({
            operation: "Replication.SendSpace",
            message: "lzc_send_space requires a snapshot"
          })
        }
        if (input.options?.resumeToken !== undefined || input.options?.redact !== undefined) {
          return yield* new NativeFailure({
            operation: "Replication.SendSpace",
            message: "resume/redact send space needs nvlist lzc_send_space_resume_redacted"
          })
        }
        const slot: Array<unknown> = [0n]
        const from = input.options?.from
        const errno = Number(sendSpaceFn(snap, from === undefined ? null : from, sendFlagBits(input), slot))
        if (errno !== 0) {
          return yield* nativeFail("Replication.SendSpace", errno, `lzc_send_space ${snap}`)
        }
        return new SendSpaceEstimate({ bytes: byteCount(asBigint(slot[0])) })
      })
  }
  if (condenseFn !== undefined) {
    bound.condense = (input: Condense) =>
      fromErrno(
        "Pool.Condense",
        Number(condenseFn(input.pool, input.type ?? "log_spacemap", input.command ?? "start")),
        `lzc_condense ${input.pool}`
      )
  }
  const createParents = (operation: string, name: string): Effect.Effect<void, NativeFailureOrTransport> => {
    if (expand.current?.createAncestors !== undefined) {
      return expand.current.createAncestors(operation, name)
    }
    if (existsFn === undefined || createFn === undefined) {
      return Effect.fail(
        new NativeFailure({
          operation,
          message: "lzc_exists/lzc_create is required to create parent datasets"
        })
      )
    }
    const missing = ancestorDatasets(name).filter((parent) => Number(existsFn(parent)) === 0)
    return Effect.suspend(() => {
      for (const parent of missing) {
        const errno = Number(createFn(parent, 2, null, null, 0))
        if (errno !== 0) return fromErrno(operation, errno, `lzc_create ${parent}`)
      }
      return Effect.void
    })
  }
  if (createFn !== undefined) {
    bound.createFilesystem = (input: CreateFilesystem) => {
      if (input.dryRun === true) return unsupportedDryRun("Dataset.CreateFilesystem")
      const create = withNvlist("Dataset.CreateFilesystem", (nvl) =>
        Effect.suspend(() => {
          const props = nvlistFromProperties(nvl, input.properties) ??
            (input.wrappingKey === undefined ? undefined : nvl.alloc())
          if (props !== undefined && input.wrappingKey !== undefined) {
            const unpacked = nvl.unpack(props)
            if (unpacked["pbkdf2iters"] === undefined) nvl.addUint64(props, "pbkdf2iters", minPbkdf2Iterations)
          }
          const key = input.wrappingKey === undefined
            ? undefined
            : wrappingKeyToNativeBytes(input.wrappingKey, keyFormatFromProperties(input.properties))
          const errno = Number(createFn(
            input.name,
            2,
            props ?? null,
            key === undefined ? null : key,
            key === undefined ? 0 : key.byteLength
          ))
          if (props !== undefined) nvl.free(props)
          return fromErrno("Dataset.CreateFilesystem", errno, `lzc_create ${input.name}`)
        }))
      return input.parents === true
        ? createParents("Dataset.CreateFilesystem", input.name).pipe(Effect.flatMap(() => create))
        : create
    }
    bound.createVolume = (input: CreateVolume) => {
      if (input.dryRun === true) return unsupportedDryRun("Dataset.CreateVolume")
      const create = withNvlist("Dataset.CreateVolume", (nvl) =>
        Effect.suspend(() => {
          const props = nvl.alloc()
          nvl.addUint64(props, "volsize", input.size)
          if (input.volblocksize !== undefined) nvl.addUint64(props, "volblocksize", input.volblocksize)
          if (input.sparse === true) nvl.addString(props, "refreservation", "none")
          for (const row of input.properties) nvl.addString(props, row.name, row.value)
          const key = input.wrappingKey === undefined
            ? undefined
            : wrappingKeyToNativeBytes(input.wrappingKey, keyFormatFromProperties(input.properties))
          if (input.wrappingKey !== undefined) {
            const unpacked = nvl.unpack(props)
            if (unpacked["pbkdf2iters"] === undefined) nvl.addUint64(props, "pbkdf2iters", minPbkdf2Iterations)
          }
          const errno = Number(createFn(
            input.name,
            3,
            props,
            key === undefined ? null : key,
            key === undefined ? 0 : key.byteLength
          ))
          nvl.free(props)
          return fromErrno("Dataset.CreateVolume", errno, `lzc_create ${input.name}`)
        }))
      return create
    }
  }
  if (snapshotFn !== undefined) {
    bound.createSnapshot = (input: CreateSnapshot) => {
      if (input.recursive === true && expand.current?.snapshot !== undefined) {
        return expand.current.snapshot(input)
      }
      const extras = input.snapshots ?? []
      if (input.recursive === true && expand.current?.filesystems === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Create",
            message: "native recursive snapshot needs libzfs zfs_snapshot or filesystem iteration"
          })
        )
      }
      const names = input.recursive === true
        ? [...expandSnapshots(input.name, expand.current), ...extras]
        : [input.name, ...extras]
      return withNvlist("Snapshot.Create", (nvl) =>
        Effect.suspend(() => {
          const snaps = nvlistBooleanKeys(nvl, names)
          const props = nvlistFromProperties(nvl, input.properties)
          const result = callWithErrlist(
            "Snapshot.Create",
            nvl,
            (errlist) => snapshotFn(snaps, props ?? null, errlist),
            `lzc_snapshot ${input.name}`
          )
          nvl.free(snaps)
          if (props !== undefined) nvl.free(props)
          return result
        }))
    }
  }
  if (cloneFn !== undefined) {
    bound.clone = (input: Clone) => {
      const clone = withNvlist("Snapshot.Clone", (nvl) =>
        Effect.suspend(() => {
          const props = nvlistFromProperties(nvl, input.properties)
          const errno = Number(cloneFn(input.target, input.snapshot, props ?? null))
          if (props !== undefined) nvl.free(props)
          return fromErrno("Snapshot.Clone", errno, `lzc_clone ${input.target}`)
        }))
      return input.parents === true && createFn !== undefined
        ? createParents("Snapshot.Clone", input.target).pipe(Effect.flatMap(() => clone))
        : clone
    }
  }
  if (holdFn !== undefined) {
    bound.hold = (input: Hold) => {
      if (input.recursive === true && expand.current?.hold !== undefined) {
        return expand.current.hold(input)
      }
      if (input.recursive === true && expand.current?.filesystems === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Hold",
            message: "native recursive hold needs libzfs zfs_hold or filesystem iteration"
          })
        )
      }
      const snaps = input.recursive === true
        ? expandSnapshots(input.snapshot, expand.current)
        : [input.snapshot]
      return withNvlist("Snapshot.Hold", (nvl) =>
        Effect.suspend(() => {
          const holds = nvlistStringMap(nvl, snaps.map((snap) => [snap, input.tag] as const))
          const result = callWithErrlist(
            "Snapshot.Hold",
            nvl,
            (errlist) => holdFn(holds, -1, errlist),
            `lzc_hold ${input.snapshot}`
          )
          nvl.free(holds)
          return result
        }))
    }
  }
  if (releaseFn !== undefined) {
    bound.release = (input: Release) => {
      if (input.recursive === true && expand.current?.release !== undefined) {
        return expand.current.release(input)
      }
      if (input.recursive === true && expand.current?.filesystems === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Release",
            message: "native recursive release needs libzfs zfs_release or filesystem iteration"
          })
        )
      }
      const snaps = input.recursive === true
        ? expandSnapshots(input.snapshot, expand.current)
        : [input.snapshot]
      return withNvlist("Snapshot.Release", (nvl) =>
        Effect.suspend(() => {
          const tags = nvlistBooleanKeys(nvl, [input.tag])
          const holds = nvl.alloc()
          for (const snap of snaps) nvl.addNvlist(holds, snap, tags)
          const result = callWithErrlist(
            "Snapshot.Release",
            nvl,
            (errlist) => releaseFn(holds, errlist),
            `lzc_release ${input.snapshot}`
          )
          nvl.free(holds)
          nvl.free(tags)
          return result
        }))
    }
  }
  if (bookmarkFn !== undefined) {
    bound.createBookmark = (input: CreateBookmark) =>
      withNvlist("Bookmark.Create", (nvl) =>
        Effect.suspend(() => {
          const bookmarks = nvlistStringMap(nvl, [[input.name, input.source]])
          const result = callWithErrlist(
            "Bookmark.Create",
            nvl,
            (errlist) => bookmarkFn(bookmarks, errlist),
            `lzc_bookmark ${input.name}`
          )
          nvl.free(bookmarks)
          return result
        }))
  }
  if (destroyBookmarksFn !== undefined) {
    bound.destroyBookmark = (input: DestroyBookmark) =>
      withNvlist("Bookmark.Destroy", (nvl) =>
        Effect.suspend(() => {
          const bookmarks = nvlistBooleanKeys(nvl, [input.name])
          const result = callWithErrlist(
            "Bookmark.Destroy",
            nvl,
            (errlist) => destroyBookmarksFn(bookmarks, errlist),
            `lzc_destroy_bookmarks ${input.name}`
          )
          nvl.free(bookmarks)
          return result
        }))
  }
  if (destroySnapsFn !== undefined && destroyFn !== undefined) {
    const previous = bound.destroy
    bound.destroy = (input: Destroy) => {
      const extras = input.names ?? []
      const snapshotNames = [input.name, ...extras]
      const allSnaps = snapshotNames.every((name) => name.includes("@") && !name.includes("%"))
      if (!allSnaps || input.recursive === true || input.descendants === true) {
        return previous === undefined
          ? Effect.fail(
            new NativeFailure({
              operation: "Snapshot.Destroy",
              message: "native destroy of ranges/flags requires nvlist lzc_destroy_snaps"
            })
          )
          : previous(input)
      }
      return withNvlist("Snapshot.Destroy", (nvl) =>
        Effect.suspend(() => {
          const snaps = nvlistBooleanKeys(nvl, snapshotNames)
          const result = callWithErrlist(
            "Snapshot.Destroy",
            nvl,
            (errlist) => destroySnapsFn(snaps, input.defer === true ? 1 : 0, errlist),
            `lzc_destroy_snaps ${snapshotNames.join(",")}`
          )
          nvl.free(snaps)
          return result
        }))
    }
  }
  if (getHoldsFn !== undefined) {
    bound.holds = (input: ListHolds) => {
      if (input.recursive === true && expand.current?.filesystems === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Snapshot.Holds",
            message: "native recursive holds requires expanding the snapshot list"
          })
        )
      }
      const snaps = input.recursive === true
        ? expandSnapshots(input.snapshot, expand.current)
        : [input.snapshot]
      return withNvlist("Snapshot.Holds", (nvl) =>
        Effect.suspend(() => {
          const rows: Array<SnapshotHold> = []
          for (const snap of snaps) {
            const slot: Array<unknown> = [null]
            const errno = Number(getHoldsFn(snap, slot))
            const dumped = slot[0]
            if (errno !== 0) {
              if (dumped !== null && dumped !== undefined) nvl.free(dumped)
              return Effect.fail(nativeFail("Snapshot.Holds", errno, `lzc_get_holds ${snap}`))
            }
            const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            for (const [tag, value] of Object.entries(unpacked)) {
              rows.push(
                new SnapshotHold({
                  snapshot: decodeSnap(snap),
                  tag: holdTag(tag),
                  timestamp: typeof value === "bigint" ? value : BigInt(String(value))
                })
              )
            }
          }
          return Effect.succeed(rows)
        }))
    }
  }
  if (getBookmarksFn !== undefined) {
    bound.listBookmarks = (options?: ListBookmarks) => {
      if (options?.root === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Bookmark.List",
            message: "lzc_get_bookmarks requires a filesystem root"
          })
        )
      }
      const expandFs = expand.current?.filesystems
      if (options.recursive === true && expandFs === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Bookmark.List",
            message: "native recursive bookmark list requires walking child filesystems"
          })
        )
      }
      const roots = options.recursive === true && expandFs !== undefined
        ? expandFs(options.root)
        : [options.root]
      return withNvlist("Bookmark.List", (nvl) =>
        Effect.suspend(() => {
          const items: Array<BookmarkListItem> = []
          for (const root of roots) {
            const props = nvl.alloc()
            const slot: Array<unknown> = [null]
            const errno = Number(getBookmarksFn(root, props, slot))
            nvl.free(props)
            const dumped = slot[0]
            if (errno !== 0) {
              if (dumped !== null && dumped !== undefined) nvl.free(dumped)
              return Effect.fail(nativeFail("Bookmark.List", errno, `lzc_get_bookmarks ${root}`))
            }
            const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            for (const component of Object.keys(unpacked)) {
              items.push(new BookmarkListItem({ name: bookmarkName(root, component) }))
            }
          }
          return Effect.succeed(items)
        }))
    }
  }
  if (getBookmarkPropsFn !== undefined) {
    bound.getBookmarkProps = (input: GetBookmarkProps) =>
      withNvlist("Bookmark.Get", (nvl) =>
        Effect.suspend(() => {
          const slot: Array<unknown> = [null]
          const errno = Number(getBookmarkPropsFn(input.name, slot))
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Bookmark.Get", errno, `lzc_get_bookmark_props ${input.name}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          return Effect.succeed(rowFromNv(input.name, input.property, unpacked))
        }))
  }
  if (getPropsFn !== undefined) {
    bound.getProperty = (input: GetProperty) => {
      if (input.scope !== "pool") {
        return Effect.fail(
          new NativeFailure({
            operation: "Dataset.Get",
            message: "lzc_get_props is ZFS_IOC_POOL_GET_PROPS; dataset get is libzfs"
          })
        )
      }
      return withNvlist("Pool.Get", (nvl) =>
        Effect.suspend(() => {
          const slot: Array<unknown> = [null]
          const errno = Number(getPropsFn(input.name, slot))
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Pool.Get", errno, `lzc_get_props ${input.name}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          return Effect.succeed(rowFromNv(input.name, input.property, unpacked))
        }))
    }
    bound.getProperties = (input: GetProperty) => {
      if (input.scope !== "pool") {
        return Effect.fail(
          new NativeFailure({
            operation: "Dataset.Get",
            message: "lzc_get_props is ZFS_IOC_POOL_GET_PROPS; dataset get is libzfs"
          })
        )
      }
      return withNvlist("Pool.Get", (nvl) =>
        Effect.suspend(() => {
          const slot: Array<unknown> = [null]
          const errno = Number(getPropsFn(input.name, slot))
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Pool.Get", errno, `lzc_get_props ${input.name}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          return Effect.succeed(
            propertyRowsFromNvlist(input.name, unpacked, input.property === "all" ? undefined : input.property)
              .map((row) => new PropertyGetRow(row))
          )
        }))
    }
  }
  if (loadKeyFn !== undefined) {
    bound.loadKey = (input: LoadKey) => {
      if (input.name === undefined || input.all === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Crypto.LoadKey",
            message: "lzc_load_key requires a dataset name"
          })
        )
      }
      if (input.wrappingKey === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Crypto.LoadKey",
            message: "lzc_load_key requires wrapping-key bytes"
          })
        )
      }
      const key = wrappingKeyToNativeBytes(input.wrappingKey, input.keyformat ?? "passphrase")
      return fromErrno(
        "Crypto.LoadKey",
        Number(loadKeyFn(input.name, input.noop === true ? 1 : 0, key, key.byteLength)),
        `lzc_load_key ${input.name}`
      )
    }
  }
  if (changeKeyFn !== undefined) {
    bound.changeKey = (input: ChangeKey) =>
      withNvlist("Crypto.ChangeKey", (nvl) =>
        Effect.suspend(() => {
          const props = nvl.alloc()
          if (input.keyformat !== undefined) nvl.addString(props, "keyformat", input.keyformat)
          if (input.keylocation !== undefined) nvl.addString(props, "keylocation", input.keylocation)
          if (input.pbkdf2iters !== undefined) nvl.addUint64(props, "pbkdf2iters", input.pbkdf2iters)
          const key = input.wrappingKey === undefined
            ? undefined
            : wrappingKeyToNativeBytes(input.wrappingKey, input.keyformat ?? "passphrase")
          const errno = Number(changeKeyFn(
            input.name,
            dcpCmdOf(input.command),
            props,
            key === undefined ? null : key,
            key === undefined ? 0 : key.byteLength
          ))
          nvl.free(props)
          return fromErrno("Crypto.ChangeKey", errno, `lzc_change_key ${input.name}`)
        }))
  }
  if (syncFn !== undefined) {
    bound.syncPool = (input: SyncPool) =>
      withNvlist("Pool.Sync", (nvl) =>
        Effect.suspend(() => {
          if (input.force !== true) {
            return fromErrno("Pool.Sync", Number(syncFn(input.name, null, null)), `lzc_sync ${input.name}`)
          }
          const innvl = nvl.alloc()
          nvl.addBooleanValue(innvl, "force", true)
          const errno = Number(syncFn(input.name, innvl, null))
          nvl.free(innvl)
          return fromErrno("Pool.Sync", errno, `lzc_sync ${input.name}`)
        }))
  }
  if (trimFn !== undefined) {
    bound.trimPool = (input: TrimPool) => {
      if (input.all === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Trim",
            message: "native trim -a would touch every imported pool"
          })
        )
      }
      if (vdevGuidEntries(input.devices) === undefined && expand.current?.trim !== undefined) {
        return expand.current.trim(input)
      }
      return resolveVdevGuids(input.name, input.devices, expand.current, "Pool.Trim").pipe(
        Effect.flatMap((guids) =>
          withNvlist("Pool.Trim", (nvl) =>
            Effect.suspend(() => {
              const vdevs = nvlistGuidMap(nvl, guids)
              const result = callWithErrlist(
                "Pool.Trim",
                nvl,
                (errlist) =>
                  trimFn(
                    input.name,
                    trimCommand(input.command),
                    input.rate ?? 0n,
                    input.secure === true ? 1 : 0,
                    vdevs,
                    errlist
                  ),
                `lzc_trim ${input.name}`
              )
              nvl.free(vdevs)
              return result
            }))
        )
      )
    }
  }
  if (initializeFn !== undefined) {
    bound.initializePool = (input: InitializePool) => {
      if (input.all === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Initialize",
            message: "native initialize -a would touch every imported pool"
          })
        )
      }
      if (vdevGuidEntries(input.devices) === undefined && expand.current?.initialize !== undefined) {
        return expand.current.initialize(input)
      }
      return resolveVdevGuids(input.name, input.devices, expand.current, "Pool.Initialize").pipe(
        Effect.flatMap((guids) =>
          withNvlist("Pool.Initialize", (nvl) =>
            Effect.suspend(() => {
              const vdevs = nvlistGuidMap(nvl, guids)
              const result = callWithErrlist(
                "Pool.Initialize",
                nvl,
                (errlist) =>
                  initializeFn(
                    input.name,
                    initializeCommand(input.command),
                    0n,
                    0,
                    vdevs,
                    errlist
                  ),
                `lzc_initialize ${input.name}`
              )
              nvl.free(vdevs)
              return result
            }))
        )
      )
    }
  }
  if (scrubFn !== undefined) {
    bound.scrub = (input: Scrub) => {
      if (input.all === true) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.Scrub",
            message: "native scrub -a requires iterating imported pools"
          })
        )
      }
      if (input.command === "wait") {
        const wait = bound.waitPool
        if (wait === undefined) {
          return Effect.fail(
            new NativeFailure({
              operation: "Pool.Scrub",
              message: "lzc_wait is not bound"
            })
          )
        }
        return wait({ pool: input.name, activities: ["scrub"] }).pipe(Effect.asVoid)
      }
      return withNvlist("Pool.Scrub", (nvl) =>
        Effect.suspend(() => {
          const args = nvl.alloc()
          const scan = input.command === "stop" ? POOL_SCAN_NONE : POOL_SCAN_SCRUB
          const cmd = input.command === "pause" ? POOL_SCRUB_PAUSE : POOL_SCRUB_NORMAL
          nvl.addUint64(args, "scan_type", BigInt(scan))
          nvl.addUint64(args, "scan_command", BigInt(cmd))
          const result = callWithErrlist(
            "Pool.Scrub",
            nvl,
            (errlist) => scrubFn(ZFS_IOC_POOL_SCRUB, input.name, args, errlist),
            `lzc_scrub ${input.name}`
          )
          nvl.free(args)
          return result
        }))
    }
    bound.resilver = (input) =>
      withNvlist("Pool.Resilver", (nvl) =>
        Effect.suspend(() => {
          const args = nvl.alloc()
          nvl.addUint64(args, "scan_type", BigInt(POOL_SCAN_RESILVER))
          nvl.addUint64(args, "scan_command", BigInt(POOL_SCRUB_NORMAL))
          const result = callWithErrlist(
            "Pool.Resilver",
            nvl,
            (errlist) => scrubFn(ZFS_IOC_POOL_SCRUB, input.name, args, errlist),
            `lzc_scrub resilver ${input.name}`
          )
          nvl.free(args)
          return result
        }))
  }
  if (sendFn !== undefined && pipeFn !== undefined && closeFn !== undefined) {
    bound.send = (input: Send) =>
      Stream.unwrap(
        Effect.try({
          try: () => {
            const token = input.options?.resumeToken
            const resume = token === undefined ? undefined : expand.current?.resumeToken?.(token)
            const snap = input.snapshot ?? resume?.toname
            if (snap === undefined) {
              throw new NativeFailure({
                operation: "Replication.Send",
                message: token === undefined
                  ? "lzc_send requires a snapshot"
                  : "resume send needs a snapshot or token toname"
              })
            }
            if (needsLibzfsSend(input) && token === undefined) {
              throw new NativeFailure({
                operation: "Replication.Send",
                message: input.options?.incremental === "intermediate"
                  ? "intermediate (-I) send needs libzfs zfs_send"
                  : "replicate/properties/holds send needs libzfs zfs_send"
              })
            }
            if (token !== undefined && resume === undefined && sendResumeFn === undefined) {
              throw new NativeFailure({
                operation: "Replication.Send",
                message: "resume send needs zfs_send_resume_token_to_nvlist"
              })
            }
            const fds = [0, 0]
            if (Number(pipeFn(fds)) !== 0) {
              throw new NativeFailure({
                operation: "Replication.Send",
                message: "pipe() failed for lzc_send"
              })
            }
            const readFd = fds[0]
            const writeFd = fds[1]
            if (readFd === undefined || writeFd === undefined) {
              throw new NativeFailure({
                operation: "Replication.Send",
                message: "pipe() returned incomplete fds"
              })
            }
            const from = input.options?.from === undefined ? null : input.options.from
            const flags = sendFlagBits(input)
            const sendPromise = token !== undefined && sendResumeFn !== undefined
              ? callAsync(sendResumeFn, [
                snap,
                from,
                writeFd,
                flags,
                resume?.object ?? 0n,
                resume?.offset ?? 0n
              ])
              : input.options?.redact !== undefined && sendRedactedFn !== undefined
              ? callAsync(sendRedactedFn, [snap, from, writeFd, flags, input.options.redact])
              : callAsync(sendFn, [snap, from, writeFd, flags])
            const readable = createReadStream("", { fd: readFd, autoClose: true })
            const closeWrite = () => {
              try {
                closeFn(writeFd)
              } catch {
                /* already closed */
              }
            }
            const bytes = Stream.fromAsyncIterable(
              readable as AsyncIterable<Uint8Array>,
              (cause) =>
                new NativeFailure({
                  operation: "Replication.Send",
                  message: cause instanceof Error ? cause.message : "lzc_send pipe read failed",
                  cause
                })
            )
            const completion = Stream.fromEffect(Effect.tryPromise({
              try: async () => {
                try {
                  const errno = await sendPromise
                  if (errno !== 0) throw nativeFail("Replication.Send", errno, `lzc_send ${snap}`)
                } finally {
                  closeWrite()
                }
              },
              catch: (cause) =>
                cause instanceof NativeFailure
                  ? cause
                  : new NativeFailure({
                    operation: "Replication.Send",
                    message: cause instanceof Error ? cause.message : "lzc_send failed",
                    cause
                  })
            })).pipe(Stream.filter((_value): _value is never => false))
            return bytes.pipe(
              Stream.concat(completion),
              Stream.ensuring(Effect.sync(() => {
                closeWrite()
                readable.destroy()
              }))
            )
          },
          catch: (cause) =>
            cause instanceof NativeFailure
              ? cause
              : new NativeFailure({
                operation: "Replication.Send",
                message: cause instanceof Error ? cause.message : "lzc_send failed",
                cause
              })
        })
      )
  }
  if (receiveFn !== undefined && pipeFn !== undefined && closeFn !== undefined) {
    const receiveImpl = <E>(input: Receive, stream: Stream.Stream<Uint8Array, E>) => {
      const owned: { cleanup: () => void } = { cleanup: () => undefined }
      return Effect.gen(function*() {
        if (input.heal === true && receiveHealFn === undefined) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "native receive heal needs lzc_receive_with_heal"
          })
        }
        if (input.skipHolds === true || input.forceUnmount === true || input.unmounted === true) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "native receive does not honor -h/-M/-u; use the CLI interpreter"
          })
        }
        if (
          input.exclude !== undefined &&
          input.exclude.length > 0 &&
          receiveCmdpropsFn === undefined &&
          receiveHealFn === undefined
        ) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "native receive -x needs lzc_receive_with_cmdprops"
          })
        }
        const fds = [0, 0]
        if (Number(pipeFn(fds)) !== 0) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "pipe() failed for lzc_receive"
          })
        }
        const readFd = fds[0]
        const writeFd = fds[1]
        if (readFd === undefined || writeFd === undefined) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "pipe() returned incomplete fds"
          })
        }
        const origin = input.origin === undefined ? null : input.origin
        if (nv === undefined) {
          closeFn(writeFd)
          closeFn(readFd)
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            message: "libnvpair is not loaded"
          })
        }
        const buffered: Array<Uint8Array> = []
        let pending: Promise<number> | undefined
        let closed = false
        const props = nvlistFromProperties(nv, input.properties)
        const cmdprops = input.exclude !== undefined && input.exclude.length > 0
          ? nvlistBooleanKeys(nv, input.exclude)
          : undefined
        const closePipe = () => {
          if (closed) return
          closed = true
          try {
            closeFn(writeFd)
          } catch {
            /* already closed */
          }
          try {
            closeFn(readFd)
          } catch {
            /* already closed */
          }
          if (props !== undefined) nv.free(props)
          if (cmdprops !== undefined) nv.free(cmdprops)
        }
        owned.cleanup = closePipe
        const writeChunk = (chunk: Uint8Array): Effect.Effect<void, NativeFailure> =>
          Effect.try({
            try: () => {
              writeSync(writeFd, chunk)
            },
            catch: (cause) =>
              new NativeFailure({
                operation: "Replication.Receive",
                message: cause instanceof Error ? cause.message : "write to receive pipe failed",
                cause
              })
          })
        const startReceive = (snap: string, raw: boolean): Promise<number> => {
          const force = input.force === true ? 1 : 0
          const rawFlag = raw ? 1 : 0
          if (input.heal === true && receiveHealFn !== undefined) {
            return callAsync(receiveHealFn, [
              snap,
              props ?? null,
              cmdprops ?? null,
              null,
              0,
              origin,
              force,
              input.resumable === true ? 1 : 0,
              rawFlag,
              1,
              readFd,
              null,
              -1,
              [0n],
              [0n],
              [0n],
              [null]
            ])
          }
          if (cmdprops !== undefined && receiveCmdpropsFn !== undefined) {
            return callAsync(receiveCmdpropsFn, [
              snap,
              props ?? null,
              cmdprops ?? null,
              null,
              0,
              origin,
              force,
              rawFlag,
              input.resumable === true ? 1 : 0,
              readFd,
              null,
              -1,
              [0n],
              [0n],
              [0n],
              [null]
            ])
          }
          if (input.resumable === true && receiveResumableFn !== undefined) {
            return callAsync(receiveResumableFn, [snap, props ?? null, origin, force, rawFlag, readFd])
          }
          return callAsync(receiveFn, [snap, props ?? null, origin, force, rawFlag, readFd])
        }
        yield* stream.pipe(
          Stream.runForEach((chunk) =>
            Effect.gen(function*() {
              if (pending !== undefined) {
                if (input.dryRun !== true) yield* writeChunk(chunk)
                return
              }
              buffered.push(chunk)
              const combined = concatBytes(buffered)
              const begin = sendBeginInfo(combined)
              if (begin.status === "short") {
                if (combined.byteLength > beginRecordBytes * 4) {
                  return yield* new NativeFailure({
                    operation: "Replication.Receive",
                    code: "EZFS_BADSTREAM",
                    message: "send stream exceeded DRR_BEGIN header size without a begin record"
                  })
                }
                return
              }
              if (begin.status === "invalid") {
                return yield* new NativeFailure({
                  operation: "Replication.Receive",
                  code: "EZFS_BADSTREAM",
                  message: "send stream has no DRR_BEGIN header"
                })
              }
              const snap = receiveSnapName(input, begin.toname)
              const why = receiveSnapWhy(snap)
              if (why !== undefined) {
                return yield* new NativeFailure({
                  operation: "Replication.Receive",
                  code: "EZFS_BADSTREAM",
                  message: `invalid receive name from stream: ${why}`
                })
              }
              if (input.dryRun === true) {
                pending = Promise.resolve(0)
                return
              }
              pending = startReceive(snap, begin.raw)
              for (const part of buffered) yield* writeChunk(part)
            })
          )
        )
        const running = pending
        if (running === undefined) {
          return yield* new NativeFailure({
            operation: "Replication.Receive",
            code: "EZFS_BADSTREAM",
            message: "send stream has no DRR_BEGIN header"
          })
        }
        if (input.dryRun !== true) {
          yield* Effect.sync(() => {
            try {
              closeFn(writeFd)
            } catch {
              /* already closed */
            }
          })
        }
        const errno = yield* Effect.tryPromise({
          try: () => running,
          catch: (cause) =>
            new NativeFailure({
              operation: "Replication.Receive",
              message: cause instanceof Error ? cause.message : "lzc_receive failed",
              cause
            })
        })
        yield* Effect.sync(() => {
          try {
            closeFn(readFd)
          } catch {
            /* already closed */
          }
        })
        if (props !== undefined) nv.free(props)
        if (cmdprops !== undefined) nv.free(cmdprops)
        closed = true
        return yield* fromErrno("Replication.Receive", errno, `lzc_receive ${input.target}`)
      }).pipe(Effect.ensuring(Effect.sync(() => owned.cleanup())))
    }
    bound.receive = receiveImpl
    bound.receiveResumable = receiveImpl
    bound.receiveWithCmdprops = receiveImpl
    bound.receiveWithHeal = receiveImpl
  }
  if (sendProgressFn !== undefined) {
    bound.sendProgress = (input: SendProgress) =>
      Effect.gen(function*() {
        if (input.fd === undefined) {
          return yield* new NativeFailure({
            operation: "Replication.SendProgress",
            message: "lzc_send_progress requires the send stream fd"
          })
        }
        const bytes: Array<unknown> = [0n]
        const blocks: Array<unknown> = [0n]
        const errno = Number(sendProgressFn(input.snapshot, input.fd, bytes, blocks))
        if (errno !== 0) {
          return yield* nativeFail("Replication.SendProgress", errno, `lzc_send_progress ${input.snapshot}`)
        }
        return new SendProgressReport({
          bytes: byteCount(asBigint(bytes[0])),
          blocks: byteCount(asBigint(blocks[0]))
        })
      })
  }
  if (channelFn !== undefined) {
    bound.channelProgram = (input: ChannelProgram) =>
      withNvlist("Pool.Program", (nvl) =>
        Effect.suspend(() => {
          const args = nvl.alloc()
          if (input.argv !== undefined && input.argv.length > 0) {
            nvl.addStringArray(args, "argv", input.argv)
          }
          const slot: Array<unknown> = [null]
          const fn = input.nosync === true && channelNosyncFn !== undefined ? channelNosyncFn : channelFn
          const errno = Number(fn(
            input.pool,
            input.program,
            input.instructionLimit ?? CHANNEL_INSTRLIMIT,
            input.memoryLimit ?? CHANNEL_MEMLIMIT,
            args,
            slot
          ))
          nvl.free(args)
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Pool.Program", errno, `lzc_channel_program ${input.pool}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          const raw = jsonFromNvObject(unpacked)
          return Effect.succeed(new ChannelProgramResult({ raw, json: unpacked }))
        }))
  }
  if (redactFn !== undefined) {
    bound.redact = (input: Redact) =>
      withNvlist("Snapshot.Redact", (nvl) =>
        Effect.suspend(() => {
          const snaps = nvlistBooleanKeys(nvl, input.snapshots)
          const errno = Number(redactFn(input.snapshot, input.bookmark, snaps))
          nvl.free(snaps)
          return fromErrno("Snapshot.Redact", errno, `lzc_redact ${input.snapshot}`)
        }))
  }
  if (getBootenvFn !== undefined) {
    bound.getBootenv = (input) =>
      withNvlist("Pool.GetBootenv", (nvl) =>
        Effect.suspend(() => {
          const slot: Array<unknown> = [null]
          const errno = Number(getBootenvFn(input.pool, slot))
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Pool.GetBootenv", errno, `lzc_get_bootenv ${input.pool}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          const pairs = Object.entries(unpacked).flatMap(([key, value]) => {
            if (typeof value === "object") return []
            return [new BootenvPair({ key, value: String(value) })]
          })
          return Effect.succeed(
            new Bootenv({
              pool: input.pool,
              raw: jsonFromNvObject(unpacked),
              pairs
            })
          )
        }))
  }
  if (setBootenvFn !== undefined) {
    bound.setBootenv = (input: SetBootenv) =>
      withNvlist("Pool.SetBootenv", (nvl) =>
        Effect.suspend(() => {
          const env = nvl.alloc()
          for (const pair of input.pairs) nvl.addString(env, pair.key, pair.value)
          const errno = Number(setBootenvFn(input.pool, env))
          nvl.free(env)
          return fromErrno("Pool.SetBootenv", errno, `lzc_set_bootenv ${input.pool}`)
        }))
  }
  if (ddtPruneFn !== undefined) {
    bound.ddtPrune = (input: DdtPrune) =>
      fromErrno(
        "Pool.DdtPrune",
        Number(ddtPruneFn(
          input.pool,
          input.unit === "percentage" ? ZPOOL_DDT_PRUNE_PERCENTAGE : ZPOOL_DDT_PRUNE_AGE,
          input.unit === "days" ? input.amount * 86400n : input.amount
        )),
        `lzc_ddt_prune ${input.pool}`
      )
  }
  if (destroyFn !== undefined) {
    bound.abortReceive = (input: AbortReceive) =>
      fromErrno(
        "Replication.AbortReceive",
        Number(destroyFn(recvHiddenName(input.target))),
        `lzc_destroy ${recvHiddenName(input.target)}`
      )
  }
  if (getVdevFn !== undefined) {
    bound.getVdevProperty = (input: GetVdevProperty) => {
      const guid = guidOf(input.vdev)
      if (guid === undefined && expand.current?.getVdevProperty !== undefined) {
        return expand.current.getVdevProperty(input)
      }
      if (guid === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.GetVdev",
            message: "lzc_get_vdev_prop requires a numeric vdev GUID"
          })
        )
      }
      return withNvlist("Pool.GetVdev", (nvl) =>
        Effect.suspend(() => {
          const innvl = nvl.alloc()
          nvl.addUint64(innvl, "vdevprops_get_vdev", guid)
          const props = nvl.alloc()
          nvl.addBoolean(props, input.property)
          nvl.addNvlist(innvl, "vdevprops_get_props", props)
          const slot: Array<unknown> = [null]
          const errno = Number(getVdevFn(input.pool, innvl, slot))
          nvl.free(innvl)
          nvl.free(props)
          const dumped = slot[0]
          if (errno !== 0) {
            if (dumped !== null && dumped !== undefined) nvl.free(dumped)
            return Effect.fail(nativeFail("Pool.GetVdev", errno, `lzc_get_vdev_prop ${input.vdev}`))
          }
          const unpacked = dumped === null || dumped === undefined ? {} : nvl.unpack(dumped)
          if (dumped !== null && dumped !== undefined) nvl.free(dumped)
          return Effect.succeed(rowFromNv(input.vdev, input.property, unpacked))
        }))
    }
  }
  if (setVdevFn !== undefined) {
    bound.setVdevProperty = (input: SetVdevProperty) => {
      const guid = guidOf(input.vdev)
      if (guid === undefined && expand.current?.setVdevProperty !== undefined) {
        return expand.current.setVdevProperty(input)
      }
      if (guid === undefined) {
        return Effect.fail(
          new NativeFailure({
            operation: "Pool.SetVdev",
            message: "lzc_set_vdev_prop requires a numeric vdev GUID"
          })
        )
      }
      return withNvlist("Pool.SetVdev", (nvl) =>
        Effect.suspend(() => {
          const innvl = nvl.alloc()
          nvl.addUint64(innvl, "vdevprops_set_vdev", guid)
          const props = nvl.alloc()
          nvl.addString(props, input.property, String(input.value))
          nvl.addNvlist(innvl, "vdevprops_set_props", props)
          const result = callWithErrlist(
            "Pool.SetVdev",
            nvl,
            (errlist) => setVdevFn(input.pool, innvl, errlist),
            `lzc_set_vdev_prop ${input.vdev}`
          )
          nvl.free(innvl)
          nvl.free(props)
          return result
        }))
    }
  }
  if (ioctlFn !== undefined && rewriteArgsType !== undefined) {
    const getErrno = (): number => {
      if (koffi.errno === undefined) return 22
      return Number(koffi.errno())
    }
    bound.rewrite = (input: Rewrite) => Effect.suspend(() => rewritePaths(input, ioctlFn, getErrno))
  }
  const libzfs = loadLinuxLibzfs(koffi, nv, expand)
  if (bound.createSnapshot === undefined && expand.current?.snapshot !== undefined) {
    bound.createSnapshot = expand.current.snapshot
  }
  if (bound.hold === undefined && expand.current?.hold !== undefined) {
    bound.hold = expand.current.hold
  }
  if (bound.release === undefined && expand.current?.release !== undefined) {
    bound.release = expand.current.release
  }
  if (bound.initializePool === undefined && expand.current?.initialize !== undefined) {
    bound.initializePool = expand.current.initialize
  }
  if (bound.trimPool === undefined && expand.current?.trim !== undefined) {
    bound.trimPool = expand.current.trim
  }
  if (libzfs === undefined) return bound
  const merged: { -readonly [K in keyof NativeBindings]?: NativeBindings[K] } = { ...libzfs, ...bound }
  const poolGet = bound.getProperty
  const datasetGet = libzfs.getProperty
  if (poolGet !== undefined && datasetGet !== undefined) {
    merged.getProperty = (input) => input.scope === "pool" ? poolGet(input) : datasetGet(input)
  }
  const poolGets = bound.getProperties
  const datasetGets = libzfs.getProperties
  if (poolGets !== undefined && datasetGets !== undefined) {
    merged.getProperties = (input) => input.scope === "pool" ? poolGets(input) : datasetGets(input)
  } else if (poolGets !== undefined) {
    merged.getProperties = poolGets
  }
  const lzcDestroy = merged.destroy
  const libDestroy = libzfs.destroy
  if (libDestroy !== undefined && lzcDestroy !== undefined) {
    merged.destroy = (input) => {
      const spec = snapshotSpecOf(input.name)
      const listSnaps = merged.listSnapshots
      if (
        spec !== undefined &&
        spec.spec.includes("%") &&
        destroySnapsFn !== undefined &&
        listSnaps !== undefined &&
        nv !== undefined
      ) {
        return listSnaps({ root: decodeDataset(spec.fs) }).pipe(
          Effect.flatMap((rows) =>
            withNvlist("Snapshot.Destroy", (nvl) =>
              Effect.suspend(() => {
                const names = rows.map((row) => String(row.name)).filter((name) => snapshotInRange(name, spec.spec))
                if (names.length === 0) return Effect.void
                const snaps = nvlistBooleanKeys(nvl, names)
                const result = callWithErrlist(
                  "Snapshot.Destroy",
                  nvl,
                  (errlist) => destroySnapsFn(snaps, input.defer === true ? 1 : 0, errlist),
                  `lzc_destroy_snaps ${input.name}`
                )
                nvl.free(snaps)
                return result
              }))
          )
        )
      }
      return needsLibzfsDestroy(input) ? libDestroy(input) : lzcDestroy(input)
    }
  }
  const lzcRollback = merged.rollback
  const libRollback = libzfs.rollback
  if (libRollback !== undefined && lzcRollback !== undefined) {
    merged.rollback = (input) => needsLibzfsRollback(input) ? libRollback(input) : lzcRollback(input)
  }
  if (libzfs.upgradeDataset !== undefined) merged.upgradeDataset = libzfs.upgradeDataset
  if (libzfs.abortReceive !== undefined && merged.abortReceive === undefined) {
    merged.abortReceive = libzfs.abortReceive
  }
  const lzcGetVdev = merged.getVdevProperty
  const libGetVdev = libzfs.getVdevProperty
  if (libGetVdev !== undefined && lzcGetVdev !== undefined) {
    merged.getVdevProperty = (input) => guidOf(input.vdev) === undefined ? libGetVdev(input) : lzcGetVdev(input)
  }
  const lzcSetVdev = merged.setVdevProperty
  const libSetVdev = libzfs.setVdevProperty
  if (libSetVdev !== undefined && lzcSetVdev !== undefined) {
    merged.setVdevProperty = (input) => guidOf(input.vdev) === undefined ? libSetVdev(input) : lzcSetVdev(input)
  }
  if (libzfs.getVdevProperties !== undefined) merged.getVdevProperties = libzfs.getVdevProperties
  const extraLoadKey = libzfs.loadKey
  const lzcLoadKey = bound.loadKey
  if (extraLoadKey !== undefined && lzcLoadKey !== undefined) {
    merged.loadKey = (input) => input.all === true ? extraLoadKey(input) : lzcLoadKey(input)
  } else if (extraLoadKey !== undefined && lzcLoadKey === undefined) {
    merged.loadKey = extraLoadKey
  }
  return merged
}

const vdevGuidEntries = (
  devices: ReadonlyArray<string> | undefined
): ReadonlyArray<readonly [string, bigint]> | undefined => {
  if (devices === undefined || devices.length === 0) return undefined
  const entries: Array<readonly [string, bigint]> = []
  for (const device of devices) {
    const guid = guidOf(device)
    if (guid === undefined) return undefined
    entries.push([device, guid])
  }
  return entries
}

const resolveVdevGuids = (
  pool: string,
  devices: ReadonlyArray<string> | undefined,
  expand: NativeExpand | undefined,
  operation: string
): Effect.Effect<ReadonlyArray<readonly [string, bigint]>, NativeFailure> => {
  const numeric = vdevGuidEntries(devices)
  if (numeric !== undefined) return Effect.succeed(numeric)
  if (expand?.leafGuids === undefined) {
    return Effect.fail(
      new NativeFailure({
        operation,
        message: "native trim/initialize without GUIDs needs zpool_collect_leaves"
      })
    )
  }
  return expand.leafGuids(pool, devices, operation)
}

const ancestorDatasets = (name: string): ReadonlyArray<string> => {
  const parts = name.split("/")
  const out: Array<string> = []
  for (let i = 1; i < parts.length - 1; i++) out.push(parts.slice(0, i + 1).join("/"))
  return out
}

const expandSnapshots = (
  snapshot: string,
  expand: NativeExpand | undefined
): ReadonlyArray<string> => {
  const at = snapshot.lastIndexOf("@")
  if (at <= 0 || expand?.filesystems === undefined) return [snapshot]
  const fs = snapshot.slice(0, at)
  const component = snapshot.slice(at + 1)
  return expand.filesystems(fs).map((name) => `${name}@${component}`)
}

const rewriteOne = (
  path: string,
  input: Rewrite,
  ioctlFn: KoffiFn,
  getErrno: () => number
): Effect.Effect<void, NativeFailure> =>
  Effect.try({
    try: () => {
      let flags = 0
      if (input.physical === true) flags |= ZFS_REWRITE_PHYSICAL
      if (input.skipSnapshot === true) flags |= ZFS_REWRITE_SKIP_SNAPSHOT
      if (input.skipBrt === true) flags |= ZFS_REWRITE_SKIP_BRT
      const fd = openSync(path, "r+")
      try {
        const rc = Number(ioctlFn(fd, ZFS_IOC_REWRITE, {
          off: input.offset ?? 0n,
          len: input.length ?? 0n,
          flags: BigInt(flags),
          arg: 0n
        }))
        if (rc !== 0) {
          const errno = rc === -1 ? getErrno() : rc
          throw nativeFail("Dataset.Rewrite", errno, `ZFS_IOC_REWRITE ${path}`)
        }
      } finally {
        closeSync(fd)
      }
    },
    catch: (cause) =>
      cause instanceof NativeFailure
        ? cause
        : new NativeFailure({
          operation: "Dataset.Rewrite",
          message: cause instanceof Error ? cause.message : `ZFS_IOC_REWRITE ${path}`,
          cause
        })
  })

const rewritePaths = (
  input: Rewrite,
  ioctlFn: KoffiFn,
  getErrno: () => number
): Effect.Effect<void, NativeFailureOrTransport> =>
  Effect.gen(function*() {
    const rootDev = input.xdev === true ? lstatSync(input.files[0] ?? "/").dev : undefined
    const visit = (path: string): Effect.Effect<void, NativeFailureOrTransport> =>
      Effect.gen(function*() {
        const st = lstatSync(path)
        if (rootDev !== undefined && st.dev !== rootDev) return
        if (st.isDirectory()) {
          if (input.recursive !== true) {
            return yield* new NativeFailure({
              operation: "Dataset.Rewrite",
              message: `${path} is a directory; pass recursive`
            })
          }
          for (const entry of readdirSync(path)) {
            yield* visit(join(path, entry))
          }
          return
        }
        if (st.isFile()) yield* rewriteOne(path, input, ioctlFn, getErrno)
      })
    for (const file of input.files) yield* visit(file)
  })
