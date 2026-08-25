import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Result, Stream } from "effect"
import * as ZfsCli from "../../src/cli/index.js"
import { layer } from "../../src/index.js"
import { CommandResult, type ZfsCommand, ZfsProcess } from "../../src/protocol/process.js"
import { poolName } from "../../src/schema/name.js"
import { featuresFor, linux, parseZfsVersionLine } from "../../src/schema/version.js"
import { Pools } from "../../src/services/pools.js"

const recorded: Array<ZfsCommand> = []

const fakeProcess = Layer.succeed(
  ZfsProcess,
  ZfsProcess.of({
    run: (command) => {
      recorded.push(command)
      const stdout = command.binary === "zfs" && command.args[0] === "version"
        ? "zfs-2.4.1-1\nzfs-kmod-2.4.1-1\n"
        : ""
      return Effect.succeed(new CommandResult({ command, stdout, stderr: "", exitCode: 0 }))
    },
    stream: () => Stream.empty,
    runWithInput: (command) => Effect.succeed(new CommandResult({ command, stdout: "", stderr: "", exitCode: 0 }))
  })
)

const provided = layer.pipe(
  Layer.provide(ZfsCli.protocolLayer),
  Layer.provide(fakeProcess)
)

describe("linux zfs 2.4", () => {
  it("enables all-pool and scrub time-range flags", () => {
    const version = parseZfsVersionLine("zfs-2.4.0")
    assert.isTrue(featuresFor(version).allPoolsOps)
    assert.isTrue(featuresFor(version).scrubTimeRange)
    assert.isTrue(featuresFor(version).rewritePreserve)
    assert.isTrue(featuresFor(version).prefetchBrt)
    assert.isTrue(featuresFor(version).defaultQuotas)
    assert.isFalse(featuresFor(linux.v2_3_9).allPoolsOps)
  })

  it.effect("refuses trim/initialize/scrub -a and still encodes scrub time range", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const pools = yield* Pools
      const trimAll = yield* pools.trim(poolName("tank"), { all: true }).pipe(Effect.result)
      const initAll = yield* pools.initialize(poolName("tank"), { all: true }).pipe(Effect.result)
      assert.isTrue(Result.isFailure(trimAll))
      assert.isTrue(Result.isFailure(initAll))
      const scrubAll = yield* pools.scrub(poolName("tank"), "start", { all: true }).pipe(Effect.result)
      assert.isTrue(Result.isFailure(scrubAll))
      yield* pools.scrub(poolName("tank"), "start", {
        startAfter: "2026-01-01",
        endBefore: "2026-01-02"
      })
      const argv = recorded.map((command) => [command.binary, ...command.args])
      assert.deepStrictEqual(argv.filter((row) => row[0] === "zpool"), [
        ["zpool", "scrub", "-S", "2026-01-01", "-E", "2026-01-02", "tank"]
      ])
    }).pipe(Effect.provide(provided)))
})
