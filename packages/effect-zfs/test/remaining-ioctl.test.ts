import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { parseBootenvPairs, parseDiffOutput } from "../src/Args.js"
import { Pools } from "../src/Pool.js"
import { Snapshots } from "../src/Snapshot.js"
import { datasetName, poolName, snapshotName } from "../src/Name.js"
import { parseVersionOutput } from "../src/Version.js"
import * as Test from "../src/Test.js"
import { layer } from "../src/index.js"

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
})

describe("remaining ioctl services", () => {
  it.effect("reads version through test protocol", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const info = yield* pools.version()
      assert.strictEqual(info.userspace.major, 2)
      assert.strictEqual(info.userspace.minor, 2)
    }).pipe(Effect.provide(layer.pipe(Layer.provide(Test.layer({})))))
  )

  it.effect("diffs snapshots through test protocol", () =>
    Effect.gen(function*() {
      const snapshots = yield* Snapshots
      const rows = yield* snapshots.diff(snapshotName(datasetName("tank/src"), "seed"))
      assert.strictEqual(rows.length, 0)
    }).pipe(Effect.provide(layer.pipe(Layer.provide(Test.layer({})))))
  )

  it.effect("waits for a pool through test protocol", () =>
    Effect.gen(function*() {
      const pools = yield* Pools
      const result = yield* pools.wait(poolName("tank"), { activities: ["scrub"] })
      assert.strictEqual(result.waited, undefined)
    }).pipe(Effect.provide(layer.pipe(Layer.provide(Test.layer({})))))
  )
})
