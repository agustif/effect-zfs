import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import {
  InjectFault,
  parseBootenvPairs,
  parseDiffOutput,
  parseStatusErrorLog,
  parseZinjectList
} from "../src/args/index.js"
import { injectArgv } from "../src/cli/adapter.js"
import * as ZfsCli from "../src/cli/index.js"
import { layer } from "../src/index.js"
import { CommandResult, type ZfsCommand, ZfsProcess } from "../src/protocol/process.js"
import { datasetName, poolName, snapshotName } from "../src/schema/name.js"
import { parseVersionOutput } from "../src/schema/version.js"
import { Pools } from "../src/services/pools.js"
import { Snapshots } from "../src/services/snapshots.js"

describe("remaining ioctl parsers", () => {
  it("parses zfs diff -H rows", () => {
    const rows = parseDiffOutput("M\t/tank/test/file\nR\t/tank/test/old\t/tank/test/new\n")
    assert.strictEqual(rows.length, 2)
    assert.strictEqual(rows[0]?.change, "M")
    assert.strictEqual(rows[0]?.path, "/tank/test/file")
    assert.strictEqual(rows[1]?.change, "R")
    assert.strictEqual(rows[1]?.newPath, "/tank/test/new")
  })

  it("parses zfs diff -HF file types", () => {
    const rows = parseDiffOutput("+\tF\t/tank/test/created\n", { fileTypes: true })
    assert.strictEqual(rows[0]?.change, "+")
    assert.strictEqual(rows[0]?.fileType, "F")
    assert.strictEqual(rows[0]?.path, "/tank/test/created")
  })

  it("parses zfs version text including kmod", () => {
    const info = parseVersionOutput("zfs-2.2.2-0ubuntu9.4\nzfs-kmod-2.2.2-0ubuntu9.4\n")
    assert.strictEqual(info.userspace.major, 2)
    assert.strictEqual(info.userspace.minor, 2)
    assert.strictEqual(info.userspace.patch, 2)
    assert.strictEqual(info.kernel?.patch, 2)
  })

  it("parses bootenv nvlist-style lines", () => {
    const pairs = parseBootenvPairs("version: 1\nlinux:bootonce: 'zfs:tank/ROOT:'\n")
    assert.strictEqual(pairs[0]?.key, "version")
    assert.strictEqual(pairs[0]?.value, "1")
    assert.strictEqual(pairs[1]?.key, "linux:bootonce")
    assert.strictEqual(pairs[1]?.value, "zfs:tank/ROOT:")
  })

  it("parses zinject handler listings into InjectRecord rows", () => {
    const empty = parseZinjectList("No handlers registered.\nRun 'zinject -h' for usage information.\n")
    assert.strictEqual(empty.length, 0)
    const rows = parseZinjectList([
      " ID  POOL             GUID              TYPE   ERROR       FREQ       MATCH   INJECT",
      "---  ---------------  ----------------  -----  ----------  ---------  ------  ------",
      "  1  tank             abcdef            read   io          100.0000%       0       0",
      "",
      " ID  POOL             GUID              DELAY (ms)  LANES  FREQ       MATCH   INJECT",
      "---  ---------------  ----------------  ----------  -----  ---------  ------  ------",
      "  3  tank             abcdef                    10      1  100.0000%       0       0",
      "",
      " ID  POOL             FUNCTION",
      "---  ---------------  ----------------",
      "  2  tank             spa_sync"
    ].join("\n"))
    assert.strictEqual(rows.length, 3)
    assert.strictEqual(rows[0]?.id, 1n)
    assert.strictEqual(rows[0]?.pool, "tank")
    assert.strictEqual(rows[0]?.kind, "io")
    assert.strictEqual(rows[1]?.id, 3n)
    assert.strictEqual(rows[1]?.kind, "delay")
    assert.strictEqual(rows[2]?.id, 2n)
    assert.strictEqual(rows[2]?.kind, "panic")
  })

  it("parses zpool status -v permanent errors into ErrorLogRow rows", () => {
    assert.strictEqual(parseStatusErrorLog("errors: No known data errors\n").length, 0)
    const rows = parseStatusErrorLog([
      "  pool: tank",
      " state: ONLINE",
      "errors: Permanent errors have been detected in the following files:",
      "",
      "        tank/ds:<0x1>",
      "        /tank/ds/file"
    ].join("\n"))
    assert.strictEqual(rows.length, 2)
    assert.strictEqual(rows[0]?.name, "tank/ds:<0x1>")
    assert.strictEqual(rows[0]?.object, 1n)
    assert.strictEqual(rows[1]?.name, "/tank/ds/file")
  })

  it("encodes zinject argv from InjectKind, not -t object type", () => {
    assert.deepStrictEqual(
      injectArgv(new InjectFault({ pool: poolName("tank"), kind: "io", device: "/dev/loop0" })),
      ["-d", "/dev/loop0", "-e", "io", "tank"]
    )
    assert.deepStrictEqual(
      injectArgv(new InjectFault({ pool: poolName("tank"), kind: "checksum" })),
      ["-e", "checksum", "tank"]
    )
    assert.deepStrictEqual(
      injectArgv(new InjectFault({ pool: poolName("tank"), kind: "delay", duration: 25 })),
      ["-D", "25:1", "tank"]
    )
    assert.deepStrictEqual(injectArgv(new InjectFault({ pool: poolName("tank"), kind: "flush" })), ["-a"])
    assert.deepStrictEqual(injectArgv(new InjectFault({ pool: poolName("tank"), kind: "unload" })), ["-u", "tank"])
    assert.deepStrictEqual(
      injectArgv(new InjectFault({ pool: poolName("tank"), kind: "panic" })),
      ["-p", "spa_vdev_config_exit", "tank"]
    )
  })
})

