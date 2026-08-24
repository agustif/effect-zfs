import { Context, Effect, Layer, Stream } from "effect"
import type { ZfsError } from "./Error.js"
import { ZfsTransportError } from "./Process.js"
import type { PoolName } from "./Name.js"
import type { PoolStatus, PropertyGetRow } from "./Schemas.js"
import {
  CheckpointPool,
  ClearPool,
  Clone,
  CreateFilesystem,
  CreatePool,
  CreateSnapshot,
  CreateVolume,
  Destroy,
  DestroyPool,
  DatasetListItem,
  EncodedProperty,
  ExportPool,
  GetProperty,
  Hold,
  ImportPool,
  InheritProperty,
  InitializePool,
  LabelClear,
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
  SendProgress,
  SendProgressReport,
  SendSpaceEstimate,
  SetProperty,
  ShareFilesystem,
  SnapshotHold,
  SnapshotListItem,
  StatusPool,
  SyncPool,
  TrimPool,
  UnmountFilesystem,
  UnshareFilesystem,
  UpgradePool,
  LoadKey,
  UnloadKey,
  ChangeKey,
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
  WaitPool,
  WaitResult,
  Zone,
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
  UpgradeDataset
} from "./Args.js"
import { ZfsVersion, ZfsVersionInfo } from "./Version.js"

export {
  CommandResult,
  ZfsCommand,
  ZfsCommandFailure,
  ZfsTransportError,
  command
} from "./Process.js"

export {
  Cache,
  CheckpointPool,
  ClearPool,
  Clone,
  CreateFilesystem,
  CreatePool,
  CreateSnapshot,
  CreateVolume,
  DataVdev,
  Destroy,
  DestroyPool,
  DatasetListItem,
  DevicePath,
  Disk,
  Draid,
  EncodedProperty,
  ExportPool,
  File,
  GetProperty,
  Hold,
  ImportPool,
  InheritProperty,
  InitializePool,
  LabelClear,
  ListDatasets,
  ListHolds,
  ListSnapshots,
  Log,
  Mirror,
  PoolInitializeCommand,
  PoolListItem,
  PoolTrimCommand,
  Promote,
  PropertyScope,
  AbortReceive,
  BookmarkListItem,
  CreateBookmark,
  DestroyBookmark,
  GetBookmarkProps,
  ListBookmarks,
  Receive,
  Raidz,
  ReceiveDest,
  ReguidPool,
  Release,
  Rename,
  ReopenPool,
  Resilver,
  Rollback,
  Scrub,
  ScrubCommand,
  Send,
  SendOptions,
  SendProgress,
  SendProgressReport,
  SendSpaceEstimate,
  SetProperty,
  SnapshotHold,
  SnapshotListItem,
  Spare,
  StatusPool,
  SyncPool,
  TrimPool,
  UnmountFilesystem,
  UnshareFilesystem,
  UpgradePool,
  Vdev,
  VdevId,
  VdevLeaf,
  AbsolutePath,
  MountFilesystem,
  ShareFilesystem,
  LoadKey,
  UnloadKey,
  ChangeKey,
  KeyFormat,
  KeyLocation,
  ChangeKeyCommand,
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
  VdevPath,
  encodeVdev,
  encodeVdevs
} from "./Args.js"

export type Failure = ZfsError | ZfsTransportError

