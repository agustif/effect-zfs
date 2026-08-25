import type { DelegInherit, DelegWhoKind, InjectKind } from "../args/index.js"
import type { PoolHealth } from "../schema/models.js"

/** Linux `MAXPATHLEN` (4096) layout of `zfs_cmd_t.zc_value`. */
export const zfsCmdNameOffset = 0
export const zfsCmdValueOffset = 4144
export const zfsCmdSize = 4096 * 3 + 256 + 1200

export const ZFS_IOC_POOL_FREEZE = 0x5a08
export const ZFS_IOC_VDEV_SETPATH = 0x5a10
export const ZFS_IOC_VDEV_SETFRU = 0x5a11
export const ZFS_IOC_INJECT_FAULT = 0x5a1d
export const ZFS_IOC_CLEAR_FAULT = 0x5a1e
export const ZFS_IOC_INJECT_LIST_NEXT = 0x5a1f
export const ZFS_IOC_SMB_ACL = 0x5a2c
export const ZFS_IOC_DSOBJ_TO_DSNAME = 0x5a24
export const ZFS_IOC_OBJ_TO_PATH = 0x5a25
export const ZFS_IOC_NEXT_OBJ = 0x5a35
export const ZFS_IOC_OBJ_TO_STATS = 0x5a38
export const ZFS_IOC_REMAP = 0x5a4c
export const ZFS_IOC_USERNS_ATTACH = 0x5a85
export const ZFS_IOC_USERNS_DETACH = 0x5a86
export const zfsCmdGuidOffset = 12592
export const zfsCmdCookieOffset = 12616
export const zfsCmdObjOffset = 12656
/** `offsetof(zfs_cmd_t, zc_inject_record)` on the Linux 64-bit layout we pack. */
export const zfsCmdInjectOffset = 13288
export const ZINJECT_DEVICE_FAULT = 2n
export const ZINJECT_PANIC = 5n
export const ZINJECT_DELAY_IO = 6n
export const ZINJECT_FLUSH_ARC = 2
export const ZINJECT_UNLOAD_SPA = 4

export const ZFS_IMPORT_ANY_HOST = 0x2
export const ZFS_IMPORT_MISSING_LOG = 0x4
export const ZFS_IMPORT_ONLY = 0x8
export const ZFS_IMPORT_TEMP_NAME = 0x10
export const ZFS_IMPORT_CHECKPOINT = 0x80

export const ZFS_ONLINE_EXPAND = 0x8
export const ZEVENT_NONE = 0
export const ZEVENT_NONBLOCK = 0x1
/** Linux `ZEVENT_SEEK_START` for `zpool_events_seek`. */
export const ZEVENT_SEEK_START = 0x2
/** Linux `ZEVENT_SEEK_END` for `zpool_events_seek`. */
export const ZEVENT_SEEK_END = 0x4
const zeventSeekEndEid = 0xffffffffffffffffn

/** Map a protocol eid (`0` / max / concrete) onto `zpool_events_seek` flags. */
export const eventsSeekFlags = (eid: bigint): { readonly eid: bigint; readonly flags: number } => {
  if (eid === 0n) return { eid: 0n, flags: ZEVENT_SEEK_START }
  if (eid === zeventSeekEndEid) return { eid: 0n, flags: ZEVENT_SEEK_END }
  return { eid, flags: ZEVENT_NONE }
}
export const FS_XFLAG_PROJINHERIT = 0x200
export const FS_IOC_FSGETXATTR = 0x801c581f
export const FS_IOC_FSSETXATTR = 0x401c5820

/** `vdev_stat_t` uint64 slots (`VS_ZIO_TYPES` = 6). */
export const VdevStatIndex = {
  alloc: 3,
  space: 4,
  opsRead: 9,
  opsWrite: 10,
  bytesRead: 15,
  bytesWrite: 16,
  readErrors: 20,
  writeErrors: 21,
  checksumErrors: 22
} as const

export const iostatCountersFromStats = (
  stats: ReadonlyArray<bigint>
): {
  readonly allocated: bigint
  readonly free: bigint
  readonly readOps: bigint
  readonly writeOps: bigint
  readonly readBytes: bigint
  readonly writeBytes: bigint
} => {
  const allocated = stats[VdevStatIndex.alloc] ?? 0n
  const space = stats[VdevStatIndex.space] ?? 0n
  return {
    allocated,
    free: space > allocated ? space - allocated : 0n,
    readOps: stats[VdevStatIndex.opsRead] ?? 0n,
    writeOps: stats[VdevStatIndex.opsWrite] ?? 0n,
    readBytes: stats[VdevStatIndex.bytesRead] ?? 0n,
    writeBytes: stats[VdevStatIndex.bytesWrite] ?? 0n
  }
}

