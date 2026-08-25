import { Context, Effect, Layer, Redacted } from "effect"
import type {
  ChangeKeyCommand,
  EncodedProperty,
  KeyFormat,
  KeyLocation,
  WrappingKey
} from "../args/index.js"
import {
  ChangeKey,
  CreateFilesystem,
  CreateVolume,
  keyLocation,
  LoadKey,
  UnloadKey,
  wrappingKey
} from "../args/index.js"
import { EncryptionFailure, InvalidName, InvalidProperty } from "../generated/errors.generated.js"
import type { DatasetProperty } from "../generated/properties.generated.js"
import { type Failure, ZfsProtocol } from "../protocol/protocol.js"
import { decodeNameArg, decodePropertyArg } from "../schema/decode.js"
import { minPassphraseLen, minPbkdf2Iterations, VolumeSize } from "../schema/limits.js"
import { dataset, type KindedDataset } from "../schema/models.js"
import type { DatasetName } from "../schema/name.js"
import type { PropertyValue } from "../schema/property.js"
import { type CreateDatasetProperties, encodeProperties } from "./datasets.js"

export { wrappingKey }
export type { ChangeKeyCommand, KeyFormat, KeyLocation, WrappingKey }

type EncryptionSuite = PropertyValue<typeof DatasetProperty.encryption>

const promptLocation = keyLocation("prompt")

const passphraseTooShort = (key: WrappingKey, format: KeyFormat): boolean => {
  if (format !== "passphrase") return false
  const material = Redacted.value(key)
  return typeof material === "string" && material.length < minPassphraseLen
}

