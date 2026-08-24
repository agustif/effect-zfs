import { Schema } from "effect"
import { ZfsCommand, type CommandResult } from "./Process.js"
import {
  BadRestore,
  CrossTarget,
  DatasetAlreadyExists,
  DatasetBusy,
  DatasetNotFound,
  EncryptionFailure,
  HoldTagExists,
  HoldTagNotFound,
  HoldTagTooLong,
  InvalidBackupStream,
  InvalidName,
  InvalidPermission,
  InvalidPermissionSet,
  InvalidProperty,
  InvalidWho,
  DelegationDisabled,
  MountFailed,
  OutOfSpace,
  PermissionDenied,
  PoolUnavailable,
  PropertyNotApplicable,
  PropertyNotInheritable,
  PropertyReadOnly,
  Resilvering,
  ShareFailed,
  UnmountFailed,
  VolumeTooBig,
  BadPath,
  BadAttachTarget,
  CheckpointDiscarding,
  CheckpointExists,
  DeviceIsCache,
  DeviceIsSpare,
  DeviceOpenFailed,
  DeviceOverflow,
  InvalidDevice,
  InvalidVdevConfig,
  NoCheckpoint,
  NoReplicas,
  NoSuchDevice,
  PoolActive,
  PoolInvalidArgument,
  PoolNotSupported,
  PostSplitOnline,
  VdevNotSupported
} from "./generated/errors.generated.js"
import { OperationErrorTags } from "./generated/operations.generated.js"

export class UnknownZfsError extends Schema.TaggedError<UnknownZfsError>()("UnknownZfsError", {
  operation: Schema.String,
  command: Schema.optionalKey(ZfsCommand),
  exitCode: Schema.optionalKey(Schema.Number),
  stdout: Schema.optionalKey(Schema.String),
  stderr: Schema.String
}) {}

export type ZfsError =
  | BadRestore | CrossTarget | DatasetAlreadyExists | DatasetBusy | DatasetNotFound
  | DelegationDisabled | EncryptionFailure | HoldTagExists | HoldTagNotFound | HoldTagTooLong
  | InvalidBackupStream | InvalidName | InvalidPermission | InvalidPermissionSet
  | InvalidProperty | InvalidWho | OutOfSpace
  | PermissionDenied | PoolUnavailable | PropertyNotApplicable | PropertyNotInheritable
  | PropertyReadOnly | Resilvering | VolumeTooBig | BadPath | CheckpointDiscarding
  | CheckpointExists | NoCheckpoint | PoolActive | MountFailed | UnmountFailed
  | ShareFailed | BadAttachTarget | DeviceIsCache | DeviceIsSpare | DeviceOpenFailed
  | DeviceOverflow | InvalidDevice | InvalidVdevConfig | NoReplicas | NoSuchDevice
  | PoolInvalidArgument | PoolNotSupported | PostSplitOnline | VdevNotSupported
  | UnknownZfsError

type ClassifiedZfsError = Exclude<ZfsError, UnknownZfsError>

const base = (operation: string, stderr: string) => ({ operation, message: stderr.trim() || "ZFS command failed", stderr })
const has = (s: string, pattern: RegExp) => pattern.test(s.toLowerCase())
const unknown = (operation: string, result: CommandResult) => new UnknownZfsError({
  operation,
  command: result.command,
  exitCode: result.exitCode,
  stdout: result.stdout,
  stderr: result.stderr
})

