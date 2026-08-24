// AUTO-GENERATED. DO NOT EDIT.
import type { BadAttachTarget, BadPath, BadRestore, CheckpointDiscarding, CheckpointExists, CrossTarget, DatasetAlreadyExists, DatasetBusy, DatasetNotFound, DelegationDisabled, DeviceIsCache, DeviceIsSpare, DeviceOpenFailed, DeviceOverflow, EncryptionFailure, HoldTagExists, HoldTagNotFound, HoldTagTooLong, InvalidBackupStream, InvalidDevice, InvalidName, InvalidPermission, InvalidPermissionSet, InvalidProperty, InvalidVdevConfig, InvalidWho, MountFailed, NoCheckpoint, NoReplicas, NoSuchDevice, OutOfSpace, PermissionDenied, PoolActive, PoolInvalidArgument, PoolNotSupported, PoolUnavailable, PostSplitOnline, PropertyNotApplicable, PropertyNotInheritable, PropertyReadOnly, Resilvering, ShareFailed, UnmountFailed, VdevNotSupported, VolumeTooBig } from "./errors.generated.js"
import type { UnknownZfsError } from "../Error.js"
import type { ZfsTransportError } from "../Process.js"

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
  ]
} as const
