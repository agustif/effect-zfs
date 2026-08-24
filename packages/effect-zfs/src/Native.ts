import { Effect, Layer, Schema, Stream } from "effect"
import { UnknownZfsError, type ZfsError } from "./Error.js"
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
  VdevNotSupported,
  errorValueToCode
} from "./generated/errors.generated.js"
import { OperationErrorTags } from "./generated/operations.generated.js"
import { ZfsTransportError } from "./Process.js"
import {
  ClearPool,
  Clone,
  CreateFilesystem,
  CreatePool,
  CreateSnapshot,
  CreateVolume,
  DatasetListItem,
  SnapshotListItem,
  Destroy,
  DestroyPool,
  GetProperty,
  Hold,
  InheritProperty,
  InitializePool,
  ListDatasets,
  ListHolds,
  ListSnapshots,
  MountFilesystem,
  PoolListItem,
  Promote,
  Rename,
  Rollback,
  AbortReceive,
  Allow,
  AllowListing,
  Unallow,
  ListAllow,
  Userspace,
  UserspaceRow,
  Project,
  ProjectRow,
  CheckpointPool,
  ExportPool,
  ImportPool,
  LabelClear,
  BookmarkListItem,
  CreateBookmark,
  DestroyBookmark,
  GetBookmarkProps,
  ListBookmarks,
  Receive,
  ReguidPool,
  Release,
  ReopenPool,
  Resilver,
  Scrub,
  Send,
  SendOptions,
  LzcSendFlag,
  SendProgress,
  SendProgressReport,
  SendSpaceEstimate,
  ShareFilesystem,
  SetProperty,
  SnapshotHold,
  StatusPool,
  SyncPool,
  TrimPool,
  AddVdevs,
  AttachVdev,
  DetachVdev,
  OfflineVdevs,
  OnlineVdevs,
  RemoveVdevs,
  ReplaceVdev,
  SplitPool,
  Exists,
  GetVdevProperty,
  ListPools,
  SetVdevProperty,
  SnaprangeSpace,
  UpgradeDataset,
  UnmountFilesystem,
  UnshareFilesystem,
  UpgradePool,
  LoadKey,
  UnloadKey,
  ChangeKey,
  wrappingKeyToNativeBytes,
  keyFormatFromProperties,
  dcpCmdOf,
  Events,
  EventsClear,
  EventsCleared,
  EventsSeek,
  History,
  HistoryRecord,
  Iostat,
  IostatSample,
  PoolEvent,
  Prefetch,
  WaitPool,
  WaitResult,
  Bootenv,
  ChannelProgram,
  ChannelProgramResult,
  Condense,
  DdtPrune,
  Diff,
  DiffEntry,
  GetBootenv,
  Redact,
  SetBootenv,
  WaitFilesystem,
  Zone
} from "./Args.js"
import { ZfsProtocol, type Failure } from "./Protocol.js"
import type { ZfsVersionInfo } from "./Version.js"
import type { PoolStatus, PropertyGetRow } from "./Schemas.js"
import { NativeFailure, type NativeFailureOrTransport } from "./internal/native-failure.js"
import { loadLinuxLzc } from "./internal/native-linux.js"

export { NativeFailure, type NativeFailureOrTransport }

/**
 * FFI surface for a future libzfs_core + libzfs addon (`lzc_create`,
 * `lzc_destroy`, `lzc_snapshot`, `lzc_clone`, `lzc_send` / `lzc_receive*`,
 * `lzc_trim`, `lzc_initialize`, `lzc_reopen`, `lzc_sync`, `lzc_scrub` /
 * `zpool_scan` / `lzc_wait`, `lzc_hold`, `lzc_get_holds`, `lzc_release`,
 * `lzc_rollback` / `lzc_rollback_to`, `lzc_promote`, `lzc_rename`,
 * `lzc_bookmark` / `lzc_get_bookmarks` / `lzc_destroy_bookmarks` /
 * `lzc_get_bookmark_props`, plus libzfs list/prop/status/`zpool_clear` /
 * `zpool_create`/`zpool_destroy` / `zfs_mount`/`zfs_unmount`/`zfs_share`/`zfs_unshare`).
 * Pool create/destroy are libzfs (`zpool_create` / `zpool_destroy`), not lzc.
 * Same operations as `ZfsProtocol`; errors are native errno, not CLI.
 * Until a `.node` exists, bindings may `Effect.fail` `NativeFailure`.
 */
