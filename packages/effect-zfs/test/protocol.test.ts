import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { Datasets } from "../src/Dataset.js"
import { Mount } from "../src/Mount.js"
import { Pools } from "../src/Pool.js"
import { Snapshots } from "../src/Snapshot.js"
import { DatasetListItem, File, PoolListItem, SnapshotHold, SnapshotListItem, devicePath } from "../src/Args.js"
import { byteCount, spaMinDevSize } from "../src/Limits.js"
import { datasetName, holdTag, poolName, snapshotName } from "../src/Name.js"
import { DatasetProperty } from "../src/generated/properties.generated.js"
import { PropertyGetRow } from "../src/Schemas.js"
import * as Test from "../src/Test.js"
import { layer } from "../src/index.js"

const provided = layer.pipe(
  Layer.provide(Test.layer({
    listDatasets: () => [new DatasetListItem({ name: datasetName("tank/data"), kind: "filesystem" })],
    listPools: () => [new PoolListItem({
      name: poolName("tank"),
      size: byteCount(1024n),
      free: byteCount(512n),
      health: "ONLINE"
    })],
    getProperty: (input) => new PropertyGetRow({
      name: input.name,
      property: input.property,
      value: input.property === "compression" ? "lz4" : "off",
      source: "local"
    }),
    createFilesystem: () => undefined,
    createSnapshot: () => undefined
  }))
)

