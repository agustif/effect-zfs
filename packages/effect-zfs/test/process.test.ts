import { assert, describe, it } from "@effect/vitest"
import { Data, Effect, Exit, Fiber, Layer, Sink, Stream } from "effect"
import { systemError } from "effect/PlatformError"
import { ChildProcessSpawner } from "effect/unstable/process"
import * as ZfsCli from "../src/Cli.js"
import { command } from "../src/Protocol.js"
import { ZfsProcess } from "../src/Process.js"
import { Crypto } from "../src/Crypto.js"
import { wrappingKey } from "../src/Args.js"
import { Mount } from "../src/Mount.js"
import { Pools } from "../src/Pool.js"
import { Replication } from "../src/Replication.js"
import { Snapshots } from "../src/Snapshot.js"
import { datasetName, poolName } from "../src/Name.js"
import { snapshotName } from "../src/Name.js"
import { byteCount } from "../src/Limits.js"

class UpstreamBoom extends Data.TaggedError("UpstreamBoom")<{
  readonly message: string
}> {}

const bytes = (text: string) => new TextEncoder().encode(text)

const handle = (input: {
  readonly stdout?: Stream.Stream<Uint8Array>
  readonly stderr?: string
  readonly exitCode?: number
  readonly onRelease?: () => void
  readonly stdin?: Sink.Sink<unknown, Uint8Array>
}) =>
  ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(42),
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(input.exitCode ?? 0)),
    isRunning: Effect.succeed(true),
    kill: () => Effect.void,
    stdin: input.stdin ?? Sink.drain,
    stdout: input.stdout ?? Stream.empty,
    stderr: Stream.make(bytes(input.stderr ?? "")),
    all: Stream.empty,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void)
  })

const fakeSpawner = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(ChildProcessSpawner.make(spawnImpl))

const cli = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Replication.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

const cliPools = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Pools.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

const cliSnapshots = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Snapshots.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

const cliMount = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Mount.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

const cliCrypto = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Crypto.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

