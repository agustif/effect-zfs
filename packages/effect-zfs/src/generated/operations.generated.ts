// AUTO-GENERATED. DO NOT EDIT.
import type { BadAttachTarget, BadPath, BadRestore, CheckpointDiscarding, CheckpointExists, CrossTarget, DatasetAlreadyExists, DatasetBusy, DatasetNotFound, DelegationDisabled, DeviceIsCache, DeviceIsSpare, DeviceOpenFailed, DeviceOverflow, EncryptionFailure, HoldTagExists, HoldTagNotFound, HoldTagTooLong, InvalidBackupStream, InvalidDevice, InvalidName, InvalidPermission, InvalidPermissionSet, InvalidProperty, InvalidVdevConfig, InvalidWho, MountFailed, NoCheckpoint, NoReplicas, NoSuchDevice, OutOfSpace, PermissionDenied, PoolActive, PoolInvalidArgument, PoolNotSupported, PoolUnavailable, PostSplitOnline, PropertyNotApplicable, PropertyNotInheritable, PropertyReadOnly, Resilvering, ShareFailed, UnmountFailed, VdevNotSupported, VolumeTooBig } from "./errors.generated.js"
import type { UnknownZfsError } from "../errors/classify.js"
import type { ZfsTransportError } from "../protocol/process.js"
import type * as Args from "../args/index.js"
import type { PoolStatus, PropertyGetRow } from "../schema/models.js"
import type { ZfsVersionInfo } from "../schema/version.js"
import type { Stream } from "effect"

export type Dataset_ListError = InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_GetError = DatasetNotFound | InvalidName | InvalidProperty | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_SetError = DatasetNotFound | InvalidName | InvalidProperty | PropertyReadOnly | PropertyNotApplicable | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_InheritError = DatasetNotFound | InvalidName | InvalidProperty | PropertyNotInheritable | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Dataset_CreateFilesystemError = DatasetAlreadyExists | DatasetNotFound | InvalidName | InvalidProperty | EncryptionFailure | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_CreateVolumeError = DatasetAlreadyExists | DatasetNotFound | InvalidName | InvalidProperty | EncryptionFailure | PermissionDenied | OutOfSpace | VolumeTooBig | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_DestroyError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Snapshot_CreateError = DatasetNotFound | DatasetAlreadyExists | InvalidName | PermissionDenied | OutOfSpace | UnknownZfsError | ZfsTransportError

export type Snapshot_DestroyError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Snapshot_CloneError = DatasetNotFound | DatasetAlreadyExists | CrossTarget | InvalidName | InvalidProperty | PermissionDenied | OutOfSpace | UnknownZfsError | ZfsTransportError

export type Snapshot_ListError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Snapshot_RollbackError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Snapshot_PromoteError = DatasetNotFound | DatasetAlreadyExists | DatasetBusy | CrossTarget | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Snapshot_RenameError = DatasetNotFound | DatasetAlreadyExists | DatasetBusy | CrossTarget | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_RenameError = DatasetNotFound | DatasetAlreadyExists | DatasetBusy | CrossTarget | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ListError = PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_GetError = DatasetNotFound | InvalidName | PoolUnavailable | InvalidProperty | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_SetError = DatasetNotFound | InvalidName | PoolUnavailable | InvalidProperty | PropertyReadOnly | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_StatusError = DatasetNotFound | InvalidName | PoolUnavailable | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_CreateError = DatasetAlreadyExists | InvalidName | InvalidProperty | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_DestroyError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_TrimError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | DatasetBusy | UnknownZfsError | ZfsTransportError

export type Pool_InitializeError = DatasetNotFound | InvalidName | PermissionDenied | OutOfSpace | PoolUnavailable | DatasetBusy | UnknownZfsError | ZfsTransportError

export type Pool_ClearError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ReopenError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | DatasetBusy | UnknownZfsError | ZfsTransportError

export type Pool_SyncError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ScrubError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | DatasetBusy | Resilvering | UnknownZfsError | ZfsTransportError

export type Pool_ResilverError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | DatasetBusy | Resilvering | UnknownZfsError | ZfsTransportError

export type Replication_SendError = DatasetNotFound | InvalidName | InvalidBackupStream | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Replication_SendSpaceError = DatasetNotFound | InvalidName | InvalidBackupStream | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Replication_SendProgressError = DatasetNotFound | InvalidName | InvalidBackupStream | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Replication_ReceiveError = DatasetNotFound | DatasetAlreadyExists | InvalidName | InvalidProperty | InvalidBackupStream | BadRestore | CrossTarget | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Replication_AbortReceiveError = DatasetNotFound | DatasetBusy | InvalidName | BadRestore | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Snapshot_HoldError = DatasetNotFound | HoldTagExists | HoldTagTooLong | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Snapshot_HoldsError = DatasetNotFound | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Snapshot_ReleaseError = DatasetNotFound | HoldTagNotFound | HoldTagTooLong | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Mount_MountError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | MountFailed | EncryptionFailure | UnknownZfsError | ZfsTransportError

export type Mount_UnmountError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnmountFailed | EncryptionFailure | UnknownZfsError | ZfsTransportError

export type Mount_ShareError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | ShareFailed | EncryptionFailure | UnknownZfsError | ZfsTransportError

export type Mount_UnshareError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | ShareFailed | UnknownZfsError | ZfsTransportError

export type Bookmark_CreateError = DatasetNotFound | DatasetAlreadyExists | InvalidName | PermissionDenied | OutOfSpace | UnknownZfsError | ZfsTransportError

export type Bookmark_DestroyError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Bookmark_ListError = InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Bookmark_GetError = DatasetNotFound | InvalidName | InvalidProperty | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Crypto_LoadKeyError = DatasetNotFound | InvalidName | EncryptionFailure | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Crypto_UnloadKeyError = DatasetNotFound | DatasetBusy | InvalidName | EncryptionFailure | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Crypto_ChangeKeyError = DatasetNotFound | InvalidName | InvalidProperty | EncryptionFailure | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_EventsError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_EventsClearError = PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_EventsSeekError = PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_IostatError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_WaitError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_HistoryError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_PrefetchError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ImportError = DatasetAlreadyExists | DatasetNotFound | DatasetBusy | InvalidName | InvalidProperty | PropertyReadOnly | PermissionDenied | PoolUnavailable | PoolActive | UnknownZfsError | ZfsTransportError

export type Pool_ExportError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ReguidError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_UpgradeError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_LabelClearError = DatasetBusy | InvalidName | BadPath | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_CheckpointError = DatasetNotFound | DatasetBusy | InvalidName | PermissionDenied | PoolUnavailable | CheckpointExists | CheckpointDiscarding | NoCheckpoint | UnknownZfsError | ZfsTransportError

export type Dataset_AllowError = DatasetNotFound | InvalidName | InvalidWho | InvalidPermission | InvalidPermissionSet | DelegationDisabled | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_UnallowError = DatasetNotFound | InvalidName | InvalidWho | InvalidPermission | InvalidPermissionSet | DelegationDisabled | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ListAllowError = DatasetNotFound | InvalidName | DelegationDisabled | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_UserspaceError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_GroupspaceError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ProjectspaceError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ProjectError = DatasetNotFound | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_ProgramError = DatasetNotFound | InvalidName | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Snapshot_RedactError = DatasetNotFound | DatasetAlreadyExists | InvalidName | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_WaitError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_DiffError = DatasetNotFound | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Zfs_VersionError = PermissionDenied | UnknownZfsError | ZfsTransportError

