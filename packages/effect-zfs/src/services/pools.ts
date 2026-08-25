import { Context, Effect, Layer, Schema, Stream } from "effect"
import type {
  Bootenv,
  BootenvPair,
  ChannelProgramResult,
  CondenseCommand,
  CondenseType,
  DdtPruneUnit,
  DevicePath,
  ErrorLogRow,
  EventsCleared,
  HistoryRecord,
  InjectKind,
  InjectRecord,
  IostatSample,
  PoolEvent,
  PoolInitializeCommand,
  PoolPrefetchType,
  PoolPropertyName,
  PoolTrimCommand,
  PoolWaitActivity,
  SampleCount,
  SampleInterval,
  ScrubCommand,
  SpecialPropertyName,
  Vdev,
  VdevPropertyName,
  WaitResult
} from "../args/index.js"
import {
  AddVdevs,
  Cache,
  AttachVdev,
  ChannelProgram,
  CheckpointPool,
  ClearFault,
  ClearPool,
  Condense,
  CreatePool,
  DataVdev,
  DdtPrune,
  DestroyPool,
  DetachVdev,
  EncodedProperty,
  ErrorLog,
  Events,
  EventsClear,
  eventsSeekEnd,
  EventsSeek,
  eventsSeekStart,
  ExportPool,
  FreezePool,
  GetBootenv,
  GetProperty,
  GetVdevProperty,
  History,
  ImportPool,
  InitializePool,
  InjectFault,
  Iostat,
  LabelClear,
  ListPools,
  Log,
  OfflineVdevs,
  OnlineVdevs,
  Prefetch,
  propertyName,
  ReguidPool,
  Remap,
  RemoveVdevs,
  ReopenPool,
  ReplaceVdev,
  Resilver,
  Scrub,
  SetBootenv,
  SetProperty,
  SetVdevFru,
  SetVdevPath,
  SetVdevProperty,
  Spare,
  SplitPool,
  StatusPool,
  SyncPool,
  TrimPool,
  UInt64,
  UpgradePool,
  VdevId,
  WaitPool
} from "../args/index.js"
import type {
  CreatePoolProperties as GeneratedCreatePoolProperties,
  WritablePoolProperties as GeneratedWritablePoolProperties,
  WritableVdevProperties as GeneratedWritableVdevProperties
} from "../generated/properties.generated.js"
import { PoolProperty, VdevProperty } from "../generated/properties.generated.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeCodec, decodeNameArg, decodePropertyArg } from "../schema/decode.js"
import type { ByteCount } from "../schema/limits.js"
import { Pool, PoolScan, type PoolStatus, type PropertyGetRow } from "../schema/models.js"
import type { DatasetName } from "../schema/name.js"
import { PoolName } from "../schema/name.js"
import {
  encodePropertyValue,
  type PropertyDefinition,
  type PropertyValue,
  type ResolvedProperty,
  withDecodedPropertyRow
} from "../schema/property.js"
import type { ZfsVersionInfo } from "../schema/version.js"
import { type CreateDatasetProperties, encodeProperties } from "./datasets.js"

export { Pool, PoolScan, type PoolStatus, type ScrubCommand }
export type { PoolInitializeCommand, PoolTrimCommand }
export { Cache, DataVdev, Disk, Draid, File, Log, Mirror, Raidz, Spare, Vdev, VdevLeaf } from "../args/index.js"

type PoolMap = typeof PoolProperty
type VdevMap = typeof VdevProperty
export type WritablePoolProperties = ConstructorParameters<typeof GeneratedWritablePoolProperties>[0]
export type CreatePoolProperties = ConstructorParameters<typeof GeneratedCreatePoolProperties>[0]
export type WritableVdevProperties = ConstructorParameters<typeof GeneratedWritableVdevProperties>[0]

const isVdevPropertyKey = (key: string): key is keyof VdevMap => Object.hasOwn(VdevProperty, key)

export const encodeVdevProperties = (
  properties: WritableVdevProperties | undefined
): ReadonlyArray<EncodedProperty> => {
  if (!properties) return []
  const out: Array<EncodedProperty> = []
  const record: { readonly [key: string]: unknown } = properties
  for (const key of Object.keys(record)) {
    if (!isVdevPropertyKey(key)) continue
    const value = record[key]
    if (value === undefined) continue
    const property = VdevProperty[key]
    out.push(
      new EncodedProperty({
        name: propertyName(property.name),
        value: encodePropertyValue(property, value)
      })
    )
  }
  return out
}

const isPoolPropertyKey = (key: string): key is keyof PoolMap => Object.hasOwn(PoolProperty, key)

export const encodePoolProperties = (
  properties: CreatePoolProperties | WritablePoolProperties | undefined
): ReadonlyArray<EncodedProperty> => {
  if (!properties) return []
  const out: Array<EncodedProperty> = []
  const record: { readonly [key: string]: unknown } = properties
  for (const key of Object.keys(record)) {
    if (!isPoolPropertyKey(key)) continue
    const value = record[key]
    if (value === undefined) continue
    const property = PoolProperty[key]
    out.push(
      new EncodedProperty({
        name: propertyName(property.name),
        value: encodePropertyValue(property, value)
      })
    )
  }
  return out
}

const poolNameOf = (value: Pool | PoolName): PoolName => value instanceof Pool ? value.name : value

