import { Context, Effect, Layer } from "effect"
import type {
  AbsolutePath,
  DevicePath,
  NextObjResult,
  ObjPath,
  ObjStats,
  PropertyName,
  PropertySourceKind,
  PropertySort,
  WaitResult
} from "../args/index.js"
import {
  CreateFilesystem,
  CreateVolume,
  DatasetListItem,
  Destroy,
  EncodedProperty,
  Exists,
  GetProperty,
  InheritProperty,
  ListDatasets,
  NextObj,
  ObjToPath,
  ObjToStats,
  propertyName,
  Rename,
  Rewrite,
  SetProperty,
  UpgradeDataset,
  WaitFilesystem,
  Zone
} from "../args/index.js"
import {
  type CreateFilesystemProperties,
  type CreateVolumeProperties,
  DatasetProperty,
  type WritableFilesystemProperties,
  type WritableVolumeProperties
} from "../generated/properties.generated.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeCodec, decodeNameArg, decodePropertyArg } from "../schema/decode.js"
import { DatasetVersion, VolBlockSize, VolumeSize } from "../schema/limits.js"
import { Dataset, dataset, type DatasetKind, type KindedDataset, type PropertyGetRow } from "../schema/models.js"
import type { DatasetName, PoolName } from "../schema/name.js"
import {
  encodePropertyValue,
  type PropertyDefinition,
  type PropertyTarget,
  type PropertyValue,
  type ResolvedProperty,
  withDecodedPropertyRow
} from "../schema/property.js"

export { Dataset, dataset, DatasetListItem, type KindedDataset }

type PropertyMap = typeof DatasetProperty

export type WritableDatasetProperties<K extends DatasetKind> = K extends "filesystem"
  ? ConstructorParameters<typeof WritableFilesystemProperties>[0]
  : K extends "volume" ? ConstructorParameters<typeof WritableVolumeProperties>[0]
  : never

export type CreateDatasetProperties<K extends DatasetKind> = K extends "filesystem"
  ? ConstructorParameters<typeof CreateFilesystemProperties>[0]
  : K extends "volume" ? ConstructorParameters<typeof CreateVolumeProperties>[0]
  : never

export const encodeProperties = (
  properties: CreateDatasetProperties<any> | WritableDatasetProperties<any> | undefined
): ReadonlyArray<EncodedProperty> => {
  if (!properties) return []
  const out: Array<EncodedProperty> = []
  for (const [key, value] of Object.entries(properties)) {
    if (value === undefined) continue
    if (!Object.hasOwn(DatasetProperty, key)) continue
    const property = DatasetProperty[key as keyof PropertyMap]
    out.push(
      new EncodedProperty({
        name: propertyName(property.name),
        value: encodePropertyValue(property, value)
      })
    )
  }
  return out
}

const datasetNameOf = (value: Dataset | DatasetName): DatasetName => value instanceof Dataset ? value.name : value

