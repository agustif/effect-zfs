import { assert, describe, layer } from "@effect/vitest"
import { Effect } from "effect"
import { vdevConfig } from "../../src/schema/models.js"
import {
  atLeast,
  linux,
  parseVersionOutput,
  parseZfsVersionLine,
  supportsJsonStatus
} from "../../src/schema/version.js"
import { Pools } from "../../src/services/pools.js"
import { ChildProcess, ChildProcessSpawner, detectUserspace, hasLiveLinuxZfs, Live, TestPool } from "./harness.js"

const version = detectUserspace()
const jsonStatus = version !== undefined && supportsJsonStatus(version)

describe.skipIf(!hasLiveLinuxZfs || !jsonStatus)("linux zfs live 2.3+", () => {
  layer(Live, { excludeTestServices: true })((it) => {
    it.effect("userspace is OpenZFS 2.3 or newer", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const raw = yield* spawner.string(ChildProcess.make("zfs", ["version"], { extendEnv: true }))
        const userspace = parseZfsVersionLine(raw.split("\n")[0] ?? raw)
        assert.isTrue(atLeast(userspace, linux.v2_3_0), userspace.raw)
        const pools = yield* Pools
        const info = yield* pools.version()
        assert.isTrue(atLeast(info.userspace, linux.v2_3_0), info.userspace.raw)
      }))

    it.effect("zpool status -j is accepted and prints a JSON object", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const raw = yield* spawner.string(ChildProcess.make(
          "zpool",
          ["status", "-j", "-p", env.pool],
          { extendEnv: true }
        ))
        const trimmed = raw.trim()
        assert.isTrue(trimmed.startsWith("{"), trimmed.slice(0, 80))
        assert.isFalse(/invalid option/i.test(raw))
        const document = JSON.parse(trimmed) as {
          readonly output_version?: unknown
          readonly pools?: { readonly [name: string]: { readonly state?: string } }
        }
        assert.ok(document.output_version !== undefined)
        const row = document.pools?.[env.pool] ?? Object.values(document.pools ?? {})[0]
        assert.ok(row !== undefined)
        assert.ok(row.state === undefined || typeof row.state === "string")
      }))

    it.effect("pool status uses JSON (raw is an object, not text)", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const status = yield* pools.status(env.pool)
        assert.strictEqual(typeof status.raw, "object")
        assert.notStrictEqual(status.raw, null)
        assert.ok(status.state === "ONLINE" || status.state === undefined)
        const tree = vdevConfig(status.config)
        assert.ok(status.config === undefined || Array.isArray(status.config))
        assert.isTrue(tree.length > 0, "expected a parsed vdev tree from JSON status")
        assert.strictEqual(typeof tree[0]?.name, "string")
        const names = flattenNames(tree)
        assert.ok(
          names.some((name) => name === env.pool || name.includes(env.pool)),
          names.join(",")
        )
        assert.ok(
          names.some((name) => name.endsWith(".img") || name.startsWith("/")),
          names.join(",")
        )
      }))

    it.effect("JSON status scan is present as a typed object or omitted", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        const status = yield* pools.status(env.pool)
        if (status.scan !== undefined) {
          assert.strictEqual(typeof status.scan, "object")
          assert.ok(
            status.scan.function !== undefined ||
              status.scan.state !== undefined ||
              status.scan.summary !== undefined
          )
        }
      }))

    it.effect("zfs version -j object form includes userland and kernel", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const raw = yield* spawner.string(ChildProcess.make("zfs", ["version", "-j"], { extendEnv: true }))
        const info = parseVersionOutput(raw)
        assert.isTrue(atLeast(info.userspace, linux.v2_3_0), info.userspace.raw)
        assert.ok(info.kernel !== undefined)
        assert.isTrue(atLeast(info.kernel, linux.v2_3_0), info.kernel.raw)
        assert.strictEqual(typeof JSON.parse(raw.trim()), "object")
      }))
  })
})

const flattenNames = (
  nodes: ReadonlyArray<{ readonly name: string; readonly children?: ReadonlyArray<unknown> }>
): Array<string> => {
  const out: Array<string> = []
  const walk = (list: ReadonlyArray<{ readonly name: string; readonly children?: ReadonlyArray<unknown> }>) => {
    for (const node of list) {
      out.push(node.name)
      if (node.children !== undefined) {
        walk(node.children as typeof list)
      }
    }
  }
  walk(nodes)
  return out
}