export class Pools extends Context.Service<Pools, {
  readonly list: (options?: {
    readonly name?: PoolName
    readonly columns?: ReadonlyArray<PoolPropertyName | SpecialPropertyName>
  }) => Effect.Effect<ReadonlyArray<Pool>, Failure>
  readonly getVdev: <P extends PropertyDefinition<string, any, "vdev", any>>(
    pool: Pool | PoolName,
    vdev: VdevId | string,
    property: P
  ) => Effect.Effect<ResolvedProperty<PropertyValue<P>>, Failure>
  readonly getAllVdev: (
    pool: Pool | PoolName,
    vdev: VdevId | string
  ) => Effect.Effect<ReadonlyArray<PropertyGetRow>, Failure>
  readonly setVdev: (
    pool: Pool | PoolName,
    vdev: VdevId | string,
    properties: WritableVdevProperties
  ) => Effect.Effect<void, Failure>
  readonly get: <P extends PropertyDefinition<string, any, "pool", any>>(
    pool: Pool | PoolName,
    property: P
  ) => Effect.Effect<ResolvedProperty<PropertyValue<P>>, Failure>
  readonly getAll: (pool: Pool | PoolName) => Effect.Effect<ReadonlyArray<PropertyGetRow>, Failure>
  readonly set: (
    pool: Pool | PoolName,
    properties: WritablePoolProperties
  ) => Effect.Effect<void, Failure>
  readonly status: (pool: Pool | PoolName) => Effect.Effect<PoolStatus, Failure>
  readonly create: (input: {
    readonly name: PoolName
    readonly vdevs: readonly [DataVdev, ...Array<DataVdev>]
    readonly log?: Log
    readonly cache?: Cache
    readonly spare?: Spare
    readonly force?: boolean
    readonly properties?: CreatePoolProperties
    readonly filesystemProperties?: CreateDatasetProperties<"filesystem">
    readonly mountpoint?: string
  }) => Effect.Effect<Pool, Failure>
  readonly destroy: (
    pool: Pool | PoolName,
    options?: { readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly import: (input: {
    readonly name: PoolName
    readonly newName?: PoolName
    readonly searchDirs?: ReadonlyArray<string>
    readonly force?: boolean
    readonly unmounted?: boolean
    readonly missingLog?: boolean
    readonly destroyed?: boolean
    readonly temporary?: boolean
    readonly altroot?: string
    readonly rewindToCheckpoint?: boolean
    readonly properties?: WritablePoolProperties
  }) => Effect.Effect<void, Failure>
  readonly export: (
    pool: Pool | PoolName,
    options?: { readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly reguid: (
    pool: Pool | PoolName,
    options?: { readonly guid?: bigint }
  ) => Effect.Effect<void, Failure>
  readonly upgrade: (
    pool: Pool | PoolName,
    options?: { readonly version?: number }
  ) => Effect.Effect<void, Failure>
  readonly labelClear: (
    device: string,
    options?: { readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly checkpoint: (
    pool: Pool | PoolName,
    options?: { readonly discard?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly trim: (
    pool: Pool | PoolName,
    options?: {
      readonly command?: PoolTrimCommand
      readonly devices?: ReadonlyArray<string>
      readonly wait?: boolean
      readonly secure?: boolean
      readonly rate?: ByteCount | bigint
      readonly all?: boolean
    }
  ) => Effect.Effect<void, Failure>
  readonly initialize: (
    pool: Pool | PoolName,
    options?: {
      readonly command?: PoolInitializeCommand
      readonly devices?: ReadonlyArray<string>
      readonly wait?: boolean
      readonly all?: boolean
    }
  ) => Effect.Effect<void, Failure>
  readonly clear: (
    pool: Pool | PoolName,
    options?: {
      readonly devices?: ReadonlyArray<string>
      readonly rewind?: boolean
      readonly dryRun?: boolean
    }
  ) => Effect.Effect<void, Failure>
  readonly reopen: (
    pool: Pool | PoolName,
    options?: { readonly noRestart?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly sync: (
    pool: Pool | PoolName,
    options?: { readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly scrub: (
    pool: Pool | PoolName,
    command?: ScrubCommand,
    options?: {
      readonly all?: boolean
      readonly startAfter?: string
      readonly endBefore?: string
    }
  ) => Effect.Effect<void, Failure>
  readonly resilver: (
    pool: Pool | PoolName,
    options?: { readonly wait?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly events: (options?: {
    readonly pool?: Pool | PoolName
    readonly follow?: boolean
    readonly verbose?: boolean
  }) => Stream.Stream<PoolEvent, Failure>
  readonly eventsClear: () => Effect.Effect<EventsCleared, Failure>
  readonly eventsSeek: (eid: bigint | "start" | "end") => Effect.Effect<void, Failure>
  readonly iostat: (options?: {
    readonly pool?: Pool | PoolName
    readonly vdevs?: ReadonlyArray<string>
    readonly interval?: SampleInterval | number
    readonly count?: SampleCount | number
    readonly verbose?: boolean
    readonly skipSinceBoot?: boolean
  }) => Stream.Stream<IostatSample, Failure>
  readonly wait: (
    pool: Pool | PoolName,
    options?: { readonly activities?: ReadonlyArray<PoolWaitActivity> }
  ) => Effect.Effect<WaitResult, Failure>
  readonly history: (
    pool: Pool | PoolName,
    options?: { readonly internal?: boolean; readonly longFormat?: boolean }
  ) => Stream.Stream<HistoryRecord, Failure>
  readonly prefetch: (
    pool: Pool | PoolName,
    prefetchType?: PoolPrefetchType
  ) => Effect.Effect<void, Failure>
  readonly add: (
    pool: Pool | PoolName,
    vdevs: readonly [Vdev, ...Array<Vdev>],
    options?: {
      readonly force?: boolean
      readonly dryRun?: boolean
      readonly properties?: ReadonlyArray<EncodedProperty>
    }
  ) => Effect.Effect<void, Failure>
  readonly remove: (
    pool: Pool | PoolName,
    devices: ReadonlyArray<VdevId | string>,
    options?: { readonly cancel?: boolean; readonly dryRun?: boolean; readonly wait?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly attach: (
    pool: Pool | PoolName,
    device: VdevId | string,
    newDevice: DevicePath | string,
    options?: {
      readonly force?: boolean
      readonly sequential?: boolean
      readonly wait?: boolean
      readonly properties?: ReadonlyArray<EncodedProperty>
    }
  ) => Effect.Effect<void, Failure>
  readonly detach: (
    pool: Pool | PoolName,
    device: VdevId | string
  ) => Effect.Effect<void, Failure>
  readonly replace: (
    pool: Pool | PoolName,
    device: VdevId | string,
    newDevice?: DevicePath | string,
    options?: {
      readonly force?: boolean
      readonly sequential?: boolean
      readonly wait?: boolean
      readonly properties?: ReadonlyArray<EncodedProperty>
    }
  ) => Effect.Effect<void, Failure>
  readonly split: (
    pool: Pool | PoolName,
    newPool: PoolName,
    options?: {
      readonly devices?: ReadonlyArray<VdevId | string>
      readonly dryRun?: boolean
      readonly altroot?: DevicePath | string
      readonly properties?: ReadonlyArray<EncodedProperty>
    }
  ) => Effect.Effect<void, Failure>
  readonly online: (
    pool: Pool | PoolName,
    devices: readonly [VdevId | string, ...Array<VdevId | string>],
    options?: { readonly expand?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly offline: (
    pool: Pool | PoolName,
    devices: readonly [VdevId | string, ...Array<VdevId | string>],
    options?: { readonly temporary?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly program: (input: {
    readonly pool: Pool | PoolName
    readonly program: string
    readonly argv?: ReadonlyArray<string>
    readonly instructionLimit?: UInt64 | bigint
    readonly memoryLimit?: UInt64 | bigint
    readonly nosync?: boolean
  }) => Effect.Effect<ChannelProgramResult, Failure>
  readonly version: () => Effect.Effect<ZfsVersionInfo, Failure>
  readonly getBootenv: (pool: Pool | PoolName) => Effect.Effect<Bootenv, Failure>
  readonly setBootenv: (
    pool: Pool | PoolName,
    pairs: ReadonlyArray<BootenvPair>
  ) => Effect.Effect<void, Failure>
  readonly ddtPrune: (
    pool: Pool | PoolName,
    unit: DdtPruneUnit,
    amount: UInt64 | bigint
  ) => Effect.Effect<void, Failure>
  readonly freeze: (pool: Pool | PoolName) => Effect.Effect<void, Failure>
  readonly remap: (dataset: DatasetName | string) => Effect.Effect<void, Failure>
  readonly setVdevPath: (
    pool: Pool | PoolName,
    vdev: VdevId | string,
    path: string
  ) => Effect.Effect<void, Failure>
  readonly setVdevFru: (
    pool: Pool | PoolName,
    vdev: VdevId | string,
    fru: string
  ) => Effect.Effect<void, Failure>
  readonly injectFault: (input: {
    readonly pool: Pool | PoolName
    readonly kind: InjectKind
    readonly device?: string
    readonly object?: bigint
    readonly duration?: number
  }) => Effect.Effect<void, Failure>
  readonly clearFault: (id: bigint) => Effect.Effect<void, Failure>
  readonly listFaults: () => Effect.Effect<ReadonlyArray<InjectRecord>, Failure>
  readonly errorLog: (pool: Pool | PoolName) => Effect.Effect<ReadonlyArray<ErrorLogRow>, Failure>
  readonly condense: (
    pool: Pool | PoolName,
    options?: {
      readonly type?: CondenseType
      readonly command?: CondenseCommand
      readonly wait?: boolean
    }
  ) => Effect.Effect<void, Failure>
}>()("effect-zfs/Pools") {
  static readonly layer = Layer.effect(
    Pools,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const list = Effect.fn("Pools.list")(function*(options: {
        readonly name?: PoolName
        readonly columns?: ReadonlyArray<PoolPropertyName | SpecialPropertyName>
      } = {}) {
        const args = yield* decodeNameArg("Pool.List", ListPools, options)
        const rows = yield* zfs.listPools(args)
        return rows.map((row) =>
          new Pool({
            name: row.name,
            size: row.size,
            free: row.free,
            health: row.health
          })
        )
      })

      const get = Effect.fn("Pools.get")(function*<P extends PropertyDefinition<string, any, "pool", any>>(
        target: Pool | PoolName,
        property: P
      ) {
        const row = yield* zfs.getProperty(
          new GetProperty({
            scope: "pool",
            name: poolNameOf(target),
            property: propertyName(property.name)
          })
        )
        const value = yield* decodeCodec("Pool.Get", property.schema, row.value)
        const resolved: ResolvedProperty<PropertyValue<P>> = { value, source: row.source }
        return resolved
      })

      const getAll = Effect.fn("Pools.getAll")(function*(target: Pool | PoolName) {
        const rows = yield* zfs.getProperties(
          new GetProperty({
            scope: "pool",
            name: poolNameOf(target),
            property: "all"
          })
        )
        return rows.map((row) => withDecodedPropertyRow(row, PoolProperty))
      })

      const getVdev = Effect.fn("Pools.getVdev")(function*<P extends PropertyDefinition<string, any, "vdev", any>>(
        target: Pool | PoolName,
        vdev: VdevId | string,
        property: P
      ) {
        const device = yield* decodePropertyArg("Pool.GetVdev", VdevId, vdev)
        const row = yield* zfs.getVdevProperty(
          new GetVdevProperty({
            pool: poolNameOf(target),
            vdev: device,
            property: property.name as VdevPropertyName
          })
        )
        const value = yield* decodeCodec("Pool.GetVdev", property.schema, row.value)
        const resolved: ResolvedProperty<PropertyValue<P>> = { value, source: row.source }
        return resolved
      })

      const getAllVdev = Effect.fn("Pools.getAllVdev")(function*(
        target: Pool | PoolName,
        vdev: VdevId | string
      ) {
        const device = yield* decodePropertyArg("Pool.GetVdev", VdevId, vdev)
        const rows = yield* zfs.getVdevProperties(
          new GetVdevProperty({
            pool: poolNameOf(target),
            vdev: device,
            property: "all"
          })
        )
        return rows.map((row) => withDecodedPropertyRow(row, VdevProperty))
      })

      const setVdev = Effect.fn("Pools.setVdev")(function*(
        target: Pool | PoolName,
        vdev: VdevId | string,
        properties: WritableVdevProperties
      ) {
        const device = yield* decodePropertyArg("Pool.SetVdev", VdevId, vdev)
        const name = poolNameOf(target)
        yield* Effect.forEach(encodeVdevProperties(properties), (property) =>
          zfs.setVdevProperty(
            new SetVdevProperty({
              pool: name,
              vdev: device,
              property: property.name as VdevPropertyName,
              value: property.value
            })
          ), { discard: true })
      })

      const set = Effect.fn("Pools.set")(function*(target: Pool | PoolName, properties: WritablePoolProperties) {
        const name = poolNameOf(target)
        yield* Effect.forEach(encodePoolProperties(properties), (property) =>
          zfs.setProperty(
            new SetProperty({
              scope: "pool",
              name,
              property: property.name,
              value: property.value
            })
          ), { discard: true })
      })

      const status = Effect.fn("Pools.status")(function*(target: Pool | PoolName) {
        const args = yield* decodeNameArg("Pool.Status", StatusPool, { name: poolNameOf(target) })
        return yield* zfs.poolStatus(args)
      })

      const create = Effect.fn("Pools.create")(function*(input: {
        readonly name: PoolName
        readonly vdevs: readonly [DataVdev, ...Array<DataVdev>]
        readonly log?: Log
        readonly cache?: Cache
        readonly spare?: Spare
        readonly force?: boolean
        readonly properties?: CreatePoolProperties
        readonly filesystemProperties?: CreateDatasetProperties<"filesystem">
        readonly mountpoint?: string
      }) {
        const name = yield* decodeNameArg("Pool.Create", PoolName, input.name)
        const vdevs = yield* decodePropertyArg("Pool.Create", Schema.NonEmptyArray(DataVdev), input.vdevs)
        const log = input.log === undefined
          ? undefined
          : yield* decodePropertyArg("Pool.Create", Log, input.log)
        const cache = input.cache === undefined
          ? undefined
          : yield* decodePropertyArg("Pool.Create", Cache, input.cache)
        const spare = input.spare === undefined
          ? undefined
          : yield* decodePropertyArg("Pool.Create", Spare, input.spare)
        const mountpoint = input.mountpoint === undefined
          ? undefined
          : yield* decodeNameArg("Pool.Create", Schema.NonEmptyString, input.mountpoint)
        yield* zfs.createPool(
          new CreatePool({
            name,
            vdevs,
            properties: encodePoolProperties(input.properties),
            filesystemProperties: encodeProperties(input.filesystemProperties),
            ...(log === undefined ? {} : { log }),
            ...(cache === undefined ? {} : { cache }),
            ...(spare === undefined ? {} : { spare }),
            ...(input.force === undefined ? {} : { force: input.force }),
            ...(mountpoint === undefined ? {} : { mountpoint })
          })
        )
        const rows = yield* zfs.listPools(new ListPools({ name }))
        const found = rows.find((row) => row.name === name)
        if (found) {
          return new Pool({
            name: found.name,
            size: found.size,
            free: found.free,
            health: found.health
          })
        }
        return new Pool({
          name,
          size: 0n,
          free: 0n,
          health: "ONLINE"
        })
      })

      const destroy = Effect.fn("Pools.destroy")(function*(
        target: Pool | PoolName,
        options: { readonly force?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Destroy", DestroyPool, {
          name: poolNameOf(target),
          ...(options.force === undefined ? {} : { force: options.force })
        })
        yield* zfs.destroyPool(args)
      })

      const trim = Effect.fn("Pools.trim")(function*(
        target: Pool | PoolName,
        options: {
          readonly command?: PoolTrimCommand
          readonly devices?: ReadonlyArray<string>
          readonly wait?: boolean
          readonly secure?: boolean
          readonly rate?: ByteCount | bigint
          readonly all?: boolean
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Trim", TrimPool, {
          name: poolNameOf(target),
          ...(options.command === undefined ? {} : { command: options.command }),
          ...(options.devices === undefined ? {} : { devices: options.devices }),
          ...(options.wait === undefined ? {} : { wait: options.wait }),
          ...(options.secure === undefined ? {} : { secure: options.secure }),
          ...(options.rate === undefined ? {} : { rate: options.rate }),
          ...(options.all === undefined ? {} : { all: options.all })
        })
        yield* zfs.trimPool(args)
      })

      const initialize = Effect.fn("Pools.initialize")(function*(
        target: Pool | PoolName,
        options: {
          readonly command?: PoolInitializeCommand
          readonly devices?: ReadonlyArray<string>
          readonly wait?: boolean
          readonly all?: boolean
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Initialize", InitializePool, {
          name: poolNameOf(target),
          ...(options.command === undefined ? {} : { command: options.command }),
          ...(options.devices === undefined ? {} : { devices: options.devices }),
          ...(options.wait === undefined ? {} : { wait: options.wait }),
          ...(options.all === undefined ? {} : { all: options.all })
        })
        yield* zfs.initializePool(args)
      })

      const clear = Effect.fn("Pools.clear")(function*(
        target: Pool | PoolName,
        options: {
          readonly devices?: ReadonlyArray<string>
          readonly rewind?: boolean
          readonly dryRun?: boolean
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Clear", ClearPool, {
          name: poolNameOf(target),
          ...(options.devices === undefined ? {} : { devices: options.devices }),
          ...(options.rewind === undefined ? {} : { rewind: options.rewind }),
          ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun })
        })
        yield* zfs.clearPool(args)
      })

      const reopen = Effect.fn("Pools.reopen")(function*(
        target: Pool | PoolName,
        options: { readonly noRestart?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Reopen", ReopenPool, {
          name: poolNameOf(target),
          ...(options.noRestart === undefined ? {} : { noRestart: options.noRestart })
        })
        yield* zfs.reopenPool(args)
      })

      const sync = Effect.fn("Pools.sync")(function*(
        target: Pool | PoolName,
        options: { readonly force?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Sync", SyncPool, {
          name: poolNameOf(target),
          ...(options.force === undefined ? {} : { force: options.force })
        })
        yield* zfs.syncPool(args)
      })

      const scrub = Effect.fn("Pools.scrub")(function*(
        target: Pool | PoolName,
        command: ScrubCommand = "start",
        options: {
          readonly all?: boolean
          readonly startAfter?: string
          readonly endBefore?: string
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Scrub", Scrub, {
          name: poolNameOf(target),
          command,
          ...(options.all === undefined ? {} : { all: options.all }),
          ...(options.startAfter === undefined ? {} : { startAfter: options.startAfter }),
          ...(options.endBefore === undefined ? {} : { endBefore: options.endBefore })
        })
        yield* zfs.scrub(args)
      })

      const resilver = Effect.fn("Pools.resilver")(function*(
        target: Pool | PoolName,
        options: { readonly wait?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Resilver", Resilver, {
          name: poolNameOf(target),
          ...(options.wait === undefined ? {} : { wait: options.wait })
        })
        yield* zfs.resilver(args)
      })

      const importPool = Effect.fn("Pools.import")(function*(input: {
        readonly name: PoolName
        readonly newName?: PoolName
        readonly searchDirs?: ReadonlyArray<string>
        readonly force?: boolean
        readonly unmounted?: boolean
        readonly missingLog?: boolean
        readonly destroyed?: boolean
        readonly temporary?: boolean
        readonly altroot?: string
        readonly rewindToCheckpoint?: boolean
        readonly properties?: WritablePoolProperties
      }) {
        const encoded = encodePoolProperties(input.properties)
        const args = yield* decodeNameArg("Pool.Import", ImportPool, {
          name: input.name,
          ...(input.newName === undefined ? {} : { newName: input.newName }),
          ...(input.searchDirs === undefined ? {} : { searchDirs: input.searchDirs }),
          ...(input.force === undefined ? {} : { force: input.force }),
          ...(input.unmounted === undefined ? {} : { unmounted: input.unmounted }),
          ...(input.missingLog === undefined ? {} : { missingLog: input.missingLog }),
          ...(input.destroyed === undefined ? {} : { destroyed: input.destroyed }),
          ...(input.temporary === undefined ? {} : { temporary: input.temporary }),
          ...(input.altroot === undefined ? {} : { altroot: input.altroot }),
          ...(input.rewindToCheckpoint === undefined ? {} : { rewindToCheckpoint: input.rewindToCheckpoint }),
          ...(encoded.length === 0 ? {} : { properties: encoded })
        })
        yield* zfs.importPool(args)
      })

      const exportPool = Effect.fn("Pools.export")(function*(
        target: Pool | PoolName,
        options: { readonly force?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Export", ExportPool, {
          name: poolNameOf(target),
          ...(options.force === undefined ? {} : { force: options.force })
        })
        yield* zfs.exportPool(args)
      })

      const reguid = Effect.fn("Pools.reguid")(function*(
        target: Pool | PoolName,
        options: { readonly guid?: bigint } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Reguid", ReguidPool, {
          name: poolNameOf(target),
          ...(options.guid === undefined ? {} : { guid: options.guid })
        })
        yield* zfs.reguidPool(args)
      })

      const upgrade = Effect.fn("Pools.upgrade")(function*(
        target: Pool | PoolName,
        options: { readonly version?: number } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Upgrade", UpgradePool, {
          name: poolNameOf(target),
          ...(options.version === undefined ? {} : { version: options.version })
        })
        yield* zfs.upgradePool(args)
      })

      const labelClear = Effect.fn("Pools.labelClear")(function*(
        device: string,
        options: { readonly force?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.LabelClear", LabelClear, {
          device,
          ...(options.force === undefined ? {} : { force: options.force })
        })
        yield* zfs.labelClear(args)
      })

      const checkpoint = Effect.fn("Pools.checkpoint")(function*(
        target: Pool | PoolName,
        options: { readonly discard?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Checkpoint", CheckpointPool, {
          name: poolNameOf(target),
          ...(options.discard === undefined ? {} : { discard: options.discard })
        })
        yield* zfs.checkpointPool(args)
      })

      const events = (
        options: {
          readonly pool?: Pool | PoolName
          readonly follow?: boolean
          readonly verbose?: boolean
        } = {}
      ): Stream.Stream<PoolEvent, Failure> =>
        Stream.unwrap(
          decodeNameArg("Pool.Events", Events, {
            ...(options.pool === undefined ? {} : { name: poolNameOf(options.pool) }),
            ...(options.follow === undefined ? {} : { follow: options.follow }),
            ...(options.verbose === undefined ? {} : { verbose: options.verbose })
          }).pipe(Effect.map((args) => zfs.events(args)))
        )

      const eventsClear = Effect.fn("Pools.eventsClear")(function*() {
        return yield* zfs.eventsClear(new EventsClear({}))
      })

      const eventsSeek = Effect.fn("Pools.eventsSeek")(function*(eid: bigint | "start" | "end") {
        const raw = eid === "start" ? eventsSeekStart : eid === "end" ? eventsSeekEnd : eid
        const args = yield* decodeNameArg("Pool.EventsSeek", EventsSeek, { eid: raw })
        yield* zfs.eventsSeek(args)
      })

      const iostat = (
        options: {
          readonly pool?: Pool | PoolName
          readonly vdevs?: ReadonlyArray<string>
          readonly interval?: SampleInterval | number
          readonly count?: SampleCount | number
          readonly verbose?: boolean
          readonly skipSinceBoot?: boolean
        } = {}
      ): Stream.Stream<IostatSample, Failure> =>
        Stream.unwrap(
          decodeNameArg("Pool.Iostat", Iostat, {
            ...(options.pool === undefined ? {} : { name: poolNameOf(options.pool) }),
            ...(options.vdevs === undefined ? {} : { vdevs: options.vdevs }),
            ...(options.interval === undefined ? {} : { interval: options.interval }),
            ...(options.count === undefined ? {} : { count: options.count }),
            ...(options.verbose === undefined ? {} : { verbose: options.verbose }),
            ...(options.skipSinceBoot === undefined ? {} : { skipSinceBoot: options.skipSinceBoot })
          }).pipe(Effect.map((args) => zfs.iostat(args)))
        )

      const wait = Effect.fn("Pools.wait")(function*(
        target: Pool | PoolName,
        options: { readonly activities?: ReadonlyArray<PoolWaitActivity> } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Wait", WaitPool, {
          pool: poolNameOf(target),
          ...(options.activities === undefined ? {} : { activities: options.activities })
        })
        return yield* zfs.waitPool(args)
      })

      const history = (
        target: Pool | PoolName,
        options: { readonly internal?: boolean; readonly longFormat?: boolean } = {}
      ): Stream.Stream<HistoryRecord, Failure> =>
        Stream.unwrap(
          decodeNameArg("Pool.History", History, {
            name: poolNameOf(target),
            ...(options.internal === undefined ? {} : { internal: options.internal }),
            ...(options.longFormat === undefined ? {} : { longFormat: options.longFormat })
          }).pipe(Effect.map((args) => zfs.history(args)))
        )

      const prefetch = Effect.fn("Pools.prefetch")(function*(
        target: Pool | PoolName,
        prefetchType?: PoolPrefetchType
      ) {
        const args = yield* decodeNameArg("Pool.Prefetch", Prefetch, {
          name: poolNameOf(target),
          ...(prefetchType === undefined ? {} : { prefetchType })
        })
        yield* zfs.prefetch(args)
      })

      const add = Effect.fn("Pools.add")(function*(
        target: Pool | PoolName,
        vdevs: readonly [Vdev, ...Array<Vdev>],
        options: {
          readonly force?: boolean
          readonly dryRun?: boolean
          readonly properties?: ReadonlyArray<EncodedProperty>
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Add", AddVdevs, {
          pool: poolNameOf(target),
          vdevs,
          properties: options.properties ?? [],
          ...(options.force === undefined ? {} : { force: options.force }),
          ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun })
        })
        yield* zfs.addVdevs(args)
      })

      const remove = Effect.fn("Pools.remove")(function*(
        target: Pool | PoolName,
        devices: ReadonlyArray<VdevId | string>,
        options: { readonly cancel?: boolean; readonly dryRun?: boolean; readonly wait?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Remove", RemoveVdevs, {
          pool: poolNameOf(target),
          devices,
          ...(options.cancel === undefined ? {} : { cancel: options.cancel }),
          ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
          ...(options.wait === undefined ? {} : { wait: options.wait })
        })
        yield* zfs.removeVdevs(args)
      })

      const attach = Effect.fn("Pools.attach")(function*(
        target: Pool | PoolName,
        device: VdevId | string,
        newDevice: DevicePath | string,
        options: {
          readonly force?: boolean
          readonly sequential?: boolean
          readonly wait?: boolean
          readonly properties?: ReadonlyArray<EncodedProperty>
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Attach", AttachVdev, {
          pool: poolNameOf(target),
          device,
          newDevice,
          properties: options.properties ?? [],
          ...(options.force === undefined ? {} : { force: options.force }),
          ...(options.sequential === undefined ? {} : { sequential: options.sequential }),
          ...(options.wait === undefined ? {} : { wait: options.wait })
        })
        yield* zfs.attachVdev(args)
      })

      const detach = Effect.fn("Pools.detach")(function*(
        target: Pool | PoolName,
        device: VdevId | string
      ) {
        const args = yield* decodeNameArg("Pool.Detach", DetachVdev, {
          pool: poolNameOf(target),
          device
        })
        yield* zfs.detachVdev(args)
      })

      const replace = Effect.fn("Pools.replace")(function*(
        target: Pool | PoolName,
        device: VdevId | string,
        newDevice?: DevicePath | string,
        options: {
          readonly force?: boolean
          readonly sequential?: boolean
          readonly wait?: boolean
          readonly properties?: ReadonlyArray<EncodedProperty>
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Replace", ReplaceVdev, {
          pool: poolNameOf(target),
          device,
          properties: options.properties ?? [],
          ...(newDevice === undefined ? {} : { newDevice }),
          ...(options.force === undefined ? {} : { force: options.force }),
          ...(options.sequential === undefined ? {} : { sequential: options.sequential }),
          ...(options.wait === undefined ? {} : { wait: options.wait })
        })
        yield* zfs.replaceVdev(args)
      })

      const split = Effect.fn("Pools.split")(function*(
        target: Pool | PoolName,
        newPool: PoolName,
        options: {
          readonly devices?: ReadonlyArray<VdevId | string>
          readonly dryRun?: boolean
          readonly altroot?: DevicePath | string
          readonly properties?: ReadonlyArray<EncodedProperty>
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Split", SplitPool, {
          pool: poolNameOf(target),
          newPool,
          properties: options.properties ?? [],
          ...(options.devices === undefined ? {} : { devices: options.devices }),
          ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
          ...(options.altroot === undefined ? {} : { altroot: options.altroot })
        })
        yield* zfs.splitPool(args)
      })

      const online = Effect.fn("Pools.online")(function*(
        target: Pool | PoolName,
        devices: readonly [VdevId | string, ...Array<VdevId | string>],
        options: { readonly expand?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Online", OnlineVdevs, {
          pool: poolNameOf(target),
          devices,
          ...(options.expand === undefined ? {} : { expand: options.expand })
        })
        yield* zfs.onlineVdevs(args)
      })

      const offline = Effect.fn("Pools.offline")(function*(
        target: Pool | PoolName,
        devices: readonly [VdevId | string, ...Array<VdevId | string>],
        options: { readonly temporary?: boolean; readonly force?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Offline", OfflineVdevs, {
          pool: poolNameOf(target),
          devices,
          ...(options.temporary === undefined ? {} : { temporary: options.temporary }),
          ...(options.force === undefined ? {} : { force: options.force })
        })
        yield* zfs.offlineVdevs(args)
      })

      const program = Effect.fn("Pools.program")(function*(input: {
        readonly pool: Pool | PoolName
        readonly program: string
        readonly argv?: ReadonlyArray<string>
        readonly instructionLimit?: UInt64 | bigint
        readonly memoryLimit?: UInt64 | bigint
        readonly nosync?: boolean
      }) {
        const instructionLimit = input.instructionLimit === undefined
          ? undefined
          : yield* decodePropertyArg("Pool.Program", UInt64, input.instructionLimit)
        const memoryLimit = input.memoryLimit === undefined
          ? undefined
          : yield* decodePropertyArg("Pool.Program", UInt64, input.memoryLimit)
        const args = yield* decodeNameArg("Pool.Program", ChannelProgram, {
          pool: poolNameOf(input.pool),
          program: input.program,
          ...(input.argv === undefined ? {} : { argv: input.argv }),
          ...(instructionLimit === undefined ? {} : { instructionLimit }),
          ...(memoryLimit === undefined ? {} : { memoryLimit }),
          ...(input.nosync === undefined ? {} : { nosync: input.nosync })
        })
        return yield* zfs.channelProgram(args)
      })

      const version = Effect.fn("Pools.version")(function*() {
        return yield* zfs.version()
      })

      const getBootenv = Effect.fn("Pools.getBootenv")(function*(target: Pool | PoolName) {
        const args = yield* decodeNameArg("Pool.GetBootenv", GetBootenv, { pool: poolNameOf(target) })
        return yield* zfs.getBootenv(args)
      })

      const setBootenv = Effect.fn("Pools.setBootenv")(function*(
        target: Pool | PoolName,
        pairs: ReadonlyArray<BootenvPair>
      ) {
        const args = yield* decodeNameArg("Pool.SetBootenv", SetBootenv, {
          pool: poolNameOf(target),
          pairs
        })
        yield* zfs.setBootenv(args)
      })

      const ddtPrune = Effect.fn("Pools.ddtPrune")(function*(
        target: Pool | PoolName,
        unit: DdtPruneUnit,
        amount: UInt64 | bigint
      ) {
        const decoded = yield* decodePropertyArg("Pool.DdtPrune", UInt64, amount)
        const args = yield* decodeNameArg("Pool.DdtPrune", DdtPrune, {
          pool: poolNameOf(target),
          unit,
          amount: decoded
        })
        yield* zfs.ddtPrune(args)
      })

      const condense = Effect.fn("Pools.condense")(function*(
        target: Pool | PoolName,
        options: {
          readonly type?: CondenseType
          readonly command?: CondenseCommand
          readonly wait?: boolean
        } = {}
      ) {
        const args = yield* decodeNameArg("Pool.Condense", Condense, {
          pool: poolNameOf(target),
          ...(options.type === undefined ? {} : { type: options.type }),
          ...(options.command === undefined ? {} : { command: options.command }),
          ...(options.wait === undefined ? {} : { wait: options.wait })
        })
        yield* zfs.condense(args)
      })

      const freeze = Effect.fn("Pools.freeze")(function*(target: Pool | PoolName) {
        const args = yield* decodeNameArg("Pool.Freeze", FreezePool, { name: poolNameOf(target) })
        yield* zfs.freezePool(args)
      })

      const remap = Effect.fn("Pools.remap")(function*(dataset: DatasetName | string) {
        const args = yield* decodeNameArg("Pool.Remap", Remap, { name: dataset })
        yield* zfs.remap(args)
      })

      const setVdevPath = Effect.fn("Pools.setVdevPath")(function*(
        target: Pool | PoolName,
        vdev: VdevId | string,
        path: string
      ) {
        const args = yield* decodeNameArg("Pool.SetVdevPath", SetVdevPath, {
          pool: poolNameOf(target),
          vdev,
          path
        })
        yield* zfs.setVdevPath(args)
      })

      const setVdevFru = Effect.fn("Pools.setVdevFru")(function*(
        target: Pool | PoolName,
        vdev: VdevId | string,
        fru: string
      ) {
        const args = yield* decodeNameArg("Pool.SetVdevFru", SetVdevFru, {
          pool: poolNameOf(target),
          vdev,
          fru
        })
        yield* zfs.setVdevFru(args)
      })

      const injectFault = Effect.fn("Pools.injectFault")(function*(input: {
        readonly pool: Pool | PoolName
        readonly kind: InjectKind
        readonly device?: string
        readonly object?: bigint
        readonly duration?: number
      }) {
        const args = yield* decodeNameArg("Pool.InjectFault", InjectFault, {
          pool: poolNameOf(input.pool),
          kind: input.kind,
          ...(input.device === undefined ? {} : { device: input.device }),
          ...(input.object === undefined ? {} : { object: input.object }),
          ...(input.duration === undefined ? {} : { duration: input.duration })
        })
        yield* zfs.injectFault(args)
      })

      const clearFault = Effect.fn("Pools.clearFault")(function*(id: bigint) {
        const args = yield* decodeNameArg("Pool.ClearFault", ClearFault, { id })
        yield* zfs.clearFault(args)
      })

      const listFaults = Effect.fn("Pools.listFaults")(function*() {
        return yield* zfs.listFaults()
      })

      const errorLog = Effect.fn("Pools.errorLog")(function*(target: Pool | PoolName) {
        const args = yield* decodeNameArg("Pool.ErrorLog", ErrorLog, { name: poolNameOf(target) })
        return yield* zfs.errorLog(args)
      })

      return Pools.of({
        list,
        get,
        getAll,
        getVdev,
        getAllVdev,
        setVdev,
        set,
        status,
        create,
        destroy,
        import: importPool,
        export: exportPool,
        reguid,
        upgrade,
        labelClear,
        checkpoint,
        trim,
        initialize,
        clear,
        reopen,
        sync,
        scrub,
        resilver,
        events,
        eventsClear,
        eventsSeek,
        iostat,
        wait,
        history,
        prefetch,
        add,
        remove,
        attach,
        detach,
        replace,
        split,
        online,
        offline,
        program,
        version,
        getBootenv,
        setBootenv,
        ddtPrune,
        condense,
        freeze,
        remap,
        setVdevPath,
        setVdevFru,
        injectFault,
        clearFault,
        listFaults,
        errorLog
      })
    })
  )
}