export class Crypto extends Context.Service<Crypto, {
  readonly loadKey: (input: {
    readonly name?: DatasetName
    readonly all?: boolean
    readonly recursive?: boolean
    readonly noop?: boolean
    readonly keylocation?: KeyLocation
    readonly keyformat?: KeyFormat
    readonly wrappingKey?: WrappingKey
  }) => Effect.Effect<void, Failure>
  readonly unloadKey: (input: {
    readonly name?: DatasetName
    readonly all?: boolean
    readonly recursive?: boolean
  }) => Effect.Effect<void, Failure>
  readonly changeKey: (input: {
    readonly name: DatasetName
    readonly command?: ChangeKeyCommand
    readonly load?: boolean
    readonly keyformat?: KeyFormat
    readonly keylocation?: KeyLocation
    readonly pbkdf2iters?: bigint
    readonly wrappingKey?: WrappingKey
  }) => Effect.Effect<void, Failure>
  readonly createFilesystem: (input: {
    readonly name: DatasetName
    readonly parents?: boolean
    readonly encryption?: EncryptionSuite
    readonly keyformat: KeyFormat
    readonly keylocation?: KeyLocation
    readonly wrappingKey?: WrappingKey
    readonly pbkdf2iters?: bigint
    readonly properties?: CreateDatasetProperties<"filesystem">
  }) => Effect.Effect<KindedDataset<"filesystem">, Failure>
  readonly createVolume: (input: {
    readonly name: DatasetName
    readonly size: VolumeSize | bigint
    readonly sparse?: boolean
    readonly encryption?: EncryptionSuite
    readonly keyformat: KeyFormat
    readonly keylocation?: KeyLocation
    readonly wrappingKey?: WrappingKey
    readonly pbkdf2iters?: bigint
    readonly properties?: CreateDatasetProperties<"volume">
  }) => Effect.Effect<KindedDataset<"volume">, Failure>
}>()("effect-zfs/Crypto") {
  static readonly layer = Layer.effect(
    Crypto,
    Effect.gen(function*() {
      const zfs = yield* ZfsProtocol

      const loadKey = Effect.fn("Crypto.loadKey")(function*(input: {
        readonly name?: DatasetName
        readonly all?: boolean
        readonly recursive?: boolean
        readonly noop?: boolean
        readonly keylocation?: KeyLocation
        readonly keyformat?: KeyFormat
        readonly wrappingKey?: WrappingKey
      }) {
        if (input.all !== true && input.name === undefined) {
          return yield* new InvalidName({
            code: "EZFS_INVALIDNAME",
            operation: "Crypto.LoadKey",
            message: "load-key requires a dataset name or all: true"
          })
        }
        if (
          input.wrappingKey !== undefined &&
          input.keyformat !== undefined &&
          passphraseTooShort(input.wrappingKey, input.keyformat)
        ) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Crypto.LoadKey",
            message: "passphrase shorter than OpenZFS minimum"
          })
        }
        const args = yield* decodeNameArg("Crypto.LoadKey", LoadKey, {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.all === undefined ? {} : { all: input.all }),
          ...(input.recursive === undefined ? {} : { recursive: input.recursive }),
          ...(input.noop === undefined ? {} : { noop: input.noop }),
          ...(input.keylocation === undefined ? {} : { keylocation: input.keylocation }),
          ...(input.keyformat === undefined ? {} : { keyformat: input.keyformat }),
          ...(input.wrappingKey === undefined ? {} : { wrappingKey: input.wrappingKey })
        })
        yield* zfs.loadKey(args)
      })

      const unloadKey = Effect.fn("Crypto.unloadKey")(function*(input: {
        readonly name?: DatasetName
        readonly all?: boolean
        readonly recursive?: boolean
      }) {
        if (input.all !== true && input.name === undefined) {
          return yield* new InvalidName({
            code: "EZFS_INVALIDNAME",
            operation: "Crypto.UnloadKey",
            message: "unload-key requires a dataset name or all: true"
          })
        }
        const args = yield* decodeNameArg("Crypto.UnloadKey", UnloadKey, {
          ...(input.name === undefined ? {} : { name: input.name }),
          ...(input.all === undefined ? {} : { all: input.all }),
          ...(input.recursive === undefined ? {} : { recursive: input.recursive })
        })
        yield* zfs.unloadKey(args)
      })

      const changeKey = Effect.fn("Crypto.changeKey")(function*(input: {
        readonly name: DatasetName
        readonly command?: ChangeKeyCommand
        readonly load?: boolean
        readonly keyformat?: KeyFormat
        readonly keylocation?: KeyLocation
        readonly pbkdf2iters?: bigint
        readonly wrappingKey?: WrappingKey
      }) {
        if (input.pbkdf2iters !== undefined && input.pbkdf2iters < minPbkdf2Iterations) {
          return yield* new InvalidProperty({
            code: "EZFS_BADPROP",
            operation: "Crypto.ChangeKey",
            message: "pbkdf2iters below MIN_PBKDF2_ITERATIONS"
          })
        }
        const format = input.keyformat ?? "passphrase"
        if (input.wrappingKey !== undefined && passphraseTooShort(input.wrappingKey, format)) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Crypto.ChangeKey",
            message: "passphrase shorter than OpenZFS minimum"
          })
        }
        const args = yield* decodeNameArg("Crypto.ChangeKey", ChangeKey, {
          name: input.name,
          ...(input.command === undefined ? {} : { command: input.command }),
          ...(input.load === undefined ? {} : { load: input.load }),
          ...(input.keyformat === undefined ? {} : { keyformat: input.keyformat }),
          ...(input.keylocation === undefined ? {} : { keylocation: input.keylocation }),
          ...(input.pbkdf2iters === undefined ? {} : { pbkdf2iters: input.pbkdf2iters }),
          ...(input.wrappingKey === undefined ? {} : { wrappingKey: input.wrappingKey })
        })
        yield* zfs.changeKey(args)
      })

      const encryptedProperties = (
        properties: CreateDatasetProperties<"filesystem"> | CreateDatasetProperties<"volume"> | undefined,
        extras: {
          readonly encryption: EncryptionSuite
          readonly keyformat: KeyFormat
          readonly keylocation?: KeyLocation
          readonly pbkdf2iters?: bigint
        }
      ): ReadonlyArray<EncodedProperty> =>
        encodeProperties({
          ...properties,
          encryption: extras.encryption,
          keyformat: extras.keyformat,
          ...(extras.keylocation === undefined ? {} : { keylocation: extras.keylocation }),
          pbkdf2iters: extras.pbkdf2iters ?? minPbkdf2Iterations
        })

      const createFilesystem = Effect.fn("Crypto.createFilesystem")(function*(input: {
        readonly name: DatasetName
        readonly parents?: boolean
        readonly encryption?: EncryptionSuite
        readonly keyformat: KeyFormat
        readonly keylocation?: KeyLocation
        readonly wrappingKey?: WrappingKey
        readonly pbkdf2iters?: bigint
        readonly properties?: CreateDatasetProperties<"filesystem">
      }) {
        const location = input.keylocation ?? (input.wrappingKey === undefined ? undefined : promptLocation)
        if ((location === undefined || location === "prompt") && input.wrappingKey === undefined) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Dataset.CreateFilesystem",
            message: "wrapping key required when keylocation is prompt"
          })
        }
        if (input.wrappingKey !== undefined && passphraseTooShort(input.wrappingKey, input.keyformat)) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Dataset.CreateFilesystem",
            message: "passphrase shorter than OpenZFS minimum"
          })
        }
        if (input.pbkdf2iters !== undefined && input.pbkdf2iters < minPbkdf2Iterations) {
          return yield* new InvalidProperty({
            code: "EZFS_BADPROP",
            operation: "Dataset.CreateFilesystem",
            message: "pbkdf2iters below MIN_PBKDF2_ITERATIONS"
          })
        }
        yield* zfs.createFilesystem(
          new CreateFilesystem({
            name: input.name,
            properties: encryptedProperties(input.properties, {
              encryption: input.encryption ?? "on",
              keyformat: input.keyformat,
              ...(location === undefined ? {} : { keylocation: location }),
              ...(input.pbkdf2iters === undefined ? {} : { pbkdf2iters: input.pbkdf2iters })
            }),
            ...(input.parents === undefined ? {} : { parents: input.parents }),
            ...(input.wrappingKey === undefined ? {} : { wrappingKey: input.wrappingKey })
          })
        )
        return dataset(input.name, "filesystem")
      })

      const createVolume = Effect.fn("Crypto.createVolume")(function*(input: {
        readonly name: DatasetName
        readonly size: VolumeSize | bigint
        readonly sparse?: boolean
        readonly encryption?: EncryptionSuite
        readonly keyformat: KeyFormat
        readonly keylocation?: KeyLocation
        readonly wrappingKey?: WrappingKey
        readonly pbkdf2iters?: bigint
        readonly properties?: CreateDatasetProperties<"volume">
      }) {
        const location = input.keylocation ?? (input.wrappingKey === undefined ? undefined : promptLocation)
        if ((location === undefined || location === "prompt") && input.wrappingKey === undefined) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Dataset.CreateVolume",
            message: "wrapping key required when keylocation is prompt"
          })
        }
        if (input.wrappingKey !== undefined && passphraseTooShort(input.wrappingKey, input.keyformat)) {
          return yield* new EncryptionFailure({
            code: "EZFS_CRYPTOFAILED",
            operation: "Dataset.CreateVolume",
            message: "passphrase shorter than OpenZFS minimum"
          })
        }
        const size = yield* decodePropertyArg("Dataset.CreateVolume", VolumeSize, input.size)
        yield* zfs.createVolume(
          new CreateVolume({
            name: input.name,
            size,
            properties: encryptedProperties(input.properties, {
              encryption: input.encryption ?? "on",
              keyformat: input.keyformat,
              ...(location === undefined ? {} : { keylocation: location }),
              ...(input.pbkdf2iters === undefined ? {} : { pbkdf2iters: input.pbkdf2iters })
            }),
            ...(input.sparse === undefined ? {} : { sparse: input.sparse }),
            ...(input.wrappingKey === undefined ? {} : { wrappingKey: input.wrappingKey })
          })
        )
        return dataset(input.name, "volume")
      })

      return Crypto.of({ loadKey, unloadKey, changeKey, createFilesystem, createVolume })
    })
  )
}
