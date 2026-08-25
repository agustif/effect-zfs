import { assert, describe, it } from "@effect/vitest"
import { Receive } from "../src/args/index.js"
import {
  beginRecordBytes,
  receiveSnapName,
  receiveSnapWhy,
  sendBeginInfo,
  tonameFromSendStream
} from "../src/native/stream-header.js"
import { datasetName } from "../src/schema/name.js"

const beginRecord = (toname: string): Uint8Array => {
  const bytes = new Uint8Array(312)
  const magic = 0x2f5bacbacn
  for (let i = 0; i < 8; i++) bytes[8 + i] = Number((magic >> BigInt(i * 8)) & 0xffn)
  const encoded = new TextEncoder().encode(toname)
  bytes.set(encoded, 56)
  return bytes
}

describe("send stream DRR_BEGIN", () => {
  it("reads drr_toname from a little-endian begin record", () => {
    const name = tonameFromSendStream(beginRecord("tank/fs@seed"))
    assert.strictEqual(name, "tank/fs@seed")
  })

  it("maps receive dest prefix/tail like zfs receive -d/-e", () => {
    const target = datasetName("backup")
    const exact = receiveSnapName(new Receive({ target }), "tank/a/b@s")
    const prefix = receiveSnapName(new Receive({ target, dest: "prefix" }), "tank/a/b@s")
    const tail = receiveSnapName(new Receive({ target, dest: "tail" }), "tank/a/b@s")
    assert.strictEqual(exact, "backup@s")
    assert.strictEqual(prefix, "backup/a/b@s")
    assert.strictEqual(tail, "backup/b@s")
  })

  it("rejects garbage once a full begin record is present", () => {
    const garbage = new Uint8Array(beginRecordBytes)
    garbage.fill(1)
    assert.strictEqual(sendBeginInfo(garbage).status, "invalid")
    assert.strictEqual(sendBeginInfo(garbage.subarray(0, 10)).status, "short")
  })

  it("namechecks receive destinations derived from drr_toname", () => {
    assert.strictEqual(receiveSnapWhy("backup@s"), undefined)
    assert.ok(receiveSnapWhy("backup@.") !== undefined)
  })

  it("invents a snap component when DRR_BEGIN drr_toname has no @", () => {
    const target = datasetName("backup/fs")
    assert.strictEqual(tonameFromSendStream(beginRecord("tank/fs")), "tank/fs")
    assert.strictEqual(receiveSnapName(new Receive({ target }), "tank/fs"), "backup/fs@recv")
    assert.strictEqual(
      receiveSnapName(new Receive({ target, dest: "prefix" }), "tank/a/b"),
      "backup/fs/a/b@recv"
    )
    assert.strictEqual(
      receiveSnapName(new Receive({ target, dest: "tail" }), "tank/a/b"),
      "backup/fs/b@recv"
    )
  })
})
