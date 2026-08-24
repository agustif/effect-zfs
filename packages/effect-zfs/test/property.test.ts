import { assert, describe, it } from "@effect/vitest"
import { DatasetProperty, PoolProperty } from "../src/generated/properties.generated.js"
import { decodePropertyValue, encodePropertyValue } from "../src/Property.js"


describe("property codecs", () => {
  it("keeps uint64 byte values above MAX_SAFE_INTEGER as bigint", () => {
    const raw = "9007199254740993"
    const decoded = decodePropertyValue(DatasetProperty.used, raw)
    assert.strictEqual(decoded, 9007199254740993n)
    assert.strictEqual(typeof decoded, "bigint")
    assert.strictEqual(encodePropertyValue(DatasetProperty.used, decoded), raw)
  })

  it("round-trips bytesOrNone", () => {
    assert.strictEqual(decodePropertyValue(DatasetProperty.quota, "none"), "none")
    assert.strictEqual(decodePropertyValue(DatasetProperty.quota, "1048576"), 1048576n)
    assert.strictEqual(encodePropertyValue(DatasetProperty.quota, "none"), "none")
    assert.strictEqual(encodePropertyValue(DatasetProperty.quota, 1048576n), "1048576")
  })

  it("encodes booleans as on/off", () => {
    assert.strictEqual(encodePropertyValue(DatasetProperty.atime, false), "off")
    assert.strictEqual(decodePropertyValue(DatasetProperty.atime, "off"), false)
    assert.strictEqual(encodePropertyValue(PoolProperty.autotrim, true), "on")
  })

  it("decodes mounted yes/no as boolean", () => {
    assert.strictEqual(decodePropertyValue(DatasetProperty.mounted, "yes"), true)
    assert.strictEqual(decodePropertyValue(DatasetProperty.mounted, "no"), false)
    assert.strictEqual(encodePropertyValue(DatasetProperty.mounted, true), "on")
  })

  it("does not coerce ashift through Number for the uint64 path", () => {
    assert.strictEqual(PoolProperty.ashift.codec, "integer")
    assert.strictEqual(DatasetProperty.used.codec, "bytes")
    assert.notStrictEqual(DatasetProperty.used.codec, "integer")
  })
})

