import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Schema, Sink, Stream } from "effect"
import { ChildProcessSpawner } from "effect/unstable/process"
import * as ZfsCli from "../src/Cli.js"
import {
  Cache,
  CheckpointPool,
  CreatePool,
  DestroyPool,
  Draid,
  ExportPool,
  File,
  ImportPool,
  LabelClear,
  ReguidPool,
  Log,
  Mirror,
  Raidz,
  Spare,
  UpgradePool,
  devicePath
} from "../src/Args.js"
import { PoolListItem } from "../src/Args.js"
import { byteCount, spaMinDevSize } from "../src/Limits.js"
import { poolName } from "../src/Name.js"
import { Pools } from "../src/Pool.js"
import { ZfsProtocol } from "../src/Protocol.js"
import * as Test from "../src/Test.js"
import { layer } from "../src/index.js"

const bytes = (text: string) => new TextEncoder().encode(text)

const handle = (input: {
  readonly stdout?: Stream.Stream<Uint8Array>
  readonly stderr?: string
  readonly exitCode?: number
}) =>
  ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(42),
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(input.exitCode ?? 0)),
    isRunning: Effect.succeed(true),
    kill: () => Effect.void,
    stdin: Sink.drain,
    stdout: input.stdout ?? Stream.empty,
    stderr: Stream.make(bytes(input.stderr ?? "")),
    all: Stream.empty,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void)
  })

const fakeSpawner = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(ChildProcessSpawner.make(spawnImpl))

