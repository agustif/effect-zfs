import { assert, describe, it } from "@effect/vitest"
import { Effect, Layer, Redacted, Schema } from "effect"
import {
  ChangeKey,
  keyLocation,
  LoadKey,
  UnloadKey,
  WrappingKey,
  wrappingKey,
  wrappingKeyToCliBytes,
  wrappingKeyToNativeBytes
} from "../src/args/index.js"
import { EncryptionFailure } from "../src/generated/errors.generated.js"
import * as Test from "../src/protocol/test.js"
import { datasetName } from "../src/schema/name.js"
import { Crypto } from "../src/services/crypto.js"

const secret = "effect-zfs-passphrase-1"

describe("crypto args and Redacted wrapping keys", () => {
  it("constructs LoadKey without leaking the passphrase", () => {
    const key = wrappingKey(secret)
    const args = new LoadKey({
      name: datasetName("tank/enc"),
      wrappingKey: key
    })
    assert.strictEqual(String(args.wrappingKey), "<redacted>")
    assert.isFalse(JSON.stringify(args).includes(secret))
    assert.strictEqual(Redacted.value(key), secret)
  })

  it("rejects Schema.Redacted decode of a raw passphrase string", () => {
    const result = Schema.decodeUnknownResult(WrappingKey)(secret)
    assert.strictEqual(result._tag, "Failure")
  })

  it("round-trips a Redacted wrapping key through LoadKey", () => {
    const decoded = Schema.decodeUnknownSync(LoadKey)({
      name: "tank/enc",
      wrappingKey: wrappingKey(secret)
    })
    assert.ok(decoded.wrappingKey !== undefined)
    assert.strictEqual(Redacted.value(decoded.wrappingKey), secret)
    assert.isFalse(JSON.stringify(decoded).includes(secret))
  })

  it("encodes passphrase CLI stdin with a trailing newline and native bytes without it", () => {
    const key = wrappingKey(secret)
    const cli = wrappingKeyToCliBytes(key, "passphrase")
    const native = wrappingKeyToNativeBytes(key, "passphrase")
    assert.deepStrictEqual(cli, new TextEncoder().encode(`${secret}\n`))
    assert.deepStrictEqual(native, new TextEncoder().encode(secret))
  })

  it("accepts prompt keylocation and ChangeKey inherit command", () => {
    assert.strictEqual(keyLocation("prompt"), "prompt")
    const change = new ChangeKey({
      name: datasetName("tank/enc"),
      command: "inherit"
    })
    assert.strictEqual(change.command, "inherit")
    const unload = new UnloadKey({ name: datasetName("tank/enc") })
    assert.strictEqual(unload.name, "tank/enc")
  })
})

describe("Crypto service", () => {
  it.effect("fails createFilesystem without a wrapping key for prompt keylocation", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto
      const error = yield* crypto.createFilesystem({
        name: datasetName("tank/enc"),
        keyformat: "passphrase",
        properties: { mountpoint: "none" }
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "EncryptionFailure")
      assert.ok(error instanceof EncryptionFailure)
    }).pipe(Effect.provide(Crypto.layer.pipe(Layer.provide(Test.layer())))))

  it.effect("rejects a short passphrase without putting it on argv", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto
      const error = yield* crypto.createFilesystem({
        name: datasetName("tank/enc"),
        keyformat: "passphrase",
        wrappingKey: wrappingKey("tinykey"),
        properties: { mountpoint: "none" }
      }).pipe(Effect.flip)
      assert.strictEqual(error._tag, "EncryptionFailure")
      assert.isFalse(JSON.stringify(error).includes("tinykey"))
    }).pipe(Effect.provide(Crypto.layer.pipe(Layer.provide(Test.layer())))))

  it.effect("loadKey and changeKey go through typed protocol handlers", () =>
    Effect.gen(function*() {
      const crypto = yield* Crypto
      yield* crypto.loadKey({
        name: datasetName("tank/enc"),
        wrappingKey: wrappingKey(secret)
      })
      yield* crypto.changeKey({
        name: datasetName("tank/enc"),
        wrappingKey: wrappingKey("effect-zfs-passphrase-2")
      })
      yield* crypto.unloadKey({ name: datasetName("tank/enc") })
    }).pipe(Effect.provide(Crypto.layer.pipe(Layer.provide(Test.layer())))))

  it.effect("encrypted create records wrappingKey as Redacted on protocol args", () => {
    let seen: string | undefined
    return Effect.gen(function*() {
      const crypto = yield* Crypto
      const fs = yield* crypto.createFilesystem({
        name: datasetName("tank/enc"),
        keyformat: "passphrase",
        wrappingKey: wrappingKey(secret),
        properties: { mountpoint: "none" }
      })
      assert.strictEqual(fs.name, "tank/enc")
      assert.strictEqual(seen, "<redacted>")
    }).pipe(Effect.provide(Crypto.layer.pipe(Layer.provide(Test.layer({
      createFilesystem: (input) => {
        seen = input.wrappingKey === undefined ? "missing" : String(input.wrappingKey)
      }
    })))))
  })
})
