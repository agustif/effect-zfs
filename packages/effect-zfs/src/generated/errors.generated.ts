// AUTO-GENERATED. DO NOT EDIT.
import { Schema } from "effect"

export class InvalidProperty extends Schema.TaggedError<InvalidProperty>()("InvalidProperty", {
  code: Schema.Literal("EZFS_BADPROP"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PropertyReadOnly extends Schema.TaggedError<PropertyReadOnly>()("PropertyReadOnly", {
  code: Schema.Literal("EZFS_PROPREADONLY"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PropertyNotApplicable extends Schema.TaggedError<PropertyNotApplicable>()("PropertyNotApplicable", {
  code: Schema.Literal("EZFS_PROPTYPE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PropertyNotInheritable extends Schema.TaggedError<PropertyNotInheritable>()("PropertyNotInheritable", {
  code: Schema.Literal("EZFS_PROPNONINHERIT"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DatasetBusy extends Schema.TaggedError<DatasetBusy>()("DatasetBusy", {
  code: Schema.Literal("EZFS_BUSY"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DatasetAlreadyExists extends Schema.TaggedError<DatasetAlreadyExists>()("DatasetAlreadyExists", {
  code: Schema.Literal("EZFS_EXISTS"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DatasetNotFound extends Schema.TaggedError<DatasetNotFound>()("DatasetNotFound", {
  code: Schema.Literal("EZFS_NOENT"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidBackupStream extends Schema.TaggedError<InvalidBackupStream>()("InvalidBackupStream", {
  code: Schema.Literal("EZFS_BADSTREAM"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class VolumeTooBig extends Schema.TaggedError<VolumeTooBig>()("VolumeTooBig", {
  code: Schema.Literal("EZFS_VOLTOOBIG"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidName extends Schema.TaggedError<InvalidName>()("InvalidName", {
  code: Schema.Literal("EZFS_INVALIDNAME"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class BadRestore extends Schema.TaggedError<BadRestore>()("BadRestore", {
  code: Schema.Literal("EZFS_BADRESTORE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class BadAttachTarget extends Schema.TaggedError<BadAttachTarget>()("BadAttachTarget", {
  code: Schema.Literal("EZFS_BADTARGET"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class NoSuchDevice extends Schema.TaggedError<NoSuchDevice>()("NoSuchDevice", {
  code: Schema.Literal("EZFS_NODEVICE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidDevice extends Schema.TaggedError<InvalidDevice>()("InvalidDevice", {
  code: Schema.Literal("EZFS_BADDEV"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class NoReplicas extends Schema.TaggedError<NoReplicas>()("NoReplicas", {
  code: Schema.Literal("EZFS_NOREPLICAS"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class Resilvering extends Schema.TaggedError<Resilvering>()("Resilvering", {
  code: Schema.Literal("EZFS_RESILVERING"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PoolUnavailable extends Schema.TaggedError<PoolUnavailable>()("PoolUnavailable", {
  code: Schema.Literal("EZFS_POOLUNAVAIL"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DeviceOverflow extends Schema.TaggedError<DeviceOverflow>()("DeviceOverflow", {
  code: Schema.Literal("EZFS_DEVOVERFLOW"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class BadPath extends Schema.TaggedError<BadPath>()("BadPath", {
  code: Schema.Literal("EZFS_BADPATH"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class CrossTarget extends Schema.TaggedError<CrossTarget>()("CrossTarget", {
  code: Schema.Literal("EZFS_CROSSTARGET"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class MountFailed extends Schema.TaggedError<MountFailed>()("MountFailed", {
  code: Schema.Literal("EZFS_MOUNTFAILED"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class UnmountFailed extends Schema.TaggedError<UnmountFailed>()("UnmountFailed", {
  code: Schema.Literal("EZFS_UMOUNTFAILED"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PermissionDenied extends Schema.TaggedError<PermissionDenied>()("PermissionDenied", {
  code: Schema.Literal("EZFS_PERM"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class OutOfSpace extends Schema.TaggedError<OutOfSpace>()("OutOfSpace", {
  code: Schema.Literal("EZFS_NOSPC"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DeviceIsSpare extends Schema.TaggedError<DeviceIsSpare>()("DeviceIsSpare", {
  code: Schema.Literal("EZFS_ISSPARE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidVdevConfig extends Schema.TaggedError<InvalidVdevConfig>()("InvalidVdevConfig", {
  code: Schema.Literal("EZFS_INVALCONFIG"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PoolNotSupported extends Schema.TaggedError<PoolNotSupported>()("PoolNotSupported", {
  code: Schema.Literal("EZFS_POOL_NOTSUP"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PoolInvalidArgument extends Schema.TaggedError<PoolInvalidArgument>()("PoolInvalidArgument", {
  code: Schema.Literal("EZFS_POOL_INVALARG"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DeviceOpenFailed extends Schema.TaggedError<DeviceOpenFailed>()("DeviceOpenFailed", {
  code: Schema.Literal("EZFS_OPENFAILED"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidWho extends Schema.TaggedError<InvalidWho>()("InvalidWho", {
  code: Schema.Literal("EZFS_BADWHO"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidPermission extends Schema.TaggedError<InvalidPermission>()("InvalidPermission", {
  code: Schema.Literal("EZFS_BADPERM"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class InvalidPermissionSet extends Schema.TaggedError<InvalidPermissionSet>()("InvalidPermissionSet", {
  code: Schema.Literal("EZFS_BADPERMSET"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DelegationDisabled extends Schema.TaggedError<DelegationDisabled>()("DelegationDisabled", {
  code: Schema.Literal("EZFS_NODELEGATION"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class DeviceIsCache extends Schema.TaggedError<DeviceIsCache>()("DeviceIsCache", {
  code: Schema.Literal("EZFS_ISL2CACHE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class VdevNotSupported extends Schema.TaggedError<VdevNotSupported>()("VdevNotSupported", {
  code: Schema.Literal("EZFS_VDEVNOTSUP"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class HoldTagNotFound extends Schema.TaggedError<HoldTagNotFound>()("HoldTagNotFound", {
  code: Schema.Literal("EZFS_REFTAG_RELE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class HoldTagExists extends Schema.TaggedError<HoldTagExists>()("HoldTagExists", {
  code: Schema.Literal("EZFS_REFTAG_HOLD"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class HoldTagTooLong extends Schema.TaggedError<HoldTagTooLong>()("HoldTagTooLong", {
  code: Schema.Literal("EZFS_TAGTOOLONG"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PostSplitOnline extends Schema.TaggedError<PostSplitOnline>()("PostSplitOnline", {
  code: Schema.Literal("EZFS_POSTSPLIT_ONLINE"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class PoolActive extends Schema.TaggedError<PoolActive>()("PoolActive", {
  code: Schema.Literal("EZFS_ACTIVE_POOL"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class EncryptionFailure extends Schema.TaggedError<EncryptionFailure>()("EncryptionFailure", {
  code: Schema.Literal("EZFS_CRYPTOFAILED"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class CheckpointExists extends Schema.TaggedError<CheckpointExists>()("CheckpointExists", {
  code: Schema.Literal("EZFS_CHECKPOINT_EXISTS"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class CheckpointDiscarding extends Schema.TaggedError<CheckpointDiscarding>()("CheckpointDiscarding", {
  code: Schema.Literal("EZFS_DISCARDING_CHECKPOINT"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class NoCheckpoint extends Schema.TaggedError<NoCheckpoint>()("NoCheckpoint", {
  code: Schema.Literal("EZFS_NO_CHECKPOINT"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export class ShareFailed extends Schema.TaggedError<ShareFailed>()("ShareFailed", {
  code: Schema.Literal("EZFS_SHAREFAILED"),
  operation: Schema.String,
  message: Schema.String,
  stderr: Schema.optionalKey(Schema.String)
}) {}

export const errorCodeToTag = {
  "EZFS_BADPROP": "InvalidProperty",
  "EZFS_PROPREADONLY": "PropertyReadOnly",
  "EZFS_PROPTYPE": "PropertyNotApplicable",
  "EZFS_PROPNONINHERIT": "PropertyNotInheritable",
  "EZFS_BUSY": "DatasetBusy",
  "EZFS_EXISTS": "DatasetAlreadyExists",
  "EZFS_NOENT": "DatasetNotFound",
  "EZFS_BADSTREAM": "InvalidBackupStream",
  "EZFS_VOLTOOBIG": "VolumeTooBig",
  "EZFS_INVALIDNAME": "InvalidName",
  "EZFS_BADRESTORE": "BadRestore",
  "EZFS_BADTARGET": "BadAttachTarget",
  "EZFS_NODEVICE": "NoSuchDevice",
  "EZFS_BADDEV": "InvalidDevice",
  "EZFS_NOREPLICAS": "NoReplicas",
  "EZFS_RESILVERING": "Resilvering",
  "EZFS_POOLUNAVAIL": "PoolUnavailable",
  "EZFS_DEVOVERFLOW": "DeviceOverflow",
  "EZFS_BADPATH": "BadPath",
  "EZFS_CROSSTARGET": "CrossTarget",
  "EZFS_MOUNTFAILED": "MountFailed",
  "EZFS_UMOUNTFAILED": "UnmountFailed",
  "EZFS_PERM": "PermissionDenied",
  "EZFS_NOSPC": "OutOfSpace",
  "EZFS_ISSPARE": "DeviceIsSpare",
  "EZFS_INVALCONFIG": "InvalidVdevConfig",
  "EZFS_POOL_NOTSUP": "PoolNotSupported",
  "EZFS_POOL_INVALARG": "PoolInvalidArgument",
  "EZFS_OPENFAILED": "DeviceOpenFailed",
  "EZFS_BADWHO": "InvalidWho",
  "EZFS_BADPERM": "InvalidPermission",
  "EZFS_BADPERMSET": "InvalidPermissionSet",
  "EZFS_NODELEGATION": "DelegationDisabled",
  "EZFS_ISL2CACHE": "DeviceIsCache",
  "EZFS_VDEVNOTSUP": "VdevNotSupported",
  "EZFS_REFTAG_RELE": "HoldTagNotFound",
  "EZFS_REFTAG_HOLD": "HoldTagExists",
  "EZFS_TAGTOOLONG": "HoldTagTooLong",
  "EZFS_POSTSPLIT_ONLINE": "PostSplitOnline",
  "EZFS_ACTIVE_POOL": "PoolActive",
  "EZFS_CRYPTOFAILED": "EncryptionFailure",
  "EZFS_CHECKPOINT_EXISTS": "CheckpointExists",
  "EZFS_DISCARDING_CHECKPOINT": "CheckpointDiscarding",
  "EZFS_NO_CHECKPOINT": "NoCheckpoint",
  "EZFS_SHAREFAILED": "ShareFailed",
} as const

export const errorValueToCode: { readonly [value: number]: string } = {
  2001: "EZFS_BADPROP",
  2002: "EZFS_PROPREADONLY",
  2003: "EZFS_PROPTYPE",
  2004: "EZFS_PROPNONINHERIT",
  2007: "EZFS_BUSY",
  2008: "EZFS_EXISTS",
  2009: "EZFS_NOENT",
  2010: "EZFS_BADSTREAM",
  2012: "EZFS_VOLTOOBIG",
  2013: "EZFS_INVALIDNAME",
  2014: "EZFS_BADRESTORE",
  2016: "EZFS_BADTARGET",
  2017: "EZFS_NODEVICE",
  2018: "EZFS_BADDEV",
  2019: "EZFS_NOREPLICAS",
  2020: "EZFS_RESILVERING",
  2022: "EZFS_POOLUNAVAIL",
  2023: "EZFS_DEVOVERFLOW",
  2024: "EZFS_BADPATH",
  2025: "EZFS_CROSSTARGET",
  2027: "EZFS_MOUNTFAILED",
  2028: "EZFS_UMOUNTFAILED",
  2031: "EZFS_PERM",
  2032: "EZFS_NOSPC",
  2036: "EZFS_ISSPARE",
  2037: "EZFS_INVALCONFIG",
  2041: "EZFS_POOL_NOTSUP",
  2042: "EZFS_POOL_INVALARG",
  2044: "EZFS_OPENFAILED",
  2047: "EZFS_BADWHO",
  2048: "EZFS_BADPERM",
  2049: "EZFS_BADPERMSET",
  2050: "EZFS_NODELEGATION",
  2054: "EZFS_ISL2CACHE",
  2055: "EZFS_VDEVNOTSUP",
  2059: "EZFS_REFTAG_RELE",
  2060: "EZFS_REFTAG_HOLD",
  2061: "EZFS_TAGTOOLONG",
  2064: "EZFS_POSTSPLIT_ONLINE",
  2074: "EZFS_ACTIVE_POOL",
  2075: "EZFS_CRYPTOFAILED",
  2077: "EZFS_CHECKPOINT_EXISTS",
  2078: "EZFS_DISCARDING_CHECKPOINT",
  2079: "EZFS_NO_CHECKPOINT",
  2097: "EZFS_SHAREFAILED",
}
