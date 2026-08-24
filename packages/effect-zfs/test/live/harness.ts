import { existsSync, mkdtempSync, rmSync, truncateSync, writeFileSync } from "node:fs"
import { execFileSync } from "node:child_process"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { NodeServices } from "@effect/platform-node"
import { Context, Effect, Layer } from "effect"
import { ChildProcess, ChildProcessSpawner } from "effect/unstable/process"
import * as ZfsCli from "../../src/Cli.js"
import { mib, spaMinDevSize, vdevSize, type VdevSize } from "../../src/Limits.js"
import { datasetName, poolName } from "../../src/Name.js"
import { parseZfsVersionLine, type ZfsVersion } from "../../src/Version.js"
import { layer as zfsLayer } from "../../src/index.js"

export const hasLiveLinuxZfs = process.platform === "linux" && (existsSync("/usr/sbin/zfs") || existsSync("/sbin/zfs"))

export const detectUserspace = (): ZfsVersion | undefined => {
  if (!hasLiveLinuxZfs) return undefined
  try {
    const raw = execFileSync("zfs", ["version"], { encoding: "utf8" })
    return parseZfsVersionLine(raw.split("\n")[0] ?? raw)
  } catch {
    return undefined
  }
}

export class TestPool extends Context.Service<TestPool, {
  readonly pool: ReturnType<typeof poolName>
  readonly root: ReturnType<typeof datasetName>
}>()("effect-zfs/TestPool") {}

const runZpool = (args: ReadonlyArray<string>) =>
  Effect.gen(function*() {
    const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
    return yield* spawner.exitCode(ChildProcess.make("zpool", [...args], { extendEnv: true }))
  })

export const fileBackedPool = (size: VdevSize) =>
  Effect.gen(function*() {
    const name = `effectzfs_test_${process.pid}_${Date.now()}_${Math.floor(Math.random() * 1e6)}`
    if (!name.startsWith("effectzfs_test_")) {
      return yield* Effect.die("refusing non-test pool name")
    }
    const listed = yield* runZpool(["list", "-H", "-o", "name", name])
    if (Number(listed) === 0) {
      return yield* Effect.die(`refusing to touch an existing pool: ${name}`)
    }
    const dir = mkdtempSync(join(tmpdir(), "effect-zfs-"))
    const diskA = join(dir, "a.img")
    const diskB = join(dir, "b.img")
    const bytes = Number(size)
    writeFileSync(diskA, "")
    writeFileSync(diskB, "")
    truncateSync(diskA, bytes)
    truncateSync(diskB, bytes)
    const created = yield* runZpool([
      "create", "-f", "-O", "mountpoint=none", name, "mirror", diskA, diskB
    ])
    if (Number(created) !== 0) {
      rmSync(dir, { recursive: true, force: true })
      return yield* Effect.die(`zpool create failed for ${name} (${size} byte vdevs)`)
    }
    yield* Effect.addFinalizer(() =>
      runZpool(["destroy", "-f", name]).pipe(
        Effect.asVoid,
        Effect.orElseSucceed(() => undefined),
        Effect.tap(() => Effect.sync(() => rmSync(dir, { recursive: true, force: true })))
      )
    )
    return { pool: poolName(name), root: datasetName(name), dir }
  })

const TestPoolLayer = Layer.effect(
  TestPool,
  Effect.gen(function*() {
    const acquired = yield* fileBackedPool(vdevSize(mib(256)))
    return TestPool.of({ pool: acquired.pool, root: acquired.root })
  })
)

export { spaMinDevSize }

const LiveZfs = zfsLayer.pipe(
  Layer.provideMerge(ZfsCli.layer),
  Layer.provideMerge(NodeServices.layer)
)
export const Live = TestPoolLayer.pipe(Layer.provideMerge(LiveZfs))
export { ChildProcess, ChildProcessSpawner }