describe("cli process streams", () => {
  it.effect("maps spawn failure to ZfsTransportError", () =>
    Effect.gen(function*() {
      const process = yield* ZfsProcess
      const error = yield* process.run(command("zfs", "list")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ZfsTransportError")
    }).pipe(Effect.provide(cli(() => Effect.fail(systemError({
      _tag: "Unknown",
      module: "ChildProcess",
      method: "spawn",
      description: "execve failed"
    })))))
  )

  it.effect("fails the send stream after partial stdout when the child exits non-zero", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const collected: Array<string> = []
      const error = yield* replication.send(snapshotName(datasetName("tank/src"), "seed")).pipe(
        Stream.tap((chunk) => Effect.sync(() => collected.push(new TextDecoder().decode(chunk)))),
        Stream.runDrain,
        Effect.flip
      )
      assert.deepStrictEqual(collected, ["PARTIAL"])
      assert.notStrictEqual(error._tag, "ZfsTransportError")
      assert.ok(error._tag === "UnknownZfsError" || error._tag === "DatasetNotFound")
    }).pipe(Effect.provide(cli(() => Effect.succeed(handle({
      stdout: Stream.make(bytes("PARTIAL")),
      stderr: "cannot send 'tank/src@seed': dataset does not exist",
      exitCode: 1
    })))))
  )

  it.effect("turns an early non-zero exit into a stream failure with no silent EOF", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const error = yield* replication.send(snapshotName(datasetName("tank/src"), "seed")).pipe(
        Stream.runCollect,
        Effect.flip
      )
      assert.ok(error._tag !== "ZfsTransportError")
    }).pipe(Effect.provide(cli(() => Effect.succeed(handle({
      stdout: Stream.empty,
      stderr: "cannot send: dataset does not exist",
      exitCode: 1
    })))))
  )

  it.effect("reaps the child through Scope when the consumer is interrupted", () => {
    let released = false
    return Effect.gen(function*() {
      const replication = yield* Replication
      const fiber = yield* replication.send(snapshotName(datasetName("tank/src"), "seed")).pipe(
        Stream.runDrain,
        Effect.forkChild
      )
      yield* Effect.yieldNow
      yield* Fiber.interrupt(fiber)
      const exit = yield* Fiber.await(fiber)
      assert.isTrue(Exit.hasInterrupts(exit))
      assert.isTrue(released)
    }).pipe(Effect.provide(cli(() =>
      Effect.gen(function*() {
        yield* Effect.addFinalizer(() =>
          Effect.sync(() => {
            released = true
          })
        )
        return handle({
          stdout: Stream.never,
          exitCode: 0
        })
      })
    )))
  })

  it.effect("parses zfs holds -Hp rows as bigint timestamps", () =>
    Effect.gen(function*() {
      const snapshots = yield* Snapshots
      const rows = yield* snapshots.holds(snapshotName(datasetName("tank/src"), "seed"))
      assert.strictEqual(rows.length, 1)
      assert.strictEqual(rows[0]?.snapshot, "tank/src@seed")
      assert.strictEqual(rows[0]?.tag, "keep")
      assert.strictEqual(rows[0]?.timestamp, 1700000000n)
    }).pipe(Effect.provide(cliSnapshots(() => Effect.succeed(handle({
      stdout: Stream.make(bytes("tank/src@seed\tkeep\t1700000000\n")),
      exitCode: 0
    })))))
  )

  it.effect("maps typed trim args to zpool trim argv", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.trim(poolName("tank"), {
        command: "cancel",
        secure: true,
        wait: true,
        rate: byteCount(1048576n),
        devices: ["/dev/sda"]
      })
    }).pipe(Effect.provide(cliPools((cmd) => {
      assert.strictEqual(cmd._tag, "StandardCommand")
      if (cmd._tag === "StandardCommand") {
        assert.strictEqual(cmd.command, "zpool")
        assert.deepStrictEqual(cmd.args, ["trim", "-d", "-w", "-r", "1048576", "-c", "tank", "/dev/sda"])
      }
      return Effect.succeed(handle({ exitCode: 0 }))
    })))
  )

  it.effect("maps typed initialize/clear/reopen/sync args to zpool argv", () => {
    const seen: Array<ReadonlyArray<string>> = []
    return Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.initialize(poolName("tank"), { command: "uninit" })
      yield* pools.clear(poolName("tank"), { rewind: true, dryRun: true })
      yield* pools.reopen(poolName("tank"), { noRestart: true })
      yield* pools.sync(poolName("tank"))
      assert.deepStrictEqual(seen, [
        ["zpool", "initialize", "-u", "tank"],
        ["zpool", "clear", "-n", "-F", "tank"],
        ["zpool", "reopen", "-n", "tank"],
        ["zpool", "sync", "tank"]
      ])
    }).pipe(Effect.provide(cliPools((cmd) => {
      if (cmd._tag === "StandardCommand") {
        seen.push([cmd.command, ...cmd.args])
      }
      return Effect.succeed(handle({ exitCode: 0 }))
    })))
  })

  it.effect("maps typed mount/unmount/share/unshare args to zfs argv", () => {
    const seen: Array<ReadonlyArray<string>> = []
    return Effect.gen(function*() {
      const mount = yield* Mount
      yield* mount.mount({ name: datasetName("tank/data"), overlay: true, options: "ro" })
      yield* mount.unmount({ target: datasetName("tank/data"), unloadKeys: true })
      yield* mount.share({ name: datasetName("tank/data"), loadKeys: true })
      yield* mount.unshare({ all: true })
      assert.deepStrictEqual(seen, [
        ["zfs", "mount", "-O", "-o", "ro", "tank/data"],
        ["zfs", "unmount", "-u", "tank/data"],
        ["zfs", "share", "-l", "tank/data"],
        ["zfs", "unshare", "-a"]
      ])
    }).pipe(Effect.provide(cliMount((cmd) => {
      if (cmd._tag === "StandardCommand") {
        seen.push([cmd.command, ...cmd.args])
      }
      return Effect.succeed(handle({ exitCode: 0 }))
    })))
  })

  it.effect("preserves typed upstream errors on receive stdin", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const error = yield* replication.receive({
        target: datasetName("tank/dst"),
        stream: Stream.fail(new UpstreamBoom({ message: "producer failed" }))
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "UpstreamBoom")
    }).pipe(Effect.provide(cli(() => Effect.succeed(handle({ exitCode: 0 })))))
  )

  it.effect("pipes wrapping keys on stdin and never puts them on argv", () => {
    const secret = "effect-zfs-passphrase-1"
    const stdinChunks: Array<Uint8Array> = []
    const argv: Array<string> = []
    return Effect.gen(function*() {
      const crypto = yield* Crypto
      yield* crypto.loadKey({
        name: datasetName("tank/enc"),
        wrappingKey: wrappingKey(secret)
      })
      assert.isTrue(argv.includes("load-key"))
      assert.isFalse(argv.includes(secret))
      const joined = new TextDecoder().decode(stdinChunks[0] ?? new Uint8Array())
      assert.strictEqual(joined, `${secret}\n`)
    }).pipe(Effect.provide(cliCrypto((cmd) => {
      if (cmd._tag === "StandardCommand") {
        argv.push(cmd.command, ...cmd.args)
      }
      return Effect.succeed(handle({
        exitCode: 0,
        stdin: Sink.forEach((chunk: Uint8Array) =>
          Effect.sync(() => {
            stdinChunks.push(chunk)
          })
        )
      }))
    })))
  })
})
