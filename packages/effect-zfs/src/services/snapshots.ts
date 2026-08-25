import { Context, Effect, Layer } from "effect"
import type { DiffEntry } from "../args/index.js"
import {
  Clone,
  CreateSnapshot,
  Destroy,
  Diff,
  Hold,
  ListHolds,
  ListSnapshots,
  Promote,
  Release,
  Rename,
  Rollback,
  SnapshotHold,
  SnapshotListItem,
  Redact
} from "../args/index.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeNameArg } from "../schema/decode.js"
import { Dataset, Snapshot } from "../schema/models.js"
import type {
  BookmarkComponent,
  DatasetName,
  HoldTag,
  SnapshotName,
  SnapshotRange
} from "../schema/name.js"
import { snapshotDatasetName, snapshotName, SnapshotComponent } from "../schema/name.js"
import { type CreateDatasetProperties, encodeProperties } from "./datasets.js"

export { Snapshot }
export { SnapshotHold, SnapshotListItem }

const snapshotNameOf = (value: Snapshot | SnapshotListItem | SnapshotName): SnapshotName =>
  typeof value === "string" ? value : value.name

const destroyTargetOf = (value: Snapshot | SnapshotName | SnapshotRange) =>
  typeof value === "string" ? value : value.name

const datasetNameOf = (value: Dataset | DatasetName): DatasetName => value instanceof Dataset ? value.name : value