describe("remaining ioctl services", () => {
  const recorded: Array<ZfsCommand> = []
  const fakeProcess = Layer.succeed(
    ZfsProcess,
    ZfsProcess.of({
      run: (command) => {
        recorded.push(command)
        if (command.binary === "zfs" && command.args[0] === "version") {
          return Effect.succeed(
            new CommandResult({
              command,
              stdout: "zfs-2.2.2-0ubuntu9.4\nzfs-kmod-2.2.2-0ubuntu9.4\n",
              stderr: "",
              exitCode: 0
            })
          )
        }
        if (command.binary === "zfs" && command.args[0] === "diff") {
          return Effect.succeed(
            new CommandResult({
              command,
              stdout: "M\t/tank/src/file\n",
              stderr: "",
              exitCode: 0
            })
          )
        }
        if (command.binary === "zinject") {
          return Effect.succeed(
            new CommandResult({
              command,
              stdout: [
                " ID  POOL             GUID              TYPE   ERROR       FREQ       MATCH   INJECT",
                "---  ---------------  ----------------  -----  ----------  ---------  ------  ------",
                "  1  tank             abcdef            read   io          100.0000%       0       0"
              ].join("\n"),
              stderr: "",
              exitCode: 0
            })
          )
        }
        if (command.binary === "zpool" && command.args[0] === "status") {
          return Effect.succeed(
            new CommandResult({
              command,
              stdout: [
                "  pool: tank",
                "errors: Permanent errors have been detected in the following files:",
                "",
                "        tank/ds:<0x1>"
              ].join("\n"),
              stderr: "",
              exitCode: 0
            })
          )
        }
        return Effect.succeed(new CommandResult({ command, stdout: "", stderr: "", exitCode: 0 }))
      },
      stream: () => Stream.empty,
      runWithInput: (command) => Effect.succeed(new CommandResult({ command, stdout: "", stderr: "", exitCode: 0 }))
    })
  )
  const provided = layer.pipe(
    Layer.provide(ZfsCli.protocolLayer),
    Layer.provide(fakeProcess)
  )

  it.effect("reads version through CLI protocol", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const pools = yield* Pools
      const info = yield* pools.version()
      assert.strictEqual(info.userspace.major, 2)
      assert.strictEqual(info.userspace.minor, 2)
      assert.deepStrictEqual(recorded[0]?.args, ["version"])
    }).pipe(Effect.provide(provided)))

  it.effect("diffs snapshots through CLI protocol", () =>
    Effect.gen(function*() {
      const snapshots = yield* Snapshots
      const rows = yield* snapshots.diff(snapshotName(datasetName("tank/src"), "seed"))
      assert.strictEqual(rows[0]?.change, "M")
    }).pipe(Effect.provide(provided)))

  it.effect("fails closed for CLI-missing ioctl ops", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const seek = yield* pools.eventsSeek(0n).pipe(Effect.flip)
      assert.strictEqual(seek._tag, "UnknownZfsError")
    }).pipe(Effect.provide(provided)))

  it.effect("lists inject handlers through the zinject CLI", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const pools = yield* Pools
      const faults = yield* pools.listFaults()
      assert.strictEqual(faults[0]?.id, 1n)
      assert.strictEqual(faults[0]?.pool, "tank")
      assert.strictEqual(faults[0]?.kind, "io")
      assert.strictEqual(recorded[0]?.binary, "zinject")
      assert.deepStrictEqual(recorded[0]?.args, [])
    }).pipe(Effect.provide(provided)))

  it.effect("reads the permanent error log from zpool status -v", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const pools = yield* Pools
      const log = yield* pools.errorLog(poolName("tank"))
      assert.strictEqual(log[0]?.name, "tank/ds:<0x1>")
      assert.strictEqual(log[0]?.object, 1n)
      assert.deepStrictEqual(recorded[0]?.args, ["status", "-v", "tank"])
    }).pipe(Effect.provide(provided)))

  it.effect("sets vdev path and fru through zpool set", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const pools = yield* Pools
      yield* pools.setVdevPath(poolName("tank"), "/tmp/old.img", "/tmp/new.img")
      yield* pools.setVdevFru(poolName("tank"), "/tmp/new.img", "slot-1")
      assert.deepStrictEqual(recorded[0]?.args, ["set", "path=/tmp/new.img", "tank", "/tmp/old.img"])
      assert.deepStrictEqual(recorded[1]?.args, ["set", "fru=slot-1", "tank", "/tmp/new.img"])
    }).pipe(Effect.provide(provided)))
})
