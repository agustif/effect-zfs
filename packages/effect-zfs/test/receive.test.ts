import { assert, describe, it } from "@effect/vitest"
import { Effect, Stream } from "effect"
import { abortReceiveArgv, receiveArgv } from "../src/Cli.js"
import {
  AbortReceive,
  EncodedProperty,
  Receive,
  propertyName
} from "../src/Args.js"
import { datasetName, snapshotName } from "../src/Name.js"
import { lzcReceiveKind } from "../src/Native.js"
import { Replication } from "../src/Replication.js"
import { layer } from "../src/index.js"
import * as Test from "../src/Test.js"

const target = datasetName("tank/dst")

describe("zfs receive args and native lzc selection", () => {
  it("emits exact dest with force/unmounted by default", () => {
    assert.deepStrictEqual(
      receiveArgv(new Receive({ target, force: true, unmounted: true })),
      ["receive", "-F", "-u", "tank/dst"]
    )
  })

  it("emits -d/-e dest, -o/-x props, -M/-n/-s/-h/-v, heal, and origin", () => {
    const argv = receiveArgv(new Receive({
      target: datasetName("tank/recv"),
      dest: "prefix",
      origin: snapshotName(datasetName("tank/origin"), "seed"),
      properties: [new EncodedProperty({ name: propertyName("compression"), value: "lz4" })],
      exclude: [propertyName("mountpoint")],
      forceUnmount: true,
      dryRun: true,
      resumable: true,
      skipHolds: true,
      verbose: true,
      heal: true,
      unmounted: true
    }))
    assert.deepStrictEqual(argv, [
      "receive",
      "-c",
      "-d",
      "-h",
      "-M",
      "-n",
      "-o",
      "origin=tank/origin@seed",
      "-o",
      "compression=lz4",
      "-s",
      "-u",
      "-v",
      "-x",
      "mountpoint",
      "tank/recv"
    ])
    assert.deepStrictEqual(
      receiveArgv(new Receive({ target, dest: "tail" })),
      ["receive", "-e", "tank/dst"]
    )
  })

  it("emits receive -A for abort", () => {
    assert.deepStrictEqual(
      abortReceiveArgv(new AbortReceive({ target })),
      ["receive", "-A", "tank/dst"]
    )
  })

  it("selects lzc_receive* for resumable, cmdprops, and heal", () => {
    assert.strictEqual(lzcReceiveKind(new Receive({ target })), "lzc_receive")
    assert.strictEqual(
      lzcReceiveKind(new Receive({ target, resumable: true })),
      "lzc_receive_resumable"
    )
    assert.strictEqual(
      lzcReceiveKind(new Receive({
        target,
        properties: [new EncodedProperty({ name: propertyName("compression"), value: "lz4" })]
      })),
      "lzc_receive_with_cmdprops"
    )
    assert.strictEqual(
      lzcReceiveKind(new Receive({ target, origin: snapshotName(datasetName("tank/o"), "s") })),
      "lzc_receive_with_cmdprops"
    )
    assert.strictEqual(
      lzcReceiveKind(new Receive({ target, exclude: [propertyName("atime")] })),
      "lzc_receive_with_cmdprops"
    )
    assert.strictEqual(
      lzcReceiveKind(new Receive({ target, heal: true, resumable: true })),
      "lzc_receive_with_heal"
    )
  })

  it.effect("aborts through the typed protocol", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      yield* replication.abortReceive(target)
    }).pipe(
      Effect.provide(layer),
      Effect.provide(Test.layer({
        abortReceive: (input) => {
          assert.strictEqual(input.target, target)
        }
      }))
    )
  )
})

describe("replication receive flags", () => {
  it.effect("forwards dest, resumable, heal, and cmdprops through the protocol", () => {
    const seen: Array<Receive> = []
    return Effect.gen(function*() {
      const replication = yield* Replication
      yield* replication.receive({
        target,
        dest: "prefix",
        resumable: true,
        heal: true,
        unmounted: true,
        properties: [new EncodedProperty({ name: propertyName("compression"), value: "lz4" })],
        exclude: [propertyName("atime")],
        stream: Stream.empty
      })
      const input = seen[0]
      assert.ok(input)
      assert.strictEqual(input.dest, "prefix")
      assert.strictEqual(input.resumable, true)
      assert.strictEqual(input.heal, true)
      assert.strictEqual(input.unmounted, true)
      assert.strictEqual(input.properties?.[0]?.name, "compression")
      assert.strictEqual(input.exclude?.[0], "atime")
      assert.strictEqual(lzcReceiveKind(input), "lzc_receive_with_heal")
    }).pipe(
      Effect.provide(layer),
      Effect.provide(Test.layer({
        receive: (input) => {
          seen.push(input)
        }
      }))
    )
  })
})