export class Snapshots extends Context.Service<Snapshots, {
  readonly create: (
    dataset: Dataset,
    name: SnapshotComponent | string,
    options?: {
      readonly recursive?: boolean
      readonly properties?: CreateDatasetProperties<"filesystem"> | CreateDatasetProperties<"volume">
      readonly snapshots?: readonly [SnapshotName, ...Array<SnapshotName>]
    }
  ) => Effect.Effect<Snapshot, Failure>
  readonly destroy: (
    snapshot: Snapshot | SnapshotName | SnapshotRange,
    options?: {
      readonly recursive?: boolean
      readonly defer?: boolean
      readonly descendants?: boolean
      readonly dryRun?: boolean
      readonly parsable?: boolean
      readonly verbose?: boolean
      readonly names?: readonly [SnapshotName, ...Array<SnapshotName>]
    }
  ) => Effect.Effect<void, Failure>
  readonly clone: (
    snapshot: Snapshot,
    target: DatasetName,
    properties?: CreateDatasetProperties<"filesystem"> | CreateDatasetProperties<"volume">,
    options?: { readonly parents?: boolean }
  ) => Effect.Effect<Dataset, Failure>
  readonly list: (
    options?: { readonly root?: DatasetName | SnapshotName; readonly recursive?: boolean }
  ) => Effect.Effect<ReadonlyArray<SnapshotListItem>, Failure>
  readonly rollback: (
    snapshot: Snapshot | SnapshotListItem | SnapshotName,
    options?: { readonly destroyRecent?: boolean; readonly destroyClones?: boolean; readonly force?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly promote: (clone: Dataset | DatasetName) => Effect.Effect<Dataset, Failure>
  readonly rename: (
    from: Snapshot | SnapshotListItem | SnapshotName,
    to: SnapshotName,
    options?: { readonly recursive?: boolean; readonly force?: boolean }
  ) => Effect.Effect<Snapshot, Failure>
  readonly hold: (
    snapshot: Snapshot | SnapshotName,
    tag: HoldTag | string,
    options?: { readonly recursive?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly holds: (
    snapshot: Snapshot | SnapshotName,
    options?: { readonly recursive?: boolean }
  ) => Effect.Effect<ReadonlyArray<SnapshotHold>, Failure>
  readonly release: (
    snapshot: Snapshot | SnapshotName,
    tag: HoldTag | string,
    options?: { readonly recursive?: boolean }
  ) => Effect.Effect<void, Failure>
  readonly redact: (
    snapshot: Snapshot | SnapshotName,
    bookmark: BookmarkComponent | string,
    snapshots: readonly [SnapshotName, ...Array<SnapshotName>]
  ) => Effect.Effect<void, Failure>
  readonly diff: (
    from: Snapshot | SnapshotName,
    options?: {
      readonly to?: SnapshotName | DatasetName
      readonly fileTypes?: boolean
      readonly timestamps?: boolean
    }
  ) => Effect.Effect<ReadonlyArray<DiffEntry>, Failure>
}>()("effect-zfs/Snapshots") {
  static readonly layer = Layer.effect(
    Snapshots,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const create = Effect.fn("Snapshots.create")(function*(
        target: Dataset,
        name: SnapshotComponent | string,
        options: {
          readonly recursive?: boolean
          readonly properties?: CreateDatasetProperties<"filesystem"> | CreateDatasetProperties<"volume">
          readonly snapshots?: readonly [SnapshotName, ...Array<SnapshotName>]
        } = {}
      ) {
        const component = yield* decodeNameArg("Snapshot.Create", SnapshotComponent, name)
        const full = snapshotName(target.name, component)
        const encoded = encodeProperties(options.properties)
        yield* zfs.createSnapshot(
          new CreateSnapshot({
            name: full,
            ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
            ...(encoded.length === 0 ? {} : { properties: encoded }),
            ...(options.snapshots === undefined ? {} : { snapshots: options.snapshots })
          })
        )
        return new Snapshot({ name: full, dataset: target })
      })

      const destroy = Effect.fn("Snapshots.destroy")(function*(
        target: Snapshot | SnapshotName | SnapshotRange,
        options: {
          readonly recursive?: boolean
          readonly defer?: boolean
          readonly descendants?: boolean
          readonly dryRun?: boolean
          readonly parsable?: boolean
          readonly verbose?: boolean
          readonly names?: readonly [SnapshotName, ...Array<SnapshotName>]
        } = {}
      ) {
        yield* zfs.destroy(
          new Destroy({
            name: destroyTargetOf(target),
            ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
            ...(options.defer === undefined ? {} : { defer: options.defer }),
            ...(options.descendants === undefined ? {} : { descendants: options.descendants }),
            ...(options.dryRun === undefined ? {} : { dryRun: options.dryRun }),
            ...(options.parsable === undefined ? {} : { parsable: options.parsable }),
            ...(options.verbose === undefined ? {} : { verbose: options.verbose }),
            ...(options.names === undefined ? {} : { names: options.names })
          })
        )
      })

      const clone = Effect.fn("Snapshots.clone")(function*(
        snapshot: Snapshot,
        target: DatasetName,
        properties?: CreateDatasetProperties<"filesystem"> | CreateDatasetProperties<"volume">,
        options: { readonly parents?: boolean } = {}
      ) {
        yield* zfs.clone(
          new Clone({
            snapshot: snapshot.name,
            target,
            properties: encodeProperties(properties),
            ...(options.parents === undefined ? {} : { parents: options.parents })
          })
        )
        return new Dataset({ name: target, kind: snapshot.dataset.kind })
      })

      const list = Effect.fn("Snapshots.list")(function*(
        options: { readonly root?: DatasetName | SnapshotName; readonly recursive?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Snapshot.List", ListSnapshots, options)
        return yield* zfs.listSnapshots(args)
      })

      const rollback = Effect.fn("Snapshots.rollback")(function*(
        target: Snapshot | SnapshotListItem | SnapshotName,
        options: { readonly destroyRecent?: boolean; readonly destroyClones?: boolean; readonly force?: boolean } = {}
      ) {
        yield* zfs.rollback(
          new Rollback({
            snapshot: snapshotNameOf(target),
            ...(options.destroyRecent === undefined ? {} : { destroyRecent: options.destroyRecent }),
            ...(options.destroyClones === undefined ? {} : { destroyClones: options.destroyClones }),
            ...(options.force === undefined ? {} : { force: options.force })
          })
        )
      })

      const promote = Effect.fn("Snapshots.promote")(function*(clone: Dataset | DatasetName) {
        yield* zfs.promote(new Promote({ name: datasetNameOf(clone) }))
        return clone instanceof Dataset ? clone : new Dataset({ name: clone, kind: "filesystem" })
      })

      const rename = Effect.fn("Snapshots.rename")(function*(
        target: Snapshot | SnapshotListItem | SnapshotName,
        to: SnapshotName,
        options: { readonly recursive?: boolean; readonly force?: boolean } = {}
      ) {
        yield* zfs.rename(
          new Rename({
            from: snapshotNameOf(target),
            to,
            ...(options.recursive === undefined ? {} : { recursive: options.recursive }),
            ...(options.force === undefined ? {} : { force: options.force })
          })
        )
        const parent = snapshotDatasetName(to)
        const dataset = target instanceof Snapshot
          ? new Dataset({ name: parent, kind: target.dataset.kind })
          : new Dataset({ name: parent, kind: "filesystem" })
        return new Snapshot({ name: to, dataset })
      })

      const hold = Effect.fn("Snapshots.hold")(function*(
        target: Snapshot | SnapshotName,
        tag: HoldTag | string,
        options: { readonly recursive?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Snapshot.Hold", Hold, {
          snapshot: snapshotNameOf(target),
          tag,
          ...(options.recursive === undefined ? {} : { recursive: options.recursive })
        })
        yield* zfs.hold(args)
      })

      const holds = Effect.fn("Snapshots.holds")(function*(
        target: Snapshot | SnapshotName,
        options: { readonly recursive?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Snapshot.Holds", ListHolds, {
          snapshot: snapshotNameOf(target),
          ...(options.recursive === undefined ? {} : { recursive: options.recursive })
        })
        return yield* zfs.holds(args)
      })

      const release = Effect.fn("Snapshots.release")(function*(
        target: Snapshot | SnapshotName,
        tag: HoldTag | string,
        options: { readonly recursive?: boolean } = {}
      ) {
        const args = yield* decodeNameArg("Snapshot.Release", Release, {
          snapshot: snapshotNameOf(target),
          tag,
          ...(options.recursive === undefined ? {} : { recursive: options.recursive })
        })
        yield* zfs.release(args)
      })

      const redact = Effect.fn("Snapshots.redact")(function*(
        target: Snapshot | SnapshotName,
        bookmark: BookmarkComponent | string,
        snapshots: readonly [SnapshotName, ...Array<SnapshotName>]
      ) {
        const args = yield* decodeNameArg("Snapshot.Redact", Redact, {
          snapshot: snapshotNameOf(target),
          bookmark,
          snapshots
        })
        yield* zfs.redact(args)
      })

      const diff = Effect.fn("Snapshots.diff")(function*(
        from: Snapshot | SnapshotName,
        options: {
          readonly to?: SnapshotName | DatasetName
          readonly fileTypes?: boolean
          readonly timestamps?: boolean
        } = {}
      ) {
        const args = yield* decodeNameArg("Dataset.Diff", Diff, {
          from: snapshotNameOf(from),
          ...(options.to === undefined ? {} : { to: options.to }),
          ...(options.fileTypes === undefined ? {} : { fileTypes: options.fileTypes }),
          ...(options.timestamps === undefined ? {} : { timestamps: options.timestamps })
        })
        return yield* zfs.diff(args)
      })

      return Snapshots.of({
        create,
        destroy,
        clone,
        list,
        rollback,
        promote,
        rename,
        hold,
        holds,
        release,
        redact,
        diff
      })
    })
  )
}