export type IostatThroughput = {
  readonly readOps: bigint
  readonly writeOps: bigint
  readonly readBytes: bigint
  readonly writeBytes: bigint
}

const subCounter = (now: bigint, was: bigint): bigint => now >= was ? now - was : 0n

/** `zpool iostat` interval samples report ops/bytes as deltas, not cumulative. */
export const iostatDeltaThroughput = (
  current: IostatThroughput,
  previous: IostatThroughput
): IostatThroughput => ({
  readOps: subCounter(current.readOps, previous.readOps),
  writeOps: subCounter(current.writeOps, previous.writeOps),
  readBytes: subCounter(current.readBytes, previous.readBytes),
  writeBytes: subCounter(current.writeBytes, previous.writeBytes)
})

export const ZFS_USERQUOTA_USERUSED = 0
export const ZFS_USERQUOTA_USERQUOTA = 1
export const ZFS_USERQUOTA_GROUPUSED = 2
export const ZFS_USERQUOTA_GROUPQUOTA = 3
export const ZFS_USERQUOTA_USEROBJUSED = 4
export const ZFS_USERQUOTA_USEROBJQUOTA = 5
export const ZFS_USERQUOTA_GROUPOBJUSED = 6
export const ZFS_USERQUOTA_GROUPOBJQUOTA = 7
export const ZFS_USERQUOTA_PROJECTUSED = 8
export const ZFS_USERQUOTA_PROJECTQUOTA = 9
export const ZFS_USERQUOTA_PROJECTOBJUSED = 10
export const ZFS_USERQUOTA_PROJECTOBJQUOTA = 11

const whoChar = (kind: DelegWhoKind): string => {
  switch (kind) {
    case "user":
      return "u"
    case "group":
      return "g"
    case "everyone":
      return "e"
    case "create":
      return "c"
    case "set":
      return "s"
  }
}

const inheritChars = (inherit: DelegInherit | undefined): ReadonlyArray<"l" | "d"> => {
  if (inherit === "local") return ["l"]
  if (inherit === "descendant") return ["d"]
  return ["l", "d"]
}

/** OpenZFS `zfs_deleg` nvlist keys: `{u|g|e|c|s}{l|d}$name`. */
export const fsaclKeys = (
  who: { readonly kind: DelegWhoKind; readonly name?: string },
  inherit?: DelegInherit
): ReadonlyArray<string> => {
  const ident = who.name ?? ""
  if (who.kind === "create") return ["c$"]
  if (who.kind === "set") return [`s$${ident}`]
  return inheritChars(inherit).map((flag) => `${whoChar(who.kind)}${flag}$${ident}`)
}

export const parseFsaclKey = (
  key: string
): { readonly kind: DelegWhoKind; readonly name?: string; readonly inherit: DelegInherit } | undefined => {
  if (key === "c$") return { kind: "create", inherit: "local+descendant" }
  if (key.startsWith("s$")) {
    const name = key.slice(2)
    return name.length === 0
      ? { kind: "set", inherit: "local+descendant" }
      : { kind: "set", name, inherit: "local+descendant" }
  }
  const match = /^([uge])([ld])\$(.*)$/.exec(key)
  if (match === null) return undefined
  const kindChar = match[1]
  const inheritChar = match[2]
  const name = match[3]
  const kind: DelegWhoKind | undefined = kindChar === "u"
    ? "user"
    : kindChar === "g"
    ? "group"
    : kindChar === "e"
    ? "everyone"
    : undefined
  if (kind === undefined) return undefined
  const inherit: DelegInherit = inheritChar === "l" ? "local" : "descendant"
  if (kind === "everyone" || name === undefined || name.length === 0) {
    return { kind, inherit }
  }
  return { kind, name, inherit }
}

export const recvHiddenName = (target: string): string => `${target}%recv`

export const snapshotSpecOf = (name: string): { readonly fs: string; readonly spec: string } | undefined => {
  const at = name.indexOf("@")
  if (at <= 0) return undefined
  return { fs: name.slice(0, at), spec: name.slice(at + 1) }
}

