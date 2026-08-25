import type { DatasetPropertyName } from "../src/args/index.js"
import type { CreateDatasetProperties, WritableDatasetProperties } from "../src/services/datasets.js"

const knownProperty: DatasetPropertyName = "compression"
void knownProperty

// @ts-expect-error unknown property names are not in the generated union
const invalidPropertyName: DatasetPropertyName = "not-a-real-property"
void invalidPropertyName

const filesystemWritable: WritableDatasetProperties<"filesystem"> = {
  compression: "zstd-3",
  atime: false,
  recordsize: 1024n * 1024n,
  quota: "none"
}
void filesystemWritable

const filesystemCreate: CreateDatasetProperties<"filesystem"> = {
  compression: "lz4",
  encryption: "aes-256-gcm",
  keyformat: "passphrase"
}
void filesystemCreate

const volumeWritable: WritableDatasetProperties<"volume"> = {
  compression: "zstd",
  reservation: 1024n
}
void volumeWritable

const invalidReadonly: WritableDatasetProperties<"filesystem"> = {
  // @ts-expect-error `used` is generated read-only metadata and must not be settable.
  used: 1n
}
void invalidReadonly

const invalidSetOnce: WritableDatasetProperties<"filesystem"> = {
  // @ts-expect-error encryption is create-time/set-once, not writable later.
  encryption: "on"
}
void invalidSetOnce

const invalidVolumeProperty: WritableDatasetProperties<"volume"> = {
  // @ts-expect-error recordsize only applies to filesystems in the upstream table.
  recordsize: 128n * 1024n
}
void invalidVolumeProperty

const invalidCreateReadonly: CreateDatasetProperties<"filesystem"> = {
  // @ts-expect-error read-only properties are not accepted during create either.
  available: 0n
}
void invalidCreateReadonly
