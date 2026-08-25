import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import { devicePath, File } from "../src/args/index.js"
import {
  DatasetAlreadyExists,
  DatasetNotFound,
  errorValueToCode,
  HoldTagExists,
  MountFailed
} from "../src/generated/errors.generated.js"
import { DatasetProperty } from "../src/generated/properties.generated.js"
import { layer } from "../src/index.js"
import {
  classifyNativeError,
  layerFrom,
  loadLinuxLzc,
  type NativeBindings,
  NativeFailure,
  unboundBindings
} from "../src/native/index.js"
import { spaMinDevSize } from "../src/schema/limits.js"
import { bookmarkName, datasetName, poolName, snapshotName } from "../src/schema/name.js"
import { Bookmarks } from "../src/services/bookmarks.js"
import { Datasets } from "../src/services/datasets.js"
import { Mount } from "../src/services/mount.js"
import { Pools } from "../src/services/pools.js"
import { Replication } from "../src/services/replication.js"
import { Snapshots } from "../src/services/snapshots.js"

const missing = (operation: string) =>
  Effect.fail(
    new NativeFailure({
      operation,
      code: "EZFS_NOENT",
      message: "no such dataset"
    })
  )

const bindings = (overrides: Partial<NativeBindings> = {}): NativeBindings => ({
  ...unboundBindings(),
  listDatasets: () => Effect.succeed([]),
  getProperty: () => missing("Dataset.Get"),
  getProperties: () => Effect.succeed([]),
  setProperty: () => Effect.void,
  inheritProperty: () => Effect.void,
  createFilesystem: () => Effect.void,
  createVolume: () => Effect.void,
  destroy: () => Effect.void,
  createSnapshot: () => Effect.void,
  clone: () => Effect.void,
  listSnapshots: () => Effect.succeed([]),
  rollback: () => Effect.void,
  promote: () => Effect.void,
  rename: () => Effect.void,
  listPools: () => Effect.succeed([]),
  poolStatus: () => missing("Pool.Status"),
  createPool: () =>
    Effect.fail(
      new NativeFailure({
        operation: "Pool.Create",
        code: "EZFS_EXISTS",
        message: "pool exists"
      })
    ),
  destroyPool: () => missing("Pool.Destroy"),
  send: () =>
    Stream.fail(
      new NativeFailure({
        operation: "Replication.Send",
        code: "EZFS_NOENT",
        message: "no such snapshot"
      })
    ),
  unshare: () =>
    Effect.fail(
      new NativeFailure({
        operation: "Mount.Unshare",
        code: "EZFS_SHAREFAILED",
        message: "native share not bound"
      })
    ),
  sendSpace: () => missing("Replication.SendSpace"),
  sendProgress: () => missing("Replication.SendProgress"),
  getBookmarkProps: () => missing("Bookmark.Get"),
  clearPool: () => missing("Pool.Clear"),
  eventsClear: () => missing("Pool.EventsClear"),
  waitPool: () => missing("Pool.Wait"),
  channelProgram: () => missing("Pool.Program"),
  waitFs: () => missing("Dataset.Wait"),
  version: () => missing("Zfs.Version"),
  getBootenv: () => missing("Pool.GetBootenv"),
  ...overrides
})

