import { assert, describe, layer } from "@effect/vitest"
import { Effect } from "effect"
import { writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { absolutePath } from "../../src/args/index.js"
import { DatasetProperty } from "../../src/generated/properties.generated.js"
import { datasetName } from "../../src/schema/name.js"
import { atLeast, featuresFor, linux, parseZfsVersionLine } from "../../src/schema/version.js"
import { Datasets } from "../../src/services/datasets.js"
import { Pools } from "../../src/services/pools.js"
import { ChildProcess, ChildProcessSpawner, detectUserspace, hasLiveLinuxZfs, Live, TestPool } from "./harness.js"

const version = detectUserspace()
const is24 = version !== undefined && atLeast(version, linux.v2_4_0)

const usageText = (spawner: ChildProcessSpawner.ChildProcessSpawner, args: ReadonlyArray<string>) =>
  spawner.string(ChildProcess.make("sh", ["-c", `zpool ${args.join(" ")} 2>&1 || true`], { extendEnv: true }))

describe.skipIf(!hasLiveLinuxZfs || !is24)("linux zfs live 2.4+", () => {
  layer(Live, { excludeTestServices: true })((it) => {
    it.effect("userspace is OpenZFS 2.4 or newer", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const raw = yield* spawner.string(ChildProcess.make("zfs", ["version"], { extendEnv: true }))
        const userspace = parseZfsVersionLine(raw.split("\n")[0] ?? raw)
        assert.isTrue(atLeast(userspace, linux.v2_4_0), userspace.raw)
        const pools = yield* Pools
        const info = yield* pools.version()
        assert.isTrue(atLeast(info.userspace, linux.v2_4_0), info.userspace.raw)
        assert.isTrue(featuresFor(info.userspace).allPoolsOps)
        assert.isTrue(featuresFor(info.userspace).scrubTimeRange)
        assert.isTrue(featuresFor(info.userspace).prefetchBrt)
        assert.isTrue(featuresFor(info.userspace).defaultQuotas)
      }))

    it.effect("zpool trim/initialize/scrub usage includes 2.4 -a and scrub -S/-E", () =>
      Effect.gen(function*() {
        const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
        const trim = yield* usageText(spawner, ["trim"])
        const initialize = yield* usageText(spawner, ["initialize"])
        const scrub = yield* usageText(spawner, ["scrub"])
        assert.isTrue(/-a/.test(trim), trim)
        assert.isTrue(/-a/.test(initialize), initialize)
        assert.isTrue(/-a/.test(scrub), scrub)
        assert.isTrue(/-S/.test(scrub), scrub)
        assert.isTrue(/-E/.test(scrub), scrub)
      }))

    it.effect("accepts scrub time-range flags on a process-created pool", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const pools = yield* Pools
        yield* pools.scrub(env.pool, "start", {
          startAfter: "1970-01-01",
          endBefore: "2099-01-01"
        })
        yield* pools.scrub(env.pool, "stop").pipe(
          Effect.catchIf(
            (error) => error._tag === "UnknownZfsError" || error._tag === "PoolUnavailable",
            () => Effect.void
          )
        )
      }))

    it.effect("reads 2.4 defaultuserquota and prefetches brt on the test pool", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const pools = yield* Pools
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/quota24`),
          properties: { mountpoint: "none" }
        })
        const quota = yield* datasets.get(fs, DatasetProperty.defaultuserquota)
        assert.ok(quota.value === "none" || typeof quota.value === "bigint")
        yield* pools.prefetch(env.pool, "brt").pipe(
          Effect.catchIf(
            (error) =>
              error._tag === "UnknownZfsError" ||
              error._tag === "DatasetNotFound" ||
              error._tag === "ZfsTransportError",
            () => Effect.void
          )
        )
      }))

    it.effect("rewrites a file on a mounted test filesystem", () =>
      Effect.gen(function*() {
        const env = yield* TestPool
        const datasets = yield* Datasets
        const mount = join(tmpdir(), `effect-zfs-rewrite-${process.pid}`)
        const fs = yield* datasets.createFilesystem({
          name: datasetName(`${env.pool}/rewrite24`),
          properties: { mountpoint: mount }
        })
        const file = join(mount, "blob.bin")
        writeFileSync(file, Buffer.alloc(4096, 7))
        yield* datasets.rewrite([absolutePath(file)], { physical: true })
        yield* datasets.destroy(fs)
      }))
  })
})