export type Dataset_ZoneError = DatasetNotFound | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Dataset_UnzoneError = DatasetNotFound | InvalidName | PermissionDenied | UnknownZfsError | ZfsTransportError

export type Pool_GetBootenvError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_SetBootenvError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | OutOfSpace | UnknownZfsError | ZfsTransportError

export type Pool_DdtPruneError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_CondenseError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_AddError = DatasetNotFound | InvalidName | InvalidProperty | InvalidDevice | BadPath | DeviceOverflow | InvalidVdevConfig | VdevNotSupported | DeviceOpenFailed | DeviceIsSpare | DatasetBusy | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_RemoveError = DatasetNotFound | InvalidName | NoSuchDevice | NoReplicas | InvalidVdevConfig | PoolNotSupported | PoolInvalidArgument | DatasetBusy | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_AttachError = DatasetNotFound | InvalidName | InvalidProperty | NoSuchDevice | BadAttachTarget | InvalidDevice | BadPath | DeviceIsSpare | DeviceIsCache | Resilvering | InvalidVdevConfig | DeviceOpenFailed | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_DetachError = DatasetNotFound | InvalidName | NoSuchDevice | BadAttachTarget | NoReplicas | DeviceIsSpare | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ReplaceError = DatasetNotFound | InvalidName | InvalidProperty | NoSuchDevice | BadAttachTarget | InvalidDevice | BadPath | DeviceIsSpare | DeviceIsCache | Resilvering | InvalidVdevConfig | DeviceOpenFailed | PermissionDenied | OutOfSpace | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_SplitError = DatasetNotFound | DatasetAlreadyExists | InvalidName | InvalidProperty | NoSuchDevice | InvalidVdevConfig | BadPath | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_OnlineError = DatasetNotFound | InvalidName | NoSuchDevice | PostSplitOnline | DeviceOpenFailed | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_OfflineError = DatasetNotFound | InvalidName | NoSuchDevice | NoReplicas | DatasetBusy | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_UpgradeError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ExistsError = InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_GetVdevError = DatasetNotFound | InvalidName | InvalidProperty | NoSuchDevice | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_SetVdevError = DatasetNotFound | InvalidName | InvalidProperty | PropertyReadOnly | NoSuchDevice | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Replication_SnaprangeSpaceError = DatasetNotFound | InvalidName | InvalidBackupStream | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_RewriteError = DatasetNotFound | InvalidName | BadPath | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_FreezeError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_RemapError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_SetVdevPathError = DatasetNotFound | InvalidName | NoSuchDevice | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_SetVdevFruError = DatasetNotFound | InvalidName | NoSuchDevice | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_InjectFaultError = DatasetNotFound | InvalidName | NoSuchDevice | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ClearFaultError = InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ListFaultsError = PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Pool_ErrorLogError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ObjToPathError = DatasetNotFound | InvalidName | BadPath | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_DsobjToNameError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_NextObjError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Dataset_ObjToStatsError = DatasetNotFound | InvalidName | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export type Mount_SmbAclError = DatasetNotFound | InvalidName | BadPath | PermissionDenied | PoolUnavailable | UnknownZfsError | ZfsTransportError

