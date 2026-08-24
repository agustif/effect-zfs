import { createRequire } from "node:module"
import { Effect } from "effect"
import type { Exists, UpgradeDataset } from "../Args.js"
import type { NativeBindings, NativeFailureOrTransport } from "../Native.js"
import { NativeFailure } from "./native-failure.js"

const require = createRequire(import.meta.url)

type KoffiLib = {
  readonly func: (signature: string) => (...args: Array<unknown>) => unknown
}

type Koffi = {
  readonly load: (name: string) => KoffiLib
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

/**
 * Optional Linux `libzfs_core` FFI via koffi. Returns only the lzc calls that
 * do not need nvlist packing. Missing libraries or non-Linux hosts return
 * `undefined`; callers merge onto `unboundBindings`.
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
  const init = core.func("int libzfs_core_init()")
  const existsFn = core.func("int lzc_exists(const char *name)")
  const destroyFn = core.func("int lzc_destroy(const char *name)")
  const renameFn = core.func("int lzc_rename(const char *from, const char *to)")
  const promoteFn = core.func("int lzc_promote(const char *name, void *fillmsg, int fillmsgsz)")
  const unloadKeyFn = core.func("int lzc_unload_key(const char *name)")
  const reopenFn = core.func("int lzc_reopen(const char *pool, int restart)")
  const checkpointFn = core.func("int lzc_pool_checkpoint(const char *pool)")
  const checkpointDiscardFn = core.func("int lzc_pool_checkpoint_discard(const char *pool)")
  const rollbackToFn = core.func("int lzc_rollback_to(const char *fsname, const char *snapname)")
  const rc = Number(init())
  if (!Number.isFinite(rc) || rc !== 0) return undefined

  const exists = (input: Exists): Effect.Effect<boolean, NativeFailureOrTransport> =>
    Effect.sync(() => Number(existsFn(input.name)) !== 0)

  return {
    exists,
    destroy: (input) => {
      if (input.name.includes("%") || input.recursive === true || input.descendants === true || input.defer === true) {
        return Effect.fail(new NativeFailure({
          operation: input.name.includes("@") ? "Snapshot.Destroy" : "Dataset.Destroy",
          message: "native destroy of ranges/flags requires nvlist lzc_destroy_snaps"
        }))
      }
      const operation = input.name.includes("#")
        ? "Bookmark.Destroy"
        : input.name.includes("@")
          ? "Snapshot.Destroy"
          : "Dataset.Destroy"
      return fromErrno(operation, Number(destroyFn(input.name)), `lzc_destroy ${input.name}`)
    },
    rename: (input) =>
      fromErrno(
        input.from.includes("@") ? "Snapshot.Rename" : "Dataset.Rename",
        Number(renameFn(input.from, input.to)),
        `lzc_rename ${input.from} ${input.to}`
      ),
    promote: (input) =>
      fromErrno("Snapshot.Promote", Number(promoteFn(input.name, null, 0)), `lzc_promote ${input.name}`),
    unloadKey: (input) => {
      if (input.name === undefined) {
        return Effect.fail(new NativeFailure({
          operation: "Crypto.UnloadKey",
          message: "lzc_unload_key requires a dataset name"
        }))
      }
      return fromErrno("Crypto.UnloadKey", Number(unloadKeyFn(input.name)), `lzc_unload_key ${input.name}`)
    },
    reopenPool: (input) =>
      fromErrno(
        "Pool.Reopen",
        Number(reopenFn(input.name, input.noRestart === true ? 0 : 1)),
        `lzc_reopen ${input.name}`
      ),
    checkpointPool: (input) =>
      fromErrno(
        "Pool.Checkpoint",
        Number((input.discard === true ? checkpointDiscardFn : checkpointFn)(input.name)),
        `lzc_pool_checkpoint ${input.name}`
      ),
    rollback: (input) => {
      if (input.destroyRecent === true || input.destroyClones === true || input.force === true) {
        return Effect.fail(new NativeFailure({
          operation: "Snapshot.Rollback",
          message: "native rollback -r/-R/-f is libzfs, not lzc_rollback_to"
        }))
      }
      const fsname = input.snapshot.slice(0, input.snapshot.indexOf("@"))
      return fromErrno(
        "Snapshot.Rollback",
        Number(rollbackToFn(fsname, input.snapshot)),
        `lzc_rollback_to ${input.snapshot}`
      )
    },
    upgradeDataset: (input: UpgradeDataset) =>
      Effect.fail(new NativeFailure({
        operation: "Dataset.Upgrade",
        message: "zfs_upgrade is libzfs, not libzfs_core"
      }))
  }
}
