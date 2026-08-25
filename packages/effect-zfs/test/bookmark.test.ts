import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Sink, Stream } from "effect"
import { systemError } from "effect/PlatformError"
import { ChildProcessSpawner } from "effect/unstable/process"
import { BookmarkListItem } from "../src/args/index.js"
import * as ZfsCli from "../src/cli/index.js"
import { classifyCliError } from "../src/errors/classify.js"
import { DatasetProperty } from "../src/generated/properties.generated.js"
import { layer } from "../src/index.js"
import { command } from "../src/protocol/protocol.js"
import * as Test from "../src/protocol/test.js"
import { PropertyGetRow } from "../src/schema/models.js"
import { bookmarkComponent, bookmarkName, datasetName, datasetOfBookmark, snapshotName } from "../src/schema/name.js"
import { Bookmarks } from "../src/services/bookmarks.js"
import { Dataset, dataset } from "../src/services/datasets.js"
import { Snapshot } from "../src/services/snapshots.js"

const provided = layer.pipe(
  Layer.provide(Test.layer({
    createFilesystem: () => undefined,
    createSnapshot: () => undefined,
    createBookmark: () => undefined,
    destroyBookmark: () => undefined,
    listBookmarks: () => [
      new BookmarkListItem({ name: bookmarkName(datasetName("tank/src"), "keep") })
    ],
    getBookmarkProps: (input) =>
      new PropertyGetRow({
        name: input.name,
        property: input.property,
        value: input.property === "guid" ? "9" : "1700000000",
        source: "-"
      })
  }))
)

const bytes = (text: string) => new TextEncoder().encode(text)

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

const fakeSpawner = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Layer.succeed(ChildProcessSpawner.ChildProcessSpawner)(ChildProcessSpawner.make(spawnImpl))

const cli = (spawnImpl: ChildProcessSpawner.ChildProcessSpawner["Service"]["spawn"]) =>
  Bookmarks.layer.pipe(
    Layer.provideMerge(ZfsCli.layer),
    Layer.provide(fakeSpawner(spawnImpl))
  )

describe("bookmarks", () => {
  it("accepts BookmarkName and rejects snapshot/dataset forms", () => {
    assert.strictEqual(bookmarkName(datasetName("tank/data"), bookmarkComponent("keep")), "tank/data#keep")
    assert.strictEqual(datasetOfBookmark(bookmarkName(datasetName("tank/data"), "keep")), "tank/data")
    assert.throws(() => bookmarkComponent("has/slash"))
    assert.throws(() => bookmarkName("tank/data", "has#hash"))
  })

  it("classifies missing bookmark stderr for Bookmark.Get", () => {
    const error = classifyCliError("Bookmark.Get", {
      command: command("zfs", "get", "creation", "tank/src#keep"),
      stdout: "",
      stderr: "cannot open 'tank/src#keep': dataset does not exist",
      exitCode: 1
    })
    assert.strictEqual(error._tag, "DatasetNotFound")
  })

  it("does not promote DatasetAlreadyExists for Bookmark.List", () => {
    const error = classifyCliError("Bookmark.List", {
      command: command("zfs", "list", "-t", "bookmark"),
      stdout: "",
      stderr: "cannot create 'tank/src#keep': dataset already exists",
      exitCode: 1
    })
    assert.strictEqual(error._tag, "UnknownZfsError")
  })

  it.effect("creates, lists, gets, and destroys through typed protocol ops", () =>
    Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const fs = dataset(datasetName("tank/src"), "filesystem")
      const snap = new Snapshot({
        name: snapshotName(fs.name, "seed"),
        dataset: fs
      })
      const created = yield* bookmarks.create(snap, "keep")
      assert.strictEqual(created.name, "tank/src#keep")
      assert.strictEqual(created.dataset, fs.name)
      const listed = yield* bookmarks.list({ root: fs.name })
      assert.strictEqual(listed[0]?.name, created.name)
      const creation = yield* bookmarks.get(created, DatasetProperty.creation)
      assert.strictEqual(creation.value, 1700000000n)
      yield* bookmarks.destroy(created)
    }).pipe(Effect.provide(provided)))

  it.effect("createBookmark builds zfs bookmark argv", () => {
    const seen: Array<ReadonlyArray<string>> = []
    return Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const fs = new Dataset({ name: datasetName("tank/src"), kind: "filesystem" })
      const snap = new Snapshot({
        name: snapshotName(fs.name, "seed"),
        dataset: fs
      })
      yield* bookmarks.create(snap, "keep")
      const argv = seen[0]
      assert.ok(argv)
      assert.deepStrictEqual([...argv], ["bookmark", "tank/src@seed", "tank/src#keep"])
    }).pipe(Effect.provide(cli((cmd) => {
      if (cmd._tag === "StandardCommand") seen.push(cmd.args)
      return Effect.succeed(handle({ exitCode: 0 }))
    })))
  })

  it.effect("listBookmarks parses -t bookmark rows", () =>
    Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const rows = yield* bookmarks.list({ root: datasetName("tank/src"), recursive: true })
      assert.strictEqual(rows[0]?.name, "tank/src#keep")
      assert.strictEqual(rows[0]?.dataset, "tank/src")
    }).pipe(Effect.provide(cli((cmd) => {
      if (cmd._tag === "StandardCommand") {
        assert.ok(cmd.args.includes("-t"))
        assert.ok(cmd.args.includes("bookmark"))
        assert.ok(cmd.args.includes("-r"))
      }
      return Effect.succeed(handle({
        stdout: Stream.make(bytes("tank/src#keep\tbookmark\n")),
        exitCode: 0
      }))
    }))))

  it.effect("destroyBookmark builds zfs destroy argv", () => {
    const seen: Array<ReadonlyArray<string>> = []
    return Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      yield* bookmarks.destroy(bookmarkName(datasetName("tank/src"), "keep"))
      assert.deepStrictEqual([...(seen[0] ?? [])], ["destroy", "tank/src#keep"])
    }).pipe(Effect.provide(cli((cmd) => {
      if (cmd._tag === "StandardCommand") seen.push(cmd.args)
      return Effect.succeed(handle({ exitCode: 0 }))
    })))
  })

  it.effect("classifies bookmark destroy of a missing name", () =>
    Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const error = yield* bookmarks.destroy(bookmarkName(datasetName("tank/src"), "missing")).pipe(Effect.flip)
      assert.strictEqual(error._tag, "DatasetNotFound")
    }).pipe(Effect.provide(cli(() =>
      Effect.succeed(handle({
        stderr: "cannot destroy 'tank/src#missing': dataset does not exist",
        exitCode: 1
      }))
    ))))

  it.effect("maps spawn failure on bookmark create to ZfsTransportError", () =>
    Effect.gen(function*() {
      const bookmarks = yield* Bookmarks
      const error = yield* bookmarks.create(
        snapshotName(datasetName("tank/src"), "seed"),
        "keep"
      ).pipe(Effect.flip)
      assert.strictEqual(error._tag, "ZfsTransportError")
    }).pipe(Effect.provide(cli(() =>
      Effect.fail(systemError({
        _tag: "Unknown",
        module: "ChildProcess",
        method: "spawn",
        description: "execve failed"
      }))
    ))))
})