/** Whether `pool/fs@snap` is inside a `from%to` snapspec (inclusive, component order). */
export const snapshotInRange = (fullName: string, spec: string): boolean => {
  const at = fullName.lastIndexOf("@")
  if (at < 0) return false
  const component = fullName.slice(at + 1)
  const pct = spec.indexOf("%")
  if (pct < 0) return component === spec
  const from = spec.slice(0, pct)
  const to = spec.slice(pct + 1)
  if (from.length > 0 && component < from) return false
  if (to.length > 0 && component > to) return false
  return true
}

export const importFlagsOf = (input: {
  readonly force?: boolean
  readonly missingLog?: boolean
  readonly unmounted?: boolean
  readonly temporary?: boolean
  readonly rewindToCheckpoint?: boolean
}): number => {
  let flags = 0
  if (input.force === true) flags |= ZFS_IMPORT_ANY_HOST
  if (input.missingLog === true) flags |= ZFS_IMPORT_MISSING_LOG
  void input.unmounted
  if (input.temporary === true) flags |= ZFS_IMPORT_TEMP_NAME
  if (input.rewindToCheckpoint === true) flags |= ZFS_IMPORT_CHECKPOINT
  return flags
}

const VDEV_STATE_OFFLINE = 2
const VDEV_STATE_REMOVED = 3
const VDEV_STATE_CANT_OPEN = 4
const VDEV_STATE_FAULTED = 5
const VDEV_STATE_DEGRADED = 6
const VDEV_STATE_HEALTHY = 7

export const vdevStateHealth = (state: bigint | number): PoolHealth | undefined => {
  const value = typeof state === "bigint" ? Number(state) : state
  switch (value) {
    case VDEV_STATE_HEALTHY:
      return "ONLINE"
    case VDEV_STATE_DEGRADED:
      return "DEGRADED"
    case VDEV_STATE_FAULTED:
      return "FAULTED"
    case VDEV_STATE_OFFLINE:
      return "OFFLINE"
    case VDEV_STATE_CANT_OPEN:
      return "UNAVAIL"
    case VDEV_STATE_REMOVED:
      return "REMOVED"
    default:
      return undefined
  }
}

export const quotaPropsFor = (kind: "userspace" | "groupspace" | "projectspace"): ReadonlyArray<number> => {
  if (kind === "userspace") {
    return [
      ZFS_USERQUOTA_USERUSED,
      ZFS_USERQUOTA_USERQUOTA,
      ZFS_USERQUOTA_USEROBJUSED,
      ZFS_USERQUOTA_USEROBJQUOTA
    ]
  }
  if (kind === "groupspace") {
    return [
      ZFS_USERQUOTA_GROUPUSED,
      ZFS_USERQUOTA_GROUPQUOTA,
      ZFS_USERQUOTA_GROUPOBJUSED,
      ZFS_USERQUOTA_GROUPOBJQUOTA
    ]
  }
  return [
    ZFS_USERQUOTA_PROJECTUSED,
    ZFS_USERQUOTA_PROJECTQUOTA,
    ZFS_USERQUOTA_PROJECTOBJUSED,
    ZFS_USERQUOTA_PROJECTOBJQUOTA
  ]
}

export const quotaTypeLabel = (kind: "userspace" | "groupspace" | "projectspace"): string => {
  if (kind === "userspace") return "POSIX User"
  if (kind === "groupspace") return "POSIX Group"
  return "Project"
}

export const quotaFieldOf = (
  prop: number
): "used" | "quota" | "objused" | "objquota" => {
  if (
    prop === ZFS_USERQUOTA_USERUSED ||
    prop === ZFS_USERQUOTA_GROUPUSED ||
    prop === ZFS_USERQUOTA_PROJECTUSED
  ) return "used"
  if (
    prop === ZFS_USERQUOTA_USERQUOTA ||
    prop === ZFS_USERQUOTA_GROUPQUOTA ||
    prop === ZFS_USERQUOTA_PROJECTQUOTA
  ) return "quota"
  if (
    prop === ZFS_USERQUOTA_USEROBJUSED ||
    prop === ZFS_USERQUOTA_GROUPOBJUSED ||
    prop === ZFS_USERQUOTA_PROJECTOBJUSED
  ) return "objused"
  return "objquota"
}

export const needsLibzfsDestroy = (input: {
  readonly name: string
  readonly recursive?: boolean
  readonly descendants?: boolean
  readonly force?: boolean
}): boolean =>
  input.name.includes("%") ||
  input.recursive === true ||
  input.descendants === true ||
  (input.force === true && !input.name.includes("@"))