describe("typed protocol services", () => {
  it.effect("lists datasets without argv", () =>
    Effect.gen(function*() {
      const datasets = yield* Datasets
      const rows = yield* datasets.list()
      assert.strictEqual(rows[0]?.name, datasetName("tank/data"))
      assert.strictEqual(rows[0]?.kind, "filesystem")
    }).pipe(Effect.provide(provided))
  )

  it.effect("gets a typed dataset property from protocol rows", () =>
    Effect.gen(function*() {
      const datasets = yield* Datasets
      const compression = yield* datasets.get(datasetName("tank/data"), DatasetProperty.compression)
      assert.strictEqual(compression.value, "lz4")
    }).pipe(Effect.provide(provided))
  )

  it.effect("lists pools with bigint sizes", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const rows = yield* pools.list()
      assert.strictEqual(rows[0]?.name, poolName("tank"))
      assert.strictEqual(rows[0]?.size, 1024n)
    }).pipe(Effect.provide(provided))
  )

  it.effect("creates a snapshot through typed protocol ops", () =>
    Effect.gen(function*() {
      const datasets = yield* Datasets
      const snapshots = yield* Snapshots
      const fs = yield* datasets.createFilesystem({ name: datasetName("tank/src") })
      const snap = yield* snapshots.create(fs, "seed")
      assert.strictEqual(snap.name, "tank/src@seed")
    }).pipe(Effect.provide(provided))
  )

  it.effect("lists, rolls back, promotes, and renames through typed protocol ops", () => {
    const seen: string[] = []
    const snap = snapshotName(datasetName("tank/src"), "seed")
    const local = layer.pipe(
      Layer.provide(Test.layer({
        listSnapshots: () => [new SnapshotListItem({ name: snap })],
        rollback: (input) => {
          seen.push(`rollback:${input.snapshot}:${input.destroyRecent === true ? "r" : ""}`)
        },
        promote: (input) => {
          seen.push(`promote:${input.name}`)
        },
        rename: (input) => {
          seen.push(`rename:${input.from}:${input.to}:${input.recursive === true ? "r" : ""}${input.parents === true ? "p" : ""}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const datasets = yield* Datasets
      const snapshots = yield* Snapshots
      const rows = yield* snapshots.list({ root: datasetName("tank/src"), recursive: true })
      assert.strictEqual(rows[0]?.name, snap)
      yield* snapshots.rollback(snap, { destroyRecent: true })
      const clone = yield* snapshots.promote(datasetName("tank/clone"))
      assert.strictEqual(clone.name, "tank/clone")
      const renamedSnap = yield* snapshots.rename(snap, snapshotName(datasetName("tank/src"), "today"), { recursive: true })
      assert.strictEqual(renamedSnap.name, "tank/src@today")
      const renamedFs = yield* datasets.rename(datasetName("tank/src"), datasetName("tank/dst"), { parents: true })
      assert.strictEqual(renamedFs.name, "tank/dst")
      assert.deepStrictEqual(seen, [
        "rollback:tank/src@seed:r",
        "promote:tank/clone",
        "rename:tank/src@seed:tank/src@today:r",
        "rename:tank/src:tank/dst:p"
      ])
    }).pipe(Effect.provide(local))
  })

  it.effect("holds, lists, and releases a snapshot through typed protocol ops", () => {
    const seen: string[] = []
    const snap = snapshotName(datasetName("tank/src"), "seed")
    const local = layer.pipe(
      Layer.provide(Test.layer({
        hold: (input) => {
          seen.push(`hold:${input.snapshot}:${input.tag}:${input.recursive === true ? "r" : ""}`)
        },
        holds: (input) => [
          new SnapshotHold({
            snapshot: input.snapshot,
            tag: holdTag("keep"),
            timestamp: 1700000000n
          })
        ],
        release: (input) => {
          seen.push(`release:${input.snapshot}:${input.tag}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const snapshots = yield* Snapshots
      yield* snapshots.hold(snap, "keep")
      const rows = yield* snapshots.holds(snap)
      assert.strictEqual(rows.length, 1)
      assert.strictEqual(rows[0]?.tag, "keep")
      assert.strictEqual(rows[0]?.timestamp, 1700000000n)
      yield* snapshots.release(snap, "keep")
      const reserved = yield* snapshots.hold(snap, ".hidden").pipe(Effect.flip)
      assert.strictEqual(reserved._tag, "InvalidName")
      assert.deepStrictEqual(seen, [
        "hold:tank/src@seed:keep:",
        "release:tank/src@seed:keep"
      ])
    }).pipe(Effect.provide(local))
  })

  it.effect("forwards pool trim/initialize/clear/reopen/sync through typed args", () => {
    const seen: string[] = []
    const local = layer.pipe(
      Layer.provide(Test.layer({
        trimPool: (input) => {
          seen.push(`trim:${input.name}:${input.command ?? "start"}`)
        },
        initializePool: (input) => {
          seen.push(`initialize:${input.name}:${input.command ?? "start"}`)
        },
        clearPool: (input) => {
          seen.push(`clear:${input.name}`)
        },
        reopenPool: (input) => {
          seen.push(`reopen:${input.name}:${input.noRestart === true ? "n" : "restart"}`)
        },
        syncPool: (input) => {
          seen.push(`sync:${input.name}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.trim(poolName("tank"), { command: "cancel", secure: true })
      yield* pools.initialize(poolName("tank"), { command: "suspend" })
      yield* pools.clear(poolName("tank"))
      yield* pools.reopen(poolName("tank"), { noRestart: true })
      yield* pools.sync(poolName("tank"))
      assert.deepStrictEqual(seen, [
        "trim:tank:cancel",
        "initialize:tank:suspend",
        "clear:tank",
        "reopen:tank:n",
        "sync:tank"
      ])
    }).pipe(Effect.provide(local))
  })

  it.effect("rejects an invalid pool name before protocol trim", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const error = yield* pools.trim(poolName("tank"), { devices: [""] }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "InvalidName")
    }).pipe(Effect.provide(provided))
  )

  it.effect("forwards pool scrub start/pause/stop/wait and resilver through typed args", () => {
    const seen: string[] = []
    const local = layer.pipe(
      Layer.provide(Test.layer({
        scrub: (input) => {
          seen.push(`scrub:${input.name}:${input.command}`)
        },
        resilver: (input) => {
          seen.push(`resilver:${input.name}:${input.wait === true ? "wait" : "nowait"}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.scrub(poolName("tank"))
      yield* pools.scrub(poolName("tank"), "pause")
      yield* pools.scrub(poolName("tank"), "stop")
      yield* pools.scrub(poolName("tank"), "wait")
      yield* pools.resilver(poolName("tank"), { wait: true })
      assert.deepStrictEqual(seen, [
        "scrub:tank:start",
        "scrub:tank:pause",
        "scrub:tank:stop",
        "scrub:tank:wait",
        "resilver:tank:wait"
      ])
    }).pipe(Effect.provide(local))
  })

  it.effect("forwards mount/unmount/share/unshare through typed args", () => {
    const seen: string[] = []
    const local = layer.pipe(
      Layer.provide(Test.layer({
        mount: (input) => {
          seen.push(`mount:${input.name ?? ""}:${input.overlay === true ? "O" : ""}`)
        },
        unmount: (input) => {
          seen.push(`unmount:${input.target ?? ""}:${input.force === true ? "f" : ""}`)
        },
        share: (input) => {
          seen.push(`share:${input.name ?? ""}`)
        },
        unshare: (input) => {
          seen.push(`unshare:${input.target ?? ""}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const mount = yield* Mount
      yield* mount.mount({ name: datasetName("tank/data"), overlay: true })
      yield* mount.unmount({ target: datasetName("tank/data"), force: true })
      yield* mount.share({ name: datasetName("tank/data") })
      yield* mount.unshare({ target: datasetName("tank/data") })
      const invalid = yield* mount.mount({ name: datasetName("tank/data"), options: "" }).pipe(Effect.flip)
      assert.strictEqual(invalid._tag, "InvalidName")
      assert.deepStrictEqual(seen, [
        "mount:tank/data:O",
        "unmount:tank/data:f",
        "share:tank/data",
        "unshare:tank/data"
      ])
    }).pipe(Effect.provide(local))
  })

  it.effect("creates and destroys a pool through typed protocol ops", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const created = yield* pools.create({
        name: poolName("tank"),
        vdevs: [new File({ path: devicePath("/tmp/a.img"), size: spaMinDevSize })],
        force: true,
        filesystemProperties: { mountpoint: "none" }
      })
      assert.strictEqual(created.name, "tank")
      assert.strictEqual(created.size, 1024n)
      yield* pools.destroy(created, { force: true })
    }).pipe(Effect.provide(provided))
  )

  it.effect("forwards pool import/export/reguid/upgrade/checkpoint/labelclear through typed args", () => {
    const seen: string[] = []
    const local = layer.pipe(
      Layer.provide(Test.layer({
        importPool: (input) => {
          seen.push(`import:${input.name}:${input.searchDirs?.join(",") ?? ""}`)
        },
        exportPool: (input) => {
          seen.push(`export:${input.name}:${input.force === true ? "f" : ""}`)
        },
        reguidPool: (input) => {
          seen.push(`reguid:${input.name}`)
        },
        upgradePool: (input) => {
          seen.push(`upgrade:${input.name}`)
        },
        checkpointPool: (input) => {
          seen.push(`checkpoint:${input.name}:${input.discard === true ? "d" : ""}`)
        },
        labelClear: (input) => {
          seen.push(`labelclear:${input.device}:${input.force === true ? "f" : ""}`)
        }
      }))
    )
    return Effect.gen(function*() {
      const pools = yield* Pools
      const name = poolName("effectzfs_test_demo")
      yield* pools.export(name, { force: true })
      yield* pools.import({ name, searchDirs: ["/tmp/effect-zfs"], unmounted: true })
      yield* pools.reguid(name)
      yield* pools.upgrade(name)
      yield* pools.checkpoint(name)
      yield* pools.checkpoint(name, { discard: true })
      yield* pools.labelClear("/tmp/effect-zfs/a.img", { force: true })
      const relative = yield* pools.labelClear("a.img").pipe(Effect.flip)
      assert.strictEqual(relative._tag, "InvalidName")
      assert.deepStrictEqual(seen, [
        "export:effectzfs_test_demo:f",
        "import:effectzfs_test_demo:/tmp/effect-zfs",
        "reguid:effectzfs_test_demo",
        "upgrade:effectzfs_test_demo",
        "checkpoint:effectzfs_test_demo:",
        "checkpoint:effectzfs_test_demo:d",
        "labelclear:/tmp/effect-zfs/a.img:f"
      ])
    }).pipe(Effect.provide(local))
  })
})