const classifyKnown = (operation: string, result: CommandResult): ClassifiedZfsError | undefined => {
  const s = result.stderr
  const b = base(operation, s)
  if (has(s, /permission denied|operation not permitted|unable to open \/dev\/zfs/)) {
    return new PermissionDenied({ code: "EZFS_PERM", ...b })
  }
  if (has(s, /delegated administration is disabled/)) return new DelegationDisabled({ code: "EZFS_NODELEGATION", ...b })
  if (has(s, /invalid permission set/)) return new InvalidPermissionSet({ code: "EZFS_BADPERMSET", ...b })
  if (has(s, /invalid permission who|invalid user\/group|invalid user |invalid group /)) {
    return new InvalidWho({ code: "EZFS_BADWHO", ...b })
  }
  if (has(s, /invalid permission/)) return new InvalidPermission({ code: "EZFS_BADPERM", ...b })
  if (has(s, /out of space|no space left/)) return new OutOfSpace({ code: "EZFS_NOSPC", ...b })
  if (has(s, /invalid property|bad property|unknown property/)) return new InvalidProperty({ code: "EZFS_BADPROP", ...b })
  if (has(s, /read.?only property|is readonly|property is readonly/)) return new PropertyReadOnly({ code: "EZFS_PROPREADONLY", ...b })
  if (has(s, /property.*does not apply|property.*not.*applicable|does not apply to datasets/)) return new PropertyNotApplicable({ code: "EZFS_PROPTYPE", ...b })
  if (has(s, /property.*cannot be inherited|not inheritable/)) return new PropertyNotInheritable({ code: "EZFS_PROPNONINHERIT", ...b })
  if (has(s, /currently resilvering|cannot restart resilver/)) {
    return new Resilvering({ code: "EZFS_RESILVERING", ...b })
  }
  if (has(s, /dataset.*busy|pool.*busy|currently being scrubbed|already in progress/)) {
    return new DatasetBusy({ code: "EZFS_BUSY", ...b })
  }
  if (has(s, /tag already exists/)) return new HoldTagExists({ code: "EZFS_REFTAG_HOLD", ...b })
  if (has(s, /no such tag|tag not found/)) return new HoldTagNotFound({ code: "EZFS_REFTAG_RELE", ...b })
  if (has(s, /tag is too long|tag too long/)) return new HoldTagTooLong({ code: "EZFS_TAGTOOLONG", ...b })
  if (has(s, /already exists|dataset exists|pool exists|part of active pool|part of an exported pool/)) {
    return new DatasetAlreadyExists({ code: "EZFS_EXISTS", ...b })
  }
  if (has(s, /no such device/)) return new NoSuchDevice({ code: "EZFS_NODEVICE", ...b })
  if (has(s, /can only attach|can only detach|invalid attach|invalid replace|bad attach/)) {
    return new BadAttachTarget({ code: "EZFS_BADTARGET", ...b })
  }
  if (has(s, /no valid replicas/)) return new NoReplicas({ code: "EZFS_NOREPLICAS", ...b })
  if (has(s, /too many devices/)) return new DeviceOverflow({ code: "EZFS_DEVOVERFLOW", ...b })
  if (has(s, /invalid vdev configuration/)) return new InvalidVdevConfig({ code: "EZFS_INVALCONFIG", ...b })
  if (has(s, /is a hot spare|is a spare/)) return new DeviceIsSpare({ code: "EZFS_ISSPARE", ...b })
  if (has(s, /is a cache device/)) return new DeviceIsCache({ code: "EZFS_ISL2CACHE", ...b })
  if (has(s, /unsupported vdev/)) return new VdevNotSupported({ code: "EZFS_VDEVNOTSUP", ...b })
  if (has(s, /invalid device to add|invalid vdev specification/)) {
    return new InvalidDevice({ code: "EZFS_BADDEV", ...b })
  }
  if (has(s, /onlining a disk after splitting|after splitting/)) {
    return new PostSplitOnline({ code: "EZFS_POSTSPLIT_ONLINE", ...b })
  }
  if (has(s, /does not exist|no such pool|no such dataset|cannot open.*no such/)) return new DatasetNotFound({ code: "EZFS_NOENT", ...b })
  if (has(s, /invalid backup stream|bad stream/)) return new InvalidBackupStream({ code: "EZFS_BADSTREAM", ...b })
  if (has(s, /volume.*too large|exceeds limit/)) return new VolumeTooBig({ code: "EZFS_VOLTOOBIG", ...b })
  if (has(s, /invalid name/)) return new InvalidName({ code: "EZFS_INVALIDNAME", ...b })
  if (has(s, /unable to restore|cannot receive/)) return new BadRestore({ code: "EZFS_BADRESTORE", ...b })
  if (has(s, /crosses datasets|different pool|cross.*pool/)) return new CrossTarget({ code: "EZFS_CROSSTARGET", ...b })
  if (has(s, /pool is unavailable|pool unavailable/)) return new PoolUnavailable({ code: "EZFS_POOLUNAVAIL", ...b })
  if (has(s, /incorrect key|encryption failure|failed to setup encryption|key load error|could not load key|wrapping key|encryption currently not supported|crypto failed/)) {
    return new EncryptionFailure({ code: "EZFS_CRYPTOFAILED", ...b })
  }
  if (has(s, /must be an absolute path|not an absolute path/)) {
    return new BadPath({ code: "EZFS_BADPATH", ...b })
  }
  if (has(s, /imported on another system|imported on a different system|active on another system/)) {
    return new PoolActive({ code: "EZFS_ACTIVE_POOL", ...b })
  }
  if (has(s, /checkpoint exists|already has a checkpoint/)) {
    return new CheckpointExists({ code: "EZFS_CHECKPOINT_EXISTS", ...b })
  }
  if (has(s, /currently discarding a checkpoint|discarding a checkpoint/)) {
    return new CheckpointDiscarding({ code: "EZFS_DISCARDING_CHECKPOINT", ...b })
  }
  if (has(s, /does not have a checkpoint|pool has no checkpoint|no checkpoint/)) {
    return new NoCheckpoint({ code: "EZFS_NO_CHECKPOINT", ...b })
  }
  if (has(s, /cannot mount|failed to mount|already mounted/)) {
    return new MountFailed({ code: "EZFS_MOUNTFAILED", ...b })
  }
  if (has(s, /cannot unmount|failed to unmount|not currently mounted/)) {
    return new UnmountFailed({ code: "EZFS_UMOUNTFAILED", ...b })
  }
  if (has(s, /cannot share|failed to share|cannot unshare|failed to unshare/)) {
    return new ShareFailed({ code: "EZFS_SHAREFAILED", ...b })
  }
  return undefined
}

/**
 * CLI stderr is not a stable machine protocol. This classifier is intentionally
 * conservative: known stable phrases are promoted to typed libzfs errors and
 * everything else remains UnknownZfsError. Crucially, a recognized phrase is
 * only promoted when that tag is declared for the current generated operation;
 * this prevents a heuristic from violating an operation's advertised error
 * union. The future libzfs backend bypasses this heuristic and maps
 * libzfs_errno() directly.
 */
export const classifyCliError = (operation: string, result: CommandResult): ZfsError => {
  const candidate = classifyKnown(operation, result)
  if (!candidate) return unknown(operation, result)

  const declared = OperationErrorTags[operation as keyof typeof OperationErrorTags] as readonly string[] | undefined
  return declared?.includes(candidate._tag) ? candidate : unknown(operation, result)
}