export class Datasets extends Context.Service<Datasets, {
  readonly list: (
    options?: {
      readonly root?: DatasetName
      readonly recursive?: boolean
      readonly types?: ReadonlyArray<DatasetKind>
      readonly depth?: number
      readonly sort?: ReadonlyArray<PropertySort>
      readonly columns?: ReadonlyArray<PropertyName>
    }
  ) => Effect.Effect<ReadonlyArray<DatasetListItem>, Failure>
  readonly get: <P extends PropertyDefinition<string, any, any, any>>(
    dataset: Dataset | DatasetName,
    property: P
  ) => Effect.Effect<ResolvedProperty<PropertyValue<P>>, Failure>
  readonly getAll: (
    dataset: Dataset | DatasetName,
    options?: {
      readonly recursive?: boolean
      readonly depth?: number
      readonly types?: ReadonlyArray<DatasetKind>
      readonly sources?: ReadonlyArray<PropertySourceKind>
      readonly targets?: ReadonlyArray<DatasetName>
    }
  ) => Effect.Effect<ReadonlyArray<PropertyGetRow>, Failure>
  readonly setProperty: <
    K extends DatasetKind,
    P extends PropertyDefinition<string, any, any, "mutable" | "inheritable">
  >(
    dataset: KindedDataset<K> | DatasetName,
    property: P & (K extends PropertyTarget<P> ? unknown : never),
    value: PropertyValue<P>,
    options?: { readonly unmounted?: boolean; readonly targets?: ReadonlyArray<DatasetName> }
  ) => Effect.Effect<void, Failure>
  readonly set: <K extends DatasetKind>(
    dataset: KindedDataset<K>,
    properties: WritableDatasetProperties<K>,
    options?: { readonly unmounted?: boolean; readonly targets?: ReadonlyArray<DatasetName> }
  ) => Effect.Effect<void, Failure>
  readonly inherit: <P extends PropertyDefinition<string, any, any, "inheritable">>(
    dataset: Dataset | DatasetName,
    property: P,
    options?: {
      readonly recursive?: boolean
      readonly received?: boolean
      readonly targets?: ReadonlyArray<DatasetName>
    }
  ) => Effect.Effect<void, Failure>
  readonly createFilesystem: (input: {
    readonly name: DatasetName
    readonly parents?: boolean
    readonly properties?: CreateDatasetProperties<"filesystem">
    readonly dryRun?: boolean
    readonly parsable?: boolean
    readonly unmounted?: boolean
    readonly verbose?: boolean
  }) => Effect.Effect<KindedDataset<"filesystem">, Failure>
  readonly createVolume: (input: {
    readonly name: DatasetName
    readonly size: VolumeSize | bigint
    readonly sparse?: boolean
    readonly properties?: CreateDatasetProperties<"volume">
    readonly volblocksize?: VolBlockSize | bigint
    readonly dryRun?: boolean
    readonly parsable?: boolean
    readonly unmounted?: boolean
    readonly verbose?: boolean
  }) => Effect.Effect<KindedDataset<"volume">, Failure>
  readonly destroy: (
    dataset: Dataset | DatasetName,
    options?: {
      readonly recursive?: boolean
      readonly force?: boolean
      readonly descendants?: boolean
      readonly dryRun?: boolean
      readonly parsable?: boolean
      readonly verbose?: boolean
      readonly names?: readonly [Destroy["name"], ...Array<Destroy["name"]>]
    }
  ) => Effect.Effect<void, Failure>
  readonly upgrade: (
    dataset: Dataset | DatasetName | "all",
    options?: { readonly version?: DatasetVersion | number; readonly recursive?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly exists: (dataset: Dataset | DatasetName) => Effect.Effect<boolean, Failure>
  readonly rename: (
    dataset: Dataset | DatasetName,
    to: DatasetName,
    options?: { readonly parents?: boolean; readonly unmounted?: boolean; readonly force?: boolean }
  ) => Effect.Effect<Dataset, Failure>
  readonly wait: (
    dataset: Dataset | DatasetName,
    options?: { readonly activities?: ReadonlyArray<"deleteq"> }
  ) => Effect.Effect<WaitResult, Failure>
  readonly zone: (
    dataset: Dataset | DatasetName,
    namespace: DevicePath | string
  ) => Effect.Effect<void, Failure>
  readonly unzone: (
    dataset: Dataset | DatasetName,
    namespace: DevicePath | string
  ) => Effect.Effect<void, Failure>
  readonly objToPath: (
    pool: PoolName | string,
    datasetObject: bigint,
    object: bigint
  ) => Effect.Effect<ObjPath, Failure>
  readonly dsobjToName: (
    pool: PoolName | string,
    datasetObject: bigint,
    object: bigint
  ) => Effect.Effect<ObjPath, Failure>
  readonly nextObj: (
    dataset: Dataset | DatasetName,
    object?: bigint
  ) => Effect.Effect<NextObjResult, Failure>
  readonly objToStats: (
    dataset: Dataset | DatasetName,
    object: bigint
  ) => Effect.Effect<ObjStats, Failure>
  readonly rewrite: (
    files: readonly [AbsolutePath | string, ...Array<AbsolutePath | string>],
    options?: {
      readonly recursive?: boolean
      readonly verbose?: boolean
      readonly xdev?: boolean
      readonly physical?: boolean
      readonly skipSnapshot?: boolean
      readonly skipBrt?: boolean
      readonly offset?: bigint
      readonly length?: bigint
    }
  ) => Effect.Effect<void, Failure>
}>()("effect-zfs/Datasets") {
  static readonly layer = Layer.effect(
    Datasets,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const list = Effect.fn("Datasets.list")(function*(
        options: {
          readonly root?: DatasetName
          readonly recursive?: boolean
          readonly types?: ReadonlyArray<DatasetKind>
          readonly depth?: number
          readonly sort?: ReadonlyArray<PropertySort>
          readonly columns?: ReadonlyArray<PropertyName>
        } = {}
      ) {
        const args = yield* decodeNameArg("Dataset.List", ListDatasets, options)
        return yield* zfs.listDatasets(args)
      })

      const get = Effect.fn("Datasets.get")(function*<P extends PropertyDefinition<string, any, any, any>>(
        target: Dataset | DatasetName,
        property: P
      ) {
        const row = yield* zfs.getProperty(
          new GetProperty({
            scope: "dataset",
            name: datasetNameOf(target),
            property: propertyName(property.name)
          })
        )
        const value = yield* decodeCodec("Dataset.Get", property.schema, row.value)
        const received = row.received === undefined
          ? undefined
          : yield* decodeCodec("Dataset.Get", property.schema, row.received)
        const resolved: ResolvedProperty<PropertyValue<P>> = received === undefined
          ? { value, source: row.source }
          : { value, source: row.source, received }
        return resolved
      })

      const getAll = Effect.fn("Datasets.getAll")(function*(
        target: Dataset | DatasetName,
        options: {
          readonly recursive?: boolean
          readonly depth?: number
          readonly types?: ReadonlyArray<DatasetKind>
          readonly sources?: ReadonlyArray<PropertySourceKind>
          readonly targets?: ReadonlyArray<DatasetName>
        } = {}
      ) {
        const rows = yield* zfs.getProperties(
          new GetProperty({
            scope: "dataset",
            name: datasetNameOf(target),
            property: "all",
            ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
            ...(options.depth === undefined ? {} : { depth: options.depth }),
            ...(options.types === undefined ? {} : { types: options.types }),
            ...(options.sources === undefined ? {} : { sources: options.sources }),
            ...(options.targets === undefined ? {} : { targets: options.targets })
          })
        )
        return rows.map((row) => withDecodedPropertyRow(row, DatasetProperty))
      })

      const setProperty = Effect.fn("Datasets.setProperty")(function*<
        K extends DatasetKind,
        P extends PropertyDefinition<string, any, any, "mutable" | "inheritable">
      >(
        target: KindedDataset<K> | DatasetName,
        property: P & (K extends PropertyTarget<P> ? unknown : never),
        value: PropertyValue<P>,
        options: { readonly unmounted?: boolean; readonly targets?: ReadonlyArray<DatasetName> } = {}
      ) {
        yield* zfs.setProperty(
          new SetProperty({
            scope: "dataset",
            name: datasetNameOf(target),
            property: propertyName(property.name),
            value: encodePropertyValue(property, value),
            ...(options.unmounted === undefined ? {} : { unmounted: options.unmounted }),
            ...(options.targets === undefined ? {} : { targets: options.targets })
          })
        )
      })

      const set = Effect.fn("Datasets.set")(function*<K extends DatasetKind>(
        target: KindedDataset<K>,
        properties: WritableDatasetProperties<K>,
        options: { readonly unmounted?: boolean; readonly targets?: ReadonlyArray<DatasetName> } = {}
      ): Effect.fn.Return<void, Failure> {
        yield* Effect.forEach(
          encodeProperties(properties),
          (property): Effect.Effect<void, Failure> =>
            zfs.setProperty(
              new SetProperty({
                scope: "dataset",
                name: target.name,
                property: property.name,
                value: property.value,
                ...(options.unmounted === undefined ? {} : { unmounted: options.unmounted }),
                ...(options.targets === undefined ? {} : { targets: options.targets })
              })
            ),
          { discard: true }
        )
      })

      const inherit = Effect.fn("Datasets.inherit")(
        function*<P extends PropertyDefinition<string, any, any, "inheritable">>(
          target: Dataset | DatasetName,
          property: P,
          options: {
            readonly recursive?: boolean
            readonly received?: boolean
            readonly targets?: ReadonlyArray<DatasetName>
          } = {}
        ) {
          yield* zfs.inheritProperty(
            new InheritProperty({
              name: datasetNameOf(target),
              property: propertyName(property.name),
              ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
              ...(options.received === undefined ? {} : { received: options.received }),
              ...(options.targets === undefined ? {} : { targets: options.targets })
            })
          )
        }
      )

      const createFilesystem = Effect.fn("Datasets.createFilesystem")(function*(input: {
        readonly name: DatasetName
        readonly parents?: boolean
        readonly properties?: CreateDatasetProperties<"filesystem">
        readonly dryRun?: boolean
        readonly parsable?: boolean
        readonly unmounted?: boolean
        readonly verbose?: boolean
      }) {
        yield* zfs.createFilesystem(
          new CreateFilesystem({
            name: input.name,
            properties: encodeProperties(input.properties),
            ...(input.parents === undefined ? {} : { parents: input.parents }),
            ...(input.dryRun === undefined ? {} : { dryRun: input.dryRun }),
            ...(input.parsable === undefined ? {} : { parsable: input.parsable }),
            ...(input.unmounted === undefined ? {} : { unmounted: input.unmounted }),
            ...(input.verbose === undefined ? {} : { verbose: input.verbose })
          })
        )
        return dataset(input.name, "filesystem")
      })

      const createVolume = Effect.fn("Datasets.createVolume")(function*(input: {
        readonly name: DatasetName
        readonly size: VolumeSize | bigint
        readonly sparse?: boolean
        readonly properties?: CreateDatasetProperties<"volume">
        readonly volblocksize?: VolBlockSize | bigint
        readonly dryRun?: boolean
        readonly parsable?: boolean
        readonly unmounted?: boolean
        readonly verbose?: boolean
      }) {
        const size = yield* decodePropertyArg("Dataset.CreateVolume", VolumeSize, input.size)
        const volblocksize = input.volblocksize === undefined
          ? undefined
          : yield* decodePropertyArg("Dataset.CreateVolume", VolBlockSize, input.volblocksize)
        yield* zfs.createVolume(
          new CreateVolume({
            name: input.name,
            size,
            properties: encodeProperties(input.properties),
            ...(input.sparse === undefined ? {} : { sparse: input.sparse }),
            ...(volblocksize === undefined ? {} : { volblocksize }),
            ...(input.dryRun === undefined ? {} : { dryRun: input.dryRun }),
            ...(input.parsable === undefined ? {} : { parsable: input.parsable }),
            ...(input.unmounted === undefined ? {} : { unmounted: input.unmounted }),
            ...(input.verbose === undefined ? {} : { verbose: input.verbose })
          })
        )
        return dataset(input.name, "volume")
      })

      const destroy = Effect.fn("Datasets.destroy")(function*(
        target: Dataset | DatasetName,
        options: {
          readonly recursive?: boolean
          readonly force?: boolean
          readonly descendants?: boolean
          readonly dryRun?: boolean
          readonly parsable?: boolean
          readonly verbose?: boolean
          readonly names?: readonly [Destroy["name"], ...Array<Destroy["name"]>]
        } = {}
      ) {
        yield* zfs.destroy(
          new Destroy({
            name: datasetNameOf(target),
            ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
            ...(options.force === undefined ? {} : { force: options.force }),
            ...(options.descendants === undefined ? {} : { descendants: options.descendants }),
            ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
            ...(options.parsable === undefined ? {} : { parsable: options.parsable }),
            ...(options.verbose === undefined ? {} : { verbose: options.verbose }),
            ...(options.names === undefined ? {} : { names: options.names })
          })
        )
      })

      const upgrade = Effect.fn("Datasets.upgrade")(function*(
        target: Dataset | DatasetName | "all",
        options: { readonly version?: DatasetVersion | number; readonly recursive?: boolean } = {}
      ) {
        const version = options.version === undefined
          ? undefined
          : yield* decodePropertyArg("Dataset.Upgrade", DatasetVersion, options.version)
        const args = yield* decodeNameArg("Dataset.Upgrade", UpgradeDataset, {
          ...(target === "all" ? { all: true } : { name: datasetNameOf(target) }),
          ...(version === undefined ? {} : { version }),
          ...(options.recursive === undefined ? {} : { recursive: options.recursive })
        })
        yield* zfs.upgradeDataset(args)
      })

      const exists = Effect.fn("Datasets.exists")(function*(target: Dataset | DatasetName) {
        const args = yield* decodeNameArg("Dataset.Exists", Exists, { name: datasetNameOf(target) })
        return yield* zfs.exists(args)
      })

      const rename = Effect.fn("Datasets.rename")(function*(
        target: Dataset | DatasetName,
        to: DatasetName,
        options: { readonly parents?: boolean; readonly unmounted?: boolean; readonly force?: boolean } = {}
      ) {
        yield* zfs.rename(
          new Rename({
            from: datasetNameOf(target),
            to,
            ...(options.parents === undefined ? {} : { parents: options.parents }),
            ...(options.unmounted === undefined ? {} : { unmounted: options.unmounted }),
            ...(options.force === undefined ? {} : { force: options.force })
          })
        )
        return new Dataset({
          name: to,
          kind: target instanceof Dataset ? target.kind : "filesystem"
        })
      })

      const wait = Effect.fn("Datasets.wait")(function*(
        target: Dataset | DatasetName,
        options: { readonly activities?: ReadonlyArray<"deleteq"> } = {}
      ) {
        const args = yield* decodeNameArg("Dataset.Wait", WaitFilesystem, {
          dataset: datasetNameOf(target),
          ...(options.activities === undefined ? {} : { activities: options.activities })
        })
        return yield* zfs.waitFs(args)
      })

      const zone = Effect.fn("Datasets.zone")(function*(
        target: Dataset | DatasetName,
        namespace: DevicePath | string
      ) {
        const args = yield* decodeNameArg("Dataset.Zone", Zone, {
          dataset: datasetNameOf(target),
          namespace
        })
        yield* zfs.zone(args)
      })

      const unzone = Effect.fn("Datasets.unzone")(function*(
        target: Dataset | DatasetName,
        namespace: DevicePath | string
      ) {
        const args = yield* decodeNameArg("Dataset.Unzone", Zone, {
          dataset: datasetNameOf(target),
          namespace
        })
        yield* zfs.unzone(args)
      })

      const rewrite = Effect.fn("Datasets.rewrite")(function*(
        files: readonly [AbsolutePath | string, ...Array<AbsolutePath | string>],
        options: {
          readonly recursive?: boolean
          readonly verbose?: boolean
          readonly xdev?: boolean
          readonly physical?: boolean
          readonly skipSnapshot?: boolean
          readonly skipBrt?: boolean
          readonly offset?: bigint
          readonly length?: bigint
        } = {}
      ) {
        const args = yield* decodeNameArg("Dataset.Rewrite", Rewrite, {
          files: files.map((file) => String(file)),
          ...options
        })
        yield* zfs.rewrite(args)
      })

      const objToPath = Effect.fn("Datasets.objToPath")(function*(
        pool: PoolName | string,
        datasetObject: bigint,
        object: bigint
      ) {
        const args = yield* decodeNameArg("Dataset.ObjToPath", ObjToPath, {
          pool,
          datasetObject,
          object
        })
        return yield* zfs.objToPath(args)
      })

      const dsobjToName = Effect.fn("Datasets.dsobjToName")(function*(
        pool: PoolName | string,
        datasetObject: bigint,
        object: bigint
      ) {
        const args = yield* decodeNameArg("Dataset.DsobjToName", ObjToPath, {
          pool,
          datasetObject,
          object
        })
        return yield* zfs.dsobjToName(args)
      })

      const nextObj = Effect.fn("Datasets.nextObj")(function*(
        target: Dataset | DatasetName,
        object?: bigint
      ) {
        const args = yield* decodeNameArg("Dataset.NextObj", NextObj, {
          dataset: datasetNameOf(target),
          ...(object === undefined ? {} : { object })
        })
        return yield* zfs.nextObj(args)
      })

      const objToStats = Effect.fn("Datasets.objToStats")(function*(
        target: Dataset | DatasetName,
        object: bigint
      ) {
        const args = yield* decodeNameArg("Dataset.ObjToStats", ObjToStats, {
          dataset: datasetNameOf(target),
          object
        })
        return yield* zfs.objToStats(args)
      })

      return Datasets.of({
        list,
        get,
        getAll,
        setProperty,
        set,
        inherit,
        createFilesystem,
        createVolume,
        destroy,
        upgrade,
        exists,
        rename,
        wait,
        zone,
        unzone,
        rewrite,
        objToPath,
        dsobjToName,
        nextObj,
        objToStats
      })
    })
  )
}
