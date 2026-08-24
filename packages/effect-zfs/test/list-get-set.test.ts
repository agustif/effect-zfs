import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Sink, Stream } from "effect"
import { ChildProcessSpawner } from "effect/unstable/process"
import * as ZfsCli from "../src/Cli.js"
import {
  GetProperty,
  InheritProperty,
  ListDatasets,
  PropertySort,
  SetProperty,
  propertyName
} from "../src/Args.js"
import { Datasets } from "../src/Dataset.js"
import { DatasetProperty } from "../src/generated/properties.generated.js"
import { datasetName } from "../src/Name.js"
import { ZfsProtocol } from "../src/Protocol.js"
import { PropertyGetRow } from "../src/Schemas.js"
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

const cli = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  ZfsCli.layer.pipe(Layer.provide(fakeSpawner(spawnImpl)))

describe("list/get/set/inherit flags", () => {
  it("accepts generated property names, all, and user properties", () => {
    assert.strictEqual(propertyName("compression"), "compression")
    assert.strictEqual(propertyName("all"), "all")
    assert.strictEqual(propertyName("name"), "name")
    assert.strictEqual(propertyName("org.effect:lab"), "org.effect:lab")
    assert.throws(() => propertyName("not-a-real-property"))
  })

  it.effect("listDatasets passes -t -d -S and extra -o columns and keeps bigint sizes", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const protocol = yield* ZfsProtocol
      const rows = yield* protocol.listDatasets(new ListDatasets({
        root: datasetName("tank/data"),
        types: ["snapshot"],
        depth: 1,
        sort: [new PropertySort({ property: propertyName("name"), descending: true })],
        columns: [propertyName("guid")]
      }))
      assert.deepStrictEqual(args, [
        "list",
        "-Hp",
        "-d",
        "1",
        "-t",
        "snapshot",
        "-S",
        "name",
        "-o",
        "name,type,used,available,referenced,mountpoint,guid",
        "tank/data"
      ])
      assert.strictEqual(rows[0]?.kind, "snapshot")
      assert.strictEqual(rows[0]?.used, 1024n)
      assert.strictEqual(rows[0]?.extra?.guid, "99")
    }).pipe(Effect.provide(cli((command) => {
      if (command._tag === "StandardCommand") args = command.args
      return Effect.succeed(handle({
        stdout: Stream.make(bytes("tank/data@seed\tsnapshot\t1024\t-\t256\t-\t99\n"))
      }))
    })))
  })

  it.effect("getProperties uses all, -r, -t, -s and returns every row", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const protocol = yield* ZfsProtocol
      const rows = yield* protocol.getProperties(new GetProperty({
        scope: "dataset",
        name: datasetName("tank/data"),
        property: propertyName("all"),
        recursive: true,
        types: ["filesystem", "bookmark"],
        sources: ["local", "received"]
      }))
      assert.deepStrictEqual(args, [
        "get",
        "-Hp",
        "-r",
        "-t",
        "filesystem,bookmark",
        "-s",
        "local,received",
        "-o",
        "name,property,value,received,source",
        "all",
        "tank/data"
      ])
      assert.strictEqual(rows.length, 2)
      assert.strictEqual(rows[0]?.property, "compression")
      assert.strictEqual(rows[1]?.property, "atime")
    }).pipe(Effect.provide(cli((command) => {
      if (command._tag === "StandardCommand") args = command.args
      return Effect.succeed(handle({
        stdout: Stream.make(bytes(
          "tank/data\tcompression\tlz4\t-\tlocal\n" +
          "tank/data\tatime\toff\t-\tdefault\n"
        ))
      }))
    })))
  })

  it.effect("setProperty passes -u and extra targets", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const protocol = yield* ZfsProtocol
      yield* protocol.setProperty(new SetProperty({
        scope: "dataset",
        name: datasetName("tank/a"),
        property: propertyName("compression"),
        value: "lz4",
        unmounted: true,
        targets: [datasetName("tank/b")]
      }))
      assert.deepStrictEqual(args, [
        "set",
        "-u",
        "compression=lz4",
        "tank/a",
        "tank/b"
      ])
    }).pipe(Effect.provide(cli((command) => {
      if (command._tag === "StandardCommand") args = command.args
      return Effect.succeed(handle({}))
    })))
  })

  it.effect("inheritProperty passes -r and -S", () => {
    let args: ReadonlyArray<string> = []
    return Effect.gen(function*() {
      const protocol = yield* ZfsProtocol
      yield* protocol.inheritProperty(new InheritProperty({
        name: datasetName("tank/data"),
        property: propertyName("atime"),
        recursive: true,
        received: true
      }))
      assert.deepStrictEqual(args, [
        "inherit",
        "-r",
        "-S",
        "atime",
        "tank/data"
      ])
    }).pipe(Effect.provide(cli((command) => {
      if (command._tag === "StandardCommand") args = command.args
      return Effect.succeed(handle({}))
    })))
  })

  it.effect("Datasets.getAll and inherit/set options reach the protocol", () => {
    const captured: {
      getAll?: string
      inheritRecursive?: boolean
      inheritReceived?: boolean
      setUnmounted?: boolean
      setTargets?: ReadonlyArray<string>
    } = {}
    return Effect.gen(function*() {
      const datasets = yield* Datasets
      const rows = yield* datasets.getAll(datasetName("tank/data"), {
        recursive: true,
        types: ["filesystem"]
      })
      yield* datasets.inherit(datasetName("tank/data"), DatasetProperty.atime, {
        recursive: true,
        received: true
      })
      yield* datasets.setProperty(
        datasetName("tank/data"),
        DatasetProperty.atime,
        false,
        { unmounted: true, targets: [datasetName("tank/other")] }
      )
      assert.strictEqual(captured.getAll, "all")
      assert.strictEqual(captured.inheritRecursive, true)
      assert.strictEqual(captured.inheritReceived, true)
      assert.strictEqual(captured.setUnmounted, true)
      assert.deepStrictEqual(captured.setTargets, ["tank/other"])
      assert.strictEqual(rows[0]?.property, "compression")
    }).pipe(Effect.provide(layer.pipe(Layer.provide(Test.layer({
      getProperties: (input) => {
        captured.getAll = input.property
        return [new PropertyGetRow({
          name: input.name,
          property: "compression",
          value: "lz4",
          source: "local"
        })]
      },
      inheritProperty: (input) => {
        captured.inheritRecursive = input.recursive
        captured.inheritReceived = input.received
      },
      setProperty: (input) => {
        captured.setUnmounted = input.unmounted
        captured.setTargets = input.targets
      }
    })))))
  })
})