export const OperationErrorTags = {
  "Dataset.List": [
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Get": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Set": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "PropertyReadOnly",
    "PropertyNotApplicable",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Dataset.Inherit": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "PropertyNotInheritable",
    "PermissionDenied"
  ],
  "Dataset.CreateFilesystem": [
    "DatasetAlreadyExists",
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "EncryptionFailure",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Dataset.CreateVolume": [
    "DatasetAlreadyExists",
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "EncryptionFailure",
    "PermissionDenied",
    "OutOfSpace",
    "VolumeTooBig",
    "PoolUnavailable"
  ],
  "Dataset.Destroy": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Snapshot.Create": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "InvalidName",
    "PermissionDenied",
    "OutOfSpace"
  ],
  "Snapshot.Destroy": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied"
  ],
  "Snapshot.Clone": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "CrossTarget",
    "InvalidName",
    "InvalidProperty",
    "PermissionDenied",
    "OutOfSpace"
  ],
  "Snapshot.List": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Snapshot.Rollback": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Snapshot.Promote": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "DatasetBusy",
    "CrossTarget",
    "InvalidName",
    "PermissionDenied"
  ],
  "Snapshot.Rename": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "DatasetBusy",
    "CrossTarget",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Rename": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "DatasetBusy",
    "CrossTarget",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.List": [
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Get": [
    "DatasetNotFound",
    "InvalidName",
    "PoolUnavailable",
    "InvalidProperty",
    "PermissionDenied"
  ],
  "Pool.Set": [
    "DatasetNotFound",
    "InvalidName",
    "PoolUnavailable",
    "InvalidProperty",
    "PropertyReadOnly",
    "PermissionDenied"
  ],
  "Pool.Status": [
    "DatasetNotFound",
    "InvalidName",
    "PoolUnavailable",
    "PermissionDenied"
  ],
  "Pool.Create": [
    "DatasetAlreadyExists",
    "InvalidName",
    "InvalidProperty",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Pool.Destroy": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Trim": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "DatasetBusy"
  ],
  "Pool.Initialize": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable",
    "DatasetBusy"
  ],
  "Pool.Clear": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Reopen": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "DatasetBusy"
  ],
  "Pool.Sync": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Scrub": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "DatasetBusy",
    "Resilvering"
  ],
  "Pool.Resilver": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "DatasetBusy",
    "Resilvering"
  ],
  "Replication.Send": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidBackupStream",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Replication.SendSpace": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidBackupStream",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Replication.SendProgress": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidBackupStream",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Replication.Receive": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "InvalidName",
    "InvalidProperty",
    "InvalidBackupStream",
    "BadRestore",
    "CrossTarget",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Replication.AbortReceive": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "BadRestore",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Snapshot.Hold": [
    "DatasetNotFound",
    "HoldTagExists",
    "HoldTagTooLong",
    "InvalidName",
    "PermissionDenied"
  ],
  "Snapshot.Holds": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied"
  ],
  "Snapshot.Release": [
    "DatasetNotFound",
    "HoldTagNotFound",
    "HoldTagTooLong",
    "InvalidName",
    "PermissionDenied"
  ],
  "Mount.Mount": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "MountFailed",
    "EncryptionFailure"
  ],
  "Mount.Unmount": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "UnmountFailed",
    "EncryptionFailure"
  ],
  "Mount.Share": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "ShareFailed",
    "EncryptionFailure"
  ],
  "Mount.Unshare": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "ShareFailed"
  ],
  "Bookmark.Create": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "InvalidName",
    "PermissionDenied",
    "OutOfSpace"
  ],
  "Bookmark.Destroy": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied"
  ],
  "Bookmark.List": [
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Bookmark.Get": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Crypto.LoadKey": [
    "DatasetNotFound",
    "InvalidName",
    "EncryptionFailure",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Crypto.UnloadKey": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "EncryptionFailure",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Crypto.ChangeKey": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "EncryptionFailure",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Events": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.EventsClear": [
    "PermissionDenied"
  ],
  "Pool.EventsSeek": [
    "PermissionDenied"
  ],
  "Pool.Iostat": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Wait": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.History": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Prefetch": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Import": [
    "DatasetAlreadyExists",
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "InvalidProperty",
    "PropertyReadOnly",
    "PermissionDenied",
    "PoolUnavailable",
    "PoolActive"
  ],
  "Pool.Export": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Reguid": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Upgrade": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.LabelClear": [
    "DatasetBusy",
    "InvalidName",
    "BadPath",
    "PermissionDenied"
  ],
  "Pool.Checkpoint": [
    "DatasetNotFound",
    "DatasetBusy",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "CheckpointExists",
    "CheckpointDiscarding",
    "NoCheckpoint"
  ],
  "Dataset.Allow": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidWho",
    "InvalidPermission",
    "InvalidPermissionSet",
    "DelegationDisabled",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Unallow": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidWho",
    "InvalidPermission",
    "InvalidPermissionSet",
    "DelegationDisabled",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.ListAllow": [
    "DatasetNotFound",
    "InvalidName",
    "DelegationDisabled",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Userspace": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Groupspace": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Projectspace": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Project": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied"
  ],
  "Pool.Program": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Snapshot.Redact": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "InvalidName",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Dataset.Wait": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Diff": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied"
  ],
  "Zfs.Version": [
    "PermissionDenied"
  ],
  "Dataset.Zone": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied"
  ],
  "Dataset.Unzone": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied"
  ],
  "Pool.GetBootenv": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.SetBootenv": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable",
    "OutOfSpace"
  ],
  "Pool.DdtPrune": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Condense": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Add": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "InvalidDevice",
    "BadPath",
    "DeviceOverflow",
    "InvalidVdevConfig",
    "VdevNotSupported",
    "DeviceOpenFailed",
    "DeviceIsSpare",
    "DatasetBusy",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Pool.Remove": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "NoReplicas",
    "InvalidVdevConfig",
    "PoolNotSupported",
    "PoolInvalidArgument",
    "DatasetBusy",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Attach": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "NoSuchDevice",
    "BadAttachTarget",
    "InvalidDevice",
    "BadPath",
    "DeviceIsSpare",
    "DeviceIsCache",
    "Resilvering",
    "InvalidVdevConfig",
    "DeviceOpenFailed",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Pool.Detach": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "BadAttachTarget",
    "NoReplicas",
    "DeviceIsSpare",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Replace": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "NoSuchDevice",
    "BadAttachTarget",
    "InvalidDevice",
    "BadPath",
    "DeviceIsSpare",
    "DeviceIsCache",
    "Resilvering",
    "InvalidVdevConfig",
    "DeviceOpenFailed",
    "PermissionDenied",
    "OutOfSpace",
    "PoolUnavailable"
  ],
  "Pool.Split": [
    "DatasetNotFound",
    "DatasetAlreadyExists",
    "InvalidName",
    "InvalidProperty",
    "NoSuchDevice",
    "InvalidVdevConfig",
    "BadPath",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Online": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "PostSplitOnline",
    "DeviceOpenFailed",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Offline": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "NoReplicas",
    "DatasetBusy",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Upgrade": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Exists": [
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.GetVdev": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "NoSuchDevice",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.SetVdev": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidProperty",
    "PropertyReadOnly",
    "NoSuchDevice",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Replication.SnaprangeSpace": [
    "DatasetNotFound",
    "InvalidName",
    "InvalidBackupStream",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.Rewrite": [
    "DatasetNotFound",
    "InvalidName",
    "BadPath",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Freeze": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.Remap": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.SetVdevPath": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.SetVdevFru": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.InjectFault": [
    "DatasetNotFound",
    "InvalidName",
    "NoSuchDevice",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.ClearFault": [
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.ListFaults": [
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Pool.ErrorLog": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.ObjToPath": [
    "DatasetNotFound",
    "InvalidName",
    "BadPath",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.DsobjToName": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.NextObj": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Dataset.ObjToStats": [
    "DatasetNotFound",
    "InvalidName",
    "PermissionDenied",
    "PoolUnavailable"
  ],
  "Mount.SmbAcl": [
    "DatasetNotFound",
    "InvalidName",
    "BadPath",
    "PermissionDenied",
    "PoolUnavailable"
  ]
} as const

export const OperationShapes = {
  "Dataset.List": {
    "since": "2.2.2",
    "input": "ListDatasets",
    "output": "ReadonlyArray<DatasetListItem>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_iter"
    }
  },
  "Dataset.Get": {
    "since": "2.2.2",
    "input": "GetProperty",
    "output": "PropertyGetRow",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_prop_get"
    }
  },
  "Dataset.Set": {
    "since": "2.2.2",
    "input": "SetProperty",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_prop_set"
    }
  },
  "Dataset.Inherit": {
    "since": "2.2.2",
    "input": "InheritProperty",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_prop_inherit"
    }
  },
  "Dataset.CreateFilesystem": {
    "since": "2.2.2",
    "input": "CreateFilesystem",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_create",
      "nvlist": true
    }
  },
  "Dataset.CreateVolume": {
    "since": "2.2.2",
    "input": "CreateVolume",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_create",
      "nvlist": true
    }
  },
  "Dataset.Destroy": {
    "since": "2.2.2",
    "input": "Destroy",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_destroy",
      "nvlist": false
    }
  },
  "Snapshot.Create": {
    "since": "2.2.2",
    "input": "CreateSnapshot",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_snapshot",
      "nvlist": true
    }
  },
  "Snapshot.Destroy": {
    "since": "2.2.2",
    "input": "Destroy",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_destroy_snaps",
      "nvlist": true
    }
  },
  "Snapshot.Clone": {
    "since": "2.2.2",
    "input": "Clone",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_clone",
      "nvlist": true
    }
  },
  "Snapshot.List": {
    "since": "2.2.2",
    "input": "ListSnapshots",
    "output": "ReadonlyArray<SnapshotListItem>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_iter_snapshots"
    }
  },
  "Snapshot.Rollback": {
    "since": "2.2.2",
    "input": "Rollback",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_rollback_to",
      "nvlist": false
    }
  },
  "Snapshot.Promote": {
    "since": "2.2.2",
    "input": "Promote",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_promote",
      "nvlist": false
    }
  },
  "Snapshot.Rename": {
    "since": "2.2.2",
    "input": "Rename",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_rename",
      "nvlist": false
    }
  },
  "Dataset.Rename": {
    "since": "2.2.2",
    "input": "Rename",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_rename",
      "nvlist": false
    }
  },
  "Pool.List": {
    "since": "2.2.2",
    "input": "ListPools",
    "output": "ReadonlyArray<PoolListItem>",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_iter"
    }
  },
  "Pool.Get": {
    "since": "2.2.2",
    "input": "GetProperty",
    "output": "PropertyGetRow",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_get_prop"
    }
  },
  "Pool.Set": {
    "since": "2.2.2",
    "input": "SetProperty",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_set_prop"
    }
  },
  "Pool.Status": {
    "since": "2.2.2",
    "input": "StatusPool",
    "output": "PoolStatus",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_get_status"
    }
  },
  "Pool.Create": {
    "since": "2.2.2",
    "input": "CreatePool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_create"
    }
  },
  "Pool.Destroy": {
    "since": "2.2.2",
    "input": "DestroyPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_destroy"
    }
  },
  "Pool.Trim": {
    "since": "2.2.2",
    "input": "TrimPool",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_trim",
      "nvlist": true
    }
  },
  "Pool.Initialize": {
    "since": "2.2.2",
    "input": "InitializePool",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_initialize",
      "nvlist": true
    }
  },
  "Pool.Clear": {
    "since": "2.2.2",
    "input": "ClearPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_clear"
    }
  },
  "Pool.Reopen": {
    "since": "2.2.2",
    "input": "ReopenPool",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_reopen",
      "nvlist": false
    }
  },
  "Pool.Sync": {
    "since": "2.2.2",
    "input": "SyncPool",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_sync",
      "nvlist": true
    }
  },
  "Pool.Scrub": {
    "since": "2.2.2",
    "input": "Scrub",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_scrub",
      "nvlist": true
    }
  },
  "Pool.Resilver": {
    "since": "2.2.2",
    "input": "Resilver",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_scan"
    }
  },
  "Replication.Send": {
    "since": "2.2.2",
    "input": "Send",
    "output": "Stream<Uint8Array>",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_send",
      "nvlist": false
    }
  },
  "Replication.SendSpace": {
    "since": "2.2.2",
    "input": "Send",
    "output": "SendSpaceEstimate",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_send_space",
      "nvlist": false
    }
  },
  "Replication.SendProgress": {
    "since": "2.2.2",
    "input": "SendProgress",
    "output": "SendProgressReport",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_send_progress",
      "nvlist": false
    }
  },
  "Replication.Receive": {
    "since": "2.2.2",
    "input": "Receive",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_receive",
      "nvlist": true
    }
  },
  "Replication.AbortReceive": {
    "since": "2.2.2",
    "input": "AbortReceive",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_receive_abort"
    }
  },
  "Snapshot.Hold": {
    "since": "2.2.2",
    "input": "Hold",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_hold",
      "nvlist": true
    }
  },
  "Snapshot.Holds": {
    "since": "2.2.2",
    "input": "ListHolds",
    "output": "ReadonlyArray<SnapshotHold>",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_get_holds",
      "nvlist": true
    }
  },
  "Snapshot.Release": {
    "since": "2.2.2",
    "input": "Release",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_release",
      "nvlist": true
    }
  },
  "Mount.Mount": {
    "since": "2.2.2",
    "input": "MountFilesystem",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_mount"
    }
  },
  "Mount.Unmount": {
    "since": "2.2.2",
    "input": "UnmountFilesystem",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_unmount"
    }
  },
  "Mount.Share": {
    "since": "2.2.2",
    "input": "ShareFilesystem",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_share"
    }
  },
  "Mount.Unshare": {
    "since": "2.2.2",
    "input": "UnshareFilesystem",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_unshare"
    }
  },
  "Bookmark.Create": {
    "since": "2.2.2",
    "input": "CreateBookmark",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_bookmark",
      "nvlist": true
    }
  },
  "Bookmark.Destroy": {
    "since": "2.2.2",
    "input": "DestroyBookmark",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_destroy_bookmarks",
      "nvlist": true
    }
  },
  "Bookmark.List": {
    "since": "2.2.2",
    "input": "ListBookmarks",
    "output": "ReadonlyArray<BookmarkListItem>",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_get_bookmarks",
      "nvlist": true
    }
  },
  "Bookmark.Get": {
    "since": "2.2.2",
    "input": "GetBookmarkProps",
    "output": "PropertyGetRow",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_get_bookmark_props",
      "nvlist": true
    }
  },
  "Crypto.LoadKey": {
    "since": "2.2.2",
    "input": "LoadKey",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_load_key",
      "nvlist": false
    }
  },
  "Crypto.UnloadKey": {
    "since": "2.2.2",
    "input": "UnloadKey",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_unload_key",
      "nvlist": false
    }
  },
  "Crypto.ChangeKey": {
    "since": "2.2.2",
    "input": "ChangeKey",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_change_key",
      "nvlist": true
    }
  },
  "Pool.Events": {
    "since": "2.2.2",
    "input": "Events",
    "output": "Stream<PoolEvent>",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_EVENTS_NEXT"
    }
  },
  "Pool.EventsClear": {
    "since": "2.2.2",
    "input": "EventsClear",
    "output": "EventsCleared",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_EVENTS_CLEAR"
    }
  },
  "Pool.EventsSeek": {
    "since": "2.2.2",
    "input": "EventsSeek",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_EVENTS_SEEK"
    }
  },
  "Pool.Iostat": {
    "since": "2.2.2",
    "input": "Iostat",
    "output": "Stream<IostatSample>",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_get_stats"
    }
  },
  "Pool.Wait": {
    "since": "2.2.2",
    "input": "WaitPool",
    "output": "WaitResult",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_wait",
      "nvlist": false
    }
  },
  "Pool.History": {
    "since": "2.2.2",
    "input": "History",
    "output": "Stream<HistoryRecord>",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_get_history"
    }
  },
  "Pool.Prefetch": {
    "since": "2.2.2",
    "input": "Prefetch",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_pool_prefetch",
      "nvlist": false
    }
  },
  "Pool.Import": {
    "since": "2.2.2",
    "input": "ImportPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_import"
    }
  },
  "Pool.Export": {
    "since": "2.2.2",
    "input": "ExportPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_export"
    }
  },
  "Pool.Reguid": {
    "since": "2.2.2",
    "input": "ReguidPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_reguid"
    }
  },
  "Pool.Upgrade": {
    "since": "2.2.2",
    "input": "UpgradePool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_upgrade"
    }
  },
  "Pool.LabelClear": {
    "since": "2.2.2",
    "input": "LabelClear",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_clear_label"
    }
  },
  "Pool.Checkpoint": {
    "since": "2.2.2",
    "input": "CheckpointPool",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_pool_checkpoint",
      "nvlist": false
    }
  },
  "Dataset.Allow": {
    "since": "2.2.2",
    "input": "Allow",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_perm"
    }
  },
  "Dataset.Unallow": {
    "since": "2.2.2",
    "input": "Unallow",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_perm"
    }
  },
  "Dataset.ListAllow": {
    "since": "2.2.2",
    "input": "ListAllow",
    "output": "ReadonlyArray<AllowListing>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_perm"
    }
  },
  "Dataset.Userspace": {
    "since": "2.2.2",
    "input": "Userspace",
    "output": "ReadonlyArray<UserspaceRow>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_userspace"
    }
  },
  "Dataset.Groupspace": {
    "since": "2.2.2",
    "input": "Userspace",
    "output": "ReadonlyArray<UserspaceRow>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_userspace"
    }
  },
  "Dataset.Projectspace": {
    "since": "2.2.2",
    "input": "Userspace",
    "output": "ReadonlyArray<UserspaceRow>",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_userspace"
    }
  },
  "Dataset.Project": {
    "since": "2.2.2",
    "input": "Project",
    "output": "ReadonlyArray<ProjectRow>",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_PROJECT"
    }
  },
  "Pool.Program": {
    "since": "2.2.2",
    "input": "ChannelProgram",
    "output": "ChannelProgramResult",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_channel_program",
      "nvlist": true
    }
  },
  "Snapshot.Redact": {
    "since": "2.2.2",
    "input": "Redact",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_redact",
      "nvlist": true
    }
  },
  "Dataset.Wait": {
    "since": "2.2.2",
    "input": "WaitFilesystem",
    "output": "WaitResult",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_wait_fs",
      "nvlist": false
    }
  },
  "Dataset.Diff": {
    "since": "2.2.2",
    "input": "Diff",
    "output": "ReadonlyArray<DiffEntry>",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_DIFF"
    }
  },
  "Zfs.Version": {
    "since": "2.2.2",
    "input": "void",
    "output": "ZfsVersionInfo",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_version"
    }
  },
  "Dataset.Zone": {
    "since": "2.2.2",
    "input": "Zone",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_USERNS_ATTACH"
    }
  },
  "Dataset.Unzone": {
    "since": "2.2.2",
    "input": "Zone",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_USERNS_DETACH"
    }
  },
  "Pool.GetBootenv": {
    "since": "2.2.2",
    "input": "GetBootenv",
    "output": "Bootenv",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_get_bootenv",
      "nvlist": true
    }
  },
  "Pool.SetBootenv": {
    "since": "2.2.2",
    "input": "SetBootenv",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_set_bootenv",
      "nvlist": true
    }
  },
  "Pool.DdtPrune": {
    "since": "2.2.2",
    "input": "DdtPrune",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_ddt_prune",
      "nvlist": false
    }
  },
  "Pool.Condense": {
    "since": "2.2.2",
    "input": "Condense",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_condense",
      "nvlist": false
    }
  },
  "Pool.Add": {
    "since": "2.2.2",
    "input": "AddVdevs",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_add"
    }
  },
  "Pool.Remove": {
    "since": "2.2.2",
    "input": "RemoveVdevs",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_remove"
    }
  },
  "Pool.Attach": {
    "since": "2.2.2",
    "input": "AttachVdev",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_attach"
    }
  },
  "Pool.Detach": {
    "since": "2.2.2",
    "input": "DetachVdev",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_detach"
    }
  },
  "Pool.Replace": {
    "since": "2.2.2",
    "input": "ReplaceVdev",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_attach"
    }
  },
  "Pool.Split": {
    "since": "2.2.2",
    "input": "SplitPool",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_split"
    }
  },
  "Pool.Online": {
    "since": "2.2.2",
    "input": "OnlineVdevs",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_online"
    }
  },
  "Pool.Offline": {
    "since": "2.2.2",
    "input": "OfflineVdevs",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_vdev_offline"
    }
  },
  "Dataset.Upgrade": {
    "since": "2.2.2",
    "input": "UpgradeDataset",
    "output": "void",
    "native": {
      "kind": "libzfs",
      "symbol": "zfs_upgrade"
    }
  },
  "Dataset.Exists": {
    "since": "2.2.2",
    "input": "Exists",
    "output": "boolean",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_exists",
      "nvlist": false
    }
  },
  "Pool.GetVdev": {
    "since": "2.2.2",
    "input": "GetVdevProperty",
    "output": "PropertyGetRow",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_get_vdev_prop",
      "nvlist": true
    }
  },
  "Pool.SetVdev": {
    "since": "2.2.2",
    "input": "SetVdevProperty",
    "output": "void",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_set_vdev_prop",
      "nvlist": true
    }
  },
  "Replication.SnaprangeSpace": {
    "since": "2.2.2",
    "input": "SnaprangeSpace",
    "output": "SendSpaceEstimate",
    "native": {
      "kind": "lzc",
      "symbol": "lzc_snaprange_space",
      "nvlist": false
    }
  },
  "Dataset.Rewrite": {
    "since": "2.3.0",
    "input": "Rewrite",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_REWRITE",
      "nvlist": false
    }
  },
  "Pool.Freeze": {
    "since": "2.2.2",
    "input": "FreezePool",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_POOL_FREEZE",
      "nvlist": false
    }
  },
  "Pool.Remap": {
    "since": "2.2.2",
    "input": "Remap",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_REMAP",
      "nvlist": false
    }
  },
  "Pool.SetVdevPath": {
    "since": "2.2.2",
    "input": "SetVdevPath",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_VDEV_SETPATH",
      "nvlist": false
    }
  },
  "Pool.SetVdevFru": {
    "since": "2.2.2",
    "input": "SetVdevFru",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_VDEV_SETFRU",
      "nvlist": false
    }
  },
  "Pool.InjectFault": {
    "since": "2.2.2",
    "input": "InjectFault",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_INJECT_FAULT",
      "nvlist": false
    }
  },
  "Pool.ClearFault": {
    "since": "2.2.2",
    "input": "ClearFault",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_CLEAR_FAULT",
      "nvlist": false
    }
  },
  "Pool.ListFaults": {
    "since": "2.2.2",
    "input": "void",
    "output": "ReadonlyArray<InjectRecord>",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_INJECT_LIST_NEXT",
      "nvlist": false
    }
  },
  "Pool.ErrorLog": {
    "since": "2.2.2",
    "input": "ErrorLog",
    "output": "ReadonlyArray<ErrorLogRow>",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_get_errlog",
      "nvlist": true
    }
  },
  "Dataset.ObjToPath": {
    "since": "2.2.2",
    "input": "ObjToPath",
    "output": "ObjPath",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_obj_to_path"
    }
  },
  "Dataset.DsobjToName": {
    "since": "2.2.2",
    "input": "ObjToPath",
    "output": "ObjPath",
    "native": {
      "kind": "libzfs",
      "symbol": "zpool_obj_to_path_ds"
    }
  },
  "Dataset.NextObj": {
    "since": "2.2.2",
    "input": "NextObj",
    "output": "NextObjResult",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_NEXT_OBJ",
      "nvlist": false
    }
  },
  "Dataset.ObjToStats": {
    "since": "2.2.2",
    "input": "ObjToStats",
    "output": "ObjStats",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_OBJ_TO_STATS",
      "nvlist": true
    }
  },
  "Mount.SmbAcl": {
    "since": "2.2.2",
    "input": "SmbAcl",
    "output": "void",
    "native": {
      "kind": "ioctl",
      "symbol": "ZFS_IOC_SMB_ACL",
      "nvlist": false
    }
  }
} as const

