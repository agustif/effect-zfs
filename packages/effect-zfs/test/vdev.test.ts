import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Sink, Stream } from "effect"
import { ChildProcessSpawner } from "effect/unstable/process"
import { devicePath, Disk, encodeVdev, encodeVdevs, Mirror, Spare, vdevId } from "../src/args/index.js"
import * as ZfsCli from "../src/cli/index.js"
import { layer } from "../src/index.js"
import * as Test from "../src/protocol/test.js"
import { poolName } from "../src/schema/name.js"
import { Pools } from "../src/services/pools.js"

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

describe("vdev identifiers and topology tokens", () => {
  it("brands absolute leaf paths and status-tree identifiers", () => {
    assert.strictEqual(devicePath("/tmp/a.img"), "/tmp/a.img")
    assert.strictEqual(vdevId("mirror-0"), "mirror-0")
    assert.strictEqual(vdevId("123456789"), "123456789")
    assert.throws(() => devicePath("sda"))
    assert.throws(() => devicePath("/"))
    assert.throws(() => vdevId("id\nwith newline"))
  })

  it("encodes add topology the way zpool add parses it", () => {
    const diskA = new Disk({ path: devicePath("/tmp/a.img") })
    const diskB = new Disk({ path: devicePath("/tmp/b.img") })
    const spare = new Spare({ children: [new Disk({ path: devicePath("/tmp/spare.img") })] })
    assert.deepStrictEqual([...encodeVdev(diskA)], ["/tmp/a.img"])
    assert.deepStrictEqual([...encodeVdev(new Mirror({ children: [diskA, diskB] }))], [
      "mirror",
      "/tmp/a.img",
      "/tmp/b.img"
    ])
    assert.deepStrictEqual([...encodeVdevs([spare])], ["spare", "/tmp/spare.img"])
  })
})

describe("pool vdev mutate protocol", () => {
  it.effect("adds and offlines through typed Pools methods", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.add(poolName("tank"), [
        new Spare({ children: [new Disk({ path: devicePath("/tmp/spare.img") })] })
      ])
      yield* pools.offline(poolName("tank"), [vdevId("/tmp/a.img")], { temporary: true })
      yield* pools.online(poolName("tank"), [vdevId("/tmp/a.img")], { expand: true })
      yield* pools.attach(poolName("tank"), vdevId("/tmp/a.img"), devicePath("/tmp/c.img"))
      yield* pools.detach(poolName("tank"), vdevId("/tmp/c.img"))
      yield* pools.replace(poolName("tank"), vdevId("/tmp/b.img"), devicePath("/tmp/d.img"))
      yield* pools.remove(poolName("tank"), [vdevId("/tmp/spare.img")])
      yield* pools.split(poolName("tank"), poolName("tank2"))
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        addVdevs: (input) => {
          assert.strictEqual(input.pool, "tank")
          assert.strictEqual(input.vdevs[0]?._tag, "Spare")
        },
        offlineVdevs: (input) => {
          assert.strictEqual(input.temporary, true)
          assert.strictEqual(input.devices[0], "/tmp/a.img")
        },
        onlineVdevs: (input) => {
          assert.strictEqual(input.expand, true)
        },
        attachVdev: (input) => {
          assert.strictEqual(input.device, "/tmp/a.img")
          assert.strictEqual(input.newDevice, "/tmp/c.img")
        },
        detachVdev: (input) => {
          assert.strictEqual(input.device, "/tmp/c.img")
        },
        replaceVdev: (input) => {
          assert.strictEqual(input.newDevice, "/tmp/d.img")
        },
        removeVdevs: (input) => {
          assert.strictEqual(input.devices[0], "/tmp/spare.img")
        },
        splitPool: (input) => {
          assert.strictEqual(input.newPool, "tank2")
        }
      }))))
    ))

  it.effect("builds zpool add/offline argv without domain services spawning", () => {
    const captured: Array<{ readonly command: string; readonly args: ReadonlyArray<string> }> = []
    return Effect.gen(function*() {
      const pools = yield* Pools
      yield* pools.add(poolName("tank"), [
        new Mirror({
          children: [
            new Disk({ path: devicePath("/tmp/a.img") }),
            new Disk({ path: devicePath("/tmp/b.img") })
          ]
        })
      ], { force: true })
      yield* pools.offline(poolName("tank"), [vdevId("/tmp/a.img")], { temporary: true })
      assert.deepStrictEqual(captured[0], {
        command: "zpool",
        args: ["add", "-f", "tank", "mirror", "/tmp/a.img", "/tmp/b.img"]
      })
      assert.deepStrictEqual(captured[1], {
        command: "zpool",
        args: ["offline", "-t", "tank", "/tmp/a.img"]
      })
    }).pipe(
      Effect.provide(Pools.layer.pipe(
        Layer.provideMerge(ZfsCli.layer),
        Layer.provide(fakeSpawner((command) => {
          if (command._tag === "StandardCommand") {
            captured.push({ command: command.command, args: command.args })
          }
          return Effect.succeed(handle({ exitCode: 0 }))
        }))
      ))
    )
  })
})