export interface TestHandlers {
  readonly listDatasets?: (options?: ListDatasets) => ReadonlyArray<DatasetListItem>
  readonly getProperty?: (input: GetProperty) => PropertyGetRow
  readonly getProperties?: (input: GetProperty) => ReadonlyArray<PropertyGetRow>
  readonly setProperty?: (input: SetProperty) => void
  readonly inheritProperty?: (input: InheritProperty) => void
  readonly createFilesystem?: (input: CreateFilesystem) => void
  readonly createVolume?: (input: CreateVolume) => void
  readonly destroy?: (input: Destroy) => void
  readonly createSnapshot?: (input: CreateSnapshot) => void
  readonly clone?: (input: Clone) => void
  readonly listSnapshots?: (options?: ListSnapshots) => ReadonlyArray<SnapshotListItem>
  readonly rollback?: (input: Rollback) => void
  readonly promote?: (input: Promote) => void
  readonly rename?: (input: Rename) => void
  readonly listPools?: (options?: ListPools) => ReadonlyArray<PoolListItem>
  readonly poolStatus?: (name: PoolName) => PoolStatus
  readonly upgradeDataset?: (input: UpgradeDataset) => void
  readonly exists?: (input: Exists) => boolean
  readonly getVdevProperty?: (input: GetVdevProperty) => PropertyGetRow
  readonly getVdevProperties?: (input: GetVdevProperty) => ReadonlyArray<PropertyGetRow>
  readonly setVdevProperty?: (input: SetVdevProperty) => void
  readonly snaprangeSpace?: (input: SnaprangeSpace) => SendSpaceEstimate
  readonly createPool?: (input: CreatePool) => void
  readonly destroyPool?: (input: DestroyPool) => void
  readonly importPool?: (input: ImportPool) => void
  readonly exportPool?: (input: ExportPool) => void
  readonly reguidPool?: (input: ReguidPool) => void
  readonly upgradePool?: (input: UpgradePool) => void
  readonly labelClear?: (input: LabelClear) => void
  readonly checkpointPool?: (input: CheckpointPool) => void
  readonly send?: (input: Send) => Stream.Stream<Uint8Array>
  readonly sendSpace?: (input: Send) => SendSpaceEstimate
  readonly sendProgress?: (input: SendProgress) => SendProgressReport
  readonly receive?: <E>(input: Receive, stream: Stream.Stream<Uint8Array, E>) => void
  readonly abortReceive?: (input: AbortReceive) => void
  readonly trimPool?: (input: TrimPool) => void
  readonly initializePool?: (input: InitializePool) => void
  readonly clearPool?: (input: ClearPool) => void
  readonly reopenPool?: (input: ReopenPool) => void
  readonly syncPool?: (input: SyncPool) => void
  readonly scrub?: (input: Scrub) => void
  readonly resilver?: (input: Resilver) => void
  readonly hold?: (input: Hold) => void
  readonly holds?: (input: ListHolds) => ReadonlyArray<SnapshotHold>
  readonly release?: (input: Release) => void
  readonly createBookmark?: (input: CreateBookmark) => void
  readonly destroyBookmark?: (input: DestroyBookmark) => void
  readonly listBookmarks?: (options?: ListBookmarks) => ReadonlyArray<BookmarkListItem>
  readonly getBookmarkProps?: (input: GetBookmarkProps) => PropertyGetRow
  readonly mount?: (input: MountFilesystem) => void
  readonly unmount?: (input: UnmountFilesystem) => void
  readonly share?: (input: ShareFilesystem) => void
  readonly unshare?: (input: UnshareFilesystem) => void
  readonly loadKey?: (input: LoadKey) => void
  readonly unloadKey?: (input: UnloadKey) => void
  readonly changeKey?: (input: ChangeKey) => void
  readonly channelProgram?: (input: ChannelProgram) => ChannelProgramResult
  readonly redact?: (input: Redact) => void
  readonly waitFs?: (input: WaitFilesystem) => WaitResult
  readonly waitPool?: (input: WaitPool) => WaitResult
  readonly diff?: (input: Diff) => ReadonlyArray<DiffEntry>
  readonly version?: () => ZfsVersionInfo
  readonly zone?: (input: Zone) => void
  readonly unzone?: (input: Zone) => void
  readonly getBootenv?: (input: GetBootenv) => Bootenv
  readonly setBootenv?: (input: SetBootenv) => void
  readonly ddtPrune?: (input: DdtPrune) => void
  readonly condense?: (input: Condense) => void
  readonly events?: (input: Events) => Stream.Stream<PoolEvent>
  readonly eventsClear?: (input: EventsClear) => EventsCleared
  readonly eventsSeek?: (input: EventsSeek) => void
  readonly iostat?: (input: Iostat) => Stream.Stream<IostatSample>
  readonly history?: (input: History) => Stream.Stream<HistoryRecord>
  readonly prefetch?: (input: Prefetch) => void
  readonly allow?: (input: Allow) => void
  readonly unallow?: (input: Unallow) => void
  readonly listAllow?: (input: ListAllow) => ReadonlyArray<AllowListing>
  readonly userspace?: (input: Userspace) => ReadonlyArray<UserspaceRow>
  readonly groupspace?: (input: Userspace) => ReadonlyArray<UserspaceRow>
  readonly projectspace?: (input: Userspace) => ReadonlyArray<UserspaceRow>
  readonly project?: (input: Project) => ReadonlyArray<ProjectRow>
  readonly addVdevs?: (input: AddVdevs) => void
  readonly removeVdevs?: (input: RemoveVdevs) => void
  readonly attachVdev?: (input: AttachVdev) => void
  readonly detachVdev?: (input: DetachVdev) => void
  readonly replaceVdev?: (input: ReplaceVdev) => void
  readonly splitPool?: (input: SplitPool) => void
  readonly onlineVdevs?: (input: OnlineVdevs) => void
  readonly offlineVdevs?: (input: OfflineVdevs) => void
}

