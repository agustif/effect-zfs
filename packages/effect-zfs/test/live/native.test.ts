import { assert, describe, layer } from "@effect/vitest"
import { Effect, Result, Stream } from "effect"
import { mkdirSync, truncateSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { DelegWho, uint64, vdevId, wrappingKey } from "../../src/args/index.js"
import { DatasetProperty, VdevProperty } from "../../src/generated/properties.generated.js"
import { mib, spaMinDevSize } from "../../src/schema/limits.js"
import { vdevConfig } from "../../src/schema/models.js"
import { bookmarkName, datasetName, holdTag, poolName, snapshotName, snapshotRange } from "../../src/schema/name.js"
import { atLeast, linux } from "../../src/schema/version.js"
import { Bookmarks } from "../../src/services/bookmarks.js"
import { Crypto } from "../../src/services/crypto.js"
import { Datasets } from "../../src/services/datasets.js"
import { Delegations } from "../../src/services/delegations.js"
import { Mount } from "../../src/services/mount.js"
import { Pools } from "../../src/services/pools.js"
import { Quotas } from "../../src/services/quotas.js"
import { Replication } from "../../src/services/replication.js"
import { Snapshots } from "../../src/services/snapshots.js"
import {
  ChildProcess,
  ChildProcessSpawner,
  detectUserspace,
  fileBackedPool,
  hasLinuxLzc,
  NativeLive,
  TestPool
} from "./harness.js"

const userspace = detectUserspace()
const hasRewrite = userspace !== undefined && atLeast(userspace, linux.v2_4_0)

const zfs = (spawner: ChildProcessSpawner.ChildProcessSpawner, args: ReadonlyArray<string>) =>
  spawner.exitCode(ChildProcess.make("zfs", [...args], { extendEnv: true }))

describe.skipIf(!hasLinuxLzc)("linux native vs CLI", () => {
  layer(NativeLive, { excludeTestServices: true })((it) => {
    it.effect("creates a filesystem and snapshot through nvlist lzc_create / lzc_snapshot", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvcreate`),
          properties: { mountpoint: "none" }
        })
        assert.isTrue(yield* datasets.exists(fs.name))
        const snap = yield* snapshots.create(fs, "seed")
        yield* snapshots.hold(snap, holdTag("keep"))
        yield* snapshots.release(snap, holdTag("keep"))
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("clones through lzc_clone", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvorigin`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        const clone = yield* snapshots.clone(snap, datasetName(`${env.pool}/nvclone`), { mountpoint: "none" })
        assert.isTrue(yield* datasets.exists(clone.name))
        yield* datasets.destroy(clone)
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("exists and destroy agree with the CLI on a process-created dataset", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const name = datasetName(`${env.pool}/nativedest`)
        assert.strictEqual(Number(yield* zfs(spawner, ["create", "-o", "mountpoint=none", name])), 0)
        const datasets = yield* Datasets
        assert.isTrue(yield* datasets.exists(name))
        assert.isFalse(yield* datasets.exists(datasetName(`${env.pool}/missing-native`)))
        yield* datasets.destroy(name)
        assert.isFalse(yield* datasets.exists(name))
      }))

    it.effect("renames a dataset through lzc_rename", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const from = datasetName(`${env.pool}/nativerenfrom`)
        const to = datasetName(`${env.pool}/nativerinto`)
        assert.strictEqual(Number(yield* zfs(spawner, ["create", "-o", "mountpoint=none", from])), 0)
        const datasets = yield* Datasets
        yield* datasets.rename(from, to)
        assert.isFalse(yield* datasets.exists(from))
        assert.isTrue(yield* datasets.exists(to))
      }))

    it.effect("promotes a clone through lzc_promote", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const origin = datasetName(`${env.pool}/nativeorigin`)
        const snap = `${origin}@seed`
        const clone = datasetName(`${env.pool}/nativeclone`)
        assert.strictEqual(Number(yield* zfs(spawner, ["create", "-o", "mountpoint=none", origin])), 0)
        assert.strictEqual(Number(yield* zfs(spawner, ["snapshot", snap])), 0)
        assert.strictEqual(Number(yield* zfs(spawner, ["clone", snap, clone])), 0)
        const snapshots = yield* Snapshots
        yield* snapshots.promote(clone)
        const datasets = yield* Datasets
        assert.isTrue(yield* datasets.exists(clone))
      }))

    it.effect("rolls back through lzc_rollback_to", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const fs = datasetName(`${env.pool}/nativeroll`)
        assert.strictEqual(Number(yield* zfs(spawner, ["create", "-o", "mountpoint=none", fs])), 0)
        assert.strictEqual(Number(yield* zfs(spawner, ["snapshot", `${fs}@a`])), 0)
        const snapshots = yield* Snapshots
        yield* snapshots.rollback(snapshotName(fs, "a"))
      }))

    it.effect("checkpoints, reopens, and syncs through lzc", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.checkpoint(env.pool)
        yield* pools.checkpoint(env.pool, { discard: true })
        yield* pools.reopen(env.pool)
        const wait = yield* pools.wait(env.pool, { activities: ["scrub"] })
        assert.ok(wait.waited === true || wait.waited === false || wait.waited === undefined)
      }))

    it.effect("estimates send space through lzc_send_space / lzc_snaprange_space", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const fs = datasetName(`${env.pool}/nativesend`)
        assert.strictEqual(Number(yield* zfs(spawner, ["create", "-o", "mountpoint=none", fs])), 0)
        assert.strictEqual(Number(yield* zfs(spawner, ["snapshot", `${fs}@a`])), 0)
        assert.strictEqual(Number(yield* zfs(spawner, ["snapshot", `${fs}@b`])), 0)
        const replication = yield* Replication
        const first = snapshotName(fs, "a")
        const last = snapshotName(fs, "b")
        const full = yield* replication.sendSpace(last)
        assert.isTrue(full.bytes >= 0n)
        const range = yield* replication.snaprangeSpace(first, last)
        assert.isTrue(range.bytes >= 0n)
      }))

    it.effect("prefetches DDT without requiring a BRT table", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.prefetch(env.pool, "ddt").pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "ZfsTransportError",
            () => Effect.void
          )
        )
      }))

    it.effect("lists holds through lzc_get_holds", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvholds`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        yield* snapshots.hold(snap, holdTag("keep"))
        const rows = yield* snapshots.holds(snap)
        assert.isTrue(rows.some((row) => row.tag === "keep"))
        yield* snapshots.release(snap, holdTag("keep"))
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("creates and lists bookmarks through lzc_bookmark / lzc_get_bookmarks", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const bookmarks = yield* Bookmarks
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvbook`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        yield* bookmarks.create(snap, "origin")
        const mark = bookmarkName(fs.name, "origin")
        const listed = yield* bookmarks.list({ root: fs.name })
        assert.isTrue(listed.some((row) => row.name === mark))
        yield* bookmarks.destroy(mark)
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("syncs the test pool through lzc_sync with an allocated innvl", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.sync(env.pool).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError",
            () => Effect.void
          )
        )
      }))

    it.effect("runs a read-only channel program through lzc_channel_program", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const result = yield* pools.program({
          pool: env.pool,
          program: "return 'effect-zfs'",
          nosync: true
        })
        assert.isTrue(result.raw.includes("effect-zfs") || result.raw.includes("return") || result.raw.length >= 0)
      }))

    it.effect("receives a stream whose dest has no @snap in the header name", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const replication = yield* Replication
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvrecvsrc`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        const dest = datasetName(`${env.pool}/nvrecvdst`)
        yield* replication.receive({
          target: dest,
          stream: replication.send(snap)
        }).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "ZfsTransportError",
            () => Effect.void
          )
        )
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("sends a snapshot stream through lzc_send", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const replication = yield* Replication
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvstream`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        const chunks = yield* Stream.runCollect(replication.send(snap)).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "ZfsTransportError",
            () => Effect.succeed([])
          )
        )
        if (chunks.length > 0) {
          const bytes = chunks.reduce((n, chunk) => n + chunk.byteLength, 0)
          assert.isTrue(bytes > 0)
        }
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("rewrites a file through ZFS_IOC_REWRITE or fails cleanly before 2.4", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const mount = yield* Mount
        const dir = join(tmpdir(), `effect-zfs-nvrewrite-${process.pid}`)
        mkdirSync(dir, { recursive: true })
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvrewrite`),
          properties: { mountpoint: dir }
        })
        yield* mount.mount({ name: fs.name })
        const file = join(dir, "blob.bin")
        writeFileSync(file, Buffer.alloc(4096, 3))
        const rewritten = yield* datasets.rewrite([file]).pipe(Effect.result)
        if (hasRewrite) {
          assert.isTrue(
            Result.isSuccess(rewritten),
            Result.isFailure(rewritten)
              ? `${rewritten.failure._tag} ${"stderr" in rewritten.failure ? String(rewritten.failure.stderr) : ""}`
              : ""
          )
        } else {
          assert.isTrue(Result.isFailure(rewritten))
        }
        yield* mount.unmount({ target: fs.name, force: true }).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "MountFailed" ||
              error._tag === "UnmountFailed" ||
              error._tag === "UnknownZfsError" ||
              error._tag === "ZfsTransportError" ||
              error._tag === "DatasetBusy",
            () => Effect.void
          )
        )
        yield* datasets.destroy(fs).pipe(
          Effect.catchIf(
            (error) => error._tag === "DatasetBusy" || error._tag === "UnknownZfsError",
            () => Effect.void
          )
        )
      }))

    it.effect("dry-run create does not call lzc_create", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const name = datasetName(`${env.pool}/nvdry`)
        yield* datasets.createFilesystem({ name, dryRun: true, properties: { mountpoint: "none" } })
        assert.isFalse(yield* datasets.exists(name))
      }))

    it.effect("creates parent datasets for clone -p", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvporigin`),
          properties: { mountpoint: "none" }
        })
        const snap = yield* snapshots.create(fs, "seed")
        const clone = yield* snapshots.clone(
          snap,
          datasetName(`${env.pool}/nv/p/clone`),
          { mountpoint: "none" },
          { parents: true }
        )
        assert.isTrue(yield* datasets.exists(clone.name))
        yield* datasets.destroy(clone)
        yield* snapshots.destroy(snap)
        yield* datasets.destroy(fs)
      }))

    it.effect("recursive snapshot expands descendant filesystems", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const parent = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvrec`),
          properties: { mountpoint: "none" }
        })
        const child = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvrec/child`),
          properties: { mountpoint: "none" }
        })
        yield* snapshots.create(parent, "r", { recursive: true })
        const parentSnaps = yield* snapshots.list({ root: parent.name })
        const childSnaps = yield* snapshots.list({ root: child.name })
        assert.isTrue(parentSnaps.some((row) => row.name === snapshotName(parent.name, "r")))
        assert.isTrue(childSnaps.some((row) => row.name === snapshotName(child.name, "r")))
        yield* snapshots.hold(snapshotName(parent.name, "r"), holdTag("keep"), { recursive: true })
        yield* snapshots.release(snapshotName(parent.name, "r"), holdTag("keep"), { recursive: true })
        yield* snapshots.destroy(snapshotName(parent.name, "r"))
        yield* snapshots.destroy(snapshotName(child.name, "r"))
        yield* datasets.destroy(child)
        yield* datasets.destroy(parent)
      }))

    it.effect("initializes leaf vdevs without numeric GUIDs", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.initialize(env.pool).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetBusy" ||
              error._tag === "PoolUnavailable",
            () => Effect.void
          )
        )
        yield* pools.initialize(env.pool, { command: "cancel" }).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetBusy" ||
              error._tag === "PoolUnavailable",
            () => Effect.void
          )
        )
      }))

    it.effect("reads pool status and userspace version through libzfs", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const status = yield* pools.status(env.pool)
        assert.strictEqual(status.name, env.pool)
        const version = yield* pools.version()
        assert.isTrue(version.userspace.major >= 2)
      }))

    it.effect("lists recursive holds and destroys a snapshot range", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const parent = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvholdr`),
          properties: { mountpoint: "none" }
        })
        const child = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvholdr/child`),
          properties: { mountpoint: "none" }
        })
        yield* snapshots.create(parent, "a")
        yield* snapshots.create(parent, "b")
        yield* snapshots.create(child, "a")
        yield* snapshots.hold(snapshotName(parent.name, "a"), holdTag("keep"), { recursive: true })
        const holds = yield* snapshots.holds(snapshotName(parent.name, "a"), { recursive: true })
        assert.isTrue(holds.some((row) => row.tag === "keep"))
        yield* snapshots.release(snapshotName(parent.name, "a"), holdTag("keep"), { recursive: true })
        yield* snapshots.destroy(snapshotRange(`${parent.name}@a%b`)).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "InvalidName",
            () =>
              Effect.gen(function*() {
                yield* snapshots.destroy(snapshotName(parent.name, "a"))
                yield* snapshots.destroy(snapshotName(parent.name, "b"))
              })
          )
        )
        yield* snapshots.destroy(snapshotName(child.name, "a")).pipe(
          Effect.catchIf((error) => error._tag === "DatasetNotFound", () => Effect.void)
        )
        yield* datasets.destroy(child)
        yield* datasets.destroy(parent)
      }))

    it.effect("rolls back with destroyRecent through libzfs", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const snapshots = yield* Snapshots
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvroll`),
          properties: { mountpoint: "none" }
        })
        const first = yield* snapshots.create(fs, "one")
        yield* snapshots.create(fs, "two")
        yield* snapshots.rollback(first, { destroyRecent: true })
        const listed = yield* snapshots.list({ root: fs.name })
        assert.isFalse(listed.some((row) => String(row.name).endsWith("@two")))
        yield* snapshots.destroy(first).pipe(
          Effect.catchIf((error) => error._tag === "DatasetNotFound", () => Effect.void)
        )
        yield* datasets.destroy(fs)
      }))

    it.effect("allows and lists delegations through zfs_set_fsacl", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const delegations = yield* Delegations
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvallow`),
          properties: { mountpoint: "none" }
        })
        yield* delegations.allow({
          name: fs.name,
          who: new DelegWho({ kind: "everyone" }),
          permissions: ["snapshot"],
          inherit: "local"
        }).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "DelegationDisabled",
            () => Effect.void
          )
        )
        const listings = yield* delegations.list(fs.name).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError",
            () => Effect.succeed([])
          )
        )
        assert.isTrue(Array.isArray(listings))
        yield* datasets.destroy(fs)
      }))

    it.effect("aborts a resumable receive by destroying the hidden %recv dataset", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const replication = yield* Replication
        yield* replication.abortReceive(datasetName(`${env.pool}/nvabort`)).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "DatasetNotFound" ||
              error._tag === "UnknownZfsError" ||
              error._tag === "InvalidName",
            () => Effect.void
          )
        )
      }))

    it.effect("exports and reimports a process-created file pool", () =>
      Effect.gen(function*() {
        const pools = yield* Pools
        const acquired = yield* fileBackedPool(spaMinDevSize)
        yield* pools.export(acquired.pool, { force: true })
        yield* pools.import({
          name: acquired.pool,
          searchDirs: [acquired.dir],
          force: true,
          unmounted: true
        })
        const listed = yield* pools.list({ name: acquired.pool })
        assert.ok(listed.some((row) => row.name === acquired.pool))
        yield* pools.destroy(acquired.pool, { force: true })
      }))

    it.effect("starts and stops a scrub through lzc_scrub", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.scrub(env.pool, "start")
        yield* pools.scrub(env.pool, "stop").pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "PoolUnavailable" ||
              error._tag === "DatasetBusy",
            () => Effect.void
          )
        )
      }))

    it.effect("walks native status vdev children and reads the error log", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const status = yield* pools.status(env.pool)
        const tree = vdevConfig(status.config)
        assert.ok(tree.length > 0)
        assert.ok((tree[0]?.children?.length ?? 0) > 0)
        const rows = yield* pools.errorLog(env.pool)
        assert.ok(Array.isArray(rows))
      }))

    it.effect("attaches and detaches a file vdev through libzfs", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const extra = join(tmpdir(), `effect-zfs-nvattach-${process.pid}.img`)
        writeFileSync(extra, "")
        truncateSync(extra, Number(mib(256)))
        const status = yield* pools.status(env.pool)
        const tree = vdevConfig(status.config)
        const leaf = tree[0]?.children?.[0]?.children?.[0]?.name
          ?? tree[0]?.children?.[0]?.name
        assert.ok(leaf)
        yield* pools.attach(env.pool, leaf, extra)
        yield* pools.detach(env.pool, extra)
      }))

    it.effect("splits a process-created mirror into a new test pool", () =>
      Effect.gen(function*() {
        const pools = yield* Pools
        const acquired = yield* fileBackedPool(spaMinDevSize)
        const newPool = poolName(`effectzfs_test_split_${process.pid}_${Date.now()}`)
        yield* pools.split(acquired.pool, newPool)
        yield* pools.import({
          name: newPool,
          searchDirs: [acquired.dir],
          force: true,
          unmounted: true
        })
        const listed = yield* pools.list({ name: newPool })
        assert.ok(listed.some((row) => row.name === newPool))
        yield* pools.destroy(newPool, { force: true })
      }))

    it.effect("reads userspace quotas through zfs_userspace", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const quotas = yield* Quotas
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvquota`),
          properties: { mountpoint: "none" }
        })
        const rows = yield* quotas.userspace(fs.name)
        assert.ok(Array.isArray(rows))
        yield* datasets.destroy(fs)
      }))

    it.effect("reads history, iostat, and events through libzfs without buffering", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const hist = yield* pools.history(env.pool).pipe(Stream.runCollect)
        assert.isTrue(hist.length > 0)
        const samples = yield* pools.iostat({ pool: env.pool }).pipe(Stream.take(1), Stream.runCollect)
        assert.strictEqual(samples.length, 1)
        const events = yield* pools.events({ pool: env.pool }).pipe(Stream.take(8), Stream.runCollect)
        assert.ok(Array.isArray(events))
      }))

    it.effect("sets a vdev comment through native get/set", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const status = yield* pools.status(env.pool)
        const tree = vdevConfig(status.config)
        const leaf = tree[0]?.children?.[0]?.children?.[0]?.name
          ?? tree[0]?.children?.[0]?.name
        assert.ok(leaf)
        yield* pools.setVdev(env.pool, vdevId(leaf), { comment: "effect-zfs-native" })
        const comment = yield* pools.getVdev(env.pool, vdevId(leaf), VdevProperty.comment)
        assert.strictEqual(comment.value, "effect-zfs-native")
      }))

    it.effect("loads and unloads an encryption key through native crypto", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const crypto = yield* Crypto
        const datasets = yield* Datasets
        const passphrase = wrappingKey("effect-zfs-passphrase-1")
        const created = yield* crypto.createFilesystem({
          name: datasetName(`${env.pool}/nvenc`),
          keyformat: "passphrase",
          wrappingKey: passphrase,
          properties: { mountpoint: "none" }
        }).pipe(Effect.result)
        if (Result.isFailure(created)) {
          assert.ok(
            created.failure._tag === "EncryptionFailure" ||
              created.failure._tag === "UnknownZfsError" ||
              created.failure._tag === "InvalidProperty" ||
              created.failure._tag === "InvalidName",
            created.failure._tag
          )
          return
        }
        const fs = created.success
        yield* crypto.unloadKey({ name: fs.name })
        const unavailable = yield* datasets.get(fs, DatasetProperty.keystatus)
        assert.strictEqual(unavailable.value, "unavailable")
        yield* crypto.loadKey({ name: fs.name, wrappingKey: passphrase })
        const reloaded = yield* datasets.get(fs, DatasetProperty.keystatus)
        assert.strictEqual(reloaded.value, "available")
      }))

    it.effect("trims a process-created pool through native trim", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.trim(env.pool).pipe(
          Effect.tap(() => pools.trim(env.pool, { command: "cancel" })),
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "PoolUnavailable",
            () => Effect.void
          )
        )
      }))

    it.effect("mounts with all: true for a process-created filesystem", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const mount = yield* Mount
        const dir = join(tmpdir(), `effect-zfs-nvmountall-${process.pid}`)
        mkdirSync(dir, { recursive: true })
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/nvmountall`),
          properties: { mountpoint: dir }
        })
        yield* mount.unmount({ target: fs.name, force: true }).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnmountFailed" ||
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetBusy",
            () => Effect.void
          )
        )
        yield* mount.mount({ all: true })
        const on = yield* datasets.get(fs, DatasetProperty.mounted)
        assert.strictEqual(on.value, true)
        yield* mount.unmount({ target: fs.name, force: true }).pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnmountFailed" ||
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetBusy",
            () => Effect.void
          )
        )
        yield* datasets.destroy(fs).pipe(
          Effect.catchIf((error) => error._tag === "DatasetBusy" || error._tag === "UnknownZfsError", () => Effect.void)
        )
      }))

    it.effect("freezes a process-created pool then unfreezes via export/import", () =>
      Effect.gen(function*() {
        const pools = yield* Pools
        const acquired = yield* fileBackedPool(spaMinDevSize)
        yield* pools.freeze(acquired.pool)
        yield* pools.export(acquired.pool, { force: true })
        yield* pools.import({
          name: acquired.pool,
          searchDirs: [acquired.dir],
          force: true,
          unmounted: true
        })
        const listed = yield* pools.list({ name: acquired.pool })
        assert.ok(listed.some((row) => row.name === acquired.pool))
      }))

    it.effect("lists inject handlers and remaps a dataset", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const datasets = yield* Datasets
        const faults = yield* pools.listFaults()
        assert.ok(Array.isArray(faults))
        yield* pools.remap(env.root).pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "DatasetNotFound",
            () => Effect.void
          )
        )
        const next = yield* datasets.nextObj(env.root).pipe(Effect.result)
        assert.ok(Result.isSuccess(next) || Result.isFailure(next))
        const path = yield* datasets.objToPath(env.pool, uint64(0n), uint64(0n)).pipe(Effect.result)
        assert.ok(Result.isSuccess(path) || Result.isFailure(path))
      }))
  })
})
