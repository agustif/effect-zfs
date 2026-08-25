import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Stream } from "effect"
import {
  EventsCleared,
  eventsSeekEnd,
  eventsSeekStart,
  HistoryRecord,
  IostatRow,
  IostatSample,
  PoolEvent,
  WaitResult
} from "../src/args/index.js"
import {
  eventsFromLines,
  historyFromLines,
  iostatFromLines,
  parseEventHeader,
  parseEventPayloadLine,
  parseEventsCleared,
  parseHistoryRecord,
  parseIostatRow,
  parseIostatTimestamp
} from "../src/cli/observe.js"
import { layer } from "../src/index.js"
import * as Test from "../src/protocol/test.js"
import { byteCount } from "../src/schema/limits.js"
import { poolName } from "../src/schema/name.js"
import { Pools } from "../src/services/pools.js"

describe("pool observe parsers", () => {
  it("parses scripted iostat rows with bigint counters", () => {
    const row = parseIostatRow("tank\t123\t456\t1\t2\t1024\t2048")
    assert.ok(row instanceof IostatRow)
    assert.strictEqual(row.name, "tank")
    assert.strictEqual(row.allocated, byteCount(123n))
    assert.strictEqual(row.readBytes, byteCount(1024n))
  })

  it("treats dash capacity as zero bytes", () => {
    const row = parseIostatRow("mirror-0\t-\t-\t0\t0\t0\t0")
    assert.ok(row)
    assert.strictEqual(row.allocated, 0n)
    assert.strictEqual(row.free, 0n)
  })

  it("parses unix iostat timestamps", () => {
    assert.strictEqual(parseIostatTimestamp("1710000000"), 1710000000n)
    assert.strictEqual(parseIostatTimestamp("1710000000.5"), 1710000000n)
    assert.strictEqual(parseIostatTimestamp("not-a-time"), undefined)
  })

  it("parses scripted event headers and payload", () => {
    const header = parseEventHeader("Jun 30 1993 21:49:08.123456789\tereport.fs.zfs.checksum")
    assert.ok(header)
    assert.strictEqual(header.eventClass, "ereport.fs.zfs.checksum")
    const field = parseEventPayloadLine("        pool = \"tank\"")
    assert.ok(field)
    assert.strictEqual(field.name, "pool")
    assert.strictEqual(field.value, "tank")
  })

  it("parses events -c dropped count", () => {
    const cleared = parseEventsCleared("cleared 12 events\n")
    assert.strictEqual(cleared.dropped, 12)
  })

  it("parses history command and long-format user host", () => {
    const row = parseHistoryRecord("2024-01-02.03:04:05 zpool create tank /tmp/a [user 0 (root) on host:global]")
    assert.ok(row instanceof HistoryRecord)
    assert.strictEqual(row.time, "2024-01-02.03:04:05")
    assert.strictEqual(row.command, "zpool create tank /tmp/a")
    assert.strictEqual(row.internal, false)
    assert.strictEqual(row.user, "root")
    assert.strictEqual(row.hostname, "host")
    assert.strictEqual(row.zone, "global")
  })

  it("skips history section headers", () => {
    assert.strictEqual(parseHistoryRecord("History for 'tank':"), undefined)
  })

  it.effect("streams events one record at a time without buffering the log", () =>
    Effect.gen(function*() {
      const collected = yield* eventsFromLines(Stream.make(
        "Jun 30 1993 21:49:08.000000001\tereport.fs.zfs.pool_create",
        "        pool = \"tank\"",
        "Jun 30 1993 21:49:09.000000002\tereport.fs.zfs.config"
      )).pipe(Stream.runCollect)
      assert.strictEqual(collected.length, 2)
      assert.ok(collected[0] instanceof PoolEvent)
      assert.strictEqual(collected[0]?.payload["pool"], "tank")
      assert.strictEqual(collected[1]?.eventClass, "ereport.fs.zfs.config")
    }))

  it.effect("groups iostat samples on timestamp lines", () =>
    Effect.gen(function*() {
      const samples = yield* iostatFromLines(Stream.make(
        "100",
        "tank\t1\t2\t0\t0\t0\t0",
        "200",
        "tank\t3\t4\t1\t1\t8\t8"
      )).pipe(Stream.runCollect)
      assert.strictEqual(samples.length, 2)
      assert.strictEqual(samples[0]?.timestamp, 100n)
      assert.strictEqual(samples[0]?.rows[0]?.allocated, 1n)
      assert.strictEqual(samples[1]?.timestamp, 200n)
      assert.strictEqual(samples[1]?.rows[0]?.allocated, 3n)
    }))

  it.effect("streams history records", () =>
    Effect.gen(function*() {
      const rows = yield* historyFromLines(Stream.make(
        "History for 'tank':",
        "2024-01-01.00:00:00 zpool create tank /tmp/a"
      )).pipe(Stream.runCollect)
      assert.strictEqual(rows.length, 1)
      assert.strictEqual(rows[0]?.command, "zpool create tank /tmp/a")
    }))
})

describe("pool observe protocol", () => {
  it.effect("waits, reads history, and samples iostat through typed handlers", () => {
    const name = poolName("tank")
    return Effect.gen(function*() {
      const pools = yield* Pools
      const waited = yield* pools.wait(name, { activities: ["scrub"] })
      assert.strictEqual(waited.waited, false)
      const hist = yield* pools.history(name).pipe(Stream.runCollect)
      assert.strictEqual(hist[0]?.command, "zpool create tank")
      const samples = yield* pools.iostat({ pool: name }).pipe(Stream.runCollect)
      assert.strictEqual(samples[0]?.rows[0]?.name, "tank")
      const ev = yield* pools.events({ pool: name }).pipe(Stream.runCollect)
      assert.strictEqual(ev[0]?.eventClass, "ereport.fs.zfs.pool_create")
      yield* pools.prefetch(name, "ddt")
      yield* pools.eventsSeek("start")
      yield* pools.eventsSeek(eventsSeekEnd)
      const cleared = yield* pools.eventsClear()
      assert.strictEqual(cleared.dropped, 0)
      assert.strictEqual(eventsSeekStart, 0n)
    }).pipe(Effect.provide(layer.pipe(Layer.provide(Test.layer({
      waitPool: () => new WaitResult({ waited: false }),
      history: () =>
        Stream.make(
          new HistoryRecord({
            time: "2024-01-01.00:00:00",
            command: "zpool create tank",
            internal: false
          })
        ),
      iostat: () =>
        Stream.make(
          new IostatSample({
            rows: [
              new IostatRow({
                name: "tank",
                allocated: byteCount(1n),
                free: byteCount(2n),
                readOps: byteCount(0n),
                writeOps: byteCount(0n),
                readBytes: byteCount(0n),
                writeBytes: byteCount(0n)
              })
            ]
          })
        ),
      events: () =>
        Stream.make(
          new PoolEvent({
            time: "Jun 30 1993 21:49:08.000000001",
            eventClass: "ereport.fs.zfs.pool_create",
            pool: name,
            payload: { pool: "tank" }
          })
        ),
      prefetch: () => undefined,
      eventsSeek: () => undefined,
      eventsClear: () => new EventsCleared({ dropped: 0 })
    })))))
  })
})
