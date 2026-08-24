import { assert, describe, it } from "@effect/vitest"
import { EncodedProperty, decodePropertyAssignment, devicePath, encodePropertyAssignment, propertyName } from "../src/Args.js"
import {
  datasetVersion,
  mib,
  poolGuid,
  poolVersion,
  spaMinBlockSize,
  spaMinDevSize,
  spaMinDevSizeBytes,
  spaVersionFeatures,
  vdevSize,
  volBlockSize,
  volumeSize,
  zplVersionMax
} from "../src/Limits.js"
import { bookmarkComponent, bookmarkName, datasetName, datasetOfBookmark, holdTag, poolName, snapshotComponent, snapshotName, snapshotRange } from "../src/Name.js"

describe("typed OpenZFS limits", () => {
  it("accepts legal pool, dataset, and snapshot names", () => {
    assert.strictEqual(poolName("tank"), "tank")
    assert.strictEqual(datasetName("tank/data"), "tank/data")
    assert.strictEqual(snapshotName(datasetName("tank/data"), snapshotComponent("seed")), "tank/data@seed")
    assert.strictEqual(bookmarkName(datasetName("tank/data"), bookmarkComponent("keep")), "tank/data#keep")
    assert.strictEqual(datasetOfBookmark(bookmarkName(datasetName("tank/data"), "keep")), "tank/data")
  })

  it("rejects reserved pool names, leading digits, and illegal characters", () => {
    assert.throws(() => poolName("mirror"))
    assert.throws(() => poolName("2tank"))
    assert.throws(() => poolName("tank/nested"))
    assert.throws(() => datasetName("tank@snap"))
    assert.throws(() => datasetName("/tank"))
    assert.throws(() => snapshotComponent("has/slash"))
  })

  it("accepts hold tags and rejects reserved leading-dot tags", () => {
    assert.strictEqual(holdTag("keep"), "keep")
    assert.strictEqual(holdTag("keep-me_1"), "keep-me_1")
    assert.throws(() => holdTag(".libzfs"))
    assert.throws(() => holdTag("has/slash"))
    assert.throws(() => holdTag("has@at"))
  })

  it("rejects names longer than ZFS_MAX_DATASET_NAME_LEN - 1", () => {
    assert.throws(() => datasetName(`tank/${"a".repeat(260)}`))
  })

  it("encodes SPA_MINDEVSIZE as VdevSize and rejects 32 MiB", () => {
    assert.strictEqual(spaMinDevSize, spaMinDevSizeBytes)
    assert.throws(() => vdevSize(mib(32)))
    assert.strictEqual(vdevSize(mib(64)), mib(64))
  })

  it("encodes zvol sizes with SPA_MINBLOCKSIZE floor", () => {
    assert.strictEqual(volumeSize(spaMinBlockSize), spaMinBlockSize)
    assert.throws(() => volumeSize(511n))
    assert.strictEqual(volumeSize(mib(8)), mib(8))
  })

  it("accepts pool versions 1-28 and 5000, pool guids, and absolute device paths", () => {
    assert.strictEqual(poolVersion(28), 28)
    assert.strictEqual(poolVersion(spaVersionFeatures), 5000)
    assert.throws(() => poolVersion(29))
    assert.strictEqual(poolGuid(1n), 1n)
    assert.throws(() => poolGuid(0n))
    assert.strictEqual(devicePath("/tmp/a.img"), "/tmp/a.img")
    assert.throws(() => devicePath("a.img"))
  })

  it("accepts ZPL dataset versions 1-5 and power-of-two volblocksize", () => {
    assert.strictEqual(datasetVersion(zplVersionMax), 5)
    assert.throws(() => datasetVersion(6))
    assert.strictEqual(volBlockSize(8192n), 8192n)
    assert.throws(() => volBlockSize(8193n))
    assert.throws(() => volBlockSize(511n))
  })

  it("accepts snapshot destroy ranges", () => {
    assert.strictEqual(snapshotRange("tank/data@a%b"), "tank/data@a%b")
    assert.throws(() => snapshotRange("tank/data@a"))
    assert.throws(() => snapshotRange("tank/data@a%"))
  })

  it("round-trips encoded property assignments through the CLI codec", () => {
    const encoded = encodePropertyAssignment(new EncodedProperty({
      name: propertyName("compression"),
      value: "lz4"
    }))
    assert.strictEqual(encoded, "compression=lz4")
    const decoded = decodePropertyAssignment(encoded)
    assert.strictEqual(decoded.name, "compression")
    assert.strictEqual(decoded.value, "lz4")
  })
})