describe("pool create/destroy vdev AST", () => {
  it("rejects a file vdev smaller than SPA_MINDEVSIZE", () => {
    const result = Schema.decodeUnknownExit(File)({
      _tag: "File",
      path: "/tmp/a.img",
      size: 32n << 20n
    })
    assert.strictEqual(result._tag, "Failure")
  })

  it("accepts a file vdev at SPA_MINDEVSIZE", () => {
    const leaf = new File({ path: devicePath("/tmp/a.img"), size: spaMinDevSize })
    assert.strictEqual(leaf._tag, "File")
    assert.strictEqual(leaf.size, spaMinDevSize)
  })

  it.effect("encodes zpool create topology as argv", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const zfs = yield* ZfsProtocol
      yield* zfs.createPool(new CreatePool({
        name: poolName("effectzfs_test_demo"),
        vdevs: [
          new Mirror({
            children: [
              new File({ path: devicePath("/tmp/a.img"), size: spaMinDevSize }),
              new File({ path: devicePath("/tmp/b.img"), size: spaMinDevSize })
            ]
          }),
          new Raidz({
            parity: 2,
            children: [
              new File({ path: devicePath("/tmp/c.img"), size: spaMinDevSize }),
              new File({ path: devicePath("/tmp/d.img"), size: spaMinDevSize }),
              new File({ path: devicePath("/tmp/e.img"), size: spaMinDevSize })
            ]
          }),
          new Draid({
            parity: 1,
            data: 4,
            spares: 1,
            children: [
              new File({ path: devicePath("/tmp/f.img"), size: spaMinDevSize }),
              new File({ path: devicePath("/tmp/g.img"), size: spaMinDevSize })
            ]
          })
        ],
        log: new Log({
          children: [
            new Mirror({
              children: [
                new File({ path: devicePath("/tmp/log-a.img"), size: spaMinDevSize }),
                new File({ path: devicePath("/tmp/log-b.img"), size: spaMinDevSize })
              ]
            })
          ]
        }),
        cache: new Cache({
          children: [new File({ path: devicePath("/tmp/cache.img"), size: spaMinDevSize })]
        }),
        spare: new Spare({
          children: [new File({ path: devicePath("/tmp/spare.img"), size: spaMinDevSize })]
        }),
        force: true,
        properties: [],
        filesystemProperties: [],
        mountpoint: "none"
      }))
      assert.deepStrictEqual(args, [
        "create",
        "-f",
        "-m",
        "none",
        "effectzfs_test_demo",
        "mirror",
        "/tmp/a.img",
        "/tmp/b.img",
        "raidz2",
        "/tmp/c.img",
        "/tmp/d.img",
        "/tmp/e.img",
        "draid1:4d:1s",
        "/tmp/f.img",
        "/tmp/g.img",
        "log",
        "mirror",
        "/tmp/log-a.img",
        "/tmp/log-b.img",
        "cache",
        "/tmp/cache.img",
        "spare",
        "/tmp/spare.img"
      ])
    }).pipe(Effect.provide(
      ZfsCli.protocolLayer.pipe(
        Layer.provideMerge(ZfsCli.processLayer),
        Layer.provide(fakeSpawner((cmd) => {
          if (cmd._tag === "StandardCommand") args = cmd.args
          return Effect.succeed(handle({ exitCode: 0 }))
        }))
      )
    ))
  })

  it.effect("encodes zpool destroy -f as argv", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const zfs = yield* ZfsProtocol
      yield* zfs.destroyPool(new DestroyPool({
        name: poolName("effectzfs_test_demo"),
        force: true
      }))
      assert.deepStrictEqual(args, ["destroy", "-f", "effectzfs_test_demo"])
    }).pipe(Effect.provide(
      ZfsCli.protocolLayer.pipe(
        Layer.provideMerge(ZfsCli.processLayer),
        Layer.provide(fakeSpawner((cmd) => {
          if (cmd._tag === "StandardCommand") args = cmd.args
          return Effect.succeed(handle({ exitCode: 0 }))
        }))
      )
    ))
  })

  it.effect("encodes zpool export/import/upgrade/checkpoint/labelclear argv", () => {
    const captured: Array<ReadonlyArray<string>> = []
    return Effect.gen(function*() {
      const zfs = yield* ZfsProtocol
      const name = poolName("effectzfs_test_demo")
      yield* zfs.exportPool(new ExportPool({ name, force: true }))
      yield* zfs.importPool(new ImportPool({
        name,
        searchDirs: ["/tmp/effect-zfs"],
        unmounted: true
      }))
      yield* zfs.reguidPool(new ReguidPool({ name }))
      yield* zfs.upgradePool(new UpgradePool({ name }))
      yield* zfs.checkpointPool(new CheckpointPool({ name }))
      yield* zfs.checkpointPool(new CheckpointPool({ name, discard: true }))
      yield* zfs.labelClear(new LabelClear({
        device: devicePath("/tmp/effect-zfs/a.img"),
        force: true
      }))
      assert.deepStrictEqual(captured, [
        ["export", "-f", "effectzfs_test_demo"],
        ["import", "-d", "/tmp/effect-zfs", "-N", "effectzfs_test_demo"],
        ["reguid", "effectzfs_test_demo"],
        ["upgrade", "effectzfs_test_demo"],
        ["checkpoint", "effectzfs_test_demo"],
        ["checkpoint", "--discard", "effectzfs_test_demo"],
        ["labelclear", "-f", "/tmp/effect-zfs/a.img"]
      ])
    }).pipe(Effect.provide(
      ZfsCli.protocolLayer.pipe(
        Layer.provideMerge(ZfsCli.processLayer),
        Layer.provide(fakeSpawner((cmd) => {
          if (cmd._tag === "StandardCommand") captured.push(cmd.args)
          return Effect.succeed(handle({ exitCode: 0 }))
        }))
      )
    ))
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
    }).pipe(Effect.provide(layer.pipe(
      Layer.provide(Test.layer({
        listPools: () => [new PoolListItem({
          name: poolName("tank"),
          size: byteCount(1024n),
          free: byteCount(512n),
          health: "ONLINE"
        })],
        createPool: () => undefined,
        destroyPool: () => undefined
      }))
    )))
  )
})
