import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as ZfsCli from "../src/cli/index.js"
import { layer } from "../src/index.js"
import { CommandResult, type ZfsCommand, ZfsProcess } from "../src/protocol/process.js"
import { datasetName, snapshotName } from "../src/schema/name.js"
import { Datasets } from "../src/services/datasets.js"
import { Snapshots } from "../src/services/snapshots.js"

const recorded: Array<ZfsCommand> = []

const fakeProcess = Layer.succeed(
  ZfsProcess,
  ZfsProcess.of({
    run: (command) => {
      recorded.push(command)
      const stdout = command.args[0] === "list" && command.args.includes("snapshot")
        ? "tank/src@seed"
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

describe("snapshot lifecycle CLI argv", () => {
  it.effect("builds list/rollback/promote/rename argv without domain services seeing flags", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const datasets = yield* Datasets
      const snapshots = yield* Snapshots
      const listed = yield* snapshots.list({ root: datasetName("tank/src"), recursive: true })
      assert.strictEqual(listed[0]?.name, "tank/src@seed")
      yield* snapshots.rollback(snapshotName(datasetName("tank/src"), "seed"), {
        destroyRecent: true,
        force: true
      })
      yield* snapshots.rollback(snapshotName(datasetName("tank/src"), "seed"), { destroyClones: true })
      yield* snapshots.promote(datasetName("tank/clone"))
      yield* snapshots.rename(
        snapshotName(datasetName("tank/src"), "old"),
        snapshotName(datasetName("tank/src"), "new"),
        { recursive: true }
      )
      yield* datasets.rename(datasetName("tank/src"), datasetName("tank/dst"), {
        parents: true,
        unmounted: true,
        force: true
      })
      const argv = recorded.map((cmd) => [cmd.binary, ...cmd.args])
      assert.deepStrictEqual(argv, [
        ["zfs", "list", "-t", "snapshot", "-Hp", "-r", "-o", "name", "tank/src"],
        ["zfs", "rollback", "-r", "-f", "tank/src@seed"],
        ["zfs", "rollback", "-R", "tank/src@seed"],
        ["zfs", "promote", "tank/clone"],
        ["zfs", "rename", "-r", "tank/src@old", "tank/src@new"],
        ["zfs", "rename", "-f", "-p", "-u", "tank/src", "tank/dst"]
      ])
    }).pipe(Effect.provide(provided)))
})