export interface NativeBindings {
  readonly listDatasets: (options?: ListDatasets) => Effect.Effect<ReadonlyArray<DatasetListItem>, NativeFailureOrTransport>
  readonly getProperty: (input: GetProperty) => Effect.Effect<PropertyGetRow, NativeFailureOrTransport>
  readonly getProperties: (input: GetProperty) => Effect.Effect<ReadonlyArray<PropertyGetRow>, NativeFailureOrTransport>
  readonly setProperty: (input: SetProperty) => Effect.Effect<void, NativeFailureOrTransport>
  readonly inheritProperty: (input: InheritProperty) => Effect.Effect<void, NativeFailureOrTransport>
  readonly createFilesystem: (input: CreateFilesystem) => Effect.Effect<void, NativeFailureOrTransport>
  readonly createVolume: (input: CreateVolume) => Effect.Effect<void, NativeFailureOrTransport>
  readonly destroy: (input: Destroy) => Effect.Effect<void, NativeFailureOrTransport>
  readonly createSnapshot: (input: CreateSnapshot) => Effect.Effect<void, NativeFailureOrTransport>
  readonly clone: (input: Clone) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs snapshot iter (no lzc list) */
  readonly listSnapshots: (options?: ListSnapshots) => Effect.Effect<ReadonlyArray<SnapshotListItem>, NativeFailureOrTransport>
  /** `lzc_rollback` / `lzc_rollback_to`; `-r`/`-R`/`-f` are libzfs */
  readonly rollback: (input: Rollback) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_promote` */
  readonly promote: (input: Promote) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_rename`; `-p`/`-u`/`-r`/`-f` are libzfs */
  readonly rename: (input: Rename) => Effect.Effect<void, NativeFailureOrTransport>
  readonly listPools: (options?: ListPools) => Effect.Effect<ReadonlyArray<PoolListItem>, NativeFailureOrTransport>
  readonly poolStatus: (input: StatusPool) => Effect.Effect<PoolStatus, NativeFailureOrTransport>
  /** libzfs `zfs_upgrade` */
  readonly upgradeDataset: (input: UpgradeDataset) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_exists` */
  readonly exists: (input: Exists) => Effect.Effect<boolean, NativeFailureOrTransport>
  /** `lzc_get_vdev_prop` / libzfs `zpool_get_vdev_prop` */
  readonly getVdevProperty: (input: GetVdevProperty) => Effect.Effect<PropertyGetRow, NativeFailureOrTransport>
  readonly getVdevProperties: (input: GetVdevProperty) => Effect.Effect<ReadonlyArray<PropertyGetRow>, NativeFailureOrTransport>
  /** `lzc_set_vdev_prop` / libzfs `zpool_set_vdev_prop` */
  readonly setVdevProperty: (input: SetVdevProperty) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_snaprange_space` */
  readonly snaprangeSpace: (input: SnaprangeSpace) => Effect.Effect<SendSpaceEstimate, NativeFailureOrTransport>
  /** libzfs `zpool_create` (not lzc). Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly createPool: (input: CreatePool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_destroy` (not lzc). */
  readonly destroyPool: (input: DestroyPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_import` / `zpool_import_props` */
  readonly importPool: (input: ImportPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_export` */
  readonly exportPool: (input: ExportPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_reguid` / `zpool_set_guid` */
  readonly reguidPool: (input: ReguidPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_upgrade` */
  readonly upgradePool: (input: UpgradePool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_clear_label` */
  readonly labelClear: (input: LabelClear) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_pool_checkpoint` / `lzc_pool_checkpoint_discard` */
  readonly checkpointPool: (input: CheckpointPool) => Effect.Effect<void, NativeFailureOrTransport>
  readonly send: (input: Send) => Stream.Stream<Uint8Array, NativeFailureOrTransport>
  /** `lzc_send_space` / `lzc_send_space_resume_redacted` */
  readonly sendSpace: (input: Send) => Effect.Effect<SendSpaceEstimate, NativeFailureOrTransport>
  /** `lzc_send_progress` */
  readonly sendProgress: (input: SendProgress) => Effect.Effect<SendProgressReport, NativeFailureOrTransport>
  /** `lzc_receive` */
  readonly receive: <E>(
    input: Receive,
    stream: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<void, NativeFailureOrTransport | E>
  /** `lzc_receive_resumable` */
  readonly receiveResumable: <E>(
    input: Receive,
    stream: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<void, NativeFailureOrTransport | E>
  /** `lzc_receive_with_cmdprops` (`-o`/`-x`/origin) */
  readonly receiveWithCmdprops: <E>(
    input: Receive,
    stream: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<void, NativeFailureOrTransport | E>
  /** `lzc_receive_with_heal` */
  readonly receiveWithHeal: <E>(
    input: Receive,
    stream: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<void, NativeFailureOrTransport | E>
  /** Abort a resumable receive (`zfs receive -A`). */
  readonly abortReceive: (input: AbortReceive) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_trim` */
  readonly trimPool: (input: TrimPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_initialize` */
  readonly initializePool: (input: InitializePool) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_clear` (no lzc equivalent) */
  readonly clearPool: (input: ClearPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_reopen` */
  readonly reopenPool: (input: ReopenPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_sync` */
  readonly syncPool: (input: SyncPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_scrub` / `zpool_scan` */
  readonly scrub: (input: Scrub) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_scan(POOL_SCAN_RESILVER)` / `lzc_wait` */
  readonly resilver: (input: Resilver) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_hold`. Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly hold: (input: Hold) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_get_holds` */
  readonly holds: (input: ListHolds) => Effect.Effect<ReadonlyArray<SnapshotHold>, NativeFailureOrTransport>
  /** `lzc_release` */
  readonly release: (input: Release) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_bookmark`. Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly createBookmark: (input: CreateBookmark) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_destroy_bookmarks` */
  readonly destroyBookmark: (input: DestroyBookmark) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_get_bookmarks` */
  readonly listBookmarks: (options?: ListBookmarks) => Effect.Effect<ReadonlyArray<BookmarkListItem>, NativeFailureOrTransport>
  /** `lzc_get_bookmark_props` */
  readonly getBookmarkProps: (input: GetBookmarkProps) => Effect.Effect<PropertyGetRow, NativeFailureOrTransport>
  /** libzfs `zfs_mount` / `zfs_mount_at` (not lzc). Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly mount: (input: MountFilesystem) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_unmount` / `zfs_unmountall` (not lzc) */
  readonly unmount: (input: UnmountFilesystem) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_share` (NFS/SMB via `sharenfs`/`sharesmb`; not lzc) */
  readonly share: (input: ShareFilesystem) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_unshare` / `zfs_unshareall` (not lzc) */
  readonly unshare: (input: UnshareFilesystem) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_load_key`. Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly loadKey: (input: LoadKey) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_unload_key` */
  readonly unloadKey: (input: UnloadKey) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_change_key` */
  readonly changeKey: (input: ChangeKey) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_events_next` / Linux `ZFS_IOC_EVENTS_NEXT`. Stream; do not buffer. */
  readonly events: (input: Events) => Stream.Stream<PoolEvent, NativeFailureOrTransport>
  /** `zpool_events_clear` / `ZFS_IOC_EVENTS_CLEAR` */
  readonly eventsClear: (input: EventsClear) => Effect.Effect<EventsCleared, NativeFailureOrTransport>
  /** `zpool_events_seek` / `ZFS_IOC_EVENTS_SEEK` */
  readonly eventsSeek: (input: EventsSeek) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs pool/vdev iostat samples */
  readonly iostat: (input: Iostat) => Stream.Stream<IostatSample, NativeFailureOrTransport>
  /** `lzc_wait` */
  readonly waitPool: (input: WaitPool) => Effect.Effect<WaitResult, NativeFailureOrTransport>
  /** libzfs `zpool_get_history` */
  readonly history: (input: History) => Stream.Stream<HistoryRecord, NativeFailureOrTransport>
  /** `lzc_pool_prefetch` */
  readonly prefetch: (input: Prefetch) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_set_fsacl` (ZFS_IOC_SET_FSACL). Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly allow: (input: Allow) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_set_fsacl` unallow */
  readonly unallow: (input: Unallow) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zfs_get_fsacl` (ZFS_IOC_GET_FSACL) */
  readonly listAllow: (input: ListAllow) => Effect.Effect<ReadonlyArray<AllowListing>, NativeFailureOrTransport>
  /** libzfs `zfs_userspace` / `ZFS_IOC_USERSPACE_MANY` */
  readonly userspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, NativeFailureOrTransport>
  readonly groupspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, NativeFailureOrTransport>
  readonly projectspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, NativeFailureOrTransport>
  /** `ZFS_IOC_FSGETXATTR` / `ZFS_IOC_FSSETXATTR` */
  readonly project: (input: Project) => Effect.Effect<ReadonlyArray<ProjectRow>, NativeFailureOrTransport>
  /** `lzc_channel_program` / `lzc_channel_program_nosync` */
  readonly channelProgram: (input: ChannelProgram) => Effect.Effect<ChannelProgramResult, NativeFailureOrTransport>
  /** `lzc_redact` */
  readonly redact: (input: Redact) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_wait_fs` */
  readonly waitFs: (input: WaitFilesystem) => Effect.Effect<WaitResult, NativeFailureOrTransport>
  /** `ZFS_IOC_DIFF` (no lzc) */
  readonly diff: (input: Diff) => Effect.Effect<ReadonlyArray<DiffEntry>, NativeFailureOrTransport>
  /** `zfs_version_userland` / `zfs_version_kernel` */
  readonly version: () => Effect.Effect<ZfsVersionInfo, NativeFailureOrTransport>
  /** Linux `ZFS_IOC_USERNS_ATTACH` */
  readonly zone: (input: Zone) => Effect.Effect<void, NativeFailureOrTransport>
  /** Linux `ZFS_IOC_USERNS_DETACH` */
  readonly unzone: (input: Zone) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_get_bootenv` */
  readonly getBootenv: (input: GetBootenv) => Effect.Effect<Bootenv, NativeFailureOrTransport>
  /** `lzc_set_bootenv` */
  readonly setBootenv: (input: SetBootenv) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_ddt_prune` */
  readonly ddtPrune: (input: DdtPrune) => Effect.Effect<void, NativeFailureOrTransport>
  /** `lzc_condense` */
  readonly condense: (input: Condense) => Effect.Effect<void, NativeFailureOrTransport>
  /** libzfs `zpool_add`. Until a `.node` exists, may `Effect.fail` `NativeFailure`. */
  readonly addVdevs: (input: AddVdevs) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_remove` / `zpool_vdev_remove_cancel` */
  readonly removeVdevs: (input: RemoveVdevs) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_attach` (`replacing=0`) */
  readonly attachVdev: (input: AttachVdev) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_detach` */
  readonly detachVdev: (input: DetachVdev) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_attach` (`replacing=1`) */
  readonly replaceVdev: (input: ReplaceVdev) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_split` */
  readonly splitPool: (input: SplitPool) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_online` (`ZFS_ONLINE_EXPAND`) */
  readonly onlineVdevs: (input: OnlineVdevs) => Effect.Effect<void, NativeFailureOrTransport>
  /** `zpool_vdev_offline` */
  readonly offlineVdevs: (input: OfflineVdevs) => Effect.Effect<void, NativeFailureOrTransport>
}

export const unboundNative = (operation: string): Effect.Effect<never, NativeFailure> =>
  Effect.fail(new NativeFailure({
    operation,
    message: "libzfs_core addon is not loaded"
  }))

const unboundStream = <A>(operation: string): Stream.Stream<A, NativeFailure> =>
  Stream.fail(new NativeFailure({
    operation,
    message: "libzfs_core addon is not loaded"
  }))

/** Every native method fails `NativeFailure`. No silent void stubs. */
export const unboundBindings = (): NativeBindings => ({
  listDatasets: () => unboundNative("Dataset.List"),
  getProperty: () => unboundNative("Dataset.Get"),
  getProperties: () => unboundNative("Dataset.Get"),
  setProperty: () => unboundNative("Dataset.Set"),
  inheritProperty: () => unboundNative("Dataset.Inherit"),
  createFilesystem: () => unboundNative("Dataset.CreateFilesystem"),
  createVolume: () => unboundNative("Dataset.CreateVolume"),
  destroy: () => unboundNative("Dataset.Destroy"),
  createSnapshot: () => unboundNative("Snapshot.Create"),
  clone: () => unboundNative("Snapshot.Clone"),
  listSnapshots: () => unboundNative("Snapshot.List"),
  rollback: () => unboundNative("Snapshot.Rollback"),
  promote: () => unboundNative("Snapshot.Promote"),
  rename: () => unboundNative("Dataset.Rename"),
  listPools: () => unboundNative("Pool.List"),
  poolStatus: () => unboundNative("Pool.Status"),
  upgradeDataset: () => unboundNative("Dataset.Upgrade"),
  exists: () => unboundNative("Dataset.Exists"),
  getVdevProperty: () => unboundNative("Pool.GetVdev"),
  getVdevProperties: () => unboundNative("Pool.GetVdev"),
  setVdevProperty: () => unboundNative("Pool.SetVdev"),
  snaprangeSpace: () => unboundNative("Replication.SnaprangeSpace"),
  createPool: () => unboundNative("Pool.Create"),
  destroyPool: () => unboundNative("Pool.Destroy"),
  importPool: () => unboundNative("Pool.Import"),
  exportPool: () => unboundNative("Pool.Export"),
  reguidPool: () => unboundNative("Pool.Reguid"),
  upgradePool: () => unboundNative("Pool.Upgrade"),
  labelClear: () => unboundNative("Pool.LabelClear"),
  checkpointPool: () => unboundNative("Pool.Checkpoint"),
  send: () => unboundStream("Replication.Send"),
  sendSpace: () => unboundNative("Replication.SendSpace"),
  sendProgress: () => unboundNative("Replication.SendProgress"),
  receive: () => unboundNative("Replication.Receive"),
  receiveResumable: () => unboundNative("Replication.Receive"),
  receiveWithCmdprops: () => unboundNative("Replication.Receive"),
  receiveWithHeal: () => unboundNative("Replication.Receive"),
  abortReceive: () => unboundNative("Replication.AbortReceive"),
  trimPool: () => unboundNative("Pool.Trim"),
  initializePool: () => unboundNative("Pool.Initialize"),
  clearPool: () => unboundNative("Pool.Clear"),
  reopenPool: () => unboundNative("Pool.Reopen"),
  syncPool: () => unboundNative("Pool.Sync"),
  scrub: () => unboundNative("Pool.Scrub"),
  resilver: () => unboundNative("Pool.Resilver"),
  hold: () => unboundNative("Snapshot.Hold"),
  holds: () => unboundNative("Snapshot.Holds"),
  release: () => unboundNative("Snapshot.Release"),
  createBookmark: () => unboundNative("Bookmark.Create"),
  destroyBookmark: () => unboundNative("Bookmark.Destroy"),
  listBookmarks: () => unboundNative("Bookmark.List"),
  getBookmarkProps: () => unboundNative("Bookmark.Get"),
  mount: () => unboundNative("Mount.Mount"),
  unmount: () => unboundNative("Mount.Unmount"),
  share: () => unboundNative("Mount.Share"),
  unshare: () => unboundNative("Mount.Unshare"),
  loadKey: () => unboundNative("Crypto.LoadKey"),
  unloadKey: () => unboundNative("Crypto.UnloadKey"),
  changeKey: () => unboundNative("Crypto.ChangeKey"),
  events: () => unboundStream("Pool.Events"),
  eventsClear: () => unboundNative("Pool.EventsClear"),
  eventsSeek: () => unboundNative("Pool.EventsSeek"),
  iostat: () => unboundStream("Pool.Iostat"),
  waitPool: () => unboundNative("Pool.Wait"),
  history: () => unboundStream("Pool.History"),
  prefetch: () => unboundNative("Pool.Prefetch"),
  allow: () => unboundNative("Dataset.Allow"),
  unallow: () => unboundNative("Dataset.Unallow"),
  listAllow: () => unboundNative("Dataset.ListAllow"),
  userspace: () => unboundNative("Dataset.Userspace"),
  groupspace: () => unboundNative("Dataset.Groupspace"),
  projectspace: () => unboundNative("Dataset.Projectspace"),
  project: () => unboundNative("Dataset.Project"),
  channelProgram: () => unboundNative("Pool.Program"),
  redact: () => unboundNative("Snapshot.Redact"),
  waitFs: () => unboundNative("Dataset.Wait"),
  diff: () => unboundNative("Dataset.Diff"),
  version: () => unboundNative("Zfs.Version"),
  zone: () => unboundNative("Dataset.Zone"),
  unzone: () => unboundNative("Dataset.Unzone"),
  getBootenv: () => unboundNative("Pool.GetBootenv"),
  setBootenv: () => unboundNative("Pool.SetBootenv"),
  ddtPrune: () => unboundNative("Pool.DdtPrune"),
  condense: () => unboundNative("Pool.Condense"),
  addVdevs: () => unboundNative("Pool.Add"),
  removeVdevs: () => unboundNative("Pool.Remove"),
  attachVdev: () => unboundNative("Pool.Attach"),
  detachVdev: () => unboundNative("Pool.Detach"),
  replaceVdev: () => unboundNative("Pool.Replace"),
  splitPool: () => unboundNative("Pool.Split"),
  onlineVdevs: () => unboundNative("Pool.Online"),
  offlineVdevs: () => unboundNative("Pool.Offline")
})

/** `lzc_load_key(fsname, noop, wkeydata, wkeylen)` */
export const lzcLoadKey = (input: LoadKey): {
  readonly fsname: string
  readonly noop: boolean
  readonly wkeydata: Uint8Array
} | undefined => {
  if (input.name === undefined || input.wrappingKey === undefined) return undefined
  return {
    fsname: input.name,
    noop: input.noop === true,
    wkeydata: wrappingKeyToNativeBytes(input.wrappingKey, input.keyformat ?? "passphrase")
  }
}

/** `lzc_create` wrapping-key bytes from typed args. */
export const lzcCreateKey = (
  input: CreateFilesystem | CreateVolume
): Uint8Array | undefined => {
  if (input.wrappingKey === undefined) return undefined
  return wrappingKeyToNativeBytes(input.wrappingKey, keyFormatFromProperties(input.properties))
}

/** `lzc_change_key(fsname, flags, props, wkeydata, wkeylen)` */
export const lzcChangeKey = (input: ChangeKey): {
  readonly fsname: string
  readonly flags: bigint
  readonly wkeydata: Uint8Array | undefined
} => ({
  fsname: input.name,
  flags: dcpCmdOf(input.command),
  wkeydata: input.wrappingKey === undefined
    ? undefined
    : wrappingKeyToNativeBytes(input.wrappingKey, input.keyformat ?? "passphrase")
})

/** Bits from `enum lzc_send_flags` in libzfs_core.h. */
export const LzcSendFlagBit = {
  embed: 1 << 0,
  largeBlock: 1 << 1,
  compress: 1 << 2,
  raw: 1 << 3,
  saved: 1 << 4
} as const

const hasLzcSendFlag = (options: SendOptions | undefined, name: LzcSendFlag): boolean => {
  const flags = options?.flags
  if (flags === undefined) return false
  for (const flag of flags) {
    if (flag === name) return true
  }
  return false
}

/** Numeric `lzc_send_flags` for `lzc_send` / `lzc_send_resume` / `lzc_send_space`. */
export const lzcSendFlagsOf = (options?: SendOptions): number => {
  let bits = 0
  if (options?.compressed === true || hasLzcSendFlag(options, "compress")) bits |= LzcSendFlagBit.compress
  if (options?.raw === true || hasLzcSendFlag(options, "raw")) bits |= LzcSendFlagBit.raw
  if (hasLzcSendFlag(options, "embed")) bits |= LzcSendFlagBit.embed
  if (hasLzcSendFlag(options, "large-block")) bits |= LzcSendFlagBit.largeBlock
  if (options?.saved === true) bits |= LzcSendFlagBit.saved
  return bits
}

export const LzcSendCall = Schema.Literals([
  "lzc_send",
  "lzc_send_resume",
  "lzc_send_redacted",
  "lzc_send_resume_redacted"
])
export type LzcSendCall = typeof LzcSendCall.Type

/** Which `lzc_send*` a native addon should call for `Send`. */
export const lzcSendCall = (input: Send): LzcSendCall => {
  const resume = input.options?.resumeToken !== undefined
  const redact = input.options?.redact !== undefined
  if (resume && redact) return "lzc_send_resume_redacted"
  if (resume) return "lzc_send_resume"
  if (redact) return "lzc_send_redacted"
  return "lzc_send"
}

/** Which `lzc_receive*` a native addon should call for `Receive`. */
export const LzcReceiveKind = Schema.Literals([
  "lzc_receive",
  "lzc_receive_resumable",
  "lzc_receive_with_cmdprops",
  "lzc_receive_with_heal"
])
export type LzcReceiveKind = typeof LzcReceiveKind.Type

export const lzcReceiveKind = (input: Receive): LzcReceiveKind => {
  if (input.heal === true) return "lzc_receive_with_heal"
  const hasCmdprops = input.origin !== undefined ||
    (input.properties !== undefined && input.properties.length > 0) ||
    (input.exclude !== undefined && input.exclude.length > 0)
  if (hasCmdprops) return "lzc_receive_with_cmdprops"
  if (input.resumable === true) return "lzc_receive_resumable"
  return "lzc_receive"
}

const nativeReceive = <E>(
  bindings: NativeBindings,
  input: Receive,
  stream: Stream.Stream<Uint8Array, E>
): Effect.Effect<void, NativeFailureOrTransport | E> => {
  switch (lzcReceiveKind(input)) {
    case "lzc_receive_with_heal":
      return bindings.receiveWithHeal(input, stream)
    case "lzc_receive_with_cmdprops":
      return bindings.receiveWithCmdprops(input, stream)
    case "lzc_receive_resumable":
      return bindings.receiveResumable(input, stream)
    case "lzc_receive":
      return bindings.receive(input, stream)
  }
}

const codeOf = (failure: NativeFailure): string | undefined => {
  if (failure.code !== undefined) return failure.code
  if (failure.errno !== undefined) return errorValueToCode[failure.errno]
  return undefined
}

const knownError = (code: string, operation: string, message: string): ZfsError | undefined => {
  switch (code) {
    case "EZFS_BADPROP":
      return new InvalidProperty({ code, operation, message })
    case "EZFS_PROPREADONLY":
      return new PropertyReadOnly({ code, operation, message })
    case "EZFS_PROPTYPE":
      return new PropertyNotApplicable({ code, operation, message })
    case "EZFS_PROPNONINHERIT":
      return new PropertyNotInheritable({ code, operation, message })
    case "EZFS_BUSY":
      return new DatasetBusy({ code, operation, message })
    case "EZFS_EXISTS":
      return new DatasetAlreadyExists({ code, operation, message })
    case "EZFS_NOENT":
      return new DatasetNotFound({ code, operation, message })
    case "EZFS_BADSTREAM":
      return new InvalidBackupStream({ code, operation, message })
    case "EZFS_VOLTOOBIG":
      return new VolumeTooBig({ code, operation, message })
    case "EZFS_INVALIDNAME":
      return new InvalidName({ code, operation, message })
    case "EZFS_BADRESTORE":
      return new BadRestore({ code, operation, message })
    case "EZFS_CROSSTARGET":
      return new CrossTarget({ code, operation, message })
    case "EZFS_PERM":
      return new PermissionDenied({ code, operation, message })
    case "EZFS_NOSPC":
      return new OutOfSpace({ code, operation, message })
    case "EZFS_POOLUNAVAIL":
      return new PoolUnavailable({ code, operation, message })
    case "EZFS_CRYPTOFAILED":
      return new EncryptionFailure({ code, operation, message })
    case "EZFS_REFTAG_HOLD":
      return new HoldTagExists({ code, operation, message })
    case "EZFS_REFTAG_RELE":
      return new HoldTagNotFound({ code, operation, message })
    case "EZFS_TAGTOOLONG":
      return new HoldTagTooLong({ code, operation, message })
    case "EZFS_RESILVERING":
      return new Resilvering({ code, operation, message })
    case "EZFS_MOUNTFAILED":
      return new MountFailed({ code, operation, message })
    case "EZFS_UMOUNTFAILED":
      return new UnmountFailed({ code, operation, message })
    case "EZFS_SHAREFAILED":
      return new ShareFailed({ code, operation, message })
    case "EZFS_BADPATH":
      return new BadPath({ code, operation, message })
    case "EZFS_ACTIVE_POOL":
      return new PoolActive({ code, operation, message })
    case "EZFS_CHECKPOINT_EXISTS":
      return new CheckpointExists({ code, operation, message })
    case "EZFS_DISCARDING_CHECKPOINT":
      return new CheckpointDiscarding({ code, operation, message })
    case "EZFS_NO_CHECKPOINT":
      return new NoCheckpoint({ code, operation, message })
    case "EZFS_BADWHO":
      return new InvalidWho({ code, operation, message })
    case "EZFS_BADPERM":
      return new InvalidPermission({ code, operation, message })
    case "EZFS_BADPERMSET":
      return new InvalidPermissionSet({ code, operation, message })
    case "EZFS_NODELEGATION":
      return new DelegationDisabled({ code, operation, message })
    case "EZFS_BADTARGET":
      return new BadAttachTarget({ code, operation, message })
    case "EZFS_NODEVICE":
      return new NoSuchDevice({ code, operation, message })
    case "EZFS_BADDEV":
      return new InvalidDevice({ code, operation, message })
    case "EZFS_NOREPLICAS":
      return new NoReplicas({ code, operation, message })
    case "EZFS_DEVOVERFLOW":
      return new DeviceOverflow({ code, operation, message })
    case "EZFS_ISSPARE":
      return new DeviceIsSpare({ code, operation, message })
    case "EZFS_INVALCONFIG":
      return new InvalidVdevConfig({ code, operation, message })
    case "EZFS_VDEVNOTSUP":
      return new VdevNotSupported({ code, operation, message })
    case "EZFS_OPENFAILED":
      return new DeviceOpenFailed({ code, operation, message })
    case "EZFS_ISL2CACHE":
      return new DeviceIsCache({ code, operation, message })
    case "EZFS_POOL_NOTSUP":
      return new PoolNotSupported({ code, operation, message })
    case "EZFS_POOL_INVALARG":
      return new PoolInvalidArgument({ code, operation, message })
    case "EZFS_POSTSPLIT_ONLINE":
      return new PostSplitOnline({ code, operation, message })
    default:
      return undefined
  }
}

/** Map libzfs_errno onto generated tags, gated by the operation's declared union. */
export const classifyNativeError = (failure: NativeFailure): ZfsError => {
  const code = codeOf(failure)
  const candidate = code === undefined ? undefined : knownError(code, failure.operation, failure.message)
  if (candidate) {
    const tags: { readonly [operation: string]: readonly string[] } = OperationErrorTags
    const declared = tags[failure.operation]
    if (declared?.includes(candidate._tag)) return candidate
  }
  return new UnknownZfsError({
    operation: failure.operation,
    stderr: failure.message
  })
}

const mapNative = (error: NativeFailureOrTransport): Failure =>
  error instanceof NativeFailure ? classifyNativeError(error) : error

const fromNative = <A>(effect: Effect.Effect<A, NativeFailureOrTransport>) =>
  effect.pipe(Effect.mapError(mapNative))

const fromNativeStream = <A>(stream: Stream.Stream<A, NativeFailureOrTransport>) =>
  stream.pipe(Stream.mapError(mapNative))

/**
 * Turn native bindings into `ZfsProtocol`. Domain services stay unchanged.
 * Load the `.node` / napi module yourself, then `Effect.provide(layerFrom(bindings))`.
 */
export const layerFrom = (bindings: NativeBindings): Layer.Layer<ZfsProtocol> =>
  Layer.succeed(
    ZfsProtocol,
    ZfsProtocol.of({
      listDatasets: (options) => fromNative(bindings.listDatasets(options)),
      getProperty: (input) => fromNative(bindings.getProperty(input)),
      getProperties: (input) => fromNative(bindings.getProperties(input)),
      setProperty: (input) => fromNative(bindings.setProperty(input)),
      inheritProperty: (input) => fromNative(bindings.inheritProperty(input)),
      createFilesystem: (input) => fromNative(bindings.createFilesystem(input)),
      createVolume: (input) => fromNative(bindings.createVolume(input)),
      destroy: (input) => fromNative(bindings.destroy(input)),
      createSnapshot: (input) => fromNative(bindings.createSnapshot(input)),
      clone: (input) => fromNative(bindings.clone(input)),
      listSnapshots: (options) => fromNative(bindings.listSnapshots(options)),
      rollback: (input) => fromNative(bindings.rollback(input)),
      promote: (input) => fromNative(bindings.promote(input)),
      rename: (input) => fromNative(bindings.rename(input)),
      listPools: (options) => fromNative(bindings.listPools(options)),
      poolStatus: (input) => fromNative(bindings.poolStatus(input)),
      upgradeDataset: (input) => fromNative(bindings.upgradeDataset(input)),
      exists: (input) => fromNative(bindings.exists(input)),
      getVdevProperty: (input) => fromNative(bindings.getVdevProperty(input)),
      getVdevProperties: (input) => fromNative(bindings.getVdevProperties(input)),
      setVdevProperty: (input) => fromNative(bindings.setVdevProperty(input)),
      snaprangeSpace: (input) => fromNative(bindings.snaprangeSpace(input)),
      createPool: (input) => fromNative(bindings.createPool(input)),
      destroyPool: (input) => fromNative(bindings.destroyPool(input)),
      importPool: (input) => fromNative(bindings.importPool(input)),
      exportPool: (input) => fromNative(bindings.exportPool(input)),
      reguidPool: (input) => fromNative(bindings.reguidPool(input)),
      upgradePool: (input) => fromNative(bindings.upgradePool(input)),
      labelClear: (input) => fromNative(bindings.labelClear(input)),
      checkpointPool: (input) => fromNative(bindings.checkpointPool(input)),
      send: (input) => fromNativeStream(bindings.send(input)),
      sendSpace: (input) => fromNative(bindings.sendSpace(input)),
      sendProgress: (input) => fromNative(bindings.sendProgress(input)),
      receive: (input, stream) =>
        nativeReceive(bindings, input, stream).pipe(
          Effect.mapError((error) => error instanceof NativeFailure ? classifyNativeError(error) : error)
        ),
      abortReceive: (input) => fromNative(bindings.abortReceive(input)),
      trimPool: (input) => fromNative(bindings.trimPool(input)),
      initializePool: (input) => fromNative(bindings.initializePool(input)),
      clearPool: (input) => fromNative(bindings.clearPool(input)),
      reopenPool: (input) => fromNative(bindings.reopenPool(input)),
      syncPool: (input) => fromNative(bindings.syncPool(input)),
      scrub: (input) => fromNative(bindings.scrub(input)),
      resilver: (input) => fromNative(bindings.resilver(input)),
      hold: (input) => fromNative(bindings.hold(input)),
      holds: (input) => fromNative(bindings.holds(input)),
      release: (input) => fromNative(bindings.release(input)),
      createBookmark: (input) => fromNative(bindings.createBookmark(input)),
      destroyBookmark: (input) => fromNative(bindings.destroyBookmark(input)),
      listBookmarks: (options) => fromNative(bindings.listBookmarks(options)),
      getBookmarkProps: (input) => fromNative(bindings.getBookmarkProps(input)),
      loadKey: (input) => fromNative(bindings.loadKey(input)),
      unloadKey: (input) => fromNative(bindings.unloadKey(input)),
      changeKey: (input) => fromNative(bindings.changeKey(input)),
      mount: (input) => fromNative(bindings.mount(input)),
      unmount: (input) => fromNative(bindings.unmount(input)),
      share: (input) => fromNative(bindings.share(input)),
      unshare: (input) => fromNative(bindings.unshare(input)),
      waitPool: (input) => fromNative(bindings.waitPool(input)),
      events: (input) => fromNativeStream(bindings.events(input)),
      eventsClear: (input) => fromNative(bindings.eventsClear(input)),
      eventsSeek: (input) => fromNative(bindings.eventsSeek(input)),
      iostat: (input) => fromNativeStream(bindings.iostat(input)),
      history: (input) => fromNativeStream(bindings.history(input)),
      prefetch: (input) => fromNative(bindings.prefetch(input)),
      allow: (input) => fromNative(bindings.allow(input)),
      unallow: (input) => fromNative(bindings.unallow(input)),
      listAllow: (input) => fromNative(bindings.listAllow(input)),
      userspace: (input) => fromNative(bindings.userspace(input)),
      groupspace: (input) => fromNative(bindings.groupspace(input)),
      projectspace: (input) => fromNative(bindings.projectspace(input)),
      project: (input) => fromNative(bindings.project(input)),
      channelProgram: (input) => fromNative(bindings.channelProgram(input)),
      redact: (input) => fromNative(bindings.redact(input)),
      waitFs: (input) => fromNative(bindings.waitFs(input)),
      diff: (input) => fromNative(bindings.diff(input)),
      version: () => fromNative(bindings.version()),
      zone: (input) => fromNative(bindings.zone(input)),
      unzone: (input) => fromNative(bindings.unzone(input)),
      getBootenv: (input) => fromNative(bindings.getBootenv(input)),
      setBootenv: (input) => fromNative(bindings.setBootenv(input)),
      ddtPrune: (input) => fromNative(bindings.ddtPrune(input)),
      condense: (input) => fromNative(bindings.condense(input)),
      addVdevs: (input) => fromNative(bindings.addVdevs(input)),
      removeVdevs: (input) => fromNative(bindings.removeVdevs(input)),
      attachVdev: (input) => fromNative(bindings.attachVdev(input)),
      detachVdev: (input) => fromNative(bindings.detachVdev(input)),
      replaceVdev: (input) => fromNative(bindings.replaceVdev(input)),
      splitPool: (input) => fromNative(bindings.splitPool(input)),
      onlineVdevs: (input) => fromNative(bindings.onlineVdevs(input)),
      offlineVdevs: (input) => fromNative(bindings.offlineVdevs(input))
    })
  )

/** Merge Linux `libzfs_core` FFI over unbound methods. */
export const linuxBindings = (): NativeBindings => {
  const unbound = unboundBindings()
  const lzc = loadLinuxLzc()
  return lzc === undefined ? unbound : { ...unbound, ...lzc }
}

/** Unbound native protocol (every op fails `NativeFailure`). */
export const layer: Layer.Layer<ZfsProtocol> = layerFrom(unboundBindings())

/** Linux lzc where available, otherwise the same unbound failures. */
export const linuxLayer = (): Layer.Layer<ZfsProtocol> => layerFrom(linuxBindings())