export const OperationNative = {
  "Dataset.List": {
    "kind": "libzfs",
    "symbol": "zfs_iter"
  },
  "Dataset.Get": {
    "kind": "libzfs",
    "symbol": "zfs_prop_get"
  },
  "Dataset.Set": {
    "kind": "libzfs",
    "symbol": "zfs_prop_set"
  },
  "Dataset.Inherit": {
    "kind": "libzfs",
    "symbol": "zfs_prop_inherit"
  },
  "Dataset.CreateFilesystem": {
    "kind": "lzc",
    "symbol": "lzc_create",
    "nvlist": true
  },
  "Dataset.CreateVolume": {
    "kind": "lzc",
    "symbol": "lzc_create",
    "nvlist": true
  },
  "Dataset.Destroy": {
    "kind": "lzc",
    "symbol": "lzc_destroy",
    "nvlist": false
  },
  "Snapshot.Create": {
    "kind": "lzc",
    "symbol": "lzc_snapshot",
    "nvlist": true
  },
  "Snapshot.Destroy": {
    "kind": "lzc",
    "symbol": "lzc_destroy_snaps",
    "nvlist": true
  },
  "Snapshot.Clone": {
    "kind": "lzc",
    "symbol": "lzc_clone",
    "nvlist": true
  },
  "Snapshot.List": {
    "kind": "libzfs",
    "symbol": "zfs_iter_snapshots"
  },
  "Snapshot.Rollback": {
    "kind": "lzc",
    "symbol": "lzc_rollback_to",
    "nvlist": false
  },
  "Snapshot.Promote": {
    "kind": "lzc",
    "symbol": "lzc_promote",
    "nvlist": false
  },
  "Snapshot.Rename": {
    "kind": "lzc",
    "symbol": "lzc_rename",
    "nvlist": false
  },
  "Dataset.Rename": {
    "kind": "lzc",
    "symbol": "lzc_rename",
    "nvlist": false
  },
  "Pool.List": {
    "kind": "libzfs",
    "symbol": "zpool_iter"
  },
  "Pool.Get": {
    "kind": "libzfs",
    "symbol": "zpool_get_prop"
  },
  "Pool.Set": {
    "kind": "libzfs",
    "symbol": "zpool_set_prop"
  },
  "Pool.Status": {
    "kind": "libzfs",
    "symbol": "zpool_get_status"
  },
  "Pool.Create": {
    "kind": "libzfs",
    "symbol": "zpool_create"
  },
  "Pool.Destroy": {
    "kind": "libzfs",
    "symbol": "zpool_destroy"
  },
  "Pool.Trim": {
    "kind": "lzc",
    "symbol": "lzc_trim",
    "nvlist": true
  },
  "Pool.Initialize": {
    "kind": "lzc",
    "symbol": "lzc_initialize",
    "nvlist": true
  },
  "Pool.Clear": {
    "kind": "libzfs",
    "symbol": "zpool_clear"
  },
  "Pool.Reopen": {
    "kind": "lzc",
    "symbol": "lzc_reopen",
    "nvlist": false
  },
  "Pool.Sync": {
    "kind": "lzc",
    "symbol": "lzc_sync",
    "nvlist": true
  },
  "Pool.Scrub": {
    "kind": "lzc",
    "symbol": "lzc_scrub",
    "nvlist": true
  },
  "Pool.Resilver": {
    "kind": "libzfs",
    "symbol": "zpool_scan"
  },
  "Replication.Send": {
    "kind": "lzc",
    "symbol": "lzc_send",
    "nvlist": false
  },
  "Replication.SendSpace": {
    "kind": "lzc",
    "symbol": "lzc_send_space",
    "nvlist": false
  },
  "Replication.SendProgress": {
    "kind": "lzc",
    "symbol": "lzc_send_progress",
    "nvlist": false
  },
  "Replication.Receive": {
    "kind": "lzc",
    "symbol": "lzc_receive",
    "nvlist": true
  },
  "Replication.AbortReceive": {
    "kind": "libzfs",
    "symbol": "zfs_receive_abort"
  },
  "Snapshot.Hold": {
    "kind": "lzc",
    "symbol": "lzc_hold",
    "nvlist": true
  },
  "Snapshot.Holds": {
    "kind": "lzc",
    "symbol": "lzc_get_holds",
    "nvlist": true
  },
  "Snapshot.Release": {
    "kind": "lzc",
    "symbol": "lzc_release",
    "nvlist": true
  },
  "Mount.Mount": {
    "kind": "libzfs",
    "symbol": "zfs_mount"
  },
  "Mount.Unmount": {
    "kind": "libzfs",
    "symbol": "zfs_unmount"
  },
  "Mount.Share": {
    "kind": "libzfs",
    "symbol": "zfs_share"
  },
  "Mount.Unshare": {
    "kind": "libzfs",
    "symbol": "zfs_unshare"
  },
  "Bookmark.Create": {
    "kind": "lzc",
    "symbol": "lzc_bookmark",
    "nvlist": true
  },
  "Bookmark.Destroy": {
    "kind": "lzc",
    "symbol": "lzc_destroy_bookmarks",
    "nvlist": true
  },
  "Bookmark.List": {
    "kind": "lzc",
    "symbol": "lzc_get_bookmarks",
    "nvlist": true
  },
  "Bookmark.Get": {
    "kind": "lzc",
    "symbol": "lzc_get_bookmark_props",
    "nvlist": true
  },
  "Crypto.LoadKey": {
    "kind": "lzc",
    "symbol": "lzc_load_key",
    "nvlist": false
  },
  "Crypto.UnloadKey": {
    "kind": "lzc",
    "symbol": "lzc_unload_key",
    "nvlist": false
  },
  "Crypto.ChangeKey": {
    "kind": "lzc",
    "symbol": "lzc_change_key",
    "nvlist": true
  },
  "Pool.Events": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_EVENTS_NEXT"
  },
  "Pool.EventsClear": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_EVENTS_CLEAR"
  },
  "Pool.EventsSeek": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_EVENTS_SEEK"
  },
  "Pool.Iostat": {
    "kind": "libzfs",
    "symbol": "zpool_get_stats"
  },
  "Pool.Wait": {
    "kind": "lzc",
    "symbol": "lzc_wait",
    "nvlist": false
  },
  "Pool.History": {
    "kind": "libzfs",
    "symbol": "zpool_get_history"
  },
  "Pool.Prefetch": {
    "kind": "lzc",
    "symbol": "lzc_pool_prefetch",
    "nvlist": false
  },
  "Pool.Import": {
    "kind": "libzfs",
    "symbol": "zpool_import"
  },
  "Pool.Export": {
    "kind": "libzfs",
    "symbol": "zpool_export"
  },
  "Pool.Reguid": {
    "kind": "libzfs",
    "symbol": "zpool_reguid"
  },
  "Pool.Upgrade": {
    "kind": "libzfs",
    "symbol": "zpool_upgrade"
  },
  "Pool.LabelClear": {
    "kind": "libzfs",
    "symbol": "zpool_clear_label"
  },
  "Pool.Checkpoint": {
    "kind": "lzc",
    "symbol": "lzc_pool_checkpoint",
    "nvlist": false
  },
  "Dataset.Allow": {
    "kind": "libzfs",
    "symbol": "zfs_perm"
  },
  "Dataset.Unallow": {
    "kind": "libzfs",
    "symbol": "zfs_perm"
  },
  "Dataset.ListAllow": {
    "kind": "libzfs",
    "symbol": "zfs_perm"
  },
  "Dataset.Userspace": {
    "kind": "libzfs",
    "symbol": "zfs_userspace"
  },
  "Dataset.Groupspace": {
    "kind": "libzfs",
    "symbol": "zfs_userspace"
  },
  "Dataset.Projectspace": {
    "kind": "libzfs",
    "symbol": "zfs_userspace"
  },
  "Dataset.Project": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_PROJECT"
  },
  "Pool.Program": {
    "kind": "lzc",
    "symbol": "lzc_channel_program",
    "nvlist": true
  },
  "Snapshot.Redact": {
    "kind": "lzc",
    "symbol": "lzc_redact",
    "nvlist": true
  },
  "Dataset.Wait": {
    "kind": "lzc",
    "symbol": "lzc_wait_fs",
    "nvlist": false
  },
  "Dataset.Diff": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_DIFF"
  },
  "Zfs.Version": {
    "kind": "libzfs",
    "symbol": "zfs_version"
  },
  "Dataset.Zone": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_USERNS_ATTACH"
  },
  "Dataset.Unzone": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_USERNS_DETACH"
  },
  "Pool.GetBootenv": {
    "kind": "lzc",
    "symbol": "lzc_get_bootenv",
    "nvlist": true
  },
  "Pool.SetBootenv": {
    "kind": "lzc",
    "symbol": "lzc_set_bootenv",
    "nvlist": true
  },
  "Pool.DdtPrune": {
    "kind": "lzc",
    "symbol": "lzc_ddt_prune",
    "nvlist": false
  },
  "Pool.Condense": {
    "kind": "lzc",
    "symbol": "lzc_condense",
    "nvlist": false
  },
  "Pool.Add": {
    "kind": "libzfs",
    "symbol": "zpool_add"
  },
  "Pool.Remove": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_remove"
  },
  "Pool.Attach": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_attach"
  },
  "Pool.Detach": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_detach"
  },
  "Pool.Replace": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_attach"
  },
  "Pool.Split": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_split"
  },
  "Pool.Online": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_online"
  },
  "Pool.Offline": {
    "kind": "libzfs",
    "symbol": "zpool_vdev_offline"
  },
  "Dataset.Upgrade": {
    "kind": "libzfs",
    "symbol": "zfs_upgrade"
  },
  "Dataset.Exists": {
    "kind": "lzc",
    "symbol": "lzc_exists",
    "nvlist": false
  },
  "Pool.GetVdev": {
    "kind": "lzc",
    "symbol": "lzc_get_vdev_prop",
    "nvlist": true
  },
  "Pool.SetVdev": {
    "kind": "lzc",
    "symbol": "lzc_set_vdev_prop",
    "nvlist": true
  },
  "Replication.SnaprangeSpace": {
    "kind": "lzc",
    "symbol": "lzc_snaprange_space",
    "nvlist": false
  },
  "Dataset.Rewrite": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_REWRITE",
    "nvlist": false
  },
  "Pool.Freeze": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_POOL_FREEZE",
    "nvlist": false
  },
  "Pool.Remap": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_REMAP",
    "nvlist": false
  },
  "Pool.SetVdevPath": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_VDEV_SETPATH",
    "nvlist": false
  },
  "Pool.SetVdevFru": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_VDEV_SETFRU",
    "nvlist": false
  },
  "Pool.InjectFault": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_INJECT_FAULT",
    "nvlist": false
  },
  "Pool.ClearFault": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_CLEAR_FAULT",
    "nvlist": false
  },
  "Pool.ListFaults": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_INJECT_LIST_NEXT",
    "nvlist": false
  },
  "Pool.ErrorLog": {
    "kind": "libzfs",
    "symbol": "zpool_get_errlog",
    "nvlist": true
  },
  "Dataset.ObjToPath": {
    "kind": "libzfs",
    "symbol": "zpool_obj_to_path"
  },
  "Dataset.DsobjToName": {
    "kind": "libzfs",
    "symbol": "zpool_obj_to_path_ds"
  },
  "Dataset.NextObj": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_NEXT_OBJ",
    "nvlist": false
  },
  "Dataset.ObjToStats": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_OBJ_TO_STATS",
    "nvlist": true
  },
  "Mount.SmbAcl": {
    "kind": "ioctl",
    "symbol": "ZFS_IOC_SMB_ACL",
    "nvlist": false
  }
} as const

