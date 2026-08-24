import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import * as ZfsCli from "../src/Cli.js"
import { Datasets } from "../src/Dataset.js"
import { Pools } from "../src/Pool.js"
import { Replication } from "../src/Replication.js"
import { Snapshots } from "../src/Snapshot.js"
import { VdevProperty } from "../src/generated/properties.generated.js"
import { datasetVersion, volBlockSize, volumeSize } from "../src/Limits.js"
import { datasetName, snapshotName, snapshotRange } from "../src/Name.js"
import { parseTextVdevTree, vdevTreeFromUnknown } from "../src/internal/status.js"
import { CommandResult, ZfsProcess, type ZfsCommand } from "../src/Process.js"
import { layer } from "../src/index.js"
import { vdevId } from "../src/Args.js"
import { poolName } from "../src/Name.js"
import { Dataset, Snapshot } from "../src/Schemas.js"

const recorded: ZfsCommand[] = []

const fakeProcess = Layer.succeed(
  ZfsProcess,
  ZfsProcess.of({
    run: (command) => {
      recorded.push(command)
      if (command.binary === "zfs" && command.args[0] === "list" && command.args.includes("snapshot")) {
        return Effect.succeed(new CommandResult({ command, stdout: "tank/src@seed", stderr: "", exitCode: 0 }))
      }
      if (command.binary === "zfs" && command.args[0] === "list" && command.args.some((arg) => arg.endsWith("/missing"))) {
        return Effect.succeed(new CommandResult({
          command,
          stdout: "",
          stderr: "cannot open 'tank/missing': dataset does not exist",
          exitCode: 1
        }))
      }
      if (command.binary === "zfs" && command.args[0] === "list") {
        return Effect.succeed(new CommandResult({ command, stdout: command.args[command.args.length - 1] ?? "", stderr: "", exitCode: 0 }))
      }
      if (command.binary === "zpool" && command.args[0] === "get") {
        return Effect.succeed(new CommandResult({
          command,
          stdout: "/tmp/a.img\tcomment\thello\tlocal",
          stderr: "",
          exitCode: 0
        }))
      }
      if (command.binary === "zfs" && command.args[0] === "send") {
        return Effect.succeed(new CommandResult({
          command,
          stdout: "size\t4096\n",
          stderr: "",
          exitCode: 0
        }))
      }
      return Effect.succeed(new CommandResult({ command, stdout: "", stderr: "", exitCode: 0 }))
    },
    stream: () => Stream.empty,
    runWithInput: (command) =>
      Effect.succeed(new CommandResult({ command, stdout: "", stderr: "", exitCode: 0 }))
  })
)

const provided = layer.pipe(
  Layer.provide(ZfsCli.protocolLayer),
  Layer.provide(fakeProcess)
)

describe("remaining map holes", () => {
  it("parses indented zpool status config into a vdev tree", () => {
    const tree = parseTextVdevTree([
      "        NAME        STATE     READ WRITE CKSUM",
      "        tank        ONLINE       0     0     0",
      "          mirror-0  ONLINE       0     0     0",
      "            /a.img  ONLINE       0     0     0",
      "            /b.img  DEGRADED     1     0     0"
    ])
    assert.strictEqual(tree[0]?.name, "tank")
    assert.strictEqual(tree[0]?.state, "ONLINE")
    assert.strictEqual(tree[0]?.children?.[0]?.name, "mirror-0")
    assert.strictEqual(tree[0]?.children?.[0]?.children?.[1]?.state, "DEGRADED")
    assert.strictEqual(tree[0]?.children?.[0]?.children?.[1]?.read, 1n)
  })

  it("parses JSON zpool status vdevs object", () => {
    const tree = vdevTreeFromUnknown({
      tank: {
        name: "tank",
        vdev_type: "root",
        state: "ONLINE",
        vdevs: {
          "/tmp/a.img": { name: "/tmp/a.img", state: "ONLINE", read_errors: 0 }
        }
      }
    })
    assert.strictEqual(tree[0]?.name, "tank")
    assert.strictEqual(tree[0]?.kind, "root")
    assert.strictEqual(tree[0]?.children?.[0]?.name, "/tmp/a.img")
  })

  it.effect("encodes create/destroy/snapshot/clone upgrade exists vdev argv", () =>
    Effect.gen(function*() {
      recorded.length = 0
      const datasets = yield* Datasets
      const snapshots = yield* Snapshots
      const pools = yield* Pools
      const replication = yield* Replication
      yield* datasets.createFilesystem({
        name: datasetName("tank/fs"),
        parents: true,
        unmounted: true,
        dryRun: true,
        properties: { mountpoint: "none" }
      })
      yield* datasets.createVolume({
        name: datasetName("tank/vol"),
        size: volumeSize(1048576n),
        volblocksize: volBlockSize(8192n),
        sparse: true
      })
      const present = yield* datasets.exists(datasetName("tank/fs"))
      const missing = yield* datasets.exists(datasetName("tank/missing"))
      assert.strictEqual(present, true)
      assert.strictEqual(missing, false)
      yield* datasets.upgrade(datasetName("tank/fs"), { version: datasetVersion(5), recursive: true })
      yield* datasets.destroy(datasetName("tank/fs"), { descendants: true, dryRun: true })
      const src = new Dataset({ name: datasetName("tank/src"), kind: "filesystem" })
      yield* snapshots.create(src, "seed", { properties: { compression: "lz4" } })
      yield* snapshots.destroy(snapshotRange("tank/src@a%b"), { descendants: true })
      yield* snapshots.clone(
        new Snapshot({ name: snapshotName(datasetName("tank/src"), "seed"), dataset: src }),
        datasetName("tank/nested/clone"),
        undefined,
        { parents: true }
      )
      yield* pools.setVdev(poolName("tank"), vdevId("/tmp/a.img"), { comment: "effect-zfs" })
      const comment = yield* pools.getVdev(poolName("tank"), vdevId("/tmp/a.img"), VdevProperty.comment)
      assert.strictEqual(comment.value, "hello")
      const space = yield* replication.snaprangeSpace(
        snapshotName(datasetName("tank/src"), "a"),
        snapshotName(datasetName("tank/src"), "b")
      )
      assert.strictEqual(space.bytes, 4096n)
      const argv = recorded.map((cmd) => [cmd.binary, ...cmd.args])
      assert.deepStrictEqual(argv[0], ["zfs", "create", "-n", "-p", "-u", "-o", "mountpoint=none", "tank/fs"])
      assert.deepStrictEqual(argv[1], ["zfs", "create", "-s", "-b", "8192", "-V", "1048576", "tank/vol"])
      assert.ok(argv.some((row) => row[0] === "zfs" && row[1] === "upgrade" && row.includes("-r") && row.includes("-V")))
      assert.ok(argv.some((row) => row[0] === "zfs" && row[1] === "destroy" && row.includes("-R") && row.includes("-n")))
      assert.ok(argv.some((row) => row[0] === "zfs" && row[1] === "clone" && row.includes("-p")))
      assert.ok(argv.some((row) => row[0] === "zpool" && row[1] === "set" && row[2] === "comment=effect-zfs"))
    }).pipe(Effect.provide(provided))
  )
})
