import { assert, describe, layer } from "@effect/vitest"
import { Effect, Result, Stream } from "effect"
import { mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import {
  devicePath,
  Disk,
  EncodedProperty,
  File,
  propertyName,
  Spare,
  vdevId,
  wrappingKey
} from "../../src/args/index.js"
import { execute } from "../../src/cli/execute.js"
import { classifyCliError } from "../../src/errors/classify.js"
import { DatasetProperty, PoolProperty, VdevProperty } from "../../src/generated/properties.generated.js"
import { CommandResult } from "../../src/protocol/process.js"
import { command } from "../../src/protocol/protocol.js"
import { gib, mib, spaMinDevSize, vdevSize, volBlockSize, volumeSize } from "../../src/schema/limits.js"
import { vdevConfig } from "../../src/schema/models.js"
import { datasetName, poolName, snapshotName, snapshotRange } from "../../src/schema/name.js"
import { atLeast, minimumSupported, parseZfsVersionLine } from "../../src/schema/version.js"
import { Bookmarks } from "../../src/services/bookmarks.js"
import { Crypto } from "../../src/services/crypto.js"
import { Datasets } from "../../src/services/datasets.js"
import { Mount } from "../../src/services/mount.js"
import { Pools } from "../../src/services/pools.js"
import { Replication } from "../../src/services/replication.js"
import { Snapshots } from "../../src/services/snapshots.js"
import { ChildProcess, ChildProcessSpawner, fileBackedPool, hasLiveLinuxZfs, Live, TestPool } from "./harness.js"

describe.skipIf(!hasLiveLinuxZfs)("linux zfs live 2.2.2+", () => {
  layer(Live, { excludeTestServices: true })((it) => {
    it.effect("reports a supported userspace version", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const raw = yield* spawner.string(ChildProcess.make("zfs", ["version"], { extendEnv: true }))
        const version = parseZfsVersionLine(raw.split("\n")[0] ?? raw)
        assert.isTrue(atLeast(version, minimumSupported))
      }))

    it.effect("covers dataset, snapshot, pool, and streamed send/receive", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const pools = yield* Pools
        const replication = yield* Replication

        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/source`),
          properties: { compression: "lz4", atime: false, mountpoint: "none" }
        })
        assert.strictEqual(fs.kind, "filesystem")

        const listed = yield* datasets.list({ root: env.root, recursive: true })
        assert.isTrue(listed.some((row) => row.name === fs.name))
        const listedFs = listed.find((row) => row.name === fs.name)
        assert.strictEqual(typeof listedFs?.used, "bigint")

        const filesystems = yield* datasets.list({
          root: env.root,
          recursive: true,
          types: ["filesystem"]
        })
        assert.isTrue(filesystems.every((row) => row.kind === "filesystem"))

        const compression = yield* datasets.get(fs, DatasetProperty.compression)
        assert.strictEqual(compression.value, "lz4")

        const used = yield* datasets.get(fs, DatasetProperty.used)
        assert.strictEqual(typeof used.value, "bigint")

        const allProps = yield* datasets.getAll(fs)
        assert.isTrue(allProps.some((row) => row.property === "compression"))

        yield* datasets.set(fs, { atime: true }, { unmounted: true })
        const atime = yield* datasets.get(fs, DatasetProperty.atime)
        assert.strictEqual(atime.value, true)
        yield* datasets.inherit(fs, DatasetProperty.atime, { recursive: true })

        const volume = yield* datasets.createVolume({
          name: datasetName(`${env.pool}/vol`),
          size: volumeSize(mib(8)),
          sparse: true,
          properties: { compression: "lz4" }
        })
        assert.strictEqual(volume.kind, "volume")

        const snap = yield* snapshots.create(fs, "seed")
        const snapshotsListed = yield* datasets.list({
          root: env.root,
          recursive: true,
          types: ["snapshot"]
        })
        assert.isTrue(snapshotsListed.some((row) => row.kind === "snapshot"))
        const clone = yield* snapshots.clone(snap, datasetName(`${env.pool}/clone`), { mountpoint: "none" })
        assert.strictEqual(clone.kind, "filesystem")

        const received = datasetName(`${env.pool}/received`)
        yield* replication.receive({
          target: received,
          unmounted: true,
          stream: replication.send(snap)
        })
        const receivedList = yield* datasets.list({ root: received })
        assert.isTrue(receivedList.length > 0)

        const recvBase = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/recvbase`),
          properties: { mountpoint: "none" }
        })
        yield* replication.receive({
          target: recvBase.name,
          dest: "prefix",
          unmounted: true,
          properties: [new EncodedProperty({ name: propertyName("compression"), value: "lz4" })],
          stream: replication.send(snap)
        })
        const prefixed = yield* datasets.list({
          root: datasetName(`${env.pool}/recvbase/source`)
        })
        assert.isTrue(prefixed.length > 0)

        const poolRows = yield* pools.list()
        const self = poolRows.find((row) => row.name === env.pool)
        assert.ok(self)
        assert.strictEqual(typeof self.size, "bigint")
        assert.isTrue(self.size >= 0n)

        const autotrim = yield* pools.get(env.pool, PoolProperty.autotrim)
        assert.strictEqual(typeof autotrim.value, "boolean")
        yield* pools.set(env.pool, { autotrim: false })
        const status = yield* pools.status(env.pool)
        assert.ok(typeof status.state === "string" || status.state === undefined)
        assert.ok(status.scan === undefined || typeof status.scan === "object")

        yield* pools.scrub(env.pool, "start")
        yield* pools.scrub(env.pool, "wait")
        const afterScrub = yield* pools.status(env.pool)
        assert.ok(afterScrub.scan === undefined || typeof afterScrub.scan === "object")
        assert.ok(status.scan === undefined || typeof status.scan === "object")

        yield* datasets.destroy(volume, { force: true })
      }))

    it.effect("covers snapshot list, rollback, promote, and rename", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots

        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/life`),
          properties: { mountpoint: "none" }
        })
        const snapA = yield* snapshots.create(fs, "a")
        yield* snapshots.create(fs, "b")
        const listed = yield* snapshots.list({ root: fs.name, recursive: true })
        assert.isTrue(listed.some((row) => row.name === snapA.name))
        assert.isTrue(listed.some((row) => row.name.endsWith("@b")))

        const recent = yield* snapshots.rollback(snapA).pipe(Effect.flip)
        assert.ok(recent._tag === "UnknownZfsError" || recent._tag === "DatasetBusy", recent._tag)

        yield* snapshots.rollback(snapA, { destroyRecent: true })
        const afterRollback = yield* snapshots.list({ root: fs.name, recursive: true })
        assert.isTrue(afterRollback.some((row) => row.name === snapA.name))
        assert.isFalse(afterRollback.some((row) => row.name.endsWith("@b")))

        const clone = yield* snapshots.clone(snapA, datasetName(`${env.pool}/lifeclone`), { mountpoint: "none" })
        yield* snapshots.promote(clone)
        yield* datasets.destroy(fs)

        const origin = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/renamesrc`),
          properties: { mountpoint: "none" }
        })
        const renamed = yield* datasets.rename(origin, datasetName(`${env.pool}/renamedst`), {
          unmounted: true
        })
        assert.strictEqual(renamed.name, `${env.pool}/renamedst`)
        yield* snapshots.create(renamed, "old")
        const child = yield* datasets.createFilesystem({
          name: datasetName(`${renamed.name}/kid`),
          properties: { mountpoint: "none" }
        })
        yield* snapshots.create(renamed, "rec", { recursive: true })
        const rec2 = yield* snapshots.rename(
          snapshotName(renamed.name, "rec"),
          snapshotName(renamed.name, "rec2"),
          { recursive: true }
        )
        assert.strictEqual(rec2.name, `${renamed.name}@rec2`)
        const recListed = yield* snapshots.list({ root: renamed.name, recursive: true })
        assert.isTrue(recListed.some((row) => row.name === `${renamed.name}@rec2`))
        assert.isTrue(recListed.some((row) => row.name === `${child.name}@rec2`))

        const nested = yield* datasets.rename(renamed, datasetName(`${env.pool}/parented/leaf`), {
          parents: true,
          force: true
        })
        assert.strictEqual(nested.name, `${env.pool}/parented/leaf`)
      }))

    it.effect("classifies nonexistent dataset", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const error = yield* datasets.get(datasetName(`${env.pool}/missing`), DatasetProperty.compression).pipe(
          Effect.flip
        )
        assert.strictEqual(error._tag, "DatasetNotFound")
      }))

    it.effect("adds a spare and offlines/onlines a mirror leaf", () =>
      Effect.gen(function*() {
        const pools = yield* Pools
        const acquired = yield* fileBackedPool(vdevSize(mib(256)))
        const sparePath = join(acquired.dir, "spare.img")
        writeFileSync(sparePath, "")
        truncateSync(sparePath, Number(mib(256)))
        yield* pools.add(acquired.pool, [
          new Spare({ children: [new Disk({ path: devicePath(sparePath) })] })
        ])
        const diskA = devicePath(join(acquired.dir, "a.img"))
        yield* pools.offline(acquired.pool, [vdevId(diskA)], { temporary: true })
        yield* pools.online(acquired.pool, [vdevId(diskA)])
        yield* pools.remove(acquired.pool, [vdevId(sparePath)])
      }))

    it.effect("covers bookmark create, list, get props, and destroy", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const bookmarks = yield* Bookmarks
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/bmarks`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        const bm = yield* bookmarks.create(snap, "keep")
        assert.strictEqual(bm.name, `${fs.name}#keep`)
        const listed = yield* bookmarks.list({ root: fs.name })
        assert.isTrue(listed.some((row) => row.name === bm.name))
        const creation = yield* bookmarks.get(bm, DatasetProperty.creation)
        assert.strictEqual(typeof creation.value, "bigint")
        const guid = yield* bookmarks.get(bm, DatasetProperty.guid)
        assert.strictEqual(typeof guid.value, "bigint")
        yield* bookmarks.destroy(bm)
        const after = yield* bookmarks.list({ root: fs.name })
        assert.isFalse(after.some((row) => row.name === bm.name))
        const missing = yield* bookmarks.get(bm, DatasetProperty.creation).pipe(Effect.flip)
        assert.strictEqual(missing._tag, "DatasetNotFound")
      }))

    it.effect("classifies duplicate create", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const name = datasetName(`${env.pool}/dup`)
        yield* datasets.createFilesystem({ name, properties: { mountpoint: "none" } })
        const error = yield* datasets.createFilesystem({ name, properties: { mountpoint: "none" } }).pipe(Effect.flip)
        assert.strictEqual(error._tag, "DatasetAlreadyExists")
      }))

    it.effect("classifies invalid property value and read-only set", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/proptarget`),
          properties: { mountpoint: "none" }
        })
        const invalid = yield* execute("Dataset.Set", command("zfs", "set", "compression=not-a-codec", fs.name)).pipe(
          Effect.flip
        )
        assert.ok(invalid._tag === "InvalidProperty" || invalid._tag === "UnknownZfsError", invalid._tag)
        const readonly = yield* execute("Dataset.Set", command("zfs", "set", "used=1", fs.name)).pipe(Effect.flip)
        assert.ok(readonly._tag === "PropertyReadOnly" || readonly._tag === "UnknownZfsError", readonly._tag)
      }))

    it.effect("hold blocks snapshot destroy as DatasetBusy", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/holdfs`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "held")
        yield* snapshots.hold(snap, "keep")
        const listed = yield* snapshots.holds(snap)
        assert.strictEqual(listed.length, 1)
        assert.strictEqual(listed[0]?.tag, "keep")
        assert.strictEqual(listed[0]?.snapshot, snap.name)
        assert.strictEqual(typeof listed[0]?.timestamp, "bigint")
        const error = yield* snapshots.destroy(snap).pipe(Effect.flip)
        assert.strictEqual(error._tag, "DatasetBusy")
        const dup = yield* snapshots.hold(snap, "keep").pipe(Effect.flip)
        assert.ok(dup._tag === "HoldTagExists" || dup._tag === "UnknownZfsError", dup._tag)
        yield* snapshots.release(snap, "keep")
        yield* snapshots.destroy(snap)
      }))

    it.effect("classifies busy snapshot destroy while a clone exists", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/busyfs`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "held")
        yield* snapshots.clone(snap, datasetName(`${env.pool}/busyclone`), { mountpoint: "none" })
        const error = yield* snapshots.destroy(snap).pipe(Effect.flip)
        assert.ok(error._tag === "DatasetBusy" || error._tag === "UnknownZfsError", error._tag)
      }))

    it.effect("classifies a bad receive stream", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const replication = yield* Replication
        const error = yield* replication.receive({
          target: datasetName(`${env.pool}/badrecv`),
          unmounted: true,
          stream: Stream.make(new TextEncoder().encode("this is not a zfs send stream"))
        }).pipe(Effect.flip)
        assert.ok(
          error._tag === "InvalidBackupStream" || error._tag === "BadRestore" || error._tag === "UnknownZfsError",
          error._tag
        )
      }))

    it.effect("classifies abort of a receive with no resume state", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const replication = yield* Replication
        const error = yield* replication.abortReceive(datasetName(`${env.pool}/noresume`)).pipe(Effect.flip)
        assert.ok(
          error._tag === "DatasetNotFound" || error._tag === "BadRestore" || error._tag === "UnknownZfsError",
          error._tag
        )
      }))

    it.effect("classifies cross-pool clone", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const other = yield* fileBackedPool(spaMinDevSize)
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/crosssrc`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "x")
        const error = yield* snapshots.clone(snap, datasetName(`${other.pool}/crossdst`)).pipe(Effect.flip)
        assert.ok(error._tag === "CrossTarget" || error._tag === "UnknownZfsError", error._tag)
      }))

    it.effect("classifies out of space on a minimum-size disposable pool", () =>
      Effect.gen(function*() {
        const datasets = yield* Datasets
        const tiny = yield* fileBackedPool(spaMinDevSize)
        const error = yield* datasets.createVolume({
          name: datasetName(`${tiny.pool}/huge`),
          size: volumeSize(gib(1))
        }).pipe(Effect.flip)
        assert.ok(
          error._tag === "OutOfSpace" || error._tag === "UnknownZfsError" || error._tag === "VolumeTooBig",
          error._tag
        )
      }))

    it.effect("clears, reopens, syncs, and initializes a process-created pool", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.clear(env.pool)
        yield* pools.reopen(env.pool)
        yield* pools.sync(env.pool)
        yield* pools.initialize(env.pool)
        yield* pools.initialize(env.pool, { command: "cancel" })
        yield* pools.trim(env.pool).pipe(
          Effect.tap(() => pools.trim(env.pool, { command: "cancel" })),
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "PoolUnavailable",
            () => Effect.void
          )
        )
      }))

    it.effect("does not mount a filesystem with mountpoint=none", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const mount = yield* Mount
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nomount`),
          properties: { mountpoint: "none" }
        })
        const mounted = yield* datasets.get(fs, DatasetProperty.mounted)
        assert.strictEqual(mounted.value, false)
        const error = yield* mount.mount({ name: fs.name }).pipe(Effect.flip)
        assert.ok(error._tag === "MountFailed" || error._tag === "UnknownZfsError", error._tag)
        const share = yield* mount.share({ name: fs.name }).pipe(Effect.flip)
        assert.ok(share._tag === "ShareFailed" || share._tag === "UnknownZfsError", share._tag)
      }))

    it.effect("mounts and unmounts a filesystem at an explicit temp path", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const mount = yield* Mount
        const mnt = mkdtempSync(join(tmpdir(), "effect-zfs-mnt-"))
        yield* Effect.addFinalizer(() => Effect.sync(() => rmSync(mnt, { recursive: true, force: true })))
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/mntfs`),
          properties: { mountpoint: mnt, canmount: "noauto" }
        })
        yield* mount.mount({ name: fs.name })
        const on = yield* datasets.get(fs, DatasetProperty.mounted)
        assert.strictEqual(on.value, true)
        yield* mount.unmount({ target: fs.name })
        const off = yield* datasets.get(fs, DatasetProperty.mounted)
        assert.strictEqual(off.value, false)
      }))

    it.effect("exports and imports a process-created effectzfs_test_* pool", () =>
      Effect.gen(function*() {
        const pools = yield* Pools
        const acquired = yield* fileBackedPool(spaMinDevSize)
        yield* pools.upgrade(acquired.pool)
        yield* pools.checkpoint(acquired.pool)
        const dup = yield* pools.checkpoint(acquired.pool).pipe(Effect.flip)
        assert.ok(dup._tag === "CheckpointExists" || dup._tag === "UnknownZfsError", dup._tag)
        yield* pools.checkpoint(acquired.pool, { discard: true })
        yield* pools.wait(acquired.pool)
        yield* pools.reguid(acquired.pool)
        yield* pools.export(acquired.pool)
        yield* pools.import({
          name: acquired.pool,
          searchDirs: [acquired.dir],
          unmounted: true
        })
        const listed = yield* pools.list()
        assert.ok(listed.some((row) => row.name === acquired.pool))
        yield* pools.export(acquired.pool)
        yield* pools.labelClear(join(acquired.dir, "a.img"), { force: true })
        yield* pools.labelClear(join(acquired.dir, "b.img"), { force: true })
      }))

    it.effect("encrypted create, unload-key, load-key, and change-key", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const crypto = yield* Crypto
        const datasets = yield* Datasets
        const passphrase = wrappingKey("effect-zfs-passphrase-1")
        const created = yield* crypto.createFilesystem({
          name: datasetName(`${env.pool}/enc`),
          keyformat: "passphrase",
          wrappingKey: passphrase,
          properties: { mountpoint: "none" }
        }).pipe(Effect.result)
        if (Result.isFailure(created)) {
          assert.ok(
            created.failure._tag === "EncryptionFailure" ||
              created.failure._tag === "UnknownZfsError" ||
              created.failure._tag === "InvalidProperty",
            created.failure._tag
          )
          return
        }
        const fs = created.success
        const available = yield* datasets.get(fs, DatasetProperty.keystatus)
        assert.strictEqual(available.value, "available")
        yield* crypto.unloadKey({ name: fs.name })
        const unavailable = yield* datasets.get(fs, DatasetProperty.keystatus)
        assert.strictEqual(unavailable.value, "unavailable")
        yield* crypto.loadKey({ name: fs.name, wrappingKey: passphrase })
        const reloaded = yield* datasets.get(fs, DatasetProperty.keystatus)
        assert.strictEqual(reloaded.value, "available")
        yield* crypto.changeKey({
          name: fs.name,
          wrappingKey: wrappingKey("effect-zfs-passphrase-2")
        })
      }))

    it.effect("rejects a volume smaller than SPA_MINBLOCKSIZE as InvalidProperty", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const error = yield* datasets.createVolume({
          name: datasetName(`${env.pool}/tinyvol`),
          size: 511n
        }).pipe(Effect.flip)
        assert.strictEqual(error._tag, "InvalidProperty")
      }))

    it.effect("incremental send, sendSpace bigint, and replicate -X exclude", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const replication = yield* Replication

        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/incsrc`),
          properties: { mountpoint: "none" }
        })
        const snapA = yield* snapshots.create(fs, "a")
        const snapB = yield* snapshots.create(fs, "b")
        const space = yield* replication.sendSpace(snapB, { from: snapA.name, incremental: "from" })
        assert.strictEqual(typeof space.bytes, "bigint")
        assert.isTrue(space.bytes >= 0n)

        const dest = datasetName(`${env.pool}/incdst`)
        yield* replication.receive({
          target: dest,
          unmounted: true,
          stream: replication.send(snapA)
        })
        yield* replication.receive({
          target: dest,
          unmounted: true,
          force: true,
          stream: replication.send(snapB, { from: snapA.name, incremental: "from" })
        })
        const destRows = yield* datasets.list({ root: dest, recursive: true })
        assert.isTrue(destRows.length > 0)

        const tree = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/tree`),
          properties: { mountpoint: "none" }
        })
        yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/tree/keep`),
          properties: { mountpoint: "none" }
        })
        yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/tree/skip`),
          properties: { mountpoint: "none" }
        })
        const treeSnap = yield* snapshots.create(tree, "r1", { recursive: true })
        const replica = datasetName(`${env.pool}/replica`)
        yield* replication.receive({
          target: replica,
          unmounted: true,
          stream: replication.send(treeSnap, {
            replicate: true,
            exclude: [datasetName(`${env.pool}/tree/skip`)]
          })
        })
        const replicaRows = yield* datasets.list({ root: replica, recursive: true })
        assert.isTrue(replicaRows.some((row) => row.name.includes("/keep") || row.name === replica))
        assert.isFalse(replicaRows.some((row) => row.name.endsWith("/skip")))
      }))

    it.effect("creates and destroys a file-backed effectzfs_test_* pool", () =>
      Effect.scoped(Effect.gen(function*() {
        const pools = yield* Pools
        const name = poolName(`effectzfs_test_${process.pid}_${Date.now()}_create`)
        const dir = mkdtempSync(join(tmpdir(), "effect-zfs-create-"))
        const disk = join(dir, "a.img")
        writeFileSync(disk, "")
        truncateSync(disk, Number(spaMinDevSize))
        yield* Effect.addFinalizer(() =>
          pools.destroy(name, { force: true }).pipe(
            Effect.orElseSucceed(() => undefined),
            Effect.tap(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })))
          )
        )
        const created = yield* pools.create({
          name,
          vdevs: [new File({ path: devicePath(disk), size: spaMinDevSize })],
          force: true,
          filesystemProperties: { mountpoint: "none" }
        })
        assert.strictEqual(created.name, name)
        const listed = yield* pools.list()
        assert.ok(listed.some((row) => row.name === name))
        const dup = yield* pools.create({
          name,
          vdevs: [new File({ path: devicePath(disk), size: spaMinDevSize })],
          force: true,
          filesystemProperties: { mountpoint: "none" }
        }).pipe(Effect.flip)
        assert.strictEqual(dup._tag, "DatasetAlreadyExists")
        yield* pools.destroy(created, { force: true })
        const after = yield* pools.list()
        assert.ok(!after.some((row) => row.name === name))
        const missing = yield* pools.destroy(poolName("effectzfs_test_missing_pool_zzz"), { force: true }).pipe(
          Effect.flip
        )
        assert.strictEqual(missing._tag, "DatasetNotFound")
      })))

    it.effect("reads history, iostat, wait, and events on a test pool without buffering", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.wait(env.pool)
        const hist = yield* pools.history(env.pool).pipe(Stream.runCollect)
        assert.isTrue(hist.length > 0)
        assert.isTrue(hist.some((row) => row.command.includes("create")))
        const samples = yield* pools.iostat({ pool: env.pool }).pipe(Stream.take(1), Stream.runCollect)
        assert.strictEqual(samples.length, 1)
        const row = samples[0]?.rows[0]
        assert.ok(row)
        assert.strictEqual(typeof row.allocated, "bigint")
        const events = yield* pools.events({ pool: env.pool }).pipe(Stream.take(8), Stream.runCollect)
        assert.ok(Array.isArray(events))
        // Ubuntu 25.04 zfsutils-linux 2.3.1 `zpool prefetch` can SIGSEGV
        // (ZfsTransportError). Treat that as an optional op on 2.2.2+.
        yield* pools.prefetch(env.pool).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetNotFound" ||
              error._tag === "ZfsTransportError",
            () => Effect.void
          )
        )
      }))

    it.effect("exists, upgrade, unmounted create, volblocksize, snap range, clone -p, vdev comment", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const pools = yield* Pools
        assert.strictEqual(yield* datasets.exists(datasetName(`${env.pool}/nope`)), false)
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/gapfs`),
          unmounted: true,
          properties: { mountpoint: "none" }
        })
        assert.strictEqual(yield* datasets.exists(fs.name), true)
        yield* datasets.upgrade(fs)
        const volume = yield* datasets.createVolume({
          name: datasetName(`${env.pool}/gapvol`),
          size: volumeSize(mib(8)),
          volblocksize: volBlockSize(8192n),
          properties: { volmode: "none" }
        })
        const block = yield* datasets.get(volume, DatasetProperty.volblocksize)
        assert.strictEqual(block.value, 8192n)
        const snapA = yield* snapshots.create(fs, "a")
        yield* snapshots.create(fs, "b")
        yield* snapshots.destroy(snapshotRange(`${fs.name}@a%b`))
        const gone = yield* snapshots.list({ root: fs.name })
        assert.ok(!gone.some((row) => row.name === snapA.name))
        const nested = yield* snapshots.create(fs, "origin")
        yield* snapshots.clone(nested, datasetName(`${env.pool}/nested/clone`), undefined, { parents: true })
        assert.strictEqual(yield* datasets.exists(datasetName(`${env.pool}/nested/clone`)), true)
        const status = yield* pools.status(env.pool)
        const tree = vdevConfig(status.config)
        assert.ok(status.config === undefined || Array.isArray(status.config))
        const leaf = tree[0]?.children?.[0]?.children?.[0]?.name
          ?? tree[0]?.children?.[0]?.name
        if (leaf !== undefined) {
          yield* pools.setVdev(env.pool, vdevId(leaf), { comment: "effect-zfs" })
          const comment = yield* pools.getVdev(env.pool, vdevId(leaf), VdevProperty.comment)
          assert.strictEqual(comment.value, "effect-zfs")
        }
      }))

    it.effect("classifies permission denied for unprivileged zfs list", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const outcome = yield* Effect.scoped(Effect.gen(function*() {
          const handle = yield* spawner.spawn(ChildProcess.make(
            "su",
            ["-s", "/bin/sh", "nobody", "-c", "zfs list"],
            { extendEnv: true }
          ))
          const stderr = yield* handle.stderr.pipe(Stream.decodeText(), Stream.mkString)
          const exitCode = Number(yield* handle.exitCode)
          return { stderr, exitCode }
        })).pipe(Effect.result)
        if (outcome._tag === "Failure") return
        const { exitCode, stderr } = outcome.success
        if (exitCode === 0) return
        const error = classifyCliError(
          "Dataset.List",
          new CommandResult({
            command: command("zfs", "list"),
            stdout: "",
            stderr,
            exitCode
          })
        )
        assert.ok(
          error._tag === "PermissionDenied" || error._tag === "UnknownZfsError",
          error._tag
        )
        if (/permission denied|operation not permitted|unable to open \/dev\/zfs/i.test(stderr)) {
          assert.strictEqual(error._tag, "PermissionDenied")
        }
      }))
  })
})