export type OperationInput = {
  "Dataset.List": Args.ListDatasets
  "Dataset.Get": Args.GetProperty
  "Dataset.Set": Args.SetProperty
  "Dataset.Inherit": Args.InheritProperty
  "Dataset.CreateFilesystem": Args.CreateFilesystem
  "Dataset.CreateVolume": Args.CreateVolume
  "Dataset.Destroy": Args.Destroy
  "Snapshot.Create": Args.CreateSnapshot
  "Snapshot.Destroy": Args.Destroy
  "Snapshot.Clone": Args.Clone
  "Snapshot.List": Args.ListSnapshots
  "Snapshot.Rollback": Args.Rollback
  "Snapshot.Promote": Args.Promote
  "Snapshot.Rename": Args.Rename
  "Dataset.Rename": Args.Rename
  "Pool.List": Args.ListPools
  "Pool.Get": Args.GetProperty
  "Pool.Set": Args.SetProperty
  "Pool.Status": Args.StatusPool
  "Pool.Create": Args.CreatePool
  "Pool.Destroy": Args.DestroyPool
  "Pool.Trim": Args.TrimPool
  "Pool.Initialize": Args.InitializePool
  "Pool.Clear": Args.ClearPool
  "Pool.Reopen": Args.ReopenPool
  "Pool.Sync": Args.SyncPool
  "Pool.Scrub": Args.Scrub
  "Pool.Resilver": Args.Resilver
  "Replication.Send": Args.Send
  "Replication.SendSpace": Args.Send
  "Replication.SendProgress": Args.SendProgress
  "Replication.Receive": Args.Receive
  "Replication.AbortReceive": Args.AbortReceive
  "Snapshot.Hold": Args.Hold
  "Snapshot.Holds": Args.ListHolds
  "Snapshot.Release": Args.Release
  "Mount.Mount": Args.MountFilesystem
  "Mount.Unmount": Args.UnmountFilesystem
  "Mount.Share": Args.ShareFilesystem
  "Mount.Unshare": Args.UnshareFilesystem
  "Bookmark.Create": Args.CreateBookmark
  "Bookmark.Destroy": Args.DestroyBookmark
  "Bookmark.List": Args.ListBookmarks
  "Bookmark.Get": Args.GetBookmarkProps
  "Crypto.LoadKey": Args.LoadKey
  "Crypto.UnloadKey": Args.UnloadKey
  "Crypto.ChangeKey": Args.ChangeKey
  "Pool.Events": Args.Events
  "Pool.EventsClear": Args.EventsClear
  "Pool.EventsSeek": Args.EventsSeek
  "Pool.Iostat": Args.Iostat
  "Pool.Wait": Args.WaitPool
  "Pool.History": Args.History
  "Pool.Prefetch": Args.Prefetch
  "Pool.Import": Args.ImportPool
  "Pool.Export": Args.ExportPool
  "Pool.Reguid": Args.ReguidPool
  "Pool.Upgrade": Args.UpgradePool
  "Pool.LabelClear": Args.LabelClear
  "Pool.Checkpoint": Args.CheckpointPool
  "Dataset.Allow": Args.Allow
  "Dataset.Unallow": Args.Unallow
  "Dataset.ListAllow": Args.ListAllow
  "Dataset.Userspace": Args.Userspace
  "Dataset.Groupspace": Args.Userspace
  "Dataset.Projectspace": Args.Userspace
  "Dataset.Project": Args.Project
  "Pool.Program": Args.ChannelProgram
  "Snapshot.Redact": Args.Redact
  "Dataset.Wait": Args.WaitFilesystem
  "Dataset.Diff": Args.Diff
  "Zfs.Version": void
  "Dataset.Zone": Args.Zone
  "Dataset.Unzone": Args.Zone
  "Pool.GetBootenv": Args.GetBootenv
  "Pool.SetBootenv": Args.SetBootenv
  "Pool.DdtPrune": Args.DdtPrune
  "Pool.Condense": Args.Condense
  "Pool.Add": Args.AddVdevs
  "Pool.Remove": Args.RemoveVdevs
  "Pool.Attach": Args.AttachVdev
  "Pool.Detach": Args.DetachVdev
  "Pool.Replace": Args.ReplaceVdev
  "Pool.Split": Args.SplitPool
  "Pool.Online": Args.OnlineVdevs
  "Pool.Offline": Args.OfflineVdevs
  "Dataset.Upgrade": Args.UpgradeDataset
  "Dataset.Exists": Args.Exists
  "Pool.GetVdev": Args.GetVdevProperty
  "Pool.SetVdev": Args.SetVdevProperty
  "Replication.SnaprangeSpace": Args.SnaprangeSpace
  "Dataset.Rewrite": Args.Rewrite
  "Pool.Freeze": Args.FreezePool
  "Pool.Remap": Args.Remap
  "Pool.SetVdevPath": Args.SetVdevPath
  "Pool.SetVdevFru": Args.SetVdevFru
  "Pool.InjectFault": Args.InjectFault
  "Pool.ClearFault": Args.ClearFault
  "Pool.ListFaults": void
  "Pool.ErrorLog": Args.ErrorLog
  "Dataset.ObjToPath": Args.ObjToPath
  "Dataset.DsobjToName": Args.ObjToPath
  "Dataset.NextObj": Args.NextObj
  "Dataset.ObjToStats": Args.ObjToStats
  "Mount.SmbAcl": Args.SmbAcl
}

