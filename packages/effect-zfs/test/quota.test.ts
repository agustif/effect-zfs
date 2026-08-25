import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer } from "effect"
import { ProjectRow, UserspaceRow } from "../src/args/index.js"
import { parseProjectStdout, projectArgv } from "../src/cli/project.js"
import { parseUserspaceStdout, userspaceArgv } from "../src/cli/quota.js"
import { layer } from "../src/index.js"
import * as Test from "../src/protocol/test.js"
import { byteCount, projectId } from "../src/schema/limits.js"
import { datasetName } from "../src/schema/name.js"
import { Quotas } from "../src/services/quotas.js"

describe("userspace / project parsers", () => {
  it("parses -Hp userspace rows and maps quota 0 to none", () => {
    const stdout = "POSIX User\talice\t4096\t0\t2\t0\nPOSIX User\troot\t0\tnone\t0\tnone\n"
    const rows = parseUserspaceStdout(stdout)
    assert.strictEqual(rows.length, 2)
    assert.strictEqual(rows[0]?.type, "POSIX User")
    assert.strictEqual(rows[0]?.name, "alice")
    assert.strictEqual(rows[0]?.used, 4096n)
    assert.strictEqual(rows[0]?.quota, "none")
    assert.strictEqual(rows[0]?.objused, 2n)
    assert.strictEqual(rows[1]?.used, 0n)
  })

  it("builds userspace argv with -Hp columns and skips projectspace -n/-t", () => {
    assert.deepStrictEqual(
      [...userspaceArgv("userspace", { name: "tank/data", numeric: true, types: ["posixuser"] })],
      ["userspace", "-Hp", "-o", "type,name,used,quota,objused,objquota", "-n", "-t", "posixuser", "tank/data"]
    )
    assert.deepStrictEqual(
      [...userspaceArgv("projectspace", { name: "tank/data", numeric: true })],
      ["projectspace", "-Hp", "-o", "type,name,used,quota,objused,objquota", "tank/data"]
    )
  })

  it("parses zfs project list and check lines", () => {
    const listed = parseProjectStdout("  100 P /mnt/tank/data\n    0 - /mnt/tank/data/file\n", "list")
    assert.strictEqual(listed[0]?.projectId, 100n)
    assert.strictEqual(listed[0]?.inherit, true)
    assert.strictEqual(listed[1]?.inherit, false)
    const checked = parseProjectStdout("/mnt/tank/data/file - project ID is not set properly (0/100)\n", "check")
    assert.ok(checked[0]?.message?.includes("project ID"))
    assert.deepStrictEqual(
      [...projectArgv({ action: "set", paths: ["/mnt/data"], projectId: 7n, inherit: true, recursive: true })],
      ["project", "-s", "-r", "-p", "7", "/mnt/data"]
    )
    assert.deepStrictEqual(
      [...projectArgv({ action: "clear", paths: ["/mnt/data"], keepId: true })],
      ["project", "-C", "-k", "/mnt/data"]
    )
  })
})

describe("Quotas service", () => {
  it.effect("returns protocol userspace rows as bigint", () =>
    Effect.gen(function*() {
      const quotas = yield* Quotas
      const rows = yield* quotas.userspace(datasetName("tank/data"))
      assert.strictEqual(rows[0]?.used, 4096n)
      assert.strictEqual(rows[0]?.quota, "none")
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        userspace: () => [
          new UserspaceRow({
            type: "POSIX User",
            name: "alice",
            used: byteCount(4096n),
            quota: "none"
          })
        ]
      }))))
    ))

  it.effect("returns project list rows", () =>
    Effect.gen(function*() {
      const quotas = yield* Quotas
      const rows = yield* quotas.project({ action: "list", paths: ["/mnt/tank/data"] })
      assert.strictEqual(rows[0]?.projectId, 100n)
      assert.strictEqual(rows[0]?.inherit, true)
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        project: () => [
          new ProjectRow({
            path: "/mnt/tank/data",
            projectId: projectId(100n),
            inherit: true
          })
        ]
      }))))
    ))
})
