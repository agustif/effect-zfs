import { assert, describe, it } from "@effect/vitest"
import {
  eventsSeekFlags,
  fsaclKeys,
  importFlagsOf,
  iostatCountersFromStats,
  iostatDeltaThroughput,
  needsLibzfsDestroy,
  needsLibzfsRollback,
  needsLibzfsSend,
  parseFsaclKey,
  quotaFieldOf,
  quotaPropsFor,
  quotaTypeLabel,
  recvHiddenName,
  resumePartsFromNv,
  snapshotInRange,
  snapshotSpecOf,
  vdevStateHealth,
  VdevStatIndex,
  writeZfsCmd,
  writeZfsInjectCmd,
  ZFS_IMPORT_ANY_HOST,
  ZFS_IMPORT_MISSING_LOG,
  ZFS_USERQUOTA_USERUSED,
  zfsCmdInjectOffset,
  zfsCmdSize,
  zfsCmdValueOffset
} from "../src/native/index.js"
import { poolName } from "../src/schema/name.js"

describe("native codec helpers", () => {
  it("encodes OpenZFS fsacl keys", () => {
    assert.deepEqual(fsaclKeys({ kind: "user", name: "root" }, "local"), ["ul$root"])
    assert.deepEqual(fsaclKeys({ kind: "user", name: "root" }, "descendant"), ["ud$root"])
    assert.deepEqual(fsaclKeys({ kind: "user", name: "root" }), ["ul$root", "ud$root"])
    assert.deepEqual(fsaclKeys({ kind: "everyone" }, "local"), ["el$"])
    assert.deepEqual(fsaclKeys({ kind: "create" }), ["c$"])
    assert.deepEqual(fsaclKeys({ kind: "set", name: "@ops" }), ["s$@ops"])
  })

  it("parses fsacl keys back into who/inherit", () => {
    assert.deepEqual(parseFsaclKey("ul$root"), { kind: "user", name: "root", inherit: "local" })
    assert.deepEqual(parseFsaclKey("gd$staff"), { kind: "group", name: "staff", inherit: "descendant" })
    assert.deepEqual(parseFsaclKey("el$"), { kind: "everyone", inherit: "local" })
    assert.deepEqual(parseFsaclKey("c$"), { kind: "create", inherit: "local+descendant" })
    assert.deepEqual(parseFsaclKey("s$@ops"), { kind: "set", name: "@ops", inherit: "local+descendant" })
    assert.isUndefined(parseFsaclKey("nope"))
  })

  it("names the hidden resumable-receive dataset", () => {
    assert.strictEqual(recvHiddenName("tank/fs"), "tank/fs%recv")
  })

  it("splits snapshot ranges at @", () => {
    assert.deepEqual(snapshotSpecOf("tank/fs@a%b"), { fs: "tank/fs", spec: "a%b" })
    assert.deepEqual(snapshotSpecOf("tank/fs@snap"), { fs: "tank/fs", spec: "snap" })
    assert.isUndefined(snapshotSpecOf("tank/fs"))
  })

  it("matches snapshot names against from%to specs", () => {
    assert.isTrue(snapshotInRange("tank/fs@a", "a%b"))
    assert.isTrue(snapshotInRange("tank/fs@b", "a%b"))
    assert.isFalse(snapshotInRange("tank/fs@c", "a%b"))
    assert.isTrue(snapshotInRange("tank/fs@b", "%b"))
    assert.isTrue(snapshotInRange("tank/fs@a", "a%"))
  })

  it("packs import flags from typed args", () => {
    const flags = importFlagsOf({
      name: poolName("tank"),
      force: true,
      missingLog: true
    })
    assert.strictEqual(flags & ZFS_IMPORT_ANY_HOST, ZFS_IMPORT_ANY_HOST)
    assert.strictEqual(flags & ZFS_IMPORT_MISSING_LOG, ZFS_IMPORT_MISSING_LOG)
  })

  it("maps vdev_state to PoolHealth", () => {
    assert.strictEqual(vdevStateHealth(7), "ONLINE")
    assert.strictEqual(vdevStateHealth(6n), "DEGRADED")
    assert.strictEqual(vdevStateHealth(5), "FAULTED")
    assert.strictEqual(vdevStateHealth(2), "OFFLINE")
    assert.strictEqual(vdevStateHealth(4), "UNAVAIL")
    assert.strictEqual(vdevStateHealth(3), "REMOVED")
    assert.isUndefined(vdevStateHealth(0))
  })

  it("selects userspace property ids", () => {
    assert.ok(quotaPropsFor("userspace").includes(ZFS_USERQUOTA_USERUSED))
    assert.strictEqual(quotaTypeLabel("groupspace"), "POSIX Group")
    assert.strictEqual(quotaFieldOf(ZFS_USERQUOTA_USERUSED), "used")
  })

  it("routes destroy/rollback/send to libzfs when flags need it", () => {
    assert.isTrue(needsLibzfsDestroy({ name: "tank/fs@a%b" }))
    assert.isTrue(needsLibzfsDestroy({ name: "tank/fs", recursive: true }))
    assert.isFalse(needsLibzfsDestroy({ name: "tank/fs@snap" }))
    assert.isTrue(needsLibzfsRollback({ destroyRecent: true }))
    assert.isFalse(needsLibzfsRollback({}))
    assert.isTrue(needsLibzfsSend({ options: { resumeToken: "abc" } }))
    assert.isTrue(needsLibzfsSend({ options: { incremental: "intermediate" } }))
    assert.isFalse(needsLibzfsSend({}))
  })

  it("reads resume object/offset from token nvlist", () => {
    const parts = resumePartsFromNv({ resume_object: 3n, resume_offset: 4096n, toname: "tank/fs@s" })
    assert.strictEqual(parts?.object, 3n)
    assert.strictEqual(parts?.offset, 4096n)
    assert.strictEqual(parts?.toname, "tank/fs@s")
  })

  it("lays out zfs_cmd_t name and value", () => {
    const buf = writeZfsCmd("tank/fs", "/proc/1/ns/user")
    assert.strictEqual(buf.byteLength, zfsCmdSize)
    assert.ok(buf.toString("utf8", 0, 7).startsWith("tank/fs"))
    assert.ok(buf.toString("utf8", zfsCmdValueOffset, zfsCmdValueOffset + 20).startsWith("/proc/1/ns/user"))
  })

  it("packs zinject_record_t into zfs_cmd_t", () => {
    const buf = writeZfsInjectCmd({ pool: "tank", kind: "io", guid: 99n })
    assert.strictEqual(buf.byteLength, zfsCmdSize)
    assert.ok(buf.toString("utf8", 0, 4).startsWith("tank"))
    assert.strictEqual(buf.readBigUInt64LE(zfsCmdInjectOffset + 32), 99n)
    assert.strictEqual(buf.readUInt32LE(zfsCmdInjectOffset + 44), 5)
    assert.strictEqual(buf.readBigUInt64LE(zfsCmdInjectOffset + 48), 2n)
  })

  it("reads iostat counters from vdev_stat_t slots", () => {
    const stats = Array.from({ length: 23 }, () => 0n)
    stats[VdevStatIndex.alloc] = 100n
    stats[VdevStatIndex.space] = 250n
    stats[VdevStatIndex.opsRead] = 3n
    stats[VdevStatIndex.opsWrite] = 4n
    stats[VdevStatIndex.bytesRead] = 30n
    stats[VdevStatIndex.bytesWrite] = 40n
    const counters = iostatCountersFromStats(stats)
    assert.strictEqual(counters.allocated, 100n)
    assert.strictEqual(counters.free, 150n)
    assert.strictEqual(counters.readOps, 3n)
    assert.strictEqual(counters.writeOps, 4n)
    assert.strictEqual(counters.readBytes, 30n)
    assert.strictEqual(counters.writeBytes, 40n)
  })

  it("maps events seek start/end onto ZEVENT_SEEK flags", () => {
    assert.deepStrictEqual(eventsSeekFlags(0n), { eid: 0n, flags: 0x2 })
    assert.deepStrictEqual(eventsSeekFlags(0xffffffffffffffffn), { eid: 0n, flags: 0x4 })
    assert.deepStrictEqual(eventsSeekFlags(42n), { eid: 42n, flags: 0 })
  })

  it("subtracts iostat throughput counters for interval samples", () => {
    const delta = iostatDeltaThroughput(
      { readOps: 10n, writeOps: 4n, readBytes: 100n, writeBytes: 40n },
      { readOps: 3n, writeOps: 4n, readBytes: 90n, writeBytes: 50n }
    )
    assert.strictEqual(delta.readOps, 7n)
    assert.strictEqual(delta.writeOps, 0n)
    assert.strictEqual(delta.readBytes, 10n)
    assert.strictEqual(delta.writeBytes, 0n)
  })
})