describe("native errno mapping", () => {
  it("does not load libzfs_core off Linux", () => {
    if (process.platform !== "linux") assert.isUndefined(loadLinuxLzc())
  })

  it("maps EZFS_NODEVICE to NoSuchDevice for Pool.Offline", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Pool.Offline",
        code: "EZFS_NODEVICE",
        message: "no such device in pool"
      })
    )
    assert.strictEqual(error._tag, "NoSuchDevice")
  })

  it("maps EZFS_NOENT to DatasetNotFound when the operation declares it", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Dataset.Get",
        code: "EZFS_NOENT",
        message: "no such dataset"
      })
    )
    assert.strictEqual(error._tag, "DatasetNotFound")
    assert.ok(error instanceof DatasetNotFound)
  })

  it("maps numeric libzfs_errno through errorValueToCode", () => {
    const noent = Object.entries(errorValueToCode).find(([, code]) => code === "EZFS_NOENT")
    assert.ok(noent)
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Dataset.Get",
        errno: Number(noent[0]),
        message: "missing"
      })
    )
    assert.strictEqual(error._tag, "DatasetNotFound")
  })

  it("does not promote a code the operation did not declare", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Dataset.List",
        code: "EZFS_EXISTS",
        message: "already exists"
      })
    )
    assert.strictEqual(error._tag, "UnknownZfsError")
  })

  it("maps EZFS_CHECKPOINT_EXISTS for Pool.Checkpoint and not for Pool.List", () => {
    const mapped = classifyNativeError(
      new NativeFailure({
        operation: "Pool.Checkpoint",
        code: "EZFS_CHECKPOINT_EXISTS",
        message: "checkpoint exists"
      })
    )
    assert.strictEqual(mapped._tag, "CheckpointExists")
    const undeclared = classifyNativeError(
      new NativeFailure({
        operation: "Pool.List",
        code: "EZFS_CHECKPOINT_EXISTS",
        message: "checkpoint exists"
      })
    )
    assert.strictEqual(undeclared._tag, "UnknownZfsError")
  })

  it("maps EZFS_CRYPTOFAILED to EncryptionFailure for Crypto.LoadKey", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Crypto.LoadKey",
        code: "EZFS_CRYPTOFAILED",
        message: "incorrect key"
      })
    )
    assert.strictEqual(error._tag, "EncryptionFailure")
  })

  it("maps EZFS_MOUNTFAILED to MountFailed for Mount.Mount", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Mount.Mount",
        code: "EZFS_MOUNTFAILED",
        message: "failed to mount dataset"
      })
    )
    assert.strictEqual(error._tag, "MountFailed")
    assert.ok(error instanceof MountFailed)
  })

  it("maps EZFS_REFTAG_HOLD to HoldTagExists for Snapshot.Hold", () => {
    const error = classifyNativeError(
      new NativeFailure({
        operation: "Snapshot.Hold",
        code: "EZFS_REFTAG_HOLD",
        message: "tag already exists on this dataset"
      })
    )
    assert.strictEqual(error._tag, "HoldTagExists")
    assert.ok(error instanceof HoldTagExists)
  })

  it.effect("layerFrom maps zpool_create EZFS_EXISTS through Pool.Create", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const error = yield* pools.create({
        name: poolName("tank"),
        vdevs: [new File({ path: devicePath("/tmp/a.img"), size: spaMinDevSize })]
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetAlreadyExists")
      assert.ok(error instanceof DatasetAlreadyExists)
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings({
        createPool: () =>
          Effect.fail(
            new NativeFailure({
              operation: "Pool.Create",
              code: "EZFS_EXISTS",
              message: "pool exists"
            })
          )
      })))))
    ))

  it.effect("layerFrom maps zpool_destroy EZFS_NOENT through Pool.Destroy", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const error = yield* pools.destroy(poolName("tank"), { force: true }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings({
        destroyPool: () => missing("Pool.Destroy")
      })))))
    ))

  it.effect("layerFrom exposes DatasetNotFound through Datasets.get", () =>
    Effect.gen(function*() {
      const datasets = yield* Datasets
      const error = yield* datasets.get(datasetName("tank/missing"), DatasetProperty.compression).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings()))))
    ))

  it.effect("layerFrom classifies rollback errno", () =>
    Effect.gen(function*() {
      const snapshots = yield* Snapshots
      const error = yield* snapshots.rollback(snapshotName(datasetName("tank/src"), "seed")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings({
        rollback: () => missing("Snapshot.Rollback")
      })))))
    ))

  it.effect("layerFrom classifies native mount errno", () =>
    Effect.gen(function*() {
      const mount = yield* Mount
      const error = yield* mount.mount({ name: datasetName("tank/data") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "MountFailed")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings({
        mount: () =>
          Effect.fail(
            new NativeFailure({
              operation: "Mount.Mount",
              code: "EZFS_MOUNTFAILED",
              message: "native mount not bound"
            })
          )
      })))))
    ))

  it.effect("layerFrom classifies native Pool.Clear errno", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const error = yield* pools.clear(poolName("tank")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings()))))
    ))

  it.effect("layerFrom classifies send stream errno", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const error = yield* replication.send(snapshotName(datasetName("tank/src"), "seed")).pipe(
        Stream.runDrain,
        Effect.flip
      )
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings()))))
    ))

  it.effect("layerFrom classifies sendSpace errno", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const error = yield* replication.sendSpace(snapshotName(datasetName("tank/src"), "seed")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings()))))
    ))

  it.effect("layerFrom exposes DatasetNotFound through Bookmarks.get", () =>
    Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const error = yield* bookmarks.get(
        bookmarkName(datasetName("tank/src"), "keep"),
        DatasetProperty.creation
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(bindings()))))
    ))

  it.effect("unboundBindings fails NativeFailure instead of silently succeeding", () =>
    Effect.gen(function*() {
      const datasets = yield* Datasets
      const error = yield* datasets.createFilesystem({ name: datasetName("tank/x") }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "UnknownZfsError")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(layerFrom(unboundBindings()))))
    ))
})
