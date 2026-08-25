import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Sink, Stream } from "effect"
import { ChildProcessSpawner } from "effect/unstable/process"
import {
  resumeToken,
  Send,
  SendOptions,
  SendProgress,
  SendProgressReport,
  SendSpaceEstimate
} from "../src/args/index.js"
import { sendArgv } from "../src/cli/index.js"
import * as ZfsCli from "../src/cli/index.js"
import { layer } from "../src/index.js"
import { lzcSendCall, LzcSendFlagBit, lzcSendFlagsOf } from "../src/native/index.js"
import * as Test from "../src/protocol/test.js"
import { byteCount } from "../src/schema/limits.js"
import { bookmarkName, datasetName, snapshotName } from "../src/schema/name.js"
import { Replication } from "../src/services/replication.js"

const src = datasetName("tank/src")
const snapA = snapshotName(src, "a")
const snapB = snapshotName(src, "b")
const book = bookmarkName(src, "origin")
const redact = bookmarkName(src, "redact")

const bytes = (text: string) => new TextEncoder().encode(text)

describe("zfs send args", () => {
  it("builds incremental -i from a snapshot", () => {
    assert.deepStrictEqual(
      sendArgv(
        new Send({
          snapshot: snapB,
          options: new SendOptions({ incremental: "from", from: snapA })
        })
      ),
      ["send", "-i", snapA, snapB]
    )
  })

  it("builds intermediate -I from a bookmark", () => {
    assert.deepStrictEqual(
      sendArgv(
        new Send({
          snapshot: snapB,
          options: new SendOptions({ incremental: "intermediate", from: book })
        })
      ),
      ["send", "-I", book, snapB]
    )
  })

  it("builds resume -t without a snapshot operand", () => {
    const token = resumeToken("1-abc")
    assert.deepStrictEqual(
      sendArgv(
        new Send({
          options: new SendOptions({ resumeToken: token })
        })
      ),
      ["send", "-t", token]
    )
  })

  it("builds --saved with a dataset operand", () => {
    assert.deepStrictEqual(
      sendArgv(
        new Send({
          dataset: src,
          options: new SendOptions({ saved: true })
        })
      ),
      ["send", "--saved", src]
    )
  })

  it("builds replicate -R with -X exclude, redact, progress, and lzc flags", () => {
    const skip = datasetName("tank/src/skip")
    assert.deepStrictEqual(
      sendArgv(
        new Send({
          snapshot: snapB,
          options: new SendOptions({
            replicate: true,
            exclude: [skip],
            redact,
            progress: true,
            flags: ["large-block", "embed", "compress", "raw"]
          })
        })
      ),
      ["send", "-v", "-c", "-w", "-L", "-e", "-R", "-X", skip, "--redact", redact, snapB]
    )
  })

  it("maps lzc_send flags and resume/redact call selection", () => {
    const flags = lzcSendFlagsOf(
      new SendOptions({
        saved: true,
        flags: ["large-block", "embed", "compress", "raw"]
      })
    )
    assert.strictEqual(
      flags,
      LzcSendFlagBit.embed | LzcSendFlagBit.largeBlock | LzcSendFlagBit.compress | LzcSendFlagBit.raw |
        LzcSendFlagBit.saved
    )
    assert.strictEqual(lzcSendCall(new Send({ snapshot: snapB })), "lzc_send")
    assert.strictEqual(
      lzcSendCall(new Send({ options: new SendOptions({ resumeToken: resumeToken("1-x") }) })),
      "lzc_send_resume"
    )
    assert.strictEqual(
      lzcSendCall(new Send({ snapshot: snapB, options: new SendOptions({ redact }) })),
      "lzc_send_redacted"
    )
    assert.strictEqual(
      lzcSendCall(
        new Send({
          snapshot: snapB,
          options: new SendOptions({ resumeToken: resumeToken("1-x"), redact })
        })
      ),
      "lzc_send_resume_redacted"
    )
  })
})

describe("typed send space and progress", () => {
  it.effect("sendSpace returns a bigint estimate from the test protocol", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const estimate = yield* replication.sendSpace(snapB, { from: snapA, incremental: "from" })
      assert.strictEqual(estimate.bytes, 4096n)
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        sendSpace: () => new SendSpaceEstimate({ bytes: byteCount(4096n) })
      }))))
    ))

  it.effect("sendProgress returns bigint byte and block counts", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const report = yield* replication.sendProgress(new SendProgress({ snapshot: snapB, fd: 3 }))
      assert.strictEqual(report.bytes, 512n)
      assert.strictEqual(report.blocks, 1n)
    }).pipe(
      Effect.provide(layer.pipe(Layer.provide(Test.layer({
        sendProgress: () => new SendProgressReport({ bytes: byteCount(512n), blocks: byteCount(1n) })
      }))))
    ))
})

const handle = (input: {
  readonly stdout?: Stream.Stream<Uint8Array>
  readonly stderr?: string
  readonly exitCode?: number
}) =>
  ChildProcessSpawner.makeHandle({
    pid: ChildProcessSpawner.ProcessId(42),
    exitCode: Effect.succeed(ChildProcessSpawner.ExitCode(input.exitCode ?? 0)),
    isRunning: Effect.succeed(true),
    kill: () => Effect.void,
    stdin: Sink.drain,
    stdout: input.stdout ?? Stream.empty,
    stderr: Stream.make(bytes(input.stderr ?? "")),
    all: Stream.empty,
    getInputFd: () => Sink.drain,
    getOutputFd: () => Stream.empty,
    unref: Effect.succeed(Effect.void)
  })

describe("cli send space", () => {
  it.effect("parses zfs send -nP size as bigint", () =>
    Effect.gen(function*() {
      const replication = yield* Replication
      const estimate = yield* replication.sendSpace(snapB, { from: snapA })
      assert.strictEqual(estimate.bytes, 4096n)
    }).pipe(
      Effect.provide(
        Replication.layer.pipe(
          Layer.provideMerge(ZfsCli.layer),
          Layer.provide(
            Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(
              ChildProcessSpawner.make(() =>
                Effect.succeed(handle({
                  stdout: Stream.make(bytes("incremental\ttank/src@a\ttank/src@b\t4096\nsize\t4096\n")),
                  exitCode: 0
                }))
              )
            )
          )
        )
      )
    ))
})