export type OperationOutput = {
  "Dataset.List": ReadonlyArray<Args.DatasetListItem>
  "Dataset.Get": PropertyGetRow
  "Dataset.Set": void
  "Dataset.Inherit": void
  "Dataset.CreateFilesystem": void
  "Dataset.CreateVolume": void
  "Dataset.Destroy": void
  "Snapshot.Create": void
  "Snapshot.Destroy": void
  "Snapshot.Clone": void
  "Snapshot.List": ReadonlyArray<Args.SnapshotListItem>
  "Snapshot.Rollback": void
  "Snapshot.Promote": void
  "Snapshot.Rename": void
  "Dataset.Rename": void
  "Pool.List": ReadonlyArray<Args.PoolListItem>
  "Pool.Get": PropertyGetRow
  "Pool.Set": void
  "Pool.Status": PoolStatus
  "Pool.Create": void
  "Pool.Destroy": void
  "Pool.Trim": void
  "Pool.Initialize": void
  "Pool.Clear": void
  "Pool.Reopen": void
  "Pool.Sync": void
  "Pool.Scrub": void
  "Pool.Resilver": void
  "Replication.Send": Stream.Stream<Uint8Array>
  "Replication.SendSpace": Args.SendSpaceEstimate
  "Replication.SendProgress": Args.SendProgressReport
  "Replication.Receive": void
  "Replication.AbortReceive": void
  "Snapshot.Hold": void
  "Snapshot.Holds": ReadonlyArray<Args.SnapshotHold>
  "Snapshot.Release": void
  "Mount.Mount": void
  "Mount.Unmount": void
  "Mount.Share": void
  "Mount.Unshare": void
  "Bookmark.Create": void
  "Bookmark.Destroy": void
  "Bookmark.List": ReadonlyArray<Args.BookmarkListItem>
  "Bookmark.Get": PropertyGetRow
  "Crypto.LoadKey": void
  "Crypto.UnloadKey": void
  "Crypto.ChangeKey": void
  "Pool.Events": Stream.Stream<Args.PoolEvent>
  "Pool.EventsClear": Args.EventsCleared
  "Pool.EventsSeek": void
  "Pool.Iostat": Stream.Stream<Args.IostatSample>
  "Pool.Wait": Args.WaitResult
  "Pool.History": Stream.Stream<Args.HistoryRecord>
  "Pool.Prefetch": void
  "Pool.Import": void
  "Pool.Export": void
  "Pool.Reguid": void
  "Pool.Upgrade": void
  "Pool.LabelClear": void
  "Pool.Checkpoint": void
  "Dataset.Allow": void
  "Dataset.Unallow": void
  "Dataset.ListAllow": ReadonlyArray<Args.AllowListing>
  "Dataset.Userspace": ReadonlyArray<Args.UserspaceRow>
  "Dataset.Groupspace": ReadonlyArray<Args.UserspaceRow>
  "Dataset.Projectspace": ReadonlyArray<Args.UserspaceRow>
  "Dataset.Project": ReadonlyArray<Args.ProjectRow>
  "Pool.Program": Args.ChannelProgramResult
  "Snapshot.Redact": void
  "Dataset.Wait": Args.WaitResult
  "Dataset.Diff": ReadonlyArray<Args.DiffEntry>
  "Zfs.Version": ZfsVersionInfo
  "Dataset.Zone": void
  "Dataset.Unzone": void
  "Pool.GetBootenv": Args.Bootenv
  "Pool.SetBootenv": void
  "Pool.DdtPrune": void
  "Pool.Condense": void
  "Pool.Add": void
  "Pool.Remove": void
  "Pool.Attach": void
  "Pool.Detach": void
  "Pool.Replace": void
  "Pool.Split": void
  "Pool.Online": void
  "Pool.Offline": void
  "Dataset.Upgrade": void
  "Dataset.Exists": boolean
  "Pool.GetVdev": PropertyGetRow
  "Pool.SetVdev": void
  "Replication.SnaprangeSpace": Args.SendSpaceEstimate
  "Dataset.Rewrite": void
  "Pool.Freeze": void
  "Pool.Remap": void
  "Pool.SetVdevPath": void
  "Pool.SetVdevFru": void
  "Pool.InjectFault": void
  "Pool.ClearFault": void
  "Pool.ListFaults": ReadonlyArray<Args.InjectRecord>
  "Pool.ErrorLog": ReadonlyArray<Args.ErrorLogRow>
  "Dataset.ObjToPath": Args.ObjPath
  "Dataset.DsobjToName": Args.ObjPath
  "Dataset.NextObj": Args.NextObjResult
  "Dataset.ObjToStats": Args.ObjStats
  "Mount.SmbAcl": void
}