/**
 * Interpreter boundary. CLI and native both implement these operations.
 * Services must not build argv here. Inputs are Schema classes from `Args`.
 */
export class ZfsProtocol extends Context.Service<ZfsProtocol, {
  readonly listDatasets: (options?: ListDatasets) => Effect.Effect<ReadonlyArray<DatasetListItem>, Failure>
  readonly getProperty: (input: GetProperty) => Effect.Effect<PropertyGetRow, Failure>
  readonly getProperties: (input: GetProperty) => Effect.Effect<ReadonlyArray<PropertyGetRow>, Failure>
  readonly setProperty: (input: SetProperty) => Effect.Effect<void, Failure>
  readonly inheritProperty: (input: InheritProperty) => Effect.Effect<void, Failure>
  readonly createFilesystem: (input: CreateFilesystem) => Effect.Effect<void, Failure>
  readonly createVolume: (input: CreateVolume) => Effect.Effect<void, Failure>
  readonly destroy: (input: Destroy) => Effect.Effect<void, Failure>
  readonly createSnapshot: (input: CreateSnapshot) => Effect.Effect<void, Failure>
  readonly clone: (input: Clone) => Effect.Effect<void, Failure>
  readonly listSnapshots: (options?: ListSnapshots) => Effect.Effect<ReadonlyArray<SnapshotListItem>, Failure>
  readonly rollback: (input: Rollback) => Effect.Effect<void, Failure>
  readonly promote: (input: Promote) => Effect.Effect<void, Failure>
  readonly rename: (input: Rename) => Effect.Effect<void, Failure>
  readonly listPools: (options?: ListPools) => Effect.Effect<ReadonlyArray<PoolListItem>, Failure>
  readonly poolStatus: (input: StatusPool) => Effect.Effect<PoolStatus, Failure>
  readonly upgradeDataset: (input: UpgradeDataset) => Effect.Effect<void, Failure>
  readonly exists: (input: Exists) => Effect.Effect<boolean, Failure>
  readonly getVdevProperty: (input: GetVdevProperty) => Effect.Effect<PropertyGetRow, Failure>
  readonly getVdevProperties: (input: GetVdevProperty) => Effect.Effect<ReadonlyArray<PropertyGetRow>, Failure>
  readonly setVdevProperty: (input: SetVdevProperty) => Effect.Effect<void, Failure>
  readonly snaprangeSpace: (input: SnaprangeSpace) => Effect.Effect<SendSpaceEstimate, Failure>
  readonly createPool: (input: CreatePool) => Effect.Effect<void, Failure>
  readonly destroyPool: (input: DestroyPool) => Effect.Effect<void, Failure>
  readonly importPool: (input: ImportPool) => Effect.Effect<void, Failure>
  readonly exportPool: (input: ExportPool) => Effect.Effect<void, Failure>
  readonly reguidPool: (input: ReguidPool) => Effect.Effect<void, Failure>
  readonly upgradePool: (input: UpgradePool) => Effect.Effect<void, Failure>
  readonly labelClear: (input: LabelClear) => Effect.Effect<void, Failure>
  readonly checkpointPool: (input: CheckpointPool) => Effect.Effect<void, Failure>
  readonly send: (input: Send) => Stream.Stream<Uint8Array, Failure>
  readonly sendSpace: (input: Send) => Effect.Effect<SendSpaceEstimate, Failure>
  readonly sendProgress: (input: SendProgress) => Effect.Effect<SendProgressReport, Failure>
  readonly receive: <E>(
    input: Receive,
    stream: Stream.Stream<Uint8Array, E>
  ) => Effect.Effect<void, Failure | E>
  readonly abortReceive: (input: AbortReceive) => Effect.Effect<void, Failure>
  readonly trimPool: (input: TrimPool) => Effect.Effect<void, Failure>
  readonly initializePool: (input: InitializePool) => Effect.Effect<void, Failure>
  readonly clearPool: (input: ClearPool) => Effect.Effect<void, Failure>
  readonly reopenPool: (input: ReopenPool) => Effect.Effect<void, Failure>
  readonly syncPool: (input: SyncPool) => Effect.Effect<void, Failure>
  readonly scrub: (input: Scrub) => Effect.Effect<void, Failure>
  readonly resilver: (input: Resilver) => Effect.Effect<void, Failure>
  readonly hold: (input: Hold) => Effect.Effect<void, Failure>
  readonly holds: (input: ListHolds) => Effect.Effect<ReadonlyArray<SnapshotHold>, Failure>
  readonly release: (input: Release) => Effect.Effect<void, Failure>
  readonly createBookmark: (input: CreateBookmark) => Effect.Effect<void, Failure>
  readonly destroyBookmark: (input: DestroyBookmark) => Effect.Effect<void, Failure>
  readonly listBookmarks: (options?: ListBookmarks) => Effect.Effect<ReadonlyArray<BookmarkListItem>, Failure>
  readonly getBookmarkProps: (input: GetBookmarkProps) => Effect.Effect<PropertyGetRow, Failure>
  readonly mount: (input: MountFilesystem) => Effect.Effect<void, Failure>
  readonly unmount: (input: UnmountFilesystem) => Effect.Effect<void, Failure>
  readonly share: (input: ShareFilesystem) => Effect.Effect<void, Failure>
  readonly unshare: (input: UnshareFilesystem) => Effect.Effect<void, Failure>
  readonly loadKey: (input: LoadKey) => Effect.Effect<void, Failure>
  readonly unloadKey: (input: UnloadKey) => Effect.Effect<void, Failure>
  readonly changeKey: (input: ChangeKey) => Effect.Effect<void, Failure>
  readonly channelProgram: (input: ChannelProgram) => Effect.Effect<ChannelProgramResult, Failure>
  readonly redact: (input: Redact) => Effect.Effect<void, Failure>
  readonly waitFs: (input: WaitFilesystem) => Effect.Effect<WaitResult, Failure>
  readonly waitPool: (input: WaitPool) => Effect.Effect<WaitResult, Failure>
  readonly diff: (input: Diff) => Effect.Effect<ReadonlyArray<DiffEntry>, Failure>
  readonly version: () => Effect.Effect<ZfsVersionInfo, Failure>
  readonly zone: (input: Zone) => Effect.Effect<void, Failure>
  readonly unzone: (input: Zone) => Effect.Effect<void, Failure>
  readonly getBootenv: (input: GetBootenv) => Effect.Effect<Bootenv, Failure>
  readonly setBootenv: (input: SetBootenv) => Effect.Effect<void, Failure>
  readonly ddtPrune: (input: DdtPrune) => Effect.Effect<void, Failure>
  readonly condense: (input: Condense) => Effect.Effect<void, Failure>
  readonly events: (input: Events) => Stream.Stream<PoolEvent, Failure>
  readonly eventsClear: (input: EventsClear) => Effect.Effect<EventsCleared, Failure>
  readonly eventsSeek: (input: EventsSeek) => Effect.Effect<void, Failure>
  readonly iostat: (input: Iostat) => Stream.Stream<IostatSample, Failure>
  readonly history: (input: History) => Stream.Stream<HistoryRecord, Failure>
  readonly prefetch: (input: Prefetch) => Effect.Effect<void, Failure>
  readonly allow: (input: Allow) => Effect.Effect<void, Failure>
  readonly unallow: (input: Unallow) => Effect.Effect<void, Failure>
  readonly listAllow: (input: ListAllow) => Effect.Effect<ReadonlyArray<AllowListing>, Failure>
  readonly userspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly groupspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly projectspace: (input: Userspace) => Effect.Effect<ReadonlyArray<UserspaceRow>, Failure>
  readonly project: (input: Project) => Effect.Effect<ReadonlyArray<ProjectRow>, Failure>
  readonly addVdevs: (input: AddVdevs) => Effect.Effect<void, Failure>
  readonly removeVdevs: (input: RemoveVdevs) => Effect.Effect<void, Failure>
  readonly attachVdev: (input: AttachVdev) => Effect.Effect<void, Failure>
  readonly detachVdev: (input: DetachVdev) => Effect.Effect<void, Failure>
  readonly replaceVdev: (input: ReplaceVdev) => Effect.Effect<void, Failure>
  readonly splitPool: (input: SplitPool) => Effect.Effect<void, Failure>
  readonly onlineVdevs: (input: OnlineVdevs) => Effect.Effect<void, Failure>
  readonly offlineVdevs: (input: OfflineVdevs) => Effect.Effect<void, Failure>
}>()("effect-zfs/ZfsProtocol") {
  static readonly testLayer = (handlers: TestHandlers = {}): Layer.Layer<ZfsProtocol> =>
    Layer.succeed(
      ZfsProtocol,
      ZfsProtocol.of({
        listDatasets: (options) => Effect.succeed(handlers.listDatasets?.(options) ?? []),
        getProperty: (input) => {
          const row = handlers.getProperty?.(input) ?? handlers.getProperties?.(input)?.[0]
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Dataset.Get",
              cause: new Error(`test getProperty missing for ${input.name} ${input.property}`)
            }))
        },
        getProperties: (input) => {
          const rows = handlers.getProperties?.(input)
          if (rows !== undefined) return Effect.succeed(rows)
          const row = handlers.getProperty?.(input)
          return row
            ? Effect.succeed([row])
            : Effect.fail(new ZfsTransportError({
              operation: "Dataset.Get",
              cause: new Error(`test getProperties missing for ${input.name} ${input.property}`)
            }))
        },
        setProperty: (input) => Effect.sync(() => handlers.setProperty?.(input)),
        inheritProperty: (input) => Effect.sync(() => handlers.inheritProperty?.(input)),
        createFilesystem: (input) => Effect.sync(() => handlers.createFilesystem?.(input)),
        createVolume: (input) => Effect.sync(() => handlers.createVolume?.(input)),
        destroy: (input) => Effect.sync(() => handlers.destroy?.(input)),
        createSnapshot: (input) => Effect.sync(() => handlers.createSnapshot?.(input)),
        clone: (input) => Effect.sync(() => handlers.clone?.(input)),
        listSnapshots: (options) => Effect.succeed(handlers.listSnapshots?.(options) ?? []),
        rollback: (input) => Effect.sync(() => handlers.rollback?.(input)),
        promote: (input) => Effect.sync(() => handlers.promote?.(input)),
        rename: (input) => Effect.sync(() => handlers.rename?.(input)),
        listPools: (options) => Effect.succeed(handlers.listPools?.(options) ?? []),
        upgradeDataset: (input) => Effect.sync(() => handlers.upgradeDataset?.(input)),
        exists: (input) => Effect.succeed(handlers.exists?.(input) ?? false),
        getVdevProperty: (input) => {
          const row = handlers.getVdevProperty?.(input) ?? handlers.getVdevProperties?.(input)?.[0]
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Pool.GetVdev",
              cause: new Error(`test getVdevProperty missing for ${input.pool} ${input.vdev} ${input.property}`)
            }))
        },
        getVdevProperties: (input) => {
          const rows = handlers.getVdevProperties?.(input)
          if (rows !== undefined) return Effect.succeed(rows)
          const row = handlers.getVdevProperty?.(input)
          return row
            ? Effect.succeed([row])
            : Effect.fail(new ZfsTransportError({
              operation: "Pool.GetVdev",
              cause: new Error(`test getVdevProperties missing for ${input.pool} ${input.vdev} ${input.property}`)
            }))
        },
        setVdevProperty: (input) => Effect.sync(() => handlers.setVdevProperty?.(input)),
        snaprangeSpace: (input) => {
          const row = handlers.snaprangeSpace?.(input)
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Replication.SnaprangeSpace",
              cause: new Error(`test snaprangeSpace missing for ${input.first} ${input.last}`)
            }))
        },
        poolStatus: (input) => {
          const row = handlers.poolStatus?.(input.name)
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Pool.Status",
              cause: new Error(`test poolStatus missing for ${input.name}`)
            }))
        },
        createPool: (input) => Effect.sync(() => handlers.createPool?.(input)),
        destroyPool: (input) => Effect.sync(() => handlers.destroyPool?.(input)),
        importPool: (input) => Effect.sync(() => handlers.importPool?.(input)),
        exportPool: (input) => Effect.sync(() => handlers.exportPool?.(input)),
        reguidPool: (input) => Effect.sync(() => handlers.reguidPool?.(input)),
        upgradePool: (input) => Effect.sync(() => handlers.upgradePool?.(input)),
        labelClear: (input) => Effect.sync(() => handlers.labelClear?.(input)),
        checkpointPool: (input) => Effect.sync(() => handlers.checkpointPool?.(input)),
        send: (input) => handlers.send?.(input) ?? Stream.empty,
        sendSpace: (input) => {
          const row = handlers.sendSpace?.(input)
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Replication.SendSpace",
              cause: new Error("test sendSpace missing")
            }))
        },
        sendProgress: (input) => {
          const row = handlers.sendProgress?.(input)
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Replication.SendProgress",
              cause: new Error(`test sendProgress missing for ${input.snapshot}`)
            }))
        },
        receive: (input, stream) => Effect.sync(() => handlers.receive?.(input, stream)),
        abortReceive: (input) => Effect.sync(() => handlers.abortReceive?.(input)),
        trimPool: (input) => Effect.sync(() => handlers.trimPool?.(input)),
        initializePool: (input) => Effect.sync(() => handlers.initializePool?.(input)),
        clearPool: (input) => Effect.sync(() => handlers.clearPool?.(input)),
        reopenPool: (input) => Effect.sync(() => handlers.reopenPool?.(input)),
        syncPool: (input) => Effect.sync(() => handlers.syncPool?.(input)),
        scrub: (input) => Effect.sync(() => handlers.scrub?.(input)),
        resilver: (input) => Effect.sync(() => handlers.resilver?.(input)),
        hold: (input) => Effect.sync(() => handlers.hold?.(input)),
        holds: (input) => Effect.succeed(handlers.holds?.(input) ?? []),
        release: (input) => Effect.sync(() => handlers.release?.(input)),
        createBookmark: (input) => Effect.sync(() => handlers.createBookmark?.(input)),
        destroyBookmark: (input) => Effect.sync(() => handlers.destroyBookmark?.(input)),
        listBookmarks: (options) => Effect.succeed(handlers.listBookmarks?.(options) ?? []),
        getBookmarkProps: (input) => {
          const row = handlers.getBookmarkProps?.(input)
          return row
            ? Effect.succeed(row)
            : Effect.fail(new ZfsTransportError({
              operation: "Bookmark.Get",
              cause: new Error(`test getBookmarkProps missing for ${input.name} ${input.property}`)
            }))
        },
        loadKey: (input) => Effect.sync(() => handlers.loadKey?.(input)),
        unloadKey: (input) => Effect.sync(() => handlers.unloadKey?.(input)),
        changeKey: (input) => Effect.sync(() => handlers.changeKey?.(input)),
        mount: (input) => Effect.sync(() => handlers.mount?.(input)),
        unmount: (input) => Effect.sync(() => handlers.unmount?.(input)),
        share: (input) => Effect.sync(() => handlers.share?.(input)),
        unshare: (input) => Effect.sync(() => handlers.unshare?.(input)),
        channelProgram: (input) => Effect.succeed(handlers.channelProgram?.(input) ?? new ChannelProgramResult({ raw: "" })),
        redact: (input) => Effect.sync(() => handlers.redact?.(input)),
        waitFs: (input) => Effect.succeed(handlers.waitFs?.(input) ?? new WaitResult({})),
        waitPool: (input) => Effect.succeed(handlers.waitPool?.(input) ?? new WaitResult({})),
        diff: (input) => Effect.succeed(handlers.diff?.(input) ?? []),
        version: () => Effect.succeed(handlers.version?.() ?? new ZfsVersionInfo({
          userspace: new ZfsVersion({ major: 2, minor: 2, patch: 2, raw: "zfs-2.2.2" }),
          raw: "zfs-2.2.2"
        })),
        zone: (input) => Effect.sync(() => handlers.zone?.(input)),
        unzone: (input) => Effect.sync(() => handlers.unzone?.(input)),
        getBootenv: (input) => Effect.succeed(handlers.getBootenv?.(input) ?? new Bootenv({ pool: input.pool, raw: "", pairs: [] })),
        setBootenv: (input) => Effect.sync(() => handlers.setBootenv?.(input)),
        ddtPrune: (input) => Effect.sync(() => handlers.ddtPrune?.(input)),
        condense: (input) => Effect.sync(() => handlers.condense?.(input)),
        events: (input) => handlers.events?.(input) ?? Stream.empty,
        eventsClear: (input) => Effect.succeed(handlers.eventsClear?.(input) ?? new EventsCleared({ dropped: 0 })),
        eventsSeek: (input) => Effect.sync(() => handlers.eventsSeek?.(input)),
        iostat: (input) => handlers.iostat?.(input) ?? Stream.empty,
        history: (input) => handlers.history?.(input) ?? Stream.empty,
        prefetch: (input) => Effect.sync(() => handlers.prefetch?.(input)),
        allow: (input) => Effect.sync(() => handlers.allow?.(input)),
        unallow: (input) => Effect.sync(() => handlers.unallow?.(input)),
        listAllow: (input) => Effect.succeed(handlers.listAllow?.(input) ?? []),
        userspace: (input) => Effect.succeed(handlers.userspace?.(input) ?? []),
        groupspace: (input) => Effect.succeed(handlers.groupspace?.(input) ?? []),
        projectspace: (input) => Effect.succeed(handlers.projectspace?.(input) ?? []),
        project: (input) => Effect.succeed(handlers.project?.(input) ?? []),
        addVdevs: (input) => Effect.sync(() => handlers.addVdevs?.(input)),
        removeVdevs: (input) => Effect.sync(() => handlers.removeVdevs?.(input)),
        attachVdev: (input) => Effect.sync(() => handlers.attachVdev?.(input)),
        detachVdev: (input) => Effect.sync(() => handlers.detachVdev?.(input)),
        replaceVdev: (input) => Effect.sync(() => handlers.replaceVdev?.(input)),
        splitPool: (input) => Effect.sync(() => handlers.splitPool?.(input)),
        onlineVdevs: (input) => Effect.sync(() => handlers.onlineVdevs?.(input)),
        offlineVdevs: (input) => Effect.sync(() => handlers.offlineVdevs?.(input))
      })
    )
}