export const needsLibzfsRollback = (input: {
  readonly destroyRecent?: boolean
  readonly destroyClones?: boolean
  readonly force?: boolean
}): boolean => input.destroyRecent === true || input.destroyClones === true || input.force === true

export const needsLibzfsSend = (input: {
  readonly options?: {
    readonly resumeToken?: string
    readonly replicate?: boolean
    readonly properties?: boolean
    readonly holds?: boolean
    readonly redact?: string
    readonly incremental?: "from" | "intermediate"
  }
}): boolean => {
  const options = input.options
  if (options === undefined) return false
  return (
    options.resumeToken !== undefined ||
    options.replicate === true ||
    options.properties === true ||
    options.holds === true ||
    options.incremental === "intermediate"
  )
}

export type ResumeParts = {
  readonly object: bigint
  readonly offset: bigint
  readonly toguid?: bigint
  readonly toname?: string
}

const asBigint = (value: unknown): bigint | undefined => {
  if (typeof value === "bigint") return value
  if (typeof value === "number" && Number.isFinite(value)) return BigInt(Math.trunc(value))
  if (typeof value === "string" && value.length > 0) {
    try {
      return BigInt(value)
    } catch {
      return undefined
    }
  }
  return undefined
}

export const resumePartsFromNv = (unpacked: { readonly [key: string]: unknown }): ResumeParts | undefined => {
  const object = asBigint(unpacked["resume_object"]) ??
    asBigint(unpacked["object"]) ??
    asBigint(unpacked["obj"])
  const offset = asBigint(unpacked["resume_offset"]) ??
    asBigint(unpacked["offset"]) ??
    asBigint(unpacked["off"])
  if (object === undefined || offset === undefined) return undefined
  const toguid = asBigint(unpacked["toguid"])
  const toname = typeof unpacked["toname"] === "string" ? unpacked["toname"] : undefined
  return {
    object,
    offset,
    ...(toguid === undefined ? {} : { toguid }),
    ...(toname === undefined ? {} : { toname })
  }
}

export const writeZfsCmd = (
  name: string,
  value?: string,
  extra?: { readonly guid?: bigint; readonly obj?: bigint; readonly cookie?: bigint }
): Buffer => {
  const buf = Buffer.alloc(zfsCmdSize)
  buf.write(name, zfsCmdNameOffset, 4095, "utf8")
  if (value !== undefined) buf.write(value, zfsCmdValueOffset, 8191, "utf8")
  if (extra?.guid !== undefined) buf.writeBigUInt64LE(extra.guid, zfsCmdGuidOffset)
  if (extra?.cookie !== undefined) buf.writeBigUInt64LE(extra.cookie, zfsCmdCookieOffset)
  if (extra?.obj !== undefined) buf.writeBigUInt64LE(extra.obj, zfsCmdObjOffset)
  return buf
}

/** Pack `zfs_cmd_t.zc_inject_record` (`zinject_record_t`) for `ZFS_IOC_INJECT_FAULT`. */
export const writeZfsInjectCmd = (input: {
  readonly pool: string
  readonly kind: InjectKind
  readonly guid?: bigint
  readonly object?: bigint
  readonly duration?: number
}): Buffer => {
  const guid = input.guid ?? 0n
  const buf = writeZfsCmd(input.pool, undefined, { guid })
  const rec = zfsCmdInjectOffset
  if (input.object !== undefined) buf.writeBigUInt64LE(input.object, rec + 8)
  buf.writeBigUInt64LE(guid, rec + 32)
  buf.writeUInt32LE(0xffffffff, rec + 56)
  switch (input.kind) {
    case "io":
      buf.writeUInt32LE(5, rec + 44)
      buf.writeBigUInt64LE(ZINJECT_DEVICE_FAULT, rec + 48)
      break
    case "checksum":
      buf.writeUInt32LE(52, rec + 44)
      buf.writeBigUInt64LE(ZINJECT_DEVICE_FAULT, rec + 48)
      break
    case "delay":
      buf.writeBigUInt64LE(ZINJECT_DELAY_IO, rec + 48)
      if (input.duration !== undefined) buf.writeInt32LE(input.duration, rec + 324)
      break
    case "panic":
      buf.writeBigUInt64LE(ZINJECT_PANIC, rec + 48)
      break
    case "flush":
      buf.writeUInt32LE(ZINJECT_FLUSH_ARC, rec + 344)
      break
    case "unload":
      buf.writeUInt32LE(ZINJECT_UNLOAD_SPA, rec + 344)
      break
  }
  return buf
}
